const REPORTING_COINS = { 1: 1000, 2: 500, 3: 300 };
const RANK_4_TO_10_COINS = 10;
const FOLLOW_UP_COINS = {
  ASSIGNED: { 1: 500, 2: 250, 3: 167 },
  PROGRESS_UPDATE: { 1: 500, 2: 250, 3: 167 },
  RESOLVED: { 1: 1000, 2: 500, 3: 333 },
  CONFIRMED: { 1: 2000, 2: 1000, 3: 667 },
};
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const TRANSACTION_OPTIONS = { maxWait: 10000, timeout: 30000 };

const rankReports = (reports) => {
  const ranks = new Map();
  return reports.map((report) => {
    const groupKey = JSON.stringify([report.category, report.location]);
    const reporterRank = (ranks.get(groupKey) || 0) + 1;
    ranks.set(groupKey, reporterRank);
    return { ...report, reporterRank, appreciationEligible: reporterRank >= 4 };
  });
};

const getRankedReports = async (client, reportId) => {
  const report = await client.report.findUnique({ where: { id: reportId } });
  if (!report) return null;

  const reports = await client.report.findMany({
    where: { category: report.category, location: report.location },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, userId: true },
  });

  return {
    report,
    reports,
    rank: reports.findIndex((item) => item.id === reportId) + 1,
  };
};

const ensureFollowUpCase = async (client, ranked, startedAt) => {
  return client.followUpCase.upsert({
    where: { anchorReportId: ranked.reports[0].id },
    update: {},
    create: { anchorReportId: ranked.reports[0].id, startedAt },
  });
};

const getFollowUpCase = async (client, reportId) => {
  const ranked = await getRankedReports(client, reportId);
  if (!ranked) return null;

  let followUpCase = await client.followUpCase.findUnique({
    where: { anchorReportId: ranked.reports[0].id },
  });

  if (!followUpCase) {
    const verification = await client.statusHistory.findFirst({
      where: {
        reportId: { in: ranked.reports.map((report) => report.id) },
        status: "VERIFIED",
      },
      orderBy: { changedAt: "asc" },
      select: { changedAt: true },
    });

    if (verification)
      followUpCase = await ensureFollowUpCase(client, ranked, verification.changedAt);
  }

  return followUpCase ? { ...ranked, followUpCase } : null;
};

const getEligibleReporterRank = (startedAt, now = new Date()) => {
  const elapsed = now.getTime() - startedAt.getTime();
  if (elapsed < ONE_WEEK_MS) return 1;
  if (elapsed < ONE_WEEK_MS * 2) return 2;
  return 3;
};

const awardCoins = async (client, { userId, amount, reason, rewardKey }) => {
  if (amount <= 0) return 0;

  const account = await client.ecoCoinsAccount.findUnique({ where: { userId } });
  if (!account) throw new Error(`EcoCoins account not found for user ${userId}`);

  const created = await client.ecoCoinsAward.createMany({
    data: [{ key: rewardKey }],
    skipDuplicates: true,
  });
  if (created.count === 0) return 0;

  await client.ecoCoinsTransaction.create({
    data: { ecoCoinsAccountId: account.id, amount, reason, rewardKey },
  });
  await client.ecoCoinsAccount.update({
    where: { id: account.id },
    data: { balance: { increment: amount }, totalEarned: { increment: amount } },
  });

  return amount;
};

const awardReportingCoins = async (client, ranked) => {
  if (!ranked) throw new Error("Report not found while awarding reporting coins");

  const coins = REPORTING_COINS[ranked.rank] ?? (ranked.rank <= 10 ? RANK_4_TO_10_COINS : 0);
  const coinsAwarded = await awardCoins(client, {
    userId: ranked.report.userId,
    amount: coins,
    reason: `Report verified (rank ${ranked.rank})`,
    rewardKey: `reporting:${ranked.report.id}`,
  });

  return {
    rank: ranked.rank,
    coinsAwarded,
    appreciationEligible: ranked.rank >= 4,
  };
};

const recordFollowUpMilestone = async (client, reportId, stage, reachedAt = new Date(), actorUserId = null) => {
  const ranked = await getRankedReports(client, reportId);
  if (!ranked) throw new Error(`Report not found: ${reportId}`);

  const followUpCase = await client.followUpCase.findUnique({
    where: { anchorReportId: ranked.reports[0].id },
  });
  if (!followUpCase) return 0;

  const milestone = await client.followUpMilestone.findUnique({
    where: {
      followUpCaseId_stage: { followUpCaseId: followUpCase.id, stage },
    },
  });
  if (milestone) return 0;

  await client.followUpMilestone.create({
    data: { followUpCaseId: followUpCase.id, stage, reachedAt },
  });

  if (!followUpCase.ownerReportId || !followUpCase.acceptedAt || followUpCase.acceptedAt >= reachedAt) return 0;

  const owner = await getRankedReports(client, followUpCase.ownerReportId);
  if (!owner || owner.rank > 3) return 0;
  if (stage === "CONFIRMED" && owner.report.userId !== actorUserId) return 0;

  const amount = FOLLOW_UP_COINS[stage][owner.rank];
  return awardCoins(client, {
    userId: owner.report.userId,
    amount,
    reason: `Follow-up ${stage.toLowerCase().replace("_", " ")} (rank ${owner.rank})`,
    rewardKey: `follow-up:${followUpCase.id}:${stage}`,
  });
};

module.exports = {
  FOLLOW_UP_COINS,
  ONE_WEEK_MS,
  TRANSACTION_OPTIONS,
  awardReportingCoins,
  ensureFollowUpCase,
  getEligibleReporterRank,
  getFollowUpCase,
  getRankedReports,
  rankReports,
  recordFollowUpMilestone,
};
