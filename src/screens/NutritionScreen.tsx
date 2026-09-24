import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db/db';
import type { NutritionLog } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { triggerHaptic } from '../utils/audio';
import {
  Droplets,
  Check,
  Sparkles,
  Cookie,
  Pizza,
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Plus,
  Minus,
  Target
} from 'lucide-react';

interface MealOption {
  id: string;
  label: string;
  detail: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

const BREAKFAST_OPTIONS: MealOption[] = [
  {
    id: 'ovos_fritos',
    label: '2 Ovos Fritos',
    detail: 'Clássico proteico',
    protein: 12,
    carbs: 1,
    fat: 14,
    calories: 180
  },
  {
    id: 'cafe_leite',
    label: 'Café c/ Leite',
    detail: 'Leve e rápido',
    protein: 6,
    carbs: 9,
    fat: 4,
    calories: 95
  },
  {
    id: 'cafe_tapioca',
    label: 'Café + Tapioca c/ Queijo',
    detail: 'Energia matinal',
    protein: 14,
    carbs: 42,
    fat: 10,
    calories: 310
  },
  {
    id: 'ovos_mexidos',
    label: '3 Ovos Mexidos',
    detail: 'Alta proteína',
    protein: 18,
    carbs: 2,
    fat: 15,
    calories: 215
  }
];

const LUNCH_OPTIONS: MealOption[] = [
  {
    id: 'padrao',
    label: 'Padrão (2 bifes + arroz/feijão)',
    detail: 'Almoço clássico',
    protein: 45,
    carbs: 55,
    fat: 18,
    calories: 560
  },
  {
    id: 'pesado',
    label: 'Pesado (3 bifes + arroz/feijão)',
    detail: 'Densidade máxima',
    protein: 65,
    carbs: 60,
    fat: 24,
    calories: 720
  },
  {
    id: 'leve',
    label: 'Leve (1 bife/frango + salada)',
    detail: 'Foco em corte/leveza',
    protein: 28,
    carbs: 20,
    fat: 10,
    calories: 280
  }
];

const SNACK_OPTIONS: MealOption[] = [
  {
    id: 'sem_lanche',
    label: 'Sem lanche',
    detail: 'Jejum até o jantar',
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0
  },
  {
    id: 'tapioca_cafe',
    label: 'Tapioca c/ Café',
    detail: 'Carbo pré/pós treino',
    protein: 3,
    carbs: 38,
    fat: 1,
    calories: 175
  },
  {
    id: 'shake',
    label: 'Shake Proteico',
    detail: 'Praticidade rápida',
    protein: 25,
    carbs: 25,
    fat: 4,
    calories: 240
  }
];

const DINNER_OPTIONS: MealOption[] = [
  {
    id: 'subway',
    label: 'Subway (carne/frango + salada)',
    detail: 'Prático e proteico',
    protein: 38,
    carbs: 42,
    fat: 14,
    calories: 450
  },
  {
    id: 'caseiro',
    label: 'Prato caseiro c/ carne (arroz/feijão)',
    detail: 'Comida de verdade',
    protein: 40,
    carbs: 50,
    fat: 16,
    calories: 500
  },
  {
    id: 'omelete',
    label: 'Omelete / 3 Ovos c/ Queijo',
    detail: 'Baixo carbo',
    protein: 22,
    carbs: 3,
    fat: 18,
    calories: 260
  },
  {
    id: 'outro',
    label: 'Outro',
    detail: 'Refeição variada',
    protein: 30,
    carbs: 40,
    fat: 15,
    calories: 415
  }
];

export const NutritionScreen: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [superBesteiraMessage, setSuperBesteiraMessage] = useState<string | null>(null);

  const log = useLiveQuery(
    () => db.nutritionLogs.get(selectedDate),
    [selectedDate]
  );

  // Ensure database entry exists for date
  useEffect(() => {
    async function ensureEntry() {
      const existing = await db.nutritionLogs.get(selectedDate);
      if (!existing) {
        const newLog: NutritionLog = {
          date: selectedDate,
          tookWhey: false,
          wheyScoops: 0,
          meals: {
            breakfast: '',
            lunch: '',
            snack: '',
            dinner: ''
          },
          waterMl: 0,
          escapes: {
            besteiraCount: 0,
            superBesteiraCount: 0
          }
        };
        await db.nutritionLogs.put(newLog);
      }
    }
    ensureEntry();
  }, [selectedDate]);

  // Current active data
  const currentData: NutritionLog = useMemo(() => {
    return (
      log || {
        date: selectedDate,
        tookWhey: false,
        wheyScoops: 0,
        meals: { breakfast: '', lunch: '', snack: '', dinner: '' },
        waterMl: 0,
        escapes: { besteiraCount: 0, superBesteiraCount: 0 }
      }
    );
  }, [log, selectedDate]);

