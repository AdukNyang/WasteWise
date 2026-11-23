const test = require("node:test");
const assert = require("node:assert/strict");
const { canAccessReport } = require("../src/services/report-access.service");

const report = {
  userId: "report-owner",
  assignment: { assignedTo: "assigned-stakeholder" },
};

test("report GPS data is visible to the owner, administrator, and assigned stakeholder only", () => {
  assert.equal(canAccessReport({ id: "report-owner", role: "COMMUNITY_USER" }, report), true);
  assert.equal(canAccessReport({ id: "admin", role: "ADMINISTRATOR" }, report), true);
  assert.equal(canAccessReport({ id: "assigned-stakeholder", role: "RESPONSIBLE_STAKEHOLDER" }, report), true);
  assert.equal(canAccessReport({ id: "other-stakeholder", role: "RESPONSIBLE_STAKEHOLDER" }, report), false);
  assert.equal(canAccessReport({ id: "other-user", role: "COMMUNITY_USER" }, report), false);
});
