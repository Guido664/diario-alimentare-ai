import React, { useState, useEffect, useCallback } from 'react';
import type { DailyEntry, UserProfile, PeriodAnalysis } from '../types';
import { generatePeriodAnalysis } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { FileTextIcon, TrophyIcon, ArrowTrendingUpIcon, LightBulbIcon, ChatBubbleBottomCenterTextIcon, HeartIcon, SparklesIcon } from './IconComponents';

interface AnalysisViewProps {
  entries: DailyEntry[];
  mode: 'weekly' | 'monthly' | 'annual';
  currentDate: Date;
  userProfile: UserProfile;
}

const AnalysisSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  color: string;
}> = ({ title, icon, children, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border-l-4" style={{ borderColor: color }}>
    <div className="flex items-center mb-3">
      <div className={`mr-3 p-2 rounded-full`} style={{ backgroundColor: `${color}20` }}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-800">{title}</h3>
    </div>
    <div className="prose prose-indigo max-w-none text-gray-700">
      {typeof children === 'string' && children.split('\n').map((line, i) => (
        <p key={i} className="mb-2 last:mb-0">{line}</p>
      ))}
    </div>
  </div>
);

const AnalysisView: React.FC<AnalysisViewProps> = ({ entries, mode, currentDate, userProfile }) => {
  const [analysis, setAnalysis] = useState<PeriodAnalysis | string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFilteredEntries = useCallback(() => {
    const end = new Date(currentDate);
    end.setHours(23, 59, 59, 999);

    if (mode === 'weekly') {
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return entries.filter(e => new Date(e.date) >= start && new Date(e.date) <= end);
    }
    if (mode === 'monthly') {
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return entries.filter(e => new Date(e.date).getFullYear() === start.getFullYear() && new Date(e.date).getMonth() === start.getMonth());
    }
    if (mode === 'annual') {
        const start = new Date(end.getFullYear(), 0, 1);
        return entries.filter(e => new Date(e.date).getFullYear() === start.getFullYear());
    }
    return [];
  }, [entries, mode, currentDate]);

  useEffect(() => {
    const fetchAnalysis = async () => {
      const filteredEntries = getFilteredEntries();
      if (filteredEntries.length === 0) {
        setAnalysis("Nessun dato disponibile per questo periodo. Inizia a registrare i tuoi pasti per ottenere un'analisi.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setAnalysis(null);
      try {
        const periodMap = {
            weekly: 'settimanale',
            monthly: 'mensile',
            annual: 'annuale'
        };
        const result = await generatePeriodAnalysis(filteredEntries, periodMap[mode] as 'settimanale' | 'mensile' | 'annuale', userProfile);
        setAnalysis(result);
      } catch (e: any) {
        setError(e.message || "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [mode, getFilteredEntries, userProfile]);

  const getPeriodTitle = () => {
    switch(mode) {
        case 'weekly':
            const start = new Date(currentDate);
            start.setDate(start.getDate() - 6);
            return `Report Settimanale: ${start.toLocaleDateString('it-IT')} - ${currentDate.toLocaleDateString('it-IT')}`;
        case 'monthly':
            return `Report Mensile: ${currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`;
        case 'annual':
            return `Report Annuale: ${currentDate.getFullYear()}`;
    }
  }

  const handleExport = () => {
    if (!analysis || isLoading || error || typeof analysis !== 'object') return;

    const periodMap = {
        weekly: 'settimanale',
        monthly: 'mensile',
        annual: 'annuale'
    };

    const fileName = `analisi_${periodMap[mode]}_${currentDate.toISOString().split('T')[0]}.txt`;
    
    const content = `
Report ${periodMap[mode]} del periodo che termina il ${currentDate.toLocaleDateString('it-IT')}
========================================================================

Riepilogo Generale:
-------------------
${analysis.summary}

Punti di Forza:
---------------
${analysis.strengths}

Aree di Miglioramento:
-----------------------
${analysis.improvements}

Suggerimenti Pratici:
---------------------
${analysis.suggestions}

${analysis.micronutrientsAnalysis ? `
Analisi Micronutrienti:
------------------------
${analysis.micronutrientsAnalysis}
` : ''}

Nota Finale:
------------
${analysis.encouragement}
`;

    const blob = new Blob([content.trim()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{getPeriodTitle()}</h2>
        {!isLoading && !error && analysis && typeof analysis === 'object' && getFilteredEntries().length > 0 && (
             <button 
                onClick={handleExport}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                title="Esporta Report"
                aria-label="Esporta Report"
            >
                <FileTextIcon className="w-5 h-5" />
            </button>
        )}
      </div>
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
          {error}
        </div>
      ) : analysis ? (
        <>
          {typeof analysis === 'object' ? (
            <div>
              <AnalysisSection title="Riepilogo Generale" icon={<ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-blue-600" />} color="#3b82f6">
                {analysis.summary}
              </AnalysisSection>
              <AnalysisSection title="Punti di Forza" icon={<TrophyIcon className="w-6 h-6 text-green-600" />} color="#16a34a">
                {analysis.strengths}
              </AnalysisSection>
              <AnalysisSection title="Aree di Miglioramento" icon={<ArrowTrendingUpIcon className="w-6 h-6 text-amber-600" />} color="#d97706">
                {analysis.improvements}
              </AnalysisSection>
              <AnalysisSection title="Suggerimenti Pratici" icon={<LightBulbIcon className="w-6 h-6 text-violet-600" />} color="#7c3aed">
                {analysis.suggestions}
              </AnalysisSection>
              {analysis.micronutrientsAnalysis && (
                 <AnalysisSection title="Analisi Micronutrienti" icon={<SparklesIcon className="w-6 h-6 text-cyan-600" />} color="#0891b2">
                    {analysis.micronutrientsAnalysis}
                 </AnalysisSection>
              )}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl shadow-sm mt-6 text-center">
                <HeartIcon className="w-8 h-8 text-indigo-500 mx-auto mb-2"/>
                <p className="text-gray-700 font-medium">{analysis.encouragement}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <p className="text-gray-700">{analysis}</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default AnalysisView;