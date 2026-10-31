import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
  verify,
} from 'node:crypto';
import { challengeBytes, requestBytes, enrollmentBytes, decode } from '../shared/wire.js';
import { importPublicKey } from './public-key.js';

export class AuthError extends Error {
  constructor(code, status = 401) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export class Authority {
  constructor({
    appId,
    origin,
    fixtures = false,
    now = () => Date.now(),
    loginSeconds = 3600,
    idleSeconds = 900,
    challengeSeconds = 300,
  }) {
    Object.assign(this, {
      appId,
      origin,
      fixtures,
      now,
      loginSeconds,
      idleSeconds,
      challengeSeconds,
    });
    this.macKey = randomBytes(64);
    this.keys = new Map();
    this.logins = new Map();
    this.pending = new Map();
  }

  seconds() {
    return Math.floor(this.now() / 1000);
  }

  begin({ appId, userId, publicKey }) {
    if (!this.fixtures) {
      throw new AuthError('fixtures_disabled', 403);
    }
    if (appId !== this.appId || userId !== 'demo-user') {
      throw new AuthError('fixture_identity', 403);
    }
    // Expired local enrollment records are no longer needed, including retry results.
    for (const [id, entry] of this.pending) {
      if (entry.ticket.expiresAt <= this.seconds()) {
        this.pending.delete(id);
      }
    }
    if (this.pending.size >= 100) {
      throw new AuthError('too_many_enrollments', 429);
    }
    let key;
    try {
      key = importPublicKey(publicKey);
    } catch {
      throw new AuthError('invalid_public_key', 400);
    }
    const ticket = {
      origin: this.origin,
      appId,
      userId,
      publicKey,
      id: randomUUID(),
      expiresAt: this.seconds() + 120,
    };
    this.pending.set(ticket.id, { ticket, key });
    return ticket;
  }

  finish({ id, signature }) {
    const pending = this.pending.get(id);
    if (!pending || pending.ticket.expiresAt <= this.seconds()) {
      throw new AuthError('enrollment_expired');
    }
    const { ticket, key } = pending;
    this.verifySignature(key, enrollmentBytes(ticket), signature);
    // A lost enrollment response can be retried without creating another login.
    if (pending.loginId) {
      return this.startResult(pending.loginId);
    }
    const old = this.keys.get(ticket.publicKey);
    if (old?.loginId) {
      this.end(old.loginId);
    }
    const loginId = randomUUID();
    this.keys.set(ticket.publicKey, { key, userId: ticket.userId, loginId });
    this.logins.set(loginId, {
      loginId,
      appId: this.appId,
      userId: ticket.userId,
      publicKey: ticket.publicKey,
      startedAt: this.seconds(),
      lastActivity: this.seconds(),
      ended: false,
    });
    pending.loginId = loginId;
    return this.startResult(loginId);
  }

  startResult(loginId) {
    return { loginId, challenge: this.challenge(loginId) };
  }

  active(loginId) {
    const login = this.logins.get(loginId);
    if (
      !login ||
      login.ended ||
      this.seconds() >= login.startedAt + this.loginSeconds ||
      this.seconds() >= login.lastActivity + this.idleSeconds
    ) {
      throw new AuthError('login_ended');
    }
    return login;
  }

  locate(publicKey) {
    const loginId = this.keys.get(publicKey)?.loginId;
    this.active(loginId);
    // Public login identifiers are not authorization; /auth/status requires a signature.
    return { loginId };
  }

  challenge(loginId) {
    this.active(loginId);
    const challenge = {
      appId: this.appId,
      loginId,
      nonce: randomBytes(32).toString('base64url'),
      expiresAt: this.seconds() + this.challengeSeconds,
    };
    return { ...challenge, mac: this.mac(challenge).toString('base64url') };
  }

  mac(challenge) {
    return createHmac('sha512', this.macKey).update(challengeBytes(challenge)).digest();
  }

  verifySignature(key, message, signature) {
    let valid = false;
    try {
      valid = verify(null, message, key, decode(signature, 64));
    } catch {
      /* reject malformed proof */
    }
    if (!valid) {
      throw new AuthError('invalid_signature');
    }
  }

  authenticate(header, request, { allowEnded = false } = {}) {
    let auth;
    try {
      auth = JSON.parse(header);
      const c = auth.challenge;
      if (
        c.appId !== this.appId ||
        typeof c.loginId !== 'string' ||
        !/^[\x21-\x7e]{1,128}$/.test(c.loginId) ||
        !Number.isSafeInteger(c.expiresAt)
      ) {
        throw new Error();
      }
      decode(c.nonce, 32);
      if (!timingSafeEqual(decode(c.mac, 64), this.mac(c))) {
        throw new Error();
      }
    } catch {
      throw new AuthError('invalid_challenge');
    }
    const c = auth.challenge;
    const login = this.logins.get(c.loginId);
    if (!login) {
      throw new AuthError('login_ended');
    }
    if (!allowEnded) {
      this.active(c.loginId);
    }
    const key = this.keys.get(login.publicKey)?.key;
    const bodyHash = createHash('sha512').update(request.body).digest('base64url');
    this.verifySignature(key, requestBytes(c, { ...request, bodyHash }), auth.signature);
    // Verify proof before reporting an expiry that the client may automatically retry.
    if (this.seconds() >= c.expiresAt) {
      throw new AuthError('challenge_expired');
    }
    return { login, challenge: c };
  }

  touch(loginId) {
    this.active(loginId).lastActivity = this.seconds();
  }
  end(loginId) {
    const login = this.logins.get(loginId);
    if (login) {
      login.ended = true;
    }
  }
}
