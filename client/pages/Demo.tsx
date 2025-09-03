import { useState } from 'react';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentAnalysis from '@/components/DocumentAnalysis';
import { api } from '@/lib/api';

export default function Demo() {
  const [uploadedDocument, setUploadedDocument] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = async (result: any) => {
    try {
      setUploadedDocument(result);
      setIsAnalyzing(true);
      setError(null);
      
      // Start analysis
      const analysisResult = await api.analyzeDocument(
        result.documentId,
        result.extractedText || 'Sample legal text for analysis',
        {
          includeRiskAssessment: true,
          generatePlainLanguage: true,
          extractInsights: true
        }
      );
      
      setAnalysisData(analysisResult.data.analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUploadError = (error: string) => {
    setError(error);
  };

  const resetDemo = () => {
    setUploadedDocument(null);
    setAnalysisData(null);
    setIsAnalyzing(false);
    setError(null);
  };

  return (
    <main>
      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              Try LexiPlain Demo
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Upload a legal document and see instant AI analysis with risk highlights and plain language explanations.
            </p>
            
            {(uploadedDocument || analysisData) && (
              <div className="mt-6">
                <button
                  onClick={resetDemo}
                  className="rounded-full border border-slate-200/70 bg-white/40 px-6 py-2 text-sm font-semibold text-slate-800 backdrop-blur-md hover:bg-white/70 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/20"
                >
                  Upload New Document
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Demo Interface */}
      <section className="relative mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {!uploadedDocument && !analysisData ? (
            /* Upload Interface */
            <div className="mx-auto max-w-4xl">
              <DocumentUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxFiles={1}
              />
              
              {error && (
                <div className="mt-6 glass rounded-2xl p-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          ) : (
            /* Analysis Results */
            <div className="mx-auto max-w-6xl">
              {isAnalyzing ? (
                <div className="glass rounded-3xl p-12 text-center">
                  <div className="mx-auto mb-6 h-20 w-20 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Analyzing Your Document
                  </h3>
                  <p className="mt-3 text-slate-600 dark:text-slate-300">
                    Our AI is processing {uploadedDocument?.fileName || 'your document'} using advanced NLP and legal pattern recognition.
                  </p>
                  <div className="mt-6 space-y-2 text-sm text-slate-500">
                    <p>✓ Extracting text and structure</p>
                    <p>✓ Identifying legal clauses</p>
                    <p>✓ Assessing risk levels</p>
                    <p>✓ Generating plain language translations</p>
                    <p>🔄 Preparing voice query system</p>
                  </div>
                </div>
              ) : analysisData ? (
                <DocumentAnalysis
                  documentId={uploadedDocument.documentId}
                  initialData={analysisData}
                />
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* Demo Features */}
      {!uploadedDocument && !analysisData && (
        <section className="relative mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                What You'll Experience
              </h2>
              <p className="mt-3 text-slate-600 dark:text-slate-300">
                See how LexiPlain transforms complex legal documents into clear, actionable insights.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="glass rounded-3xl p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/20">
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Smart Document Processing
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Upload PDFs, images, or text. Our OCR and AI extract everything accurately.
                </p>
              </div>
              
              <div className="glass rounded-3xl p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/20">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Risk Analysis & Scoring
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Get color-coded risk levels and detailed explanations for every clause.
                </p>
              </div>
              
              <div className="glass rounded-3xl p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/20">
                  <span className="text-2xl">🎤</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Voice-Powered Queries
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Ask questions naturally and get instant audio responses with citations.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
