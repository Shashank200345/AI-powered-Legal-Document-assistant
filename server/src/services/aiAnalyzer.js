import natural from 'natural';
import compromise from 'compromise';
import sentiment from 'sentiment';
import keywordExtractor from 'keyword-extractor';
import { get } from 'tiktoken';
import winston from 'winston';

import { getVertexAIModel } from './googleCloud.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'ai-analyzer' }
});

// Initialize NLP tools
const tokenizer = natural.WordTokenizer;
const stemmer = natural.PorterStemmer;
const sentimentAnalyzer = new sentiment();

// Legal clause patterns and risk indicators
const LEGAL_PATTERNS = {
  termination: {
    keywords: ['terminate', 'termination', 'end', 'cancel', 'cancellation', 'breach', 'default'],
    patterns: [
      /termination.{0,50}notice/gi,
      /breach.{0,50}contract/gi,
      /cancel.{0,50}agreement/gi,
      /end.{0,50}relationship/gi
    ],
    riskLevel: 'high'
  },
  payment: {
    keywords: ['payment', 'pay', 'fee', 'cost', 'charge', 'price', 'amount', 'due'],
    patterns: [
      /payment.{0,50}due/gi,
      /late.{0,50}fee/gi,
      /penalty.{0,50}payment/gi,
      /interest.{0,50}charge/gi
    ],
    riskLevel: 'high'
  },
  liability: {
    keywords: ['liable', 'liability', 'responsible', 'damages', 'loss', 'harm', 'injury'],
    patterns: [
      /limit.{0,50}liability/gi,
      /exclude.{0,50}damages/gi,
      /indemnify.{0,50}against/gi,
      /hold.{0,50}harmless/gi
    ],
    riskLevel: 'critical'
  },
  confidentiality: {
    keywords: ['confidential', 'proprietary', 'disclosure', 'non-disclosure', 'nda'],
    patterns: [
      /confidential.{0,50}information/gi,
      /non.?disclosure/gi,
      /proprietary.{0,50}data/gi,
      /trade.{0,50}secret/gi
    ],
    riskLevel: 'medium'
  },
  intellectual_property: {
    keywords: ['copyright', 'trademark', 'patent', 'ip', 'intellectual property', 'ownership'],
    patterns: [
      /intellectual.{0,50}property/gi,
      /copyright.{0,50}ownership/gi,
      /trademark.{0,50}rights/gi,
      /patent.{0,50}infringement/gi
    ],
    riskLevel: 'high'
  },
  force_majeure: {
    keywords: ['force majeure', 'act of god', 'unforeseeable', 'beyond control'],
    patterns: [
      /force.{0,10}majeure/gi,
      /act.{0,10}of.{0,10}god/gi,
      /beyond.{0,20}control/gi,
      /unforeseeable.{0,20}circumstances/gi
    ],
    riskLevel: 'low'
  }
};

// Risk scoring weights
const RISK_WEIGHTS = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  minimal: 1
};

// Main document analysis function
export async function analyzeDocument(documentText, options = {}) {
  const startTime = Date.now();
  
  try {
    logger.info('Starting comprehensive document analysis');

    // Preprocess text
    const preprocessedText = preprocessText(documentText);
    
    // Run analysis pipeline
    const [
      clauses,
      riskAssessment,
      keyInsights,
      summary,
      plainLanguage
    ] = await Promise.all([
      detectClauses(preprocessedText),
      assessRisks(preprocessedText),
      extractKeyInsights(preprocessedText),
      generateSummary(preprocessedText),
      generatePlainLanguageVersion(preprocessedText)
    ]);

    // Generate overall risk score
    const overallRisk = calculateOverallRisk(riskAssessment);
    
    // Create analysis result
    const analysis = {
      summary: {
        documentType: detectDocumentType(preprocessedText),
        wordCount: countWords(preprocessedText),
        readingTime: Math.ceil(countWords(preprocessedText) / 250), // minutes
        overallRisk: overallRisk,
        keyParties: extractParties(preprocessedText),
        importantDates: extractDates(preprocessedText),
        monetaryAmounts: extractAmounts(preprocessedText)
      },
      clauses: clauses,
      riskAssessment: riskAssessment,
      keyInsights: keyInsights,
      plainLanguage: plainLanguage,
      aiSummary: summary,
      recommendations: generateRecommendations(riskAssessment, clauses),
      processingTime: Date.now() - startTime,
      confidence: calculateConfidence(clauses, riskAssessment),
      metadata: {
        analysisVersion: '2.0',
        model: 'gemini-1.5-pro',
        timestamp: new Date().toISOString()
      }
    };

    logger.info(`Document analysis completed in ${analysis.processingTime}ms`);
    return analysis;

  } catch (error) {
    logger.error('Document analysis failed:', error);
    throw new Error(`Analysis failed: ${error.message}`);
  }
}

