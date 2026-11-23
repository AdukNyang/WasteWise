const canAccessReport = (user, report) => {
  if (!user || !report) return false;
  if (user.role === "ADMINISTRATOR" || report.userId === user.id) return true;
  return user.role === "RESPONSIBLE_STAKEHOLDER" && report.assignment?.assignedTo === user.id;
};

module.exports = { canAccessReport };
