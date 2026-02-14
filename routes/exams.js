const express = require("express");
const { body, validationResult } = require("express-validator");
const Exam = require("../models/Exam");
const User = require("../models/User");
const { auth, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
router.use(auth, authorizeRoles("candidate"));

const sanitizeExamForCandidate = (exam) => ({
  id: exam._id,
  title: exam.title,
  category: exam.category,
  subCategory: exam.subCategory,
  description: exam.description,
  durationMinutes: exam.durationMinutes,
  supportsCoding: exam.supportsCoding,
  questionCount: exam.questions.length,
});

router.get("/catalog", async (_req, res) => {
  const exams = await Exam.find({ active: true }).sort({ category: 1, subCategory: 1, title: 1 });

  const grouped = exams.reduce((acc, exam) => {
    if (!acc[exam.category]) acc[exam.category] = [];
    acc[exam.category].push(sanitizeExamForCandidate(exam));
    return acc;
  }, {});

  res.json({ categories: grouped });
});

router.post(
  "/purchase",
  [body("examId").isMongoId()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", errors: errors.array() });

    const exam = await Exam.findOne({ _id: req.body.examId, active: true });
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { purchasedExams: exam._id } }
    );

    res.json({ message: "Exam added to your dashboard", exam: sanitizeExamForCandidate(exam) });
  }
);

router.get("/mine", async (req, res) => {
  const user = await User.findById(req.user._id).populate("purchasedExams");
  const exams = (user.purchasedExams || []).map(sanitizeExamForCandidate);
  res.json({ exams });
});

module.exports = router;
