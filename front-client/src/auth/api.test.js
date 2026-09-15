import { test } from "node:test";
import assert from "node:assert/strict";
import { getCurrentUser, submitAccountAction } from "./api.js";

test("account requests include cookies and use a fresh CSRF token for each action", async () => {
  const original = globalThis.fetch;
  const calls = [];
  let token = 0;
  globalThis.fetch = async (url, options) => {
    calls.push({ path: url.pathname, options });
    return url.pathname.endsWith("csrf")
      ? new Response(JSON.stringify({ token: `token-${++token}` }))
      : new Response(null, { status: 204 });
  };
  try {
    await submitAccountAction("login", { email: "player@example.com", password: "test" });
    await submitAccountAction("logout");
    assert.deepEqual(calls.map(call => call.path), ["/auth/csrf", "/auth/login", "/auth/csrf", "/auth/logout"]);
    assert.ok(calls.every(call => call.options.credentials === "include"));
    assert.equal(calls[1].options.headers["X-CSRF-TOKEN"], "token-1");
    assert.equal(calls[3].options.headers["X-CSRF-TOKEN"], "token-2");
    assert.equal(JSON.parse(calls[1].options.body).email, "player@example.com");
  } finally { globalThis.fetch = original; }
});

test("expired sessions return null; server outages remain errors", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(null, { status: 401 });
    assert.equal(await getCurrentUser(), null);
    globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
    await assert.rejects(getCurrentUser(), /Unable to reach/);
  } finally { globalThis.fetch = original; }
});

test("registration displays Identity validation messages", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => url.pathname.endsWith("csrf")
    ? new Response(JSON.stringify({ token: "test-token" }))
    : new Response(JSON.stringify({ errors: ["Password requires a digit."] }), { status: 400 });
  try {
    await assert.rejects(submitAccountAction("register"), /Password requires a digit/);
  } finally { globalThis.fetch = original; }
});
