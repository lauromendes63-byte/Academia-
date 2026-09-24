import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db/db';
import type { NutritionLog, PlateConfig, SubwayConfig } from '../types';
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
  Target,
  Flame
} from 'lucide-react';

const DEFAULT_LUNCH_CONFIG: PlateConfig = {
  proteinType: 'carne',
  proteinPortions: 2,
  ricePortions: 2,
  beanPortions: 1,
  hasSalad: true
};

const DEFAULT_SUBWAY_CONFIG: SubwayConfig = {
  protein: 'frango_teriyaki',
  size: '15cm'
};

const DEFAULT_DINNER_PLATE_CONFIG: PlateConfig = {
  proteinType: 'carne',
  proteinPortions: 2,
  ricePortions: 2,
  beanPortions: 1,
  hasSalad: true
};

// HELPER: Macro calculations for Prato Caseiro (Almoço ou Jantar)
export function calculatePlateMacros(config: PlateConfig = DEFAULT_LUNCH_CONFIG) {
  let p = 0;
  let c = 0;
  let f = 0;
  let kcal = 0;

  // Proteína
  const proteinCount = config.proteinPortions || 0;
  if (config.proteinType === 'frango') {
    // Filé de peito de frango grelhado (~120g)
    p += proteinCount * 32;
    f += proteinCount * 3.5;
    kcal += proteinCount * 160;
  } else if (config.proteinType === 'peixe') {
    // Filé de tilápia grelhada (~120g)
    p += proteinCount * 26;
    f += proteinCount * 3;
    kcal += proteinCount * 140;
  } else {
    // Bife bovino magro grelhado (~100g)
    p += proteinCount * 28;
    f += proteinCount * 9;
    kcal += proteinCount * 200;
  }

  // Arroz branco (~100g cozido por concha)
  const riceCount = config.ricePortions || 0;
  p += riceCount * 2.5;
  c += riceCount * 28;
  f += riceCount * 0.4;
  kcal += riceCount * 130;

  // Feijão carioca (~80g cozido por concha)
  const beanCount = config.beanPortions || 0;
  p += beanCount * 4;
  c += beanCount * 11;
  f += beanCount * 0.5;
  kcal += beanCount * 65;

  // Salada verde (folhas, tomate, azeite sutil)
  if (config.hasSalad) {
    p += 1;
    c += 3;
    f += 2;
    kcal += 35;
  }

  return {
    protein: Math.round(p),
    carbs: Math.round(c),
    fat: Math.round(f),
    calories: Math.round(kcal)
  };
}

// HELPER: Macro calculations for Subway Completo
export function calculateSubwayMacros(config: SubwayConfig = DEFAULT_SUBWAY_CONFIG) {
  const isDouble = config.size === '30cm';
  const multiplier = isDouble ? 2 : 1;

  let baseP = 0;
  let baseC = 0;
  let baseF = 0;
  let baseKcal = 0;

  if (config.protein === 'carne') {
    // Subway Carne / Bife 15cm Completo (Chipotle + Parmesão + Mussarela + Salada)
    baseP = 30;
    baseC = 50;
    baseF = 18;
    baseKcal = 490;
  } else {
    // Subway Frango Teriyaki 15cm Completo (Chipotle + Parmesão + Mussarela + Salada)
    baseP = 32;
    baseC = 52;
    baseF = 14;
    baseKcal = 460;
  }

  return {
    protein: baseP * multiplier,
    carbs: baseC * multiplier,
    fat: baseF * multiplier,
    calories: baseKcal * multiplier
  };
}

// HELPER: Macro calculations for Breakfast
export function calculateBreakfastMacros(type: string, eggCount: number = 2) {
  if (type === 'ovos_fritos') {
    const n = Math.max(1, eggCount);
    return {
      protein: n * 6,
      carbs: Math.round(n * 0.5),
      fat: n * 7,
      calories: n * 90
    };
  }
  if (type === 'ovos_mexidos') {
    const n = Math.max(1, eggCount);
    return {
      protein: n * 6,
      carbs: Math.round(n * 0.8),
      fat: n * 6,
      calories: n * 80
    };
  }
  if (type === 'cafe_tapioca') {
    // Café c/ Leite + Tapioca c/ Queijo (Sempre com leite!)
    return {
      protein: 14,
      carbs: 42,
      fat: 11,
      calories: 340
    };
  }
  if (type === 'cafe_leite') {
    // Café c/ Leite Simples
    return {
      protein: 6,
      carbs: 9,
      fat: 4,
      calories: 95
    };
  }
  return { protein: 0, carbs: 0, fat: 0, calories: 0 };
}

