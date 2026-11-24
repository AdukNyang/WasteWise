const REPORT_CATEGORIES = new Set([
  "Blocked Drain",
  "Illegal Dumping",
  "Open Burning",
  "Sewage Leakage",
  "Other",
]);

const validateReport = (body = {}, hasEvidence = false) => {
  if (!REPORT_CATEGORIES.has(body.category))
    return "Choose a valid report category";
  if (typeof body.description !== "string")
    return "Description must contain at least 3 words and 20 characters";
  const description = body.description.trim();
  const descriptionWords = description.split(/\s+/).filter((word) => /\p{L}/u.test(word));
  if (description.length < 20 || descriptionWords.length < 3)
    return "Description must contain at least 3 words and 20 characters";
  if (description.length > 2000)
    return "Description must contain no more than 2000 characters";
  if (typeof body.location !== "string" || body.location.trim().length < 3)
    return "Location must contain at least 3 characters";
  if (body.location.trim().length > 200)
    return "Location must contain no more than 200 characters";
  if (!hasEvidence)
    return "A photo or video is required as report evidence";
  return null;
};

const validateProgressNote = (note) => {
  if (typeof note !== "string" || note.trim().length < 5)
    return "Progress update must contain at least 5 characters";
  if (note.trim().length > 1000)
    return "Progress update must contain no more than 1000 characters";
  return null;
};

const validateResolutionLocation = (location) => {
  if (typeof location !== "string" || location.trim().length < 3)
    return "Resolution location must contain at least 3 characters";
  if (location.trim().length > 200)
    return "Resolution location must contain no more than 200 characters";
  return null;
};

module.exports = {
  validateProgressNote,
  validateReport,
  validateResolutionLocation,
};
