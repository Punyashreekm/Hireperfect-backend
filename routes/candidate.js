const express = require("express");
const { auth, authorizeRoles } = require("../middleware/auth");
const User = require("../models/User");
const Attempt = require("../models/Attempt");

const router = express.Router();
router.use(auth, authorizeRoles("candidate"));

router.get("/dashboard", async (req, res) => {
  const user = await User.findById(req.user._id).populate("purchasedExams");
  const attempts = await Attempt.find({ candidate: req.user._id })
    .populate("exam", "title category subCategory")
    .sort({ createdAt: -1 });

  const summary = {
    totalAttempts: attempts.length,
    averageScore: attempts.length
      ? Number((attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length).toFixed(2))
      : 0,
    totalViolations: attempts.reduce((sum, a) => sum + (a.violations?.length || 0), 0),
  };

  res.json({
    purchasedExams: (user.purchasedExams || []).map((exam) => ({
      id: exam._id,
      title: exam.title,
      category: exam.category,
      subCategory: exam.subCategory,
      durationMinutes: exam.durationMinutes,
    })),
    attempts: attempts.map((a) => ({
      id: a._id,
      exam: a.exam,
      status: a.status,
      score: a.score,
      warningsCount: a.warningsCount,
      violations: a.violations,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
    })),
    summary,
  });
});

module.exports = router;
