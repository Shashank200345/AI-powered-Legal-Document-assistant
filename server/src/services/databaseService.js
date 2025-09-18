// In-memory storage for now (no SQLite dependency)
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "database" },
});

class DatabaseService {
  constructor() {
    this.documents = new Map();
    this.chatSessions = new Map();
    this.messages = new Map();
    this.voiceSessions = new Map();
    this.messageId = 1;
    this.sessionId = 1;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      logger.info("In-memory database initialized successfully");
      this.isInitialized = true;
    } catch (error) {
      logger.error("Database initialization failed:", error);
      throw error;
    }
  }

  // Document operations
  async saveDocument(documentData) {
    const {
      id,
      filename,
      originalName,
      mimeType,
      fileSize,
      filePath,
      extractedText,
      confidence,
      pages,
      wordCount,
      language,
      status,
    } = documentData;

    const document = {
      id,
      filename,
      original_name: originalName,
      mime_type: mimeType,
      file_size: fileSize,
      file_path: filePath,
      extracted_text: extractedText,
      confidence,
      pages,
      word_count: wordCount,
      language: language || "en",
      status: status || "uploaded",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.documents.set(id, document);
    return id;
  }

  async getDocument(documentId) {
    return this.documents.get(documentId) || null;
  }

  async updateDocumentStatus(documentId, status) {
    const document = this.documents.get(documentId);
    if (document) {
      document.status = status;
      document.updated_at = new Date().toISOString();
      this.documents.set(documentId, document);
    }
  }

  async getAllDocuments() {
    return Array.from(this.documents.values()).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
  }

  async deleteDocument(documentId) {
    this.documents.delete(documentId);
    // Also delete related sessions and messages
    for (const [sessionId, session] of this.chatSessions.entries()) {
      if (session.document_id === documentId) {
        this.chatSessions.delete(sessionId);
      }
    }
    for (const [messageId, message] of this.messages.entries()) {
      if (message.document_id === documentId) {
        this.messages.delete(messageId);
      }
    }
  }

  // Chat operations
  async createChatSession(sessionData) {
    const { id, documentId, sessionId, title } = sessionData;

    const session = {
      id,
      document_id: documentId,
      session_id: sessionId,
      title: title || `Chat Session ${this.sessionId++}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.chatSessions.set(id, session);
    return id;
  }

  async getChatSession(documentId, sessionId) {
    for (const session of this.chatSessions.values()) {
      if (
        session.document_id === documentId &&
        session.session_id === sessionId
      ) {
        return session;
      }
    }
    return null;
  }

  async getChatSessionsByDocument(documentId) {
    return Array.from(this.chatSessions.values())
      .filter((session) => session.document_id === documentId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async saveChatMessage(messageData) {
    const { id, sessionId, documentId, messageType, content, metadata } =
      messageData;

    const message = {
      id,
      session_id: sessionId,
      document_id: documentId,
      message_type: messageType,
      content,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    };

    this.messages.set(id, message);
    return id;
  }

  async getChatMessages(sessionId, limit = 50, offset = 0) {
    const sessionMessages = Array.from(this.messages.values())
      .filter((msg) => msg.session_id === sessionId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(offset, offset + limit);

    return sessionMessages;
  }

  async getChatHistory(documentId, sessionId) {
    return Array.from(this.messages.values())
      .filter(
        (msg) => msg.document_id === documentId && msg.session_id === sessionId,
      )
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  async deleteChatSession(sessionId) {
    // Find and delete the session
    for (const [id, session] of this.chatSessions.entries()) {
      if (session.session_id === sessionId) {
        this.chatSessions.delete(id);
        break;
      }
    }

    // Delete related messages
    for (const [messageId, message] of this.messages.entries()) {
      if (message.session_id === sessionId) {
        this.messages.delete(messageId);
      }
    }
  }

  async deleteChatHistory(documentId, sessionId) {
    for (const [messageId, message] of this.messages.entries()) {
      if (
        message.document_id === documentId &&
        message.session_id === sessionId
      ) {
        this.messages.delete(messageId);
      }
    }
  }

  // Voice operations
  async createVoiceSession(sessionData) {
    const { id, documentId, sessionId } = sessionData;

    const session = {
      id,
      document_id: documentId,
      session_id: sessionId,
      transcriptions: [],
      responses: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.voiceSessions.set(id, session);
    return id;
  }

  async getVoiceSession(documentId, sessionId) {
    for (const session of this.voiceSessions.values()) {
      if (
        session.document_id === documentId &&
        session.session_id === sessionId
      ) {
        return session;
      }
    }
    return null;
  }

  async updateVoiceSession(documentId, sessionId, transcriptions, responses) {
    for (const [id, session] of this.voiceSessions.entries()) {
      if (
        session.document_id === documentId &&
        session.session_id === sessionId
      ) {
        session.transcriptions = transcriptions;
        session.responses = responses;
        session.updated_at = new Date().toISOString();
        this.voiceSessions.set(id, session);
        break;
      }
    }
  }

  async deleteVoiceSession(sessionId) {
    for (const [id, session] of this.voiceSessions.entries()) {
      if (session.session_id === sessionId) {
        this.voiceSessions.delete(id);
        break;
      }
    }
  }

  // Utility methods
  async close() {
    // No-op for in-memory storage
    logger.info("In-memory database closed");
  }

  async healthCheck() {
    try {
      return {
        status: "healthy",
        message: "In-memory database is working",
        stats: {
          documents: this.documents.size,
          chatSessions: this.chatSessions.size,
          messages: this.messages.size,
          voiceSessions: this.voiceSessions.size,
        },
      };
    } catch (error) {
      return { status: "unhealthy", message: error.message };
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

export default databaseService;
