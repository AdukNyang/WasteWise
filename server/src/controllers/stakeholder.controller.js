const { PrismaClient } = require("@prisma/client");

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
    const assignment = await prisma.assignment.findUnique({ where: { reportId: req.params.id } });
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    const update = await prisma.progressUpdate.create({
      data: { assignmentId: assignment.id, note },
    });

    await prisma.report.update({
      where: { id: req.params.id },
      data: { status: "IN_PROGRESS" },
    });

    await prisma.statusHistory.create({
      data: { reportId: req.params.id, status: "IN_PROGRESS", changedBy: req.user.id },
    });

    res.json({ message: "Progress update added", update });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const markResolved = async (req, res) => {
  try {
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status: "RESOLVED" },
    });

    await prisma.statusHistory.create({
      data: { reportId: report.id, status: "RESOLVED", changedBy: req.user.id },
    });

    res.json({ message: "Report marked as resolved", report });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const confirmResolution = async (req, res) => {
  const { confirmed } = req.body;
  try {
    const confirmation = await prisma.confirmation.create({
      data: { reportId: req.params.id, userId: req.user.id, confirmed },
    });

    if (!confirmed) {
      await prisma.report.update({
        where: { id: req.params.id },
        data: { status: "REOPENED" },
      });

      await prisma.statusHistory.create({
        data: { reportId: req.params.id, status: "REOPENED", changedBy: req.user.id },
      });
    }

    res.json({ message: confirmed ? "Resolution confirmed" : "Issue reopened", confirmation });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { getAssignedReports, addProgressUpdate, markResolved, confirmResolution };
