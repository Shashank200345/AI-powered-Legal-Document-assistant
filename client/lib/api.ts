import { io, Socket } from 'socket.io-client';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Socket.IO client instance
let socket: Socket | null = null;

// Initialize Socket.IO connection
export function initializeSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('Connected to LexiPlain backend');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from backend');
    });

    socket.on('connection:established', (data) => {
      console.log('Connection established:', data);
    });
  }
  return socket;
}

// Get socket instance
export function getSocket() {
  return socket || initializeSocket();
}

// API Client Class
class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Document endpoints
  async uploadDocument(file: File, options?: any): Promise<any> {
    const formData = new FormData();
    formData.append('document', file);
    
    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    return this.request('/documents/upload', {
      method: 'POST',
      headers: {}, // Remove Content-Type to let browser set boundary
      body: formData,
    });
  }

  async getAllDocuments(): Promise<any> {
    return this.request('/documents');
  }

  async getDocument(documentId: string): Promise<any> {
    return this.request(`/documents/${documentId}`);
  }

  async deleteDocument(documentId: string): Promise<any> {
    return this.request(`/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  async batchUploadDocuments(files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`documents`, file);
    });

    return this.request('/documents/batch-upload', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }

  async getDocumentStatus(documentId: string): Promise<any> {
    return this.request(`/documents/${documentId}/status`);
  }

  async getSupportedTypes(): Promise<any> {
    return this.request('/documents/supported-types');
  }

  async getDemoSamples(): Promise<any> {
    return this.request('/documents/demo-samples');
  }

  // Analysis endpoints
  async analyzeDocument(documentId: string, text: string, options?: any): Promise<any> {
    return this.request(`/analysis/${documentId}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ text, options }),
    });
  }

  async getAnalysis(documentId: string): Promise<any> {
    return this.request(`/analysis/${documentId}`);
  }

  async queryDocument(documentId: string, query: string, sessionId?: string): Promise<any> {
    return this.request(`/analysis/${documentId}/query`, {
      method: 'POST',
      body: JSON.stringify({ query, sessionId }),
    });
  }

  async getDocumentClauses(documentId: string, filters?: { type?: string; riskLevel?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.riskLevel) params.append('riskLevel', filters.riskLevel);
    
    const queryString = params.toString();
    return this.request(`/analysis/${documentId}/clauses${queryString ? `?${queryString}` : ''}`);
  }

  async getDocumentRisks(documentId: string): Promise<any> {
    return this.request(`/analysis/${documentId}/risks`);
  }

  async generatePlainLanguage(documentId: string, section?: string, clauseType?: string): Promise<any> {
    return this.request(`/analysis/${documentId}/plain-language`, {
      method: 'POST',
      body: JSON.stringify({ section, clauseType }),
    });
  }

  async exportAnalysis(documentId: string, format: 'json' | 'pdf' | 'txt' = 'json'): Promise<any> {
    return this.request(`/analysis/${documentId}/export?format=${format}`);
  }

  async deleteAnalysis(documentId: string): Promise<any> {
    return this.request(`/analysis/${documentId}`, {
      method: 'DELETE',
    });
  }

  // Chat endpoints
  async createChatSession(documentId: string, sessionId?: string, title?: string): Promise<any> {
    return this.request(`/chat/${documentId}/session`, {
      method: 'POST',
      body: JSON.stringify({ sessionId, title }),
    });
  }

  async sendChatMessage(documentId: string, message: string, sessionId: string, messageType: 'user' | 'assistant' | 'system' = 'user'): Promise<any> {
    return this.request(`/chat/${documentId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message, sessionId, messageType }),
    });
  }

  async getChatHistory(documentId: string, sessionId: string, limit: number = 50, offset: number = 0): Promise<any> {
    const params = new URLSearchParams({
      sessionId,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return this.request(`/chat/${documentId}/history?${params}`);
  }

  async getChatSessions(documentId: string): Promise<any> {
    return this.request(`/chat/${documentId}/sessions`);
  }

  async deleteChatSession(documentId: string, sessionId: string): Promise<any> {
    return this.request(`/chat/${documentId}/session?sessionId=${sessionId}`, {
      method: 'DELETE',
    });
  }

  async clearChatHistory(documentId: string, sessionId: string): Promise<any> {
    return this.request(`/chat/${documentId}/history?sessionId=${sessionId}`, {
      method: 'DELETE',
    });
  }

  async exportChatHistory(documentId: string, sessionId: string, format: 'json' | 'txt' = 'json'): Promise<any> {
    return this.request(`/chat/${documentId}/export?sessionId=${sessionId}&format=${format}`);
  }

  async getSessionStats(documentId: string, sessionId: string): Promise<any> {
    return this.request(`/chat/${documentId}/session/${sessionId}/stats`);
  }

  // Voice endpoints
  async processVoiceQuery(documentId: string, audioBlob: Blob, options?: {
    sessionId?: string;
    language?: string;
  }): Promise<any> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'query.webm');
    
    if (options?.sessionId) {
      formData.append('sessionId', options.sessionId);
    }
    if (options?.language) {
      formData.append('language', options.language);
    }

    return this.request(`/voice/${documentId}/query`, {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }

  async transcribeAudio(audioBlob: Blob, language?: string): Promise<any> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    
    if (language) {
      formData.append('language', language);
    }

    return this.request('/voice/transcribe', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }

  async synthesizeSpeech(text: string, voice?: string, language?: string): Promise<any> {
    return this.request('/voice/synthesize', {
      method: 'POST',
      body: JSON.stringify({ text, voice, language }),
    });
  }

  async getVoiceSessionHistory(documentId: string, sessionId: string): Promise<any> {
    return this.request(`/voice/${documentId}/session/${sessionId}/history`);
  }

  async deleteVoiceSession(documentId: string, sessionId: string): Promise<any> {
    return this.request(`/voice/${documentId}/session/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getVoiceCapabilities(): Promise<any> {
    return this.request('/voice/capabilities');
  }

  async getVoiceStats(): Promise<any> {
    return this.request('/voice/stats');
  }

  // Health endpoints
  async getHealth(): Promise<any> {
    return this.request('/health');
  }

  async getDetailedHealth(): Promise<any> {
    return this.request('/health/detailed');
  }

  async getMetrics(): Promise<any> {
    return this.request('/health/metrics');
  }
}

// Create API client instance
export const api = new APIClient(API_BASE_URL);

// Real-time event handlers
export class RealtimeManager {
  private socket: Socket;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.socket = getSocket();
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Document processing events
    this.socket.on('document:processing:start', (data) => {
      this.emit('document:processing:start', data);
    });

    this.socket.on('document:processing:complete', (data) => {
      this.emit('document:processing:complete', data);
    });

    this.socket.on('document:processing:error', (data) => {
      this.emit('document:processing:error', data);
    });

    // Analysis events
    this.socket.on('analysis:start', (data) => {
      this.emit('analysis:start', data);
    });

    this.socket.on('analysis:complete', (data) => {
      this.emit('analysis:complete', data);
    });

    this.socket.on('analysis:error', (data) => {
      this.emit('analysis:error', data);
    });

    // Voice processing events
    this.socket.on('voice:processing:start', (data) => {
      this.emit('voice:processing:start', data);
    });

    this.socket.on('voice:processing:complete', (data) => {
      this.emit('voice:processing:complete', data);
    });

    this.socket.on('voice:processing:error', (data) => {
      this.emit('voice:processing:error', data);
    });

    // System events
    this.socket.on('system:stats', (data) => {
      this.emit('system:stats', data);
    });
  }

  // Subscribe to events
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  // Emit to all listeners
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Subscribe to document updates
  subscribeToDocument(documentId: string) {
    this.socket.emit('subscribe:document', documentId);
  }

  // Subscribe to analysis updates
  subscribeToAnalysis(documentId: string) {
    this.socket.emit('subscribe:analysis', documentId);
  }

  // Subscribe to voice session updates
  subscribeToVoiceSession(sessionId: string) {
    this.socket.emit('subscribe:voice', sessionId);
  }

  // Unsubscribe from document updates
  unsubscribeFromDocument(documentId: string) {
    this.socket.emit('unsubscribe:document', documentId);
  }

  // Check connection status
  isConnected() {
    return this.socket.connected;
  }

  // Ping server
  ping() {
    this.socket.emit('ping');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      this.socket.once('pong', () => {
        clearTimeout(timeout);
        resolve(true);
      });
    });
  }
}

// Create realtime manager instance
export const realtime = new RealtimeManager();

// Utility functions
export function createAudioFromBase64(base64Data: string, contentType: string = 'audio/mpeg'): HTMLAudioElement {
  const audioBlob = new Blob([
    new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)))
  ], { type: contentType });
  
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  
  // Clean up URL when audio is done
  audio.addEventListener('ended', () => {
    URL.revokeObjectURL(audioUrl);
  });
  
  return audio;
}

export function downloadFile(data: any, filename: string, type: string = 'application/json') {
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Error handling utilities
export class APIError extends Error {
  constructor(message: string, public status?: number, public data?: any) {
    super(message);
    this.name = 'APIError';
  }
}

// Initialize socket on module load
initializeSocket();
