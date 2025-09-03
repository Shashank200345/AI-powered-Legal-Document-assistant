import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

import { 
  extractTextFromImage, 
  analyzeDocument, 
  uploadFile 
} from './googleCloud.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'document-processor' }
});

// Supported file types
const SUPPORTED_TYPES = {
  pdf: ['application/pdf'],
  doc: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'],
  text: ['text/plain']
};

// Main document processing function
export async function processDocument(file, options = {}) {
  const documentId = uuidv4();
  const startTime = Date.now();

  try {
    logger.info(`Starting document processing for: ${file.originalname}`);

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Extract text based on file type
    const extractionResult = await extractText(file);
    
    // Upload original file to Cloud Storage
    const uploadResult = await uploadFile(
      file.buffer, 
      file.originalname, 
      file.mimetype
    );

    const processingTime = Date.now() - startTime;

    const result = {
      documentId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadUrl: uploadResult.url,
      extractedText: extractionResult.text,
      confidence: extractionResult.confidence,
      pages: extractionResult.pages || 1,
      wordCount: countWords(extractionResult.text),
      processingTime,
      metadata: {
        language: detectLanguage(extractionResult.text),
        encoding: extractionResult.encoding || 'UTF-8',
        createdAt: new Date().toISOString(),
        ...extractionResult.metadata
      }
    };

    logger.info(`Document processed successfully: ${documentId} in ${processingTime}ms`);
    return result;

  } catch (error) {
    logger.error(`Document processing failed for ${file.originalname}:`, error);
    throw new Error(`Document processing failed: ${error.message}`);
  }
}

// Validate uploaded file
function validateFile(file) {
  const maxSize = (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024;
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'];

  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: `File size too large. Maximum allowed: ${maxSize / (1024 * 1024)}MB` 
    };
  }

  const isTypeSupported = Object.values(SUPPORTED_TYPES).flat().some(type => 
    file.mimetype === type || file.mimetype.startsWith(type)
  );

  if (!isTypeSupported) {
    return { 
      isValid: false, 
      error: `Unsupported file type: ${file.mimetype}. Supported types: ${allowedTypes.join(', ')}` 
    };
  }

  return { isValid: true };
}

// Extract text from different file types
async function extractText(file) {
  const mimeType = file.mimetype.toLowerCase();

  try {
    // PDF files
    if (SUPPORTED_TYPES.pdf.includes(mimeType)) {
      return await extractFromPDF(file.buffer);
    }
    
    // Word documents
    if (SUPPORTED_TYPES.doc.includes(mimeType)) {
      return await extractFromWord(file.buffer);
    }
    
    // Images
    if (SUPPORTED_TYPES.image.some(type => mimeType.includes(type.split('/')[1]))) {
      return await extractFromImage(file.buffer);
    }
    
    // Plain text
    if (SUPPORTED_TYPES.text.includes(mimeType)) {
      return await extractFromText(file.buffer);
    }

    throw new Error(`Unsupported file type: ${mimeType}`);

  } catch (error) {
    logger.error(`Text extraction failed for ${mimeType}:`, error);
    throw error;
  }
}

// Extract text from PDF
async function extractFromPDF(buffer) {
  try {
    const data = await pdf(buffer, {
      normalizeWhitespace: true,
      disableCombineTextItems: false,
    });

    return {
      text: data.text,
      pages: data.numpages,
      confidence: 0.95, // PDFs generally have high confidence
      metadata: {
        info: data.info,
        version: data.version,
      },
    };
  } catch (error) {
    logger.error('PDF extraction failed:', error);
    
    // Fallback: Try to convert PDF to images and use OCR
    logger.info('Attempting PDF to image conversion for OCR...');
    return await extractFromPDFWithOCR(buffer);
  }
}

// Fallback PDF extraction using OCR
async function extractFromPDFWithOCR(buffer) {
  try {
    // This would require pdf2pic setup, simplified for now
    // In production, you'd convert PDF pages to images and process each
    
    logger.warn('PDF OCR fallback not fully implemented');
    return {
      text: '',
      pages: 0,
      confidence: 0,
      metadata: { extractionMethod: 'ocr-fallback' }
    };
  } catch (error) {
    throw new Error('PDF processing failed completely');
  }
}

