import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db/db';
import type {
  NutritionLog,
  PlateConfig,
  ChurrascoConfig,
  SubwayConfig,
  BurgerConfig,
  PizzaConfig,
  CustomMealConfig,
  DetailedEscapes,
  LunchType,
  DinnerType
} from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { triggerHaptic } from '../utils/audio';
import {
  Droplets,
  Check,
  Sparkles,
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Plus,
  Minus,
  Target,
  Flame
} from 'lucide-react';

export const DEFAULT_LUNCH_CONFIG: PlateConfig = {
  proteinType: 'carne',
  proteinPortions: 2,
  ricePortions: 2,
  beanPortions: 1,
  hasSalad: true
};

export const DEFAULT_CHURRASCO_CONFIG: ChurrascoConfig = {
  cut: 'alcatra',
  skewerCount: 2,
  baiaoPortions: 1,
  hasFarofa: false,
  hasVinagrete: true
};

export const DEFAULT_SUBWAY_CONFIG: SubwayConfig = {
  protein: 'frango_teriyaki',
  size: '15cm'
};

export const DEFAULT_DINNER_PLATE_CONFIG: PlateConfig = {
  proteinType: 'carne',
  proteinPortions: 2,
  ricePortions: 2,
  beanPortions: 1,
  hasSalad: true
};

export const DEFAULT_BURGER_CONFIG: BurgerConfig = {
  style: 'artesanal_simples',
  count: 1,
  hasFries: false
};

export const DEFAULT_PIZZA_CONFIG: PizzaConfig = {
  flavorType: 'proteica',
  slices: 3
};

export const DEFAULT_BREAKFAST_CONFIG: CustomMealConfig = {
  coffeeWithMilkCups: 1,
  tapiocaCount: 0,
  eggType: 'mexidos',
  eggCount: 2,
  fruitType: 'banana',
  fruitCount: 0
};

export const DEFAULT_SNACK_CONFIG: CustomMealConfig = {
  coffeeWithMilkCups: 0,
  tapiocaCount: 0,
  eggType: 'mexidos',
  eggCount: 0,
  fruitType: 'banana',
  fruitCount: 1,
  shakeCount: 0
};

// ============================================================================
// CÁLCULOS NUTRICIONAIS PRECISOS (EXPORTADOS PARA EVOLUTIONSCREEN)
// ============================================================================

export function calculatePlateMacros(config: PlateConfig = DEFAULT_LUNCH_CONFIG) {
  const pCount = config.proteinPortions ?? 2;
  const rCount = config.ricePortions ?? 2;
  const bCount = config.beanPortions ?? 1;
  const salad = config.hasSalad ?? true;

  let protPerPortion = { protein: 28, carbs: 0, fat: 9, calories: 195 };
  if (config.proteinType === 'frango') {
    protPerPortion = { protein: 32, carbs: 0, fat: 4, calories: 165 };
  } else if (config.proteinType === 'peixe') {
    protPerPortion = { protein: 26, carbs: 0, fat: 3, calories: 135 };
  }

  const ricePerPortion = { protein: 2.5, carbs: 28, fat: 0.5, calories: 130 };
  const beanPerPortion = { protein: 6, carbs: 14, fat: 1, calories: 90 };
  const saladMacros = salad
    ? { protein: 1, carbs: 4, fat: 2, calories: 35 }
    : { protein: 0, carbs: 0, fat: 0, calories: 0 };

  const protein = Math.round(
    pCount * protPerPortion.protein +
      rCount * ricePerPortion.protein +
      bCount * beanPerPortion.protein +
      saladMacros.protein
  );
  const carbs = Math.round(
    pCount * protPerPortion.carbs +
      rCount * ricePerPortion.carbs +
      bCount * beanPerPortion.carbs +
      saladMacros.carbs
  );
  const fat = Math.round(
    pCount * protPerPortion.fat +
      rCount * ricePerPortion.fat +
      bCount * beanPerPortion.fat +
      saladMacros.fat
  );
  const calories = Math.round(
    pCount * protPerPortion.calories +
      rCount * ricePerPortion.calories +
      bCount * beanPerPortion.calories +
      saladMacros.calories
  );

  return { protein, carbs, fat, calories };
}

export function calculateChurrascoMacros(
  config: ChurrascoConfig = DEFAULT_CHURRASCO_CONFIG
) {
  const skewers = config.skewerCount ?? 2;
  const baiao = config.baiaoPortions ?? 1;
  const farofa = config.hasFarofa ?? false;
  const vinagrete = config.hasVinagrete ?? true;

  // Valores por espeto (~110g de carne assada pronta)
  let cutPerSkewer = { protein: 31, carbs: 0, fat: 10, calories: 220 }; // Alcatra
  if (config.cut === 'maminha') {
    cutPerSkewer = { protein: 29, carbs: 0, fat: 12, calories: 235 };
  } else if (config.cut === 'fraldinha') {
    cutPerSkewer = { protein: 27, carbs: 0, fat: 16, calories: 260 };
  }

  // Baião de dois (~130g concha/porção)
  const baiaoPerPortion = { protein: 9, carbs: 34, fat: 6, calories: 230 };
  const farofaMacros = farofa
    ? { protein: 1, carbs: 15, fat: 2, calories: 75 }
    : { protein: 0, carbs: 0, fat: 0, calories: 0 };
  const vinagreteMacros = vinagrete
    ? { protein: 0.5, carbs: 5, fat: 0.5, calories: 25 }
    : { protein: 0, carbs: 0, fat: 0, calories: 0 };

  return {
    protein: Math.round(
      skewers * cutPerSkewer.protein +
        baiao * baiaoPerPortion.protein +
        farofaMacros.protein +
        vinagreteMacros.protein
    ),
    carbs: Math.round(
      skewers * cutPerSkewer.carbs +
        baiao * baiaoPerPortion.carbs +
        farofaMacros.carbs +
        vinagreteMacros.carbs
    ),
    fat: Math.round(
      skewers * cutPerSkewer.fat +
        baiao * baiaoPerPortion.fat +
        farofaMacros.fat +
        vinagreteMacros.fat
    ),
    calories: Math.round(
      skewers * cutPerSkewer.calories +
        baiao * baiaoPerPortion.calories +
        farofaMacros.calories +
        vinagreteMacros.calories
    )
  };
}

export function calculateSubwayMacros(config: SubwayConfig = DEFAULT_SUBWAY_CONFIG) {
  const mult = config.size === '30cm' ? 2 : 1;
  if (config.protein === 'carne') {
    return {
      protein: 30 * mult,
      carbs: 46 * mult,
      fat: 20 * mult,
      calories: 490 * mult
    };
  }
  return {
    protein: 32 * mult,
    carbs: 48 * mult,
    fat: 16 * mult,
    calories: 460 * mult
  };
}

export function calculateBurgerMacros(config: BurgerConfig = DEFAULT_BURGER_CONFIG) {
  const count = config.count ?? 1;
  let base = { protein: 34, carbs: 42, fat: 34, calories: 620 }; // Artesanal simples
  if (config.style === 'artesanal_duplo') {
    base = { protein: 58, carbs: 45, fat: 58, calories: 940 };
  } else if (config.style === 'podrao_xtudo') {
    base = { protein: 46, carbs: 62, fat: 68, calories: 1050 };
  }

  const fries = config.hasFries
    ? { protein: 4, carbs: 48, fat: 18, calories: 380 }
    : { protein: 0, carbs: 0, fat: 0, calories: 0 };

  return {
    protein: base.protein * count + fries.protein,
    carbs: base.carbs * count + fries.carbs,
    fat: base.fat * count + fries.fat,
    calories: base.calories * count + fries.calories
  };
}

export function calculatePizzaMacros(config: PizzaConfig = DEFAULT_PIZZA_CONFIG) {
  const slices = config.slices ?? 3;
  // Por fatia média (1/8 de pizza grande)
  const perSlice =
    config.flavorType === 'proteica'
      ? { protein: 14, carbs: 28, fat: 12, calories: 285 }
      : { protein: 12, carbs: 29, fat: 17, calories: 320 };

  return {
    protein: perSlice.protein * slices,
    carbs: perSlice.carbs * slices,
    fat: perSlice.fat * slices,
    calories: perSlice.calories * slices
  };
}

