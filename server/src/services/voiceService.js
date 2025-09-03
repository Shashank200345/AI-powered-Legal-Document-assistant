import winston from 'winston';
import { 
  transcribeAudio, 
  synthesizeSpeech, 
  getVertexAIModel 
} from './googleCloud.js';
import { analyzeDocument } from './aiAnalyzer.js';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'voice-service' }
});

// Voice-powered document query system
export class VoiceQuerySystem {
  constructor() {
    this.documentContext = new Map(); // Store document contexts by ID
    this.conversationHistory = new Map(); // Store conversation history by session
  }

  // Process voice query and return audio response
  async processVoiceQuery(audioBuffer, documentId, sessionId, options = {}) {
    const startTime = Date.now();

    try {
      logger.info(`Processing voice query for document: ${documentId}, session: ${sessionId}`);

      // Step 1: Transcribe audio to text
      const transcription = await this.transcribeQuery(audioBuffer, options.languageCode);
      
      if (!transcription.transcript) {
        throw new Error('Could not understand audio input');
      }

      logger.info(`Transcribed query: "${transcription.transcript}"`);

      // Step 2: Process the text query
      const textResponse = await this.processTextQuery(
        transcription.transcript, 
        documentId, 
        sessionId,
        options
      );

      // Step 3: Generate audio response
      const audioResponse = await this.generateAudioResponse(
        textResponse.answer, 
        options.voiceName
      );

      // Step 4: Update conversation history
      this.updateConversationHistory(sessionId, {
        query: transcription.transcript,
        response: textResponse.answer,
        timestamp: new Date().toISOString(),
        confidence: transcription.confidence
      });

      const result = {
        sessionId,
        query: {
          text: transcription.transcript,
          confidence: transcription.confidence,
          words: transcription.words
        },
        response: {
          text: textResponse.answer,
          confidence: textResponse.confidence,
          sources: textResponse.sources,
          relatedClauses: textResponse.relatedClauses
        },
        audio: {
          content: audioResponse.audioContent,
          contentType: audioResponse.contentType,
          duration: this.estimateAudioDuration(textResponse.answer)
        },
        suggestions: this.generateFollowUpQuestions(transcription.transcript, documentId),
        processingTime: Date.now() - startTime,
        metadata: {
          model: 'gemini-1.5-pro',
          timestamp: new Date().toISOString()
        }
      };

      logger.info(`Voice query processed successfully in ${result.processingTime}ms`);
      return result;

    } catch (error) {
      logger.error('Voice query processing failed:', error);
      throw new Error(`Voice processing failed: ${error.message}`);
    }
  }

  // Transcribe audio input to text
  async transcribeQuery(audioBuffer, languageCode = 'en-US') {
    try {
      const transcription = await transcribeAudio(audioBuffer, languageCode);
      
      if (!transcription.transcript || transcription.transcript.trim().length === 0) {
        throw new Error('No speech detected in audio');
      }

      // Clean and normalize transcript
      const cleanedTranscript = this.cleanTranscript(transcription.transcript);

      return {
        transcript: cleanedTranscript,
        confidence: transcription.confidence,
        words: transcription.words,
        originalTranscript: transcription.transcript
      };
    } catch (error) {
      logger.error('Audio transcription failed:', error);
      throw error;
    }
  }

  // Process text query against document context
  async processTextQuery(queryText, documentId, sessionId, options = {}) {
    try {
      // Get document context
      const documentContext = this.getDocumentContext(documentId);
      if (!documentContext) {
        return {
          answer: "I don't have access to that document. Please upload a document first.",
          confidence: 0.0,
          sources: [],
          relatedClauses: []
        };
      }

      // Get conversation history for context
      const conversationHistory = this.getConversationHistory(sessionId);

      // Generate contextual response using AI
      const response = await this.generateContextualResponse(
        queryText, 
        documentContext, 
        conversationHistory,
        options
      );

      return response;
    } catch (error) {
      logger.error('Text query processing failed:', error);
      throw error;
    }
  }

