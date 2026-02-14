const express = require("express");
const { body, param, validationResult } = require("express-validator");
const Attempt = require("../models/Attempt");
const Exam = require("../models/Exam");
const User = require("../models/User");
const { auth, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
router.use(auth, authorizeRoles("candidate"));
const MAX_WARNINGS = 5;

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const mapQuestion = (question) => ({
  id: question._id,
  prompt: question.prompt,
  questionType: question.questionType,
  options: question.options,
  codingMeta:
    question.questionType === "coding"
      ? {
          language: question.codingMeta?.language || "",
          starterCode: question.codingMeta?.starterCode || "",
        }
      : undefined,
});

const scoreAttempt = (exam, attempt) => {
  let score = 0;
  for (const answer of attempt.answers) {
    const question = exam.questions.id(answer.questionId);
    if (!question) continue;
    if (question.questionType === "mcq" && answer.selectedOptionId === question.correctOptionId) {
      score += 1;
    }
    if (question.questionType === "scenario" && answer.textAnswer && answer.textAnswer.trim().length > 20) {
      score += 0.5;
    }
    if (question.questionType === "coding" && answer.codeAnswer && answer.codeAnswer.trim().length > 30) {
      score += 1;
    }
  }
  return Number(((score / Math.max(exam.questions.length, 1)) * 100).toFixed(2));
};

const hasAccess = (user, examId) =>
  (user.purchasedExams || []).some((id) => id.toString() === examId.toString());

router.post(
  "/start",
  [body("examId").isMongoId(), body("navigationMode").optional().isIn(["free", "sequential"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Validation failed", errors: errors.array() });

    const exam = await Exam.findOne({ _id: req.body.examId, active: true });
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const user = await User.findById(req.user._id);
    if (!hasAccess(user, exam._id)) {
      return res.status(403).json({ message: "Purchase/select this exam first" });
    }

    const order = shuffle(exam.questions.map((q) => q._id));
    const now = Date.now();
    const endsAt = new Date(now + exam.durationMinutes * 60 * 1000);

    const attempt = await Attempt.create({
      candidate: req.user._id,
      exam: exam._id,
      endsAt,
      questionOrder: order,
      totalQuestions: exam.questions.length,
      navigationMode: req.body.navigationMode || "free",
    });

    res.status(201).json({
      attemptId: attempt._id,
      exam: {
        id: exam._id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        navigationMode: attempt.navigationMode,
      },
      endsAt,
      questions: order.map((qid) => mapQuestion(exam.questions.id(qid))),
    });
  }
);

router.get(
  "/:attemptId",
  [param("attemptId").isMongoId()],
  async (req, res) => {
    const attempt = await Attempt.findOne({ _id: req.params.attemptId, candidate: req.user._id }).populate("exam");
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    const exam = attempt.exam;
    const questions = attempt.questionOrder.map((qid) => mapQuestion(exam.questions.id(qid)));

    res.json({
      attemptId: attempt._id,
      status: attempt.status,
      endsAt: attempt.endsAt,
      warningsCount: attempt.warningsCount,
      questions,
      answers: attempt.answers,
      navigationMode: attempt.navigationMode,
    });
  }
);

router.post(
  "/:attemptId/answer",
  [
    param("attemptId").isMongoId(),
    body("questionId").isMongoId(),
    body("selectedOptionId").optional().isString(),
    body("textAnswer").optional().isString(),
    body("codeAnswer").optional().isString(),
  ],
  async (req, res) => {
    const attempt = await Attempt.findOne({ _id: req.params.attemptId, candidate: req.user._id });
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status !== "in_progress") return res.status(409).json({ message: "Attempt already closed" });

    if (new Date() > attempt.endsAt) {
      attempt.status = "auto_submitted";
      attempt.submittedAt = new Date();
      await attempt.save();
      return res.status(409).json({ message: "Time is over, attempt auto-submitted" });
    }

    const index = attempt.answers.findIndex((a) => a.questionId.toString() === req.body.questionId);
    const answerData = {
      questionId: req.body.questionId,
      selectedOptionId: req.body.selectedOptionId,
      textAnswer: req.body.textAnswer,
      codeAnswer: req.body.codeAnswer,
    };

    if (index >= 0) attempt.answers[index] = answerData;
    else attempt.answers.push(answerData);

    await attempt.save();
    return res.json({ message: "Answer saved" });
  }
);

router.post(
  "/:attemptId/proctor-event",
  [
    param("attemptId").isMongoId(),
    body("type").isIn([
      "face_missing",
      "eye_movement",
      "head_movement",
      "tab_switch",
      "screen_minimize",
      "fullscreen_exit",
      "copy_paste_attempt",
      "right_click_attempt",
      "screen_capture_attempt",
    ]),
  ],
  async (req, res) => {
    const attempt = await Attempt.findOne({ _id: req.params.attemptId, candidate: req.user._id });
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status !== "in_progress") return res.status(409).json({ message: "Attempt already closed" });

    const immediateExit = ["tab_switch", "screen_minimize"];
    const critical = immediateExit.includes(req.body.type);

    attempt.violations.push({
      type: req.body.type,
      severity: critical ? "critical" : "warning",
      message: critical
        ? "Assessment terminated due to tab switch/minimize"
        : `Warning issued for ${req.body.type}`,
      timestamp: new Date(),
    });

    if (critical) {
      attempt.status = "terminated";
      attempt.submittedAt = new Date();
      await attempt.save();
      return res.status(200).json({ message: "Assessment terminated", terminated: true, warningsCount: attempt.warningsCount });
    }

    attempt.warningsCount += 1;
    if (attempt.warningsCount >= MAX_WARNINGS) {
      attempt.status = "terminated";
      attempt.submittedAt = new Date();
      await attempt.save();
      return res.status(200).json({ message: "Assessment terminated after 5 warnings", terminated: true, warningsCount: attempt.warningsCount });
    }

    await attempt.save();
    return res.json({
      warning: true,
      warningsCount: attempt.warningsCount,
      remainingWarnings: MAX_WARNINGS - attempt.warningsCount,
      message: `Warning ${attempt.warningsCount}/${MAX_WARNINGS}`,
    });
  }
);

router.post(
  "/:attemptId/submit",
  [param("attemptId").isMongoId()],
  async (req, res) => {
    const attempt = await Attempt.findOne({ _id: req.params.attemptId, candidate: req.user._id }).populate("exam");
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    if (attempt.status !== "in_progress") {
      return res.json({ message: "Attempt already submitted", score: attempt.score, status: attempt.status });
    }

    const exam = attempt.exam;
    attempt.score = scoreAttempt(exam, attempt);
    attempt.status = new Date() > attempt.endsAt ? "auto_submitted" : "completed";
    attempt.submittedAt = new Date();
    await attempt.save();

    return res.json({
      message: "Assessment submitted",
      status: attempt.status,
      score: attempt.score,
      warningsCount: attempt.warningsCount,
      violations: attempt.violations,
    });
  }
);

module.exports = router;
