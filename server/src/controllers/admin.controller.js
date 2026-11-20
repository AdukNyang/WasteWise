const { PrismaClient } = require("@prisma/client");

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

const VERIFIED_COINS = 50;

const verifyReport = async (req, res) => {
  const { status, note } = req.body;
  const allowed = ["VERIFIED", "REJECTED", "UNDER_REVIEW"];

  if (!allowed.includes(status))
    return res.status(400).json({ message: "Invalid status. Allowed: VERIFIED, REJECTED, UNDER_REVIEW" });

  try {
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status },
    });

    await prisma.statusHistory.create({
      data: { reportId: report.id, status, changedBy: req.user.id },
    });

    if (status === "VERIFIED") {
      const account = await prisma.ecoCoinsAccount.findUnique({ where: { userId: report.userId } });
      if (account) {
        await prisma.ecoCoinsAccount.update({
          where: { id: account.id },
          data: { balance: { increment: VERIFIED_COINS }, totalEarned: { increment: VERIFIED_COINS } },
        });
        await prisma.ecoCoinsTransaction.create({
          data: { ecoCoinsAccountId: account.id, amount: VERIFIED_COINS, reason: "Report verified" },
        });
      }
    }

    res.json({ message: `Report marked as ${status}`, report });
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
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status: "ASSIGNED", priority },
    });

    await prisma.assignment.create({
      data: { reportId: report.id, assignedTo, assignedBy: req.user.id },
    });

    await prisma.statusHistory.create({
      data: { reportId: report.id, status: "ASSIGNED", changedBy: req.user.id },
    });

    res.json({ message: "Report assigned successfully", report });
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

module.exports = { getAllReports, verifyReport, groupDuplicates, assignReport, findDuplicates };
