import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, Image, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api, realtime } from '@/lib/api';

interface DocumentUploadProps {
  onUploadComplete?: (result: any) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  className?: string;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: any;
  error?: string;
}

export default function DocumentUpload({ 
  onUploadComplete, 
  onUploadError,
  maxFiles = 5,
  className = ''
}: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [supportedTypes, setSupportedTypes] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load supported file types on mount
  useEffect(() => {
    api.getSupportedTypes().then(setSupportedTypes).catch(console.error);
  }, []);

  // Set up real-time event listeners
  useEffect(() => {
    const unsubscribeProcessingStart = realtime.on('document:processing:start', (data: any) => {
      setFiles(prev => prev.map(f => 
        f.file.name === data.fileName 
          ? { ...f, status: 'processing', progress: 0 }
          : f
      ));
    });

    const unsubscribeProcessingComplete = realtime.on('document:processing:complete', (data: any) => {
      setFiles(prev => prev.map(f => 
        f.file.name === data.fileName 
          ? { ...f, status: 'completed', progress: 100, result: data }
          : f
      ));
      if (onUploadComplete) {
        onUploadComplete(data);
      }
    });

    const unsubscribeProcessingError = realtime.on('document:processing:error', (data: any) => {
      setFiles(prev => prev.map(f => 
        f.file.name === data.fileName 
          ? { ...f, status: 'error', error: data.error }
          : f
      ));
      if (onUploadError) {
        onUploadError(data.error);
      }
    });

    return () => {
      unsubscribeProcessingStart();
      unsubscribeProcessingComplete();
      unsubscribeProcessingError();
    };
  }, [onUploadComplete, onUploadError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFiles = useCallback((fileList: File[]) => {
    const newFiles: UploadFile[] = fileList
      .slice(0, maxFiles - files.length)
      .map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending' as const,
        progress: 0
      }));

    setFiles(prev => [...prev, ...newFiles]);

    // Start uploading each file
    newFiles.forEach(uploadFile => {
      handleSingleUpload(uploadFile);
    });
  }, [files.length, maxFiles]);

  const handleSingleUpload = async (uploadFile: UploadFile) => {
    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 20 }
          : f
      ));

      // Subscribe to real-time updates for this document
      realtime.subscribeToDocument(uploadFile.id);

      // Upload the document
      const result = await api.uploadDocument(uploadFile.file, {
        extractText: true,
        generatePreview: true
      });

      // Update with upload complete
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'processing', progress: 50, result }
          : f
      ));

    } catch (error) {
      console.error('Upload failed:', error);
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
          : f
      ));
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-blue-500" />;
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return 'Waiting to upload...';
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing with AI...';
      case 'completed':
        return 'Ready for analysis';
      case 'error':
        return 'Upload failed';
      default:
        return '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <div
        className={`relative rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-slate-200 bg-white/40 dark:border-slate-700 dark:bg-slate-800/40'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={supportedTypes?.documents ? Object.values(supportedTypes.documents).flatMap((type: any) => type.mimeTypes).join(',') : '*'}
          onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/20">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Upload Legal Documents
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Drag and drop files here, or click to browse
            </p>
          </div>
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="shine rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-2"
          >
            Choose Files
          </Button>
          
          {supportedTypes && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Supports: PDF, Word, Images, Text • Max {supportedTypes.limits?.maxFileSize || '50MB'} per file
            </div>
          )}
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-900 dark:text-white">
            Uploaded Files ({files.length})
          </h4>
          
          <div className="space-y-3">
            {files.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="glass rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(uploadFile.file)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {uploadFile.file.name}
                      </p>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(uploadFile.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadFile.id)}
                          className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatFileSize(uploadFile.file.size)}
                      </p>
                      <span className="text-xs text-slate-400">•</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {getStatusText(uploadFile.status)}
                      </p>
                    </div>
                    
                    {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                      <Progress 
                        value={uploadFile.progress} 
                        className="mt-2 h-1"
                      />
                    )}
                    
                    {uploadFile.error && (
                      <Alert className="mt-2 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs text-red-600 dark:text-red-400">
                          {uploadFile.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Limits Info */}
      {files.length >= maxFiles && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-orange-600 dark:text-orange-400">
            Maximum {maxFiles} files can be uploaded at once.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
