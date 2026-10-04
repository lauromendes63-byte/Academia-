import React, { useState, useMemo } from 'react';
import { db } from '../db/db';
import type { RoutineId, RoutineDefinition, NutritionLog } from '../types';
import {
  calculatePlateMacros,
  calculateSubwayMacros,
  calculateCustomMealMacros,
  calculateChurrascoMacros,
  calculateBurgerMacros,
  calculatePizzaMacros,
  calculateEscapesMacros,
  getResolvedBreakfastConfig,
  getResolvedSnackConfig
} from './NutritionScreen';
import { useLiveQuery } from 'dexie-react-hooks';
import { triggerHaptic } from '../utils/audio';
import {
  TrendingUp,
  Scale,
  Plus,
  Trash2,
  Flame,
  CheckCircle2,
  Calendar,
  Target,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  Droplets,
  Sparkles,
  Award,
  Check,
  AlertCircle
} from 'lucide-react';

const EXERCISE_COLORS = [
  '#ef4444', // Vermelho Vibrante (Red) - 1ª cor
  '#2563eb', // Azul Cobalto
  '#10b981', // Verde Esmeralda
  '#8b5cf6', // Roxo / Violeta
  '#f59e0b', // Âmbar / Dourado
  '#06b6d4', // Ciano
  '#ec4899', // Rosa Pink
  '#f97316'  // Laranja Quente
];

export function computeNutritionLogTotals(log: NutritionLog) {
  const wheyScoops = log.wheyScoops ?? (log.tookWhey ? 2 : 0);
  const wheyProtein = wheyScoops * 20;
  const wheyCalories = wheyScoops * 95;

  const milkGlasses = log.milkGlasses ?? 0;
  const milkProtein = milkGlasses * 6;
  const milkCalories = milkGlasses * 110;
  const milkCarbs = milkGlasses * 9;
  const milkFat = milkGlasses * 5;

  const bConfig = getResolvedBreakfastConfig(log);
  const bMacros = calculateCustomMealMacros(bConfig);

  let lunchMacros = { protein: 0, carbs: 0, fat: 0, calories: 0 };
  if (log.meals?.lunch === 'caseiro') {
    lunchMacros = calculatePlateMacros(log.lunchConfig);
  } else if (log.meals?.lunch === 'churrasquinho') {
    lunchMacros = calculateChurrascoMacros(log.churrascoConfig);
  }

  const sConfig = getResolvedSnackConfig(log);
  const sMacros = calculateCustomMealMacros(sConfig);

  let dinnerMacros = { protein: 0, carbs: 0, fat: 0, calories: 0 };
  if (log.meals?.dinner === 'subway') {
    dinnerMacros = calculateSubwayMacros(log.dinnerSubwayConfig);
  } else if (log.meals?.dinner === 'caseiro') {
    dinnerMacros = calculatePlateMacros(log.dinnerPlateConfig);
  } else if (log.meals?.dinner === 'churrasquinho') {
    dinnerMacros = calculateChurrascoMacros(log.dinnerChurrascoConfig);
  } else if (log.meals?.dinner === 'burger') {
    dinnerMacros = calculateBurgerMacros(log.dinnerBurgerConfig);
  } else if (log.meals?.dinner === 'pizza') {
    dinnerMacros = calculatePizzaMacros(log.dinnerPizzaConfig);
  }

  const escapeInfo = calculateEscapesMacros(log.escapes);
  const escapesCount =
    (log.escapes?.chocSmallCount || 0) +
    (log.escapes?.snickersBarCount || 0) +
    (log.escapes?.iceCreamCount || 0) +
    (log.escapes?.saltySnackCount || 0) +
    (log.escapes?.besteiraCount || 0) +
    (log.escapes?.superBesteiraCount || 0);

  const protein =
    wheyProtein +
    milkProtein +
    bMacros.protein +
    lunchMacros.protein +
    sMacros.protein +
    dinnerMacros.protein +
    escapeInfo.protein;
  const carbs =
    milkCarbs +
    bMacros.carbs +
    lunchMacros.carbs +
    sMacros.carbs +
    dinnerMacros.carbs +
    escapeInfo.carbs;
  const fat =
    milkFat +
    bMacros.fat +
    lunchMacros.fat +
    sMacros.fat +
    dinnerMacros.fat +
    escapeInfo.fat;
  const calories =
    wheyCalories +
    milkCalories +
    bMacros.calories +
    lunchMacros.calories +
    sMacros.calories +
    dinnerMacros.calories +
    escapeInfo.calories;
  const waterL = (log.waterMl || 0) / 1000;

  return {
    protein,
    carbs,
    fat,
    calories,
    waterL,
    waterMl: log.waterMl || 0,
    escapesCount
  };
}

