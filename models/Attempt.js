const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedOptionId: { type: String },
    textAnswer: { type: String },
    codeAnswer: { type: String },
  },
  { _id: false }
);

const violationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "face_missing",
        "eye_movement",
        "head_movement",
        "tab_switch",
        "screen_minimize",
        "fullscreen_exit",
        "copy_paste_attempt",
        "right_click_attempt",
        "screen_capture_attempt",
      ],
      required: true,
    },
    severity: { type: String, enum: ["warning", "critical"], default: "warning" },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "terminated", "auto_submitted"],
      default: "in_progress",
    },
    startedAt: { type: Date, default: Date.now },
    endsAt: { type: Date, required: true },
    submittedAt: { type: Date },
    warningsCount: { type: Number, default: 0 },
    questionOrder: [{ type: mongoose.Schema.Types.ObjectId, required: true }],
    answers: [answerSchema],
    violations: [violationSchema],
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    navigationMode: {
      type: String,
      enum: ["free", "sequential"],
      default: "free",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attempt", attemptSchema);
