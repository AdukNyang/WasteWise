const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateProgressNote,
  validateReport,
  validateResolutionLocation,
} = require("../src/services/report-validation.service");

test("valid report fields pass validation", () => {
  assert.equal(validateReport({
    category: "Illegal Dumping",
    description: "Rubbish has blocked the drainage channel.",
    location: "Kampala Road",
  }, true), null);
});

test("report fields require a known category and bounded text", () => {
  assert.equal(validateReport({ category: "unknown", description: "This is long enough", location: "Main Road" }, true),
    "Choose a valid report category");
  assert.equal(validateReport({ category: "Other", description: "short", location: "Main Road" }, true),
    "Description must contain at least 3 words and 20 characters");
  assert.equal(validateReport({ category: "Other", description: "randomletters123456789", location: "Main Road" }, true),
    "Description must contain at least 3 words and 20 characters");
  assert.equal(validateReport({ category: "Other", description: "random letters 123456789012", location: "Main Road" }, true),
    "Description must contain at least 3 words and 20 characters");
  assert.equal(validateReport({ category: "Other", description: "This description is long enough", location: "  " }, true),
    "Location must contain at least 3 characters");
});

test("report evidence is required", () => {
  assert.equal(validateReport({
    category: "Illegal Dumping",
    description: "Rubbish has blocked the drainage channel.",
    location: "Kampala Road",
  }), "A photo or video is required as report evidence");
});

test("progress notes and resolution locations are bounded", () => {
  assert.equal(validateProgressNote("done"), "Progress update must contain at least 5 characters");
  assert.equal(validateProgressNote("Removed the rubbish."), null);
  assert.equal(validateResolutionLocation(""), "Resolution location must contain at least 3 characters");
  assert.equal(validateResolutionLocation("Kampala Road"), null);
});
