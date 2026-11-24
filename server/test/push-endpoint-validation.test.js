const test = require("node:test");
const assert = require("node:assert/strict");
const { isValidPushEndpoint } = require("../src/services/push-endpoint-validation.service");

test("accepts HTTPS endpoints from supported browser push services", () => {
  assert.equal(isValidPushEndpoint("https://fcm.googleapis.com/fcm/send/subscription"), true);
  assert.equal(isValidPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/subscription"), true);
  assert.equal(isValidPushEndpoint("https://wns.notify.windows.com/w/?token=subscription"), true);
  assert.equal(isValidPushEndpoint("https://web.push.apple.com/subscription"), true);
});

test("rejects non-HTTPS, private, unknown, and nonstandard-port push endpoints", () => {
  assert.equal(isValidPushEndpoint("http://fcm.googleapis.com/fcm/send/subscription"), false);
  assert.equal(isValidPushEndpoint("https://127.0.0.1/subscribe"), false);
  assert.equal(isValidPushEndpoint("https://attacker.example/subscribe"), false);
  assert.equal(isValidPushEndpoint("https://fcm.googleapis.com:8443/subscribe"), false);
});