export function calculateCustomMealMacros(config: CustomMealConfig) {
  const coffeeCups = config.coffeeWithMilkCups || 0;
  const tapiocas = config.tapiocaCount || 0;
  const eggs = config.eggCount || 0;
  const eggType = config.eggType || 'mexidos';
  const fruits = config.fruitCount || 0;
  const fruitType = config.fruitType || 'banana';
  const shakes = config.shakeCount || 0;

  const coffeeP = coffeeCups * 6;
  const coffeeC = coffeeCups * 9;
  const coffeeF = coffeeCups * 4;
  const coffeeKcal = coffeeCups * 95;

  const tapP = tapiocas * 10;
  const tapC = tapiocas * 33;
  const tapF = tapiocas * 8;
  const tapKcal = tapiocas * 240;

  const eggPerUnit =
    eggType === 'fritos'
      ? { p: 6, c: 0.6, f: 7, kcal: 90 }
      : { p: 6, c: 0.6, f: 5.5, kcal: 80 };
  const eggP = eggs * eggPerUnit.p;
  const eggC = eggs * eggPerUnit.c;
  const eggF = eggs * eggPerUnit.f;
  const eggKcal = eggs * eggPerUnit.kcal;

  let fruitPerUnit = { p: 1.3, c: 26, f: 0.3, kcal: 105 };
  if (fruitType === 'laranja') {
    fruitPerUnit = { p: 1.2, c: 15, f: 0.2, kcal: 62 };
  } else if (fruitType === 'maca') {
    fruitPerUnit = { p: 0.4, c: 19, f: 0.2, kcal: 75 };
  }
  const fruitP = fruits * fruitPerUnit.p;
  const fruitC = fruits * fruitPerUnit.c;
  const fruitF = fruits * fruitPerUnit.f;
  const fruitKcal = fruits * fruitPerUnit.kcal;

  const shakeP = shakes * 25;
  const shakeC = shakes * 20;
  const shakeF = shakes * 3;
  const shakeKcal = shakes * 210;

  return {
    protein: Math.round(coffeeP + tapP + eggP + fruitP + shakeP),
    carbs: Math.round(coffeeC + tapC + eggC + fruitC + shakeC),
    fat: Math.round(coffeeF + tapF + eggF + fruitF + shakeF),
    calories: Math.round(coffeeKcal + tapKcal + eggKcal + fruitKcal + shakeKcal)
  };
}

export function calculateEscapesMacros(escapes?: DetailedEscapes) {
  if (!escapes) return { protein: 0, carbs: 0, fat: 0, calories: 0 };

  const chocSmall = escapes.chocSmallCount || 0;
  const snickers = escapes.snickersBarCount || 0;
  const iceCream = escapes.iceCreamCount || 0;
  const saltySnack = escapes.saltySnackCount || 0;
  const legacyBesteira = escapes.besteiraCount || 0;
  const superBesteira = escapes.superBesteiraCount || 0;

  return {
    protein:
      chocSmall * 1 +
      snickers * 4 +
      iceCream * 5 +
      saltySnack * 6 +
      legacyBesteira * 6 +
      superBesteira * 35,
    carbs:
      chocSmall * 16 +
      snickers * 30 +
      iceCream * 44 +
      saltySnack * 52 +
      legacyBesteira * 65 +
      superBesteira * 120,
    fat:
      chocSmall * 7 +
      snickers * 12 +
      iceCream * 20 +
      saltySnack * 24 +
      legacyBesteira * 30 +
      superBesteira * 65,
    calories:
      chocSmall * 130 +
      snickers * 250 +
      iceCream * 380 +
      saltySnack * 450 +
      legacyBesteira * 600 +
      superBesteira * 1200
  };
}

export function getResolvedBreakfastConfig(log: NutritionLog): CustomMealConfig {
  if (log.breakfastConfig) return log.breakfastConfig;
  const legacyMeal = log.meals?.breakfast;
  const legacyEggs = log.breakfastEggCount ?? 2;

  if (legacyMeal === 'tapioca') {
    return {
      coffeeWithMilkCups: 1,
      tapiocaCount: 1,
      eggType: 'mexidos',
      eggCount: 0,
      fruitType: 'banana',
      fruitCount: 0
    };
  }
  if (legacyMeal === 'ovos') {
    return {
      coffeeWithMilkCups: 1,
      tapiocaCount: 0,
      eggType: 'mexidos',
      eggCount: legacyEggs,
      fruitType: 'banana',
      fruitCount: 0
    };
  }
  if (legacyMeal === '') {
    return {
      coffeeWithMilkCups: 0,
      tapiocaCount: 0,
      eggType: 'mexidos',
      eggCount: 0,
      fruitType: 'banana',
      fruitCount: 0
    };
  }
  return DEFAULT_BREAKFAST_CONFIG;
}

export function getResolvedSnackConfig(log: NutritionLog): CustomMealConfig {
  if (log.snackConfig) return log.snackConfig;
  const legacySnack = log.meals?.snack;
  if (legacySnack === 'fruta_whey') {
    return {
      coffeeWithMilkCups: 0,
      tapiocaCount: 0,
      eggType: 'mexidos',
      eggCount: 0,
      fruitType: 'banana',
      fruitCount: 1,
      shakeCount: 1
    };
  }
  if (legacySnack === 'sanduiche') {
    return {
      coffeeWithMilkCups: 1,
      tapiocaCount: 1,
      eggType: 'mexidos',
      eggCount: 2,
      fruitType: 'banana',
      fruitCount: 0,
      shakeCount: 0
    };
  }
  return {
    coffeeWithMilkCups: 0,
    tapiocaCount: 0,
    eggType: 'mexidos',
    eggCount: 0,
    fruitType: 'banana',
    fruitCount: 0,
    shakeCount: 0
  };
}

// ============================================================================
// COMPONENTE DE BADGES DE MACROS SEMÂNTICOS (SEM SIGLAS P / C / G CONFUSAS)
// ============================================================================
const MacroPills: React.FC<{
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  unitLabel?: string;
}> = ({ calories, protein, carbs, fat, unitLabel }) => (
  <div className="flex items-center gap-1.5 flex-wrap mt-1">
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-200/80 text-slate-800">
      {calories} kcal{unitLabel ? ` / ${unitLabel}` : ''}
    </span>
    {protein !== undefined && protein > 0 && (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
        {protein}g Prot
      </span>
    )}
    {carbs !== undefined && carbs > 0 && (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {carbs}g Carbo
      </span>
    )}
    {fat !== undefined && fat > 0 && (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        {fat}g Gord
      </span>
    )}
  </div>
);

