import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Upload, 
  FileText, 
  MessageSquare, 
  Bot, 
  User, 
  Paperclip,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Mic,
  MicOff,
  Volume2,
  Download,
  Copy,
  MoreVertical,
  Plus,
  Trash2,
  Loader2,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { api, realtime } from '@/lib/api';
import { GlassCard } from '@/components/Glass';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

interface Document {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  file_path: string;
  extracted_text?: string;
  confidence?: number;
  pages?: number;
  word_count?: number;
  language?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ChatSession {
  sessionId: string;
  documentId: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  messageCount?: number;
}

export default function DocumentChat() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showVoiceQuery, setShowVoiceQuery] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Load chat sessions when document is selected
  useEffect(() => {
    if (selectedDocument) {
      loadChatSessions(selectedDocument.id);
    }
  }, [selectedDocument]);

  // Load messages when session is selected
  useEffect(() => {
    if (currentSession && selectedDocument) {
      loadChatHistory(selectedDocument.id, currentSession.sessionId);
    }
  }, [currentSession, selectedDocument]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await api.getAllDocuments();
      if (response.success) {
        setDocuments(response.data);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      setError('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatSessions = async (documentId: string) => {
    try {
      const response = await api.getChatSessions(documentId);
      if (response.success) {
        setChatSessions(response.data.sessions);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  };

  const loadChatHistory = async (documentId: string, sessionId: string) => {
    try {
      const response = await api.getChatHistory(documentId, sessionId);
      if (response.success) {
        const formattedMessages = response.data.messages.map((msg: any) => ({
          id: msg.id,
          type: msg.message_type,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          metadata: msg.metadata
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await api.uploadDocument(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        const newDocument = response.data;
        setDocuments(prev => [newDocument, ...prev]);
        setSelectedDocument(newDocument);
        
        // Create a new chat session for the document
        await createNewSession(newDocument.id, `Chat for ${newDocument.original_name}`);
        
        // Add welcome message
        setMessages([{
          id: 'welcome',
          type: 'assistant',
          content: `Great! I've uploaded and processed "${newDocument.original_name}". The document has been analyzed and I'm ready to help you understand its contents. What would you like to know about this document?`,
          timestamp: new Date()
        }]);
      } else {
        setError(response.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload document');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const createNewSession = async (documentId: string, title: string) => {
    try {
      const response = await api.createChatSession(documentId, undefined, title);
      if (response.success) {
        const newSession = response.data;
        setChatSessions(prev => [newSession, ...prev]);
        setCurrentSession(newSession);
        return newSession;
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || !selectedDocument) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      const response = await api.sendChatMessage(
        selectedDocument.id,
        inputMessage,
        currentSession.sessionId
      );

      if (response.success) {
        const { userMessage: savedUserMessage, aiResponse } = response.data;
        
        if (aiResponse) {
          const assistantMessage: Message = {
            id: Date.now().toString() + '_ai',
            type: 'assistant',
            content: aiResponse.response,
            timestamp: new Date(),
            metadata: {
              confidence: aiResponse.confidence,
              sources: aiResponse.sources,
              suggestions: aiResponse.suggestions
            }
          };
          
          setMessages(prev => [...prev, assistantMessage]);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processVoiceQuery(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceQuery = async (audioBlob: Blob) => {
    if (!selectedDocument || !currentSession) return;

    try {
      const response = await api.processVoiceQuery(
        selectedDocument.id,
        audioBlob,
        {
          sessionId: currentSession.sessionId,
          language: 'en-US'
        }
      );

      if (response.success) {
        const { transcription, response: voiceResponse } = response.data;
        
        // Add transcription as user message
        const userMessage: Message = {
          id: Date.now().toString(),
          type: 'user',
          content: transcription.text,
          timestamp: new Date(),
          metadata: { isVoice: true, confidence: transcription.confidence }
        };

        // Add AI response
        const assistantMessage: Message = {
          id: Date.now().toString() + '_ai',
          type: 'assistant',
          content: voiceResponse.text,
          timestamp: new Date(),
          metadata: { 
            isVoice: true, 
            confidence: voiceResponse.confidence,
            audioResponse: voiceResponse.audio
          }
        };

        setMessages(prev => [...prev, userMessage, assistantMessage]);
      }
    } catch (error) {
      console.error('Failed to process voice query:', error);
      setError('Failed to process voice query');
    }
  };

  const playAudioResponse = (base64Audio: string) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
      audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  const exportChatHistory = async () => {
    if (!currentSession || !selectedDocument) return;

    try {
      const response = await api.exportChatHistory(
        selectedDocument.id,
        currentSession.sessionId,
        'json'
      );
      
      if (response) {
        const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chat-history-${currentSession.sessionId}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export chat history:', error);
      setError('Failed to export chat history');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(59,130,246,0.15),transparent_60%)]">
      <div className="pointer-events-none fixed inset-0 bg-grid" />
      
      {/* Floating Cards Background */}
      <div className="pointer-events-none absolute inset-0 -z-0 hidden md:block">
        {/* Left stack: document info */}
        <div className="absolute left-2 top-24 sm:left-4 lg:left-10">
          <div className="glass-soft elevated rotate-[-6deg] rounded-3xl px-5 py-4 shadow-xl shadow-sky-500/10 backdrop-blur-2xl">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-[12px] sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                {selectedDocument ? 'Document Ready' : 'Upload Document'}
              </span>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {selectedDocument ? selectedDocument.word_count || 0 : 0}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">words</span>
            </div>
          </div>
        </div>

        {/* Right stack: document content */}
        <div className="absolute right-2 top-16 sm:right-4 lg:right-10">
          <div className="glass elevated rotate-[4deg] rounded-3xl px-5 py-4 shadow-xl shadow-sky-500/10 animate-float">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span className="text-[12px] sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                Document View
              </span>
            </div>
            <div className="mt-2 text-sm font-medium text-purple-600">
              {selectedDocument ? 'Content visible' : 'No document selected'}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Legal Document Assistant
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Upload your legal documents and chat with AI to understand their contents
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column - Document Upload & List */}
            <div className="lg:col-span-1 space-y-6">
              {/* Upload Card */}
              <GlassCard className="p-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    Upload Document
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Drag & drop or click to upload
                  </p>
                </div>

                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                      : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                    Drag & drop a document here, or
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="rounded-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Choose File'
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleFileUpload(Array.from(e.target.files));
                      }
                    }}
                  />
                </div>

                {isUploading && (
                  <div className="mt-4">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}
              </GlassCard>

              {/* Documents List */}
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Your Documents
                </h3>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedDocument?.id === doc.id
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                        onClick={() => setSelectedDocument(doc)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {doc.original_name}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {doc.mime_type.split('/')[1].toUpperCase()}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {formatFileSize(doc.file_size)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatDate(doc.created_at)}
                            </p>
                          </div>
                          <Badge
                            variant={
                              doc.status === 'processed'
                                ? 'default'
                                : doc.status === 'processing'
                                ? 'secondary'
                                : 'destructive'
                            }
                            className="text-xs"
                          >
                            {doc.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </GlassCard>
            </div>

            {/* Middle Column - Chat Interface */}
            <div className="lg:col-span-2">
              <GlassCard className="h-[600px] flex flex-col">
                {/* Chat Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        {selectedDocument ? selectedDocument.original_name : 'Select a Document'}
                      </h2>
                      {selectedDocument && (
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {selectedDocument.word_count} words • {selectedDocument.pages} pages
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {currentSession && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportChatHistory}
                          className="rounded-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectedDocument && createNewSession(selectedDocument.id, 'New Chat')}
                        disabled={!selectedDocument}
                        className="rounded-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Chat
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Chat Sessions */}
                {selectedDocument && chatSessions.length > 0 && (
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <ScrollArea className="h-16">
                      <div className="flex space-x-2">
                        {chatSessions.map((session) => (
                          <Button
                            key={session.sessionId}
                            variant={currentSession?.sessionId === session.sessionId ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentSession(session)}
                            className="rounded-full whitespace-nowrap"
                          >
                            {session.title}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Messages Area */}
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-3xl rounded-2xl p-4 ${
                            message.type === 'user'
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                              : message.type === 'assistant'
                              ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                              : 'bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            {message.type === 'assistant' && (
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                  <Bot className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                            {message.type === 'user' && (
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm leading-relaxed">{message.content}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs opacity-70">
                                  {message.timestamp.toLocaleTimeString()}
                                </span>
                                {message.metadata?.audioResponse && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => playAudioResponse(message.metadata.audioResponse)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Volume2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Error Display */}
                {error && (
                  <div className="p-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Input Area */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-end space-x-3">
                    <div className="flex-1">
                      <Textarea
                        ref={textareaRef}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={
                          selectedDocument
                            ? "Ask me anything about this document..."
                            : "Upload a document to start chatting..."
                        }
                        className="min-h-[60px] max-h-[120px] resize-none rounded-2xl"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        disabled={!selectedDocument || !currentSession}
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant={isRecording ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={!selectedDocument || !currentSession}
                        className="rounded-full"
                      >
                        {isRecording ? (
                          <MicOff className="h-4 w-4" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || !selectedDocument || !currentSession}
                        size="sm"
                        className="rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Right Column - Document Text Display */}
            <div className="lg:col-span-2">
              <GlassCard className="h-[600px] flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Document Content
                  </h3>
                  {selectedDocument && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {selectedDocument.original_name}
                    </p>
                  )}
                </div>

                <ScrollArea className="flex-1 p-6">
                  {selectedDocument ? (
                    <div className="space-y-4">
                      {/* Document Info */}
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">Type:</span>
                            <p className="text-slate-600 dark:text-slate-400">
                              {selectedDocument.mime_type.split('/')[1].toUpperCase()}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">Size:</span>
                            <p className="text-slate-600 dark:text-slate-400">
                              {formatFileSize(selectedDocument.file_size)}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">Words:</span>
                            <p className="text-slate-600 dark:text-slate-400">
                              {selectedDocument.word_count || 0}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">Status:</span>
                            <Badge
                              variant={selectedDocument.status === 'processed' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {selectedDocument.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Document Text */}
                      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <h4 className="font-medium text-slate-900 dark:text-white">Extracted Text</h4>
                          {selectedDocument.extracted_text && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedDocument.extracted_text || '');
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="p-4">
                          {selectedDocument.extracted_text ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-mono leading-relaxed">
                                {selectedDocument.extracted_text}
                              </pre>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                              <p className="text-slate-500 dark:text-slate-400">
                                No text extracted from this document
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                        No Document Selected
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400">
                        Upload a document to see its content here
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}