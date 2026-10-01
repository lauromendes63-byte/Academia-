import React, { useState, useEffect } from 'react';
import { initializeDatabase } from './db/db';
import { BottomNavBar, type TabType } from './components/BottomNavBar';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { NutritionScreen } from './screens/NutritionScreen';
import { EvolutionScreen } from './screens/EvolutionScreen';
import { SettingsScreen } from './screens/SettingsScreen';

import { db } from './db/db';
import { triggerHaptic } from './utils/audio';
import { CheckCircle2, X } from 'lucide-react';

const TAB_ORDER: TabType[] = ['treino', 'nutricao', 'evolucao', 'ajustes'];

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as TabType;
      if (tab && ['treino', 'nutricao', 'evolucao', 'ajustes'].includes(tab)) {
        return tab;
      }
    }
    return 'treino';
  });

  const [navDirection, setNavDirection] = useState<'forward' | 'backward'>('forward');
  const [quickNotification, setQuickNotification] = useState<string | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setIsDbReady(true))
      .catch((err) => {
        console.error('Falha ao inicializar o banco:', err);
        setIsDbReady(true);
      });
  }, []);

  // Handle Android Launcher Quick Actions (via PWA App Shortcuts)
  useEffect(() => {
    if (!isDbReady || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (!action) return;

    // Clean URL so refresh does not re-add
    const url = new URL(window.location.href);
    url.searchParams.delete('action');
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));

    const executeQuickAction = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      let log = await db.nutritionLogs.get(todayStr);
      if (!log) {
        log = {
          date: todayStr,
          tookWhey: false,
          wheyScoops: 0,
          milkGlasses: 0,
          meals: { breakfast: 'custom', lunch: '', snack: '', dinner: '' },
          waterMl: 0,
          escapes: { besteiraCount: 0, superBesteiraCount: 0 },
          breakfastEggCount: 2
        };
        await db.nutritionLogs.put(log);
      }

      if (action === 'quick_water') {
        const next = Math.max(0, Math.min(8000, (log.waterMl || 0) + 500));
        await db.nutritionLogs.update(todayStr, { waterMl: next });
        triggerHaptic('light');
        setQuickNotification(`💧 +500ml de água registrado (${(next / 1000).toFixed(1)}L total hoje)!`);
      } else if (action === 'quick_whey') {
        const next = Math.max(0, Math.min(6, (log.wheyScoops || 0) + 1));
        await db.nutritionLogs.update(todayStr, { wheyScoops: next, tookWhey: true });
        triggerHaptic('light');
        setQuickNotification(`⚡ +1 Scoop de Whey registrado (+95 kcal, +20g prot)!`);
      } else if (action === 'quick_milk') {
        const next = Math.max(0, Math.min(6, (log.milkGlasses || 0) + 1));
        await db.nutritionLogs.update(todayStr, { milkGlasses: next });
        triggerHaptic('light');
        setQuickNotification(`🥛 +1 Copo de Leite registrado (+110 kcal, +6g prot)!`);
      } else if (action === 'quick_escape') {
        const next = (log.escapes?.besteiraCount || 0) + 1;
        await db.nutritionLogs.update(todayStr, { 'escapes.besteiraCount': next });
        triggerHaptic('medium');
        setQuickNotification(`🍩 Escape registrado (+600 kcal adicionadas ao dia)!`);
      }

      setTimeout(() => {
        setQuickNotification((prev) => (prev ? null : prev));
      }, 3500);
    };

    executeQuickAction();
  }, [isDbReady]);

  // Smooth Tab Switcher (Uses Native View Transitions if supported, or CSS slide)
  const handleTabChange = (newTab: TabType) => {
    if (newTab === activeTab) return;
    const oldIdx = TAB_ORDER.indexOf(activeTab);
    const newIdx = TAB_ORDER.indexOf(newTab);
    const direction = newIdx >= oldIdx ? 'forward' : 'backward';
    setNavDirection(direction);

    if (
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      typeof (document as any).startViewTransition === 'function'
    ) {
      try {
        (document as any).startViewTransition({
          update: () => {
            setActiveTab(newTab);
          },
          types: [direction]
        });
        return;
      } catch {
        // Fallback to state update
      }
    }

    setActiveTab(newTab);
  };

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
      {/* Toast flutuante para atalhos rápidos do celular */}
      {quickNotification && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-3 left-4 right-4 z-50 max-w-md mx-auto p-3 rounded-2xl bg-slate-900/95 text-white backdrop-blur-md shadow-xl border border-slate-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </span>
            <span className="text-xs font-bold truncate leading-tight">
              {quickNotification}
            </span>
          </div>
          <button
            onClick={() => setQuickNotification(null)}
            className="w-6 h-6 rounded-lg text-slate-400 hover:text-white flex items-center justify-center shrink-0 active:scale-90"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      {/* Active Screen View with smooth GPU-accelerated transition */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        <div
          key={activeTab}
          className={navDirection === 'forward' ? 'animate-slide-forward' : 'animate-slide-backward'}
        >
          {activeTab === 'treino' && (
            <WorkoutScreen
              onGoToEvolution={() => handleTabChange('evolucao')}
            />
          )}
          {activeTab === 'nutricao' && <NutritionScreen />}
          {activeTab === 'evolucao' && <EvolutionScreen />}
          {activeTab === 'ajustes' && <SettingsScreen />}
        </div>
      </main>

      {/* Persistent Bottom Nav Bar (Thumb Zone) */}
      <BottomNavBar activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