// ============================================================================
// COMPONENT: CustomMealBuilder para Café da Manhã e Lanche da Tarde
// ============================================================================
const CustomMealBuilder: React.FC<{
  emoji: string;
  title: string;
  subtitle: string;
  config: CustomMealConfig;
  onChange: (patch: Partial<CustomMealConfig>) => void;
  allowShake?: boolean;
  defaultOpen?: boolean;
}> = ({ emoji, title, subtitle, config, onChange, allowShake, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const macros = calculateCustomMealMacros(config);
  const isEaten =
    config.coffeeWithMilkCups > 0 ||
    config.tapiocaCount > 0 ||
    config.eggCount > 0 ||
    config.fruitCount > 0 ||
    (config.shakeCount || 0) > 0;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/40 overflow-hidden transition-all">
      {/* Cabeçalho Acordeão da Refeição */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic('light');
          setIsOpen(!isOpen);
        }}
        className="w-full p-3.5 bg-white hover:bg-slate-50/80 flex items-center justify-between gap-2 text-left transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-base shrink-0 shadow-2xs">
            {emoji}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 truncate">
              {title}
            </h4>
            <p className="text-[10px] text-slate-500 font-medium truncate">
              {isEaten
                ? `${macros.calories} kcal • ${macros.protein}g Proteína • ${macros.carbs}g Carbo`
                : subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEaten ? (
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {macros.calories} kcal
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
              Vazio
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 pt-2 space-y-2 border-t border-slate-100 animate-in fade-in duration-150">
          {/* 1. Café c/ Leite */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">☕🥛</span>
                <span className="text-xs font-black text-slate-900">Café com Leite</span>
              </div>
              <MacroPills calories={95} protein={6} carbs={9} fat={4} unitLabel="caneca" />
            </div>

            <div className="flex items-center gap-1 shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() =>
                  onChange({ coffeeWithMilkCups: Math.max(0, config.coffeeWithMilkCups - 1) })
                }
                disabled={config.coffeeWithMilkCups <= 0}
                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs disabled:opacity-30 shadow-2xs active:scale-90 transition-transform"
                aria-label="Diminuir café com leite"
              >
                -
              </button>
              <span className="w-5 text-center font-black text-xs text-slate-900">
                {config.coffeeWithMilkCups}
              </span>
              <button
                onClick={() =>
                  onChange({ coffeeWithMilkCups: Math.min(5, config.coffeeWithMilkCups + 1) })
                }
                disabled={config.coffeeWithMilkCups >= 5}
                className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-30 shadow-2xs active:scale-90 transition-transform"
                aria-label="Aumentar café com leite"
              >
                +
              </button>
            </div>
          </div>

          {/* 2. Tapioca c/ Queijo */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🌮🧀</span>
                <span className="text-xs font-black text-slate-900">Tapioca com Queijo</span>
              </div>
              <MacroPills calories={240} protein={10} carbs={33} fat={8} unitLabel="un" />
            </div>

            <div className="flex items-center gap-1 shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => onChange({ tapiocaCount: Math.max(0, config.tapiocaCount - 1) })}
                disabled={config.tapiocaCount <= 0}
                className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs disabled:opacity-30 shadow-2xs active:scale-90 transition-transform"
                aria-label="Diminuir tapioca"
              >
                -
              </button>
              <span className="w-5 text-center font-black text-xs text-slate-900">
                {config.tapiocaCount}
              </span>
              <button
                onClick={() => onChange({ tapiocaCount: Math.min(4, config.tapiocaCount + 1) })}
                disabled={config.tapiocaCount >= 4}
                className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-30 shadow-2xs active:scale-90 transition-transform"
                aria-label="Aumentar tapioca"
              >
                +
              </button>
            </div>
          </div>

          {/* 3. Ovos (Mexidos ou Fritos) */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🍳🥚</span>
                  <span className="text-xs font-black text-slate-900">
                    Ovos ({config.eggType === 'fritos' ? 'Fritos' : 'Mexidos'})
                  </span>
                </div>
                <MacroPills
                  calories={config.eggType === 'fritos' ? 90 : 80}
                  protein={6}
                  fat={config.eggType === 'fritos' ? 7 : 6}
                  unitLabel="ovo"
                />
              </div>

              <div className="flex items-center gap-1 shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => onChange({ eggCount: Math.max(0, config.eggCount - 1) })}
                  disabled={config.eggCount <= 0}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs disabled:opacity-30 shadow-2xs active:scale-90 transition-transform"
                  aria-label="Diminuir ovos"
                >
                  -
                </button>
                <span className="w-5 text-center font-black text-xs text-slate-900">
                  {config.eggCount}
                </span>
                <button
                  onClick={() => onChange({ eggCount: Math.min(8, config.eggCount + 1) })}
                  disabled={config.eggCount >= 8}
                  className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-30 shadow-2xs active:scale-90 transition-transform"
                  aria-label="Aumentar ovos"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onChange({ eggType: 'mexidos' })}
                className={`py-1.5 px-2 rounded-lg text-xs font-black border transition-all ${
                  config.eggType === 'mexidos'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🍳 Mexidos (~80 kcal)
              </button>
              <button
                onClick={() => onChange({ eggType: 'fritos' })}
                className={`py-1.5 px-2 rounded-lg text-xs font-black border transition-all ${
                  config.eggType === 'fritos'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🥚 Fritos (~90 kcal)
              </button>
            </div>
          </div>

          {/* 4. Frutas (Banana, Laranja ou Maçã) */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">
                    {config.fruitType === 'banana'
                      ? '🍌'
                      : config.fruitType === 'laranja'
                      ? '🍊'
                      : '🍎'}
                  </span>
                  <span className="text-xs font-black text-slate-900">Fruta Fresca</span>
                </div>
                <MacroPills
                  calories={
                    config.fruitType === 'banana'
                      ? 105
                      : config.fruitType === 'laranja'
                      ? 62
                      : 75
                  }
                  protein={1}
                  carbs={
                    config.fruitType === 'banana'
                      ? 26
                      : config.fruitType === 'laranja'
                      ? 15
                      : 19
                  }
                  unitLabel="un"
                />
              </div>

              <div className="flex items-center gap-1 shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => onChange({ fruitCount: Math.max(0, config.fruitCount - 1) })}
                  disabled={config.fruitCount <= 0}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs disabled:opacity-30 shadow-2xs active:scale-90 transition-transform"
                  aria-label="Diminuir fruta"
                >
                  -
                </button>
                <span className="w-5 text-center font-black text-xs text-slate-900">
                  {config.fruitCount}
                </span>
                <button
                  onClick={() => onChange({ fruitCount: Math.min(4, config.fruitCount + 1) })}
                  disabled={config.fruitCount >= 4}
                  className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-30 shadow-2xs active:scale-90 transition-transform"
                  aria-label="Aumentar fruta"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onChange({ fruitType: 'banana' })}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-black border transition-all text-center ${
                  config.fruitType === 'banana'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🍌 Banana
              </button>
              <button
                onClick={() => onChange({ fruitType: 'laranja' })}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-black border transition-all text-center ${
                  config.fruitType === 'laranja'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🍊 Laranja
              </button>
              <button
                onClick={() => onChange({ fruitType: 'maca' })}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-black border transition-all text-center ${
                  config.fruitType === 'maca'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🍎 Maçã
              </button>
            </div>
          </div>

          {/* 5. Shake Proteico (se permitido) */}
          {allowShake && (
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs">
              <div className="min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🥤⚡</span>
                  <span className="text-xs font-black text-slate-900">Shake Proteico</span>
                </div>
                <MacroPills calories={210} protein={25} carbs={20} fat={3} unitLabel="shake" />
              </div>

              <div className="flex items-center gap-1 shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() =>
                    onChange({ shakeCount: Math.max(0, (config.shakeCount || 0) - 1) })
                  }
                  disabled={(config.shakeCount || 0) <= 0}
                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs disabled:opacity-30 shadow-2xs active:scale-90 transition-transform"
                  aria-label="Diminuir shake"
                >
                  -
                </button>
                <span className="w-5 text-center font-black text-xs text-slate-900">
                  {config.shakeCount || 0}
                </span>
                <button
                  onClick={() =>
                    onChange({ shakeCount: Math.min(3, (config.shakeCount || 0) + 1) })
                  }
                  disabled={(config.shakeCount || 0) >= 3}
                  className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-30 shadow-2xs active:scale-90 transition-transform"
                  aria-label="Aumentar shake"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENT: ChurrascoBuilder (Usado no Almoço e opcionalmente no Jantar)
// ============================================================================
const ChurrascoBuilder: React.FC<{
  config: ChurrascoConfig;
  onChange: (patch: Partial<ChurrascoConfig>) => void;
}> = ({ config, onChange }) => {
  const preview = calculateChurrascoMacros(config);

  return (
    <div className="p-3.5 rounded-2xl border border-amber-200/90 bg-amber-50/30 space-y-3 animate-in fade-in duration-150">
      {/* Resumo Estimado do Churrasquinho */}
      <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
          <span>🔥🍢</span> Total do Churrasquinho:
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-lg">
            {preview.calories} kcal
          </span>
          <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/60">
            {preview.protein}g Prot
          </span>
        </div>
      </div>

      {/* 1. Escolha do Corte do Espeto */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
          1. Corte do Espeto (~110g carne assada/espeto)
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'alcatra', label: '🥩 Alcatra', sub: '220 kcal • 31g Prot' },
            { id: 'maminha', label: '🥩 Maminha', sub: '235 kcal • 29g Prot' },
            { id: 'fraldinha', label: '🥩 Fraldinha', sub: '260 kcal • 27g Prot' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange({ cut: item.id as any })}
              className={`p-2 rounded-xl border text-center transition-all active:scale-95 ${
                config.cut === item.id
                  ? 'border-amber-600 bg-white text-amber-950 font-black shadow-2xs ring-1 ring-amber-500'
                  : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-white'
              }`}
            >
              <div className="text-xs font-black truncate">{item.label}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{item.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Quantidade de Espetos & Porções de Baião de Dois */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              🍢 Espetos
            </div>
            <div className="text-xs font-black text-slate-900">
              {config.skewerCount}x {config.skewerCount === 1 ? 'espeto' : 'espetos'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChange({ skewerCount: Math.max(1, config.skewerCount - 1) })}
              disabled={config.skewerCount <= 1}
              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs disabled:opacity-30"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => onChange({ skewerCount: Math.min(5, config.skewerCount + 1) })}
              disabled={config.skewerCount >= 5}
              className="w-6 h-6 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              🍛 Baião de Dois
            </div>
            <div className="text-xs font-black text-slate-900">
              {config.baiaoPortions}x {config.baiaoPortions === 1 ? 'porção' : 'porções'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChange({ baiaoPortions: Math.max(0, config.baiaoPortions - 1) })}
              disabled={config.baiaoPortions <= 0}
              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs disabled:opacity-30"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => onChange({ baiaoPortions: Math.min(3, config.baiaoPortions + 1) })}
              disabled={config.baiaoPortions >= 3}
              className="w-6 h-6 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 3. Acompanhamentos: Vinagrete & Farofa */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange({ hasVinagrete: !config.hasVinagrete })}
          className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
            config.hasVinagrete
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-slate-200 bg-white text-slate-500'
          }`}
        >
          <span>🍅🥗 Vinagrete</span>
          <span className="text-[10px] font-black">
            {config.hasVinagrete ? '+25 kcal' : 'Sem'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange({ hasFarofa: !config.hasFarofa })}
          className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
            config.hasFarofa
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-slate-200 bg-white text-slate-500'
          }`}
        >
          <span>🥣 Farofa</span>
          <span className="text-[10px] font-black">
            {config.hasFarofa ? '+75 kcal' : 'Sem'}
          </span>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// TELA PRINCIPAL: NutritionScreen
// ============================================================================
export const NutritionScreen: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [escapeToast, setEscapeToast] = useState<string | null>(null);

  const userProfile = useLiveQuery(() => db.userProfile.get('main_user'));
  const targetProtein = userProfile?.targetProteinGrams || 185;
  const targetCalories = userProfile?.targetCaloriesKcal || 2200;
  const targetWaterMl = userProfile?.targetWaterMl || 4000;
  const calorieMode = userProfile?.calorieMode || 'recomposicao';

  const currentLog = useLiveQuery(
    () => db.nutritionLogs.get(selectedDate),
    [selectedDate]
  );

  // Initialize log for selected date if none exists
  useEffect(() => {
    async function ensureLogExists() {
      const existing = await db.nutritionLogs.get(selectedDate);
      if (!existing) {
        await db.nutritionLogs.put({
          date: selectedDate,
          tookWhey: false,
          wheyScoops: 0,
          milkGlasses: 0,
          meals: {
            breakfast: 'custom',
            lunch: '',
            snack: 'custom',
            dinner: ''
          },
          waterMl: 0,
          escapes: {
            chocSmallCount: 0,
            snickersBarCount: 0,
            iceCreamCount: 0,
            saltySnackCount: 0,
            besteiraCount: 0,
            superBesteiraCount: 0
          },
          breakfastEggCount: 2,
          lunchType: 'caseiro',
          lunchConfig: DEFAULT_LUNCH_CONFIG,
          churrascoConfig: DEFAULT_CHURRASCO_CONFIG,
          dinnerType: 'subway',
          dinnerSubwayConfig: DEFAULT_SUBWAY_CONFIG,
          dinnerPlateConfig: DEFAULT_DINNER_PLATE_CONFIG,
          dinnerChurrascoConfig: DEFAULT_CHURRASCO_CONFIG,
          dinnerBurgerConfig: DEFAULT_BURGER_CONFIG,
          dinnerPizzaConfig: DEFAULT_PIZZA_CONFIG,
          breakfastConfig: DEFAULT_BREAKFAST_CONFIG,
          snackConfig: DEFAULT_SNACK_CONFIG
        });
      }
    }
    ensureLogExists();
  }, [selectedDate]);

  const currentData: NutritionLog = currentLog || {
    date: selectedDate,
    tookWhey: false,
    wheyScoops: 0,
    milkGlasses: 0,
    meals: {
      breakfast: 'custom',
      lunch: '',
      snack: 'custom',
      dinner: ''
    },
    waterMl: 0,
    escapes: {
      chocSmallCount: 0,
      snickersBarCount: 0,
      iceCreamCount: 0,
      saltySnackCount: 0,
      besteiraCount: 0,
      superBesteiraCount: 0
    },
    breakfastEggCount: 2,
    lunchType: 'caseiro',
    lunchConfig: DEFAULT_LUNCH_CONFIG,
    churrascoConfig: DEFAULT_CHURRASCO_CONFIG,
    dinnerType: 'subway',
    dinnerSubwayConfig: DEFAULT_SUBWAY_CONFIG,
    dinnerPlateConfig: DEFAULT_DINNER_PLATE_CONFIG,
    dinnerChurrascoConfig: DEFAULT_CHURRASCO_CONFIG,
    dinnerBurgerConfig: DEFAULT_BURGER_CONFIG,
    dinnerPizzaConfig: DEFAULT_PIZZA_CONFIG,
    breakfastConfig: DEFAULT_BREAKFAST_CONFIG,
    snackConfig: DEFAULT_SNACK_CONFIG
  };

  const wheyScoops = currentData.wheyScoops ?? (currentData.tookWhey ? 2 : 0);
  const wheyProtein = wheyScoops * 20;
  const wheyCalories = wheyScoops * 95;

  const milkGlasses = currentData.milkGlasses ?? 0;
  const milkProtein = milkGlasses * 6;
  const milkCalories = milkGlasses * 110;
  const milkCarbs = milkGlasses * 9;
  const milkFat = milkGlasses * 5;

  const breakfastConfig = getResolvedBreakfastConfig(currentData);
  const snackConfig = getResolvedSnackConfig(currentData);
  const lunchType: LunchType =
    currentData.lunchType ||
    (currentData.meals.lunch === 'churrasquinho' ? 'churrasquinho' : 'caseiro');
  const lunchConfig = currentData.lunchConfig || DEFAULT_LUNCH_CONFIG;
  const churrascoConfig = currentData.churrascoConfig || DEFAULT_CHURRASCO_CONFIG;

  const dinnerSubwayConfig = currentData.dinnerSubwayConfig || DEFAULT_SUBWAY_CONFIG;
  const dinnerPlateConfig = currentData.dinnerPlateConfig || DEFAULT_DINNER_PLATE_CONFIG;
  const dinnerChurrascoConfig =
    currentData.dinnerChurrascoConfig || DEFAULT_CHURRASCO_CONFIG;
  const dinnerBurgerConfig = currentData.dinnerBurgerConfig || DEFAULT_BURGER_CONFIG;
  const dinnerPizzaConfig = currentData.dinnerPizzaConfig || DEFAULT_PIZZA_CONFIG;

  const breakfastMacros = useMemo(
    () => calculateCustomMealMacros(breakfastConfig),
    [breakfastConfig]
  );

  const snackMacros = useMemo(
    () => calculateCustomMealMacros(snackConfig),
    [snackConfig]
  );

  const lunchMacros = useMemo(() => {
    if (!currentData.meals.lunch) {
      return { protein: 0, carbs: 0, fat: 0, calories: 0 };
    }
    if (currentData.meals.lunch === 'churrasquinho') {
      return calculateChurrascoMacros(churrascoConfig);
    }
    return calculatePlateMacros(lunchConfig);
  }, [currentData.meals.lunch, lunchConfig, churrascoConfig]);

  const dinnerMacros = useMemo(() => {
    const dMeal = currentData.meals.dinner;
    if (!dMeal) return { protein: 0, carbs: 0, fat: 0, calories: 0 };
    if (dMeal === 'subway') return calculateSubwayMacros(dinnerSubwayConfig);
    if (dMeal === 'caseiro') return calculatePlateMacros(dinnerPlateConfig);
    if (dMeal === 'churrasquinho') return calculateChurrascoMacros(dinnerChurrascoConfig);
    if (dMeal === 'burger') return calculateBurgerMacros(dinnerBurgerConfig);
    if (dMeal === 'pizza') return calculatePizzaMacros(dinnerPizzaConfig);
    return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  }, [
    currentData.meals.dinner,
    dinnerSubwayConfig,
    dinnerPlateConfig,
    dinnerChurrascoConfig,
    dinnerBurgerConfig,
    dinnerPizzaConfig
  ]);

  const escapeMacros = useMemo(
    () => calculateEscapesMacros(currentData.escapes),
    [currentData.escapes]
  );

  // Totals for the day
  const dailyTotals = useMemo(() => {
    return {
      protein:
        wheyProtein +
        milkProtein +
        breakfastMacros.protein +
        lunchMacros.protein +
        snackMacros.protein +
        dinnerMacros.protein +
        escapeMacros.protein,
      carbs:
        milkCarbs +
        breakfastMacros.carbs +
        lunchMacros.carbs +
        snackMacros.carbs +
        dinnerMacros.carbs +
        escapeMacros.carbs,
      fat:
        milkFat +
        breakfastMacros.fat +
        lunchMacros.fat +
        snackMacros.fat +
        dinnerMacros.fat +
        escapeMacros.fat,
      calories:
        wheyCalories +
        milkCalories +
        breakfastMacros.calories +
        lunchMacros.calories +
        snackMacros.calories +
        dinnerMacros.calories +
        escapeMacros.calories
    };
  }, [
    wheyProtein,
    wheyCalories,
    milkProtein,
    milkCalories,
    milkCarbs,
    milkFat,
    breakfastMacros,
    lunchMacros,
    snackMacros,
    dinnerMacros,
    escapeMacros
  ]);

  const proteinProgress = Math.min(100, Math.round((dailyTotals.protein / targetProtein) * 100));
  const remainingProtein = Math.max(0, targetProtein - dailyTotals.protein);

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

  const handleAdjustMilkGlasses = async (delta: number) => {
    triggerHaptic('light');
    const nextMilk = Math.max(0, Math.min(6, milkGlasses + delta));
    await db.nutritionLogs.update(selectedDate, {
      milkGlasses: nextMilk
    });
  };

  const handleUpdateBreakfastConfig = async (patch: Partial<CustomMealConfig>) => {
    triggerHaptic('light');
    const updated = { ...breakfastConfig, ...patch };
    await db.nutritionLogs.update(selectedDate, {
      breakfastConfig: updated,
      'meals.breakfast': 'custom'
    });
  };

  const handleUpdateSnackConfig = async (patch: Partial<CustomMealConfig>) => {
    triggerHaptic('light');
    const updated = { ...snackConfig, ...patch };
    await db.nutritionLogs.update(selectedDate, {
      snackConfig: updated,
      'meals.snack': 'custom'
    });
  };

  const handleSelectLunchType = async (type: LunchType) => {
    triggerHaptic('light');
    const currentActive = currentData.meals.lunch;
    if (currentActive === type) {
      // Desmarcar se clicar novamente no botão de toggle
      await db.nutritionLogs.update(selectedDate, {
        'meals.lunch': '',
        lunchType: type
      });
    } else {
      await db.nutritionLogs.update(selectedDate, {
        'meals.lunch': type,
        lunchType: type
      });
    }
  };

  const handleUpdateLunchConfig = async (patch: Partial<PlateConfig>) => {
    triggerHaptic('light');
    const updated = { ...lunchConfig, ...patch };
    await db.nutritionLogs.update(selectedDate, {
      lunchConfig: updated,
      lunchType: 'caseiro',
      'meals.lunch': 'caseiro'
    });
  };

  const handleUpdateChurrascoConfig = async (patch: Partial<ChurrascoConfig>) => {
    triggerHaptic('light');
    const updated = { ...churrascoConfig, ...patch };
    await db.nutritionLogs.update(selectedDate, {
      churrascoConfig: updated,
      lunchType: 'churrasquinho',
      'meals.lunch': 'churrasquinho'
    });
  };

  const handleSelectDinnerType = async (type: DinnerType) => {
    triggerHaptic('light');
    const currentDinner = currentData.meals.dinner;
    const nextDinner = currentDinner === type ? '' : type;
    await db.nutritionLogs.update(selectedDate, {
      dinnerType: type,
      'meals.dinner': nextDinner
    });
  };

  const handleUpdateSubwayConfig = async (patch: Partial<SubwayConfig>) => {
    triggerHaptic('light');
    const updated = { ...dinnerSubwayConfig, ...patch };
    await db.nutritionLogs.update(selectedDate, {
      dinnerSubwayConfig: updated,
      dinnerType: 'subway',
      'meals.dinner': 'subway'
    });
  };

  const handleUpdateDinnerPlateConfig = async (patch: Partial<PlateConfig>) => {
    triggerHaptic('light');
    const updated = { ...dinnerPlateConfig, ...patch };
    await db.nutritionLogs.update(selectedDate, {
      dinnerPlateConfig: updated,
      dinnerType: 'caseiro',
      'meals.dinner': 'caseiro'
    });
  };

  const handleUpdateDinnerChurrascoConfig = async (patch: Partial<ChurrascoConfig>) => {
    triggerHaptic('light');
    const updated = { ...dinnerChurrascoConfig, ...patch };
    await db.nutritionLogs.update(selectedDate, {
      dinnerChurrascoConfig: updated,
      dinnerType: 'churrasquinho',
      'meals.dinner': 'churrasquinho'
    });
  };

  const handleUpdateBurgerConfig = async (patch: Partial<BurgerConfig>) => {
    triggerHaptic('light');
    const updated = { ...dinnerBurgerConfig, ...patch };
    await db.nutritionLogs.update(selectedDate, {
      dinnerBurgerConfig: updated,
      dinnerType: 'burger',
      'meals.dinner': 'burger'
    });
  };

  const handleUpdatePizzaConfig = async (patch: Partial<PizzaConfig>) => {
    triggerHaptic('light');
    const updated = { ...dinnerPizzaConfig, ...patch };
    await db.nutritionLogs.update(selectedDate, {
      dinnerPizzaConfig: updated,
      dinnerType: 'pizza',
      'meals.dinner': 'pizza'
    });
  };

  const handleAdjustWater = async (amountMl: number) => {
    triggerHaptic('light');
    const nextWater = Math.max(0, Math.min(8000, currentData.waterMl + amountMl));
    await db.nutritionLogs.update(selectedDate, {
      waterMl: nextWater
    });
  };

  const handleAdjustEscape = async (
    field: keyof DetailedEscapes,
    delta: number,
    label?: string
  ) => {
    triggerHaptic(delta > 0 ? 'medium' : 'light');
    const currentVal = (currentData.escapes?.[field] as number) || 0;
    const nextVal = Math.max(0, currentVal + delta);
    await db.nutritionLogs.update(selectedDate, {
      [`escapes.${field}`]: nextVal
    });

    if (delta > 0 && label) {
      setEscapeToast(`${label} registrado no balanço do dia.`);
      setTimeout(() => {
        setEscapeToast((prev) => (prev?.includes(label) ? null : prev));
      }, 2800);
    }
  };

  const handleShiftDate = (daysDelta: number) => {
    triggerHaptic('light');
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + daysDelta);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === todayStr;
  const parsedDate = new Date(selectedDate + 'T00:00:00');
  const dayNumber = parsedDate.getDate();
  const monthShort = parsedDate
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '')
    .toUpperCase();

  const waterProgress = Math.min(100, Math.round((currentData.waterMl / targetWaterMl) * 100));

  const currentLunchPlatePreview = calculatePlateMacros(lunchConfig);
  const currentLunchChurrascoPreview = calculateChurrascoMacros(churrascoConfig);

  const currentDinnerPlatePreview = calculatePlateMacros(dinnerPlateConfig);
  const currentSubwayPreview = calculateSubwayMacros(dinnerSubwayConfig);
  const currentDinnerChurrascoPreview = calculateChurrascoMacros(dinnerChurrascoConfig);
  const currentBurgerPreview = calculateBurgerMacros(dinnerBurgerConfig);
  const currentPizzaPreview = calculatePizzaMacros(dinnerPizzaConfig);

  const escapeItems: {
    key: keyof DetailedEscapes;
    emoji: string;
    title: string;
    examples: string;
    kcal: number;
    prot: number;
    carbs: number;
    fat: number;
    badgeColor: string;
  }[] = [
    {
      key: 'chocSmallCount',
      emoji: '🍫',
      title: 'Doce Pequeno / Bombom',
      examples: 'Quadradinho de chocolate (25g), Sonho de Valsa, 3x Bis',
      kcal: 130,
      prot: 1,
      carbs: 16,
      fat: 7,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200'
    },
    {
      key: 'snickersBarCount',
      emoji: '🍬🍫',
      title: 'Barra de Chocolate / Snickers',
      examples: 'Snickers (45g), KitKat, Twix, barra recheada média',
      kcal: 250,
      prot: 4,
      carbs: 30,
      fat: 12,
      badgeColor: 'bg-amber-100/80 text-amber-900 border-amber-300'
    },
    {
      key: 'iceCreamCount',
      emoji: '🍦🍰',
      title: 'Sorvete / Eskibom / Bolo',
      examples: 'Eskibom, picolé c/ cobertura, copo de sorvete ou fatia de bolo',
      kcal: 380,
      prot: 5,
      carbs: 44,
      fat: 20,
      badgeColor: 'bg-orange-50 text-orange-800 border-orange-200'
    },
    {
      key: 'saltySnackCount',
      emoji: '🥨🍪',
      title: 'Salgadinho / Biscoito / Salgado',
      examples: 'Pacote médio Doritos/Cheetos (85g), cookies ou coxinha/pastel',
      kcal: 450,
      prot: 6,
      carbs: 52,
      fat: 24,
      badgeColor: 'bg-orange-100/80 text-orange-900 border-orange-300'
    },
    {
      key: 'superBesteiraCount',
      emoji: '🍕🍻',
      title: 'Exagero / Refeição Livre Pesada',
      examples: 'Rodízio, combo fast-food duplo + sobremesa ou bebida + petiscos',
      kcal: 1200,
      prot: 35,
      carbs: 120,
      fat: 65,
      badgeColor: 'bg-rose-50 text-rose-800 border-rose-200'
    }
  ];

  return (
    <div className="pb-36 pt-1 max-w-lg mx-auto px-4">
      {/* HEADER CENTRALIZADO PREMIUM */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pt-2 pb-2.5 mb-3 -mx-4 px-4 border-b border-slate-200/60">
        <div className="flex items-center justify-between mb-2">
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

          <div className="flex-1 text-center min-w-0 px-1">
            <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">
              Dieta & Nutrição
            </h1>
          </div>

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

        {/* METAS NA MESMA LINHA */}
        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap overflow-x-auto no-scrollbar">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
            <Target className="w-2.5 h-2.5 text-blue-600 shrink-0" />
            <span>Meta: {targetProtein}g Proteína</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
            <Flame className="w-2.5 h-2.5 text-amber-600 fill-current shrink-0" />
            <span>{targetCalories.toLocaleString('pt-BR')} kcal</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-50 text-cyan-700 border border-cyan-200/80 shadow-2xs">
            <Droplets className="w-2.5 h-2.5 text-cyan-600 fill-current shrink-0" />
            <span>{(targetWaterMl / 1000).toFixed(1).replace('.', ',')}L Água</span>
          </span>
        </div>
      </div>

      <div className="space-y-3.5">
        {/* ========================================================= */}
        {/* 1. PAINEL DE METAS & MACROS DO DIA (PADRÃO MACROFACTOR) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3.5 anim-card-1">
          {/* TRACKER DE PROTEÍNA */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <Target className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Proteína Diária
                  </span>
                  <div className="flex items-baseline gap-1">
                    <h2 className="text-lg font-black text-slate-900 leading-none">
                      {dailyTotals.protein}g
                    </h2>
                    <span className="text-xs font-bold text-slate-400">
                      / {targetProtein}g
                    </span>
                  </div>
                </div>
              </div>

              <span
                className={`text-xs font-black px-2.5 py-1 rounded-xl whitespace-nowrap ${
                  dailyTotals.protein >= targetProtein
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
                  dailyTotals.protein >= targetProtein ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${proteinProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
              <span>
                {remainingProtein > 0 ? (
                  <>
                    Faltam <strong className="text-slate-800 font-bold">{remainingProtein}g</strong> para blindar a massa magra
                  </>
                ) : (
                  <span className="text-emerald-700 font-bold">
                    ✨ Meta proteica batida com sucesso!
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* TRACKER DE CALORIAS */}
          <div className="pt-2.5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                  <Flame className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Balanço Calórico ({calorieMode === 'recomposicao' ? 'Déficit' : 'Manutenção'})
                  </span>
                  <div className="flex items-baseline gap-1">
                    <h2 className="text-lg font-black text-slate-900 leading-none">
                      {dailyTotals.calories.toLocaleString('pt-BR')}
                    </h2>
                    <span className="text-xs font-bold text-slate-400">
                      / {targetCalories.toLocaleString('pt-BR')} kcal
                    </span>
                  </div>
                </div>
              </div>

              <span
                className={`text-xs font-black px-2.5 py-1 rounded-xl whitespace-nowrap ${
                  remainingCalories >= 0
                    ? 'bg-amber-50 text-amber-800 border border-amber-200/70'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {remainingCalories >= 0
                  ? `Restam ${remainingCalories} kcal`
                  : `+${Math.abs(remainingCalories)} kcal acima`}
              </span>
            </div>

            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
              <div
                className={`h-full transition-all duration-300 ease-out rounded-full ${
                  dailyTotals.calories <= targetCalories
                    ? 'bg-amber-500'
                    : dailyTotals.calories <= targetCalories + 300
                    ? 'bg-orange-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${calorieProgress}%` }}
              />
            </div>
          </div>

          {/* Breakdown de Macros Semânticos (Sem abreviações soltas) */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
            <div className="p-2 rounded-2xl bg-blue-50/60 border border-blue-100/80">
              <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold text-blue-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span>Proteínas</span>
              </div>
              <div className="text-sm font-black text-blue-950 mt-0.5">
                {dailyTotals.protein}g
              </div>
            </div>
            <div className="p-2 rounded-2xl bg-amber-50/60 border border-amber-100/80">
              <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold text-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Carboidratos</span>
              </div>
              <div className="text-sm font-black text-amber-950 mt-0.5">
                {dailyTotals.carbs}g
              </div>
            </div>
            <div className="p-2 rounded-2xl bg-purple-50/60 border border-purple-100/80">
              <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold text-purple-800">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Gorduras</span>
              </div>
              <div className="text-sm font-black text-purple-950 mt-0.5">
                {dailyTotals.fat}g
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. SUPLEMENTAÇÃO & PROTEÍNA RÁPIDA (WHEY + LEITE) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-2.5 anim-card-2">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Suplementação & Proteína Rápida
            </h3>
          </div>

          {/* WHEY PROTEIN */}
          <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 pr-1">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-base shrink-0">
                ⚡🥤
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900">Whey Protein</div>
                <MacroPills calories={95} protein={20} unitLabel="scoop" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => handleAdjustWheyScoops(-1)}
                disabled={wheyScoops <= 0}
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 font-bold"
                aria-label="Diminuir scoop"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="w-6 text-center font-black text-xs text-slate-900">
                {wheyScoops}
              </div>
              <button
                onClick={() => handleAdjustWheyScoops(1)}
                className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center active:scale-90 transition-transform font-bold"
                aria-label="Aumentar scoop"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* COPO DE LEITE */}
          <div className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 pr-1">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-base shrink-0">
                🥛🐄
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900">Copo de Leite (200ml)</div>
                <MacroPills calories={110} protein={6} carbs={9} fat={5} unitLabel="copo" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => handleAdjustMilkGlasses(-1)}
                disabled={milkGlasses <= 0}
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 font-bold"
                aria-label="Diminuir copo de leite"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="w-6 text-center font-black text-xs text-slate-900">
                {milkGlasses}
              </div>
              <button
                onClick={() => handleAdjustMilkGlasses(1)}
                className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center active:scale-90 transition-transform font-bold"
                aria-label="Aumentar copo de leite"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. REFEIÇÕES DO DIA (CAFÉ, ALMOÇO, LANCHE, JANTAR) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-4 anim-card-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Refeições do Dia
            </h3>
          </div>

          {/* 3.1 CAFÉ DA MANHÃ */}
          <CustomMealBuilder
            emoji="☕🍳"
            title="Café da Manhã"
            subtitle="Café c/ leite, ovos, tapioca ou fruta"
            config={breakfastConfig}
            onChange={handleUpdateBreakfastConfig}
            defaultOpen={true}
          />

          {/* 3.2 ALMOÇO: PRATO CASEIRO OU CHURRASQUINHO */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-base shrink-0 shadow-2xs">
                  {lunchType === 'churrasquinho' ? '🍢🔥' : '🍽️🥩'}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Almoço Principal
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    {currentData.meals.lunch
                      ? `${lunchMacros.calories} kcal • ${lunchMacros.protein}g Proteína • ${lunchMacros.carbs}g Carbo`
                      : 'Selecione Prato Caseiro ou Churrasquinho'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectLunchType(lunchType)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all flex items-center gap-1 shrink-0 active:scale-95 ${
                  currentData.meals.lunch
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {currentData.meals.lunch ? (
                  <>
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Registrado</span>
                  </>
                ) : (
                  <span>+ Marcar Almoço</span>
                )}
              </button>
            </div>

            {/* SELETOR DE MODALIDADE DO ALMOÇO: PRATO CASEIRO vs CHURRASQUINHO */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  db.nutritionLogs.update(selectedDate, {
                    lunchType: 'caseiro',
                    'meals.lunch': 'caseiro'
                  });
                }}
                className={`p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                  lunchType === 'caseiro'
                    ? 'border-blue-600 bg-blue-50/80 text-blue-950 font-black shadow-2xs ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black">
                  <span>🍽️ Prato Caseiro</span>
                  {currentData.meals.lunch === 'caseiro' && (
                    <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Arroz, feijão, carne/frango e salada
                </div>
                <div className="text-[10px] font-extrabold text-blue-700 mt-1">
                  ~{currentLunchPlatePreview.calories} kcal • {currentLunchPlatePreview.protein}g Prot
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  db.nutritionLogs.update(selectedDate, {
                    lunchType: 'churrasquinho',
                    'meals.lunch': 'churrasquinho'
                  });
                }}
                className={`p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                  lunchType === 'churrasquinho'
                    ? 'border-amber-600 bg-amber-50/80 text-amber-950 font-black shadow-2xs ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-black">
                  <span>🍢 Churrasquinho</span>
                  {currentData.meals.lunch === 'churrasquinho' && (
                    <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Espetinhos + Baião + Vinagrete
                </div>
                <div className="text-[10px] font-extrabold text-amber-800 mt-1">
                  ~{currentLunchChurrascoPreview.calories} kcal • {currentLunchChurrascoPreview.protein}g Prot
                </div>
              </button>
            </div>

            {/* BUILDER DO PRATO CASEIRO */}
            {lunchType === 'caseiro' && (
              <div className="p-3 rounded-2xl border border-slate-200 bg-white space-y-3 animate-in fade-in duration-150">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                    1. Proteína Principal
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'carne', label: '🥩 Bife Bovino', sub: '~100g • 28g Prot' },
                      { id: 'frango', label: '🍗 Filé Frango', sub: '~120g • 32g Prot' },
                      { id: 'peixe', label: '🐟 Filé Peixe', sub: '~120g • 26g Prot' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleUpdateLunchConfig({ proteinType: item.id as any })}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          lunchConfig.proteinType === item.id
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-2xs'
                            : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs font-black truncate">{item.label}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{item.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {/* Porções de Proteína */}
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">
                      {lunchConfig.proteinType === 'carne' ? '🥩 Bifes' : '🍗 Filés'}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-black text-slate-900">
                        {lunchConfig.proteinPortions}x
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleUpdateLunchConfig({
                              proteinPortions: Math.max(1, lunchConfig.proteinPortions - 1)
                            })
                          }
                          disabled={lunchConfig.proteinPortions <= 1}
                          className="w-5 h-5 rounded bg-white border border-slate-200 text-slate-800 font-bold text-xs disabled:opacity-30"
                        >
                          -
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateLunchConfig({
                              proteinPortions: Math.min(5, lunchConfig.proteinPortions + 1)
                            })
                          }
                          disabled={lunchConfig.proteinPortions >= 5}
                          className="w-5 h-5 rounded bg-blue-600 text-white font-bold text-xs disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Arroz */}
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">
                      🍚 Arroz
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-black text-slate-900">
                        {lunchConfig.ricePortions}x
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleUpdateLunchConfig({
                              ricePortions: Math.max(0, lunchConfig.ricePortions - 1)
                            })
                          }
                          disabled={lunchConfig.ricePortions <= 0}
                          className="w-5 h-5 rounded bg-white border border-slate-200 text-slate-800 font-bold text-xs disabled:opacity-30"
                        >
                          -
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateLunchConfig({
                              ricePortions: Math.min(4, lunchConfig.ricePortions + 1)
                            })
                          }
                          disabled={lunchConfig.ricePortions >= 4}
                          className="w-5 h-5 rounded bg-blue-600 text-white font-bold text-xs disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Feijão */}
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">
                      🫘 Feijão
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-black text-slate-900">
                        {lunchConfig.beanPortions}x
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleUpdateLunchConfig({
                              beanPortions: Math.max(0, lunchConfig.beanPortions - 1)
                            })
                          }
                          disabled={lunchConfig.beanPortions <= 0}
                          className="w-5 h-5 rounded bg-white border border-slate-200 text-slate-800 font-bold text-xs disabled:opacity-30"
                        >
                          -
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateLunchConfig({
                              beanPortions: Math.min(3, lunchConfig.beanPortions + 1)
                            })
                          }
                          disabled={lunchConfig.beanPortions >= 3}
                          className="w-5 h-5 rounded bg-blue-600 text-white font-bold text-xs disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleUpdateLunchConfig({ hasSalad: !lunchConfig.hasSalad })}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                    lunchConfig.hasSalad
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <span>🥗🍅 Salada Verde Completa</span>
                  <span className="text-[10px] font-black">
                    {lunchConfig.hasSalad ? 'INCLUSA (+35 kcal)' : 'NÃO INCLUSA'}
                  </span>
                </button>
              </div>
            )}

            {/* BUILDER DO CHURRASQUINHO */}
            {lunchType === 'churrasquinho' && (
              <ChurrascoBuilder
                config={churrascoConfig}
                onChange={handleUpdateChurrascoConfig}
              />
            )}
          </div>

          {/* 3.3 LANCHE DA TARDE */}
          <CustomMealBuilder
            emoji="🥪🍌"
            title="Lanche da Tarde"
            subtitle="Fruta, ovos, tapioca ou shake proteico"
            config={snackConfig}
            onChange={handleUpdateSnackConfig}
            allowShake={true}
            defaultOpen={false}
          />

          {/* 3.4 JANTAR COMPLETO (5 OPÇÕES REALISTAS) */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-base shrink-0 shadow-2xs">
                  🌙🍽️
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Jantar
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    {currentData.meals.dinner
                      ? `${dinnerMacros.calories} kcal • ${dinnerMacros.protein}g Proteína • ${dinnerMacros.carbs}g Carbo`
                      : 'Escolha entre Prato, Baguete, Churrasquinho, Burger ou Pizza'}
                  </p>
                </div>
              </div>

              {currentData.meals.dinner && (
                <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 shrink-0">
                  {dinnerMacros.calories} kcal
                </span>
              )}
            </div>

            {/* SELETOR DE OPÇÕES DO JANTAR */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {[
                {
                  id: 'caseiro' as DinnerType,
                  emoji: '🍽️',
                  title: 'Prato Caseiro',
                  kcal: currentDinnerPlatePreview.calories,
                  prot: currentDinnerPlatePreview.protein
                },
                {
                  id: 'subway' as DinnerType,
                  emoji: '🥖',
                  title: 'Baguete / Sub',
                  kcal: currentSubwayPreview.calories,
                  prot: currentSubwayPreview.protein
                },
                {
                  id: 'churrasquinho' as DinnerType,
                  emoji: '🍢',
                  title: 'Churrasquinho',
                  kcal: currentDinnerChurrascoPreview.calories,
                  prot: currentDinnerChurrascoPreview.protein
                },
                {
                  id: 'burger' as DinnerType,
                  emoji: '🍔',
                  title: 'Burger / Podrão',
                  kcal: currentBurgerPreview.calories,
                  prot: currentBurgerPreview.protein
                },
                {
                  id: 'pizza' as DinnerType,
                  emoji: '🍕',
                  title: 'Pizza (Fatias)',
                  kcal: currentPizzaPreview.calories,
                  prot: currentPizzaPreview.protein
                }
              ].map((opt) => {
                const isSelected = currentData.meals.dinner === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectDinnerType(opt.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/90 text-blue-950 font-black shadow-2xs ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="truncate">
                        {opt.emoji} {opt.title}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[3]" />}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 mt-1">
                      ~{opt.kcal} kcal • {opt.prot}g Prot
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 1. BUILDER JANTAR: SANDUÍCHE BAGUETE */}
            {currentData.meals.dinner === 'subway' && (
              <div className="p-3 rounded-2xl border border-blue-200 bg-white space-y-3 animate-in fade-in duration-150">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Tamanho da Baguete
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleUpdateSubwayConfig({ size: '15cm' })}
                      className={`py-2 rounded-xl text-xs font-black border transition-all ${
                        dinnerSubwayConfig.size === '15cm'
                          ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      🥖 15 cm Padrão
                    </button>
                    <button
                      onClick={() => handleUpdateSubwayConfig({ size: '30cm' })}
                      className={`py-2 rounded-xl text-xs font-black border transition-all ${
                        dinnerSubwayConfig.size === '30cm'
                          ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      🥖🥖 30 cm (Dobro)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleUpdateSubwayConfig({ protein: 'frango_teriyaki' })}
                    className={`p-2 rounded-xl text-xs font-black border text-left transition-all ${
                      dinnerSubwayConfig.protein === 'frango_teriyaki'
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>🍗 Frango Teriyaki</div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      {dinnerSubwayConfig.size === '30cm'
                        ? '920 kcal • 64g Prot'
                        : '460 kcal • 32g Prot'}
                    </div>
                  </button>
                  <button
                    onClick={() => handleUpdateSubwayConfig({ protein: 'carne' })}
                    className={`p-2 rounded-xl text-xs font-black border text-left transition-all ${
                      dinnerSubwayConfig.protein === 'carne'
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>🥩 Carne / Tiras</div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                      {dinnerSubwayConfig.size === '30cm'
                        ? '980 kcal • 60g Prot'
                        : '490 kcal • 30g Prot'}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 2. BUILDER JANTAR: PRATO CASEIRO */}
            {currentData.meals.dinner === 'caseiro' && (
              <div className="p-3 rounded-2xl border border-blue-200 bg-white space-y-3 animate-in fade-in duration-150">
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
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black truncate">{item.label}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{item.sub}</div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-700">
                      🥩 {dinnerPlateConfig.proteinPortions}x
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          handleUpdateDinnerPlateConfig({
                            proteinPortions: Math.max(1, dinnerPlateConfig.proteinPortions - 1)
                          })
                        }
                        className="w-5 h-5 rounded bg-white border border-slate-200 text-xs font-bold"
                      >
                        -
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateDinnerPlateConfig({
                            proteinPortions: Math.min(5, dinnerPlateConfig.proteinPortions + 1)
                          })
                        }
                        className="w-5 h-5 rounded bg-blue-600 text-white text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-700">
                      🍚 {dinnerPlateConfig.ricePortions}x
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          handleUpdateDinnerPlateConfig({
                            ricePortions: Math.max(0, dinnerPlateConfig.ricePortions - 1)
                          })
                        }
                        className="w-5 h-5 rounded bg-white border border-slate-200 text-xs font-bold"
                      >
                        -
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateDinnerPlateConfig({
                            ricePortions: Math.min(4, dinnerPlateConfig.ricePortions + 1)
                          })
                        }
                        className="w-5 h-5 rounded bg-blue-600 text-white text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-700">
                      🫘 {dinnerPlateConfig.beanPortions}x
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          handleUpdateDinnerPlateConfig({
                            beanPortions: Math.max(0, dinnerPlateConfig.beanPortions - 1)
                          })
                        }
                        className="w-5 h-5 rounded bg-white border border-slate-200 text-xs font-bold"
                      >
                        -
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateDinnerPlateConfig({
                            beanPortions: Math.min(3, dinnerPlateConfig.beanPortions + 1)
                          })
                        }
                        className="w-5 h-5 rounded bg-blue-600 text-white text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. BUILDER JANTAR: CHURRASQUINHO */}
            {currentData.meals.dinner === 'churrasquinho' && (
              <ChurrascoBuilder
                config={dinnerChurrascoConfig}
                onChange={handleUpdateDinnerChurrascoConfig}
              />
            )}

            {/* 4. BUILDER JANTAR: HAMBÚRGUER / PODRÃO (NOVO!) */}
            {currentData.meals.dinner === 'burger' && (
              <div className="p-3.5 rounded-2xl border border-amber-200 bg-white space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
                  <span className="text-xs font-black text-slate-900">
                    🍔 Total do Lanche:
                  </span>
                  <span className="text-xs font-black text-amber-900 bg-white px-2.5 py-0.5 rounded-lg border border-amber-200">
                    {currentBurgerPreview.calories} kcal • {currentBurgerPreview.protein}g Prot
                  </span>
                </div>

                <div className="space-y-1.5">
                  {[
                    {
                      id: 'artesanal_simples',
                      label: '🍔 Hambúrguer Artesanal Simples',
                      desc: 'Pão brioche, 1 blend 160g, queijo e molho',
                      kcal: 620,
                      prot: 34,
                      carbs: 42,
                      fat: 34
                    },
                    {
                      id: 'artesanal_duplo',
                      label: '🍔🥓 Artesanal Duplo + Bacon',
                      desc: 'Pão brioche, 2 blends 160g, duplo queijo e bacon',
                      kcal: 940,
                      prot: 58,
                      carbs: 45,
                      fat: 58
                    },
                    {
                      id: 'podrao_xtudo',
                      label: '🍔🍳 Clássico "Podrão" / X-Tudo',
                      desc: 'Pão, carne, ovo, presunto, queijo, bacon, batata palha e maionese',
                      kcal: 1050,
                      prot: 46,
                      carbs: 62,
                      fat: 68
                    }
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleUpdateBurgerConfig({ style: b.id as any })}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                        dinnerBurgerConfig.style === b.id
                          ? 'border-amber-600 bg-amber-50/60 ring-1 ring-amber-500'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">{b.label}</span>
                        {dinnerBurgerConfig.style === b.id && (
                          <Check className="w-4 h-4 text-amber-600 stroke-[3]" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{b.desc}</p>
                      <MacroPills calories={b.kcal} protein={b.prot} carbs={b.carbs} fat={b.fat} />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleUpdateBurgerConfig({ hasFries: !dinnerBurgerConfig.hasFries })
                  }
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                    dinnerBurgerConfig.hasFries
                      ? 'border-orange-400 bg-orange-50 text-orange-950'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <span>🍟🥤 + Batata Frita / Acompanhamento</span>
                  <span className="text-[10px] font-black">
                    {dinnerBurgerConfig.hasFries ? 'INCLUSO (+380 kcal)' : 'NÃO INCLUSO'}
                  </span>
                </button>
              </div>
            )}

            {/* 5. BUILDER JANTAR: PIZZA POR FATIAS (NOVO!) */}
            {currentData.meals.dinner === 'pizza' && (
              <div className="p-3.5 rounded-2xl border border-amber-200 bg-white space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
                  <span className="text-xs font-black text-slate-900">
                    🍕 Total ({dinnerPizzaConfig.slices}{' '}
                    {dinnerPizzaConfig.slices === 1 ? 'fatia' : 'fatias'}):
                  </span>
                  <span className="text-xs font-black text-amber-900 bg-white px-2.5 py-0.5 rounded-lg border border-amber-200">
                    {currentPizzaPreview.calories} kcal • {currentPizzaPreview.protein}g Prot
                  </span>
                </div>

                {/* Contador de Fatias */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      🍕 Quantidade de Fatias
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Cada fatia tem ~{dinnerPizzaConfig.flavorType === 'proteica' ? 285 : 320} kcal
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdatePizzaConfig({
                          slices: Math.max(1, dinnerPizzaConfig.slices - 1)
                        })
                      }
                      disabled={dinnerPizzaConfig.slices <= 1}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm disabled:opacity-30 active:scale-90"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-black text-sm text-slate-900">
                      {dinnerPizzaConfig.slices}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdatePizzaConfig({
                          slices: Math.min(10, dinnerPizzaConfig.slices + 1)
                        })
                      }
                      disabled={dinnerPizzaConfig.slices >= 10}
                      className="w-8 h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-sm disabled:opacity-30 active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Tipo de Sabor */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdatePizzaConfig({ flavorType: 'proteica' })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      dinnerPizzaConfig.flavorType === 'proteica'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-black ring-1 ring-blue-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-black">🍗🍕 Frango / Portuguesa</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Frango c/ Catupiry, Atum, Lombo
                    </div>
                    <div className="text-[10px] font-extrabold text-blue-700 mt-1">
                      285 kcal • 14g Prot / fatia
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdatePizzaConfig({ flavorType: 'tradicional' })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      dinnerPizzaConfig.flavorType === 'tradicional'
                        ? 'border-amber-600 bg-amber-50/70 text-amber-950 font-black ring-1 ring-amber-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-black">🧀🍕 Calabresa / Queijos</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      Mussarela, 4 Queijos, Pepperoni
                    </div>
                    <div className="text-[10px] font-extrabold text-amber-800 mt-1">
                      320 kcal • 12g Prot / fatia
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. HIDRATAÇÃO DIÁRIA (META 4.0L) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs anim-card-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center text-base">
                💧
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Hidratação Diária
                </span>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-base font-black text-slate-900 leading-none">
                    {(currentData.waterMl / 1000).toFixed(2)}L
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">
                    / {(targetWaterMl / 1000).toFixed(1).replace('.', ',')}L
                  </span>
                </div>
              </div>
            </div>

            <span
              className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                waterProgress >= 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-cyan-50 text-cyan-700 border border-cyan-100'
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
              🥤 +250 ml
            </button>
            <button
              onClick={() => handleAdjustWater(500)}
              className="py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold active:scale-95 transition-all min-h-[40px]"
            >
              💧 +500 ml
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. CONTROLE DE ESCAPES CALÓRICOS GRANULAR (5 NÍVEIS) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3 anim-card-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Acompanhamento Realista Sem Culpa
              </span>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                Doces, Salgadinhos & Escapes
              </h3>
            </div>
            {escapeMacros.calories > 0 && (
              <span className="text-xs font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                +{escapeMacros.calories} kcal em escapes
              </span>
            )}
          </div>

          <div className="space-y-2">
            {escapeItems.map((item) => {
              const count = (currentData.escapes?.[item.key] as number) || 0;
              return (
                <div
                  key={item.key}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                    count > 0
                      ? 'bg-amber-50/40 border-amber-300 shadow-2xs'
                      : 'bg-slate-50/60 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-base shrink-0 shadow-2xs mt-0.5">
                      {item.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-900">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                        {item.examples}
                      </p>
                      <MacroPills
                        calories={item.kcal}
                        protein={item.prot}
                        carbs={item.carbs}
                        fat={item.fat}
                      />
                    </div>
                  </div>

                  {/* Stepper de Escape */}
                  <div className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleAdjustEscape(item.key, -1)}
                      disabled={count <= 0}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs disabled:opacity-30 active:scale-90 transition-transform"
                      aria-label={`Diminuir ${item.title}`}
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-black text-xs text-slate-900">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdjustEscape(item.key, 1, item.title)}
                      className="w-7 h-7 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs active:scale-90 transition-transform"
                      aria-label={`Adicionar ${item.title}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Caso exista besteiraCount legado salvo no dia, exibir para permitir ajuste */}
            {(currentData.escapes?.besteiraCount || 0) > 0 && (
              <div className="p-3 rounded-2xl border border-amber-300 bg-amber-50/40 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900">
                    🍩 Escape Rápido (Atalho)
                  </div>
                  <MacroPills calories={600} protein={6} carbs={65} fat={30} />
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => handleAdjustEscape('besteiraCount', -1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-black text-xs">
                    {currentData.escapes.besteiraCount}
                  </span>
                  <button
                    onClick={() => handleAdjustEscape('besteiraCount', 1)}
                    className="w-7 h-7 rounded-lg bg-amber-600 text-white font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {escapeToast && (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-[11px] font-bold">{escapeToast}</span>
              </div>
              <button
                onClick={() => setEscapeToast(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-xs"
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
