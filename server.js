const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const examRoutes = require("./routes/exams");
const assessmentRoutes = require("./routes/assessment");
const candidateRoutes = require("./routes/candidate");
const adminRoutes = require("./routes/admin");
const { seedDefaultExams } = require("./utils/seedExams");
const { seedAdminUser } = require("./utils/seedAdmin");

const app = express();

app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
  }),
);

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      process.env.FRONTEND_URL,
      "https://hireperfect-frontend.vercel.app",
      "https://hireperfect-admin.vercel.app",
    ].filter(Boolean),
    credentials: true,
  }),
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    await seedDefaultExams();
    await seedAdminUser();
    console.log("Default exam catalog ready");
  })
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/assessment", assessmentRoutes);
app.use("/api/candidate", candidateRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    service: "Hireperfect API",
    timestamp: new Date().toISOString(),
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.use("*", (_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Hireperfect backend running on port ${PORT}`);
});
