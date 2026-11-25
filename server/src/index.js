const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { getUploadDirectory } = require("./services/upload-storage.service");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const reportRoutes = require("./routes/report.routes");
const adminRoutes = require("./routes/admin.routes");
const stakeholderRoutes = require("./routes/stakeholder.routes");
const ecocoinsRoutes = require("./routes/ecocoins.routes");
const notificationRoutes = require("./routes/notification.routes");
const { authenticate } = require("./middleware/auth.middleware");

const app = express();

app.set("trust proxy", 1);
app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Origin not allowed"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", authenticate, express.static(getUploadDirectory()));

app.get("/", (req, res) => res.json({ message: "WasteWise API is running" }));

app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/stakeholder", stakeholderRoutes);
app.use("/api/ecocoins", ecocoinsRoutes);
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
