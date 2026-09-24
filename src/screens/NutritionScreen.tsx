import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import type { NutritionLog } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { triggerHaptic } from '../utils/audio';
import {
  Droplets,
  Check,
  Sparkles,
  AlertCircle,
  Cookie,
  Pizza,
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

const BREAKFAST_OPTIONS = [
  { id: 'cafe_leite', label: 'Café c/ Leite', detail: 'Leve / Rápido' },
  { id: 'cafe_tapioca', label: 'Café + Tapioca c/ Queijo', detail: 'Carbo equilibrado' },
  { id: 'ovos', label: 'Adicionei Ovos', detail: '+Proteína de alto valor' }
];

const LUNCH_OPTIONS = [
  { id: 'padrao', label: 'Padrão (2 bifes + arroz/feijão)', detail: '~45g proteína' },
  { id: 'pesado', label: 'Pesado (3 bifes)', detail: '~65g proteína' },
  { id: 'leve', label: 'Leve', detail: 'Menor densidade calórica' }
];

const SNACK_OPTIONS = [
  { id: 'sem_lanche', label: 'Sem lanche', detail: 'Jejum até o jantar' },
  { id: 'tapioca_cafe', label: 'Tapioca c/ Café', detail: 'Energia pré/pós' },
  { id: 'shake', label: 'Shake', detail: 'Praticidade líquida' }
];

const DINNER_OPTIONS = [
  { id: 'subway', label: 'Subway (carne/salada)', detail: 'Prático e proteico' },
  { id: 'caseiro', label: 'Prato caseiro c/ carne', detail: 'Comida de verdade' },
  { id: 'outro', label: 'Outro', detail: 'Refeição variada' }
];

export const NutritionScreen: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [superBesteiraMessage, setSuperBesteiraMessage] = useState<string | null>(null);

  // Live query for the selected date's nutrition log
  const log = useLiveQuery(
    () => db.nutritionLogs.get(selectedDate),
    [selectedDate]
  );

  // Ensure an entry exists in Dexie for the date
  useEffect(() => {
    async function ensureEntry() {
      const existing = await db.nutritionLogs.get(selectedDate);
      if (!existing) {
        const newLog: NutritionLog = {
          date: selectedDate,
          tookWhey: false,
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

  // Current active data or fallback
  const currentData: NutritionLog = log || {
    date: selectedDate,
    tookWhey: false,
    meals: { breakfast: '', lunch: '', snack: '', dinner: '' },
    waterMl: 0,
    escapes: { besteiraCount: 0, superBesteiraCount: 0 }
  };

  // Handlers for instant 1-tap updates
  const handleToggleWhey = async () => {
    triggerHaptic('light');
    const updated = !currentData.tookWhey;
    await db.nutritionLogs.update(selectedDate, {
      tookWhey: updated
    });
  };

  const handleSelectMeal = async (
    mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner',
    optionId: string
  ) => {
    triggerHaptic('light');
    const currentVal = currentData.meals[mealType];
    const nextVal = currentVal === optionId ? '' : optionId; // Tap again to deselect
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

  // Date shifting
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
    <div className="pb-36 pt-2 max-w-lg mx-auto px-4">
      {/* HEADER & DATE SELECTOR */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pt-3 pb-3 mb-4 -mx-4 px-4 border-b border-slate-200/60">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              Nutrição Intuitiva
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Dieta & Hidratação
            </h1>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-2xs">
            <button
              onClick={() => handleShiftDate(-1)}
              className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95"
              aria-label="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-slate-800 capitalize min-w-[85px] text-center">
              {isToday ? 'Hoje' : formattedDisplayDate}
            </span>
            <button
              onClick={() => handleShiftDate(1)}
              disabled={isToday}
              className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 active:scale-95 disabled:opacity-30"
              aria-label="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Macro Target Banner */}
        <div className="mt-3 flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-100/80 text-slate-600 font-medium">
          <span>Meta: 98kg • Recomposição</span>
          <span className="font-bold text-slate-800">Alvo: 185g Prot • 4,0L Água</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. MASTER WHEY TOGGLE CARD */}
        <div
          onClick={handleToggleWhey}
          className={`cursor-pointer rounded-3xl p-5 border transition-all duration-200 shadow-sm active:scale-[0.99] ${
            currentData.tookWhey
              ? 'bg-blue-600 border-blue-600 text-white shadow-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                  currentData.tookWhey
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}
              >
                <Sparkles className="w-6 h-6 stroke-[2.2]" />
              </div>

              <div>
                <div
                  className={`text-xs font-bold uppercase tracking-wider ${
                    currentData.tookWhey ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  Suplementação Mestre
                </div>
                <div className="text-base font-black leading-tight">
                  Tomou Whey hoje?
                </div>
                <div
                  className={`text-xs font-medium mt-0.5 ${
                    currentData.tookWhey ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  +50g de proteína pura (2 scoops)
                </div>
              </div>
            </div>

            {/* Visual Toggle Pill */}
            <div
              className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center ${
                currentData.tookWhey ? 'bg-white justify-end' : 'bg-slate-200 justify-start'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full shadow-md transition-all ${
                  currentData.tookWhey ? 'bg-blue-600' : 'bg-white'
                }`}
              />
            </div>
          </div>

          {/* DYNAMIC FEEDBACK BADGE */}
          <div className="mt-4 pt-3 border-t border-slate-100/30">
            {currentData.tookWhey ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-100 text-xs font-bold">
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Whey garantido! Meta de sólidos reduzida para ~135g.</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200/80">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Sem Whey: reforce carne/ovos no almoço e jantar (~185g sólidos).</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. ÁGUA (META 4.0L) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
                <Droplets className="w-5 h-5 fill-current" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Hidratação Diária
                </span>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {(currentData.waterMl / 1000).toFixed(2)}L{' '}
                  <span className="text-xs font-semibold text-slate-400">/ 4,0L</span>
                </h3>
              </div>
            </div>

            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                waterProgress >= 100
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-cyan-50 text-cyan-700'
              }`}
            >
              {waterProgress}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                waterProgress >= 100 ? 'bg-emerald-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, waterProgress)}%` }}
            />
          </div>

          {/* 1-Tap Water Increment Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleAdjustWater(-250)}
              disabled={currentData.waterMl <= 0}
              className="py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold active:scale-95 transition-all disabled:opacity-40 min-h-[44px]"
            >
              -250 ml
            </button>
            <button
              onClick={() => handleAdjustWater(250)}
              className="py-2.5 rounded-xl border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold active:scale-95 transition-all min-h-[44px]"
            >
              +250 ml (Copo)
            </button>
            <button
              onClick={() => handleAdjustWater(500)}
              className="py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold active:scale-95 transition-all min-h-[44px]"
            >
              +500 ml (Garrafa)
            </button>
          </div>
        </div>

        {/* 3. TAPS RÁPIDOS POR REFEIÇÃO */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Refeições Base (1 Tap)
            </h3>
          </div>

          {/* Café da manhã */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2">Café da Manhã</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {BREAKFAST_OPTIONS.map((opt) => {
                const isSelected = currentData.meals.breakfast === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectMeal('breakfast', opt.id)}
                    className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] min-h-[50px] ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-bold shadow-xs'
                        : 'border-slate-200/90 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Almoço */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2">Almoço</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {LUNCH_OPTIONS.map((opt) => {
                const isSelected = currentData.meals.lunch === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectMeal('lunch', opt.id)}
                    className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] min-h-[50px] ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-bold shadow-xs'
                        : 'border-slate-200/90 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{opt.detail}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lanche (Opcional) */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2">Lanche da Tarde</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SNACK_OPTIONS.map((opt) => {
                const isSelected = currentData.meals.snack === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectMeal('snack', opt.id)}
                    className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] min-h-[50px] ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-bold shadow-xs'
                        : 'border-slate-200/90 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Jantar */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2">Jantar</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DINNER_OPTIONS.map((opt) => {
                const isSelected = currentData.meals.dinner === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectMeal('dinner', opt.id)}
                    className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] min-h-[50px] ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 text-blue-950 font-bold shadow-xs'
                        : 'border-slate-200/90 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. CONTROLE DE ESCAPES & BESTEIRAS (SEM JULGAMENTO) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Acompanhamento Realista
              </span>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Controle de Escapes Calóricos
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Registre escapes com 1 toque para balancear a recomposição sem burocracia de pesar comida.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {/* BOTÃO + BESTEIRA (~600 kcal) */}
            <div className="p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Cookie className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-black text-amber-900">+ Besteira</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    ~600 kcal
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/80 mt-1">
                  Ex: Cookie recheado 150-180g, Eskibom, pedaço de bolo.
                </p>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-amber-200/50">
                <span className="text-xs font-bold text-amber-950">
                  {currentData.escapes.besteiraCount || 0}x no dia
                </span>
                <div className="flex items-center gap-1">
                  {currentData.escapes.besteiraCount > 0 && (
                    <button
                      onClick={() => handleAddBesteira(-1)}
                      className="w-7 h-7 rounded-lg bg-amber-200/60 hover:bg-amber-200 text-amber-900 flex items-center justify-center text-xs font-bold active:scale-95"
                    >
                      -
                    </button>
                  )}
                  <button
                    onClick={() => handleAddBesteira(1)}
                    className="px-3 h-8 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold active:scale-95 shadow-sm"
                  >
                    + Registrar
                  </button>
                </div>
              </div>
            </div>

            {/* BOTÃO + SUPER BESTEIRA (~1.200 a 1.500+ kcal) */}
            <div className="p-3.5 rounded-2xl border border-red-200/80 bg-red-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Pizza className="w-4 h-4 text-red-600" />
                    <span className="text-xs font-black text-red-900">+ Super Besteira</span>
                  </div>
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                    ~1.200-1.500+ kcal
                  </span>
                </div>
                <p className="text-[11px] text-red-800/80 mt-1">
                  Ex: Rodízio de pizza, burguer duplo + fritas, refeição livre.
                </p>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-red-200/50">
                <span className="text-xs font-bold text-red-950">
                  {currentData.escapes.superBesteiraCount || 0}x no dia
                </span>
                <div className="flex items-center gap-1">
                  {currentData.escapes.superBesteiraCount > 0 && (
                    <button
                      onClick={() => handleAddSuperBesteira(-1)}
                      className="w-7 h-7 rounded-lg bg-red-200/60 hover:bg-red-200 text-red-900 flex items-center justify-center text-xs font-bold active:scale-95"
                    >
                      -
                    </button>
                  )}
                  <button
                    onClick={() => handleAddSuperBesteira(1)}
                    className="px-3 h-8 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold active:scale-95 shadow-sm"
                  >
                    + Registrar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* OBJECTIVE COACHING TOAST / BANNER FOR SUPER BESTEIRA */}
          {superBesteiraMessage && (
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Saldo calórico computado:</span>{' '}
                {superBesteiraMessage}
              </div>
              <button
                onClick={() => setSuperBesteiraMessage(null)}
                className="text-slate-400 hover:text-slate-700 font-bold ml-1 text-sm"
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
