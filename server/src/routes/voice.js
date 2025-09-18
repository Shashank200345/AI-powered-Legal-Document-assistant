import express from "express";
import multer from "multer";
import { body, param, validationResult } from "express-validator";
import winston from "winston";
import speechService from "../services/speechService.js";
import databaseService from "../services/databaseService.js";

const router = express.Router();
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "voice-api" },
});

// Configure multer for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "audio/wav",
      "audio/mp3",
      "audio/mpeg",
      "audio/m4a",
      "audio/ogg",
      "audio/webm",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio type: ${file.mimetype}`));
    }
  },
});

// POST /api/voice/:documentId/query - Process voice query
router.post(
  "/:documentId/query",
  upload.single("audio"),
  [
    param("documentId").isUUID().withMessage("Invalid document ID"),
    body("sessionId").optional().isString(),
    body("language").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "No audio file uploaded",
          message: "Please provide an audio file",
        });
      }

      const { documentId } = req.params;
      const { sessionId, language = "en-US" } = req.body;

      // Check if document exists
      const document = await databaseService.getDocument(documentId);
      if (!document) {
        return res.status(404).json({
          error: "Document not found",
          message: `No document found with ID: ${documentId}`,
        });
      }

      const result = await speechService.processVoiceQuery(
        documentId,
        req.file.buffer,
        sessionId,
        language,
      );

      res.status(201).json({
        success: true,
        message: "Voice query processed successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Voice query processing failed:", error);
      res.status(500).json({
        error: "Voice query processing failed",
        message: error.message,
      });
    }
  },
);

// POST /api/voice/transcribe - Transcribe audio only
router.post(
  "/transcribe",
  upload.single("audio"),
  [body("language").optional().isString()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "No audio file uploaded",
          message: "Please provide an audio file",
        });
      }

      const { language = "en-US" } = req.body;

      const transcription = await speechService.transcribeAudio(
        req.file.buffer,
        language,
      );

      res.json({
        success: true,
        data: {
          transcription: {
            text: transcription.text,
            confidence: transcription.confidence,
            language: transcription.language,
            duration: transcription.duration,
            processingTime: transcription.processingTime,
          },
        },
      });
    } catch (error) {
      logger.error("Audio transcription failed:", error);
      res.status(500).json({
        error: "Audio transcription failed",
        message: error.message,
      });
    }
  },
);

// POST /api/voice/synthesize - Synthesize speech
router.post(
  "/synthesize",
  [
    body("text")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Text is required"),
    body("voice").optional().isString(),
    body("language").optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { text, voice = "en-US-Neural2-D", language = "en-US" } = req.body;

      const synthesis = await speechService.synthesizeSpeech(
        text,
        voice,
        language,
      );

      res.json({
        success: true,
        data: {
          audio: synthesis.audio,
          format: synthesis.format,
          duration: synthesis.duration,
          voice: synthesis.voice,
          language: synthesis.language,
          processingTime: synthesis.processingTime,
        },
      });
    } catch (error) {
      logger.error("Speech synthesis failed:", error);
      res.status(500).json({
        error: "Speech synthesis failed",
        message: error.message,
      });
    }
  },
);

// GET /api/voice/:documentId/session/:sessionId/history - Get voice session history
router.get(
  "/:documentId/session/:sessionId/history",
  [
    param("documentId").isUUID().withMessage("Invalid document ID"),
    param("sessionId").isString().withMessage("Session ID is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { documentId, sessionId } = req.params;

      // Check if document exists
      const document = await databaseService.getDocument(documentId);
      if (!document) {
        return res.status(404).json({
          error: "Document not found",
          message: `No document found with ID: ${documentId}`,
        });
      }

      const history = await speechService.getVoiceSessionHistory(
        documentId,
        sessionId,
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error("Failed to get voice session history:", error);
      res.status(500).json({
        error: "Failed to get voice session history",
        message: error.message,
      });
    }
  },
);

// DELETE /api/voice/:documentId/session/:sessionId - Delete voice session
router.delete(
  "/:documentId/session/:sessionId",
  [
    param("documentId").isUUID().withMessage("Invalid document ID"),
    param("sessionId").isString().withMessage("Session ID is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { documentId, sessionId } = req.params;

      // Check if document exists
      const document = await databaseService.getDocument(documentId);
      if (!document) {
        return res.status(404).json({
          error: "Document not found",
          message: `No document found with ID: ${documentId}`,
        });
      }

      const result = await speechService.deleteVoiceSession(sessionId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Failed to delete voice session:", error);
      res.status(500).json({
        error: "Failed to delete voice session",
        message: error.message,
      });
    }
  },
);

// GET /api/voice/capabilities - Get voice capabilities
router.get("/capabilities", (req, res) => {
  try {
    const capabilities = speechService.getSupportedLanguages();

    res.json({
      success: true,
      data: capabilities,
    });
  } catch (error) {
    logger.error("Failed to get voice capabilities:", error);
    res.status(500).json({
      error: "Failed to get voice capabilities",
      message: error.message,
    });
  }
});

// GET /api/voice/stats - Get voice service statistics
router.get("/stats", async (req, res) => {
  try {
    const healthCheck = await speechService.healthCheck();

    res.json({
      success: true,
      data: {
        service: "voice",
        status: healthCheck.status,
        message: healthCheck.message,
        capabilities: speechService.getSupportedLanguages(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to get voice stats:", error);
    res.status(500).json({
      error: "Failed to get voice stats",
      message: error.message,
    });
  }
});

// Error handling middleware for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "Audio file too large",
        message: "Audio file size should not exceed 50MB",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: "Too many files",
        message: "Only one audio file allowed per request",
      });
    }
  }

  if (err.message.includes("Unsupported audio type")) {
    return res.status(400).json({
      error: "Unsupported audio type",
      message: err.message,
    });
  }

  next(err);
});

export default router;
