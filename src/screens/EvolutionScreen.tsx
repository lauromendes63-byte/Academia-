import React, { useState, useMemo } from 'react';
import { db } from '../db/db';
import type { RoutineId, RoutineDefinition } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { triggerHaptic } from '../utils/audio';
import {
  TrendingUp,
  Scale,
  Award,
  Plus,
  Trash2,
  Flame,
  CheckCircle2
} from 'lucide-react';

export const EvolutionScreen: React.FC = () => {
  const weightLogs = useLiveQuery(() => db.weightLogs.orderBy('date').toArray());
  
  // Query all completed sessions reliably
  const workoutSessions = useLiveQuery(async () => {
    const list = await db.workoutSessions.toArray();
    return list
      .filter((s) => s.completed)
      .sort((a, b) => b.date.localeCompare(a.date));
  }) || [];

  const routines = useLiveQuery(() => db.routines.toArray());

  // Selected routine tab for routine-level overload analysis (A, B, C, D)
  const [selectedRoutineId, setSelectedRoutineId] = useState<RoutineId>('A');

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

  // Weight progression calculation
  const weightStats = useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) return null;
    const initial = weightLogs[0].weightKg;
    const latest = weightLogs[weightLogs.length - 1].weightKg;
    const delta = latest - initial;
    return { initial, latest, delta };
  }, [weightLogs]);

  // =========================================================
  // 1. FREQUÊNCIA SEMANAL & MENSAL (META: 4X POR SEMANA)
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
    const weeklyCount = thisWeekSessions.length;
    const WEEKLY_GOAL = 4;
    const weeklyProgress = Math.min(100, Math.round((weeklyCount / WEEKLY_GOAL) * 100));

    // Daily breakdown for this week
    const weekDayPills = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((label, idx) => {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + idx);
      const dStr = d.toISOString().split('T')[0];
      const hadWorkout = workoutSessions.some((s) => s.date === dStr);
      const isToday = dStr === now.toISOString().split('T')[0];
      return { label, dayNumber: d.getDate(), dStr, hadWorkout, isToday };
    });

    // Month stats
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthSessions = workoutSessions.filter((s) => s.date.startsWith(currentMonthPrefix));
    const monthlyCount = thisMonthSessions.length;
    const currentMonthName = now.toLocaleDateString('pt-BR', { month: 'long' });

    return {
      weeklyCount,
      weeklyGoal: WEEKLY_GOAL,
      weeklyProgress,
      weekDayPills,
      monthlyCount,
      currentMonthName,
      totalSessions: workoutSessions.length
    };
  }, [workoutSessions]);

  // =========================================================
  // 2. SOBRECARGA PROGRESSIVA POR ROTINA (ABCD)
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

  // Total volume/tonnage progression data for this specific routine
  const routineVolumeData = useMemo(() => {
    return routineSessionsChronological.map((s) => {
      const vol = (s.exercises || []).reduce((acc, ex) => {
        return (
          acc +
          (ex.sets || []).reduce(
            (sAcc, set) => sAcc + (set.completed ? set.weightKg * set.reps : 0),
            0
          )
        );
      }, 0);

      return {
        date: s.date,
        totalVolume: Math.round(vol)
      };
    });
  }, [routineSessionsChronological]);

  const maxRoutineVolume = useMemo(() => {
    if (routineVolumeData.length === 0) return 0;
    return Math.max(...routineVolumeData.map((d) => d.totalVolume));
  }, [routineVolumeData]);

  // Detailed exercise overload progression for all exercises in this routine
  const exerciseOverloadMatrix = useMemo(() => {
    if (!currentRoutine) return [];

    return currentRoutine.exercises.map((exDef) => {
      // Find all performances for this exercise across all sessions of this routine
      const weightsLogged: { date: string; weightKg: number }[] = [];

      routineSessionsChronological.forEach((session) => {
        const found = session.exercises?.find(
          (e) => e.exerciseId === exDef.id || e.exerciseName === exDef.name
        );
        if (found && !found.abortedForFatigue && found.sets) {
          const completed = found.sets.filter((s) => s.completed);
          if (completed.length > 0) {
            const maxW = Math.max(...completed.map((s) => s.weightKg));
            weightsLogged.push({ date: session.date, weightKg: maxW });
          }
        }
      });

      const initialWeight =
        weightsLogged.length > 0 ? weightsLogged[0].weightKg : exDef.defaultWeightKg;
      const latestWeight =
        weightsLogged.length > 0
          ? weightsLogged[weightsLogged.length - 1].weightKg
          : exDef.defaultWeightKg;
      const maxWeight =
        weightsLogged.length > 0
          ? Math.max(...weightsLogged.map((w) => w.weightKg))
          : exDef.defaultWeightKg;
      const delta = latestWeight - initialWeight;
      const hasProgress = delta > 0;

      return {
        id: exDef.id,
        name: exDef.name,
        muscleGroup: exDef.muscleGroup,
        targetReps: exDef.targetReps,
        defaultSets: exDef.defaultSets,
        initialWeight,
        latestWeight,
        maxWeight,
        delta,
        hasProgress,
        logsCount: weightsLogged.length
      };
    });
  }, [currentRoutine, routineSessionsChronological]);

  const evolvedCount = exerciseOverloadMatrix.filter((e) => e.hasProgress).length;

  return (
    <div className="pb-36 pt-2 max-w-lg mx-auto px-4">
      {/* HEADER CENTRALIZADO PREMIUM */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pt-2 pb-2.5 mb-3 -mx-4 px-4 border-b border-slate-200/60">
        <div className="text-center min-w-0 px-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 shadow-2xs mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
              Progresso & Métricas
            </span>
          </div>
          <h1 className="text-base font-black text-slate-900 tracking-tight truncate leading-tight">
            Evolução Corporal & Cargas
          </h1>
        </div>
      </div>

      <div className="space-y-4">
        {/* ========================================================= */}
        {/* 1. FREQUÊNCIA & ASSIDUIDADE (META: 4X POR SEMANA) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Assiduidade Semanal (Meta 4x)
                </span>
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-lg font-black text-slate-900 leading-none">
                    {frequencyStats.weeklyCount} / {frequencyStats.weeklyGoal} treinos
                  </h3>
                </div>
              </div>
            </div>

            <span
              className={`text-xs font-black px-2.5 py-1 rounded-xl whitespace-nowrap ${
                frequencyStats.weeklyCount >= frequencyStats.weeklyGoal
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {frequencyStats.weeklyCount >= frequencyStats.weeklyGoal
                ? 'Meta Batida! 🔥'
                : `${frequencyStats.weeklyProgress}% da meta`}
            </span>
          </div>

          {/* Barra de Progresso Semanal */}
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
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

          {/* Resumo do Mês */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
            <span>
              Em <strong className="text-slate-900 font-bold capitalize">{frequencyStats.currentMonthName}</strong>: {frequencyStats.monthlyCount} {frequencyStats.monthlyCount === 1 ? 'treino' : 'treinos'}
            </span>
            <span className="text-slate-400 text-[11px]">
              {frequencyStats.totalSessions} sessões no total
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. SOBRECARGA PROGRESSIVA POR ROTINA (ABCD) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <TrendingUp className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Sobrecarga por Treino
                </span>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Evolução em Todos os Exercícios
                </h3>
              </div>
            </div>

            {maxRoutineVolume > 0 && (
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-xl text-amber-800 text-[11px] font-black">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>Recorde: {maxRoutineVolume.toLocaleString('pt-BR')}kg</span>
              </div>
            )}
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
          <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
            <span className="text-xs font-black text-slate-800">
              {currentRoutine?.title}: <span className="font-normal text-slate-600">{currentRoutine?.subtitle}</span>
            </span>
            <span className="text-[10px] font-black text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full shrink-0 ml-2">
              {evolvedCount}/{exerciseOverloadMatrix.length} em alta
            </span>
          </div>

          {/* GRÁFICO DE VOLUME / TONELAGEM DO TREINO */}
          {routineVolumeData.length > 0 ? (
            <div className="pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                <span>Evolução de Tonelagem (Treino {selectedRoutineId})</span>
                <span className="text-blue-600">{routineVolumeData.length} {routineVolumeData.length === 1 ? 'sessão' : 'sessões'}</span>
              </div>
              <svg viewBox="0 0 320 100" className="w-full h-24 overflow-visible">
                {(() => {
                  const values = routineVolumeData.map((d) => d.totalVolume);
                  const min = Math.max(0, Math.min(...values) - 100);
                  const max = Math.max(...values) + 100;
                  const range = max - min || 1;

                  const points = routineVolumeData.map((d, i) => {
                    const x =
                      routineVolumeData.length === 1
                        ? 160
                        : (i / (routineVolumeData.length - 1)) * 290 + 15;
                    const y = 90 - ((d.totalVolume - min) / range) * 75;
                    return { x, y, ...d };
                  });

                  const pathD = points
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ');

                  return (
                    <g>
                      <line
                        x1="10"
                        y1="90"
                        x2="310"
                        y2="90"
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                      />
                      {points.length > 1 && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
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
                            {p.totalVolume}kg
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>
            </div>
          ) : (
            <div className="text-center py-4 bg-slate-50/50 rounded-2xl border border-slate-100 text-xs text-slate-400">
              Nenhuma sessão concluída do Treino {selectedRoutineId} ainda. Complete um treino para traçar a curva de volume!
            </div>
          )}

          {/* MATRIZ DE TODOS OS EXERCÍCIOS DO TREINO */}
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              Status de Carga • Todos os Exercícios
            </div>

            <div className="space-y-2">
              {exerciseOverloadMatrix.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                        {item.muscleGroup}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {item.defaultSets}× {item.targetReps}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-slate-900 mt-0.5 truncate">
                      {item.name}
                    </h4>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-medium">
                      <span>Base: <strong className="text-slate-700">{item.initialWeight}kg</strong></span>
                      <span>•</span>
                      <span>Atual: <strong className="text-slate-900 font-bold">{item.latestWeight}kg</strong></span>
                      {item.maxWeight > item.latestWeight && (
                        <>
                          <span>•</span>
                          <span className="text-amber-700 font-bold">PR: {item.maxWeight}kg</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badge de Evolução em kg */}
                  <div className="shrink-0 text-right">
                    {item.delta > 0 ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                        <span>+{item.delta}kg</span>
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

        {/* ========================================================= */}
        {/* 3. PESAGEM SEMANAL & EVOLUÇÃO CORPORAL */}
        {/* ========================================================= */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
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
              onClick={() => setShowAddWeight(!showAddWeight)}
              className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Pesar</span>
            </button>
          </div>

          {/* Form to add weight */}
          {showAddWeight && (
            <form
              onSubmit={handleAddWeightLog}
              className="p-3.5 mb-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="250"
                    required
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 block">
                    Data
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

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs active:scale-95 transition-all"
                >
                  Salvar Pesagem
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddWeight(false)}
                  className="px-3 h-9 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs"
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
