import { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Send, 
  Loader2, 
  X,
  MessageSquare,
  Bot,
  User,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, realtime, createAudioFromBase64 } from '@/lib/api';

interface VoiceQueryProps {
  documentId: string;
  onClose: () => void;
  className?: string;
}

interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  audioContent?: string;
  timestamp: Date;
  confidence?: number;
  sources?: any[];
  relatedClauses?: any[];
}

export default function VoiceQuery({ documentId, onClose, className = '' }: VoiceQueryProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [textQuery, setTextQuery] = useState('');
  const [sessionId] = useState(`voice-session-${Date.now()}`);
  const [error, setError] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to voice processing events
    realtime.subscribeToVoiceSession(sessionId);

    const unsubscribeStart = realtime.on('voice:processing:start', (data: any) => {
      if (data.sessionId === sessionId) {
        setIsProcessing(true);
      }
    });

    const unsubscribeComplete = realtime.on('voice:processing:complete', (data: any) => {
      if (data.sessionId === sessionId) {
        setIsProcessing(false);
      }
    });

    const unsubscribeError = realtime.on('voice:processing:error', (data: any) => {
      if (data.sessionId === sessionId) {
        setIsProcessing(false);
        setError(data.error);
      }
    });

    return () => {
      unsubscribeStart();
      unsubscribeComplete();
      unsubscribeError();
      
      // Clean up media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // Clean up current audio
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    };
  }, [sessionId, currentAudio]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversation]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleVoiceQuery(audioBlob);
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceQuery = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      setError(null);

      const result = await api.processVoiceQuery(documentId, audioBlob, {
        sessionId,
        languageCode: 'en-US'
      });

      // Add user query to conversation
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: result.data.query.text,
        timestamp: new Date(),
        confidence: result.data.query.confidence
      };

      // Add assistant response to conversation
      const assistantMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: result.data.response.text,
        audioContent: result.data.audio.content,
        timestamp: new Date(),
        confidence: result.data.response.confidence,
        sources: result.data.response.sources,
        relatedClauses: result.data.response.relatedClauses
      };

      setConversation(prev => [...prev, userMessage, assistantMessage]);

      // Auto-play the response
      if (result.data.audio.content) {
        playAudio(assistantMessage.id, result.data.audio.content);
      }

    } catch (error) {
      console.error('Voice query failed:', error);
      setError(error instanceof Error ? error.message : 'Voice query failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextQuery = async () => {
    if (!textQuery.trim()) return;

    try {
      setIsProcessing(true);
      setError(null);

      const result = await api.queryDocument(documentId, textQuery, sessionId);

      // Add user query to conversation
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: textQuery,
        timestamp: new Date()
      };

      // Add assistant response to conversation
      const assistantMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: result.data.response.answer,
        timestamp: new Date(),
        confidence: result.data.response.confidence,
        sources: result.data.response.sources,
        relatedClauses: result.data.response.relatedClauses
      };

      setConversation(prev => [...prev, userMessage, assistantMessage]);
      setTextQuery('');

      // Generate audio for the response
      try {
        const audioResult = await api.synthesizeSpeech(result.data.response.answer);
        assistantMessage.audioContent = audioResult.data.audio.content;
        setConversation(prev => prev.map(msg => 
          msg.id === assistantMessage.id ? assistantMessage : msg
        ));
      } catch (audioError) {
        console.warn('Audio synthesis failed:', audioError);
      }

    } catch (error) {
      console.error('Text query failed:', error);
      setError(error instanceof Error ? error.message : 'Query failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (messageId: string, base64Audio: string) => {
    try {
      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
        setPlayingMessageId(null);
      }

      const audio = createAudioFromBase64(base64Audio);
      
      audio.onplay = () => setPlayingMessageId(messageId);
      audio.onended = () => {
        setPlayingMessageId(null);
        setCurrentAudio(null);
      };
      audio.onerror = () => {
        setPlayingMessageId(null);
        setCurrentAudio(null);
        setError('Failed to play audio');
      };

      setCurrentAudio(audio);
      audio.play();
      
    } catch (error) {
      console.error('Audio playback failed:', error);
      setError('Failed to play audio');
    }
  };

  const pauseAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setPlayingMessageId(null);
      setCurrentAudio(null);
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setError(null);
    
    // Clear backend conversation history
    api.clearConversationHistory(sessionId).catch(console.error);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextQuery();
    }
  };

  return (
    <div className={`${className}`}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-16 xl:inset-24 z-50">
        <Card className="h-full flex flex-col glass">
          {/* Header */}
          <CardHeader className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Voice Assistant
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={clearConversation}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Conversation Area */}
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              {conversation.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div className="space-y-3">
                    <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center">
                      <Bot className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        Ask me anything about your document
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        Use voice or text to get instant answers with citations
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>Try asking:</p>
                      <p>"What's my security deposit?"</p>
                      <p>"When can I terminate this lease?"</p>
                      <p>"What are the payment terms?"</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversation.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.type === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                      
                      <div className={`max-w-[80%] space-y-2 ${message.type === 'user' ? 'order-1' : ''}`}>
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            message.type === 'user'
                              ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          
                          {message.confidence !== undefined && (
                            <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
                              <span>Confidence:</span>
                              <Progress 
                                value={message.confidence * 100} 
                                className="w-12 h-1" 
                              />
                              <span>{Math.round(message.confidence * 100)}%</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{formatTime(message.timestamp)}</span>
                          
                          {message.audioContent && (
                            <Button
                              onClick={() => 
                                playingMessageId === message.id 
                                  ? pauseAudio() 
                                  : playAudio(message.id, message.audioContent!)
                              }
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 rounded-full"
                            >
                              {playingMessageId === message.id ? (
                                <Pause className="h-3 w-3" />
                              ) : (
                                <Volume2 className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          
                          {message.relatedClauses && message.relatedClauses.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {message.relatedClauses.length} clauses referenced
                            </Badge>
                          )}
                        </div>
                        
                        {message.sources && message.sources.length > 0 && (
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium">Sources:</span>{' '}
                            {message.sources.map((source, idx) => (
                              <span key={idx} className="inline-block mr-2">
                                {source.reference}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {message.type === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isProcessing && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            Processing your request...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Error Alert */}
            {error && (
              <Alert className="m-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <AlertDescription className="text-red-600 dark:text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Input Area */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your question or use voice..."
                    disabled={isProcessing}
                    className="rounded-full"
                  />
                  
                  <Button
                    onClick={handleTextQuery}
                    disabled={!textQuery.trim() || isProcessing}
                    size="sm"
                    className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex-shrink-0">
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    size="sm"
                    variant={isRecording ? "destructive" : "outline"}
                    className={`rounded-full ${isRecording ? 'animate-pulse' : ''}`}
                  >
                    {isRecording ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="text-xs text-slate-500 mt-2 text-center">
                {isRecording ? (
                  <span className="text-red-600">🔴 Recording... Click to stop</span>
                ) : isProcessing ? (
                  <span>Processing your query...</span>
                ) : (
                  <span>Press Enter to send • Click mic to record voice</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