  // Actual scoops (each scoop = 20g protein)
  const wheyScoops = currentData.wheyScoops ?? (currentData.tookWhey ? 2 : 0);
  const wheyProtein = wheyScoops * 20;

  // Selected meal options
  const selectedBreakfast = BREAKFAST_OPTIONS.find((o) => o.id === currentData.meals.breakfast);
  const selectedLunch = LUNCH_OPTIONS.find((o) => o.id === currentData.meals.lunch);
  const selectedSnack = SNACK_OPTIONS.find((o) => o.id === currentData.meals.snack);
  const selectedDinner = DINNER_OPTIONS.find((o) => o.id === currentData.meals.dinner);

  // AUTOMATIC CALCULATOR: Sum of daily protein and macros
  const dailyTotals = useMemo(() => {
    const p =
      wheyProtein +
      (selectedBreakfast?.protein || 0) +
      (selectedLunch?.protein || 0) +
      (selectedSnack?.protein || 0) +
      (selectedDinner?.protein || 0);

    const c =
      (selectedBreakfast?.carbs || 0) +
      (selectedLunch?.carbs || 0) +
      (selectedSnack?.carbs || 0) +
      (selectedDinner?.carbs || 0);

    const f =
      (selectedBreakfast?.fat || 0) +
      (selectedLunch?.fat || 0) +
      (selectedSnack?.fat || 0) +
      (selectedDinner?.fat || 0);

    const kcal =
      wheyScoops * 95 +
      (selectedBreakfast?.calories || 0) +
      (selectedLunch?.calories || 0) +
      (selectedSnack?.calories || 0) +
      (selectedDinner?.calories || 0);

    return { protein: p, carbs: c, fat: f, calories: kcal };
  }, [
    wheyProtein,
    wheyScoops,
    selectedBreakfast,
    selectedLunch,
    selectedSnack,
    selectedDinner
  ]);

  const TARGET_PROTEIN = 185;
  const proteinProgress = Math.min(100, Math.round((dailyTotals.protein / TARGET_PROTEIN) * 100));
  const remainingProtein = Math.max(0, TARGET_PROTEIN - dailyTotals.protein);

  // Handlers
  const handleAdjustWheyScoops = async (delta: number) => {
    triggerHaptic('light');
    const nextScoops = Math.max(0, Math.min(6, wheyScoops + delta));
    await db.nutritionLogs.update(selectedDate, {
      wheyScoops: nextScoops,
      tookWhey: nextScoops > 0
    });
  };

  const handleSelectMeal = async (
    mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner',
    optionId: string
  ) => {
    triggerHaptic('light');
    const currentVal = currentData.meals[mealType];
    const nextVal = currentVal === optionId ? '' : optionId;
    await db.nutritionLogs.update(selectedDate, {
      [`meals.${mealType}`]: nextVal
    });
  };

  const handleAdjustWater = async (amountMl: number) => {
    triggerHaptic('light');
    const current = currentData.waterMl || 0;
    const nextVal = Math.max(0, Math.min(6000, current + amountMl));
    await db.nutritionLogs.update(selectedDate, {
      waterMl: nextVal
    });
  };

  const handleAddBesteira = async (delta: number) => {
    triggerHaptic('medium');
    const current = currentData.escapes.besteiraCount || 0;
    const nextCount = Math.max(0, current + delta);
    await db.nutritionLogs.update(selectedDate, {
      'escapes.besteiraCount': nextCount
    });
  };

  const handleAddSuperBesteira = async (delta: number) => {
    triggerHaptic('alert');
    const current = currentData.escapes.superBesteiraCount || 0;
    const nextCount = Math.max(0, current + delta);
    await db.nutritionLogs.update(selectedDate, {
      'escapes.superBesteiraCount': nextCount
    });

    if (delta > 0) {
      setSuperBesteiraMessage(
        'Super besteira registrada (~1.200 a 1.500 kcal). Mantenha os treinos pesados amanhã e foque na hidratação.'
      );
    }
  };

  const handleShiftDate = (days: number) => {
    triggerHaptic('light');
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === todayStr;
  const formattedDisplayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(
    'pt-BR',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    }
  );

  const waterProgress = Math.min(100, Math.round((currentData.waterMl / 4000) * 100));

