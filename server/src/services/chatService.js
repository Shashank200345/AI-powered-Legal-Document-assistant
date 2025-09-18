import { v4 as uuidv4 } from "uuid";
import winston from "winston";
import databaseService from "./databaseService.js";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "chat" },
});

class ChatService {
  constructor() {
    this.activeSessions = new Map(); // In-memory session storage
  }

  // Create a new chat session
  async createSession(documentId, sessionId = null, title = null) {
    try {
      const newSessionId = sessionId || uuidv4();
      const sessionTitle =
        title || `Chat Session ${new Date().toLocaleDateString()}`;

      const sessionData = {
        id: uuidv4(),
        documentId,
        sessionId: newSessionId,
        title: sessionTitle,
      };

      await databaseService.createChatSession(sessionData);

      // Store in memory for quick access
      this.activeSessions.set(newSessionId, {
        documentId,
        title: sessionTitle,
        createdAt: new Date(),
        messageCount: 0,
      });

      logger.info(
        `Created chat session: ${newSessionId} for document: ${documentId}`,
      );

      return {
        sessionId: newSessionId,
        documentId,
        title: sessionTitle,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Failed to create chat session:", error);
      throw error;
    }
  }

  // Send a message in a chat session
  async sendMessage(sessionId, documentId, message, messageType = "user") {
    try {
      const messageId = uuidv4();
      const timestamp = new Date().toISOString();

      // Save message to database
      const messageData = {
        id: messageId,
        sessionId,
        documentId,
        messageType,
        content: message,
        metadata: {
          timestamp,
          messageId,
        },
      };

      await databaseService.saveChatMessage(messageData);

      // Update session info
      if (this.activeSessions.has(sessionId)) {
        const session = this.activeSessions.get(sessionId);
        session.messageCount++;
        session.lastActivity = new Date();
      }

      logger.info(`Message saved: ${messageId} in session: ${sessionId}`);

      return {
        messageId,
        sessionId,
        documentId,
        messageType,
        content: message,
        timestamp,
        metadata: messageData.metadata,
      };
    } catch (error) {
      logger.error("Failed to send message:", error);
      throw error;
    }
  }

  // Get chat history for a session
  async getChatHistory(documentId, sessionId, limit = 50, offset = 0) {
    try {
      const messages = await databaseService.getChatHistory(
        documentId,
        sessionId,
      );

      // Apply pagination
      const paginatedMessages = messages.slice(offset, offset + limit);

      return {
        messages: paginatedMessages,
        totalMessages: messages.length,
        hasMore: offset + limit < messages.length,
        sessionId,
        documentId,
      };
    } catch (error) {
      logger.error("Failed to get chat history:", error);
      throw error;
    }
  }

  // Get all sessions for a document
  async getDocumentSessions(documentId) {
    try {
      const sessions =
        await databaseService.getChatSessionsByDocument(documentId);

      return sessions.map((session) => ({
        sessionId: session.session_id,
        documentId: session.document_id,
        title: session.title,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        messageCount:
          this.activeSessions.get(session.session_id)?.messageCount || 0,
      }));
    } catch (error) {
      logger.error("Failed to get document sessions:", error);
      throw error;
    }
  }

  // Generate AI response (placeholder for your model)
  async generateResponse(documentId, message, sessionId) {
    try {
      // This is where you'll integrate your AI model
      // For now, return a placeholder response
      const responses = [
        "I understand you're asking about the document. Let me analyze that for you.",
        "That's an interesting question about the legal document. Based on my analysis...",
        "I can help you understand that part of the document. Here's what I found...",
        "Let me look into that specific clause for you.",
        "I've reviewed the document and can provide insights on that topic.",
      ];

      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      // Save the AI response
      await this.sendMessage(
        sessionId,
        documentId,
        randomResponse,
        "assistant",
      );

      return {
        response: randomResponse,
        confidence: 0.85,
        sources: ["document analysis"],
        suggestions: [
          "Can you explain this in simpler terms?",
          "What are the key points I should know?",
          "Are there any risks I should be aware of?",
        ],
      };
    } catch (error) {
      logger.error("Failed to generate response:", error);
      throw error;
    }
  }

  // Delete a chat session
  async deleteSession(sessionId) {
    try {
      await databaseService.deleteChatSession(sessionId);
      this.activeSessions.delete(sessionId);

      logger.info(`Deleted chat session: ${sessionId}`);
      return { success: true, message: "Session deleted successfully" };
    } catch (error) {
      logger.error("Failed to delete session:", error);
      throw error;
    }
  }

  // Clear chat history for a session
  async clearChatHistory(documentId, sessionId) {
    try {
      await databaseService.deleteChatHistory(documentId, sessionId);

      // Reset session info
      if (this.activeSessions.has(sessionId)) {
        const session = this.activeSessions.get(sessionId);
        session.messageCount = 0;
        session.lastActivity = new Date();
      }

      logger.info(`Cleared chat history for session: ${sessionId}`);
      return { success: true, message: "Chat history cleared successfully" };
    } catch (error) {
      logger.error("Failed to clear chat history:", error);
      throw error;
    }
  }

  // Export chat history
  async exportChatHistory(documentId, sessionId, format = "json") {
    try {
      const history = await this.getChatHistory(documentId, sessionId);
      const session = await databaseService.getChatSession(
        documentId,
        sessionId,
      );

      const exportData = {
        session: {
          sessionId,
          documentId,
          title: session?.title || "Chat Session",
          createdAt: session?.created_at,
          exportedAt: new Date().toISOString(),
        },
        messages: history.messages,
        statistics: {
          totalMessages: history.totalMessages,
          userMessages: history.messages.filter(
            (m) => m.message_type === "user",
          ).length,
          assistantMessages: history.messages.filter(
            (m) => m.message_type === "assistant",
          ).length,
          systemMessages: history.messages.filter(
            (m) => m.message_type === "system",
          ).length,
        },
      };

      if (format === "json") {
        return {
          data: exportData,
          contentType: "application/json",
          filename: `chat-history-${sessionId}-${new Date().toISOString().split("T")[0]}.json`,
        };
      } else if (format === "txt") {
        const textContent = this.formatChatAsText(exportData);
        return {
          data: textContent,
          contentType: "text/plain",
          filename: `chat-history-${sessionId}-${new Date().toISOString().split("T")[0]}.txt`,
        };
      } else {
        throw new Error("Unsupported export format");
      }
    } catch (error) {
      logger.error("Failed to export chat history:", error);
      throw error;
    }
  }

  // Format chat as text
  formatChatAsText(exportData) {
    let text = `Chat History Export\n`;
    text += `Session: ${exportData.session.title}\n`;
    text += `Document ID: ${exportData.session.documentId}\n`;
    text += `Created: ${exportData.session.createdAt}\n`;
    text += `Exported: ${exportData.session.exportedAt}\n`;
    text += `Total Messages: ${exportData.statistics.totalMessages}\n\n`;
    text += `--- Messages ---\n\n`;

    exportData.messages.forEach((message, index) => {
      const timestamp = new Date(message.created_at).toLocaleString();
      text += `[${timestamp}] ${message.message_type.toUpperCase()}:\n`;
      text += `${message.content}\n\n`;
    });

    return text;
  }

  // Get session statistics
  async getSessionStats(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error("Session not found");
      }

      return {
        sessionId,
        documentId: session.documentId,
        title: session.title,
        messageCount: session.messageCount,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
      };
    } catch (error) {
      logger.error("Failed to get session stats:", error);
      throw error;
    }
  }

  // Clean up inactive sessions (call this periodically)
  async cleanupInactiveSessions(maxAgeHours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      const sessionsToRemove = [];

      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.lastActivity && session.lastActivity < cutoffTime) {
          sessionsToRemove.push(sessionId);
        }
      }

      for (const sessionId of sessionsToRemove) {
        this.activeSessions.delete(sessionId);
      }

      logger.info(`Cleaned up ${sessionsToRemove.length} inactive sessions`);
      return sessionsToRemove.length;
    } catch (error) {
      logger.error("Failed to cleanup sessions:", error);
      throw error;
    }
  }
}

// Create singleton instance
const chatService = new ChatService();

export default chatService;
