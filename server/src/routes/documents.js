import express from 'express';
import multer from 'multer';
import { body, param, validationResult } from 'express-validator';
import winston from 'winston';

import { processDocument, processDocuments, getProcessingStatus } from '../services/documentProcessor.js';
import { uploadFile, saveDocumentAnalysis } from '../services/googleCloud.js';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'documents-api' }
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024,
    files: 5, // Max 5 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/bmp'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// POST /api/documents/upload - Single document upload
router.post('/upload', 
  upload.single('document'),
  [
    body('options.extractText').optional().isBoolean(),
    body('options.generatePreview').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please provide a document file'
        });
      }

      const io = req.app.get('io');
      const startTime = Date.now();

      // Emit processing start event
      io.emit('document:processing:start', {
        fileName: req.file.originalname,
        size: req.file.size
      });

      logger.info(`Processing document upload: ${req.file.originalname}`);

      // Process the document
      const options = {
        extractText: req.body.options?.extractText !== false,
        generatePreview: req.body.options?.generatePreview === true,
        ...req.body.options
      };

      const result = await processDocument(req.file, options);

      // Emit processing complete event
      io.emit('document:processing:complete', {
        documentId: result.documentId,
        fileName: result.originalName,
        processingTime: result.processingTime
      });

      logger.info(`Document processed successfully: ${result.documentId}`);

      res.status(201).json({
        success: true,
        message: 'Document uploaded and processed successfully',
        data: {
          documentId: result.documentId,
          fileName: result.originalName,
          mimeType: result.mimeType,
          size: result.size,
          uploadUrl: result.uploadUrl,
          extractedText: options.extractText ? result.extractedText : undefined,
          confidence: result.confidence,
          pages: result.pages,
          wordCount: result.wordCount,
          processingTime: result.processingTime,
          metadata: result.metadata
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Document upload failed:', error);

      const io = req.app.get('io');
      io.emit('document:processing:error', {
        fileName: req.file?.originalname,
        error: error.message
      });

      res.status(500).json({
        error: 'Document processing failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// POST /api/documents/batch-upload - Multiple document upload
router.post('/batch-upload',
  upload.array('documents', 5),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files uploaded',
          message: 'Please provide at least one document file'
        });
      }

      const io = req.app.get('io');
      logger.info(`Processing batch upload: ${req.files.length} files`);

      // Emit batch processing start event
      io.emit('document:batch:start', {
        fileCount: req.files.length,
        files: req.files.map(f => ({ name: f.originalname, size: f.size }))
      });

      // Process all documents
      const options = req.body.options || {};
      const result = await processDocuments(req.files, options);

      // Emit batch processing complete event
      io.emit('document:batch:complete', {
        totalProcessed: result.totalProcessed,
        successful: result.successful.length,
        failed: result.failed.length,
        successRate: result.successRate
      });

      logger.info(`Batch processing completed: ${result.successful.length}/${result.totalProcessed} successful`);

      res.status(201).json({
        success: true,
        message: 'Batch upload completed',
        data: {
          totalProcessed: result.totalProcessed,
          successful: result.successful.map(doc => ({
            documentId: doc.documentId,
            fileName: doc.originalName,
            processingTime: doc.processingTime
          })),
          failed: result.failed,
          successRate: result.successRate
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Batch upload failed:', error);

      const io = req.app.get('io');
      io.emit('document:batch:error', {
        error: error.message
      });

      res.status(500).json({
        error: 'Batch processing failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

// GET /api/documents/:documentId/status - Get processing status
router.get('/:documentId/status',
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
      const status = await getProcessingStatus(documentId);

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Status check failed:', error);
      res.status(500).json({
        error: 'Status check failed',
        message: error.message
      });
    }
  }
);

// POST /api/documents/:documentId/reprocess - Reprocess document
router.post('/:documentId/reprocess',
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

      // This would typically retrieve the original file and reprocess it
      // For now, return a placeholder response
      res.json({
        success: true,
        message: 'Document reprocessing initiated',
        data: {
          documentId: req.params.documentId,
          status: 'pending'
        }
      });

    } catch (error) {
      logger.error('Document reprocessing failed:', error);
      res.status(500).json({
        error: 'Reprocessing failed',
        message: error.message
      });
    }
  }
);

// GET /api/documents/supported-types - Get supported file types
router.get('/supported-types', (req, res) => {
  const supportedTypes = {
    documents: {
      'PDF': {
        extensions: ['.pdf'],
        mimeTypes: ['application/pdf'],
        description: 'Portable Document Format files'
      },
      'Microsoft Word': {
        extensions: ['.doc', '.docx'],
        mimeTypes: [
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        description: 'Microsoft Word documents'
      },
      'Text': {
        extensions: ['.txt'],
        mimeTypes: ['text/plain'],
        description: 'Plain text files'
      }
    },
    images: {
      'JPEG': {
        extensions: ['.jpg', '.jpeg'],
        mimeTypes: ['image/jpeg'],
        description: 'JPEG image files'
      },
      'PNG': {
        extensions: ['.png'],
        mimeTypes: ['image/png'],
        description: 'PNG image files'
      },
      'GIF': {
        extensions: ['.gif'],
        mimeTypes: ['image/gif'],
        description: 'GIF image files'
      },
      'BMP': {
        extensions: ['.bmp'],
        mimeTypes: ['image/bmp'],
        description: 'Bitmap image files'
      }
    },
    limits: {
      maxFileSize: `${process.env.MAX_FILE_SIZE_MB || 50}MB`,
      maxFiles: 5,
      totalSizeLimit: `${(parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 5}MB`
    }
  };

  res.json({
    success: true,
    data: supportedTypes
  });
});

// GET /api/documents/demo-samples - Get demo sample documents
router.get('/demo-samples', (req, res) => {
  const demoSamples = [
    {
      id: 'demo-rental-agreement',
      name: 'Sample Rental Agreement',
      description: 'A standard residential rental agreement with common clauses',
      type: 'Rental Agreement',
      estimatedProcessingTime: '15 seconds',
      keyFeatures: ['Termination clauses', 'Payment terms', 'Security deposit'],
      downloadUrl: '/api/documents/demo-samples/rental-agreement.pdf'
    },
    {
      id: 'demo-employment-contract',
      name: 'Employment Contract Template',
      description: 'Basic employment contract with salary and benefits',
      type: 'Employment Contract',
      estimatedProcessingTime: '12 seconds',
      keyFeatures: ['Compensation', 'Confidentiality', 'Termination'],
      downloadUrl: '/api/documents/demo-samples/employment-contract.pdf'
    },
    {
      id: 'demo-nda',
      name: 'Non-Disclosure Agreement',
      description: 'Standard NDA for protecting confidential information',
      type: 'Non-Disclosure Agreement',
      estimatedProcessingTime: '8 seconds',
      keyFeatures: ['Confidentiality terms', 'Duration', 'Exceptions'],
      downloadUrl: '/api/documents/demo-samples/nda.pdf'
    }
  ];

  res.json({
    success: true,
    data: demoSamples
  });
});

// Error handling middleware for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: `File size should not exceed ${process.env.MAX_FILE_SIZE_MB || 50}MB`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 5 files allowed per upload'
      });
    }
  }
  
  if (err.message.includes('Unsupported file type')) {
    return res.status(400).json({
      error: 'Unsupported file type',
      message: err.message
    });
  }

  next(err);
});

export default router;