export const EvolutionScreen: React.FC = () => {
  const weightLogs = useLiveQuery(() => db.weightLogs.orderBy('date').toArray());

  // Query all completed sessions reliably
  const workoutSessions = useLiveQuery(async () => {
    const list = await db.workoutSessions.toArray();
    return list
      .filter((s) => s.completed)
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.id || 0) - (a.id || 0);
      });
  }) || [];

  const routines = useLiveQuery(() => db.routines.toArray());

  // Sub-aba de visualização: 'treinos' | 'nutricao'
  const [evolutionTab, setEvolutionTab] = useState<'treinos' | 'nutricao'>('treinos');

  const nutritionLogs = useLiveQuery(() => db.nutritionLogs.toArray()) || [];
  const profile = useLiveQuery(() => db.userProfile.get('main_user'));

  // Selected routine tab for routine-level overload analysis (A, B, C, D)
  const [selectedRoutineId, setSelectedRoutineId] = useState<RoutineId>('A');

  // Accordion to expand/see specific workouts of the week/month
  const [showSessionsList, setShowSessionsList] = useState(false);

  // Weight entry state
  const [newWeight, setNewWeight] = useState<string>('97.5');
  const [weightDate, setWeightDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showAddWeight, setShowAddWeight] = useState(false);

  // Handle adding weekly weight log
  const handleAddWeightLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newWeight.replace(',', '.'));
    if (isNaN(val) || val <= 30 || val >= 300) {
      alert('Informe um peso válido (ex: 97.5 kg)');
      return;
    }

    triggerHaptic('success');
    await db.weightLogs.add({
      date: weightDate,
      weightKg: val
    });

    // Also update user profile current weight
    await db.userProfile.update('main_user', {
      currentWeightKg: val
    });

    setShowAddWeight(false);
  };

  const handleDeleteWeight = async (id?: number) => {
    if (!id) return;
    if (window.confirm('Excluir este registro de peso?')) {
      await db.weightLogs.delete(id);
    }
  };

  // Excluir sessão de treino
  const handleDeleteSession = async (id?: number) => {
    if (!id) return;
    if (window.confirm('Deseja realmente excluir este treino do histórico?')) {
      triggerHaptic('alert');
      await db.workoutSessions.delete(id);
    }
  };

  // Weight progression calculation
  const weightStats = useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) return null;
    const initial = weightLogs[0].weightKg;
    const latest = weightLogs[weightLogs.length - 1].weightKg;
    const delta = latest - initial;
    return { initial, latest, delta };
  }, [weightLogs]);

  // =========================================================
  // 1. FREQUÊNCIA SEMANAL & MENSAL (APENAS 1 TREINO POR DIA)
  // =========================================================
  const frequencyStats = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = (dayOfWeek + 6) % 7;
    const mondayDate = new Date(now);
    mondayDate.setDate(now.getDate() - diffToMonday);
    mondayDate.setHours(0, 0, 0, 0);

    const mondayStr = mondayDate.toISOString().split('T')[0];
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(mondayDate.getDate() + 6);
    const sundayStr = sundayDate.toISOString().split('T')[0];

    // Sessions completed this calendar week (Mon-Sun)
    const thisWeekSessions = workoutSessions.filter(
      (s) => s.date >= mondayStr && s.date <= sundayStr
    );
    // REGRA DE OURO: Apenas 1 treino contabilizado por dia!
    const distinctDatesThisWeek = new Set(thisWeekSessions.map((s) => s.date));
    const weeklyCount = distinctDatesThisWeek.size;
    const WEEKLY_GOAL = 4;
    const weeklyProgress = Math.min(100, Math.round((weeklyCount / WEEKLY_GOAL) * 100));

    // Daily breakdown for this week
    const weekDayPills = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((label, idx) => {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + idx);
      const dStr = d.toISOString().split('T')[0];
      const hadWorkout = distinctDatesThisWeek.has(dStr);
      const isToday = dStr === now.toISOString().split('T')[0];
      return { label, dayNumber: d.getDate(), dStr, hadWorkout, isToday };
    });

    // Month stats: dias distintos treinados no mês
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthSessions = workoutSessions.filter((s) => s.date.startsWith(currentMonthPrefix));
    const distinctDatesThisMonth = new Set(thisMonthSessions.map((s) => s.date));
    const monthlyCount = distinctDatesThisMonth.size;
    const currentMonthName = now.toLocaleDateString('pt-BR', { month: 'long' });

    return {
      weeklyCount,
      weeklyGoal: WEEKLY_GOAL,
      weeklyProgress,
      weekDayPills,
      monthlyCount,
      currentMonthName,
      totalDistinctDays: new Set(workoutSessions.map((s) => s.date)).size
    };
  }, [workoutSessions]);

  // =========================================================
  // NUTRIÇÃO & DÉFICIT SEMANAL
  // =========================================================
  const weeklyNutritionStats = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const mondayDate = new Date(now);
    mondayDate.setDate(now.getDate() - diffToMonday);
    mondayDate.setHours(0, 0, 0, 0);

    const calorieTarget = profile?.targetCaloriesKcal || 2200;
    const proteinTarget = profile?.targetProteinGrams || 185;
    const waterTargetMl = profile?.targetWaterMl || 4000;

    const logsMap = new Map<string, NutritionLog>();
    nutritionLogs.forEach((log) => {
      logsMap.set(log.date, log);
    });

    const dayLabels = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const shortLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    const weekDays = dayLabels.map((label, idx) => {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + idx);
      const dStr = d.toISOString().split('T')[0];
      const isToday = dStr === now.toISOString().split('T')[0];

      const log = logsMap.get(dStr);
      const totals = log
        ? computeNutritionLogTotals(log)
        : { protein: 0, carbs: 0, fat: 0, calories: 0, waterL: 0, waterMl: 0, escapesCount: 0 };

      const hasEntries =
        !!log && (totals.calories > 0 || totals.protein > 0 || totals.waterMl > 0);

      const calorieStatus: 'good' | 'warning' | 'over' | 'empty' = !hasEntries
        ? 'empty'
        : totals.calories <= calorieTarget + 50
        ? 'good'
        : totals.calories <= calorieTarget + 250
        ? 'warning'
        : 'over';

      const proteinMet = totals.protein >= proteinTarget * 0.85;
      const waterMet = totals.waterMl >= waterTargetMl * 0.8;

      return {
        label,
        shortLabel: shortLabels[idx],
        dateStr: dStr,
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1,
        isToday,
        hasEntries,
        totals,
        escapesCount: totals.escapesCount,
        calorieStatus,
        proteinMet,
        waterMet
      };
    });

    const loggedDays = weekDays.filter((d) => d.hasEntries);
    const loggedCount = loggedDays.length;

    const totalCalories = loggedDays.reduce((acc, d) => acc + d.totals.calories, 0);
    const totalProtein = loggedDays.reduce((acc, d) => acc + d.totals.protein, 0);
    const totalWater = loggedDays.reduce((acc, d) => acc + d.totals.waterL, 0);

    const avgCalories = loggedCount > 0 ? Math.round(totalCalories / loggedCount) : 0;
    const avgProtein = loggedCount > 0 ? Math.round(totalProtein / loggedCount) : 0;
    const avgWater =
      loggedCount > 0 ? Number((totalWater / loggedCount).toFixed(1)) : 0;

    const daysInCalorieGoal = loggedDays.filter(
      (d) => d.calorieStatus === 'good' || d.calorieStatus === 'warning'
    ).length;
    const daysInProteinGoal = loggedDays.filter((d) => d.proteinMet).length;
    const daysInWaterGoal = loggedDays.filter((d) => d.waterMet).length;

    const adherencePercent =
      loggedCount > 0 ? Math.round((daysInCalorieGoal / loggedCount) * 100) : 0;

    return {
      weekDays,
      loggedCount,
      avgCalories,
      avgProtein,
      avgWater,
      daysInCalorieGoal,
      daysInProteinGoal,
      daysInWaterGoal,
      adherencePercent,
      calorieTarget,
      proteinTarget,
      waterTargetL: Number((waterTargetMl / 1000).toFixed(1)),
      calorieMode: profile?.calorieMode || 'recomposicao'
    };
  }, [nutritionLogs, profile]);

  // =========================================================
  // 2. EVOLUÇÃO POR TREINO (GRÁFICO MULTI-LINHAS POR EXERCÍCIO)
  // =========================================================
  const currentRoutine = useMemo<RoutineDefinition | undefined>(() => {
    return routines?.find((r) => r.id === selectedRoutineId);
  }, [routines, selectedRoutineId]);

  // Filter sessions matching this routine in chronological order
  const routineSessionsChronological = useMemo(() => {
    return workoutSessions
      .filter((s) => s.routineId === selectedRoutineId)
      .slice()
      .reverse();
  }, [workoutSessions, selectedRoutineId]);

  // Curvas de cada exercício do treino ao longo do tempo (cada um com sua cor)
  const exerciseCurves = useMemo(() => {
    if (!currentRoutine) return [];

    return currentRoutine.exercises.map((exDef, exIdx) => {
      const color = EXERCISE_COLORS[exIdx % EXERCISE_COLORS.length];
      const isAssisted =
        !!exDef.isAssisted ||
        exDef.name.toLowerCase().includes('graviton') ||
        exDef.id === 'pull_1' ||
        exDef.id === 'push_5';

      // Points across all sessions of this routine
      const rawPoints = routineSessionsChronological.map((session, sIdx) => {
        const found = session.exercises?.find(
          (e) => e.exerciseId === exDef.id || e.exerciseName === exDef.name
        );
        let weight = exDef.defaultWeightKg;
        if (found && !found.abortedForFatigue && found.sets) {
          const completed = found.sets.filter((s) => s.completed);
          if (completed.length > 0) {
            weight = isAssisted
              ? Math.min(...completed.map((s) => s.weightKg))
              : Math.max(...completed.map((s) => s.weightKg));
          }
        }
        return {
          sessionIdx: sIdx,
          date: session.date,
          weightKg: weight
        };
      });

      const initialWeight =
        rawPoints.length > 0 ? rawPoints[0].weightKg : exDef.defaultWeightKg;
      const latestWeight =
        rawPoints.length > 0 ? rawPoints[rawPoints.length - 1].weightKg : exDef.defaultWeightKg;
      const bestWeight =
        rawPoints.length > 0
          ? isAssisted
            ? Math.min(...rawPoints.map((p) => p.weightKg))
            : Math.max(...rawPoints.map((p) => p.weightKg))
          : exDef.defaultWeightKg;

      // No Graviton, reduzir o contrapeso (ex: 40kg -> 35kg) faz a linha do gráfico SUBIR (+5 de força)
      const points = rawPoints.map((pt) => ({
        ...pt,
        plotWeightKg: isAssisted
          ? initialWeight + (initialWeight - pt.weightKg)
          : pt.weightKg
      }));

      const delta = latestWeight - initialWeight;
      const hasProgress = isAssisted ? delta < 0 : delta > 0;

      return {
        id: exDef.id,
        name: exDef.name.includes('Baiana') ? 'Rosca Bayesiana na Polia' : exDef.name,
        muscleGroup: exDef.muscleGroup,
        targetReps: exDef.targetReps,
        defaultSets: exDef.defaultSets,
        isAssisted,
        color,
        points,
        initialWeight,
        latestWeight,
        bestWeight,
        delta,
        hasProgress
      };
    });
  }, [currentRoutine, routineSessionsChronological]);

  const evolvedCount = exerciseCurves.filter((e) => e.hasProgress).length;

  // Min and max weights for scaling the multi-line chart
  const chartBounds = useMemo(() => {
    if (exerciseCurves.length === 0) return { min: 0, max: 100, range: 100 };
    const allWeights: number[] = [];
    exerciseCurves.forEach((c) => {
      c.points.forEach((p) => allWeights.push(p.plotWeightKg));
      allWeights.push(c.initialWeight);
    });

    const min = Math.max(0, Math.min(...allWeights) - 5);
    const max = Math.max(...allWeights) + 5;
    const range = max - min || 1;
    return { min, max, range };
  }, [exerciseCurves]);

  const hasMultipleSessions = routineSessionsChronological.length >= 2;

  return (
    <div className="pb-36 pt-2 max-w-lg mx-auto px-4">
      {/* HEADER CENTRALIZADO COM SUB-ABAS */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pt-2 pb-2.5 mb-3 -mx-4 px-4 border-b border-slate-200/60">
        <div className="text-center min-w-0 px-2 mb-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 shadow-2xs mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
              Progresso & Métricas
            </span>
          </div>
          <h1 className="text-base font-black text-slate-900 tracking-tight truncate leading-tight">
            {evolutionTab === 'treinos' ? 'Evolução de Cargas' : 'Evolução da Dieta'}
          </h1>
        </div>

        {/* SUB-ABAS: TREINOS & CARGAS vs DIETA & NUTRIÇÃO */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-2xl max-w-sm mx-auto">
          <button
            onClick={() => {
              triggerHaptic('light');
              setEvolutionTab('treinos');
            }}
            className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
              evolutionTab === 'treinos'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Treinos & Cargas</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setEvolutionTab('nutricao');
            }}
            className={`py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
              evolutionTab === 'nutricao'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Dieta & Nutrição</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* ========================================================= */}
        {/* CONTEÚDO DA ABA: TREINOS & CARGAS */}
        {/* ========================================================= */}
        {evolutionTab === 'treinos' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* 1. META SEMANAL DE FREQUÊNCIA (4X NA SEMANA) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs anim-card-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Meta Semanal
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Target className="w-4 h-4 text-blue-600 shrink-0" />
                  <h3 className="text-base font-black text-slate-900 leading-none">
                    {frequencyStats.weeklyCount} de {frequencyStats.weeklyGoal} treinos
                  </h3>
                </div>
              </div>
            </div>

            {/* Botão de Expandir / Ver Sessões com ícone de seta */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setShowSessionsList(!showSessionsList);
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
              title="Ver treinos realizados"
            >
              <span>{showSessionsList ? 'Ocultar' : 'Treinos'}</span>
              {showSessionsList ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
          </div>

          {/* Barra de Progresso Semanal */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                frequencyStats.weeklyCount >= frequencyStats.weeklyGoal
                  ? 'bg-emerald-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${frequencyStats.weeklyProgress}%` }}
            />
          </div>

          {/* Indicadores Visuais dos Dias da Semana (Seg a Dom) */}
          <div className="grid grid-cols-7 gap-1 text-center mb-3">
            {frequencyStats.weekDayPills.map((day, idx) => (
              <div
                key={idx}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-between transition-all ${
                  day.hadWorkout
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-2xs font-bold'
                    : day.isToday
                    ? 'border-blue-400 bg-blue-50/60 text-blue-900 font-bold'
                    : 'border-slate-100 bg-slate-50/50 text-slate-400'
                }`}
              >
                <span className="text-[9px] uppercase tracking-tight">{day.label}</span>
                <span className="text-xs font-black my-0.5">{day.dayNumber}</span>
                <div className="h-3 flex items-center justify-center">
                  {day.hadWorkout ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                  ) : day.isToday ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  ) : (
                    <span className="text-[9px] text-slate-300">•</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Resumo do Mês Centralizado */}
          <div className="pt-2.5 border-t border-slate-100 flex flex-col items-center justify-center gap-1.5 text-center">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50/80 border border-blue-100 text-blue-900 text-xs font-bold shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Em <strong className="capitalize">{frequencyStats.currentMonthName}</strong>: {frequencyStats.monthlyCount} {frequencyStats.monthlyCount === 1 ? 'dia treinado' : 'dias treinados'}
              </span>
            </span>

            {frequencyStats.weeklyCount >= frequencyStats.weeklyGoal && (
              <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80 shadow-2xs">
                Meta Batida! 🔥
              </span>
            )}
          </div>

          {/* LISTA EXPANSÍVEL DE TREINOS COM OPÇÃO DE EXCLUIR */}
          {showSessionsList && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 px-0.5">
                <span>Histórico de Sessões</span>
                <span>{workoutSessions.length} {workoutSessions.length === 1 ? 'treino' : 'treinos'}</span>
              </div>

              {workoutSessions.length > 0 ? (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {workoutSessions.map((session) => {
                    const routineDef = routines?.find((r) => r.id === session.routineId);
                    const focus = routineDef?.title.split(':')[1]?.trim() || session.routineId;

                    return (
                      <div
                        key={session.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {session.routineId}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900 truncate">
                              Treino {session.routineId} • {focus}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {session.date.slice(8, 10)}/{session.date.slice(5, 7)} • {session.exercises?.length || 0} exercícios
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0"
                          title="Excluir treino"
                          aria-label="Excluir treino"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2 text-center">Nenhum treino registrado ainda.</p>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 2. EVOLUÇÃO POR TREINO (SEM TONELAGEM, LINHA POR EXERCÍCIO) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4 anim-card-2">
          {/* Header sem quebra: "Evolução por Treino" */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                <TrendingUp className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  Sobrecarga Progressiva
                </span>
                <h3 className="text-base font-black text-slate-900 leading-tight truncate">
                  Evolução por Treino
                </h3>
              </div>
            </div>

            <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-full shrink-0 shadow-2xs">
              {evolvedCount}/{exerciseCurves.length} em alta
            </span>
          </div>

          {/* ABCD SELECTOR DE ROTINA */}
          <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-2xl">
            {(['A', 'B', 'C', 'D'] as RoutineId[]).map((rId) => {
              const isSel = selectedRoutineId === rId;
              const subLabel =
                rId === 'A' ? 'PULL' : rId === 'B' ? 'LOWER 1' : rId === 'C' ? 'PUSH' : 'LOWER 2';

              return (
                <button
                  key={rId}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedRoutineId(rId);
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center active:scale-95 ${
                    isSel
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <span>Treino {rId}</span>
                  <span className={`text-[9px] font-semibold ${isSel ? 'text-blue-100' : 'text-slate-400'}`}>
                    {subLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Subtítulo do Treino Ativo */}
          <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-xs font-black text-slate-800">
            {currentRoutine?.title}: <span className="font-normal text-slate-600">{currentRoutine?.subtitle}</span>
          </div>

          {/* ========================================================= */}
          {/* GRÁFICO MULTI-LINHAS: CADA EXERCÍCIO COM SUA LINHA E COR */}
          {/* ========================================================= */}
          <div className="pt-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
              <span>Curvas de Carga (kg) • Treino {selectedRoutineId}</span>
              <span className="text-blue-600">
                {routineSessionsChronological.length} {routineSessionsChronological.length === 1 ? 'sessão' : 'sessões'}
              </span>
            </div>

            {/* Legenda Padronizada - Nome Completo de Cada Exercício e Carga Atual */}
            <div className="space-y-1.5 mb-3">
              {exerciseCurves.map((curve) => (
                <div
                  key={curve.id}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200/90 text-slate-800 flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs ring-2 ring-white"
                      style={{ backgroundColor: curve.color }}
                    />
                    <span className="font-bold text-slate-900 leading-snug">
                      {curve.name}
                    </span>
                  </div>
                  <strong className="text-slate-900 font-black shrink-0 text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                    {curve.latestWeight} kg
                  </strong>
                </div>
              ))}
            </div>

            {/* SVG do Gráfico Multi-Linhas */}
            {routineSessionsChronological.length > 0 ? (
              <div className="bg-slate-50/60 p-2.5 rounded-2xl border border-slate-100">
                <svg viewBox="0 0 320 140" className="w-full h-36 overflow-visible">
                  {/* Grid horizontal lines */}
                  <line x1="10" y1="20" x2="310" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" />
                  <line x1="10" y1="65" x2="310" y2="65" stroke="#e2e8f0" strokeDasharray="3 3" />
                  <line x1="10" y1="115" x2="310" y2="115" stroke="#e2e8f0" />

                  {/* Draw line for each exercise */}
                  {exerciseCurves.map((curve) => {
                    const sessionCount = routineSessionsChronological.length;
                    const coords = curve.points.map((pt, i) => {
                      const x =
                        sessionCount === 1
                          ? 160
                          : (i / (sessionCount - 1)) * 280 + 20;
                      const y =
                        115 -
                        ((pt.plotWeightKg - chartBounds.min) / chartBounds.range) * 95;
                      return { x, y, weight: pt.weightKg };
                    });

                    const pathString = coords
                      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
                      .join(' ');

                    return (
                      <g key={curve.id}>
                        {hasMultipleSessions && (
                          <path
                            d={pathString}
                            fill="none"
                            stroke={curve.color}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-all duration-300"
                          />
                        )}
                        {coords.map((c, idx) => (
                          <circle
                            key={idx}
                            cx={c.x}
                            cy={c.y}
                            r="4"
                            fill={curve.color}
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="shadow-2xs"
                          />
                        ))}
                      </g>
                    );
                  })}
                </svg>

                {/* Datas no eixo X */}
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold px-2">
                  <span>{routineSessionsChronological[0]?.date.slice(5).replace('-', '/')}</span>
                  {hasMultipleSessions && (
                    <span>
                      {routineSessionsChronological[
                        routineSessionsChronological.length - 1
                      ]?.date.slice(5).replace('-', '/')}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50/50 rounded-2xl border border-slate-100 text-xs text-slate-400">
                Nenhum treino {selectedRoutineId} registrado ainda. Conclua uma sessão para traçar as linhas de carga!
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* CARGAS POR EXERCÍCIO (FRASE ENXUTA & INTUITIVA) */}
          {/* ========================================================= */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Cargas por Exercício
              </h4>

              {/* Botões mínimos de seleção rápida A B C D */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                {(['A', 'B', 'C', 'D'] as RoutineId[]).map((rId) => (
                  <button
                    key={rId}
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedRoutineId(rId);
                    }}
                    className={`w-6 h-6 rounded-md text-[11px] font-black transition-all ${
                      selectedRoutineId === rId
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {rId}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {exerciseCurves.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="min-w-0 flex-1 flex items-start gap-2">
                    {/* Indicador de cor correspondente à linha do gráfico */}
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                          {item.muscleGroup}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {item.defaultSets}× {item.targetReps}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 mt-0.5 leading-snug">
                        {item.name}
                      </h4>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-medium flex-wrap">
                        <span>Base: <strong className="text-slate-700">{item.initialWeight}kg</strong></span>
                        <span>•</span>
                        <span>Atual: <strong className="text-slate-900 font-bold">{item.latestWeight}kg</strong></span>
                        {(item.isAssisted ? item.bestWeight < item.latestWeight : item.bestWeight > item.latestWeight) && (
                          <>
                            <span>•</span>
                            <span className="text-amber-700 font-bold">PR: {item.bestWeight}kg</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badge de Evolução em kg */}
                  <div className="shrink-0 text-right">
                    {item.hasProgress ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                        <span>{item.delta > 0 ? `+${item.delta}kg` : `${item.delta}kg`}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-xl text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200">
                        {item.latestWeight}kg
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ========================================================= */}
    {/* CONTEÚDO DA ABA: DIETA & NUTRIÇÃO */}
    {/* ========================================================= */}
    {evolutionTab === 'nutricao' && (
      <div className="space-y-4 animate-in fade-in duration-150">
        {/* 1. RESUMO SEMANAL DA DIETA (KCAL, PROTEÍNA, ÁGUA) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4 anim-card-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  Balanço Semanal da Dieta
                </span>
                <h3 className="text-base font-black text-slate-900 leading-tight truncate">
                  Adesão Nutricional
                </h3>
              </div>
            </div>

            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full shrink-0 shadow-2xs">
              {weeklyNutritionStats.loggedCount} de 7 dias logados
            </span>
          </div>

          {/* Grid 3 KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {/* Calorias Médias */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center flex flex-col justify-between">
              <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <Flame className="w-3 h-3 text-amber-500 fill-current" />
                <span>Calorias</span>
              </div>
              <div className="my-1.5">
                <div className="text-lg font-black text-slate-900 leading-none">
                  {weeklyNutritionStats.avgCalories}
                </div>
                <span className="text-[9px] font-bold text-slate-500">
                  / {weeklyNutritionStats.calorieTarget} kcal
                </span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    weeklyNutritionStats.avgCalories <= weeklyNutritionStats.calorieTarget + 50
                      ? 'bg-emerald-500'
                      : weeklyNutritionStats.avgCalories <= weeklyNutritionStats.calorieTarget + 250
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (weeklyNutritionStats.avgCalories / weeklyNutritionStats.calorieTarget) * 100
                    )}%`
                  }}
                />
              </div>
            </div>

            {/* Proteína Média */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center flex flex-col justify-between">
              <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <Award className="w-3 h-3 text-blue-600" />
                <span>Proteína</span>
              </div>
              <div className="my-1.5">
                <div className="text-lg font-black text-slate-900 leading-none">
                  {weeklyNutritionStats.avgProtein}g
                </div>
                <span className="text-[9px] font-bold text-slate-500">
                  / {weeklyNutritionStats.proteinTarget}g meta
                </span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    weeklyNutritionStats.avgProtein >= weeklyNutritionStats.proteinTarget * 0.85
                      ? 'bg-blue-600'
                      : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (weeklyNutritionStats.avgProtein / weeklyNutritionStats.proteinTarget) * 100
                    )}%`
                  }}
                />
              </div>
            </div>

            {/* Água Média */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center flex flex-col justify-between">
              <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <Droplets className="w-3 h-3 text-cyan-500" />
                <span>Água</span>
              </div>
              <div className="my-1.5">
                <div className="text-lg font-black text-slate-900 leading-none">
                  {weeklyNutritionStats.avgWater}L
                </div>
                <span className="text-[9px] font-bold text-slate-500">
                  / {weeklyNutritionStats.waterTargetL}L meta
                </span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    weeklyNutritionStats.avgWater >= weeklyNutritionStats.waterTargetL * 0.8
                      ? 'bg-cyan-500'
                      : 'bg-slate-400'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (weeklyNutritionStats.avgWater / weeklyNutritionStats.waterTargetL) * 100
                    )}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Status do Perfil Calórico */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-emerald-700 block">
                  Perfil Ativo: {weeklyNutritionStats.calorieMode === 'recomposicao' ? 'Recomposição Corporal' : 'Manutenção'}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Meta de {weeklyNutritionStats.calorieTarget} kcal • Déficit de 500 kcal
                </span>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-800 px-2 py-0.5 rounded-lg bg-white border border-emerald-200 shrink-0">
              {weeklyNutritionStats.adherencePercent}% no alvo
            </span>
          </div>
        </div>

        {/* 2. DIAGNÓSTICO INTELIGENTE DA SEMANA */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-2.5 anim-card-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Diagnóstico do Treinador
            </h4>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-medium">
            {weeklyNutritionStats.loggedCount === 0 ? (
              <p className="text-slate-500">
                Nenhum dia registrado nesta semana ainda. Registre suas refeições na aba <strong>Nutrição</strong> para gerar o diagnóstico de recomposição corporal e déficit calórico.
              </p>
            ) : weeklyNutritionStats.avgCalories <= weeklyNutritionStats.calorieTarget + 50 &&
              weeklyNutritionStats.avgProtein >= weeklyNutritionStats.proteinTarget * 0.85 ? (
              <p>
                🔥 <strong>Déficit e Proteínas no ponto!</strong> Você está mantendo a média em{' '}
                <strong>{weeklyNutritionStats.avgCalories} kcal</strong> com ótimo aporte proteico ({weeklyNutritionStats.avgProtein}g/dia). Esse ritmo preserva sua massa muscular e oxida gordura com alta consistência.
              </p>
            ) : weeklyNutritionStats.avgCalories > weeklyNutritionStats.calorieTarget + 100 ? (
              <p>
                ⚠️ <strong>Atenção ao superávit:</strong> Sua média semanal de{' '}
                <strong>{weeklyNutritionStats.avgCalories} kcal</strong> ficou acima do teto do déficit ({weeklyNutritionStats.calorieTarget} kcal). Experimente diminuir as porções de carboidratos ou evitar escapes noturnos para retomar a queima de gordura.
              </p>
            ) : weeklyNutritionStats.avgProtein < weeklyNutritionStats.proteinTarget * 0.85 ? (
              <p>
                💪 <strong>Proteínas abaixo do ideal:</strong> Sua média diária de{' '}
                <strong>{weeklyNutritionStats.avgProtein}g</strong> está abaixo da meta ({weeklyNutritionStats.proteinTarget}g). Adicione doses extras de Whey, copos de leite ou ovos para blindar os músculos durante o déficit.
              </p>
            ) : (
              <p>
                👍 <strong>Bom progresso semanal:</strong> Você manteve{' '}
                <strong>{weeklyNutritionStats.daysInCalorieGoal} de {weeklyNutritionStats.loggedCount} dias</strong> dentro do plano calórico. Mantenha a hidratação acima de {weeklyNutritionStats.waterTargetL}L para potencializar os treinos de força.
              </p>
            )}
          </div>
        </div>

        {/* 3. ACOMPANHAMENTO DIÁRIO (SEG A DOM) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3 anim-card-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Calendar className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Dias da Semana (Seg a Dom)
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {weeklyNutritionStats.daysInCalorieGoal} dias dentro do déficit
            </span>
          </div>

          <div className="space-y-2">
            {weeklyNutritionStats.weekDays.map((day) => (
              <div
                key={day.dateStr}
                className={`p-3 rounded-2xl border transition-all ${
                  day.isToday
                    ? 'border-blue-400 bg-blue-50/20 shadow-2xs'
                    : day.hasEntries
                    ? 'border-slate-200/90 bg-white shadow-2xs'
                    : 'border-slate-100 bg-slate-50/40 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                        day.hasEntries
                          ? day.calorieStatus === 'good'
                            ? 'bg-emerald-600 text-white'
                            : day.calorieStatus === 'warning'
                            ? 'bg-amber-500 text-white'
                            : 'bg-rose-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {day.shortLabel}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>
                          {day.label}, {day.dayNumber}/{String(day.monthNumber).padStart(2, '0')}
                        </span>
                        {day.isToday && (
                          <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            Hoje
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status badge */}
                  {day.hasEntries ? (
                    day.calorieStatus === 'good' ? (
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80 flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Déficit OK</span>
                      </span>
                    ) : day.calorieStatus === 'warning' ? (
                      <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                        <span>Leve Alerta</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/80 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                        <span>Superávit</span>
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400">
                      Sem registros
                    </span>
                  )}
                </div>

                {day.hasEntries && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    {/* Macro pills */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800">
                        ⚡ {day.totals.calories} kcal
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg ${
                          day.proteinMet
                            ? 'bg-blue-50 text-blue-800 border border-blue-100'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        🍗 {day.totals.protein}g prot
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg ${
                          day.waterMet
                            ? 'bg-cyan-50 text-cyan-800 border border-cyan-100'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        💧 {day.totals.waterL.toFixed(1)}L água
                      </span>
                      {day.escapesCount > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80">
                          🍩 {day.escapesCount} escape(s)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* ========================================================= */}
    {/* 3. PESAGEM SEMANAL & BOTÕES RÁPIDOS (+/- 0,5 KG) */}
    {/* ========================================================= */}
    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs anim-card-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Scale className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pesagem Semanal
                </span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-xl font-black text-slate-900">
                    {weightStats ? `${weightStats.latest} kg` : '98.0 kg'}
                  </h3>
                  {weightStats && weightStats.delta !== 0 && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        weightStats.delta < 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {weightStats.delta > 0 ? `+${weightStats.delta.toFixed(1)}` : weightStats.delta.toFixed(1)} kg
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!showAddWeight && weightStats) {
                  setNewWeight(weightStats.latest.toFixed(1));
                }
                setShowAddWeight(!showAddWeight);
              }}
              className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Pesar</span>
            </button>
          </div>

          {/* Form com Stepper Rápido de +/- 0,5 kg */}
          {showAddWeight && (
            <form
              onSubmit={handleAddWeightLog}
              className="p-3.5 mb-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                    Peso Corporal (kg)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        const cur =
                          parseFloat(newWeight.replace(',', '.')) ||
                          (weightStats?.latest ?? 97.5);
                        setNewWeight(Math.max(30, cur - 0.5).toFixed(1));
                      }}
                      className="h-10 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs active:scale-95 shadow-2xs whitespace-nowrap"
                    >
                      -0,5 kg
                    </button>

                    <input
                      type="number"
                      step="0.1"
                      min="30"
                      max="250"
                      required
                      value={newWeight}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNewWeight(e.target.value)}
                      className="w-full h-10 text-center rounded-xl bg-white border border-slate-200 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        const cur =
                          parseFloat(newWeight.replace(',', '.')) ||
                          (weightStats?.latest ?? 97.5);
                        setNewWeight((cur + 0.5).toFixed(1));
                      }}
                      className="h-10 px-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs active:scale-95 shadow-2xs whitespace-nowrap"
                    >
                      +0,5 kg
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                    Data da Pesagem
                  </label>
                  <input
                    type="date"
                    required
                    value={weightDate}
                    onChange={(e) => setWeightDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs active:scale-95 transition-all shadow-2xs"
                >
                  Salvar Pesagem
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddWeight(false)}
                  className="px-3 h-9 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Minimalist SVG Weight Chart */}
          {weightLogs && weightLogs.length > 1 ? (
            <div className="mt-2 pt-2">
              <svg viewBox="0 0 320 110" className="w-full h-24 overflow-visible">
                {(() => {
                  const values = weightLogs.map((l) => l.weightKg);
                  const min = Math.min(...values) - 0.5;
                  const max = Math.max(...values) + 0.5;
                  const range = max - min || 1;

                  const points = weightLogs.map((l, i) => {
                    const x = (i / (weightLogs.length - 1)) * 300 + 10;
                    const y = 100 - ((l.weightKg - min) / range) * 80;
                    return { x, y, ...l };
                  });

                  const pathD = points
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ');

                  return (
                    <g>
                      <line
                        x1="10"
                        y1="100"
                        x2="310"
                        y2="100"
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                      />
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="4.5"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2.5"
                          />
                          <text
                            x={p.x}
                            y={p.y - 8}
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="bold"
                            fill="#0f172a"
                          >
                            {p.weightKg}k
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                <span>{weightLogs[0].date}</span>
                <span>{weightLogs[weightLogs.length - 1].date}</span>
              </div>

              {/* Past entries mini list */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                {weightLogs.slice(-4).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-700"
                  >
                    <span>{entry.weightKg}kg</span>
                    <span className="text-[10px] text-slate-400 font-normal">({entry.date.slice(5)})</span>
                    {weightLogs.length > 1 && (
                      <button
                        onClick={() => handleDeleteWeight(entry.id)}
                        className="text-slate-400 hover:text-red-500 ml-0.5 p-0.5"
                        title="Excluir pesagem"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              Registre ao menos 2 pesagens semanais para gerar a curva de evolução.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
