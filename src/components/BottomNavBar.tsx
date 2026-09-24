import React from 'react';
import { Dumbbell, Utensils, TrendingUp, Settings } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

export type TabType = 'treino' | 'nutricao' | 'evolucao' | 'ajustes';

interface BottomNavBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange
}) => {
  const tabs = [
    {
      id: 'treino' as TabType,
      label: 'Treino',
      icon: Dumbbell
    },
    {
      id: 'nutricao' as TabType,
      label: 'Nutrição',
      icon: Utensils
    },
    {
      id: 'evolucao' as TabType,
      label: 'Evolução',
      icon: TrendingUp
    },
    {
      id: 'ajustes' as TabType,
      label: 'Ajustes',
      icon: Settings
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <div className="max-w-md mx-auto grid grid-cols-4 px-2 h-18">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic('light');
                onTabChange(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 transition-all duration-150 active:scale-90 ${
                isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label={tab.label}
            >
              <div
                className={`p-1.5 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-blue-50 text-blue-600 scale-105' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span
                className={`text-[11px] mt-0.5 tracking-tight font-bold ${
                  isActive ? 'text-blue-600' : 'text-slate-500 font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
