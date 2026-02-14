const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    questionType: {
      type: String,
      enum: ["mcq", "scenario", "coding"],
      required: true,
    },
    options: [optionSchema],
    correctOptionId: { type: String },
    codingMeta: {
      language: { type: String },
      starterCode: { type: String },
      expectedApproach: { type: String },
    },
  },
  { _id: true }
);

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Soft Skills", "IT", "MBA"],
      required: true,
    },
    subCategory: { type: String, required: true },
    description: { type: String, default: "" },
    durationMinutes: { type: Number, default: 30 },
    supportsCoding: { type: Boolean, default: false },
    questions: [questionSchema],
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);
