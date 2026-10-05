import React, { useState, useEffect } from 'react';
import { initializeDatabase } from './db/db';
import { BottomNavBar, type TabType } from './components/BottomNavBar';
import { WorkoutScreen } from './screens/WorkoutScreen';
import { NutritionScreen } from './screens/NutritionScreen';
import { EvolutionScreen } from './screens/EvolutionScreen';
import { SettingsScreen } from './screens/SettingsScreen';

import { db } from './db/db';
import { triggerHaptic } from './utils/audio';
import { useAppUpdate } from './utils/appUpdate';
import { CheckCircle2, X, Sparkles, RefreshCw } from 'lucide-react';

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
  const [visitedTabs, setVisitedTabs] = useState<Record<TabType, boolean>>(() => ({
    treino: true,
    nutricao: activeTab === 'nutricao',
    evolucao: activeTab === 'evolucao',
    ajustes: activeTab === 'ajustes'
  }));
  const [quickNotification, setQuickNotification] = useState<string | null>(null);
  const [isDbReady, setIsDbReady] = useState(false);

  const {
    updateAvailable,
    remoteVersion,
    isUpdating,
    dismissed,
    checkForUpdate,
    applyUpdate,
    dismissBanner
  } = useAppUpdate();

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

  // Smooth Tab Switcher (Uses Native View Transitions + Keep-Alive tabs for 0ms lag)
  const handleTabChange = (newTab: TabType) => {
    if (newTab === activeTab) return;

    // Defer update check outside the 120fps animation frame
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => checkForUpdate(false), { timeout: 1500 });
    } else {
      setTimeout(() => checkForUpdate(false), 400);
    }

    const oldIdx = TAB_ORDER.indexOf(activeTab);
    const newIdx = TAB_ORDER.indexOf(newTab);
    const direction = newIdx >= oldIdx ? 'forward' : 'backward';
    setNavDirection(direction);

    const commitTabSwitch = () => {
      setVisitedTabs((prev) => (prev[newTab] ? prev : { ...prev, [newTab]: true }));
      setActiveTab(newTab);
    };

    if (
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      typeof (document as any).startViewTransition === 'function'
    ) {
      try {
        (document as any).startViewTransition({
          update: () => {
            commitTabSwitch();
          },
          types: [direction]
        });
        return;
      } catch {
        // Fallback to React transition
      }
    }

    React.startTransition(() => {
      commitTabSwitch();
    });
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

  const slideAnimClass =
    navDirection === 'forward' ? 'animate-slide-forward' : 'animate-slide-backward';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100">
      {/* Banner flutuante de Nova Versão Disponível (1 toque para atualizar) */}
      {updateAvailable && !dismissed && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-3 left-3 right-3 z-50 max-w-md mx-auto rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl shadow-blue-900/25 border border-blue-400/40 flex items-center justify-between gap-2 p-2.5 pl-3.5 animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <button
            type="button"
            onClick={applyUpdate}
            disabled={isUpdating}
            className="flex-1 flex items-center gap-2.5 text-left min-w-0 active:scale-[0.99] transition-transform cursor-pointer"
          >
            <span className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              {isUpdating ? (
                <RefreshCw className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight truncate">
                  {isUpdating ? 'Atualizando aplicativo...' : 'Nova versão disponível!'}
                </span>
                {remoteVersion && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-white/20 text-white shrink-0">
                    v{remoteVersion}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-blue-100 block truncate">
                {isUpdating
                  ? 'Aplicando melhorias, aguarde um instante...'
                  : 'Toque aqui para atualizar agora'}
              </span>
            </div>
            <span className="px-2.5 py-1.5 rounded-xl bg-white text-blue-700 font-black text-[11px] shrink-0 shadow-xs">
              {isUpdating ? '...' : 'Atualizar'}
            </span>
          </button>

          {!isUpdating && (
            <button
              type="button"
              onClick={dismissBanner}
              className="w-7 h-7 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 flex items-center justify-center shrink-0 active:scale-90 transition-[transform,color,background-color]"
              aria-label="Adiar atualização"
              title="Agora não"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </aside>
      )}

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

      {/* Active Screen View with Keep-Alive + GPU-accelerated transition */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        {visitedTabs.treino && (
          <section
            aria-hidden={activeTab !== 'treino'}
            className={activeTab === 'treino' ? `block ${slideAnimClass}` : 'hidden'}
          >
            <WorkoutScreen onGoToEvolution={() => handleTabChange('evolucao')} />
          </section>
        )}

        {visitedTabs.nutricao && (
          <section
            aria-hidden={activeTab !== 'nutricao'}
            className={activeTab === 'nutricao' ? `block ${slideAnimClass}` : 'hidden'}
          >
            <NutritionScreen />
          </section>
        )}

        {visitedTabs.evolucao && (
          <section
            aria-hidden={activeTab !== 'evolucao'}
            className={activeTab === 'evolucao' ? `block ${slideAnimClass}` : 'hidden'}
          >
            <EvolutionScreen />
          </section>
        )}

        {visitedTabs.ajustes && (
          <section
            aria-hidden={activeTab !== 'ajustes'}
            className={activeTab === 'ajustes' ? `block ${slideAnimClass}` : 'hidden'}
          >
            <SettingsScreen />
          </section>
        )}
      </main>

      {/* Persistent Bottom Nav Bar (Thumb Zone) */}
      <BottomNavBar activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
