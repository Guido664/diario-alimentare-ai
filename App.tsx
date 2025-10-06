import React, { useState, useEffect } from 'react';
import DateNavigator from './components/DateNavigator';
import DailyLog from './components/DailyLog';
import AnalysisView from './components/AnalysisView';
import UserProfileModal from './components/UserProfileModal';
import { UserIcon } from './components/IconComponents';
import type { DailyEntry, ViewMode, UserProfile } from './types';
import useLocalStorage from './hooks/useLocalStorage';

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const NavButton: React.FC<{
    mode: ViewMode;
    currentViewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    children: React.ReactNode;
}> = ({ mode, children, currentViewMode, setViewMode }) => (
    <button
        onClick={() => setViewMode(mode)}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            currentViewMode === mode
            ? 'bg-indigo-600 text-white shadow'
            : 'text-gray-600 hover:bg-indigo-100'
        }`}
    >
        {children}
    </button>
);


const Header: React.FC<{ 
    viewMode: ViewMode, 
    setViewMode: (mode: ViewMode) => void,
    onProfileClick: () => void,
}> = ({ viewMode, setViewMode, onProfileClick }) => {
    return (
        <header className="bg-white shadow-sm rounded-xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                        Diario Alimentare AI
                    </h1>
                     <button 
                        onClick={onProfileClick} 
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Apri profilo utente"
                    >
                        <UserIcon />
                    </button>
                </div>
                <nav className="flex items-center bg-gray-100 p-1 rounded-lg space-x-1">
                    <NavButton mode="daily" currentViewMode={viewMode} setViewMode={setViewMode}>Giornaliero</NavButton>
                    <NavButton mode="weekly" currentViewMode={viewMode} setViewMode={setViewMode}>Settimanale</NavButton>
                    <NavButton mode="monthly" currentViewMode={viewMode} setViewMode={setViewMode}>Mensile</NavButton>
                    <NavButton mode="annual" currentViewMode={viewMode} setViewMode={setViewMode}>Annuale</NavButton>
                </nav>
            </div>
        </header>
    );
};


function App() {
  const [entries, setEntries] = useLocalStorage<DailyEntry[]>('food-diary-entries', []);
  const [userProfile, setUserProfile] = useLocalStorage<UserProfile>('food-diary-profile', {});
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const formattedDate = formatDate(currentDate);
  const currentEntry = entries.find(entry => entry.date === formattedDate);

  const handleSaveEntry = (entryToSave: DailyEntry) => {
    // In accordo con il nuovo approccio, l'analisi viene rimossa prima del salvataggio.
    // Questo previene problemi di persistenza e risolve il bug della cancellazione.
    const { analysis, ...entryForStorage } = entryToSave;

    setEntries(prevEntries => {
      let entryFound = false;
      const newEntries = prevEntries.map(entry => {
        if (entry.date === entryForStorage.date) {
          entryFound = true;
          return entryForStorage; // Sostituisci con la nuova registrazione (senza analisi)
        }
        return entry;
      });

      if (!entryFound) {
        newEntries.push(entryForStorage);
      }

      return newEntries.sort((a, b) => a.date.localeCompare(b.date));
    });
    setIsDirty(false);
  };

  const handleSaveProfile = (profileToSave: UserProfile) => {
    setUserProfile(profileToSave);
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleSetViewMode = (mode: ViewMode) => {
    if (viewMode === mode) return;
    const navigate = () => {
        setViewMode(mode);
        if (mode !== 'daily') setIsDirty(false);
    };
    if (isDirty && viewMode === 'daily') {
        if (window.confirm("Hai delle modifiche non salvate. Sei sicuro di voler cambiare vista? Le modifiche andranno perse.")) navigate();
    } else {
        navigate();
    }
  };

  const handleSetCurrentDate = (date: Date) => {
    if (isDirty && viewMode === 'daily') {
         if (window.confirm("Hai delle modifiche non salvate. Sei sicuro di voler cambiare data? Le modifiche andranno perse.")) {
             setIsDirty(false);
             setCurrentDate(date);
         }
    } else {
        setCurrentDate(date);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <Header 
            viewMode={viewMode} 
            setViewMode={handleSetViewMode} 
            onProfileClick={() => setIsProfileModalOpen(true)}
        />

        {isProfileModalOpen && (
            <UserProfileModal
                profile={userProfile}
                onSave={handleSaveProfile}
                onClose={() => setIsProfileModalOpen(false)}
            />
        )}

        {viewMode !== 'daily' && (
             <div className="flex items-center justify-center bg-white p-3 rounded-xl shadow-sm mb-6">
                 <p className="text-gray-700">L'analisi {viewMode} si basa sulla data selezionata.</p>
             </div>
        )}
        
        <DateNavigator currentDate={currentDate} setCurrentDate={handleSetCurrentDate} />

        <main>
          {viewMode === 'daily' ? (
            <DailyLog
              entry={currentEntry}
              date={formattedDate}
              onSave={handleSaveEntry}
              userProfile={userProfile}
              onDirtyStateChange={setIsDirty}
            />
          ) : (
            <AnalysisView 
                entries={entries} 
                mode={viewMode} 
                currentDate={currentDate} 
                userProfile={userProfile}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;