// Extract text from Word documents
async function extractFromWord(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    
    return {
      text: result.value,
      confidence: 0.98, // Word documents have very high confidence
      pages: Math.ceil(result.value.length / 3000), // Rough page estimation
      metadata: {
        messages: result.messages,
        extractionMethod: 'mammoth',
      },
    };
  } catch (error) {
    logger.error('Word document extraction failed:', error);
    throw error;
  }
}

// Extract text from images using Google Vision API
async function extractFromImage(buffer) {
  try {
    // Optimize image before processing
    const optimizedBuffer = await optimizeImage(buffer);
    
    // Use Google Vision API for OCR
    const result = await analyzeDocument(optimizedBuffer);
    
    return {
      text: result.text,
      confidence: result.confidence,
      pages: result.pages.length || 1,
      metadata: {
        extractionMethod: 'google-vision',
        originalSize: buffer.length,
        optimizedSize: optimizedBuffer.length,
        pages: result.pages,
      },
    };
  } catch (error) {
    logger.error('Image extraction failed:', error);
    throw error;
  }
}

// Extract text from plain text files
async function extractFromText(buffer) {
  try {
    const text = buffer.toString('utf-8');
    
    return {
      text,
      confidence: 1.0, // Text files have perfect confidence
      pages: Math.ceil(text.length / 3000), // Rough page estimation
      encoding: 'UTF-8',
      metadata: {
        extractionMethod: 'direct',
        originalEncoding: 'UTF-8',
      },
    };
  } catch (error) {
    // Try different encodings
    try {
      const text = buffer.toString('latin1');
      return {
        text,
        confidence: 0.9,
        pages: Math.ceil(text.length / 3000),
        encoding: 'latin1',
        metadata: {
          extractionMethod: 'direct-fallback',
          originalEncoding: 'latin1',
        },
      };
    } catch (fallbackError) {
      logger.error('Text extraction failed:', error);
      throw error;
    }
  }
}

// Optimize images for better OCR
async function optimizeImage(buffer) {
  try {
    return await sharp(buffer)
      .resize(3000, 3000, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .grayscale()
      .normalize()
      .sharpen()
      .png({ quality: 95 })
      .toBuffer();
  } catch (error) {
    logger.warn('Image optimization failed, using original:', error.message);
    return buffer;
  }
}

// Utility functions
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function detectLanguage(text) {
  // Simple language detection - in production, use a proper library
  if (!text) return 'unknown';
  
  const commonWords = {
    en: ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'],
    es: ['el', 'la', 'y', 'o', 'pero', 'en', 'un', 'una', 'de', 'que'],
    fr: ['le', 'de', 'et', 'ou', 'mais', 'dans', 'sur', 'pour', 'avec', 'ce'],
  };

  const words = text.toLowerCase().split(/\s+/).slice(0, 100);
  let maxScore = 0;
  let detectedLang = 'en';

  Object.entries(commonWords).forEach(([lang, langWords]) => {
    const score = words.filter(word => langWords.includes(word)).length;
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang;
    }
  });

  return detectedLang;
}

// Batch processing for multiple documents
export async function processDocuments(files, options = {}) {
  const results = [];
  const errors = [];

  for (const file of files) {
    try {
      const result = await processDocument(file, options);
      results.push(result);
    } catch (error) {
      errors.push({
        fileName: file.originalname,
        error: error.message,
      });
    }
  }

  return {
    successful: results,
    failed: errors,
    totalProcessed: files.length,
    successRate: (results.length / files.length) * 100,
  };
}

// Get processing status
export async function getProcessingStatus(documentId) {
  // This would typically check a processing queue/database
  // For now, return a simple status
  return {
    documentId,
    status: 'completed', // pending, processing, completed, failed
    progress: 100,
    estimatedTimeRemaining: 0,
  };
}
