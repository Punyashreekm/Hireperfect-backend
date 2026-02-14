const express = require("express");
const { body, validationResult } = require("express-validator");
const Document = require("../models/Document");
const Chat = require("../models/Chat");
const auth = require("../middleware/auth");
const {
  generateEmbedding,
  generateInitialQuestions,
  evaluateResponse,
} = require("../utils/openai");
const { findSimilarChunks } = require("../utils/similarity");

const router = express.Router();

// @route   POST /api/chat/start
// @desc    Start new chat session with initial questions
// @access  Private
router.post("/start", auth, async (req, res) => {
  try {
    // Check if user has both documents
    const resume = await Document.findOne({
      userId: req.user._id,
      type: "resume",
    });

    const jobDescription = await Document.findOne({
      userId: req.user._id,
      type: "job_description",
    });

    if (!resume || !jobDescription) {
      return res.status(400).json({
        message:
          "Please upload both resume and job description before starting chat",
      });
    }

    // Generate session ID
    const sessionId = `session_${req.user._id}_${Date.now()}`;

    // Get job description text for question generation
    const jobDescriptionText = jobDescription.chunks
      .map((chunk) => chunk.text)
      .join(" ");

    // Generate initial questions
    const questionsText = await generateInitialQuestions(jobDescriptionText);
    const questions = questionsText.split("\n").filter((q) => q.trim());

    // Create new chat session
    const chat = new Chat({
      userId: req.user._id,
      sessionId,
      messages: [
        {
          role: "assistant",
          content: `Welcome to your interview preparation session! Here are 3 questions based on the job description:\n\n${questions
            .map((q, i) => `${i + 1}. ${q}`)
            .join("\n\n")}\n\nPlease answer any of these questions to begin.`,
        },
      ],
      currentQuestion: questions[0] || questions[0],
    });

    await chat.save();

    res.json({
      sessionId,
      message: chat.messages[0].content,
      questions,
    });
  } catch (error) {
    console.error("Start chat error:", error);
    res.status(500).json({ message: "Error starting chat session" });
  }
});

// @route   POST /api/chat/query
// @desc    Process user response and get AI evaluation
// @access  Private
router.post(
  "/query",
  [
    auth,
    body("message")
      .trim()
      .isLength({ min: 10 })
      .withMessage("Response must be at least 10 characters"),
    body("sessionId").notEmpty().withMessage("Session ID is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { message, sessionId } = req.body;

      // Find the chat session
      const chat = await Chat.findOne({
        sessionId,
        userId: req.user._id,
      });

      if (!chat) {
        return res.status(404).json({ message: "Chat session not found" });
      }

      // Get user's documents
      const resume = await Document.findOne({
        userId: req.user._id,
        type: "resume",
      });

      const jobDescription = await Document.findOne({
        userId: req.user._id,
        type: "job_description",
      });

      if (!resume || !jobDescription) {
        return res.status(400).json({
          message: "Required documents not found",
        });
      }

      // Add user message to chat
      chat.messages.push({
        role: "user",
        content: message,
        timestamp: new Date(),
      });

      // Generate embedding for user's response
      const queryEmbedding = await generateEmbedding(message);

      // Find similar chunks from resume and job description
      const resumeChunks = findSimilarChunks(queryEmbedding, resume.chunks, 2);
      const jobDescriptionChunks = findSimilarChunks(
        queryEmbedding,
        jobDescription.chunks,
        2
      );

      // Get the current question (last assistant message or a default)
      const lastAssistantMessage = chat.messages
        .filter((msg) => msg.role === "assistant")
        .pop();

      const currentQuestion =
        chat.currentQuestion ||
        (lastAssistantMessage
          ? lastAssistantMessage.content
          : "Tell me about yourself");

      // Evaluate the response
      const evaluation = await evaluateResponse(
        currentQuestion,
        message,
        resumeChunks,
        jobDescriptionChunks
      );

      // Parse the evaluation response
      const scoreMatch = evaluation.match(/Score:\s*(\d+)/i);
      const feedbackMatch = evaluation.match(/Feedback:\s*([^\n]+)/i);
      const relevantSectionsMatch = evaluation.match(
        /Relevant sections:\s*([^\n]+)/i
      );

      const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;
      const feedback = feedbackMatch
        ? feedbackMatch[1].trim()
        : "Thank you for your response.";
      const relevantSections = relevantSectionsMatch
        ? relevantSectionsMatch[1].trim()
        : "";

      // Create citations
      const citations = [
        ...resumeChunks.map((chunk, index) => ({
          documentId: resume._id,
          chunkIndex: resume.chunks.findIndex((c) => c.text === chunk.text),
          text: chunk.text.substring(0, 200) + "...",
        })),
        ...jobDescriptionChunks.map((chunk, index) => ({
          documentId: jobDescription._id,
          chunkIndex: jobDescription.chunks.findIndex(
            (c) => c.text === chunk.text
          ),
          text: chunk.text.substring(0, 200) + "...",
        })),
      ];

      // Generate AI response
      const aiResponse = `**Score: ${score}/10**

${feedback}

${relevantSections ? `**Relevant Information:** ${relevantSections}` : ""}

Would you like to answer another question or would you like me to ask a follow-up question about your response?`;

      // Add assistant response to chat
      chat.messages.push({
        role: "assistant",
        content: aiResponse,
        score,
        feedback,
        citations,
        timestamp: new Date(),
      });

      await chat.save();

      res.json({
        response: aiResponse,
        score,
        feedback,
        citations: citations.map((citation) => ({
          documentId: citation.documentId,
          chunkIndex: citation.chunkIndex,
          text: citation.text,
        })),
      });
    } catch (error) {
      console.error("Chat query error:", error);
      res.status(500).json({ message: "Error processing your response" });
    }
  }
);

// @route   GET /api/chat/history/:sessionId
// @desc    Get chat history for a session
// @access  Private
router.get("/history/:sessionId", auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      sessionId: req.params.sessionId,
      userId: req.user._id,
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat session not found" });
    }

    res.json({
      sessionId: chat.sessionId,
      messages: chat.messages,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    });
  } catch (error) {
    console.error("Get chat history error:", error);
    res.status(500).json({ message: "Error fetching chat history" });
  }
});

// @route   GET /api/chat/sessions
// @desc    Get user's chat sessions
// @access  Private
router.get("/sessions", auth, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user._id })
      .select("sessionId createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .limit(10);

    res.json({ sessions: chats });
  } catch (error) {
    console.error("Get chat sessions error:", error);
    res.status(500).json({ message: "Error fetching chat sessions" });
  }
});

module.exports = router;
