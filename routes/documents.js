const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const AWS = require("aws-sdk");
const cloudinary = require("cloudinary").v2;
const Document = require("../models/Document");
const auth = require("../middleware/auth");
const { generateEmbedding } = require("../utils/openai");

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

// Helper function to chunk text
const chunkText = (text, chunkSize = 500) => {
  const words = text.split(" ");
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) {
      chunks.push(chunk.trim());
    }
  }

  return chunks;
};

// Helper function to upload file to cloud storage or local storage
const uploadToCloud = async (file, filename) => {
  try {
    // Try Cloudinary first
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await cloudinary.uploader.upload(
        `data:application/pdf;base64,${file.buffer.toString("base64")}`,
        {
          resource_type: "raw",
          public_id: `interview-prep/${filename}`,
          folder: "interview-prep",
        }
      );
      return result.secure_url;
    }
    // Fallback to S3 if configured
    else if (process.env.AWS_S3_BUCKET) {
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `interview-prep/${filename}`,
        Body: file.buffer,
        ContentType: "application/pdf",
        ACL: "public-read",
      };

      const result = await s3.upload(params).promise();
      return result.Location;
    }
    // Fallback to local file storage
    else {
      const fs = require("fs");
      const path = require("path");

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, "..", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, file.buffer);

      // Return a URL that can be served by Express
      return `/uploads/${filename}`;
    }
  } catch (error) {
    console.error("File upload error:", error);
    throw error;
  }
};

// @route   POST /api/documents/upload
// @desc    Upload and process document
// @access  Private
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const { type } = req.body;
    if (!type || !["resume", "job_description"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Document type must be resume or job_description" });
    }

    // Parse PDF
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json({ message: "Could not extract text from PDF" });
    }

    // Generate filename
    const timestamp = Date.now();
    const filename = `${req.user._id}_${type}_${timestamp}.pdf`;

    // Upload to cloud storage
    const fileUrl = await uploadToCloud(req.file, filename);

    // Chunk the text
    const textChunks = chunkText(text);

    // Generate embeddings for each chunk
    const chunks = [];
    for (let i = 0; i < textChunks.length; i++) {
      try {
        const embedding = await generateEmbedding(textChunks[i]);
        chunks.push({
          text: textChunks[i],
          embedding,
          pageNumber: Math.floor(i / 3) + 1, // Approximate page numbers
        });
      } catch (error) {
        console.error(`Error generating embedding for chunk ${i}:`, error);
        // Continue with other chunks even if one fails
      }
    }

    // Save document to database
    const document = new Document({
      userId: req.user._id,
      type,
      filename,
      originalName: req.file.originalname,
      fileUrl,
      fileSize: req.file.size,
      chunks,
    });

    await document.save();

    res.json({
      message: "Document uploaded and processed successfully",
      document: {
        id: document._id,
        type: document.type,
        filename: document.filename,
        originalName: document.originalName,
        fileUrl: document.fileUrl,
        chunksCount: document.chunks.length,
        uploadedAt: document.uploadedAt,
      },
    });
  } catch (error) {
    console.error("Document upload error:", error);
    res.status(500).json({
      message: "Error processing document",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// @route   GET /api/documents/list
// @desc    Get user's documents
// @access  Private
router.get("/list", auth, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id })
      .select("-chunks") // Exclude chunks to reduce response size
      .sort({ uploadedAt: -1 });

    res.json({ documents });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({ message: "Error fetching documents" });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete document
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // TODO: Delete from cloud storage as well
    await Document.findByIdAndDelete(req.params.id);

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ message: "Error deleting document" });
  }
});

// @route   GET /api/documents/check
// @desc    Check if user has both resume and job description
// @access  Private
router.get("/check", auth, async (req, res) => {
  try {
    const resume = await Document.findOne({
      userId: req.user._id,
      type: "resume",
    });

    const jobDescription = await Document.findOne({
      userId: req.user._id,
      type: "job_description",
    });

    res.json({
      hasResume: !!resume,
      hasJobDescription: !!jobDescription,
      readyForChat: !!(resume && jobDescription),
    });
  } catch (error) {
    console.error("Check documents error:", error);
    res.status(500).json({ message: "Error checking documents" });
  }
});

module.exports = router;
