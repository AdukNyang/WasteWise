const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const {
  getEligibleReporterRank,
  getFollowUpCase,
  ONE_WEEK_MS,
  rankReports,
  TRANSACTION_OPTIONS,
} = require("../services/ecocoins.service");
const { canAccessReport } = require("../services/report-access.service");
const { parseGpsAccuracy, parseGpsCoordinates } = require("../services/report-location.service");
const { validateReport } = require("../services/report-validation.service");

const prisma = new PrismaClient();

const submitReport = async (req, res) => {
  const body = req.body || {};
  const { category } = body;
  const description = typeof body.description === "string" ? body.description.trim() : body.description;
  const location = typeof body.location === "string" ? body.location.trim() : body.location;
  const validationError = validateReport({ ...body, description, location }, Boolean(req.file));
  const coordinates = parseGpsCoordinates(body.latitude, body.longitude);
  const accuracy = parseGpsAccuracy(
    body.locationAccuracyMeters,
    coordinates.latitude != null && coordinates.longitude != null,
  );
  const discardEvidence = () => {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Could not remove invalid report evidence:", err.message);
      });
    }
  };

  if (validationError) {
    discardEvidence();
    return res.status(400).json({ message: validationError });
  }
  if (coordinates.error) {
    discardEvidence();
    return res.status(400).json({ message: coordinates.error });
  }
  if (accuracy.error) {
    discardEvidence();
    return res.status(400).json({ message: accuracy.error });
  }
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const report = await prisma.report.create({
      data: {
        category,
        description,
        location,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        locationAccuracyMeters: accuracy.accuracyMeters,
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
    discardEvidence();
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getMyReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!reports.length) return res.json([]);

    const categories = [...new Set(reports.map((report) => report.category))];
    const peers = await prisma.report.findMany({
      where: { category: { in: categories } },
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
    const rankedReports = rankReports(peers);
    const rankByReportId = new Map(rankedReports.map(({ id, reporterRank, appreciationEligible }) => [
      id,
      { reporterRank, appreciationEligible },
    ]));

    res.json(reports.map((report) => ({
      ...report,
      ...rankByReportId.get(report.id),
    })));
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
    if (!canAccessReport(req.user, report))
      return res.status(403).json({ message: "You do not have access to this report" });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getFollowUpStatus = async (req, res) => {
  try {
    const result = await getFollowUpCase(prisma, req.params.id);
    if (!result) return res.status(404).json({ message: "Report not found" });
    if (!result.followUpCase)
      return res.json({ started: false, message: "Follow-up opens after the issue is verified" });

    const eligibleRank = getEligibleReporterRank(result.followUpCase.startedAt);
    const eligibleReport = result.followUpCase.ownerReportId
      ? null
      : result.reports[eligibleRank - 1] || null;

    res.json({
      started: true,
      startedAt: result.followUpCase.startedAt,
      acceptedAt: result.followUpCase.acceptedAt,
      ownerReportId: result.followUpCase.ownerReportId,
      eligibleReporterRank: eligibleReport ? eligibleRank : null,
      eligibleForCurrentUser: eligibleReport ? eligibleReport.userId === req.user.id : false,
      nextWindowAt: eligibleRank < 3
        ? new Date(result.followUpCase.startedAt.getTime() + ONE_WEEK_MS * eligibleRank)
        : null,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const acceptFollowUp = async (req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({ where: { id: req.params.id } });
      if (!report) return { reportNotFound: true };
      if (report.userId !== req.user.id) return { notReportOwner: true };

      const ranked = await getFollowUpCase(tx, report.id);
      if (!ranked || !ranked.followUpCase) return { notStarted: true };
      if (ranked.followUpCase.ownerReportId) return { alreadyAccepted: true };
      if (ranked.rank > 3) return { notEligible: true };

      const eligibleRank = getEligibleReporterRank(ranked.followUpCase.startedAt);
      if (ranked.rank !== eligibleRank)
        return {
          wrongWindow: true,
          eligibleRank,
          nextWindowAt: ranked.followUpCase.startedAt.getTime() + ONE_WEEK_MS * eligibleRank,
        };

      const acceptedAt = new Date();
      const updated = await tx.followUpCase.updateMany({
        where: { id: ranked.followUpCase.id, ownerReportId: null },
        data: { ownerReportId: report.id, acceptedAt },
      });
      if (updated.count !== 1) return { alreadyAccepted: true };

      return { acceptedAt, rank: ranked.rank };
    }, TRANSACTION_OPTIONS);

    if (result.reportNotFound) return res.status(404).json({ message: "Report not found" });
    if (result.notReportOwner)
      return res.status(403).json({ message: "Only the report submitter can accept follow-up" });
    if (result.notStarted)
      return res.status(409).json({ message: "Follow-up opens after the issue is verified" });
    if (result.alreadyAccepted)
      return res.status(409).json({ message: "A reporter has already accepted follow-up" });
    if (result.notEligible)
      return res.status(403).json({ message: "Only the first three reporters can accept follow-up" });
    if (result.wrongWindow)
      return res.status(409).json({
        message: `Reporter ${result.eligibleRank} has the current acceptance window`,
        nextWindowAt: new Date(result.nextWindowAt),
      });

    res.json({
      message: "Follow-up accepted",
      rank: result.rank,
      acceptedAt: result.acceptedAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  acceptFollowUp,
  getFollowUpStatus,
  getMyReports,
  getReportById,
  submitReport,
};
