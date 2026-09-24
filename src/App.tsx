import React, { useState, useEffect } from 'react';
import { initializeDatabase } from './db/db';
import { RestTimerProvider } from './context/RestTimerContext';
import { BottomNavBar, type TabType } from './components/BottomNavBar';
import { RestTimerBar } from './components/RestTimerBar';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { NutritionScreen } from './screens/NutritionScreen';
import { EvolutionScreen } from './screens/EvolutionScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('treino');
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setIsDbReady(true))
      .catch((err) => {
        console.error('Falha ao inicializar o banco:', err);
        setIsDbReady(true);
      });
  }, []);

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/30 animate-pulse">
          A+
        </div>
        <div className="text-sm font-bold text-slate-700 mt-3">
          Inicializando Academia+...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100">
      {/* Active Screen View */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        {activeTab === 'treino' && (
          <WorkoutScreen onGoToEvolution={() => setActiveTab('evolucao')} />
        )}
        {activeTab === 'nutricao' && <NutritionScreen />}
        {activeTab === 'evolucao' && <EvolutionScreen />}
        {activeTab === 'ajustes' && <SettingsScreen />}
      </main>

      {/* Floating Global Rest Timer */}
      <RestTimerBar />

      {/* Persistent Bottom Nav Bar (Thumb Zone) */}
      <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default function App() {
  return (
    <RestTimerProvider>
      <AppContent />
    </RestTimerProvider>
  );
}
