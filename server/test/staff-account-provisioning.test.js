const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertRemoteDatabaseConfirmed,
  getDatabaseTarget,
} = require("../scripts/provision-staff-account");

test("database target excludes connection credentials and query parameters", () => {
  const target = getDatabaseTarget(
    "postgresql://operator:secret@db.example.test:5432/wastewise?sslmode=require",
  );

  assert.equal(target.label, "db.example.test/wastewise");
  assert.equal(target.isLocal, false);
  assert.equal(target.label.includes("secret"), false);
});

test("remote database use requires explicit confirmation", () => {
  const target = getDatabaseTarget("postgresql://operator:secret@db.example.test:5432/wastewise");

  assert.throws(() => assertRemoteDatabaseConfirmed(target, false), /without --confirm-remote-database/);
  assert.doesNotThrow(() => assertRemoteDatabaseConfirmed(target, true));
});

test("loopback database is recognized as local", () => {
  const target = getDatabaseTarget("postgresql://operator:secret@localhost:5432/wastewise");

  assert.equal(target.isLocal, true);
  assert.doesNotThrow(() => assertRemoteDatabaseConfirmed(target, false));
});
