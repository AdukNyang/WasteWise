const test = require("node:test");
const assert = require("node:assert/strict");
const { matchesFileSignature } = require("../src/middleware/evidence-upload.middleware");

test("photo and video signatures are recognized", () => {
  assert.equal(matchesFileSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"), true);
  assert.equal(matchesFileSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47]), "image/png"), true);
  assert.equal(matchesFileSignature(Buffer.from("GIF89a"), "image/gif"), true);
  assert.equal(matchesFileSignature(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), "video/webm"), true);
  assert.equal(matchesFileSignature(Buffer.from("0000ftyp"), "video/mp4"), true);
});

test("incorrect file signatures are rejected", () => {
  assert.equal(matchesFileSignature(Buffer.from("plain text"), "image/png"), false);
  assert.equal(matchesFileSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "video/mp4"), false);
});
