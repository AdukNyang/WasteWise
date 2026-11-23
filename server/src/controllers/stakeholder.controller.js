const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const { recordFollowUpMilestone, TRANSACTION_OPTIONS } = require("../services/ecocoins.service");

const prisma = new PrismaClient();

const getAssignedReports = async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      where: { assignedTo: req.user.id },
      include: {
        report: { include: { statusHistory: true, submittedBy: { select: { id: true, name: true, email: true } } } },
        progressUpdates: true,
      },
    });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const addProgressUpdate = async (req, res) => {
  const { note } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.findUnique({ where: { reportId: req.params.id } });
      if (!assignment) return { assignmentNotFound: true };
      if (assignment.assignedTo !== req.user.id) return { notAssigned: true };

      const report = await tx.report.findUnique({ where: { id: req.params.id } });
      if (!report) return { reportNotFound: true };
      if (!["ASSIGNED", "IN_PROGRESS", "REOPENED"].includes(report.status))
        return { invalidStatus: true };

      const update = await tx.progressUpdate.create({
        data: { assignmentId: assignment.id, note },
      });

      await tx.report.update({
        where: { id: report.id },
        data: { status: "IN_PROGRESS" },
      });

      if (report.status !== "IN_PROGRESS") {
        await tx.statusHistory.create({
          data: { reportId: report.id, status: "IN_PROGRESS", changedBy: req.user.id },
        });
      }

      const coinsAwarded = report.status === "IN_PROGRESS"
        ? 0
        : await recordFollowUpMilestone(tx, report.id, "PROGRESS_UPDATE");

      return { update, coinsAwarded };
    }, TRANSACTION_OPTIONS);

    if (result.assignmentNotFound) return res.status(404).json({ message: "Assignment not found" });
    if (result.notAssigned) return res.status(403).json({ message: "This report is assigned to another stakeholder" });
    if (result.reportNotFound) return res.status(404).json({ message: "Report not found" });
    if (result.invalidStatus)
      return res.status(400).json({ message: "Report cannot receive progress updates in its current status" });

    res.json({ message: "Progress update added", update: result.update, coinsAwarded: result.coinsAwarded });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const markResolved = async (req, res) => {
  const resolutionLocation = typeof req.body.resolutionLocation === "string"
    ? req.body.resolutionLocation.trim()
    : "";
  const evidence = req.file;
  const discardEvidence = () => {
    if (evidence) {
      fs.unlink(evidence.path, (err) => {
        if (err) console.error("Could not remove unused resolution evidence:", err.message);
      });
    }
  };

  if (!evidence) return res.status(400).json({ message: "A resolution photo or video is required" });
  if (!resolutionLocation) {
    discardEvidence();
    return res.status(400).json({ message: "Resolution location is required" });
  }
  if (!evidence.mimetype.startsWith("image/") && !evidence.mimetype.startsWith("video/")) {
    discardEvidence();
    return res.status(400).json({ message: "Evidence must be an image or video" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({ where: { id: req.params.id } });
      if (!report) return { reportNotFound: true };

      const assignment = await tx.assignment.findUnique({ where: { reportId: report.id } });
      if (!assignment) return { assignmentNotFound: true };
      if (assignment.assignedTo !== req.user.id) return { notAssigned: true };
      if (report.status !== "IN_PROGRESS") return { invalidStatus: true };

      const update = await tx.progressUpdate.findFirst({ where: { assignmentId: assignment.id } });
      if (!update) return { progressRequired: true };

      const resolved = await tx.report.update({
        where: { id: report.id },
        data: {
          status: "RESOLVED",
          resolutionEvidenceUrl: `/uploads/${evidence.filename}`,
          resolutionLocation,
        },
      });

      await tx.statusHistory.create({
        data: { reportId: resolved.id, status: "RESOLVED", changedBy: req.user.id },
      });

      const coinsAwarded = await recordFollowUpMilestone(tx, resolved.id, "RESOLVED");
      return { report: resolved, coinsAwarded };
    }, TRANSACTION_OPTIONS);

    if (result.reportNotFound) {
      discardEvidence();
      return res.status(404).json({ message: "Report not found" });
    }
    if (result.assignmentNotFound) {
      discardEvidence();
      return res.status(404).json({ message: "Assignment not found" });
    }
    if (result.notAssigned) {
      discardEvidence();
      return res.status(403).json({ message: "This report is assigned to another stakeholder" });
    }
    if (result.invalidStatus) {
      discardEvidence();
      return res.status(400).json({ message: "Report must be in progress before it can be resolved" });
    }
    if (result.progressRequired) {
      discardEvidence();
      return res.status(400).json({ message: "Add a progress update before resolving the report" });
    }

    res.json({
      message: "Report marked as resolved",
      report: result.report,
      coinsAwarded: result.coinsAwarded,
    });
  } catch (err) {
    discardEvidence();
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const confirmResolution = async (req, res) => {
  const { confirmed } = req.body;
  if (typeof confirmed !== "boolean")
    return res.status(400).json({ message: "confirmed must be true or false" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({ where: { id: req.params.id } });
      if (!report) return { reportNotFound: true };
      if (report.userId !== req.user.id) return { notReportOwner: true };
      if (report.status !== "RESOLVED") return { invalidStatus: true };

      const confirmation = await tx.confirmation.create({
        data: { reportId: report.id, userId: req.user.id, confirmed },
      });

      const status = confirmed ? "CONFIRMED" : "REOPENED";
      const updatedReport = await tx.report.update({
        where: { id: report.id },
        data: { status },
      });
      await tx.statusHistory.create({
        data: { reportId: report.id, status, changedBy: req.user.id },
      });

      const coinsAwarded = confirmed
        ? await recordFollowUpMilestone(tx, report.id, "CONFIRMED", new Date(), req.user.id)
        : 0;

      return { confirmation, coinsAwarded, report: updatedReport };
    }, TRANSACTION_OPTIONS);

    if (result.reportNotFound) return res.status(404).json({ message: "Report not found" });
    if (result.notReportOwner)
      return res.status(403).json({ message: "Only the report submitter can confirm or dispute this resolution" });
    if (result.invalidStatus)
      return res.status(400).json({ message: "Report must be resolved before it can be confirmed or disputed" });

    res.json({
      message: confirmed ? "Resolution confirmed" : "Issue reopened",
      confirmation: result.confirmation,
      report: result.report,
      coinsAwarded: result.coinsAwarded,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { getAssignedReports, addProgressUpdate, markResolved, confirmResolution };