// HELPER: Macro calculations for Afternoon Snack
export function calculateSnackMacros(type: string) {
  if (type === 'cafe_tapioca') {
    return { protein: 14, carbs: 42, fat: 11, calories: 340 };
  }
  if (type === 'shake') {
    return { protein: 25, carbs: 25, fat: 4, calories: 240 };
  }
  if (type === 'tapioca_cafe') {
    return { protein: 3, carbs: 38, fat: 1, calories: 175 };
  }
  return { protein: 0, carbs: 0, fat: 0, calories: 0 };
}

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
          },
          breakfastEggCount: 2,
          lunchConfig: DEFAULT_LUNCH_CONFIG,
          dinnerType: 'subway',
          dinnerSubwayConfig: DEFAULT_SUBWAY_CONFIG,
          dinnerPlateConfig: DEFAULT_DINNER_PLATE_CONFIG
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
        escapes: { besteiraCount: 0, superBesteiraCount: 0 },
        breakfastEggCount: 2,
        lunchConfig: DEFAULT_LUNCH_CONFIG,
        dinnerType: 'subway',
        dinnerSubwayConfig: DEFAULT_SUBWAY_CONFIG,
        dinnerPlateConfig: DEFAULT_DINNER_PLATE_CONFIG
      }
    );
  }, [log, selectedDate]);

  // Actual scoops (each scoop = 20g protein, ~95 kcal)
  const wheyScoops = currentData.wheyScoops ?? (currentData.tookWhey ? 2 : 0);
  const wheyProtein = wheyScoops * 20;
  const wheyCalories = wheyScoops * 95;

  // Configurations
  const eggCount = currentData.breakfastEggCount ?? (currentData.meals.breakfast === 'ovos_mexidos' ? 3 : 2);
  const lunchConfig = currentData.lunchConfig ?? DEFAULT_LUNCH_CONFIG;
  const dinnerSubwayConfig = currentData.dinnerSubwayConfig ?? DEFAULT_SUBWAY_CONFIG;
  const dinnerPlateConfig = currentData.dinnerPlateConfig ?? DEFAULT_DINNER_PLATE_CONFIG;

  // User Profile
  const userProfile = useLiveQuery(() => db.userProfile.get('main_user'));
  const targetCalories = userProfile?.targetCaloriesKcal || 2200;
  const calorieMode = userProfile?.calorieMode || 'recomposicao';

  // Calculations for individual selected meals
  const breakfastMacros = useMemo(() => {
    if (!currentData.meals.breakfast) return { protein: 0, carbs: 0, fat: 0, calories: 0 };
    return calculateBreakfastMacros(currentData.meals.breakfast, eggCount);
  }, [currentData.meals.breakfast, eggCount]);

  const lunchMacros = useMemo(() => {
    if (currentData.meals.lunch !== 'caseiro') return { protein: 0, carbs: 0, fat: 0, calories: 0 };
    return calculatePlateMacros(lunchConfig);
  }, [currentData.meals.lunch, lunchConfig]);

  const snackMacros = useMemo(() => {
    if (!currentData.meals.snack) return { protein: 0, carbs: 0, fat: 0, calories: 0 };
    return calculateSnackMacros(currentData.meals.snack);
  }, [currentData.meals.snack]);

  const dinnerMacros = useMemo(() => {
    if (currentData.meals.dinner === 'subway') {
      return calculateSubwayMacros(dinnerSubwayConfig);
    }
    if (currentData.meals.dinner === 'caseiro') {
      return calculatePlateMacros(dinnerPlateConfig);
    }
    return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  }, [currentData.meals.dinner, dinnerSubwayConfig, dinnerPlateConfig]);

  // AUTOMATIC CALCULATOR: Sum of daily protein and macros
  const dailyTotals = useMemo(() => {
    const p = wheyProtein + breakfastMacros.protein + lunchMacros.protein + snackMacros.protein + dinnerMacros.protein;
    const c = breakfastMacros.carbs + lunchMacros.carbs + snackMacros.carbs + dinnerMacros.carbs;
    const f = breakfastMacros.fat + lunchMacros.fat + snackMacros.fat + dinnerMacros.fat;

    const escapeKcal =
      (currentData.escapes.besteiraCount || 0) * 600 +
      (currentData.escapes.superBesteiraCount || 0) * 1350;

    const kcal = wheyCalories + breakfastMacros.calories + lunchMacros.calories + snackMacros.calories + dinnerMacros.calories + escapeKcal;

    return { protein: p, carbs: c, fat: f, calories: kcal };
  }, [wheyProtein, wheyCalories, breakfastMacros, lunchMacros, snackMacros, dinnerMacros, currentData.escapes]);

  const TARGET_PROTEIN = 185;
  const proteinProgress = Math.min(100, Math.round((dailyTotals.protein / TARGET_PROTEIN) * 100));
  const remainingProtein = Math.max(0, TARGET_PROTEIN - dailyTotals.protein);

  const calorieProgress = Math.min(100, Math.round((dailyTotals.calories / targetCalories) * 100));
  const remainingCalories = targetCalories - dailyTotals.calories;

  // Handlers
  const handleAdjustWheyScoops = async (delta: number) => {
    triggerHaptic('light');
    const nextScoops = Math.max(0, Math.min(6, wheyScoops + delta));
    await db.nutritionLogs.update(selectedDate, {
      wheyScoops: nextScoops,
      tookWhey: nextScoops > 0
    });
  };

  const handleSelectBreakfast = async (optionId: string) => {
    triggerHaptic('light');
    const nextVal = currentData.meals.breakfast === optionId ? '' : optionId;
    const updates: Record<string, any> = {
      'meals.breakfast': nextVal
    };
    if (nextVal === 'ovos_fritos' && (!currentData.breakfastEggCount || currentData.breakfastEggCount < 1)) {
      updates.breakfastEggCount = 2;
    } else if (nextVal === 'ovos_mexidos' && (!currentData.breakfastEggCount || currentData.breakfastEggCount < 1)) {
      updates.breakfastEggCount = 3;
    }
    await db.nutritionLogs.update(selectedDate, updates);
  };

  const handleAdjustBreakfastEggs = async (delta: number) => {
    triggerHaptic('light');
    const nextCount = Math.max(1, Math.min(6, eggCount + delta));
    await db.nutritionLogs.update(selectedDate, {
      breakfastEggCount: nextCount
    });
  };

  const handleToggleLunch = async () => {
    triggerHaptic('light');
    const nextVal = currentData.meals.lunch === 'caseiro' ? '' : 'caseiro';
    await db.nutritionLogs.update(selectedDate, {
      'meals.lunch': nextVal,
      lunchConfig: currentData.lunchConfig ?? DEFAULT_LUNCH_CONFIG
    });
  };

  const handleUpdateLunchConfig = async (patch: Partial<PlateConfig>) => {
    triggerHaptic('light');
    const updated: PlateConfig = {
      ...(currentData.lunchConfig || DEFAULT_LUNCH_CONFIG),
      ...patch
    };
    await db.nutritionLogs.update(selectedDate, {
      lunchConfig: updated,
      'meals.lunch': 'caseiro' // Ensure marked as eaten
    });
  };

  const handleSelectSnack = async (optionId: string) => {
    triggerHaptic('light');
    const nextVal = currentData.meals.snack === optionId ? '' : optionId;
    await db.nutritionLogs.update(selectedDate, {
      'meals.snack': nextVal
    });
  };

  const handleSelectDinnerType = async (type: 'subway' | 'caseiro') => {
    triggerHaptic('light');
    const nextVal = currentData.meals.dinner === type ? '' : type;
    await db.nutritionLogs.update(selectedDate, {
      'meals.dinner': nextVal,
      dinnerType: type
    });
  };

  const handleUpdateSubwayConfig = async (patch: Partial<SubwayConfig>) => {
    triggerHaptic('light');
    const updated: SubwayConfig = {
      ...(currentData.dinnerSubwayConfig || DEFAULT_SUBWAY_CONFIG),
      ...patch
    };
    await db.nutritionLogs.update(selectedDate, {
      dinnerSubwayConfig: updated,
      'meals.dinner': 'subway'
    });
  };

  const handleUpdateDinnerPlateConfig = async (patch: Partial<PlateConfig>) => {
    triggerHaptic('light');
    const updated: PlateConfig = {
      ...(currentData.dinnerPlateConfig || DEFAULT_DINNER_PLATE_CONFIG),
      ...patch
    };
    await db.nutritionLogs.update(selectedDate, {
      dinnerPlateConfig: updated,
      'meals.dinner': 'caseiro'
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
  const parsedDate = new Date(selectedDate + 'T00:00:00');
  const dayNumber = parsedDate.getDate();
  const monthShort = parsedDate
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '')
    .toUpperCase();

  const waterProgress = Math.min(100, Math.round((currentData.waterMl / 4000) * 100));

  // Dynamic preview for breakfast options
  const friedEggsPreview = calculateBreakfastMacros('ovos_fritos', eggCount);
  const scrambledEggsPreview = calculateBreakfastMacros('ovos_mexidos', eggCount);
  const currentLunchPreview = calculatePlateMacros(lunchConfig);
  const currentDinnerPlatePreview = calculatePlateMacros(dinnerPlateConfig);
  const currentSubwayPreview = calculateSubwayMacros(dinnerSubwayConfig);

  return (
    <div className="pb-36 pt-1 max-w-lg mx-auto px-4">
      {/* HEADER CENTRALIZADO PREMIUM */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pt-2 pb-2.5 mb-3 -mx-4 px-4 border-b border-slate-200/60">
        <div className="flex items-center justify-between">
          {/* Spacer esquerdo proporcional para centralização perfeita */}
          <div className="w-16 shrink-0 flex items-center">
            {isToday ? (
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 shadow-2xs">
                Hoje
              </span>
            ) : (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 active:scale-95"
              >
                Hoje
              </button>
            )}
          </div>

          {/* Título e Metas Coloridas em Destaque Central */}
          <div className="flex-1 text-center min-w-0 px-1">
            <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">
              Dieta & Nutrição
            </h1>
            <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                <Target className="w-2.5 h-2.5 text-blue-600" />
                <span>185g Prot</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                <Flame className="w-2.5 h-2.5 text-amber-600 fill-current" />
                <span>{targetCalories.toLocaleString('pt-BR')} kcal</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-50 text-cyan-700 border border-cyan-200/80 shadow-2xs">
                <Droplets className="w-2.5 h-2.5 text-cyan-600 fill-current" />
                <span>4,0L Água</span>
              </span>
            </div>
          </div>

          {/* Quadrado Pequeno de Data no Canto Superior Direito */}
          <div className="w-16 shrink-0 flex items-center justify-end gap-0.5">
            <button
              onClick={() => handleShiftDate(-1)}
              className="w-5 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400 active:scale-90"
              title="Dia anterior"
              aria-label="Dia anterior"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <div className="w-9 h-11 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center shrink-0">
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider leading-none">
                {monthShort}
              </span>
              <span className="text-sm font-black text-slate-900 leading-none mt-0.5">
                {dayNumber}
              </span>
            </div>
            <button
              onClick={() => handleShiftDate(1)}
              disabled={isToday}
              className="w-5 h-7 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400 active:scale-90 disabled:opacity-20"
              title="Próximo dia"
              aria-label="Próximo dia"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* 1. CALCULADORA AUTOMÁTICA DE PROTEÍNAS & CALORIAS (DESTAQUE NO TOPO) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          {/* TRACKER DE PROTEÍNA */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Target className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Proteína Alvo
                  </span>
                  <div className="flex items-baseline gap-1">
                    <h2 className="text-lg font-black text-slate-900 leading-none">
                      {dailyTotals.protein}g
                    </h2>
                    <span className="text-xs font-bold text-slate-400">
                      / {TARGET_PROTEIN}g
                    </span>
                  </div>
                </div>
              </div>

              <span
                className={`text-xs font-black px-2 py-0.5 rounded-xl whitespace-nowrap ${
                  dailyTotals.protein >= TARGET_PROTEIN
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-50 text-blue-700 border border-blue-100'
                }`}
              >
                {proteinProgress}%
              </span>
            </div>

            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
              <div
                className={`h-full transition-all duration-300 ease-out rounded-full ${
                  dailyTotals.protein >= TARGET_PROTEIN ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${proteinProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
              <span>
                {remainingProtein > 0 ? (
                  <>Faltam <strong className="text-slate-800 font-bold">{remainingProtein}g</strong> para a meta</>
                ) : (
                  <span className="text-emerald-700 font-bold">Meta proteica batida!</span>
                )}
              </span>
            </div>
          </div>

          {/* TRACKER DE CALORIAS */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Flame className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Balanço Calórico
                  </span>
                  <div className="flex items-baseline gap-1">
                    <h2 className="text-lg font-black text-slate-900 leading-none">
                      {dailyTotals.calories.toLocaleString('pt-BR')} kcal
                    </h2>
                    <span className="text-xs font-bold text-slate-400">
                      / {targetCalories.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                {calorieMode === 'recomposicao' ? 'Déficit (2.200)' : 'Manutenção (2.700)'}
              </span>
            </div>

            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
              <div
                className={`h-full transition-all duration-300 ease-out rounded-full ${
                  dailyTotals.calories > targetCalories ? 'bg-red-500' : 'bg-amber-500'
                }`}
                style={{ width: `${calorieProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
              <span>
                {remainingCalories > 0 ? (
                  <>Restam <strong className="text-slate-800 font-bold">{remainingCalories} kcal</strong></>
                ) : (
                  <span className="text-amber-800 font-bold">Meta calórica atingida!</span>
                )}
              </span>
              <span className="text-slate-400">
                {calorieProgress}% consumido
              </span>
            </div>
          </div>

          {/* Breakdown de Macros Estimados */}
          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-center">
            <div className="p-1.5 rounded-xl bg-blue-50/60 border border-blue-100/60">
              <div className="text-[9px] font-bold text-blue-600">PROTEÍNA</div>
              <div className="text-xs font-black text-blue-900">{dailyTotals.protein}g</div>
            </div>
            <div className="p-1.5 rounded-xl bg-amber-50/60 border border-amber-100/60">
              <div className="text-[9px] font-bold text-amber-600">CARBO</div>
              <div className="text-xs font-black text-amber-900">~{dailyTotals.carbs}g</div>
            </div>
            <div className="p-1.5 rounded-xl bg-purple-50/60 border border-purple-100/60">
              <div className="text-[9px] font-bold text-purple-600">GORDURA</div>
              <div className="text-xs font-black text-purple-900">~{dailyTotals.fat}g</div>
            </div>
          </div>

          {/* REASSURANCE AUTO-SAVE FOOTER */}
          <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1 font-semibold text-emerald-600">
              <Check className="w-3 h-3 stroke-[3]" />
              Salvo automaticamente hoje
            </span>
            <span className="text-slate-400">
              Cada dia mantém seu histórico
            </span>
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
                  {wheyScoops > 0 ? `+${wheyProtein}g proteína • +${wheyCalories} kcal (${wheyScoops} ${wheyScoops === 1 ? 'scoop' : 'scoops'})` : 'Nenhum scoop marcado'}
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

        {/* 3. REFEIÇÕES DIÁRIAS PERSONALIZÁVEIS */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Refeições do Dia (Personalizáveis & 1-Tap)
            </h3>
          </div>

          {/* ========================================================= */}
          {/* CAFÉ DA MANHÃ */}
          {/* ========================================================= */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                ☕ Café da Manhã
              </div>
              {currentData.meals.breakfast && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {breakfastMacros.calories} kcal • {breakfastMacros.protein}g Prot
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Opção 1: Ovos Fritos */}
              <div
                className={`p-3 rounded-2xl border transition-all ${
                  currentData.meals.breakfast === 'ovos_fritos'
                    ? 'border-blue-500 bg-blue-50/70 shadow-2xs'
                    : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100'
                }`}
              >
                <div
                  onClick={() => handleSelectBreakfast('ovos_fritos')}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-black text-slate-900">
                    <span>🍳 {currentData.meals.breakfast === 'ovos_fritos' ? `${eggCount} Ovos Fritos` : 'Ovos Fritos'}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                        {friedEggsPreview.calories} kcal
                      </span>
                      {currentData.meals.breakfast === 'ovos_fritos' && (
                        <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                    P: <strong className="text-slate-800">{friedEggsPreview.protein}g</strong> • C: {friedEggsPreview.carbs}g • G: {friedEggsPreview.fat}g
                  </div>
                </div>

                {/* Contador de ovos se selecionado */}
                {currentData.meals.breakfast === 'ovos_fritos' && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200/60">
                    <span className="text-[10px] font-bold text-blue-900">
                      Quantidade de ovos:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdjustBreakfastEggs(-1);
                        }}
                        disabled={eggCount <= 1}
                        className="w-6 h-6 rounded bg-white hover:bg-blue-100 text-blue-900 border border-blue-200 flex items-center justify-center font-bold text-xs disabled:opacity-30"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-black text-xs text-blue-900">
                        {eggCount}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdjustBreakfastEggs(1);
                        }}
                        disabled={eggCount >= 5}
                        className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold text-xs disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Opção 2: Ovos Mexidos */}
              <div
                className={`p-3 rounded-2xl border transition-all ${
                  currentData.meals.breakfast === 'ovos_mexidos'
                    ? 'border-blue-500 bg-blue-50/70 shadow-2xs'
                    : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100'
                }`}
              >
                <div
                  onClick={() => handleSelectBreakfast('ovos_mexidos')}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-black text-slate-900">
                    <span>🍳 {currentData.meals.breakfast === 'ovos_mexidos' ? `${eggCount} Ovos Mexidos` : 'Ovos Mexidos'}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                        {scrambledEggsPreview.calories} kcal
                      </span>
                      {currentData.meals.breakfast === 'ovos_mexidos' && (
                        <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                    P: <strong className="text-slate-800">{scrambledEggsPreview.protein}g</strong> • C: {scrambledEggsPreview.carbs}g • G: {scrambledEggsPreview.fat}g
                  </div>
                </div>

                {/* Contador de ovos se selecionado */}
                {currentData.meals.breakfast === 'ovos_mexidos' && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-200/60">
                    <span className="text-[10px] font-bold text-blue-900">
                      Quantidade de ovos:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdjustBreakfastEggs(-1);
                        }}
                        disabled={eggCount <= 1}
                        className="w-6 h-6 rounded bg-white hover:bg-blue-100 text-blue-900 border border-blue-200 flex items-center justify-center font-bold text-xs disabled:opacity-30"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-black text-xs text-blue-900">
                        {eggCount}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdjustBreakfastEggs(1);
                        }}
                        disabled={eggCount >= 6}
                        className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold text-xs disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Opção 3: Café c/ Leite + Tapioca c/ Queijo */}
              <button
                onClick={() => handleSelectBreakfast('cafe_tapioca')}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                  currentData.meals.breakfast === 'cafe_tapioca'
                    ? 'border-blue-500 bg-blue-50/70 text-blue-950 font-bold shadow-2xs'
                    : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="truncate pr-1">☕ Café c/ Leite + Tapioca c/ Queijo</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                      340 kcal
                    </span>
                    {currentData.meals.breakfast === 'cafe_tapioca' && (
                      <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Tapioca (50g) + Queijo (30g) + Café c/ Leite (150ml)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  P: <strong className="text-slate-800">14g</strong> • C: 42g • G: 11g
                </div>
              </button>

              {/* Opção 4: Café c/ Leite Simples */}
              <button
                onClick={() => handleSelectBreakfast('cafe_leite')}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                  currentData.meals.breakfast === 'cafe_leite'
                    ? 'border-blue-500 bg-blue-50/70 text-blue-950 font-bold shadow-2xs'
                    : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="truncate pr-1">🥛 Café c/ Leite (Simples)</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                      95 kcal
                    </span>
                    {currentData.meals.breakfast === 'cafe_leite' && (
                      <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  150ml de leite semi-desnatado
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  P: <strong className="text-slate-800">6g</strong> • C: 9g • G: 4g
                </div>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* ALMOÇO: PRATO CASEIRO PERSONALIZÁVEL */}
          {/* ========================================================= */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                🍽️ Almoço (Prato Caseiro Completo)
              </div>
              <button
                onClick={handleToggleLunch}
                className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all flex items-center gap-1 ${
                  currentData.meals.lunch === 'caseiro'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {currentData.meals.lunch === 'caseiro' ? (
                  <>
                    <Check className="w-3 h-3 stroke-[3]" />
                    Almoço Marcado
                  </>
                ) : (
                  '+ Marcar Almoço'
                )}
              </button>
            </div>

            {/* CARD BUILDER DO PRATO CASEIRO */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              {/* Badge de Totais do Almoço */}
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-black text-slate-800">
                  Total Estimado do Almoço:
                </span>
                <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                  {currentLunchPreview.calories} kcal • P: {currentLunchPreview.protein}g • C: {currentLunchPreview.carbs}g • G: {currentLunchPreview.fat}g
                </span>
              </div>

              {/* 1. Escolha da Proteína */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                  1. Proteína Principal
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'carne', label: '🥩 Bife Bovino', sub: '~100g/bife (28g P)' },
                    { id: 'frango', label: '🍗 Filé Frango', sub: '~120g/filé (32g P)' },
                    { id: 'peixe', label: '🐟 Filé Peixe', sub: '~120g/filé (26g P)' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleUpdateLunchConfig({ proteinType: item.id as any })}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        lunchConfig.proteinType === item.id
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-black truncate">{item.label}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{item.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Contadores de Porções (Bifes, Arroz, Feijão) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Quantidade de Bifes/Filés */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      {lunchConfig.proteinType === 'carne' ? 'Bifes' : 'Filés'}
                    </div>
                    <div className="text-xs font-black text-slate-800">
                      {lunchConfig.proteinPortions}x ({lunchConfig.proteinPortions * (lunchConfig.proteinType === 'carne' ? 100 : 120)}g)
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleUpdateLunchConfig({ proteinPortions: Math.max(1, lunchConfig.proteinPortions - 1) })}
                      disabled={lunchConfig.proteinPortions <= 1}
                      className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs disabled:opacity-30"
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleUpdateLunchConfig({ proteinPortions: Math.min(5, lunchConfig.proteinPortions + 1) })}
                      disabled={lunchConfig.proteinPortions >= 5}
                      className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Quantidade de Arroz */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Arroz Branco
                    </div>
                    <div className="text-xs font-black text-slate-800">
                      {lunchConfig.ricePortions}x {lunchConfig.ricePortions === 1 ? 'concha' : 'conchas'} (~{lunchConfig.ricePortions * 100}g)
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleUpdateLunchConfig({ ricePortions: Math.max(0, lunchConfig.ricePortions - 1) })}
                      disabled={lunchConfig.ricePortions <= 0}
                      className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs disabled:opacity-30"
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleUpdateLunchConfig({ ricePortions: Math.min(4, lunchConfig.ricePortions + 1) })}
                      disabled={lunchConfig.ricePortions >= 4}
                      className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Quantidade de Feijão */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">
                      Feijão Carioca
                    </div>
                    <div className="text-xs font-black text-slate-800">
                      {lunchConfig.beanPortions}x {lunchConfig.beanPortions === 1 ? 'concha' : 'conchas'} (~{lunchConfig.beanPortions * 80}g)
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleUpdateLunchConfig({ beanPortions: Math.max(0, lunchConfig.beanPortions - 1) })}
                      disabled={lunchConfig.beanPortions <= 0}
                      className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs disabled:opacity-30"
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleUpdateLunchConfig({ beanPortions: Math.min(3, lunchConfig.beanPortions + 1) })}
                      disabled={lunchConfig.beanPortions >= 3}
                      className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Toggle de Salada */}
              <button
                onClick={() => handleUpdateLunchConfig({ hasSalad: !lunchConfig.hasSalad })}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                  lunchConfig.hasSalad
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <span>🥗 Salada Verde (Folhas, tomate e azeite sutil)</span>
                <span className="text-[10px] font-black">
                  {lunchConfig.hasSalad ? 'INCLUSA (+35 kcal)' : 'NÃO INCLUSA'}
                </span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* LANCHE DA TARDE */}
          {/* ========================================================= */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                🥪 Lanche da Tarde
              </div>
              {currentData.meals.snack && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {snackMacros.calories} kcal • {snackMacros.protein}g Prot
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                {
                  id: 'sem_lanche',
                  label: 'Sem lanche',
                  sub: 'Jejum até jantar',
                  kcal: '0 kcal',
                  macros: 'P: 0g • C: 0g'
                },
                {
                  id: 'cafe_tapioca',
                  label: 'Tapioca + Café c/ Leite',
                  sub: 'Queijo (30g)',
                  kcal: '340 kcal',
                  macros: 'P: 14g • C: 42g'
                },
                {
                  id: 'shake',
                  label: 'Shake Proteico',
                  sub: 'Whey + Leite',
                  kcal: '240 kcal',
                  macros: 'P: 25g • C: 25g'
                },
                {
                  id: 'tapioca_cafe',
                  label: 'Tapioca c/ Café Puro',
                  sub: 'Energia leve',
                  kcal: '175 kcal',
                  macros: 'P: 3g • C: 38g'
                }
              ].map((opt) => {
                const isSelected = currentData.meals.snack === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectSnack(opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="truncate pr-1">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3] shrink-0" />}
                    </div>
                    <div className="text-[9px] font-bold text-amber-700 mt-0.5">{opt.kcal}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{opt.macros}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================= */}
          {/* JANTAR: SUBWAY COMPLETO OU PRATO CASEIRO */}
          {/* ========================================================= */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                🌙 Jantar (2 Opções: Subway Completo ou Caseiro)
              </div>
              {currentData.meals.dinner && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {dinnerMacros.calories} kcal • {dinnerMacros.protein}g Prot
                </span>
              )}
            </div>

            {/* TAB SELECTOR: SUBWAY vs PRATO CASEIRO */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => handleSelectDinnerType('subway')}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                  currentData.meals.dinner === 'subway'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-950 font-black shadow-2xs ring-1 ring-blue-500'
                    : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100 text-slate-700 font-bold'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black">
                  <span>🥖 Subway Completo</span>
                  {currentData.meals.dinner === 'subway' && (
                    <Check className="w-4 h-4 text-blue-600 stroke-[3]" />
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                  Chipotle + Parmesão + Mussarela
                </div>
                <div className="text-[10px] font-bold text-amber-700 mt-1">
                  ~{currentSubwayPreview.calories} kcal ({currentSubwayPreview.protein}g Prot)
                </div>
              </button>

              <button
                onClick={() => handleSelectDinnerType('caseiro')}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                  currentData.meals.dinner === 'caseiro'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-950 font-black shadow-2xs ring-1 ring-blue-500'
                    : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100 text-slate-700 font-bold'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black">
                  <span>🍽️ Prato Caseiro</span>
                  {currentData.meals.dinner === 'caseiro' && (
                    <Check className="w-4 h-4 text-blue-600 stroke-[3]" />
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                  Arroz, feijão, proteína & salada
                </div>
                <div className="text-[10px] font-bold text-amber-700 mt-1">
                  ~{currentDinnerPlatePreview.calories} kcal ({currentDinnerPlatePreview.protein}g Prot)
                </div>
              </button>
            </div>

            {/* SE SUBWAY SELECIONADO: CONTROLES DO SUBWAY COMPLETO */}
            {currentData.meals.dinner === 'subway' && (
              <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3 animate-in fade-in duration-150">
                {/* Tamanho: 15cm ou 30cm (Dobro) */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block mb-1">
                    Tamanho do Sanduíche
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleUpdateSubwayConfig({ size: '15cm' })}
                      className={`py-2 rounded-xl text-xs font-black border transition-all ${
                        dinnerSubwayConfig.size === '15cm'
                          ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      15 cm Padrão
                    </button>
                    <button
                      onClick={() => handleUpdateSubwayConfig({ size: '30cm' })}
                      className={`py-2 rounded-xl text-xs font-black border transition-all ${
                        dinnerSubwayConfig.size === '30cm'
                          ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      30 cm (Dobro Completo)
                    </button>
                  </div>
                </div>

                {/* Sabor / Proteína */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 block mb-1">
                    Recheio Principal
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleUpdateSubwayConfig({ protein: 'frango_teriyaki' })}
                      className={`p-2 rounded-xl text-xs font-black border text-left transition-all ${
                        dinnerSubwayConfig.protein === 'frango_teriyaki'
                          ? 'border-blue-600 bg-white text-blue-900 shadow-2xs ring-1 ring-blue-500'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <div>🍗 Frango Teriyaki</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {dinnerSubwayConfig.size === '30cm' ? '64g Prot • 920 kcal' : '32g Prot • 460 kcal'}
                      </div>
                    </button>

                    <button
                      onClick={() => handleUpdateSubwayConfig({ protein: 'carne' })}
                      className={`p-2 rounded-xl text-xs font-black border text-left transition-all ${
                        dinnerSubwayConfig.protein === 'carne'
                          ? 'border-blue-600 bg-white text-blue-900 shadow-2xs ring-1 ring-blue-500'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <div>🥩 Carne / Bife</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {dinnerSubwayConfig.size === '30cm' ? '60g Prot • 980 kcal' : '30g Prot • 490 kcal'}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Lista fixa de acompanhamentos do combo completo */}
                <div className="p-2.5 rounded-xl bg-white border border-blue-200/80 text-[11px] text-slate-600">
                  <span className="font-bold text-blue-950">Ingredientes Inclusos: </span>
                  Molho Chipotle, Queijo Parmesão Ralado, Queijo Mussarela e Salada Completa (Alface, Tomate, Pepino e Cebola).
                </div>
              </div>
            )}

            {/* SE PRATO CASEIRO SELECIONADO: BUILDER DO JANTAR CASEIRO */}
            {currentData.meals.dinner === 'caseiro' && (
              <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3 animate-in fade-in duration-150">
                {/* 1. Escolha da Proteína */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Proteína Principal do Jantar
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'carne', label: '🥩 Bife Bovino', sub: '~100g' },
                      { id: 'frango', label: '🍗 Filé Frango', sub: '~120g' },
                      { id: 'peixe', label: '🐟 Filé Peixe', sub: '~120g' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleUpdateDinnerPlateConfig({ proteinType: item.id as any })}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          dinnerPlateConfig.proteinType === item.id
                            ? 'border-blue-600 bg-white text-blue-900 font-bold shadow-2xs'
                            : 'border-slate-200 bg-white/70 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <div className="text-xs font-black truncate">{item.label}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{item.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Contadores de Porções */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">
                        {dinnerPlateConfig.proteinType === 'carne' ? 'Bifes' : 'Filés'}
                      </div>
                      <div className="text-xs font-black text-slate-800">
                        {dinnerPlateConfig.proteinPortions}x
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateDinnerPlateConfig({ proteinPortions: Math.max(1, dinnerPlateConfig.proteinPortions - 1) })}
                        disabled={dinnerPlateConfig.proteinPortions <= 1}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs disabled:opacity-30"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleUpdateDinnerPlateConfig({ proteinPortions: Math.min(5, dinnerPlateConfig.proteinPortions + 1) })}
                        disabled={dinnerPlateConfig.proteinPortions >= 5}
                        className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">
                        Arroz Branco
                      </div>
                      <div className="text-xs font-black text-slate-800">
                        {dinnerPlateConfig.ricePortions}x conchas
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateDinnerPlateConfig({ ricePortions: Math.max(0, dinnerPlateConfig.ricePortions - 1) })}
                        disabled={dinnerPlateConfig.ricePortions <= 0}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs disabled:opacity-30"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleUpdateDinnerPlateConfig({ ricePortions: Math.min(4, dinnerPlateConfig.ricePortions + 1) })}
                        disabled={dinnerPlateConfig.ricePortions >= 4}
                        className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">
                        Feijão
                      </div>
                      <div className="text-xs font-black text-slate-800">
                        {dinnerPlateConfig.beanPortions}x conchas
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdateDinnerPlateConfig({ beanPortions: Math.max(0, dinnerPlateConfig.beanPortions - 1) })}
                        disabled={dinnerPlateConfig.beanPortions <= 0}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs disabled:opacity-30"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleUpdateDinnerPlateConfig({ beanPortions: Math.min(3, dinnerPlateConfig.beanPortions + 1) })}
                        disabled={dinnerPlateConfig.beanPortions >= 3}
                        className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Salada */}
                <button
                  onClick={() => handleUpdateDinnerPlateConfig({ hasSalad: !dinnerPlateConfig.hasSalad })}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                    dinnerPlateConfig.hasSalad
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  <span>🥗 Salada Verde</span>
                  <span className="text-[10px] font-black">
                    {dinnerPlateConfig.hasSalad ? 'INCLUSA (+35 kcal)' : 'NÃO INCLUSA'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4. HIDRATAÇÃO DIÁRIA (META 4.0L) */}
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
                  Cookie 150g, Eskibom, pedaço de bolo.
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
                  Rodízio, pizza inteira, hambúrguer duplo + fritas.
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
