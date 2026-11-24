const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createAuthRateLimit } = require("../src/middleware/auth-rate-limit.middleware");

test("auth rate limit returns 429 after the configured request count", async (t) => {
  const app = express();
  app.post("/login", createAuthRateLimit({ limit: 2, windowMs: 60_000 }), (req, res) => res.sendStatus(204));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));

  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/login`;
  assert.equal((await fetch(url, { method: "POST" })).status, 204);
  assert.equal((await fetch(url, { method: "POST" })).status, 204);
  const limitedResponse = await fetch(url, { method: "POST" });
  assert.equal(limitedResponse.status, 429);
  assert.deepEqual(await limitedResponse.json(), {
    message: "Too many sign-in or registration attempts. Try again in 15 minutes.",
  });
});
