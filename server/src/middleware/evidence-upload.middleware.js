const multer = require("multer");
const path = require("path");

const createEvidenceUpload = (fieldName) => {
  const upload = multer({
    dest: path.join(__dirname, "../../uploads"),
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("video/"))
        return callback(new Error("File must be a photo or video"));
      callback(null, true);
    },
  });

  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  };
};

module.exports = createEvidenceUpload;