  // Generate contextual AI response
  async generateContextualResponse(query, documentContext, conversationHistory, options = {}) {
    try {
      const model = await getVertexAIModel();

      // Build context-aware prompt
      const prompt = this.buildContextualPrompt(query, documentContext, conversationHistory);

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Extract relevant clauses and sources
      const relatedClauses = this.findRelatedClauses(query, documentContext.analysis);
      const sources = this.extractSources(responseText, documentContext);

      return {
        answer: responseText,
        confidence: 0.85,
        sources: sources,
        relatedClauses: relatedClauses,
        queryType: this.classifyQuery(query)
      };
    } catch (error) {
      logger.error('Contextual response generation failed:', error);
      
      // Fallback response
      return {
        answer: "I'm sorry, I couldn't process your question at the moment. Please try rephrasing your question or ask about specific clauses in the document.",
        confidence: 0.1,
        sources: [],
        relatedClauses: []
      };
    }
  }

  // Build contextual prompt for AI
  buildContextualPrompt(query, documentContext, conversationHistory) {
    const recentHistory = conversationHistory.slice(-3); // Last 3 exchanges

    return `
You are LexiPlain, an expert legal AI assistant. You have access to a legal document and must answer questions about it clearly and accurately.

DOCUMENT INFORMATION:
- Type: ${documentContext.analysis.summary.documentType}
- Word Count: ${documentContext.analysis.summary.wordCount}
- Overall Risk: ${documentContext.analysis.summary.overallRisk}
- Key Parties: ${documentContext.analysis.summary.keyParties.join(', ')}

DOCUMENT TEXT (excerpt):
${documentContext.extractedText.substring(0, 4000)}

ANALYSIS SUMMARY:
${JSON.stringify(documentContext.analysis.aiSummary, null, 2)}

IDENTIFIED CLAUSES:
${documentContext.analysis.clauses.map(clause => 
  `- ${clause.title} (${clause.riskLevel} risk): ${clause.summary}`
).join('\n')}

RECENT CONVERSATION:
${recentHistory.map(h => 
  `User: ${h.query}\nAssistant: ${h.response}`
).join('\n\n')}

CURRENT QUESTION: ${query}

INSTRUCTIONS:
1. Answer based ONLY on the document provided
2. Be concise but comprehensive
3. Explain legal concepts in plain English
4. If the document doesn't contain the information, say so clearly
5. Reference specific clauses or sections when applicable
6. Provide practical implications and recommendations
7. Use a helpful, professional tone

ANSWER:`;
  }

  // Generate audio response from text
  async generateAudioResponse(text, voiceName) {
    try {
      // Optimize text for speech
      const speechText = this.optimizeTextForSpeech(text);
      
      const audioResponse = await synthesizeSpeech(speechText, voiceName);
      return audioResponse;
    } catch (error) {
      logger.error('Audio response generation failed:', error);
      throw error;
    }
  }

  // Document context management
  setDocumentContext(documentId, extractedText, analysis) {
    this.documentContext.set(documentId, {
      extractedText,
      analysis,
      timestamp: new Date().toISOString()
    });
    
    logger.info(`Document context set for: ${documentId}`);
  }

  getDocumentContext(documentId) {
    return this.documentContext.get(documentId);
  }

  removeDocumentContext(documentId) {
    return this.documentContext.delete(documentId);
  }

  // Conversation history management
  updateConversationHistory(sessionId, exchange) {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }
    
    const history = this.conversationHistory.get(sessionId);
    history.push(exchange);
    
