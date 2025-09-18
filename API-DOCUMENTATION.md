# Legal AI Document Assistant - API Documentation

## Overview

This backend provides a comprehensive API for legal document analysis with chat, voice, and history features. The system is built without Google Cloud dependencies and uses SQLite for data persistence.

## Base URL
```
http://localhost:3001/api
```

## Authentication
Currently, the API does not require authentication. In production, implement JWT or API key authentication.

## API Endpoints

### Health & Status

#### GET /api/health
Basic health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "environment": "development",
    "version": "1.0.0",
    "services": {
      "api": "operational",
      "database": "operational",
      "storage": "operational",
      "chat": "operational",
      "voice": "operational"
    }
  }
}
```

#### GET /api/health/detailed
Detailed health check with service tests.

#### GET /api/health/metrics
Runtime metrics and system information.

#### GET /api/health/readiness
Kubernetes readiness probe.

#### GET /api/health/liveness
Kubernetes liveness probe.

---

### Document Management

#### POST /api/documents/upload
Upload a legal document for processing.

**Request:**
- Content-Type: `multipart/form-data`
- Body: File upload

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "uuid",
    "originalName": "contract.pdf",
    "mimeType": "application/pdf",
    "size": 1024000,
    "filePath": "/uploads/documents/uuid.pdf",
    "extractedText": "Document content...",
    "confidence": 0.95,
    "pages": 5,
    "wordCount": 1500,
    "processingTime": 2000,
    "metadata": {
      "language": "en",
      "encoding": "UTF-8",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### GET /api/documents
Get all uploaded documents.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "filename": "uuid.pdf",
      "original_name": "contract.pdf",
      "mime_type": "application/pdf",
      "file_size": 1024000,
      "status": "processed",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/documents/:documentId
Get specific document details.

#### DELETE /api/documents/:documentId
Delete a document and all associated data.

---

### Chat System

#### POST /api/chat/:documentId/session
Create a new chat session for a document.

**Request:**
```json
{
  "sessionId": "optional-custom-session-id",
  "title": "Contract Discussion"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat session created successfully",
  "data": {
    "sessionId": "uuid",
    "documentId": "uuid",
    "title": "Contract Discussion",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/chat/:documentId/message
Send a message in a chat session.

**Request:**
```json
{
  "message": "What are the key terms of this contract?",
  "sessionId": "uuid",
  "messageType": "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "userMessage": {
      "messageId": "uuid",
      "sessionId": "uuid",
      "documentId": "uuid",
      "messageType": "user",
      "content": "What are the key terms of this contract?",
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    "aiResponse": {
      "response": "Based on the document analysis, the key terms include...",
      "confidence": 0.85,
      "sources": ["document analysis"],
      "suggestions": [
        "Can you explain this in simpler terms?",
        "What are the key points I should know?"
      ]
    }
  }
}
```

#### GET /api/chat/:documentId/history
Get chat history for a session.

**Query Parameters:**
- `sessionId` (required): Session ID
- `limit` (optional): Number of messages to return (default: 50)
- `offset` (optional): Number of messages to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "session_id": "uuid",
        "document_id": "uuid",
        "message_type": "user",
        "content": "What are the key terms?",
        "created_at": "2024-01-01T00:00:00.000Z",
        "metadata": {}
      }
    ],
    "totalMessages": 10,
    "hasMore": false,
    "sessionId": "uuid",
    "documentId": "uuid"
  }
}
```

#### GET /api/chat/:documentId/sessions
Get all chat sessions for a document.

#### DELETE /api/chat/:documentId/session
Delete a chat session.

#### DELETE /api/chat/:documentId/history
Clear chat history for a session.

#### GET /api/chat/:documentId/export
Export chat history.

**Query Parameters:**
- `sessionId` (required): Session ID
- `format` (optional): Export format - "json" or "txt" (default: "json")

**Response:**
- JSON format: Returns JSON data
- TXT format: Returns plain text file

#### GET /api/chat/:documentId/session/:sessionId/stats
Get session statistics.

---

### Voice System

#### POST /api/voice/:documentId/query
Process a voice query for a document.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Audio file upload
- Form fields:
  - `audio` (required): Audio file
  - `sessionId` (optional): Session ID
  - `language` (optional): Language code (default: "en-US")

**Response:**
```json
{
  "success": true,
  "message": "Voice query processed successfully",
  "data": {
    "sessionId": "uuid",
    "documentId": "uuid",
    "transcription": {
      "text": "What are the key terms of this contract?",
      "confidence": 0.85,
      "language": "en-US",
      "processingTime": 1500
    },
    "response": {
      "text": "Based on the document analysis...",
      "audio": "base64-encoded-audio",
      "confidence": 0.88,
      "format": "wav",
      "duration": 3.5
    },
    "audioFile": {
      "id": "uuid",
      "filename": "uuid.wav",
      "size": 1024000
    }
  }
}
```

#### POST /api/voice/transcribe
Transcribe audio only (without document context).

**Request:**
- Content-Type: `multipart/form-data`
- Body: Audio file upload
- Form fields:
  - `audio` (required): Audio file
  - `language` (optional): Language code (default: "en-US")

#### POST /api/voice/synthesize
Synthesize text to speech.

**Request:**
```json
{
  "text": "Hello, this is a test message",
  "voice": "en-US-Neural2-D",
  "language": "en-US"
}
```

#### GET /api/voice/:documentId/session/:sessionId/history
Get voice session history.

#### DELETE /api/voice/:documentId/session/:sessionId
Delete a voice session.

#### GET /api/voice/capabilities
Get supported languages and voices.

**Response:**
```json
{
  "success": true,
  "data": {
    "languages": [
      {
        "code": "en-US",
        "name": "English (US)"
      }
    ],
    "voices": [
      {
        "name": "en-US-Neural2-D",
        "language": "en-US",
        "gender": "male"
      }
    ],
    "formats": ["wav", "mp3", "m4a", "ogg"],
    "maxAudioDuration": 300,
    "maxFileSize": 52428800
  }
}
```

#### GET /api/voice/stats
Get voice service statistics.

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "details": [] // Optional validation errors
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `413` - Payload Too Large
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## File Upload Limits

- **Document files**: 50MB maximum
- **Audio files**: 50MB maximum
- **Supported document formats**: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG
- **Supported audio formats**: WAV, MP3, M4A, OGG, WEBM

---

## Database Schema

### Documents Table
```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  extracted_text TEXT,
  confidence REAL,
  pages INTEGER,
  word_count INTEGER,
  language TEXT DEFAULT 'en',
  status TEXT DEFAULT 'uploaded',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Chat Sessions Table
