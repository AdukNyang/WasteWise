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
const GPS_MATCH_RADIUS_METERS = 50;

const hasGpsCoordinates = (report) =>
  Number.isFinite(report.latitude) && Number.isFinite(report.longitude);

const normalizeTextLocation = (location) =>
  typeof location === "string" ? location.trim().replace(/\s+/g, " ").toLowerCase() : "";

const distanceBetweenReports = (first, second) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDifference = radians(second.latitude - first.latitude);
  const longitudeDifference = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDifference / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const reportsShareLocation = (first, second) => {
  const firstHasGps = hasGpsCoordinates(first);
  const secondHasGps = hasGpsCoordinates(second);
  if (firstHasGps || secondHasGps)
    return firstHasGps && secondHasGps
      && distanceBetweenReports(first, second) <= GPS_MATCH_RADIUS_METERS;
  return normalizeTextLocation(first.location) === normalizeTextLocation(second.location);
};

const getReporterKey = (report) => report.userId ?? report.id;

const rankReports = (reports) => {
  const groups = [];
  return reports.map((report) => {
    let group = groups.find((candidate) =>
      candidate.category === report.category
      && reportsShareLocation(candidate.anchor, report));
    if (!group) {
      group = {
        anchor: report,
        category: report.category,
        reporterRanks: new Map(),
      };
      groups.push(group);
    }

    const reporterKey = getReporterKey(report);
    let reporterRank = group.reporterRanks.get(reporterKey);
    if (reporterRank === undefined) {
      reporterRank = group.reporterRanks.size + 1;
      group.reporterRanks.set(reporterKey, reporterRank);
    }
    return {
      ...report,
      reporterRank,
      appreciationEligible: reporterRank >= 4,
      reportGroupId: group.anchor.id,
    };
  });
};

const getRankedReports = async (client, reportId) => {
  const report = await client.report.findUnique({ where: { id: reportId } });
  if (!report) return null;

  const reports = await client.report.findMany({
    where: { category: report.category },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      userId: true,
      category: true,
      location: true,
      latitude: true,
      longitude: true,
    },
  });
  const rankedReports = rankReports(reports);
  const rankedReport = rankedReports.find((item) => item.id === reportId);
  if (!rankedReport) return null;

  const groupReports = rankedReports.filter((item) => item.reportGroupId === rankedReport.reportGroupId);
  const reporters = new Map();
  for (const item of groupReports) {
    const reporterKey = getReporterKey(item);
    if (!reporters.has(reporterKey))
      reporters.set(reporterKey, { id: item.id, userId: item.userId });
  }

  return {
    report,
    reports: [...reporters.values()],
    reportIds: groupReports.map((item) => item.id),
    anchorReportId: rankedReport.reportGroupId,
    rank: rankedReport.reporterRank,
  };
};

const ensureFollowUpCase = async (client, ranked, startedAt) => {
  return client.followUpCase.upsert({
    where: { anchorReportId: ranked.anchorReportId },
    update: {},
    create: { anchorReportId: ranked.anchorReportId, startedAt },
  });
};

const getFollowUpCase = async (client, reportId) => {
  const ranked = await getRankedReports(client, reportId);
  if (!ranked) return null;

  let followUpCase = await client.followUpCase.findUnique({
    where: { anchorReportId: ranked.anchorReportId },
  });

  if (!followUpCase) {
    const verification = await client.statusHistory.findFirst({
      where: {
        reportId: { in: ranked.reportIds },
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
    rewardKey: `reporting:${ranked.anchorReportId}:${ranked.report.userId}`,
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
    where: { anchorReportId: ranked.anchorReportId },
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
