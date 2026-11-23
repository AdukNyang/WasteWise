const test = require("node:test");
const assert = require("node:assert/strict");
const {
  awardReportingCoins,
  getEligibleReporterRank,
  getRankedReports,
  rankReports,
  recordFollowUpMilestone,
} = require("../src/services/ecocoins.service");

const createClient = ({ reports, followUpCase }) => {
  const milestones = new Map();
  const rewardKeys = new Set();
  const accounts = new Map(
    reports.map((report) => [
      report.userId,
      { id: `account-${report.userId}`, userId: report.userId, balance: 0, totalEarned: 0 },
    ]),
  );

  return {
    accounts,
    report: {
      findUnique: async ({ where }) => reports.find((report) => report.id === where.id) || null,
      findMany: async ({ where }) =>
        reports
          .filter((report) => report.category === where.category && report.location === where.location)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
          .map(({ id, userId }) => ({ id, userId })),
    },
    followUpCase: {
      findUnique: async () => followUpCase,
    },
    followUpMilestone: {
      findUnique: async ({ where }) =>
        milestones.get(`${where.followUpCaseId_stage.followUpCaseId}:${where.followUpCaseId_stage.stage}`) || null,
      create: async ({ data }) => {
        milestones.set(`${data.followUpCaseId}:${data.stage}`, data);
        return data;
      },
    },
    ecoCoinsAccount: {
      findUnique: async ({ where }) => accounts.get(where.userId) || null,
      update: async ({ where, data }) => {
        const account = [...accounts.values()].find((item) => item.id === where.id);
        account.balance += data.balance.increment;
        account.totalEarned += data.totalEarned.increment;
        return account;
      },
    },
    ecoCoinsAward: {
      createMany: async ({ data }) => {
        const { key } = data[0];
        if (rewardKeys.has(key)) return { count: 0 };
        rewardKeys.add(key);
        return { count: 1 };
      },
    },
    ecoCoinsTransaction: {
      create: async () => ({}),
    },
  };
};

const reports = [
  { id: "report-1", userId: "user-1", category: "Dumping", location: "Nakawa", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "report-2", userId: "user-2", category: "Dumping", location: "Nakawa", createdAt: "2026-01-02T00:00:00.000Z" },
  { id: "report-3", userId: "user-3", category: "Dumping", location: "Nakawa", createdAt: "2026-01-03T00:00:00.000Z" },
];

test("follow-up windows advance every week", () => {
  const start = new Date("2026-01-01T00:00:00.000Z");
  assert.equal(getEligibleReporterRank(start, new Date("2026-01-07T23:59:59.999Z")), 1);
  assert.equal(getEligibleReporterRank(start, new Date("2026-01-08T00:00:00.000Z")), 2);
  assert.equal(getEligibleReporterRank(start, new Date("2026-01-15T00:00:00.000Z")), 3);
});

test("report ranks are calculated per exact category and location", () => {
  const ranked = rankReports([
    { id: "report-1", category: "Dumping", location: "Nakawa" },
    { id: "report-2", category: "Dumping", location: "Nakawa" },
    { id: "report-3", category: "Blocked Drain", location: "Nakawa" },
    { id: "report-4", category: "Dumping", location: "Nakawa" },
    { id: "report-5", category: "Dumping", location: "Nakawa" },
  ]);

  assert.deepEqual(ranked.map(({ reporterRank }) => reporterRank), [1, 2, 1, 3, 4]);
  assert.equal(ranked[3].appreciationEligible, false);
  assert.equal(ranked[4].appreciationEligible, true);
});

test("milestone rewards use the accepting reporter's rank and are paid once", async () => {
  const client = createClient({
    reports,
    followUpCase: {
      id: "case-1",
      anchorReportId: "report-1",
      ownerReportId: "report-2",
      acceptedAt: new Date("2026-01-03T00:00:00.000Z"),
    },
  });

  const amount = await recordFollowUpMilestone(
    client,
    "report-1",
    "ASSIGNED",
    new Date("2026-01-04T00:00:00.000Z"),
  );
  const duplicateAmount = await recordFollowUpMilestone(
    client,
    "report-1",
    "ASSIGNED",
    new Date("2026-01-05T00:00:00.000Z"),
  );

  assert.equal(amount, 250);
  assert.equal(duplicateAmount, 0);
  assert.equal(client.accounts.get("user-2").balance, 250);
});

test("milestones completed before acceptance are not paid later", async () => {
  const client = createClient({
    reports,
    followUpCase: {
      id: "case-1",
      anchorReportId: "report-1",
      ownerReportId: "report-1",
      acceptedAt: new Date("2026-01-05T00:00:00.000Z"),
    },
  });

  const amount = await recordFollowUpMilestone(
    client,
    "report-1",
    "ASSIGNED",
    new Date("2026-01-04T00:00:00.000Z"),
  );
  const laterAmount = await recordFollowUpMilestone(
    client,
    "report-1",
    "ASSIGNED",
    new Date("2026-01-06T00:00:00.000Z"),
  );

  assert.equal(amount, 0);
  assert.equal(laterAmount, 0);
  assert.equal(client.accounts.get("user-1").balance, 0);
});

test("the first three reporters can earn their documented maximum totals", async () => {
  const stages = ["ASSIGNED", "PROGRESS_UPDATE", "RESOLVED", "CONFIRMED"];
  const expectedTotals = [
    { reportId: "report-1", userId: "user-1", total: 5000 },
    { reportId: "report-2", userId: "user-2", total: 2500 },
    { reportId: "report-3", userId: "user-3", total: 1634 },
  ];

  for (const expected of expectedTotals) {
    const client = createClient({
      reports,
      followUpCase: {
        id: "case-1",
        anchorReportId: "report-1",
        ownerReportId: expected.reportId,
        acceptedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

    const ranked = await getRankedReports(client, expected.reportId);
    await awardReportingCoins(client, ranked);
    for (const stage of stages) {
      await recordFollowUpMilestone(
        client,
        "report-1",
        stage,
        new Date("2026-01-02T00:00:00.000Z"),
        expected.userId,
      );
    }

    assert.equal(client.accounts.get(expected.userId).balance, expected.total);
  }
});
