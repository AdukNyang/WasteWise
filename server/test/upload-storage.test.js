const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { getUploadDirectory } = require("../src/services/upload-storage.service");

test("upload storage defaults to the server uploads directory", () => {
  const previous = process.env.UPLOAD_DIR;
  try {
    delete process.env.UPLOAD_DIR;
    assert.equal(getUploadDirectory(), path.resolve(__dirname, "../uploads"));
  } finally {
    if (previous === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = previous;
  }
});

test("upload storage accepts a configured absolute directory", () => {
  const previous = process.env.UPLOAD_DIR;
  const configuredDirectory = path.resolve(__dirname, "../../persistent-uploads");
  try {
    process.env.UPLOAD_DIR = configuredDirectory;
    assert.equal(getUploadDirectory(), configuredDirectory);
  } finally {
    if (previous === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = previous;
  }
});
