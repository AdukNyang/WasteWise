const multer = require("multer");
const path = require("path");
const fs = require("fs");

const MAX_EVIDENCE_SIZE = 25 * 1024 * 1024;

const isAllowedEvidence = (file) => {
  if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("video/"))
    return false;

  const allowedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ]);
  return allowedTypes.has(file.mimetype);
};

const matchesFileSignature = (header, mimetype) => {
  if (mimetype === "image/jpeg")
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  if (mimetype === "image/png")
    return header.toString("ascii", 1, 4) === "PNG";
  if (mimetype === "image/gif")
    return header.toString("ascii", 0, 6).startsWith("GIF8");
  if (mimetype === "image/webp")
    return header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP";
  if (mimetype === "video/webm")
    return header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3;
  if (mimetype === "video/mp4" || mimetype === "video/quicktime")
    return header.toString("ascii", 4, 8) === "ftyp";
  return false;
};

const createEvidenceUpload = (fieldName) => {
  const upload = multer({
    dest: path.join(__dirname, "../../uploads"),
    limits: { fileSize: MAX_EVIDENCE_SIZE, files: 1 },
    fileFilter: (req, file, callback) => {
      if (!isAllowedEvidence(file))
        return callback(new Error("File must be a supported photo or video"));
      callback(null, true);
    },
  });

  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE")
          return res.status(400).json({ message: "File is too large. Maximum size is 25 MB" });
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) return next();

      const header = Buffer.alloc(16);
      fs.open(req.file.path, "r", (openError, fd) => {
        if (openError)
          return res.status(400).json({ message: "Could not validate the uploaded file" });

        fs.read(fd, header, 0, header.length, 0, (readError) => {
          fs.close(fd, () => {});
          if (readError || !matchesFileSignature(header, req.file.mimetype)) {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ message: "Uploaded file content does not match a supported photo or video" });
          }
          next();
        });
      });
    });
  };
};

module.exports = createEvidenceUpload;
module.exports.matchesFileSignature = matchesFileSignature;
