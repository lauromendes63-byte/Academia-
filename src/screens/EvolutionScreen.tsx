import React, { useState, useMemo } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { triggerHaptic } from '../utils/audio';
import {
  TrendingUp,
  Scale,
  Calendar,
  Award,
  ChevronDown,
  Plus,
  Trash2
} from 'lucide-react';

export const EvolutionScreen: React.FC = () => {
  const weightLogs = useLiveQuery(() => db.weightLogs.orderBy('date').toArray());
  const workoutSessions = useLiveQuery(() =>
    db.workoutSessions.where('completed').equals(1 as any).reverse().sortBy('date')
  );
  const routines = useLiveQuery(() => db.routines.toArray());

  // Weight entry state
  const [newWeight, setNewWeight] = useState<string>('97.5');
  const [weightDate, setWeightDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showAddWeight, setShowAddWeight] = useState(false);

  // Selected exercise for Progressive Overload chart
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('pull_1');

  // Build a distinct list of all exercises for the dropdown
  const allExercises = useMemo(() => {
    if (!routines) return [];
    const list: { id: string; name: string; routineId: string }[] = [];
    routines.forEach((r) => {
      r.exercises.forEach((ex) => {
        list.push({ id: ex.id, name: ex.name, routineId: r.id });
      });
    });
    return list;
  }, [routines]);

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

  // Progressive Overload data for the selected exercise
  const exerciseOverloadData = useMemo(() => {
    if (!workoutSessions || !selectedExerciseId) return [];

    // Filter sessions containing this exercise
    const points: { date: string; maxWeight: number; totalVolume: number }[] = [];

    // Reverse to chronological order
    const chronological = [...workoutSessions].reverse();

    chronological.forEach((session) => {
      const match = session.exercises?.find((ex) => ex.exerciseId === selectedExerciseId);
      if (match && !match.abortedForFatigue && match.sets) {
        const completedSets = match.sets.filter((s) => s.completed);
        if (completedSets.length > 0) {
          const maxW = Math.max(...completedSets.map((s) => s.weightKg));
          const vol = completedSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
          points.push({
            date: session.date,
            maxWeight: maxW,
            totalVolume: vol
          });
        }
      }
    });

    return points;
  }, [workoutSessions, selectedExerciseId]);

  const selectedExerciseName = useMemo(() => {
    return (
      allExercises.find((e) => e.id === selectedExerciseId)?.name ||
      'Exercício Selecionado'
    );
  }, [allExercises, selectedExerciseId]);

  const maxPR = useMemo(() => {
    if (exerciseOverloadData.length === 0) return 0;
    return Math.max(...exerciseOverloadData.map((d) => d.maxWeight));
  }, [exerciseOverloadData]);

  return (
    <div className="pb-36 pt-2 max-w-lg mx-auto px-4">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pt-3 pb-3 mb-4 -mx-4 px-4 border-b border-slate-200/60">
        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
          Progresso & Métricas
        </span>
        <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
          Evolução Corporal & Cargas
        </h1>
      </div>

      <div className="space-y-4">
        {/* 1. PESO CORPORAL CARD */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Scale className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
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
              <svg
                viewBox="0 0 320 120"
                className="w-full h-28 overflow-visible"
              >
                {(() => {
                  const values = weightLogs.map((l) => l.weightKg);
                  const min = Math.min(...values) - 0.5;
                  const max = Math.max(...values) + 0.5;
                  const range = max - min || 1;

                  const points = weightLogs.map((l, i) => {
                    const x = (i / (weightLogs.length - 1)) * 300 + 10;
                    const y = 110 - ((l.weightKg - min) / range) * 90;
                    return { x, y, ...l };
                  });

                  const pathD = points
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ');

                  return (
                    <g>
                      {/* Grid Line */}
                      <line
                        x1="10"
                        y1="110"
                        x2="310"
                        y2="110"
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                      />
                      {/* Line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Points */}
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="5"
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2.5"
                          />
                          <text
                            x={p.x}
                            y={p.y - 9}
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

        {/* 2. SOBRECARGA PROGRESSIVA (Cargas Máximas por Exercício) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <TrendingUp className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sobrecarga Progressiva
                </span>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Evolução de Cargas
                </h3>
              </div>
            </div>

            {maxPR > 0 && (
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl text-amber-800 text-xs font-black">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>PR: {maxPR}kg</span>
              </div>
            )}
          </div>

          {/* Exercise Selector Dropdown */}
          <div className="relative mb-4">
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">
              Selecione o Exercício
            </label>
            <div className="relative">
              <select
                value={selectedExerciseId}
                onChange={(e) => {
                  triggerHaptic('light');
                  setSelectedExerciseId(e.target.value);
                }}
                className="w-full h-11 px-3.5 pr-9 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {allExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    [{ex.routineId}] {ex.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Overload Chart */}
          {exerciseOverloadData.length > 0 ? (
            <div className="pt-2">
              <div className="text-xs font-bold text-slate-700 mb-2">
                Histórico de Carga Máxima ({selectedExerciseName})
              </div>
              <svg viewBox="0 0 320 120" className="w-full h-28 overflow-visible">
                {(() => {
                  const values = exerciseOverloadData.map((d) => d.maxWeight);
                  const min = Math.max(0, Math.min(...values) - 5);
                  const max = Math.max(...values) + 5;
                  const range = max - min || 1;

                  const points = exerciseOverloadData.map((d, i) => {
                    const x =
                      exerciseOverloadData.length === 1
                        ? 160
                        : (i / (exerciseOverloadData.length - 1)) * 290 + 15;
                    const y = 110 - ((d.maxWeight - min) / range) * 90;
                    return { x, y, ...d };
                  });

                  const pathD = points
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ');

                  return (
                    <g>
                      <line
                        x1="10"
                        y1="110"
                        x2="310"
                        y2="110"
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                      />
                      {points.length > 1 && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#10b981"
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
                            r="5"
                            fill="#ffffff"
                            stroke="#10b981"
                            strokeWidth="2.5"
                          />
                          <text
                            x={p.x}
                            y={p.y - 9}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="bold"
                            fill="#0f172a"
                          >
                            {p.maxWeight}kg
                          </text>
                        </g>
                      ))}
                    </g>
                  );
                })()}
              </svg>
              <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-semibold">
                <span>{exerciseOverloadData[0].date}</span>
                <span>
                  {exerciseOverloadData[exerciseOverloadData.length - 1].date}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-400">
              Nenhuma sessão concluída com este exercício ainda. Complete o primeiro treino para acompanhar a sobrecarga!
            </div>
          )}
        </div>

        {/* 3. HISTÓRICO GERAL DE TREINOS CONCLUÍDOS */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Histórico de Sessões ({workoutSessions?.length || 0})
            </h3>
          </div>

          {workoutSessions && workoutSessions.length > 0 ? (
            <div className="space-y-2.5">
              {workoutSessions.slice(0, 10).map((session) => {
                const totalSets =
                  session.exercises?.reduce(
                    (acc, ex) =>
                      acc + (ex.sets?.filter((s) => s.completed).length || 0),
                    0
                  ) || 0;

                const totalVol =
                  session.exercises?.reduce(
                    (acc, ex) =>
                      acc +
                      (ex.sets?.reduce(
                        (sAcc, s) => sAcc + (s.completed ? s.weightKg * s.reps : 0),
                        0
                      ) || 0),
                    0
                  ) || 0;

                return (
                  <div
                    key={session.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                          {session.routineId}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Treino {session.routineId}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {session.date}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {totalSets} séries concluídas • {session.exercises?.length || 0} exercícios
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-blue-600">
                        {Math.round(totalVol).toLocaleString('pt-BR')} kg
                      </div>
                      <div className="text-[10px] text-slate-400">tonelagem</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              Nenhum treino concluído ainda.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
