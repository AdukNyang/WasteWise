const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const submitReport = async (req, res) => {
  const { category, description, location } = req.body;
  const photoUrl = req.file ? req.file.path : null;

  try {
    const report = await prisma.report.create({
      data: {
        category,
        description,
        location,
        photoUrl,
        userId: req.user.id,
      },
    });

    await prisma.statusHistory.create({
      data: {
        reportId: report.id,
        status: "SUBMITTED",
        changedBy: req.user.id,
      },
    });

    res.status(201).json({ message: "Report submitted successfully", report });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getMyReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getReportById = async (req, res) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: { statusHistory: true, assignment: true, confirmations: true },
    });
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { submitReport, getMyReports, getReportById };
