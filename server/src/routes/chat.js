import express from "express";
import { body, param, query, validationResult } from "express-validator";
import winston from "winston";
import chatService from "../services/chatService.js";
import databaseService from "../services/databaseService.js";

const router = express.Router();
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "chat-api" },
});

// POST /api/chat/:documentId/session - Create a new chat session
router.post(
  "/:documentId/session",
  [
    param("documentId").isUUID().withMessage("Invalid document ID"),
    body("sessionId").optional().isString(),
    body("title").optional().isString(),
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

      const { documentId } = req.params;
      const { sessionId, title } = req.body;

      // Check if document exists
      const document = await databaseService.getDocument(documentId);
      if (!document) {
        return res.status(404).json({
          error: "Document not found",
          message: `No document found with ID: ${documentId}`,
        });
      }

      const session = await chatService.createSession(
        documentId,
        sessionId,
        title,
      );

      res.status(201).json({
        success: true,
        message: "Chat session created successfully",
        data: session,
      });
    } catch (error) {
      logger.error("Failed to create chat session:", error);
      res.status(500).json({
        error: "Failed to create chat session",
        message: error.message,
      });
    }
  },
);

// POST /api/chat/:documentId/message - Send a message
router.post(
  "/:documentId/message",
  [
    param("documentId").isUUID().withMessage("Invalid document ID"),
    body("message")
      .isString()
      .isLength({ min: 1 })
      .withMessage("Message is required"),
    body("sessionId").isString().withMessage("Session ID is required"),
    body("messageType")
      .optional()
      .isIn(["user", "assistant", "system"])
      .withMessage("Invalid message type"),
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

      const { documentId } = req.params;
      const { message, sessionId, messageType = "user" } = req.body;

      // Check if document exists
      const document = await databaseService.getDocument(documentId);
      if (!document) {
        return res.status(404).json({
          error: "Document not found",
          message: `No document found with ID: ${documentId}`,
        });
      }

      // Save user message
      const userMessage = await chatService.sendMessage(
        sessionId,
        documentId,
        message,
        messageType,
      );

      // Generate AI response if it's a user message
      let aiResponse = null;
      if (messageType === "user") {
        aiResponse = await chatService.generateResponse(
          documentId,
          message,
          sessionId,
        );
      }

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: {
          userMessage,
          aiResponse,
        },
      });
    } catch (error) {
      logger.error("Failed to send message:", error);
      res.status(500).json({
        error: "Failed to send message",
        message: error.message,
      });
    }
  },
);

// GET /api/chat/:documentId/history - Get chat history
router.get(
  "/:documentId/history",
  [
    param("documentId").isUUID().withMessage("Invalid document ID"),
    query("sessionId").isString().withMessage("Session ID is required"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Offset must be non-negative"),
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

      const { documentId } = req.params;
      const { sessionId, limit = 50, offset = 0 } = req.query;

      // Check if document exists
      const document = await databaseService.getDocument(documentId);
      if (!document) {
        return res.status(404).json({
          error: "Document not found",
          message: `No document found with ID: ${documentId}`,
        });
      }

      const history = await chatService.getChatHistory(
        documentId,
        sessionId,
        parseInt(limit),
        parseInt(offset),
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error("Failed to get chat history:", error);
      res.status(500).json({
        error: "Failed to get chat history",
        message: error.message,
      });
    }
  },
);

// GET /api/chat/:documentId/sessions - Get all chat sessions for a document
router.get(
  "/:documentId/sessions",
  [param("documentId").isUUID().withMessage("Invalid document ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { documentId } = req.params;

      // Check if document exists
      const document = await databaseService.getDocument(documentId);
      if (!document) {
        return res.status(404).json({
          error: "Document not found",
          message: `No document found with ID: ${documentId}`,
        });
      }

      const sessions = await chatService.getDocumentSessions(documentId);

      res.json({
        success: true,
        data: {
          documentId,
          sessions,
        },
      });
    } catch (error) {
      logger.error("Failed to get chat sessions:", error);
      res.status(500).json({
        error: "Failed to get chat sessions",
        message: error.message,
      });
    }
  },
);

// DELETE /api/chat/:documentId/session - Delete a chat session
router.delete(
  "/:documentId/session",
  [
    param("documentId").isUUID().withMessage("Invalid document ID"),
    query("sessionId").isString().withMessage("Session ID is required"),
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

      const { documentId } = req.params;
      const { sessionId } = req.query;

      // Check if document exists
      const document = await databaseService.getDocument(documentId);
      if (!document) {
        return res.status(404).json({
          error: "Document not found",
          message: `No document found with ID: ${documentId}`,
        });
      }

      const result = await chatService.deleteSession(sessionId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Failed to delete chat session:", error);
      res.status(500).json({
        error: "Failed to delete chat session",
        message: error.message,
      });
    }
  },
);

// DELETE /api/chat/:documentId/history - Clear chat history
router.delete(
  "/:documentId/history",
  [
    param("documentId").isUUID().withMessage("Invalid document ID"),
    query("sessionId").isString().withMessage("Session ID is required"),
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

      const { documentId } = req.params;
      const { sessionId } = req.query;

      // Check if document exists
      const document = await databaseService.getDocument(documentId);
      if (!document) {
        return res.status(404).json({
          error: "Document not found",
          message: `No document found with ID: ${documentId}`,
        });
      }

      const result = await chatService.clearChatHistory(documentId, sessionId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Failed to clear chat history:", error);
      res.status(500).json({
        error: "Failed to clear chat history",
        message: error.message,
      });
    }
  },
);

// GET /api/chat/:documentId/export - Export chat history
router.get(
  "/:documentId/export",
  [
    param("documentId").isUUID().withMessage("Invalid document ID"),
    query("sessionId").isString().withMessage("Session ID is required"),
    query("format")
      .optional()
      .isIn(["json", "txt"])
      .withMessage("Format must be json or txt"),
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

      const { documentId } = req.params;
      const { sessionId, format = "json" } = req.query;

      // Check if document exists
      const document = await databaseService.getDocument(documentId);
      if (!document) {
        return res.status(404).json({
          error: "Document not found",
          message: `No document found with ID: ${documentId}`,
        });
      }

      const exportData = await chatService.exportChatHistory(
        documentId,
        sessionId,
        format,
      );

      // Set appropriate headers for download
      res.setHeader("Content-Type", exportData.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${exportData.filename}"`,
      );

      if (format === "json") {
        res.json(exportData.data);
      } else {
        res.send(exportData.data);
      }
    } catch (error) {
      logger.error("Failed to export chat history:", error);
      res.status(500).json({
        error: "Failed to export chat history",
        message: error.message,
      });
    }
  },
);

// GET /api/chat/:documentId/session/:sessionId/stats - Get session statistics
router.get(
  "/:documentId/session/:sessionId/stats",
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

      const stats = await chatService.getSessionStats(sessionId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Failed to get session stats:", error);
      res.status(500).json({
        error: "Failed to get session stats",
        message: error.message,
      });
    }
  },
);

export default router;
