import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const source = readFileSync('C:/Users/mdsim/Unity/Z-Dasher/Assets/Plugins/WebGL/ZDasherLeaderboard.jslib', 'utf8');
function bridge(failDelivery = false) {
  const requests = [], messages = [];
  const context = {
    window: {}, LibraryManager: { library: {} }, mergeInto: Object.assign,
    UTF8ToString: value => value, AbortSignal,
    SendMessage: (...args) => messages.push(args),
    fetch: async (url, options) => {
      assert.equal(options.credentials, 'include');
      if (url === '/auth/csrf') return { ok: true, json: async () => ({ token: 'csrf' }) };
      assert.equal(options.headers['X-CSRF-TOKEN'], 'csrf');
      const body = JSON.parse(options.body);
      requests.push({ url, body });
      return { ok: !(failDelivery && body.kind === 'delivery'), json: async () => url.endsWith('/start') ? { runId: 'run' } : { elapsedMilliseconds: 65123 } };
    },
  };
  vm.runInNewContext(source, context);
  return { context, api: context.LibraryManager.library, requests, messages };
}
test('Unity bridge queues five deliveries before finish and uses session/CSRF', async () => {
  const { context, api, requests, messages } = bridge();
  api.ZDasher_Begin('tracker', 5);
  await context.window.zDasherRankedRun.queue;
  assert.equal(messages[0][2], 'Ranked run');
  for (let i = 1; i <= 5; i++) api.ZDasher_Event('delivery', i);
  api.ZDasher_Event('finish', 0);
  await context.window.zDasherRankedRun.queue;
  assert.deepEqual(requests.slice(1).map(r => r.body.kind), ['delivery', 'delivery', 'delivery', 'delivery', 'delivery', 'finish']);
  assert.match(messages.at(-1)[2], /Finish saved: 1:05.123/);
});
test('failed delivery prevents a finish submission and shows failure', async () => {
  const { context, api, requests, messages } = bridge(true);
  api.ZDasher_Begin('tracker', 5);
  await context.window.zDasherRankedRun.queue;
  api.ZDasher_Event('delivery', 1);
  api.ZDasher_Event('finish', 0);
  await context.window.zDasherRankedRun.queue;
  assert.ok(!requests.some(r => r.body.kind === 'finish'));
  assert.match(messages.at(-1)[2], /will not be ranked/);
});