```sql
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  title TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
  UNIQUE(document_id, session_id)
);
```

### Chat Messages Table
```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);
```

### Voice Sessions Table
```sql
CREATE TABLE voice_sessions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  transcriptions TEXT, -- JSON string
  responses TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE,
  UNIQUE(document_id, session_id)
);
```

---

## WebSocket Events

The server supports real-time communication via Socket.IO:

### Client Events
- `join_document` - Join a document session
- `send_message` - Send a chat message
- `voice_query` - Send voice query

### Server Events
- `message_received` - Message received confirmation
- `ai_response` - AI response generated
- `voice_transcription` - Voice transcription result
- `voice_response` - Voice response generated
- `error` - Error occurred

---

## Development Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Start development server:
   ```bash
   pnpm dev
   ```

4. Server will be available at `http://localhost:3001`

---

## Production Considerations

1. **Security**: Implement authentication and authorization
2. **Rate Limiting**: Configure appropriate rate limits
3. **File Storage**: Consider cloud storage for production
4. **Database**: Consider PostgreSQL for production
5. **Monitoring**: Add logging and monitoring
6. **SSL**: Use HTTPS in production
7. **CORS**: Configure CORS for your frontend domain

---

## AI Model Integration

The current implementation includes placeholder responses. To integrate your AI model:

1. Update `chatService.js` - `generateResponse()` method
2. Update `speechService.js` - `generateVoiceResponse()` method
3. Add your model API calls in these methods
4. Handle model-specific error cases
5. Implement proper response formatting

---

## Support

For issues or questions, please refer to the project documentation or create an issue in the repository.