    // Keep only last 10 exchanges
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
  }

  getConversationHistory(sessionId) {
    return this.conversationHistory.get(sessionId) || [];
  }

  clearConversationHistory(sessionId) {
    this.conversationHistory.delete(sessionId);
  }

  // Utility functions
  cleanTranscript(transcript) {
    return transcript
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  optimizeTextForSpeech(text) {
    return text
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Add pause after sentences
      .replace(/\b(e\.g\.|i\.e\.|etc\.)\b/g, (match) => {
        const expansions = {
          'e.g.': 'for example',
          'i.e.': 'that is',
          'etc.': 'and so on'
        };
        return expansions[match.toLowerCase()] || match;
      })
      .replace(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, '$1 dollars') // Format currency
      .replace(/(\d+)%/g, '$1 percent') // Format percentages
      .trim();
  }

  estimateAudioDuration(text) {
    // Rough estimate: 150 words per minute, 5 characters per word average
    const words = text.length / 5;
    const minutes = words / 150;
    return Math.ceil(minutes * 60); // Return seconds
  }

  findRelatedClauses(query, analysis) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const relatedClauses = [];

    analysis.clauses.forEach(clause => {
      const clauseText = clause.summary.toLowerCase();
      const matchScore = queryWords.reduce((score, word) => {
        return score + (clauseText.includes(word) ? 1 : 0);
      }, 0);

      if (matchScore > 0) {
        relatedClauses.push({
          ...clause,
          relevanceScore: matchScore / queryWords.length
        });
      }
    });

    return relatedClauses
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3);
  }

  extractSources(responseText, documentContext) {
    // Extract sources/references from the AI response
    const sources = [];
    
    // Look for clause references
    const clauseRefs = responseText.match(/clause\s+(\d+|[ivx]+)/gi);
    if (clauseRefs) {
      sources.push(...clauseRefs.map(ref => ({ type: 'clause', reference: ref })));
    }

    // Look for section references
    const sectionRefs = responseText.match(/section\s+(\d+|[ivx]+)/gi);
    if (sectionRefs) {
      sources.push(...sectionRefs.map(ref => ({ type: 'section', reference: ref })));
    }

    return sources.slice(0, 5); // Limit to 5 sources
  }

  classifyQuery(query) {
    const queryLower = query.toLowerCase();
    
    const patterns = {
      termination: ['terminate', 'end', 'cancel', 'break'],
      payment: ['pay', 'payment', 'cost', 'fee', 'money', 'amount'],
      liability: ['liable', 'responsible', 'fault', 'damage'],
      rights: ['right', 'can i', 'allowed', 'permitted'],
      obligations: ['must', 'have to', 'required', 'obligation'],
      timeline: ['when', 'deadline', 'due', 'time'],
      general: ['what', 'how', 'why', 'explain']
    };

    for (const [type, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        return type;
      }
    }

    return 'general';
  }

  generateFollowUpQuestions(query, documentId) {
    const queryType = this.classifyQuery(query);
    
    const suggestions = {
      termination: [
        "How much notice is required for termination?",
        "What are the consequences of early termination?",
        "Can either party terminate without cause?"
      ],
      payment: [
        "When are payments due?",
        "What happens if I pay late?",
        "Are there any additional fees?"
      ],
      liability: [
        "What am I liable for under this agreement?",
        "Are there any liability limitations?",
        "What insurance requirements exist?"
      ],
      rights: [
        "What are my main rights in this document?",
        "Can I transfer my rights to someone else?",
        "What happens if my rights are violated?"
      ],
      obligations: [
        "What are my main obligations?",
        "What happens if I don't fulfill my obligations?",
        "Can I delegate my responsibilities?"
      ],
      general: [
        "What are the key risks in this document?",
        "Who are the parties involved?",
        "What are the most important deadlines?"
      ]
    };

    return suggestions[queryType] || suggestions.general;
  }

  // Get system statistics
  getSystemStats() {
    return {
      documentsInContext: this.documentContext.size,
      activeSessions: this.conversationHistory.size,
      totalConversations: Array.from(this.conversationHistory.values())
        .reduce((total, history) => total + history.length, 0)
    };
  }
}

// Create singleton instance
export const voiceQuerySystem = new VoiceQuerySystem();

// Export utility functions
export {
  transcribeAudio,
  synthesizeSpeech
};
