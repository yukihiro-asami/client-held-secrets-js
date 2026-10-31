import { base64url, enrollmentBytes, requestBytes, encoder } from '../shared/wire.js';
import { readIdentity, saveIdentity, setLogin } from './storage.js';

export class ClientError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export class AuthClient {
  constructor(appId) {
    this.appId = appId;
    this.challenge = null;
    this.loginId = null;
    this.authenticated = false;
    this.revision = 0;
  }

  async post(path, value) {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new ClientError(result.error);
    }
    return result;
  }

  async identity() {
    return navigator.locks.request(`rainfrog-key:${this.appId}`, async () => {
      let identity = await readIdentity(this.appId);
      if (!identity) {
        const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, false, [
          'sign',
          'verify',
        ]);
        identity = {
          privateKey: pair.privateKey,
          publicKey: base64url(await crypto.subtle.exportKey('raw', pair.publicKey)),
          loginId: null,
        };
        await saveIdentity(this.appId, identity);
      }
      return identity;
    });
  }

  async login() {
    return navigator.locks.request(`rainfrog-login:${this.appId}`, async () => {
      const identity = await this.identity();
      const ticket = await this.post('/auth/local/begin', {
        appId: this.appId,
        userId: 'demo-user',
        publicKey: identity.publicKey,
      });
      if (
        ticket.origin !== location.origin ||
        ticket.appId !== this.appId ||
        ticket.userId !== 'demo-user' ||
        ticket.publicKey !== identity.publicKey
      ) {
        throw new ClientError('enrollment_mismatch');
      }
      const signature = base64url(
        await crypto.subtle.sign('Ed25519', identity.privateKey, enrollmentBytes(ticket)),
      );
      const result = await this.post('/auth/local/finish', { id: ticket.id, signature });
      const changed = await setLogin(
        this.appId,
        identity.publicKey,
        identity.loginId,
        result.loginId,
      );
      if (!changed) {
        throw new ClientError('login_changed');
      }
      this.loginId = result.loginId;
      this.challenge = result.challenge;
      this.authenticated = true;
      this.revision++;
      return { loginId: result.loginId };
    });
  }

  async resume() {
    const identity = await readIdentity(this.appId);
    if (!identity) {
      return false;
    }
    // Also recovers an enrollment whose success response was lost.
    try {
      const { loginId } = await this.post('/auth/locate', { publicKey: identity.publicKey });
      if (loginId !== identity.loginId) {
        if (!(await setLogin(this.appId, identity.publicKey, identity.loginId, loginId))) {
          throw new ClientError('login_changed');
        }
      }
      await this.request('/auth/status');
      return true;
    } catch (error) {
      if (error.code !== 'login_ended') {
        throw error;
      }
      const current = await readIdentity(this.appId);
      if (current?.loginId === identity.loginId) {
        this.authenticated = false;
        this.challenge = null;
      }
      return false;
    }
  }

  async request(path, { method = 'GET', body } = {}, retry = true) {
    const url = new URL(path, location.origin);
    if (url.origin !== location.origin) {
      throw new ClientError('wrong_origin');
    }
    const identity = await readIdentity(this.appId);
    if (!identity?.loginId) {
      throw new ClientError('login_ended');
    }
    const loginId = identity.loginId;
    if (this.loginId !== loginId) {
      this.loginId = loginId;
      this.challenge = null;
      this.authenticated = false;
      this.revision++;
    }
    const revision = this.revision;
    const isCurrent = async () =>
      (await readIdentity(this.appId))?.loginId === loginId &&
      this.loginId === loginId &&
      this.revision === revision;
    try {
      let challenge = this.challenge;
      if (!challenge) {
        ({ challenge } = await this.post('/auth/challenge', { loginId }));
        if (!(await isCurrent())) {
          throw new ClientError('login_changed');
        }
        this.acceptChallenge(challenge, loginId);
      }
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const contentType = payload === undefined ? '' : 'application/json';
      const bodyHash = base64url(
        await crypto.subtle.digest('SHA-512', encoder.encode(payload ?? '')),
      );
      const descriptor = {
        origin: url.origin,
        method,
        target: url.pathname + url.search,
        contentType,
        bodyHash,
      };
      const signature = base64url(
        await crypto.subtle.sign(
          'Ed25519',
          identity.privateKey,
          requestBytes(challenge, descriptor),
        ),
      );
      const headers = { 'Rainfrog-Auth': JSON.stringify({ challenge, signature }) };
      if (contentType) {
        headers['Content-Type'] = contentType;
      }
      const response = await fetch(url, { method, headers, body: payload, credentials: 'omit' });
      const result = await response.json();
      if (!(await isCurrent())) {
        throw new ClientError('login_changed');
      }
      if (!response.ok) {
        if (result.error === 'challenge_expired' && retry) {
          this.challenge = null;
          return await this.request(path, { method, body }, false);
        }
        throw new ClientError(result.error);
      }
      const renewed = response.headers.get('Rainfrog-Challenge');
      if (renewed) {
        this.acceptChallenge(JSON.parse(renewed), loginId);
      }
      this.authenticated = path !== '/auth/logout';
      if (path === '/auth/logout') {
        this.revision++;
      }
      return result;
    } catch (error) {
      if (error.code === 'login_ended' && (await isCurrent())) {
        this.authenticated = false;
        this.challenge = null;
      }
      throw error;
    }
  }

  acceptChallenge(challenge, loginId) {
    if (challenge.appId !== this.appId || challenge.loginId !== loginId) {
      throw new ClientError('challenge_mismatch');
    }
    if (
      !this.challenge ||
      this.challenge.loginId !== loginId ||
      challenge.expiresAt >= this.challenge.expiresAt
    ) {
      this.challenge = challenge;
    }
  }

  async logout() {
    const identity = await readIdentity(this.appId);
    try {
      return await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      if (error.code !== 'login_ended') {
        throw error;
      }
      if ((await readIdentity(this.appId))?.loginId !== identity?.loginId) {
        throw new ClientError('login_changed');
      }
      // The server may report an already ended login while renewing an expired challenge.
      this.authenticated = false;
      this.challenge = null;
      this.revision++;
      return { loggedOut: true };
    }
  }
}