  return (
    <div className="pb-36 pt-1 max-w-lg mx-auto px-4">
      {/* HEADER CENTRALIZADO (Sem poluição de caixas desnecessárias) */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pt-2 pb-2.5 mb-3 -mx-4 px-4 border-b border-slate-200/60">
        <div className="flex items-center justify-between">
          <div className="w-8" /> {/* Spacer para centralização */}

          <div className="text-center">
            <h1 className="text-base font-black text-slate-900 tracking-tight">
              Dieta & Nutrição
            </h1>
            <p className="text-[11px] font-semibold text-slate-400">
              Meta: 185g Proteína • 4,0L Água
            </p>
          </div>

          {/* Date Navigator Compacto */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
            <button
              onClick={() => handleShiftDate(-1)}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-90"
              aria-label="Dia anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-bold text-slate-800 capitalize min-w-[65px] text-center truncate">
              {isToday ? 'Hoje' : formattedDisplayDate}
            </span>
            <button
              onClick={() => handleShiftDate(1)}
              disabled={isToday}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-90 disabled:opacity-30"
              aria-label="Próximo dia"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* 1. CALCULADORA AUTOMÁTICA DE PROTEÍNAS & MACROS DIÁRIOS (DESTAQUE NO TOPO) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Target className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Calculadora Diária
                </span>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-xl font-black text-slate-900 leading-none">
                    {dailyTotals.protein}g
                  </h2>
                  <span className="text-xs font-bold text-slate-400">
                    / {TARGET_PROTEIN}g proteína
                  </span>
                </div>
              </div>
            </div>

            <span
              className={`text-xs font-black px-2.5 py-1 rounded-xl whitespace-nowrap ${
                dailyTotals.protein >= TARGET_PROTEIN
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-blue-50 text-blue-700 border border-blue-100'
              }`}
            >
              {proteinProgress}%
            </span>
          </div>

          {/* Barra de Progresso da Proteína */}
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2.5">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                dailyTotals.protein >= TARGET_PROTEIN ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${proteinProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-3">
            <span>
              {remainingProtein > 0 ? (
                <>Faltam <strong className="text-slate-900 font-bold">{remainingProtein}g</strong> para a meta</>
              ) : (
                <span className="text-emerald-700 font-bold">Meta proteica atingida!</span>
              )}
            </span>
            <span className="text-slate-400">~{dailyTotals.calories} kcal estimadas</span>
          </div>

          {/* Breakdown de Macros Estimados */}
          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-center">
            <div className="p-1.5 rounded-xl bg-blue-50/60 border border-blue-100/60">
              <div className="text-[10px] font-bold text-blue-600">PROTEÍNA</div>
              <div className="text-xs font-black text-blue-900">{dailyTotals.protein}g</div>
            </div>
            <div className="p-1.5 rounded-xl bg-amber-50/60 border border-amber-100/60">
              <div className="text-[10px] font-bold text-amber-600">CARBO</div>
              <div className="text-xs font-black text-amber-900">~{dailyTotals.carbs}g</div>
            </div>
            <div className="p-1.5 rounded-xl bg-purple-50/60 border border-purple-100/60">
              <div className="text-[10px] font-bold text-purple-600">GORDURA</div>
              <div className="text-xs font-black text-purple-900">~{dailyTotals.fat}g</div>
            </div>
          </div>
        </div>

        {/* 2. CONTROLE DE SCOOPS DE WHEY PROTEIN (20g por scoop) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Suplementação (20g / scoop)
                </span>
                <h3 className="text-sm font-black text-slate-900 leading-tight">
                  Whey Protein
                </h3>
                <p className="text-[11px] font-semibold text-blue-600">
                  {wheyScoops > 0 ? `+${wheyProtein}g proteína (${wheyScoops} ${wheyScoops === 1 ? 'scoop' : 'scoops'})` : 'Nenhum scoop marcado'}
                </p>
              </div>
            </div>

            {/* Contador de Scoops com [-] e [+] */}
            <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => handleAdjustWheyScoops(-1)}
                disabled={wheyScoops <= 0}
                className="w-8 h-8 rounded-lg bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40 shadow-2xs font-bold"
                aria-label="Diminuir scoop"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="w-8 text-center font-black text-sm text-slate-900">
                {wheyScoops}
              </div>

              <button
                onClick={() => handleAdjustWheyScoops(1)}
                className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center active:scale-90 transition-transform shadow-2xs font-bold"
                aria-label="Aumentar scoop"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. REFEIÇÕES BASE (Macros em Cada Opção + 2 Ovos Fritos) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Refeições Base (1 Tap)
            </h3>
          </div>

          {/* Café da manhã */}
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Café da Manhã
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {BREAKFAST_OPTIONS.map((opt) => {
                const isSelected = currentData.meals.breakfast === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectMeal('breakfast', opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="truncate pr-1">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3] shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      P: <strong className="text-slate-800">{opt.protein}g</strong> • C: {opt.carbs}g • G: {opt.fat}g
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Almoço */}
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Almoço
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {LUNCH_OPTIONS.map((opt) => {
                const isSelected = currentData.meals.lunch === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectMeal('lunch', opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="truncate pr-1">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3] shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      P: <strong className="text-slate-800">{opt.protein}g</strong> • C: {opt.carbs}g • G: {opt.fat}g
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lanche */}
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Lanche da Tarde
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {SNACK_OPTIONS.map((opt) => {
                const isSelected = currentData.meals.snack === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectMeal('snack', opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="truncate pr-1">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3] shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      P: <strong className="text-slate-800">{opt.protein}g</strong> • C: {opt.carbs}g • G: {opt.fat}g
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Jantar */}
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Jantar
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {DINNER_OPTIONS.map((opt) => {
                const isSelected = currentData.meals.dinner === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectMeal('dinner', opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="truncate pr-1">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3] shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      P: <strong className="text-slate-800">{opt.protein}g</strong> • C: {opt.carbs}g • G: {opt.fat}g
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. HIDRATAÇÃO DIÁRIA (META 4.0L) - POSICIONADA ANTES DOS ESCAPES */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Droplets className="w-4 h-4 fill-current" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Hidratação Diária
                </span>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-base font-black text-slate-900 leading-none">
                    {(currentData.waterMl / 1000).toFixed(2)}L
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">/ 4,0L</span>
                </div>
              </div>
            </div>

            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${
                waterProgress >= 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-cyan-50 text-cyan-700'
              }`}
            >
              {waterProgress}%
            </span>
          </div>

          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                waterProgress >= 100 ? 'bg-emerald-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, waterProgress)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => handleAdjustWater(-250)}
              disabled={currentData.waterMl <= 0}
              className="py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold active:scale-95 transition-all disabled:opacity-40 min-h-[40px]"
            >
              -250 ml
            </button>
            <button
              onClick={() => handleAdjustWater(250)}
              className="py-2 rounded-xl border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold active:scale-95 transition-all min-h-[40px]"
            >
              +250 ml (Copo)
            </button>
            <button
              onClick={() => handleAdjustWater(500)}
              className="py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold active:scale-95 transition-all min-h-[40px]"
            >
              +500 ml (Garrafa)
            </button>
          </div>
        </div>

        {/* 5. CONTROLE DE ESCAPES CALÓRICOS */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Acompanhamento Realista
            </span>
            <h3 className="text-sm font-black text-slate-900 leading-tight">
              Controle de Escapes Calóricos
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            {/* + BESTEIRA */}
            <div className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Cookie className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-black text-amber-900">+ Besteira</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    ~600 kcal
                  </span>
                </div>
                <p className="text-[10px] text-amber-800/80 mt-1">
                  Cookie 150g, Eskibom, bolo.
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-amber-200/50">
                <span className="text-xs font-bold text-amber-950">
                  {currentData.escapes.besteiraCount || 0}x no dia
                </span>
                <div className="flex items-center gap-1">
                  {currentData.escapes.besteiraCount > 0 && (
                    <button
                      onClick={() => handleAddBesteira(-1)}
                      className="w-6 h-6 rounded bg-amber-200/60 hover:bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold active:scale-95"
                    >
                      -
                    </button>
                  )}
                  <button
                    onClick={() => handleAddBesteira(1)}
                    className="px-2.5 h-7 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold active:scale-95 shadow-2xs"
                  >
                    + Registrar
                  </button>
                </div>
              </div>
            </div>

            {/* + SUPER BESTEIRA */}
            <div className="p-3 rounded-xl border border-red-200/80 bg-red-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Pizza className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-xs font-black text-red-900">+ Super Besteira</span>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                    ~1.200-1.500 kcal
                  </span>
                </div>
                <p className="text-[10px] text-red-800/80 mt-1">
                  Rodízio, hambúrguer duplo + fritas.
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-red-200/50">
                <span className="text-xs font-bold text-red-950">
                  {currentData.escapes.superBesteiraCount || 0}x no dia
                </span>
                <div className="flex items-center gap-1">
                  {currentData.escapes.superBesteiraCount > 0 && (
                    <button
                      onClick={() => handleAddSuperBesteira(-1)}
                      className="w-6 h-6 rounded bg-red-200/60 hover:bg-red-200 text-red-900 flex items-center justify-center text-xs font-bold active:scale-95"
                    >
                      -
                    </button>
                  )}
                  <button
                    onClick={() => handleAddSuperBesteira(1)}
                    className="px-2.5 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold active:scale-95 shadow-2xs"
                  >
                    + Registrar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* COACHING TOAST FOR SUPER BESTEIRA */}
          {superBesteiraMessage && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs flex items-start gap-2 animate-in fade-in duration-200">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px]">
                <strong className="font-bold">Saldo calórico computado:</strong>{' '}
                {superBesteiraMessage}
              </div>
              <button
                onClick={() => setSuperBesteiraMessage(null)}
                className="text-slate-400 hover:text-slate-700 font-bold ml-1 text-xs"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
