const mongoose = require("mongoose");

const chunkSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
  },
  pageNumber: {
    type: Number,
    default: 1,
  },
});

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["resume", "job_description"],
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  chunks: [chunkSchema],
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Document", documentSchema);
