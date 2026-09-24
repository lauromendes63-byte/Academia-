import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  RoutineId,
  RoutineDefinition,
  ExerciseLog,
  WorkoutSession
} from '../types';
import {
  db,
  getLastExercisePerformance
} from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ExerciseCard } from '../components/ExerciseCard';
import { triggerHaptic } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Trophy,
  RotateCw,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface WorkoutScreenProps {
  onGoToEvolution?: () => void;
}

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({ onGoToEvolution }) => {
  const routines = useLiveQuery(() => db.routines.toArray());
  const userProfile = useLiveQuery(() => db.userProfile.get('main_user'));

  // Active routine selection (A, B, C, D)
  const [selectedRoutineId, setSelectedRoutineId] = useState<RoutineId>('A');

  // Swipe gesture tracking state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Sync selected routine with user profile's active routine on initial load
  useEffect(() => {
    if (userProfile?.activeRoutine) {
      setSelectedRoutineId(userProfile.activeRoutine);
    }
  }, [userProfile?.activeRoutine]);

  // Current selected routine definition
  const currentRoutine = useMemo<RoutineDefinition | undefined>(() => {
    return routines?.find((r) => r.id === selectedRoutineId);
  }, [routines, selectedRoutineId]);

  // Active session in-memory state
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [lastPerfMap, setLastPerfMap] = useState<
    Record<string, { weightKg: number; reps: number; date: string } | null>
  >({});
  const [isFinishing, setIsFinishing] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<{
    routineTitle: string;
    totalSets: number;
    totalTonnage: number;
  } | null>(null);

  // Load / initialize exercise logs when current routine changes
  useEffect(() => {
    if (!currentRoutine) return;

    let isMounted = true;

    async function loadRoutineData() {
      if (!currentRoutine) return;

      const perfMap: Record<string, { weightKg: number; reps: number; date: string } | null> = {};

      const initialLogs: ExerciseLog[] = await Promise.all(
        currentRoutine.exercises.map(async (ex) => {
          const last = await getLastExercisePerformance(ex.id, ex.name);
          perfMap[ex.id] = last;

          const baseWeight = last ? last.weightKg : ex.defaultWeightKg;

          return {
            exerciseId: ex.id,
            exerciseName: ex.name,
            activeExerciseName: ex.name,
            isSubstituted: false,
            abortedForFatigue: false,
            sets: Array.from({ length: ex.defaultSets }, (_, i) => ({
              setNumber: i + 1,
              weightKg: baseWeight,
              reps: parseInt(ex.targetReps.split('-')[0], 10) || 10,
              completed: false
            }))
          };
        })
      );

      if (isMounted) {
        setExerciseLogs(initialLogs);
        setLastPerfMap(perfMap);
      }
    }

    loadRoutineData();

    return () => {
      isMounted = false;
    };
  }, [currentRoutine]);

  // Update an exercise log
  const handleUpdateLog = useCallback((updated: ExerciseLog) => {
    setExerciseLogs((prev) =>
      prev.map((item) => (item.exerciseId === updated.exerciseId ? updated : item))
    );
  }, []);

  // Compute stats
  const totalSetsCount = useMemo(() => {
    return exerciseLogs.reduce((acc, ex) => acc + ex.sets.length, 0);
  }, [exerciseLogs]);

  const completedSetsCount = useMemo(() => {
    return exerciseLogs.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0
    );
  }, [exerciseLogs]);

  const progressPercent = totalSetsCount > 0 ? (completedSetsCount / totalSetsCount) * 100 : 0;

  // Finalize Workout
  const handleFinishWorkout = async () => {
    if (completedSetsCount === 0) {
      alert('Conclua ao menos uma série antes de finalizar o treino!');
      return;
    }

    setIsFinishing(true);
    triggerHaptic('success');

    // Confetti effect
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    let totalTonnage = 0;
    exerciseLogs.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.completed) {
          totalTonnage += s.weightKg * s.reps;
        }
      });
    });

    const todayStr = new Date().toISOString().split('T')[0];

    const newSession: WorkoutSession = {
      routineId: selectedRoutineId,
      date: todayStr,
      startTime: Date.now() - 45 * 60000,
      endTime: Date.now(),
      completed: true,
      exercises: exerciseLogs
    };

    // Save to Dexie
    await db.workoutSessions.add(newSession);

    // Advance active routine in cycle (A -> B -> C -> D -> A)
    const cycle: RoutineId[] = ['A', 'B', 'C', 'D'];
    const currentIdx = cycle.indexOf(selectedRoutineId);
    const nextRoutine = cycle[(currentIdx + 1) % cycle.length];

    await db.userProfile.update('main_user', {
      activeRoutine: nextRoutine
    });

    setCompletedSummary({
      routineTitle: currentRoutine?.title || 'Treino Concluído',
      totalSets: completedSetsCount,
      totalTonnage: Math.round(totalTonnage)
    });

    setIsFinishing(false);
  };

  // Reset current session state
  const handleResetSession = () => {
    if (window.confirm('Deseja zerar as séries marcadas nesta sessão?')) {
      triggerHaptic('light');
      setExerciseLogs((prev) =>
        prev.map((ex) => ({
          ...ex,
          abortedForFatigue: false,
          sets: ex.sets.map((s) => ({ ...s, completed: false }))
        }))
      );
    }
  };

  // Touch Swipe Handlers for changing routines seamlessly
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    // Check if horizontal swipe was intentional
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      const cycle: RoutineId[] = ['A', 'B', 'C', 'D'];
      const currentIdx = cycle.indexOf(selectedRoutineId);

      if (deltaX < 0) {
        // Swiped left -> Next routine
        const nextIdx = (currentIdx + 1) % cycle.length;
        triggerHaptic('light');
        setSelectedRoutineId(cycle[nextIdx]);
      } else {
        // Swiped right -> Previous routine
        const prevIdx = (currentIdx - 1 + cycle.length) % cycle.length;
        triggerHaptic('light');
        setSelectedRoutineId(cycle[prevIdx]);
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  return (
    <div
      className="pb-36 pt-1 max-w-lg mx-auto px-4 touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* HEADER: ROTINAS ABCD SELETOR REFINADO */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pt-2 pb-2.5 mb-3 -mx-4 px-4 border-b border-slate-200/60">
        <div className="flex items-center justify-between mb-2">
          {/* Prominent Muscle Groups Focus */}
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                {currentRoutine?.title.split(':')[1]?.trim() || currentRoutine?.id}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                • Deslize para trocar
              </span>
            </div>
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight mt-0.5 truncate">
              {currentRoutine?.subtitle}
            </h1>
          </div>

          <button
            onClick={handleResetSession}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center active:scale-95 transition-all shrink-0"
            title="Recomeçar séries desta sessão"
            aria-label="Recomeçar sessão"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ABCD TAB SELECTOR COMPACTO */}
        <div className="grid grid-cols-4 gap-1.5 bg-slate-200/60 p-1 rounded-xl">
          {(['A', 'B', 'C', 'D'] as RoutineId[]).map((rId) => {
            const isSelected = selectedRoutineId === rId;
            return (
              <button
                key={rId}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedRoutineId(rId);
                }}
                className={`py-1.5 rounded-lg text-xs font-black transition-all duration-150 min-h-[38px] flex items-center justify-center active:scale-95 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>Treino {rId}</span>
              </button>
            );
          })}
        </div>

        {/* PROGRESS BAR DA SESSÃO */}
        <div className="mt-2 flex items-center gap-2.5">
          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] font-bold text-slate-500 shrink-0">
            {completedSetsCount}/{totalSetsCount} séries ({Math.round(progressPercent)}%)
          </span>
        </div>
      </div>

      {/* EXERCISE CARDS LIST */}
      <div className="space-y-3">
        {currentRoutine?.exercises.map((exDef) => {
          const log = exerciseLogs.find((l) => l.exerciseId === exDef.id);
          if (!log) return null;

          return (
            <ExerciseCard
              key={exDef.id}
              exercise={exDef}
              log={log}
              lastPerformance={lastPerfMap[exDef.id]}
              onUpdateLog={handleUpdateLog}
            />
          );
        })}
      </div>

      {/* BOTTOM FINISH BUTTON */}
      <div className="mt-6 pt-2">
        <button
          onClick={handleFinishWorkout}
          disabled={isFinishing || completedSetsCount === 0}
          className={`w-full py-3.5 px-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all min-h-[50px] ${
            completedSetsCount > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 ring-2 ring-blue-400/20'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>Finalizar e Salvar Treino</span>
        </button>
      </div>

      {/* MODAL DE CONCLUSÃO COMEMORATIVA */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3 shadow-inner">
              <Trophy className="w-7 h-7 stroke-[2.5]" />
            </div>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Treino Salvo com Sucesso!
            </span>

            <h2 className="text-lg font-black text-slate-900 mb-1">
              {completedSummary.routineTitle}
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Sessão gravada no histórico e sobrecarga atualizada.
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">Séries</div>
                <div className="text-base font-black text-slate-900">
                  {completedSummary.totalSets}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">Volume Total</div>
                <div className="text-base font-black text-blue-600">
                  {completedSummary.totalTonnage.toLocaleString('pt-BR')} kg
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setCompletedSummary(null);
                if (onGoToEvolution) onGoToEvolution();
              }}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span>Ver Minha Evolução</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
