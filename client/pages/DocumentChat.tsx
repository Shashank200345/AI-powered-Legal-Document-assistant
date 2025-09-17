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
  MoreVertical
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

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  documentId?: string;
  relatedClauses?: any[];
  isTyping?: boolean;
}

interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  progress: number;
  uploadedAt: Date;
}

export default function DocumentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      type: 'assistant',
      content: "Hi there! I'm your virtual legal assistant. Upload a document to get started, and I'll help you understand its contents, identify key clauses, and answer any questions you might have.",
      timestamp: new Date()
    }]);
  }, []);

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
    
    const file = files[0]; // For now, handle one file at a time
    const documentId = Math.random().toString(36).substr(2, 9);
    
    const newDocument: UploadedDocument = {
      id: documentId,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'uploading',
      progress: 0,
      uploadedAt: new Date()
    };

    setUploadedDocuments(prev => [...prev, newDocument]);
    setIsUploading(true);

    // Add system message about upload
    const systemMessage: Message = {
      id: Date.now().toString(),
      type: 'system',
      content: `Uploading "${file.name}"...`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, systemMessage]);

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setUploadedDocuments(prev => 
          prev.map(doc => 
            doc.id === documentId 
              ? { ...doc, progress: i, status: i === 100 ? 'processing' : 'uploading' }
              : doc
          )
        );
      }

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUploadedDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, status: 'ready', progress: 100 }
            : doc
        )
      );

      setCurrentDocumentId(documentId);

      // Add assistant response
      const assistantMessage: Message = {
        id: Date.now().toString() + '_response',
        type: 'assistant',
        content: `Great! I've successfully processed "${file.name}". This appears to be a legal document with several key clauses. I can help you:\n\n• Understand complex legal language\n• Identify important terms and conditions\n• Explain your rights and obligations\n• Highlight potential risks or concerns\n\nWhat would you like to know about this document?`,
        timestamp: new Date(),
        documentId
      };

      setMessages(prev => [...prev.slice(0, -1), assistantMessage]); // Remove upload message, add response

    } catch (error) {
      setUploadedDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, status: 'error' }
            : doc
        )
      );

      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        type: 'system',
        content: `Failed to upload "${file.name}". Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      documentId: currentDocumentId || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Show typing indicator
    const typingMessage: Message = {
      id: 'typing',
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500));

    const assistantMessage: Message = {
      id: Date.now().toString() + '_ai',
      type: 'assistant',
      content: generateAIResponse(inputMessage),
      timestamp: new Date(),
      documentId: currentDocumentId || undefined
    };

    setMessages(prev => [...prev.slice(0, -1), assistantMessage]); // Remove typing indicator
  };

  const generateAIResponse = (question: string): string => {
    // Simple response generation based on keywords
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('clause') || lowerQuestion.includes('term')) {
      return "I can see you're asking about specific clauses. Based on the document analysis, there are several important terms to be aware of:\n\n• **Confidentiality Clause**: This restricts sharing of information\n• **Termination Terms**: Outlines how the agreement can be ended\n• **Payment Obligations**: Specifies financial responsibilities\n\nWould you like me to explain any of these in more detail?";
    }
    
    if (lowerQuestion.includes('risk') || lowerQuestion.includes('concern')) {
      return "I've identified a few areas that might need your attention:\n\n🔴 **High Risk**: The termination clause allows the other party to end the agreement with minimal notice\n🟡 **Medium Risk**: Some payment terms are vague and could lead to disputes\n🟢 **Low Risk**: Standard confidentiality provisions\n\nWould you like me to suggest specific revisions for any of these areas?";
    }
    
    if (lowerQuestion.includes('summary') || lowerQuestion.includes('overview')) {
      return "Here's a quick overview of your document:\n\n**Document Type**: Non-Disclosure Agreement\n**Key Parties**: Your company and the disclosing party\n**Duration**: 5 years from signing\n**Main Purpose**: Protect confidential information shared during business discussions\n\n**Key Obligations**:\n• Keep all shared information confidential\n• Use information only for evaluation purposes\n• Return or destroy information upon request\n\nIs there a specific section you'd like me to dive deeper into?";
    }
    
    return "I understand you're asking about the document. Based on my analysis, I can provide detailed explanations about any clauses, identify potential risks, or help you understand your rights and obligations. Could you be more specific about what aspect of the document you'd like to explore?";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const removeDocument = (documentId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== documentId));
    if (currentDocumentId === documentId) {
      setCurrentDocumentId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(59,130,246,0.15),transparent_60%)] pt-24 pb-8">
      <div className="pointer-events-none fixed inset-0 bg-grid" />
      
      <div className="container mx-auto px-4 h-[calc(100vh-8rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          
          {/* Sidebar - Document Upload and Management */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Upload Area */}
            <Card className="glass">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`relative rounded-xl border-2 border-dashed p-4 text-center transition-all duration-200 cursor-pointer ${
                    dragActive
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple={false}
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
                    className="hidden"
                  />
                  
                  <div className="space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Upload Document</p>
                      <p className="text-xs text-muted-foreground">
                        PDF, Word, or Text files
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Uploaded Documents */}
            {uploadedDocuments.length > 0 && (
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Uploaded Files</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {uploadedDocuments.map((doc) => (
                    <div key={doc.id} className="rounded-lg border bg-card/50 p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(doc.size)}
                            </span>
                            <Badge 
                              variant={doc.status === 'ready' ? 'default' : doc.status === 'error' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {doc.status === 'ready' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {doc.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                              {(doc.status === 'uploading' || doc.status === 'processing') && <Clock className="h-3 w-3 mr-1" />}
                              {doc.status}
                            </Badge>
                          </div>
                          {(doc.status === 'uploading' || doc.status === 'processing') && (
                            <Progress value={doc.progress} className="mt-2 h-1" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(doc.id)}
                          className="h-6 w-6 p-0 hover:bg-destructive/20"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            {currentDocumentId && (
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Summarize Document
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Identify Risks
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Key Clauses
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Export Analysis
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3 flex flex-col">
            <Card className="glass flex-1 flex flex-col">
              <CardHeader className="border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    Legal AI Assistant
                    {currentDocumentId && (
                      <Badge variant="secondary" className="ml-2">
                        Document Loaded
                      </Badge>
                    )}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Export Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Conversation
                      </DropdownMenuItem>
                      <Separator className="my-1" />
                      <DropdownMenuItem className="text-destructive">
                        <X className="h-4 w-4 mr-2" />
                        Clear Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${
                        message.type === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        message.type === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : message.type === 'system'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {message.type === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : message.type === 'system' ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      
                      <div className={`flex-1 space-y-1 ${
                        message.type === 'user' ? 'text-right' : ''
                      }`}>
                        <div className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : message.type === 'system'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}>
                          {message.isTyping ? (
                            <div className="flex items-center space-x-1">
                              <div className="flex space-x-1">
                                <div className="h-2 w-2 bg-current rounded-full animate-bounce"></div>
                                <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>
                        <p className={`text-xs text-muted-foreground ${
                          message.type === 'user' ? 'text-right' : ''
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t border-border/50 p-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={currentDocumentId ? "Ask me anything about your document..." : "Upload a document to start chatting..."}
                      className="resize-none pr-12 min-h-[44px] max-h-32"
                      disabled={!currentDocumentId}
                      rows={1}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setIsRecording(!isRecording)}
                        disabled={!currentDocumentId}
                      >
                        {isRecording ? (
                          <MicOff className="h-4 w-4 text-destructive" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || !currentDocumentId}
                    className="h-11 w-11 p-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                  {!currentDocumentId && (
                    <span className="text-orange-500">Upload a document to enable chat</span>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
