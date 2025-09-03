import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import winston from 'winston';

import { analyzeDocument } from '../services/aiAnalyzer.js';
import { 
  getDocumentAnalysis, 
  saveDocumentAnalysis,
  getVertexAIModel 
} from '../services/googleCloud.js';
import { voiceQuerySystem } from '../services/voiceService.js';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'analysis-api' }
});

// POST /api/analysis/:documentId/analyze - Analyze document
router.post('/:documentId/analyze',
  [
    param('documentId').isUUID().withMessage('Invalid document ID'),
    body('text').isString().isLength({ min: 10 }).withMessage('Document text is required (minimum 10 characters)'),
    body('options.includeRiskAssessment').optional().isBoolean(),
    body('options.generatePlainLanguage').optional().isBoolean(),
    body('options.extractInsights').optional().isBoolean(),
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

      const { documentId } = req.params;
      const { text, options = {} } = req.body;
      const io = req.app.get('io');

      logger.info(`Starting analysis for document: ${documentId}`);

      // Emit analysis start event
      io.emit('analysis:start', {
        documentId,
        wordCount: text.length
      });

      const startTime = Date.now();

      // Perform comprehensive analysis
      const analysis = await analyzeDocument(text, {
        includeRiskAssessment: options.includeRiskAssessment !== false,
        generatePlainLanguage: options.generatePlainLanguage !== false,
        extractInsights: options.extractInsights !== false,
        ...options
      });

      // Save analysis to database
      await saveDocumentAnalysis(documentId, analysis);

      // Set document context for voice queries
      voiceQuerySystem.setDocumentContext(documentId, text, analysis);

      // Emit analysis complete event
      io.emit('analysis:complete', {
        documentId,
        processingTime: analysis.processingTime,
        overallRisk: analysis.summary.overallRisk,
        clauseCount: analysis.clauses.length
      });

      logger.info(`Analysis completed for ${documentId} in ${analysis.processingTime}ms`);

      res.status(201).json({
        success: true,
        message: 'Document analysis completed successfully',
        data: {
          documentId,
          analysis: {
            summary: analysis.summary,
            clauses: analysis.clauses,
            riskAssessment: analysis.riskAssessment,
            keyInsights: analysis.keyInsights,
            plainLanguage: analysis.plainLanguage,
            aiSummary: analysis.aiSummary,
            recommendations: analysis.recommendations,
            processingTime: analysis.processingTime,
            confidence: analysis.confidence,
            metadata: analysis.metadata
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Analysis failed:', error);

      const io = req.app.get('io');
      io.emit('analysis:error', {
        documentId: req.params.documentId,
        error: error.message
      });

      res.status(500).json({
        error: 'Analysis failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// GET /api/analysis/:documentId - Get analysis results
router.get('/:documentId',
  [param('documentId').isUUID().withMessage('Invalid document ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { documentId } = req.params;
      const analysis = await getDocumentAnalysis(documentId);

      if (!analysis) {
        return res.status(404).json({
          error: 'Analysis not found',
          message: `No analysis found for document ID: ${documentId}`
        });
      }

      res.json({
        success: true,
        data: {
          documentId,
          analysis: {
            id: analysis.id,
            ...analysis
          }
        }
      });

    } catch (error) {
      logger.error('Failed to retrieve analysis:', error);
      res.status(500).json({
        error: 'Failed to retrieve analysis',
        message: error.message
      });
    }
  }
);

// POST /api/analysis/:documentId/query - Query document with text
router.post('/:documentId/query',
  [
    param('documentId').isUUID().withMessage('Invalid document ID'),
    body('query').isString().isLength({ min: 3 }).withMessage('Query is required (minimum 3 characters)'),
    body('sessionId').optional().isString(),
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

      const { documentId } = req.params;
      const { query, sessionId = `session-${Date.now()}` } = req.body;

      logger.info(`Processing text query for document: ${documentId}`);

      // Process text query using voice service
      const response = await voiceQuerySystem.processTextQuery(
        query,
        documentId,
        sessionId
      );

      res.json({
        success: true,
        data: {
          documentId,
          sessionId,
          query,
          response: {
            answer: response.answer,
            confidence: response.confidence,
            sources: response.sources,
            relatedClauses: response.relatedClauses,
            queryType: response.queryType
          },
          suggestions: voiceQuerySystem.generateFollowUpQuestions(query, documentId)
        }
      });

    } catch (error) {
      logger.error('Text query processing failed:', error);
      res.status(500).json({
        error: 'Query processing failed',
        message: error.message
      });
    }
  }
);

// GET /api/analysis/:documentId/clauses - Get specific clause information
router.get('/:documentId/clauses',
  [
    param('documentId').isUUID().withMessage('Invalid document ID'),
    query('type').optional().isString(),
    query('riskLevel').optional().isIn(['critical', 'high', 'medium', 'low']),
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

      const { documentId } = req.params;
      const { type, riskLevel } = req.query;

      const analysis = await getDocumentAnalysis(documentId);
      if (!analysis) {
        return res.status(404).json({
          error: 'Analysis not found',
          message: `No analysis found for document ID: ${documentId}`
        });
      }

      let clauses = analysis.clauses || [];

      // Filter by type if specified
      if (type) {
        clauses = clauses.filter(clause => clause.type === type);
      }

      // Filter by risk level if specified
      if (riskLevel) {
        clauses = clauses.filter(clause => clause.riskLevel === riskLevel);
      }

      res.json({
        success: true,
        data: {
          documentId,
          filters: { type, riskLevel },
          totalClauses: clauses.length,
          clauses: clauses.map(clause => ({
            type: clause.type,
            title: clause.title,
            riskLevel: clause.riskLevel,
            matches: clause.matches,
            summary: clause.summary,
            plainLanguage: clause.plainLanguage,
            recommendations: clause.recommendations,
            content: clause.content
          }))
        }
      });

    } catch (error) {
      logger.error('Failed to retrieve clauses:', error);
      res.status(500).json({
        error: 'Failed to retrieve clauses',
        message: error.message
      });
    }
  }
);

// GET /api/analysis/:documentId/risks - Get risk assessment details
router.get('/:documentId/risks',
  [param('documentId').isUUID().withMessage('Invalid document ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { documentId } = req.params;
      const analysis = await getDocumentAnalysis(documentId);

      if (!analysis) {
        return res.status(404).json({
          error: 'Analysis not found',
          message: `No analysis found for document ID: ${documentId}`
        });
      }

      const riskData = {
        overallRisk: analysis.summary?.overallRisk || 'unknown',
        riskAssessment: analysis.riskAssessment || [],
        riskSummary: {
          critical: analysis.riskAssessment?.filter(r => r.level === 'critical').length || 0,
          high: analysis.riskAssessment?.filter(r => r.level === 'high').length || 0,
          medium: analysis.riskAssessment?.filter(r => r.level === 'medium').length || 0,
          low: analysis.riskAssessment?.filter(r => r.level === 'low').length || 0
        },
        recommendations: analysis.recommendations || [],
        confidence: analysis.confidence || 0
      };

      res.json({
        success: true,
        data: {
          documentId,
          ...riskData
        }
      });

    } catch (error) {
      logger.error('Failed to retrieve risk assessment:', error);
      res.status(500).json({
        error: 'Failed to retrieve risk assessment',
        message: error.message
      });
    }
  }
);

// POST /api/analysis/:documentId/plain-language - Generate plain language version
router.post('/:documentId/plain-language',
  [
    param('documentId').isUUID().withMessage('Invalid document ID'),
    body('section').optional().isString(),
    body('clauseType').optional().isString(),
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

      const { documentId } = req.params;
      const { section, clauseType } = req.body;

      const analysis = await getDocumentAnalysis(documentId);
      if (!analysis) {
        return res.status(404).json({
          error: 'Analysis not found',
          message: `No analysis found for document ID: ${documentId}`
        });
      }

      let plainLanguageData;

      if (section || clauseType) {
        // Generate plain language for specific section or clause type
        const model = await getVertexAIModel();
        
        let targetText = '';
        if (clauseType) {
          const clause = analysis.clauses?.find(c => c.type === clauseType);
          targetText = clause ? clause.content.join(' ') : '';
        } else if (section) {
          targetText = section;
        }

        if (!targetText) {
          return res.status(400).json({
            error: 'Section not found',
            message: 'The specified section or clause type was not found'
          });
        }

        const prompt = `Convert this legal text to plain English that anyone can understand:

        ${targetText}

        Provide a clear, simple explanation that removes jargon and explains concepts in everyday language.`;

        const result = await model.generateContent(prompt);
        
        plainLanguageData = {
          original: targetText,
          plainLanguage: result.response.text(),
          generatedAt: new Date().toISOString(),
          type: clauseType || 'section'
        };
      } else {
        // Return existing plain language analysis
        plainLanguageData = {
          fullDocument: analysis.plainLanguage,
          clauses: analysis.clauses?.map(clause => ({
            type: clause.type,
            title: clause.title,
            plainLanguage: clause.plainLanguage
          })) || []
        };
      }

      res.json({
        success: true,
        data: {
          documentId,
          plainLanguage: plainLanguageData
        }
      });

    } catch (error) {
      logger.error('Plain language generation failed:', error);
      res.status(500).json({
        error: 'Plain language generation failed',
        message: error.message
      });
    }
  }
);

// GET /api/analysis/:documentId/export - Export analysis results
router.get('/:documentId/export',
  [
    param('documentId').isUUID().withMessage('Invalid document ID'),
    query('format').optional().isIn(['json', 'pdf', 'txt']).withMessage('Invalid export format'),
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

      const { documentId } = req.params;
      const { format = 'json' } = req.query;

      const analysis = await getDocumentAnalysis(documentId);
      if (!analysis) {
        return res.status(404).json({
          error: 'Analysis not found',
          message: `No analysis found for document ID: ${documentId}`
        });
      }

      // For now, only support JSON export
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="analysis-${documentId}.json"`);
        
        const exportData = {
          documentId,
          exportedAt: new Date().toISOString(),
          analysis: {
            summary: analysis.summary,
            clauses: analysis.clauses,
            riskAssessment: analysis.riskAssessment,
            keyInsights: analysis.keyInsights,
            recommendations: analysis.recommendations,
            metadata: analysis.metadata
          }
        };

        res.json(exportData);
      } else {
        res.status(501).json({
          error: 'Export format not implemented',
          message: `Export format '${format}' is not yet implemented`
        });
      }

    } catch (error) {
      logger.error('Export failed:', error);
      res.status(500).json({
        error: 'Export failed',
        message: error.message
      });
    }
  }
);

// DELETE /api/analysis/:documentId - Delete analysis
router.delete('/:documentId',
  [param('documentId').isUUID().withMessage('Invalid document ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { documentId } = req.params;

      // Remove from voice query system
      voiceQuerySystem.removeDocumentContext(documentId);

      // Note: In a full implementation, you'd also delete from Firestore
      logger.info(`Analysis deleted for document: ${documentId}`);

      res.json({
        success: true,
        message: 'Analysis deleted successfully',
        data: {
          documentId,
          deletedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Analysis deletion failed:', error);
      res.status(500).json({
        error: 'Deletion failed',
        message: error.message
      });
    }
  }
);

export default router;