// Preprocess document text
function preprocessText(text) {
  if (!text) return '';
  
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,;:!?()-]/g, ' ')
    .trim();
}

// Detect and extract legal clauses
async function detectClauses(text) {
  const clauses = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

  for (const [clauseType, config] of Object.entries(LEGAL_PATTERNS)) {
    const matches = [];
    
    // Keyword matching
    config.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          keyword,
          position: match.index,
          context: extractContext(text, match.index, 200)
        });
      }
    });

    // Pattern matching
    config.patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          pattern: pattern.source,
          position: match.index,
          context: match[0],
          fullContext: extractContext(text, match.index, 300)
        });
      }
    });

    if (matches.length > 0) {
      // Find relevant sentences
      const relevantSentences = sentences.filter(sentence => 
        config.keywords.some(keyword => 
          sentence.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      clauses.push({
        type: clauseType,
        title: formatClauseTitle(clauseType),
        riskLevel: config.riskLevel,
        matches: matches.length,
        content: relevantSentences.slice(0, 3), // Top 3 relevant sentences
        summary: await summarizeClause(relevantSentences.join(' '), clauseType),
        plainLanguage: await translateToPlainLanguage(relevantSentences.join(' ')),
        recommendations: getClauseRecommendations(clauseType, config.riskLevel)
      });
    }
  }

  return clauses.sort((a, b) => RISK_WEIGHTS[b.riskLevel] - RISK_WEIGHTS[a.riskLevel]);
}

// Assess document risks
async function assessRisks(text) {
  const risks = [];
  
  // Financial risks
  const financialRisk = analyzeFinancialRisk(text);
  if (financialRisk.score > 0.3) {
    risks.push({
      category: 'financial',
      level: financialRisk.level,
      score: financialRisk.score,
      description: 'Potential financial obligations and penalties',
      details: financialRisk.details,
      impact: 'High monetary exposure'
    });
  }

  // Legal compliance risks
  const complianceRisk = analyzeComplianceRisk(text);
  if (complianceRisk.score > 0.2) {
    risks.push({
      category: 'compliance',
      level: complianceRisk.level,
      score: complianceRisk.score,
      description: 'Regulatory and legal compliance requirements',
      details: complianceRisk.details,
      impact: 'Potential legal violations'
    });
  }

  // Operational risks
  const operationalRisk = analyzeOperationalRisk(text);
  if (operationalRisk.score > 0.25) {
    risks.push({
      category: 'operational',
      level: operationalRisk.level,
      score: operationalRisk.score,
      description: 'Business operation constraints and requirements',
      details: operationalRisk.details,
      impact: 'Business process restrictions'
    });
  }

  return risks.sort((a, b) => b.score - a.score);
}

// Extract key insights from document
async function extractKeyInsights(text) {
  const insights = {
    keyTerms: extractKeyTerms(text),
    obligations: extractObligations(text),
    rights: extractRights(text),
    deadlines: extractDeadlines(text),
    penalties: extractPenalties(text),
    benefits: extractBenefits(text)
  };

  return insights;
}

