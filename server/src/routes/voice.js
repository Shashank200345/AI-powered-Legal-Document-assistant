import express from 'express';
import multer from 'multer';
import { body, param, validationResult } from 'express-validator';
import winston from 'winston';

import { voiceQuerySystem } from '../services/voiceService.js';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'voice-api' }
});

// Configure multer for audio uploads
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for audio files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/webm',
      'audio/mp4',
      'audio/wav',
      'audio/mpeg',
      'audio/ogg',
      'audio/x-wav'
    ];

    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio type: ${file.mimetype}`));
    }
  }
});

// POST /api/voice/:documentId/query - Process voice query
router.post('/:documentId/query',
  audioUpload.single('audio'),
  [
    param('documentId').isUUID().withMessage('Invalid document ID'),
    body('sessionId').optional().isString(),
    body('languageCode').optional().isString().isLength({ min: 2, max: 10 }),
    body('voiceName').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No audio file uploaded',
          message: 'Please provide an audio file containing your question'
        });
      }

      const { documentId } = req.params;
      const {
        sessionId = `voice-session-${Date.now()}`,
        languageCode = 'en-US',
        voiceName = 'en-US-Neural2-D'
      } = req.body;

      const io = req.app.get('io');

      logger.info(`Processing voice query for document: ${documentId}, session: ${sessionId}`);

      // Emit voice processing start event
      io.emit('voice:processing:start', {
        documentId,
        sessionId,
        audioSize: req.file.size
      });

      // Process voice query
      const options = {
        languageCode,
        voiceName
      };

      const result = await voiceQuerySystem.processVoiceQuery(
        req.file.buffer,
        documentId,
        sessionId,
        options
      );

      // Emit voice processing complete event
      io.emit('voice:processing:complete', {
        documentId,
        sessionId,
        processingTime: result.processingTime,
        queryType: result.response.relatedClauses?.[0]?.type
      });

      logger.info(`Voice query processed successfully in ${result.processingTime}ms`);

      res.status(201).json({
        success: true,
        message: 'Voice query processed successfully',
        data: {
          documentId,
          sessionId: result.sessionId,
          query: {
            text: result.query.text,
            confidence: result.query.confidence,
            audioProcessingTime: result.processingTime
          },
          response: {
            text: result.response.text,
            confidence: result.response.confidence,
            sources: result.response.sources,
            relatedClauses: result.response.relatedClauses
          },
          audio: {
            duration: result.audio.duration,
            contentType: result.audio.contentType,
            // Audio content as base64 for client playback
            content: result.audio.content.toString('base64')
          },
          suggestions: result.suggestions,
          metadata: result.metadata
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Voice query processing failed:', error);

      const io = req.app.get('io');
      io.emit('voice:processing:error', {
        documentId: req.params.documentId,
        sessionId: req.body.sessionId,
        error: error.message
      });

      res.status(500).json({
        error: 'Voice processing failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /api/voice/transcribe - Transcribe audio to text only
router.post('/transcribe',
  audioUpload.single('audio'),
  [
    body('languageCode').optional().isString().isLength({ min: 2, max: 10 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No audio file uploaded',
          message: 'Please provide an audio file to transcribe'
        });
      }

      const { languageCode = 'en-US' } = req.body;

      logger.info('Processing audio transcription');

      // Transcribe audio only
      const transcription = await voiceQuerySystem.transcribeQuery(
        req.file.buffer,
        languageCode
      );

      res.json({
        success: true,
        message: 'Audio transcribed successfully',
        data: {
          transcript: transcription.transcript,
          confidence: transcription.confidence,
          words: transcription.words,
          languageCode,
          audioSize: req.file.size,
          originalTranscript: transcription.originalTranscript
        }
      });

    } catch (error) {
      logger.error('Audio transcription failed:', error);
      res.status(500).json({
        error: 'Transcription failed',
        message: error.message
      });
    }
  }
);

// POST /api/voice/synthesize - Convert text to speech
router.post('/synthesize',
  [
    body('text').isString().isLength({ min: 1, max: 5000 }).withMessage('Text is required (1-5000 characters)'),
    body('voiceName').optional().isString(),
    body('languageCode').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const {
        text,
        voiceName = 'en-US-Neural2-D',
        languageCode = 'en-US'
      } = req.body;

      logger.info('Processing text-to-speech synthesis');

      // Generate audio response
      const audioResponse = await voiceQuerySystem.generateAudioResponse(text, voiceName);

      res.json({
        success: true,
        message: 'Text synthesized successfully',
        data: {
          text,
          voiceName,
          languageCode,
          audio: {
            content: audioResponse.audioContent.toString('base64'),
            contentType: audioResponse.contentType,
            duration: voiceQuerySystem.estimateAudioDuration(text)
          },
          textLength: text.length
        }
      });

    } catch (error) {
      logger.error('Text-to-speech synthesis failed:', error);
      res.status(500).json({
        error: 'Synthesis failed',
        message: error.message
      });
    }
  }
);

// GET /api/voice/:sessionId/history - Get conversation history
router.get('/:sessionId/history',
  [param('sessionId').isString().withMessage('Session ID is required')],
  (req, res) => {
    try {
      const { sessionId } = req.params;
      const history = voiceQuerySystem.getConversationHistory(sessionId);

      res.json({
        success: true,
        data: {
          sessionId,
          totalExchanges: history.length,
          history: history.map((exchange, index) => ({
            index: index + 1,
            timestamp: exchange.timestamp,
            query: exchange.query,
            response: exchange.response,
            confidence: exchange.confidence
          }))
        }
      });

    } catch (error) {
      logger.error('Failed to retrieve conversation history:', error);
      res.status(500).json({
        error: 'Failed to retrieve history',
        message: error.message
      });
    }
  }
);

// DELETE /api/voice/:sessionId/history - Clear conversation history
router.delete('/:sessionId/history',
  [param('sessionId').isString().withMessage('Session ID is required')],
  (req, res) => {
    try {
      const { sessionId } = req.params;
      voiceQuerySystem.clearConversationHistory(sessionId);

      logger.info(`Conversation history cleared for session: ${sessionId}`);

      res.json({
        success: true,
        message: 'Conversation history cleared successfully',
        data: {
          sessionId,
          clearedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to clear conversation history:', error);
      res.status(500).json({
        error: 'Failed to clear history',
        message: error.message
      });
    }
  }
);

// GET /api/voice/capabilities - Get voice system capabilities
router.get('/capabilities', (req, res) => {
  const capabilities = {
    speechToText: {
      supportedLanguages: [
        { code: 'en-US', name: 'English (US)' },
        { code: 'en-GB', name: 'English (UK)' },
        { code: 'es-ES', name: 'Spanish (Spain)' },
        { code: 'es-US', name: 'Spanish (US)' },
        { code: 'fr-FR', name: 'French (France)' },
        { code: 'de-DE', name: 'German (Germany)' },
        { code: 'it-IT', name: 'Italian (Italy)' },
        { code: 'pt-BR', name: 'Portuguese (Brazil)' },
        { code: 'ru-RU', name: 'Russian (Russia)' },
        { code: 'ja-JP', name: 'Japanese (Japan)' },
        { code: 'ko-KR', name: 'Korean (South Korea)' },
        { code: 'zh-CN', name: 'Chinese (Simplified)' }
      ],
      supportedFormats: [
        'audio/webm',
        'audio/wav',
        'audio/mp4',
        'audio/mpeg',
        'audio/ogg'
      ],
      maxFileSizeMB: 10,
      maxDurationSeconds: 300
    },
    textToSpeech: {
      availableVoices: [
        { name: 'en-US-Neural2-A', language: 'en-US', gender: 'male', type: 'neural' },
        { name: 'en-US-Neural2-C', language: 'en-US', gender: 'female', type: 'neural' },
        { name: 'en-US-Neural2-D', language: 'en-US', gender: 'male', type: 'neural' },
        { name: 'en-US-Neural2-E', language: 'en-US', gender: 'female', type: 'neural' },
        { name: 'en-GB-Neural2-A', language: 'en-GB', gender: 'female', type: 'neural' },
        { name: 'en-GB-Neural2-B', language: 'en-GB', gender: 'male', type: 'neural' },
        { name: 'es-US-Neural2-A', language: 'es-US', gender: 'female', type: 'neural' },
        { name: 'es-US-Neural2-B', language: 'es-US', gender: 'male', type: 'neural' }
      ],
      outputFormat: 'audio/mpeg',
      maxTextLength: 5000
    },
    queryProcessing: {
      supportedQueries: [
        'General document questions',
        'Clause-specific inquiries',
        'Risk assessment queries',
        'Timeline and deadline questions',
        'Financial obligation queries',
        'Rights and responsibilities questions'
      ],
      averageResponseTime: '2-5 seconds',
      contextualUnderstanding: true,
      multiTurnConversation: true
    },
    systemStats: voiceQuerySystem.getSystemStats()
  };

  res.json({
    success: true,
    data: capabilities
  });
});

// GET /api/voice/stats - Get voice system statistics
router.get('/stats', (req, res) => {
  try {
    const stats = voiceQuerySystem.getSystemStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to retrieve system stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve stats',
      message: error.message
    });
  }
});

// Error handling middleware for audio uploads
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Audio file too large',
        message: 'Audio file size should not exceed 10MB'
      });
    }
  }
  
  if (err.message.includes('Unsupported audio type')) {
    return res.status(400).json({
      error: 'Unsupported audio format',
      message: err.message,
      supportedFormats: [
        'audio/webm', 'audio/wav', 'audio/mp4', 
        'audio/mpeg', 'audio/ogg'
      ]
    });
  }

  next(err);
});

export default router;
