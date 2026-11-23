const { PrismaClient } = require("@prisma/client");
const {
  awardReportingCoins,
  ensureFollowUpCase,
  getRankedReports,
  recordFollowUpMilestone,
  TRANSACTION_OPTIONS,
} = require("../services/ecocoins.service");

const prisma = new PrismaClient();

const getAllReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      include: { submittedBy: { select: { id: true, name: true, email: true } }, statusHistory: true },
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getStakeholders = async (req, res) => {
  try {
    const stakeholders = await prisma.user.findMany({
      where: { role: "RESPONSIBLE_STAKEHOLDER", accountStatus: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.json(stakeholders);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const verifyReport = async (req, res) => {
  const { status } = req.body;
  const allowed = ["VERIFIED", "REJECTED", "UNDER_REVIEW"];

  if (!allowed.includes(status))
    return res.status(400).json({ message: "Invalid status. Allowed: VERIFIED, REJECTED, UNDER_REVIEW" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.report.findUnique({ where: { id: req.params.id } });
      if (!existing) return null;
      if (!["SUBMITTED", "UNDER_REVIEW"].includes(existing.status))
        return { invalidStatus: true };

      const report = await tx.report.update({
        where: { id: req.params.id },
        data: { status },
      });

      await tx.statusHistory.create({
        data: { reportId: report.id, status, changedBy: req.user.id },
      });

      let rewards = null;
      if (status === "VERIFIED") {
        const ranked = await getRankedReports(tx, report.id);
        await ensureFollowUpCase(tx, ranked, new Date());
        rewards = await awardReportingCoins(tx, ranked);
      }

      return { report, rewards };
    }, TRANSACTION_OPTIONS);

    if (!result) return res.status(404).json({ message: "Report not found" });
    if (result.invalidStatus)
      return res.status(400).json({ message: "Only submitted or under-review reports can be reviewed" });

    res.json({
      message: `Report marked as ${status}`,
      report: result.report,
      ...(result.rewards ? { rewards: result.rewards } : {}),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const groupDuplicates = async (req, res) => {
  const { reportIds } = req.body;

  try {
    const group = await prisma.duplicateGroup.create({ data: {} });

    await prisma.report.updateMany({
      where: { id: { in: reportIds } },
      data: { duplicateGroupId: group.id, status: "GROUPED" },
    });

    for (const reportId of reportIds) {
      await prisma.statusHistory.create({
        data: { reportId, status: "GROUPED", changedBy: req.user.id },
      });
    }

    res.json({ message: "Reports grouped as duplicates", groupId: group.id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const assignReport = async (req, res) => {
  const { assignedTo, priority } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.report.findUnique({ where: { id: req.params.id } });
      if (!existing) return null;
      if (existing.status !== "VERIFIED")
        return { invalidStatus: true };

      const report = await tx.report.update({
        where: { id: req.params.id },
        data: { status: "ASSIGNED", priority },
      });

      await tx.assignment.create({
        data: { reportId: report.id, assignedTo, assignedBy: req.user.id },
      });

      await tx.statusHistory.create({
        data: { reportId: report.id, status: "ASSIGNED", changedBy: req.user.id },
      });

      const coinsAwarded = await recordFollowUpMilestone(tx, report.id, "ASSIGNED");
      return { report, coinsAwarded };
    }, TRANSACTION_OPTIONS);

    if (!result) return res.status(404).json({ message: "Report not found" });
    if (result.invalidStatus) return res.status(400).json({ message: "Only verified reports can be assigned" });

    res.json({ message: "Report assigned successfully", report: result.report, coinsAwarded: result.coinsAwarded });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const findDuplicates = async (req, res) => {
  const { category, location } = req.query;
  try {
    const reports = await prisma.report.findMany({
      where: { category, location },
      orderBy: { createdAt: "desc" },
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { getAllReports, getStakeholders, verifyReport, groupDuplicates, assignReport, findDuplicates };