// Generate AI summary using Gemini
async function generateSummary(text) {
  try {
    const model = await getVertexAIModel();
    
    const prompt = `
    You are a legal AI assistant. Analyze this legal document and provide a comprehensive summary.
    
    Focus on:
    1. Document type and purpose
    2. Key parties involved
    3. Main obligations and rights
    4. Important dates and deadlines
    5. Financial implications
    6. Risk factors
    
    Document text:
    ${text.substring(0, 8000)}
    
    Provide a structured summary in JSON format with sections: overview, keyParties, obligations, timeline, financials, risks.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    try {
      return JSON.parse(response);
    } catch {
      // Fallback to plain text summary
      return {
        overview: response,
        confidence: 0.8
      };
    }
  } catch (error) {
    logger.error('AI summary generation failed:', error);
    return {
      overview: 'Summary generation failed',
      confidence: 0
    };
  }
}

// Generate plain language version
async function generatePlainLanguageVersion(text) {
  try {
    const model = await getVertexAIModel();
    
    const prompt = `
    Convert this legal text into plain, easy-to-understand English. 
    Remove jargon, simplify complex sentences, and explain legal concepts clearly.
    Maintain all important information while making it accessible to non-lawyers.
    
    Legal text:
    ${text.substring(0, 6000)}
    
    Provide clear, simple explanations that anyone can understand.
    `;

    const result = await model.generateContent(prompt);
    return {
      text: result.response.text(),
      confidence: 0.85
    };
  } catch (error) {
    logger.error('Plain language generation failed:', error);
    return {
      text: 'Plain language translation not available',
      confidence: 0
    };
  }
}

// Utility functions for text analysis
function extractContext(text, position, length) {
  const start = Math.max(0, position - length / 2);
  const end = Math.min(text.length, position + length / 2);
  return text.substring(start, end).trim();
}

function formatClauseTitle(clauseType) {
  return clauseType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function countWords(text) {
  return text.trim().split(/\s+/).length;
}

function detectDocumentType(text) {
  const types = {
    'Employment Contract': ['employment', 'employee', 'salary', 'job', 'position'],
    'Service Agreement': ['services', 'provider', 'client', 'deliverables'],
    'Rental Agreement': ['rent', 'lease', 'tenant', 'landlord', 'property'],
    'Non-Disclosure Agreement': ['confidential', 'disclosure', 'proprietary', 'nda'],
    'Terms of Service': ['terms', 'service', 'user', 'website', 'platform'],
    'License Agreement': ['license', 'software', 'use', 'permitted', 'restricted']
  };

  let maxScore = 0;
  let detectedType = 'Legal Document';

  Object.entries(types).forEach(([type, keywords]) => {
    const score = keywords.reduce((acc, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      return acc + (matches ? matches.length : 0);
    }, 0);

    if (score > maxScore) {
      maxScore = score;
      detectedType = type;
    }
  });

  return detectedType;
}

// Risk analysis functions
function analyzeFinancialRisk(text) {
  const financialKeywords = ['payment', 'fee', 'cost', 'penalty', 'fine', 'charge', 'amount', 'price'];
  const riskKeywords = ['late', 'default', 'breach', 'penalty', 'interest', 'compound'];
  
  let score = 0;
  let details = [];

  financialKeywords.forEach(keyword => {
    const matches = (text.toLowerCase().match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
    score += matches * 0.1;
  });

  riskKeywords.forEach(keyword => {
    const matches = (text.toLowerCase().match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
    score += matches * 0.2;
    if (matches > 0) details.push(`Contains ${matches} references to ${keyword}`);
  });

  const level = score > 0.8 ? 'critical' : score > 0.5 ? 'high' : score > 0.3 ? 'medium' : 'low';

  return { score: Math.min(score, 1), level, details };
}

function analyzeComplianceRisk(text) {
  const complianceKeywords = ['comply', 'regulation', 'law', 'legal', 'requirement', 'mandatory'];
  const riskKeywords = ['violation', 'breach', 'non-compliance', 'penalty', 'fine'];
  
  let score = 0;
  let details = [];

  complianceKeywords.forEach(keyword => {
    const matches = (text.toLowerCase().match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
    score += matches * 0.08;
  });

  riskKeywords.forEach(keyword => {
    const matches = (text.toLowerCase().match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
    score += matches * 0.15;
    if (matches > 0) details.push(`Contains ${matches} references to ${keyword}`);
  });

  const level = score > 0.7 ? 'critical' : score > 0.4 ? 'high' : score > 0.2 ? 'medium' : 'low';

  return { score: Math.min(score, 1), level, details };
}

function analyzeOperationalRisk(text) {
  const operationalKeywords = ['perform', 'deliver', 'provide', 'maintain', 'support'];
  const riskKeywords = ['failure', 'delay', 'unable', 'impossible', 'restrict'];
  
  let score = 0;
  let details = [];

  operationalKeywords.forEach(keyword => {
    const matches = (text.toLowerCase().match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
    score += matches * 0.05;
  });

  riskKeywords.forEach(keyword => {
    const matches = (text.toLowerCase().match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
    score += matches * 0.1;
    if (matches > 0) details.push(`Contains ${matches} references to ${keyword}`);
  });

  const level = score > 0.6 ? 'high' : score > 0.25 ? 'medium' : 'low';

  return { score: Math.min(score, 1), level, details };
}

// Additional extraction functions
function extractKeyTerms(text) {
  return keywordExtractor.extract(text, {
    language: 'english',
    remove_digits: false,
    return_changed_case: true,
    remove_duplicates: true
  }).slice(0, 20);
}

function extractParties(text) {
  // Simple party extraction - in production, use NER
  const parties = [];
  const partyPatterns = [
    /(?:party|parties|company|corporation|individual|entity)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g,
    /[A-Z][a-z]+\s+(?:Inc|LLC|Corp|Ltd|Co)\b/g
  ];

  partyPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) parties.push(...matches);
  });

  return [...new Set(parties)].slice(0, 5);
}

function extractDates(text) {
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g
  ];

  const dates = [];
  datePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) dates.push(...matches);
  });

  return [...new Set(dates)];
}

function extractAmounts(text) {
  const amountPatterns = [
    /\$[\d,]+(?:\.\d{2})?/g,
    /\b\d+\s*(?:dollars?|USD)\b/g,
    /\b(?:amount|sum|fee|cost|price|charge)\s+of\s+\$?[\d,]+(?:\.\d{2})?/g
  ];

  const amounts = [];
  amountPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) amounts.push(...matches);
  });

  return [...new Set(amounts)];
}

function extractObligations(text) {
  const obligationPatterns = [
    /\b(?:must|shall|required to|obligated to|responsible for)\s+[^.!?]+[.!?]/g,
    /\b(?:agrees to|commits to|undertakes to)\s+[^.!?]+[.!?]/g
  ];

  const obligations = [];
  obligationPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) obligations.push(...matches.slice(0, 5));
  });

  return obligations;
}

function extractRights(text) {
  const rightPatterns = [
    /\b(?:entitled to|right to|may|permitted to)\s+[^.!?]+[.!?]/g,
    /\b(?:benefit|advantage|privilege)\s+[^.!?]+[.!?]/g
  ];

  const rights = [];
  rightPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) rights.push(...matches.slice(0, 5));
  });

  return rights;
}

function extractDeadlines(text) {
  const deadlinePatterns = [
    /\b(?:within|by|before|no later than)\s+\d+\s+(?:days?|weeks?|months?|years?)\b/g,
    /\b(?:deadline|due date|expiry|expiration)\s+[^.!?]+[.!?]/g
  ];

  const deadlines = [];
  deadlinePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) deadlines.push(...matches);
  });

  return [...new Set(deadlines)];
}

function extractPenalties(text) {
  const penaltyPatterns = [
    /\b(?:penalty|fine|charge|fee)\s+[^.!?]+[.!?]/g,
    /\b(?:breach|default|violation)\s+[^.!?]*(?:penalty|fine|charge)[^.!?]*[.!?]/g
  ];

  const penalties = [];
  penaltyPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) penalties.push(...matches);
  });

  return [...new Set(penalties)];
}

function extractBenefits(text) {
  const benefitPatterns = [
    /\b(?:benefit|advantage|gain|profit|compensation)\s+[^.!?]+[.!?]/g,
    /\b(?:receive|obtain|get|acquire)\s+[^.!?]*(?:benefit|compensation|payment)[^.!?]*[.!?]/g
  ];

  const benefits = [];
  benefitPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) benefits.push(...matches);
  });

  return [...new Set(benefits)];
}

// Helper functions
function calculateOverallRisk(riskAssessment) {
  if (riskAssessment.length === 0) return 'low';
  
  const scores = riskAssessment.map(risk => RISK_WEIGHTS[risk.level]);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  if (avgScore >= 4.5) return 'critical';
  if (avgScore >= 3.5) return 'high';
  if (avgScore >= 2.5) return 'medium';
  return 'low';
}

function calculateConfidence(clauses, riskAssessment) {
  // Calculate confidence based on number of matches and quality of analysis
  const clauseConfidence = clauses.length > 0 ? 0.8 : 0.4;
  const riskConfidence = riskAssessment.length > 0 ? 0.9 : 0.5;
  
  return (clauseConfidence + riskConfidence) / 2;
}

async function summarizeClause(clauseText, clauseType) {
  // Simple summarization - in production, use advanced NLP
  const sentences = clauseText.split(/[.!?]+/).filter(s => s.trim().length > 20);
  return sentences.slice(0, 2).join('. ').trim() + '.';
}

async function translateToPlainLanguage(clauseText) {
  // Simple plain language conversion - in production, use advanced AI
  return clauseText
    .replace(/\bwhereas\b/gi, 'since')
    .replace(/\btherefore\b/gi, 'so')
    .replace(/\bshall\b/gi, 'will')
    .replace(/\bhereby\b/gi, '')
    .replace(/\bheretofore\b/gi, 'before this')
    .trim();
}

function getClauseRecommendations(clauseType, riskLevel) {
  const recommendations = {
    termination: [
      'Review notice periods carefully',
      'Understand conditions that trigger termination',
      'Consider negotiating more favorable terms'
    ],
    payment: [
      'Verify payment amounts and due dates',
      'Check for late payment penalties',
      'Ensure payment terms are acceptable'
    ],
    liability: [
      'Understand your liability exposure',
      'Consider liability insurance',
      'Negotiate liability caps where possible'
    ],
    confidentiality: [
      'Identify what information is considered confidential',
      'Understand disclosure restrictions',
      'Verify compliance requirements'
    ]
  };

  return recommendations[clauseType] || ['Consult with legal counsel for guidance'];
}

function generateRecommendations(riskAssessment, clauses) {
  const recommendations = [];
  
  if (riskAssessment.some(risk => risk.level === 'critical')) {
    recommendations.push('Immediate legal review recommended due to critical risk factors');
  }
  
  if (clauses.some(clause => clause.riskLevel === 'high')) {
    recommendations.push('Pay special attention to high-risk clauses before signing');
  }
  
  if (riskAssessment.length > 5) {
    recommendations.push('Multiple risk factors identified - comprehensive review suggested');
  }
  
  recommendations.push('Keep copies of all documents and correspondence');
  recommendations.push('Set reminders for important dates and deadlines');
  
  return recommendations;
}

export {
  LEGAL_PATTERNS,
  RISK_WEIGHTS,
  preprocessText,
  detectClauses,
  assessRisks,
  extractKeyInsights
};
