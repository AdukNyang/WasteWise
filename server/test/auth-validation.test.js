const test = require("node:test");
const assert = require("node:assert/strict");
const { validateRegistration, validateLogin } = require("../src/services/auth-validation.service");

test("valid registration data passes validation", () => {
  assert.equal(validateRegistration({
    name: "Aduk Nyang",
    email: "aduk@example.com",
    password: "Secure123",
    phone: "+256 700 123 456",
  }), null);
});

test("registration rejects missing or invalid required fields", () => {
  assert.equal(validateRegistration({ name: "", email: "invalid", password: "123" }),
    "Full name must contain at least 2 characters");
  assert.equal(validateRegistration({ name: "Aduk", email: "invalid", password: "Secure123" }),
    "A valid email address is required");
  assert.equal(validateRegistration({ name: "Aduk", email: "aduk@example.com", password: "123" }),
    "Password must contain at least 8 characters");
});

test("login requires a valid email and password", () => {
  assert.equal(validateLogin({ email: "invalid", password: "Secure123" }),
    "A valid email address is required");
  assert.equal(validateLogin({ email: "aduk@example.com", password: "" }),
    "Password is required");
  assert.equal(validateLogin({ email: "aduk@example.com", password: "Secure123" }), null);
});
