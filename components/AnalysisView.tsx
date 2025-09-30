
import React, { useState, useEffect, useCallback } from 'react';
import type { DailyEntry, UserProfile } from '../types';
import { generatePeriodAnalysis } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { FileTextIcon } from './IconComponents';

interface AnalysisViewProps {
  entries: DailyEntry[];
  mode: 'weekly' | 'monthly' | 'annual';
  currentDate: Date;
  userProfile: UserProfile;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ entries, mode, currentDate, userProfile }) => {
  const [analysis, setAnalysis] = useState<string>('');
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
        setAnalysis(prev => prev); // Ensure state update for empty analysis
        return;
      }

      setIsLoading(true);
      setError(null);
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
    if (!analysis || isLoading || error) return;

    const periodMap = {
        weekly: 'settimanale',
        monthly: 'mensile',
        annual: 'annuale'
    };

    const fileName = `analisi_${periodMap[mode]}_${currentDate.toISOString().split('T')[0]}.txt`;

    const blob = new Blob([analysis], { type: 'text/plain;charset=utf-8' });
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
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">{getPeriodTitle()}</h2>
        {!isLoading && !error && analysis && getFilteredEntries().length > 0 && (
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
      ) : (
        <div className="prose prose-indigo max-w-none text-gray-700 whitespace-pre-wrap">
            {analysis.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
            ))}
        </div>
      )}
    </div>
  );
};

export default AnalysisView;