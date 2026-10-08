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
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Plus,
  Minus,
  Utensils
} from 'lucide-react';

import {
  DEFAULT_LUNCH_CONFIG,
  DEFAULT_CHURRASCO_CONFIG,
  DEFAULT_SUBWAY_CONFIG,
  DEFAULT_DINNER_PLATE_CONFIG,
  DEFAULT_BURGER_CONFIG,
  DEFAULT_PIZZA_CONFIG,
  DEFAULT_BREAKFAST_CONFIG,
  DEFAULT_SNACK_CONFIG,
  calculatePlateMacros,
  calculateChurrascoMacros,
  calculateSubwayMacros,
  calculateBurgerMacros,
  calculatePizzaMacros,
  calculateCustomMealMacros,
  calculateEscapesMacros,
  getResolvedBreakfastConfig,
  getResolvedSnackConfig,
  calculateMacroTargets,
  getLocalDateStr
} from '../utils/nutritionMath';

// ============================================================================
// COMPONENTE DE BADGES DE MACROS UNIFORMES (4 COLUNAS PADRONIZADAS)
// ============================================================================
const MacroPills: React.FC<{
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  unitLabel?: string;
}> = ({ calories, protein = 0, carbs = 0, fat = 0 }) => (
  <div className="grid grid-cols-4 gap-1.5 w-full mt-2 pt-2 border-t border-slate-200/70">
    <div className="py-1 px-1 rounded-lg bg-slate-200/80 border border-slate-300/70 text-slate-900 text-[10px] font-extrabold text-center whitespace-nowrap leading-tight">
      {calories} kcal
    </div>
    <div className="py-1 px-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-800 text-[10px] font-extrabold text-center whitespace-nowrap leading-tight">
      {protein}g Prot
    </div>
    <div className="py-1 px-1 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-[10px] font-extrabold text-center whitespace-nowrap leading-tight">
      {carbs}g Carbo
    </div>
    <div className="py-1 px-1 rounded-lg bg-slate-100 border border-slate-200/90 text-slate-700 text-[10px] font-extrabold text-center whitespace-nowrap leading-tight">
      {fat}g Gord
    </div>
  </div>
);

