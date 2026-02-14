const express = require("express");
const { body, param, validationResult } = require("express-validator");
const Exam = require("../models/Exam");
const User = require("../models/User");
const Attempt = require("../models/Attempt");
const { auth, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
router.use(auth, authorizeRoles("admin"));

router.get("/overview", async (_req, res) => {
  const [users, exams, attempts, openAttempts] = await Promise.all([
    User.countDocuments({ role: "candidate" }),
    Exam.countDocuments(),
    Attempt.countDocuments(),
    Attempt.find({ status: "in_progress" }).populate("candidate", "name email").populate("exam", "title"),
  ]);

  res.json({
    stats: { users, exams, attempts },
    liveMonitoring: openAttempts.map((a) => ({
      attemptId: a._id,
      candidate: a.candidate,
      exam: a.exam,
      warningsCount: a.warningsCount,
      status: a.status,
      startedAt: a.startedAt,
    })),
  });
});

router.get("/users", async (_req, res) => {
  const users = await User.find().select("name email role purchasedExams createdAt").populate("purchasedExams", "title category subCategory");
  res.json({ users });
});

router.get("/attempts", async (_req, res) => {
  const attempts = await Attempt.find()
    .populate("candidate", "name email")
    .populate("exam", "title category subCategory")
    .sort({ createdAt: -1 });

  res.json({ attempts });
});

router.get("/exams", async (_req, res) => {
  const exams = await Exam.find().sort({ category: 1, subCategory: 1, title: 1 });
  res.json({ exams });
});

router.get("/exams", async (_req, res) => {
  const exams = await Exam.find().sort({ category: 1, subCategory: 1, title: 1 });
  res.json({ exams });
});

router.post(
  "/exams",
  [
    body("title").isString().notEmpty(),
    body("category").isIn(["Soft Skills", "IT", "MBA"]),
    body("subCategory").isString().notEmpty(),
    body("questions").isArray({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", errors: errors.array() });

    const exam = await Exam.create({
      ...req.body,
      durationMinutes: 30,
      supportsCoding: req.body.category === "IT",
    });

    res.status(201).json({ exam });
  }
);

router.patch(
  "/exams/:examId",
  [param("examId").isMongoId()],
  async (req, res) => {
    const exam = await Exam.findByIdAndUpdate(req.params.examId, req.body, { new: true, runValidators: true });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json({ exam });
  }
);

router.delete(
  "/exams/:examId",
  [param("examId").isMongoId()],
  async (req, res) => {
    const exam = await Exam.findByIdAndDelete(req.params.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json({ message: "Exam deleted" });
  }
);

module.exports = router;
