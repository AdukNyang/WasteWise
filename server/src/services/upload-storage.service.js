const path = require("path");

const serverDirectory = path.resolve(__dirname, "../..");

const getUploadDirectory = () => {
  const configuredDirectory = process.env.UPLOAD_DIR || "uploads";
  return path.resolve(serverDirectory, configuredDirectory);
};

module.exports = { getUploadDirectory };
