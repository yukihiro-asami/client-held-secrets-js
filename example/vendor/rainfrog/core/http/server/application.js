import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { Authority, AuthError } from '../../auth/server/authority.js';

function json(response, status, value, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  response.end(JSON.stringify(value));
}

async function readBody(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 65536) {
      throw new AuthError('body_too_large', 413);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function startApplication({ app, port = 0, fixtures = false, now, publicOrigin }) {
  if (!fixtures) {
    throw new Error('Local demo requires explicit --local-fixtures');
  }
  if (publicOrigin) {
    const url = new URL(publicOrigin);
    if (url.protocol !== 'https:' || url.origin !== publicOrigin) {
      throw new Error('publicOrigin must be an HTTPS origin without a path or credentials');
    }
  }
  let authority;
  let origin;
  const server = http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
    try {
      const staticFile = app.files.get(request.url);
      // A link may open an explicit page. Cross-site API calls and asset fetches stay blocked.
      const navigation =
        request.method === 'GET' &&
        staticFile?.type.startsWith('text/html') &&
        request.headers['sec-fetch-mode'] === 'navigate' &&
        request.headers['sec-fetch-dest'] === 'document';
      if (
        request.headers.host !== new URL(origin).host ||
        (request.headers.origin && request.headers.origin !== origin) ||
        (request.headers['sec-fetch-site'] &&
          !['same-origin', 'none'].includes(request.headers['sec-fetch-site']) &&
          !navigation)
      ) {
        throw new AuthError('wrong_origin', 403);
      }
      const target = request.url;
      const body = await readBody(request);
      const contentType = request.headers['content-type'] ?? '';
      const descriptor = { origin, method: request.method, target, contentType, body };
      if (request.method === 'GET' && staticFile) {
        response.writeHead(200, { 'Content-Type': staticFile.type });
        response.end(await readFile(staticFile.url));
        return;
      }
      if (request.method === 'GET' && target === '/config') {
        json(response, 200, { appId: app.appId, localFixture: true });
        return;
      }
      function input() {
        if (contentType !== 'application/json') {
          throw new AuthError('json_required', 415);
        }
        try {
          const value = JSON.parse(body.toString('utf8'));
          if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Object required');
          }
          return value;
        } catch {
          throw new AuthError('invalid_json', 400);
        }
      }
      if (request.method === 'POST' && target === '/auth/local/begin') {
        json(response, 200, authority.begin(input()));
      } else if (request.method === 'POST' && target === '/auth/local/finish') {
        json(response, 200, authority.finish(input()));
      } else if (request.method === 'POST' && target === '/auth/locate') {
        json(response, 200, authority.locate(input().publicKey));
      } else if (request.method === 'POST' && target === '/auth/challenge') {
        json(response, 200, { challenge: authority.challenge(input().loginId) });
      } else {
        const logout = request.method === 'POST' && target === '/auth/logout';
        const status = request.method === 'GET' && target === '/auth/status';
        const route = app.routes.get(`${request.method} ${target}`);
        if (!logout && !status && !route) {
          throw new AuthError('not_found', 404);
        }
        const { login, challenge } = authority.authenticate(
          request.headers['rainfrog-auth'],
          descriptor,
          { allowEnded: logout },
        );
        if (logout) {
          authority.end(login.loginId);
          json(response, 200, { loggedOut: true });
          return;
        }
        let result;
        if (status) {
          result = { appId: login.appId, userId: login.userId, loginId: login.loginId };
        } else {
          const identity = { appId: login.appId, userId: login.userId, loginId: login.loginId };
          result = await route.handle({ identity, body });
        }
        const headers = {};
        try {
          authority.active(login.loginId);
          // Only explicit action routes keep a live login active; status/polling do not.
          if (route?.activity) {
            authority.touch(login.loginId);
          }
          if (challenge.expiresAt - authority.seconds() < 60) {
            headers['Rainfrog-Challenge'] = JSON.stringify(authority.challenge(login.loginId));
          }
        } catch (error) {
          // A login ending during an already accepted operation does not discard its result.
          if (!(error instanceof AuthError) || error.code !== 'login_ended') {
            throw error;
          }
        }
        json(response, 200, result, headers);
      }
    } catch (error) {
      const status = error instanceof AuthError ? error.status : 500;
      json(response, status, { error: status === 500 ? 'internal_error' : error.code });
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  origin = publicOrigin || `http://127.0.0.1:${server.address().port}`;
  authority = new Authority({ appId: app.appId, origin, fixtures, now, ...app.auth });
  return {
    origin,
    port: server.address().port,
    authority,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections();
      }),
  };
}
