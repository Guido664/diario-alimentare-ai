
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { DailyEntry, NutrientAnalysis, UserProfile } from '../types';
import { analyzeDailyMeals } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import NutrientChart from './NutrientChart';
import { SparklesIcon, FileTextIcon } from './IconComponents';

interface DailyLogProps {
  entry: DailyEntry | undefined;
  date: string; // YYYY-MM-DD
  onSave: (entry: DailyEntry) => void;
  userProfile: UserProfile;
  onDirtyStateChange: (isDirty: boolean) => void;
}

const Card: React.FC<{title: string, children: React.ReactNode, actions?: React.ReactNode}> = ({title, children, actions}) => (
    <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          {actions && <div>{actions}</div>}
        </div>
        {children}
    </div>
);

const DailyLog: React.FC<DailyLogProps> = ({ entry, date, onSave, userProfile, onDirtyStateChange }) => {
  const [meals, setMeals] = useState('');
  const [activity, setActivity] = useState('');
  const [isNonWorkingDay, setIsNonWorkingDay] = useState(false);
  const [analysis, setAnalysis] = useState<NutrientAnalysis | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDirtyRef = useRef(false);
  // Fix: Initialize useRef with an explicit undefined value to resolve the "Expected 1 arguments, but got 0" error.
  const previousDateRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Se la data è cambiata, siamo in un nuovo giorno.
    // Resettiamo lo stato transiente come l'analisi.
    if (previousDateRef.current !== date) {
      setAnalysis(undefined);
      setError(null);
    }
    
    // Sincronizziamo sempre lo stato persistente dalla prop 'entry'.
    // Questo gestisce sia il caricamento per un nuovo giorno sia l'aggiornamento dopo un salvataggio.
    setMeals(entry?.meals || '');
    setActivity(entry?.activity || '');
    setIsNonWorkingDay(entry?.isNonWorkingDay || false);

    // Aggiorniamo il riferimento alla data corrente per il prossimo render.
    previousDateRef.current = date;
  }, [entry, date]);

  useEffect(() => {
    const hasChanges =
      meals !== (entry?.meals || '') ||
      activity !== (entry?.activity || '') ||
      isNonWorkingDay !== (entry?.isNonWorkingDay || false);
    
    if (hasChanges !== isDirtyRef.current) {
        isDirtyRef.current = hasChanges;
        onDirtyStateChange(hasChanges);
    }
  }, [meals, activity, isNonWorkingDay, entry, onDirtyStateChange]);

  useEffect(() => {
    if (analysis) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [analysis]);

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentEntryData: DailyEntry = { date, meals, activity, isNonWorkingDay };
      
      // 1. Salva i dati persistenti. Questo aggiorna anche lo stato dirty.
      onSave(currentEntryData);
      
      // 2. Esegui l'analisi sui dati appena salvati.
      const result = await analyzeDailyMeals(currentEntryData, userProfile);
      
      // 3. Aggiorna lo stato locale e transiente per visualizzare l'analisi.
      setAnalysis(result);

    } catch (e: any) {
      setError(e.message || "Si è verificato un errore sconosciuto.");
    } finally {
      setIsLoading(false);
    }
  }, [meals, activity, date, onSave, userProfile, isNonWorkingDay]);

  const handleSave = () => {
    // Quando si salva, non includiamo l'analisi.
    onSave({ date, meals, activity, isNonWorkingDay });
  };

  const handleExport = () => {
    if (!analysis) return;

    const content = `
Analisi Nutrizionale del ${new Date(date + 'T00:00:00').toLocaleDateString('it-IT')}
=====================================================

Riepilogo AI:
-------------
${analysis.summary}

Dati Macronutrienti:
---------------------
- Calorie: ${analysis.calories.toFixed(0)} kcal
- Proteine: ${analysis.protein.toFixed(1)} g
- Carboidrati: ${analysis.carbs.toFixed(1)} g
- Grassi: ${analysis.fats.toFixed(1)} g

Micronutrienti Chiave:
----------------------
${analysis.micronutrients && analysis.micronutrients.length > 0 ? analysis.micronutrients.join(', ') : 'Nessun dato specifico.'}
`;

    const blob = new Blob([content.trim()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analisi_giornaliera_${date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {analysis && !isLoading && (
        <Card 
            title="Analisi Nutrizionale AI"
            actions={
              <button 
                  onClick={handleExport}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  title="Esporta Analisi"
                  aria-label="Esporta Analisi"
              >
                  <FileTextIcon className="w-5 h-5" />
              </button>
            }
        >
          <p className="text-gray-700 mb-4">{analysis.summary}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Calorie</p>
              <p className="text-2xl font-bold text-indigo-700">{analysis.calories.toFixed(0)}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Proteine</p>
              <p className="text-2xl font-bold text-green-700">{analysis.protein.toFixed(1)}g</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Carboidrati</p>
              <p className="text-2xl font-bold text-yellow-700">{analysis.carbs.toFixed(1)}g</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Grassi</p>
              <p className="text-2xl font-bold text-red-700">{analysis.fats.toFixed(1)}g</p>
            </div>
          </div>
          <NutrientChart analysis={analysis} />
          {analysis.micronutrients && analysis.micronutrients.length > 0 && (
            <div className="mt-6">
                <h4 className="font-semibold text-gray-700 mb-2">Micronutrienti chiave:</h4>
                <div className="flex flex-wrap gap-2">
                {analysis.micronutrients.map((nutrient, index) => (
                    <span key={index} className="bg-gray-200 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">{nutrient}</span>
                ))}
                </div>
            </div>
          )}
        </Card>
      )}
      
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isNonWorkingDay"
              checked={isNonWorkingDay}
              onChange={(e) => setIsNonWorkingDay(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="isNonWorkingDay" className="text-gray-700 font-medium select-none cursor-pointer">
              Giornata non lavorativa (weekend, festa, etc.)
            </label>
          </div>
      </div>

      <Card title="Pasti della giornata">
        <textarea
          value={meals}
          onChange={(e) => setMeals(e.target.value)}
          placeholder="Es: Colazione: yogurt greco e frutta. Pranzo: riso con pollo e verdure..."
          className="w-full h-96 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
        />
      </Card>

      <Card title="Attività Fisica">
        <textarea
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          placeholder="Es: 30 minuti di camminata veloce, 1 ora di palestra..."
          className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
        />
      </Card>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full sm:w-auto flex-grow px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors duration-200 disabled:opacity-50"
        >
            Salva Modifiche
        </button>
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !meals.trim()}
          className="w-full sm:w-auto flex-grow flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:bg-indigo-300 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            'Analizzando...'
          ) : (
            <>
                <SparklesIcon className="w-5 h-5 mr-2" />
                Salva e Analizza Nutrienti
            </>
          )}
        </button>
      </div>


      {isLoading && <LoadingSpinner />}
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">{error}</div>}

    </div>
  );
};

export default DailyLog;