// ============================================================================
// COMPONENT: CustomMealBuilder para Café da Manhã e Lanche da Tarde
// ============================================================================
const CustomMealBuilder: React.FC<{
  emoji: string;
  title: string;
  config: CustomMealConfig;
  onChange: (patch: Partial<CustomMealConfig>) => void;
  allowShake?: boolean;
  defaultOpen?: boolean;
}> = ({ emoji, title, config, onChange, allowShake, defaultOpen = true }) => {
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
        className="w-full p-3 bg-white hover:bg-slate-50/80 flex items-center justify-between gap-2 text-left transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="min-w-[52px] h-10 px-2 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center whitespace-nowrap text-base leading-none shrink-0 shadow-2xs">
            {emoji}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              {title}
            </h4>
            <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
              {isEaten
                ? `${macros.calories} kcal • ${macros.protein}g Prot • ${macros.carbs}g Carbo`
                : '0 kcal • 0g Prot'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isEaten ? (
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
              {macros.calories} kcal
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 whitespace-nowrap">
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
        <div className="p-2.5 pt-2 space-y-2 border-t border-slate-100 animate-in fade-in duration-150">
          {/* 1. Café c/ Leite */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm whitespace-nowrap shrink-0">☕🥛</span>
                <span className="text-xs font-black text-slate-900">Café com Leite</span>
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
            <MacroPills calories={95} protein={6} carbs={9} fat={4} />
          </div>

          {/* 2. Tapioca c/ Queijo */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm whitespace-nowrap shrink-0">🌮🧀</span>
                <span className="text-xs font-black text-slate-900">Tapioca com Queijo</span>
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
            <MacroPills calories={240} protein={10} carbs={33} fat={8} />
          </div>

          {/* 3. Ovos (Mexidos ou Fritos) */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-2 shadow-2xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm whitespace-nowrap shrink-0">🍳🥚</span>
                  <span className="text-xs font-black text-slate-900">
                    Ovos ({config.eggType === 'fritos' ? 'Fritos' : 'Mexidos'})
                  </span>
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
              <MacroPills
                calories={config.eggType === 'fritos' ? 90 : 80}
                protein={6}
                carbs={1}
                fat={config.eggType === 'fritos' ? 7 : 6}
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onChange({ eggType: 'mexidos' })}
                className={`py-1.5 px-2 rounded-lg text-xs font-black border transition-all whitespace-nowrap ${
                  config.eggType === 'mexidos'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🍳 Mexidos (80 kcal)
              </button>
              <button
                onClick={() => onChange({ eggType: 'fritos' })}
                className={`py-1.5 px-2 rounded-lg text-xs font-black border transition-all whitespace-nowrap ${
                  config.eggType === 'fritos'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🥚 Fritos (90 kcal)
              </button>
            </div>
          </div>

          {/* 4. Frutas (Banana, Laranja ou Maçã) */}
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-2 shadow-2xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">
                    {config.fruitType === 'banana'
                      ? '🍌'
                      : config.fruitType === 'laranja'
                      ? '🍊'
                      : '🍎'}
                  </span>
                  <span className="text-xs font-black text-slate-900">Fruta Fresca</span>
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
                fat={0}
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onChange({ fruitType: 'banana' })}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-black border transition-all text-center whitespace-nowrap ${
                  config.fruitType === 'banana'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🍌 Banana
              </button>
              <button
                onClick={() => onChange({ fruitType: 'laranja' })}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-black border transition-all text-center whitespace-nowrap ${
                  config.fruitType === 'laranja'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🍊 Laranja
              </button>
              <button
                onClick={() => onChange({ fruitType: 'maca' })}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-black border transition-all text-center whitespace-nowrap ${
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
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm whitespace-nowrap shrink-0">🥤⚡</span>
                  <span className="text-xs font-black text-slate-900">Shake Proteico</span>
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
              <MacroPills calories={210} protein={25} carbs={20} fat={3} />
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
    <div className="p-3 rounded-2xl border border-amber-200/90 bg-amber-50/30 space-y-2.5 animate-in fade-in duration-150">
      {/* Resumo Estimado do Churrasquinho */}
      <div className="bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs flex items-center justify-between gap-2">
        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
          <span>🔥🍢</span> Total do Churrasco:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-black text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-lg whitespace-nowrap">
            {preview.calories} kcal
          </span>
          <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/60 whitespace-nowrap">
            {preview.protein}g Prot
          </span>
        </div>
      </div>

      {/* 1. Escolha do Corte do Espeto */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
          1. Corte do Espeto
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'alcatra', label: '🥩 Alcatra', sub: '110g • 31g Prot' },
            { id: 'maminha', label: '🥩 Maminha', sub: '110g • 29g Prot' },
            { id: 'fraldinha', label: '🥩 Fraldinha', sub: '110g • 27g Prot' }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange({ cut: item.id as any })}
              className={`px-1.5 py-2 rounded-xl border text-center transition-all active:scale-95 ${
                config.cut === item.id
                  ? 'border-amber-600 bg-white text-amber-950 font-black shadow-2xs ring-1 ring-amber-500'
                  : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-white'
              }`}
            >
              <div className="text-[11px] font-black whitespace-nowrap">{item.label}</div>
              <div className="text-[9.5px] text-slate-500 font-semibold whitespace-nowrap mt-0.5">
                {item.sub}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Quantidade de Espetos & Porções de Baião de Dois */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-1">
          <div className="min-w-0">
            <div className="text-[9.5px] font-bold text-slate-400 uppercase whitespace-nowrap">
              🍢 Espetos
            </div>
            <div className="text-xs font-black text-slate-900 whitespace-nowrap">
              {config.skewerCount}x {config.skewerCount === 1 ? 'espeto' : 'espetos'}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
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

        <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-1">
          <div className="min-w-0">
            <div className="text-[9.5px] font-bold text-slate-400 uppercase whitespace-nowrap">
              🍛 Baião
            </div>
            <div className="text-xs font-black text-slate-900 whitespace-nowrap">
              {config.baiaoPortions}x {config.baiaoPortions === 1 ? 'porção' : 'porções'}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
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
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onChange({ hasVinagrete: !config.hasVinagrete })}
          className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-1 transition-all whitespace-nowrap ${
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
          className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-1 transition-all whitespace-nowrap ${
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
  const todayStr = getLocalDateStr();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [escapeToast, setEscapeToast] = useState<string | null>(null);

  const userProfile = useLiveQuery(() => db.userProfile.get('main_user'));
  const calorieMode = userProfile?.calorieMode || 'recomposicao';
  const macroTargets = useMemo(
    () => calculateMacroTargets(calorieMode, userProfile?.targetProteinGrams || 185),
    [calorieMode, userProfile?.targetProteinGrams]
  );
  const targetProtein = macroTargets.protein;
  const targetCalories = macroTargets.calories;
  const targetCarbs = macroTargets.carbs;
  const targetFat = macroTargets.fat;
  const targetWaterMl = userProfile?.targetWaterMl || 4000;

  const allNutritionLogs = useLiveQuery(() => db.nutritionLogs.toArray());
  const currentLog = useMemo(
    () => allNutritionLogs?.find((l) => l.date === selectedDate),
    [allNutritionLogs, selectedDate]
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
  const carbsProgress = Math.min(100, Math.round((dailyTotals.carbs / targetCarbs) * 100));
  const fatProgress = Math.min(100, Math.round((dailyTotals.fat / targetFat) * 100));

  const calorieProgress = Math.min(100, Math.round((dailyTotals.calories / targetCalories) * 100));
  const remainingCalories = targetCalories - dailyTotals.calories;
  const remainingProtein = targetProtein - dailyTotals.protein;
  const remainingCarbs = targetCarbs - dailyTotals.carbs;
  const remainingFat = targetFat - dailyTotals.fat;

  const handleSwitchCalorieMode = async (mode: 'recomposicao' | 'manutencao') => {
    triggerHaptic('light');
    const kcal = mode === 'manutencao' ? 2800 : 2200;
    await db.userProfile.update('main_user', {
      calorieMode: mode,
      targetCaloriesKcal: kcal
    });
  };

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
    setSelectedDate(getLocalDateStr(current));
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
  }[] = [
    {
      key: 'chocSmallCount',
      emoji: '🍫',
      title: 'Doce Pequeno / Bombom',
      examples: 'Bombom, 3x Bis ou quadradinho 25g',
      kcal: 130,
      prot: 1,
      carbs: 16,
      fat: 7
    },
    {
      key: 'snickersBarCount',
      emoji: '🍬',
      title: 'Barra de Chocolate / Snickers',
      examples: 'Snickers, KitKat, Twix ou barra média',
      kcal: 250,
      prot: 4,
      carbs: 30,
      fat: 12
    },
    {
      key: 'iceCreamCount',
      emoji: '🍦',
      title: 'Sorvete / Eskibom / Bolo',
      examples: 'Eskibom, picolé, sorvete ou fatia de bolo',
      kcal: 380,
      prot: 5,
      carbs: 44,
      fat: 20
    },
    {
      key: 'saltySnackCount',
      emoji: '🥨',
      title: 'Salgadinho / Biscoito / Salgado',
      examples: 'Doritos, Cheetos, biscoito ou salgado',
      kcal: 450,
      prot: 6,
      carbs: 52,
      fat: 24
    },
    {
      key: 'superBesteiraCount',
      emoji: '🍕',
      title: 'Exagero / Refeição Livre',
      examples: 'Rodízio, combo duplo ou bebida + petiscos',
      kcal: 1200,
      prot: 35,
      carbs: 120,
      fat: 65
    }
  ];

  return (
    <div className="pb-36 pt-1 max-w-lg mx-auto px-2.5 sm:px-4">
      {/* BARRA SUPERIOR LIMPA COM CONTRASTE AZUL REAL */}
      <div className="sticky top-0 z-20 bg-slate-50 pt-1.5 pb-2 mb-2.5 -mx-2.5 px-2.5 sm:-mx-4 sm:px-4">
        <div className="bg-slate-900 text-white rounded-2xl px-3.5 py-2.5 shadow-sm border border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Utensils className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            </div>
            <h1 className="text-base font-black text-white tracking-tight leading-none">
              Nutrição
            </h1>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-[10px] font-extrabold text-white bg-blue-600 px-2 py-0.5 rounded-md active:scale-95 whitespace-nowrap shadow-2xs"
              >
                Hoje
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => handleShiftDate(-1)}
              className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-slate-200 active:scale-90 transition-transform"
              title="Dia anterior"
              aria-label="Dia anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <div className="px-2.5 py-1 rounded-lg bg-blue-600 text-white flex items-center gap-1.5 whitespace-nowrap shadow-2xs">
              <span className="text-xs font-black tracking-tight leading-none">
                {isToday ? `Hoje, ${dayNumber} ${monthShort}` : `${dayNumber} ${monthShort}`}
              </span>
            </div>
            <button
              onClick={() => handleShiftDate(1)}
              disabled={isToday}
              className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center text-slate-200 active:scale-90 transition-transform disabled:opacity-25"
              title="Próximo dia"
              aria-label="Próximo dia"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* ========================================================= */}
        {/* 1. PAINEL DE METAS & MACROS DO DIA (ALTO CONTRASTE)       */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs">
          {/* Header Navy Slate-900 */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-white truncate">
              Metas do Dia
            </h3>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg whitespace-nowrap ${
                remainingCalories >= 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {remainingCalories >= 0
                ? `Restam ${remainingCalories} kcal`
                : `+${Math.abs(remainingCalories)} kcal`}
            </span>
          </div>

          <div className="p-4 space-y-3.5 bg-white">
            {/* SELETOR RÁPIDO DAS DUAS METAS: 2.200 KCAL (RECOMPOSIÇÃO) VS 2.800 KCAL (MANUTENÇÃO) */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleSwitchCalorieMode('recomposicao')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] whitespace-nowrap ${
                  calorieMode === 'recomposicao'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Recomposição • 2.200</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchCalorieMode('manutencao')}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] whitespace-nowrap ${
                  calorieMode === 'manutencao'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Manutenção • 2.800</span>
              </button>
            </div>

            {/* TRACKER DE CALORIAS */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Calorias
                  </span>
                  <span className="text-sm font-black text-slate-900 tabular-nums">
                    {dailyTotals.calories.toLocaleString('pt-BR')}
                    <span className="text-xs font-bold text-slate-400">
                      {' '}
                      / {targetCalories.toLocaleString('pt-BR')} kcal
                    </span>
                  </span>
                </div>

                <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/80 whitespace-nowrap tabular-nums">
                  {calorieProgress}%
                </span>
              </div>

              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ease-out rounded-full ${
                    dailyTotals.calories <= targetCalories
                      ? 'bg-blue-600'
                      : dailyTotals.calories <= targetCalories + 300
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${calorieProgress}%` }}
                />
              </div>
            </div>

            {/* COMPOSIÇÃO COMPLETA DOS 3 MACRONUTRIENTES (PROTEÍNAS, CARBOIDRATOS E GORDURAS) */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
              {/* 1. PROTEÍNAS */}
              <div
                className={`p-2.5 rounded-2xl border flex flex-col justify-between ${
                  dailyTotals.protein >= targetProtein
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-slate-50 border-slate-200/90'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      <span>Proteína</span>
                    </div>
                    <span className="text-[9px] font-black text-blue-600 tabular-nums">
                      {proteinProgress}%
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline gap-0.5 tabular-nums">
                    <span className="text-sm font-black text-slate-900">
                      {dailyTotals.protein}g
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      /{targetProtein}g
                    </span>
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  <div className="h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        dailyTotals.protein >= targetProtein ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${proteinProgress}%` }}
                    />
                  </div>
                  <div
                    className={`text-[9.5px] font-extrabold whitespace-nowrap truncate ${
                      remainingProtein <= 0 ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {remainingProtein > 0
                      ? `Faltam ${remainingProtein}g`
                      : `Meta OK (+${Math.abs(remainingProtein)}g)`}
                  </div>
                </div>
              </div>

              {/* 2. CARBOIDRATOS */}
              <div
                className={`p-2.5 rounded-2xl border flex flex-col justify-between ${
                  remainingCarbs < 0
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-slate-50 border-slate-200/90'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span>Carbo</span>
                    </div>
                    <span
                      className={`text-[9px] font-black tabular-nums ${
                        remainingCarbs < 0 ? 'text-rose-600' : 'text-amber-700'
                      }`}
                    >
                      { Math.round((dailyTotals.carbs / targetCarbs) * 100) }%
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline gap-0.5 tabular-nums">
                    <span className="text-sm font-black text-slate-900">
                      {dailyTotals.carbs}g
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      /{targetCarbs}g
                    </span>
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  <div className="h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        remainingCarbs < 0 ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${carbsProgress}%` }}
                    />
                  </div>
                  <div
                    className={`text-[9.5px] font-extrabold whitespace-nowrap truncate ${
                      remainingCarbs < 0 ? 'text-rose-600' : 'text-slate-500'
                    }`}
                  >
                    {remainingCarbs >= 0
                      ? `Restam ${remainingCarbs}g`
                      : `+${Math.abs(remainingCarbs)}g acima`}
                  </div>
                </div>
              </div>

              {/* 3. GORDURAS */}
              <div
                className={`p-2.5 rounded-2xl border flex flex-col justify-between ${
                  remainingFat < 0
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-slate-50 border-slate-200/90'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                      <span>Gordura</span>
                    </div>
                    <span
                      className={`text-[9px] font-black tabular-nums ${
                        remainingFat < 0 ? 'text-rose-600' : 'text-slate-700'
                      }`}
                    >
                      { Math.round((dailyTotals.fat / targetFat) * 100) }%
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline gap-0.5 tabular-nums">
                    <span className="text-sm font-black text-slate-900">
                      {dailyTotals.fat}g
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      /{targetFat}g
                    </span>
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  <div className="h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        remainingFat < 0 ? 'bg-rose-500' : 'bg-slate-800'
                      }`}
                      style={{ width: `${fatProgress}%` }}
                    />
                  </div>
                  <div
                    className={`text-[9.5px] font-extrabold whitespace-nowrap truncate ${
                      remainingFat < 0 ? 'text-rose-600' : 'text-slate-500'
                    }`}
                  >
                    {remainingFat >= 0
                      ? `Restam ${remainingFat}g`
                      : `+${Math.abs(remainingFat)}g acima`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. PROTEÍNA RÁPIDA (WHEY + LEITE)                         */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs anim-card-2">
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-white">
              Proteína Rápida
            </h3>
            {(wheyScoops > 0 || milkGlasses > 0) && (
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black tabular-nums">
                +{wheyScoops * 20 + milkGlasses * 6}g Prot
              </span>
            )}
          </div>

          <div className="p-3.5 sm:p-4 space-y-2.5 bg-white">
            {/* WHEY PROTEIN */}
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/90">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center text-lg leading-none shrink-0 shadow-2xs">
                    🥤
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 leading-snug">
                      Whey Protein
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium leading-snug">
                      Dose padrão (30g)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    onClick={() => handleAdjustWheyScoops(-1)}
                    disabled={wheyScoops <= 0}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 font-bold"
                    aria-label="Diminuir scoop"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-5 text-center font-black text-xs text-slate-900">
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
              <MacroPills calories={95} protein={20} carbs={2} fat={1} />
            </div>

            {/* COPO DE LEITE */}
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/90">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center text-lg leading-none shrink-0 shadow-2xs">
                    🥛
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 leading-snug">
                      Copo de Leite (200ml)
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium leading-snug">
                      Integral ou semidesnatado
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    onClick={() => handleAdjustMilkGlasses(-1)}
                    disabled={milkGlasses <= 0}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 font-bold"
                    aria-label="Diminuir copo de leite"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-5 text-center font-black text-xs text-slate-900">
                    {milkGlasses}
                  </div>
                  <button
                    onClick={() => handleAdjustMilkGlasses(1)}
                    className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center active:scale-90 transition-transform font-bold"
                    aria-label="Aumentar copo de leite"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <MacroPills calories={110} protein={6} carbs={9} fat={5} />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. REFEIÇÕES DO DIA (CAFÉ, ALMOÇO, LANCHE, JANTAR)        */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs anim-card-3">
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-white">
              Refeições
            </h3>
          </div>

          <div className="p-3.5 sm:p-4 space-y-3.5 bg-white">

          {/* 3.1 CAFÉ DA MANHÃ */}
          <CustomMealBuilder
            emoji="☕🍳"
            title="Café da Manhã"
            config={breakfastConfig}
            onChange={handleUpdateBreakfastConfig}
            defaultOpen={true}
          />

          {/* 3.2 ALMOÇO: PRATO CASEIRO OU CHURRASQUINHO */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="min-w-[52px] h-10 px-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center whitespace-nowrap text-base leading-none shrink-0 shadow-2xs">
                  {lunchType === 'churrasquinho' ? '🍢🔥' : '🍽️🥩'}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 truncate">
                    Almoço Principal
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap truncate">
                    {currentData.meals.lunch
                      ? `${lunchMacros.calories} kcal • ${lunchMacros.protein}g Prot • ${lunchMacros.carbs}g Carbo`
                      : `~${(lunchType === 'churrasquinho' ? currentLunchChurrascoPreview : currentLunchPlatePreview).calories} kcal • ${(lunchType === 'churrasquinho' ? currentLunchChurrascoPreview : currentLunchPlatePreview).protein}g Prot`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectLunchType(lunchType)}
                className={`px-2.5 py-1.5 rounded-full text-[10px] font-black transition-all flex items-center gap-1 shrink-0 whitespace-nowrap active:scale-95 ${
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
            <div className="grid grid-cols-2 gap-1.5">
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
                <div className="flex items-center justify-between text-xs font-black whitespace-nowrap">
                  <span>🍽️ Prato Caseiro</span>
                  {currentData.meals.lunch === 'caseiro' && (
                    <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3] shrink-0" />
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap truncate">
                  Arroz, feijão e proteína
                </div>
                <div className="text-[10px] font-extrabold text-blue-700 mt-1 whitespace-nowrap">
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
                <div className="flex items-center justify-between text-xs font-black whitespace-nowrap">
                  <span>🍢 Churrasquinho</span>
                  {currentData.meals.lunch === 'churrasquinho' && (
                    <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3] shrink-0" />
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap truncate">
                  Espeto, baião e vinagrete
                </div>
                <div className="text-[10px] font-extrabold text-amber-800 mt-1 whitespace-nowrap">
                  ~{currentLunchChurrascoPreview.calories} kcal • {currentLunchChurrascoPreview.protein}g Prot
                </div>
              </button>
            </div>

            {/* BUILDER DO PRATO CASEIRO */}
            {lunchType === 'caseiro' && (
              <div className="p-2.5 rounded-2xl border border-slate-200 bg-white space-y-2.5 animate-in fade-in duration-150">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                    1. Proteína Principal
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'carne', label: '🥩 Bovino', sub: '100g • 28g Prot' },
                      { id: 'frango', label: '🍗 Frango', sub: '120g • 32g Prot' },
                      { id: 'peixe', label: '🐟 Peixe', sub: '120g • 26g Prot' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleUpdateLunchConfig({ proteinType: item.id as any })}
                        className={`px-1.5 py-2 rounded-xl border text-center transition-all ${
                          lunchConfig.proteinType === item.id
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-2xs ring-1 ring-blue-500/40'
                            : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-[11px] font-black whitespace-nowrap">{item.label}</div>
                        <div className="text-[9.5px] text-slate-500 font-semibold whitespace-nowrap mt-0.5">
                          {item.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {/* Porções de Proteína */}
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">
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
                    <div className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">
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
                    <div className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">
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
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 transition-all whitespace-nowrap ${
                    lunchConfig.hasSalad
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <span>🥗🍅 Salada Verde</span>
                  <span className="text-[10px] font-black">
                    {lunchConfig.hasSalad ? 'INCLUSA (+35 kcal)' : 'SEM SALADA'}
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
            config={snackConfig}
            onChange={handleUpdateSnackConfig}
            allowShake={true}
            defaultOpen={false}
          />

          {/* 3.4 JANTAR COMPLETO (5 OPÇÕES REALISTAS) */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="min-w-[52px] h-10 px-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center whitespace-nowrap text-base leading-none shrink-0 shadow-2xs">
                  🌙🍽️
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 truncate">
                    Jantar
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap truncate">
                    {currentData.meals.dinner
                      ? `${dinnerMacros.calories} kcal • ${dinnerMacros.protein}g Prot • ${dinnerMacros.carbs}g Carbo`
                      : '0 kcal • 0g Prot'}
                  </p>
                </div>
              </div>

              {currentData.meals.dinner && (
                <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 shrink-0 whitespace-nowrap">
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
                    <div className="flex items-center justify-between text-xs font-black whitespace-nowrap">
                      <span className="truncate">
                        {opt.emoji} {opt.title}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[3]" />}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 mt-1 whitespace-nowrap">
                      ~{opt.kcal} kcal • {opt.prot}g Prot
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 1. BUILDER JANTAR: SANDUÍCHE BAGUETE */}
            {currentData.meals.dinner === 'subway' && (
              <div className="p-2.5 rounded-2xl border border-blue-200 bg-white space-y-2.5 animate-in fade-in duration-150">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Tamanho da Baguete
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleUpdateSubwayConfig({ size: '15cm' })}
                      className={`py-2 rounded-xl text-xs font-black border transition-all whitespace-nowrap ${
                        dinnerSubwayConfig.size === '15cm'
                          ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      🥖 15 cm Padrão
                    </button>
                    <button
                      onClick={() => handleUpdateSubwayConfig({ size: '30cm' })}
                      className={`py-2 rounded-xl text-xs font-black border transition-all whitespace-nowrap ${
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
                    <div className="whitespace-nowrap truncate">🍗 Frango Teriyaki</div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-0.5 whitespace-nowrap">
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
                    <div className="whitespace-nowrap truncate">🥩 Carne / Tiras</div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-0.5 whitespace-nowrap">
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
              <div className="p-2.5 rounded-2xl border border-blue-200 bg-white space-y-2.5 animate-in fade-in duration-150">
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'carne', label: '🥩 Bovino', sub: '100g • 28g Prot' },
                    { id: 'frango', label: '🍗 Frango', sub: '120g • 32g Prot' },
                    { id: 'peixe', label: '🐟 Peixe', sub: '120g • 26g Prot' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleUpdateDinnerPlateConfig({ proteinType: item.id as any })}
                      className={`px-1.5 py-2 rounded-xl border text-center transition-all ${
                        dinnerPlateConfig.proteinType === item.id
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-500/40'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-black whitespace-nowrap">{item.label}</div>
                      <div className="text-[9.5px] text-slate-500 font-semibold whitespace-nowrap mt-0.5">
                        {item.sub}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-700 whitespace-nowrap">
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
                    <span className="text-[10px] font-black text-slate-700 whitespace-nowrap">
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
                    <span className="text-[10px] font-black text-slate-700 whitespace-nowrap">
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

            {/* 4. BUILDER JANTAR: HAMBÚRGUER / PODRÃO */}
            {currentData.meals.dinner === 'burger' && (
              <div className="p-3 rounded-2xl border border-amber-200 bg-white space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
                  <span className="text-xs font-black text-slate-900 whitespace-nowrap">
                    🍔 Total do Lanche:
                  </span>
                  <span className="text-xs font-black text-amber-900 bg-white px-2.5 py-0.5 rounded-lg border border-amber-200 whitespace-nowrap">
                    {currentBurgerPreview.calories} kcal • {currentBurgerPreview.protein}g Prot
                  </span>
                </div>

                <div className="space-y-1.5">
                  {[
                    {
                      id: 'artesanal_simples',
                      label: '🍔 Artesanal Simples',
                      desc: 'Brioche, 1 blend 160g, queijo e molho',
                      kcal: 620,
                      prot: 34,
                      carbs: 42,
                      fat: 34
                    },
                    {
                      id: 'artesanal_duplo',
                      label: '🍔🥓 Artesanal Duplo + Bacon',
                      desc: 'Brioche, 2 blends 160g, duplo queijo e bacon',
                      kcal: 940,
                      prot: 58,
                      carbs: 45,
                      fat: 58
                    },
                    {
                      id: 'podrao_xtudo',
                      label: '🍔🍳 Clássico "Podrão" / X-Tudo',
                      desc: 'Pão, carne, ovo, queijo, bacon, batata palha e maionese',
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
                        <span className="text-xs font-black text-slate-900 truncate">{b.label}</span>
                        {dinnerBurgerConfig.style === b.id && (
                          <Check className="w-4 h-4 text-amber-600 stroke-[3] shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{b.desc}</p>
                      <MacroPills calories={b.kcal} protein={b.prot} carbs={b.carbs} fat={b.fat} />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleUpdateBurgerConfig({ hasFries: !dinnerBurgerConfig.hasFries })
                  }
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 transition-all whitespace-nowrap ${
                    dinnerBurgerConfig.hasFries
                      ? 'border-orange-400 bg-orange-50 text-orange-950'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                >
                  <span>🍟🥤 Batata Frita / Combo</span>
                  <span className="text-[10px] font-black">
                    {dinnerBurgerConfig.hasFries ? 'INCLUSO (+380 kcal)' : 'SEM BATATA'}
                  </span>
                </button>
              </div>
            )}

            {/* 5. BUILDER JANTAR: PIZZA POR FATIAS */}
            {currentData.meals.dinner === 'pizza' && (
              <div className="p-3 rounded-2xl border border-amber-200 bg-white space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
                  <span className="text-xs font-black text-slate-900 whitespace-nowrap">
                    🍕 Total ({dinnerPizzaConfig.slices}{' '}
                    {dinnerPizzaConfig.slices === 1 ? 'fatia' : 'fatias'}):
                  </span>
                  <span className="text-xs font-black text-amber-900 bg-white px-2.5 py-0.5 rounded-lg border border-amber-200 whitespace-nowrap">
                    {currentPizzaPreview.calories} kcal • {currentPizzaPreview.protein}g Prot
                  </span>
                </div>

                {/* Contador de Fatias */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">
                      🍕 Quantidade de Fatias
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ~{dinnerPizzaConfig.flavorType === 'proteica' ? 285 : 320} kcal por fatia
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdatePizzaConfig({
                          slices: Math.max(1, dinnerPizzaConfig.slices - 1)
                        })
                      }
                      disabled={dinnerPizzaConfig.slices <= 1}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm disabled:opacity-30 active:scale-90"
                    >
                      -
                    </button>
                    <span className="w-7 text-center font-black text-sm text-slate-900">
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
                      className="w-7 h-7 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-sm disabled:opacity-30 active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Tipo de Sabor */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleUpdatePizzaConfig({ flavorType: 'proteica' })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      dinnerPizzaConfig.flavorType === 'proteica'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-black ring-1 ring-blue-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-black whitespace-nowrap truncate">🍗🍕 Frango / Atum</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap truncate">
                      Frango c/ Catupiry, Portuguesa
                    </div>
                    <div className="text-[10px] font-extrabold text-blue-700 mt-1 whitespace-nowrap">
                      285 kcal • 14g Prot
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
                    <div className="text-xs font-black whitespace-nowrap truncate">🧀🍕 Calabresa / Queijo</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap truncate">
                      Mussarela, 4 Queijos, Pepperoni
                    </div>
                    <div className="text-[10px] font-extrabold text-amber-800 mt-1 whitespace-nowrap">
                      320 kcal • 12g Prot
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. HIDRATAÇÃO (META 4.0L)                                 */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs anim-card-4">
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-white">
              Hidratação
            </h3>

            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg tabular-nums ${
                waterProgress >= 100
                  ? 'bg-emerald-500 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {waterProgress}%
            </span>
          </div>

          <div className="p-3.5 sm:p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center text-lg leading-none shrink-0 shadow-2xs">
                  💧
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Volume Consumido
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <h3 className="text-base font-black text-slate-900 leading-none tabular-nums">
                      {(currentData.waterMl / 1000).toFixed(2)}L
                    </h3>
                    <span className="text-xs font-bold text-slate-400 tabular-nums">
                      / {(targetWaterMl / 1000).toFixed(1).replace('.', ',')}L
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-300 ease-out rounded-full ${
                  waterProgress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, waterProgress)}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleAdjustWater(-250)}
                disabled={currentData.waterMl <= 0}
                className="py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black active:scale-95 transition-all disabled:opacity-40 min-h-[40px] whitespace-nowrap"
              >
                -250 ml
              </button>
              <button
                onClick={() => handleAdjustWater(250)}
                className="py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black active:scale-95 transition-all min-h-[40px] whitespace-nowrap shadow-2xs"
              >
                +250 ml
              </button>
              <button
                onClick={() => handleAdjustWater(500)}
                className="py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black active:scale-95 transition-all min-h-[40px] whitespace-nowrap shadow-2xs"
              >
                +500 ml
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. ESCAPES (5 NÍVEIS PADRONIZADOS)                        */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xs anim-card-5">
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-white">
              Escapes
            </h3>
            {escapeMacros.calories > 0 && (
              <span className="text-[10px] font-black text-white bg-rose-500 px-2.5 py-0.5 rounded-lg whitespace-nowrap shrink-0">
                +{escapeMacros.calories} kcal
              </span>
            )}
          </div>

          <div className="p-3.5 sm:p-4 space-y-2.5 bg-white">
            <div className="space-y-2">
              {escapeItems.map((item) => {
                const count = (currentData.escapes?.[item.key] as number) || 0;
                return (
                  <div
                    key={item.key}
                    className={`p-3 rounded-2xl border transition-all ${
                      count > 0
                        ? 'bg-amber-50/40 border-amber-300 shadow-2xs'
                        : 'bg-slate-50/80 border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center text-lg leading-none shrink-0 shadow-2xs">
                          {item.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black text-slate-900 leading-snug">
                            {item.title}
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium leading-snug mt-0.5">
                            {item.examples}
                          </p>
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
                          className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs active:scale-90 transition-transform"
                          aria-label={`Adicionar ${item.title}`}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <MacroPills
                      calories={item.kcal}
                      protein={item.prot}
                      carbs={item.carbs}
                      fat={item.fat}
                    />
                  </div>
                );
              })}

              {/* Caso exista besteiraCount legado salvo no dia, exibir para permitir ajuste */}
              {(currentData.escapes?.besteiraCount || 0) > 0 && (
                <div className="p-3 rounded-2xl border border-amber-300 bg-amber-50/40">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center text-lg leading-none shrink-0 shadow-2xs">
                        🍩
                      </div>
                      <div className="text-xs font-black text-slate-900">
                        Escape Rápido (Atalho)
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0">
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
                        className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <MacroPills calories={600} protein={6} carbs={65} fat={30} />
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
    </div>
  );
};
