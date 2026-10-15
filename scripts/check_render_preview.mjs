// Run after publishing the backend and copying the frontend dist into wwwroot.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdir, mkdtemp } from 'node:fs/promises';

const published = resolve(process.argv[2] || '.local/render-preview');
const scratch = await mkdtemp(resolve('.local/preview-check-'));
await mkdir(resolve(scratch, 'keys'));
const base = 'http://127.0.0.1:15874';
const server = spawn('dotnet', ['GamingApp.api.dll', '--urls', base], {
  cwd: published,
  env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Production', Hosting__ServeFrontend: 'true',
    Hosting__EdgeHttps: 'true', Preview__Ephemeral: 'true',
    Logging__LogLevel__Default: 'Warning',
    DataProtection__KeysPath: resolve(scratch, 'keys'),
    ConnectionStrings__DefaultConnection: `Data Source=${resolve(scratch, 'preview.db')}` },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
server.stdout.on('data', chunk => { logs += chunk; });
server.stderr.on('data', chunk => { logs += chunk; });
const cookies = new Map();
async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options,
    signal: AbortSignal.timeout(5000),
    headers: { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...options.headers } });
  // Model the HTTPS edge explicitly: production Secure cookies are replayed on
  // this local HTTP transport only by the test, never by browser configuration.
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(';')[0];
    const index = pair.indexOf('=');
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return response;
}
async function post(path, body) {
  const token = await (await request('/auth/csrf')).json();
  return request(path, { method: 'POST', headers: { 'Content-Type': 'application/json',
    'X-CSRF-TOKEN': token.token }, body: JSON.stringify(body) });
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error(logs);
    try { ready = (await request('/health')).ok; } catch { /* starting */ }
    if (ready) break;
    await new Promise(done => setTimeout(done, 250));
  }
  assert.ok(ready, logs);
  for (const path of ['/', '/games', '/games/z-dasher', '/login', '/community/123']) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), /<title>GamesHQ<\/title>/, path);
  }
  const games = await (await request('/catalog')).json();
  assert.equal(games[0].title, 'Z-Dasher');
  assert.equal((await request('/games/z-dasher/index.html')).status, 401);
  const credentials = { email: 'preview@example.com', password: 'Preview-check-582!' };
  assert.equal((await post('/auth/register', credentials)).status, 201);
  const login = await post('/auth/login', credentials);
  assert.equal(login.status, 204);
  assert.ok(login.headers.getSetCookie().some(value => /GameHub.Auth=/.test(value) && /secure/i.test(value)));
  assert.equal((await request('/auth/me')).status, 200);
  assert.equal((await request('/games/z-dasher/index.html')).status, 200);
  assert.equal((await request('/games/z-dasher/Build/missing.wasm')).status, 404);
  assert.equal((await post('/auth/forgot-password', { email: credentials.email })).status, 503);
  assert.equal((await request('/auth/logout', { method: 'POST' })).status, 400);
  assert.equal((await post('/games', { title: 'Unauthorized upload' })).status, 403);
  assert.equal((await post('/auth/logout', {})).status, 204);
  console.log('Preview checks passed: routing, seeded catalog, registration/login, secure cookies, game access, recovery notice, CSRF and owner protection.');
} catch (error) {
  console.error(logs.slice(-5000));
  throw error;
} finally {
  server.kill();
}
