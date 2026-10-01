import React, { useState } from 'react';
import { db } from '../db/db';
import type { RoutineId, NutritionLog } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { triggerHaptic } from '../utils/audio';
import { computeNutritionLogTotals } from '../screens/EvolutionScreen';
import {
  DEFAULT_BREAKFAST_CONFIG,
  DEFAULT_SNACK_CONFIG
} from '../screens/NutritionScreen';
import {
  Flame,
  Droplets,
  Target,
  Dumbbell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Plus,
  Utensils
} from 'lucide-react';

interface TodayWidgetProps {
  currentRoutineId: RoutineId;
  onSelectRoutine: (routineId: RoutineId) => void;
  onGoToNutrition?: () => void;
  onScrollToExercises?: () => void;
}

export const TodayWidget: React.FC<TodayWidgetProps> = ({
  currentRoutineId,
  onSelectRoutine,
  onGoToNutrition,
  onScrollToExercises
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [isExpanded, setIsExpanded] = useState(true);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Queries
  const userProfile = useLiveQuery(() => db.userProfile.get('main_user'));
  const todayLog = useLiveQuery(() => db.nutritionLogs.get(todayStr), [todayStr]);
  const routines = useLiveQuery(() => db.routines.toArray());
  const todaySessions = useLiveQuery(
    () => db.workoutSessions.where('date').equals(todayStr).toArray(),
    [todayStr]
  );

  const activeRoutineId = userProfile?.activeRoutine || 'A';
  const targetCalories = userProfile?.targetCaloriesKcal || 2200;
  const targetProtein = userProfile?.targetProteinGrams || 185;
  const targetWaterMl = userProfile?.targetWaterMl || 4000;
  const calorieMode = userProfile?.calorieMode || 'recomposicao';

  const routineDef = routines?.find((r) => r.id === activeRoutineId);
  const focusName = routineDef?.title.split(':')[1]?.trim() || `Treino ${activeRoutineId}`;

  const isTodayWorkoutDone = todaySessions?.some((s) => s.completed) || false;

  // Compute live nutrition totals
  const totals = todayLog
    ? computeNutritionLogTotals(todayLog)
    : { protein: 0, carbs: 0, fat: 0, calories: 0, waterL: 0, waterMl: 0 };

  const proteinPercent = Math.min(100, Math.round((totals.protein / targetProtein) * 100));
  const caloriePercent = Math.min(100, Math.round((totals.calories / targetCalories) * 100));
  const waterPercent = Math.min(100, Math.round((totals.waterMl / targetWaterMl) * 100));

  // Helper toast notification
  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  // Helper to ensure today's nutrition entry exists
  const ensureLog = async (): Promise<NutritionLog> => {
    let existing = await db.nutritionLogs.get(todayStr);
    if (!existing) {
      existing = {
        date: todayStr,
        tookWhey: false,
        wheyScoops: 0,
        milkGlasses: 0,
        meals: { breakfast: 'custom', lunch: '', snack: '', dinner: '' },
        waterMl: 0,
        escapes: { besteiraCount: 0, superBesteiraCount: 0 },
        breakfastEggCount: 2,
        breakfastConfig: DEFAULT_BREAKFAST_CONFIG,
        snackConfig: DEFAULT_SNACK_CONFIG
      };
      await db.nutritionLogs.put(existing);
    }
    return existing;
  };

  // 1-Tap Quick Action Handlers
  const handleQuickAddWater = async (amountMl: number = 500) => {
    triggerHaptic('light');
    const log = await ensureLog();
    const nextWater = Math.max(0, Math.min(8000, (log.waterMl || 0) + amountMl));
    await db.nutritionLogs.update(todayStr, { waterMl: nextWater });
    showToast(`💧 +${amountMl}ml de água adicionado (${(nextWater / 1000).toFixed(1)}L total)!`);
  };

  const handleQuickAddMilk = async () => {
    triggerHaptic('light');
    const log = await ensureLog();
    const nextMilk = Math.max(0, Math.min(6, (log.milkGlasses || 0) + 1));
    await db.nutritionLogs.update(todayStr, { milkGlasses: nextMilk });
    showToast(`🥛 +1 Copo de Leite (+110 kcal, +6g prot)!`);
  };

  const handleQuickAddWhey = async () => {
    triggerHaptic('light');
    const log = await ensureLog();
    const nextScoops = Math.max(0, Math.min(6, (log.wheyScoops || 0) + 1));
    await db.nutritionLogs.update(todayStr, {
      wheyScoops: nextScoops,
      tookWhey: true
    });
    showToast(`⚡ +1 Scoop Whey (+95 kcal, +20g prot)!`);
  };

  const handleQuickAddBesteira = async () => {
    triggerHaptic('medium');
    const log = await ensureLog();
    const currentBesteiras = log.escapes?.besteiraCount || 0;
    await db.nutritionLogs.update(todayStr, {
      'escapes.besteiraCount': currentBesteiras + 1
    });
    showToast(`🍩 Escape registrado (+600 kcal)!`);
  };

  return (
    <div className="relative mb-3.5 bg-white rounded-3xl p-4 border border-slate-200 shadow-xs transition-all duration-200">
      {/* HEADER DO WIDGET */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Widget de Hoje
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                • {new Date().toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Acompanhamento rápido de treino & nutrição
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setIsExpanded(!isExpanded);
          }}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center active:scale-90 transition-all"
          title={isExpanded ? 'Recolher Widget' : 'Expandir Widget'}
          aria-label={isExpanded ? 'Recolher' : 'Expandir'}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* TOAST DE FEEDBACK RÁPIDO */}
      {feedbackToast && (
        <div className="mb-2.5 p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="truncate">{feedbackToast}</span>
          <button
            onClick={() => setFeedbackToast(null)}
            className="text-xs text-blue-500 hover:text-blue-800 ml-1 font-black shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* CONTEÚDO EXPANSÍVEL DO WIDGET */}
      {isExpanded && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* ========================================================= */}
          {/* 1. TREINO DE HOJE ("Hoje treino tal") */}
          {/* ========================================================= */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                {activeRoutineId}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    Hoje: Treino {activeRoutineId}
                  </span>
                  {isTodayWorkoutDone ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                      Concluído 🔥
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500">
                      Pendente ⏳
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-black text-slate-900 truncate leading-snug mt-0.5">
                  {focusName}
                </h4>
                <p className="text-[10px] text-slate-500 truncate">
                  {routineDef?.subtitle || 'Rotina do dia'}
                </p>
              </div>
            </div>

            {/* Botão de Rolar / Focar no Treino de Hoje */}
            <div className="shrink-0 flex flex-col gap-1">
              {currentRoutineId !== activeRoutineId ? (
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    onSelectRoutine(activeRoutineId);
                    if (onScrollToExercises) onScrollToExercises();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
                >
                  <Dumbbell className="w-3 h-3" />
                  <span>Treinar {activeRoutineId}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    if (onScrollToExercises) onScrollToExercises();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all whitespace-nowrap"
                >
                  <span>Ver Séries</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. METAS EM TEMPO REAL: CALORIAS, PROTEÍNAS, ÁGUA */}
          {/* ========================================================= */}
          <div className="grid grid-cols-3 gap-2">
            {/* Calorias */}
            <div className="p-2.5 rounded-2xl bg-amber-50/50 border border-amber-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-700">
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-current text-amber-500" />
                  Calorias
                </span>
                <span className="text-[9px] font-bold text-amber-600">
                  {caloriePercent}%
                </span>
              </div>
              <div className="my-1">
                <div className="text-base font-black text-slate-900 leading-none">
                  {totals.calories}
                </div>
                <div className="text-[9px] font-bold text-slate-500 truncate mt-0.5">
                  / {targetCalories} kcal {calorieMode === 'recomposicao' ? '• Déficit' : '• Manut.'}
                </div>
              </div>
              <div className="h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    totals.calories <= targetCalories + 50
                      ? 'bg-amber-500'
                      : totals.calories <= targetCalories + 250
                      ? 'bg-orange-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, caloriePercent)}%` }}
                />
              </div>
            </div>

            {/* Proteína */}
            <div className="p-2.5 rounded-2xl bg-blue-50/50 border border-blue-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-blue-700">
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-blue-600" />
                  Proteína
                </span>
                <span className="text-[9px] font-bold text-blue-600">
                  {proteinPercent}%
                </span>
              </div>
              <div className="my-1">
                <div className="text-base font-black text-slate-900 leading-none">
                  {totals.protein}g
                </div>
                <div className="text-[9px] font-bold text-slate-500 truncate mt-0.5">
                  / {targetProtein}g meta
                </div>
              </div>
              <div className="h-1.5 bg-blue-200/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    totals.protein >= targetProtein ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, proteinPercent)}%` }}
                />
              </div>
            </div>

            {/* Água */}
            <div className="p-2.5 rounded-2xl bg-cyan-50/50 border border-cyan-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-cyan-700">
                <span className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-cyan-500 fill-current" />
                  Água
                </span>
                <span className="text-[9px] font-bold text-cyan-600">
                  {waterPercent}%
                </span>
              </div>
              <div className="my-1">
                <div className="text-base font-black text-slate-900 leading-none">
                  {(totals.waterMl / 1000).toFixed(1)}L
                </div>
                <div className="text-[9px] font-bold text-slate-500 truncate mt-0.5">
                  / {(targetWaterMl / 1000).toFixed(1)}L meta
                </div>
              </div>
              <div className="h-1.5 bg-cyan-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, waterPercent)}%` }}
                />
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. BOTÕES RÁPIDOS (1 TAP FAST ACTIONS) */}
          {/* ========================================================= */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 px-0.5">
              Adicionar Rápido (1 Tap)
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {/* +500ml Água */}
              <button
                onClick={() => handleQuickAddWater(500)}
                className="py-2 px-1 rounded-xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/80 text-cyan-900 flex flex-col items-center justify-center active:scale-95 transition-all shadow-2xs"
                title="Adicionar 500ml de água"
              >
                <div className="flex items-center gap-0.5 text-xs font-black">
                  <Plus className="w-3 h-3 text-cyan-600" />
                  <span>500ml</span>
                </div>
                <span className="text-[9px] font-bold text-cyan-600 mt-0.5">Água</span>
              </button>

              {/* +1 Copo de Leite */}
              <button
                onClick={handleQuickAddMilk}
                className="py-2 px-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 flex flex-col items-center justify-center active:scale-95 transition-all shadow-2xs"
                title="Adicionar 1 copo de leite"
              >
                <div className="flex items-center gap-0.5 text-xs font-black">
                  <Plus className="w-3 h-3 text-amber-600" />
                  <span>1 Copo</span>
                </div>
                <span className="text-[9px] font-bold text-amber-700 mt-0.5">Leite</span>
              </button>

              {/* +1 Whey */}
              <button
                onClick={handleQuickAddWhey}
                className="py-2 px-1 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-blue-900 flex flex-col items-center justify-center active:scale-95 transition-all shadow-2xs"
                title="Adicionar 1 scoop de whey"
              >
                <div className="flex items-center gap-0.5 text-xs font-black">
                  <Plus className="w-3 h-3 text-blue-600" />
                  <span>1 Scoop</span>
                </div>
                <span className="text-[9px] font-bold text-blue-700 mt-0.5">Whey</span>
              </button>

              {/* +1 Besteira */}
              <button
                onClick={handleQuickAddBesteira}
                className="py-2 px-1 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-900 flex flex-col items-center justify-center active:scale-95 transition-all shadow-2xs"
                title="Registrar besteira/escape (~600 kcal)"
              >
                <div className="flex items-center gap-0.5 text-xs font-black">
                  <Plus className="w-3 h-3 text-rose-600" />
                  <span>Escape</span>
                </div>
                <span className="text-[9px] font-bold text-rose-700 mt-0.5">Besteira</span>
              </button>
            </div>
          </div>

          {/* Atalho para Dieta Completa */}
          {onGoToNutrition && (
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">
                Almoço, café da manhã e pratos completos
              </span>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onGoToNutrition();
                }}
                className="text-[11px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 active:scale-95 transition-all"
              >
                <Utensils className="w-3 h-3" />
                <span>Abrir Dieta Completa</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
