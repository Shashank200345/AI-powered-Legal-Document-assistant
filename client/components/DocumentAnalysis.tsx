import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  FileText, 
  Clock, 
  DollarSign, 
  Users,
  Download,
  MessageSquare,
  Mic,
  Volume2,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { api, realtime, createAudioFromBase64, downloadFile } from '@/lib/api';
import VoiceQuery from './VoiceQuery';

interface DocumentAnalysisProps {
  documentId: string;
  initialData?: any;
  className?: string;
}

export default function DocumentAnalysis({ documentId, initialData, className = '' }: DocumentAnalysisProps) {
  const [analysis, setAnalysis] = useState<any>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [showVoiceQuery, setShowVoiceQuery] = useState(false);

  useEffect(() => {
    if (!initialData) {
      loadAnalysis();
    }

    // Subscribe to analysis updates
    realtime.subscribeToAnalysis(documentId);

    const unsubscribe = realtime.on('analysis:complete', (data: any) => {
      if (data.documentId === documentId) {
        setAnalysis(data.analysis);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [documentId, initialData]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const result = await api.getAnalysis(documentId);
      setAnalysis(result.data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-800';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Shield className="h-4 w-4" />;
      case 'low':
        return <Shield className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const toggleClause = (clauseType: string) => {
    const newExpanded = new Set(expandedClauses);
    if (newExpanded.has(clauseType)) {
      newExpanded.delete(clauseType);
    } else {
      newExpanded.add(clauseType);
    }
    setExpandedClauses(newExpanded);
  };

  const handleExport = async () => {
    try {
      const exportData = await api.exportAnalysis(documentId, 'json');
      downloadFile(
        exportData, 
        `analysis-${documentId}-${new Date().toISOString().split('T')[0]}.json`,
        'application/json'
      );
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const playAISummary = async () => {
    if (!analysis?.aiSummary?.overview) return;
    
    try {
      const result = await api.synthesizeSpeech(analysis.aiSummary.overview);
      const audio = createAudioFromBase64(result.data.audio.content);
      audio.play();
    } catch (error) {
      console.error('Speech synthesis failed:', error);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="glass rounded-3xl p-8 text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Analyzing Document...
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Our AI is processing your document. This may take a few moments.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Analysis Error</span>
            </div>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button 
              onClick={loadAnalysis}
              className="mt-4"
              variant="outline"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Summary Stats */}
      <div className="glass rounded-3xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Document Analysis
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {analysis.summary?.documentType || 'Legal Document'} • {analysis.summary?.wordCount || 0} words
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={playAISummary}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Volume2 className="h-4 w-4 mr-1" />
              Listen
            </Button>
            <Button
              onClick={() => setShowVoiceQuery(true)}
              className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600"
              size="sm"
            >
              <Mic className="h-4 w-4 mr-1" />
              Ask Question
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Risk Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium border ${getRiskColor(analysis.summary?.overallRisk || 'unknown')}`}>
              {getRiskIcon(analysis.summary?.overallRisk || 'unknown')}
              Overall Risk: {analysis.summary?.overallRisk || 'Unknown'}
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {analysis.clauses?.length || 0}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Clauses Found</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {analysis.summary?.readingTime || 0}min
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Reading Time</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {Math.round((analysis.confidence || 0) * 100)}%
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Confidence</p>
          </div>
        </div>

        {/* Key Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">Key Parties</span>
            </div>
            <div className="space-y-1">
              {analysis.summary?.keyParties?.length ? 
                analysis.summary.keyParties.slice(0, 3).map((party: string, idx: number) => (
                  <p key={idx} className="text-sm text-slate-600 dark:text-slate-300">{party}</p>
                )) : 
                <p className="text-sm text-slate-400">Not identified</p>
              }
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">Important Dates</span>
            </div>
            <div className="space-y-1">
              {analysis.summary?.importantDates?.length ?
                analysis.summary.importantDates.slice(0, 3).map((date: string, idx: number) => (
                  <p key={idx} className="text-sm text-slate-600 dark:text-slate-300">{date}</p>
                )) :
                <p className="text-sm text-slate-400">No dates found</p>
              }
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">Monetary Amounts</span>
            </div>
            <div className="space-y-1">
              {analysis.summary?.monetaryAmounts?.length ?
                analysis.summary.monetaryAmounts.slice(0, 3).map((amount: string, idx: number) => (
                  <p key={idx} className="text-sm text-slate-600 dark:text-slate-300">{amount}</p>
                )) :
                <p className="text-sm text-slate-400">No amounts found</p>
              }
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {analysis.aiSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typeof analysis.aiSummary === 'string' ? (
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {analysis.aiSummary}
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Overview</h4>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {analysis.aiSummary.overview}
                  </p>
                </div>
                {analysis.aiSummary.keyParties && (
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Key Parties</h4>
                    <p className="text-slate-700 dark:text-slate-300">{analysis.aiSummary.keyParties}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Clauses Analysis */}
      {analysis.clauses && analysis.clauses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Clause Analysis ({analysis.clauses.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.clauses.map((clause: any, index: number) => (
              <Collapsible key={clause.type || index}>
                <CollapsibleTrigger
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  onClick={() => toggleClause(clause.type)}
                >
                  <div className="flex items-center gap-3">
                    {getRiskIcon(clause.riskLevel)}
                    <div className="text-left">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {clause.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${getRiskColor(clause.riskLevel)} text-xs`}>
                          {clause.riskLevel} risk
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {clause.matches} matches found
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {expandedClauses.has(clause.type) ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </CollapsibleTrigger>
                
                <CollapsibleContent className="px-4 pb-4">
                  <Separator className="mb-4" />
                  
                  <div className="space-y-4">
                    {clause.summary && (
                      <div>
                        <h5 className="font-semibold text-sm text-slate-900 dark:text-white mb-2">
                          Summary
                        </h5>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {clause.summary}
                        </p>
                      </div>
                    )}
                    
                    {clause.plainLanguage && (
                      <div>
                        <h5 className="font-semibold text-sm text-slate-900 dark:text-white mb-2">
                          Plain English
                        </h5>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {clause.plainLanguage}
                        </p>
                      </div>
                    )}
                    
                    {clause.recommendations && clause.recommendations.length > 0 && (
                      <div>
                        <h5 className="font-semibold text-sm text-slate-900 dark:text-white mb-2">
                          Recommendations
                        </h5>
                        <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                          {clause.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risk Assessment */}
      {analysis.riskAssessment && analysis.riskAssessment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.riskAssessment.map((risk: any, index: number) => (
              <div key={index} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${getRiskColor(risk.level).replace('text-', 'bg-').replace('bg-', 'bg-').split(' ')[0]}`}>
                    {getRiskIcon(risk.level)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {risk.category} Risk
                      </h4>
                      <Badge className={getRiskColor(risk.level)}>
                        {risk.level}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                      {risk.description}
                    </p>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-slate-500">Risk Score:</span>
                      <Progress value={risk.score * 100} className="w-20 h-2" />
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {Math.round(risk.score * 100)}%
                      </span>
                    </div>
                    
                    {risk.details && risk.details.length > 0 && (
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        <strong>Details:</strong> {risk.details.join(', ')}
                      </div>
                    )}
                    
                    {risk.impact && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        <strong>Impact:</strong> {risk.impact}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.recommendations.map((recommendation: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1 text-sm">•</span>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {recommendation}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Voice Query Modal */}
      {showVoiceQuery && (
        <VoiceQuery
          documentId={documentId}
          onClose={() => setShowVoiceQuery(false)}
          className="fixed inset-0 z-50"
        />
      )}
    </div>
  );
}
