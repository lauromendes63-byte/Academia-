import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type {
  RoutineId,
  RoutineDefinition,
  ExerciseLog,
  WorkoutSession,
  ExercisePerformanceSummary
} from '../types';
import {
  db,
  getRoutineLastPerformances,
  parseRepRange
} from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ExerciseCard } from '../components/ExerciseCard';
import { triggerHaptic } from '../utils/audio';
import { getLocalDateStr } from '../utils/nutritionMath';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Trophy,
  RotateCw,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';

const WORKOUT_DRAFT_KEY = 'academia_workout_draft_v1';

interface WorkoutScreenProps {
  onGoToEvolution?: () => void;
}

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({
  onGoToEvolution
}) => {
  const routines = useLiveQuery(() => db.routines.toArray());
  const userProfile = useLiveQuery(() => db.userProfile.get('main_user'));

  // Active routine selection (A, B, C, D)
  const [selectedRoutineId, setSelectedRoutineId] = useState<RoutineId>('A');
  const hasSyncedInitialRoutineRef = useRef(false);

  // Swipe gesture tracking state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Sync selected routine with user profile's active routine on initial load
  useEffect(() => {
    if (userProfile?.activeRoutine && !hasSyncedInitialRoutineRef.current) {
      hasSyncedInitialRoutineRef.current = true;
      setSelectedRoutineId(userProfile.activeRoutine);
    }
  }, [userProfile?.activeRoutine]);

  // Current selected routine definition
  const currentRoutine = useMemo<RoutineDefinition | undefined>(() => {
    return routines?.find((r) => r.id === selectedRoutineId);
  }, [routines, selectedRoutineId]);

  // Active session in-memory state cached for all routines (A, B, C, D) for 0ms switching
  const [logsByRoutine, setLogsByRoutine] = useState<Record<string, ExerciseLog[]>>(() => {
    try {
      const raw = localStorage.getItem(WORKOUT_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.date === getLocalDateStr() && parsed.logsByRoutine) {
          return parsed.logsByRoutine;
        }
      }
    } catch {
      // ignore storage errors
    }
    return {};
  });
  const [lastPerfMap, setLastPerfMap] = useState<
    Record<string, ExercisePerformanceSummary | null>
  >({});
  const [isFinishing, setIsFinishing] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<{
    routineTitle: string;
    totalSets: number;
    totalExercises: number;
  } | null>(null);

  // Persist in-progress workout draft for today so mobile tab reloads never lose checked sets
  useEffect(() => {
    if (Object.keys(logsByRoutine).length === 0) return;
    try {
      localStorage.setItem(
        WORKOUT_DRAFT_KEY,
        JSON.stringify({
          date: getLocalDateStr(),
          logsByRoutine
        })
      );
    } catch {
      // ignore storage errors
    }
  }, [logsByRoutine]);

  // Preload all routines once so switching between Treino A / B / C / D is 0ms with zero blink
  useEffect(() => {
    let isMounted = true;

    async function preloadAllRoutines() {
      const allRoutines = await db.routines.toArray();
      if (!allRoutines || allRoutines.length === 0) return;

      const allExercises = allRoutines.flatMap((r) => r.exercises);
      const perfMap = await getRoutineLastPerformances(allExercises);

      const initialMap: Record<string, ExerciseLog[]> = {};
      for (const routine of allRoutines) {
        initialMap[routine.id] = routine.exercises.map((ex) => {
          const last = perfMap[ex.id];
          const baseWeight = last ? last.weightKg : ex.defaultWeightKg;
          const { minReps } = parseRepRange(ex.targetReps);

          return {
            exerciseId: ex.id,
            exerciseName: ex.name,
            activeExerciseName: ex.name,
            isSubstituted: false,
            abortedForFatigue: false,
            sets: Array.from({ length: ex.defaultSets }, (_, i) => {
              const prevSetReps =
                last && last.weightKg === baseWeight
                  ? last.lastSetsReps?.[i] ?? last.reps
                  : minReps;
              return {
                setNumber: i + 1,
                weightKg: baseWeight,
                reps: prevSetReps || minReps,
                completed: false
              };
            })
          };
        });
      }

      if (isMounted) {
        setLastPerfMap(perfMap);
        setLogsByRoutine((prev) => {
          const merged: Record<string, ExerciseLog[]> = { ...initialMap };
          for (const [rId, existingLogs] of Object.entries(prev)) {
            const hasActiveProgress = existingLogs?.some(
              (ex) => ex.abortedForFatigue || ex.isSubstituted || ex.sets.some((s) => s.completed)
            );
            if (hasActiveProgress) {
              merged[rId] = existingLogs;
            }
          }
          return merged;
        });
      }
    }

    preloadAllRoutines();

    return () => {
      isMounted = false;
    };
  }, []);

  // Synchronous fallback so exerciseLogs is NEVER empty while IndexedDB resolves
  const exerciseLogs = useMemo<ExerciseLog[]>(() => {
    const cached = logsByRoutine[selectedRoutineId];
    if (cached && cached.length > 0) return cached;
    if (!currentRoutine) return [];

    return currentRoutine.exercises.map((ex) => {
      const last = lastPerfMap[ex.id];
      const baseWeight = last ? last.weightKg : ex.defaultWeightKg;
      const { minReps } = parseRepRange(ex.targetReps);
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        activeExerciseName: ex.name,
        isSubstituted: false,
        abortedForFatigue: false,
        sets: Array.from({ length: ex.defaultSets }, (_, i) => ({
          setNumber: i + 1,
          weightKg: baseWeight,
          reps: minReps,
          completed: false
        }))
      };
    });
  }, [logsByRoutine, selectedRoutineId, currentRoutine, lastPerfMap]);

  // Debounce timers per exercise so rapid +5/-5 taps update UI in 0ms without triggering useLiveQuery cascades
  const weightPersistTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timers = weightPersistTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  // Update an exercise log in 0ms & persist load with a 350ms debounce
  const handleUpdateLog = useCallback(
    (updated: ExerciseLog) => {
      setLogsByRoutine((prev) => {
        const currentList = prev[selectedRoutineId] || exerciseLogs;
        return {
          ...prev,
          [selectedRoutineId]: currentList.map((item) =>
            item.exerciseId === updated.exerciseId ? updated : item
          )
        };
      });

      // Persist the updated weight into db.routines after rapid taps settle (350ms)
      if (updated.sets && updated.sets[0] && updated.sets[0].weightKg > 0) {
        const newWeight = updated.sets[0].weightKg;
        const exId = updated.exerciseId;
        const routineId = selectedRoutineId;

        if (weightPersistTimersRef.current[exId]) {
          clearTimeout(weightPersistTimersRef.current[exId]);
        }

        weightPersistTimersRef.current[exId] = setTimeout(async () => {
          delete weightPersistTimersRef.current[exId];
          const routine = await db.routines.get(routineId);
          if (routine) {
            const exIdx = routine.exercises.findIndex((e) => e.id === exId);
            if (exIdx !== -1 && routine.exercises[exIdx].defaultWeightKg !== newWeight) {
              routine.exercises[exIdx].defaultWeightKg = newWeight;
              await db.routines.put(routine);
            }
          }
        }, 350);
      }
    },
    [selectedRoutineId, exerciseLogs]
  );

  const completedSetsCount = useMemo(() => {
    return exerciseLogs.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0
    );
  }, [exerciseLogs]);

  // Finalize Workout
  const handleFinishWorkout = async () => {
    if (completedSetsCount === 0) {
      alert('Conclua ao menos uma série antes de finalizar o treino!');
      return;
    }

    const finishedRoutineId = selectedRoutineId;
    setIsFinishing(true);
    triggerHaptic('success');

    // Lightweight confetti effect (smooth 60/120fps)
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });

    const todayStr = getLocalDateStr();

    const newSession: WorkoutSession = {
      routineId: finishedRoutineId,
      date: todayStr,
      startTime: Date.now() - 45 * 60000,
      endTime: Date.now(),
      completed: true,
      exercises: exerciseLogs
    };

    // Save to Dexie
    await db.workoutSessions.add(newSession);

    // Save final weights to db.routines so they remain permanent for subsequent workouts!
    if (currentRoutine) {
      const updatedExercises = currentRoutine.exercises.map((ex) => {
        const log = exerciseLogs.find((l) => l.exerciseId === ex.id);
        if (log && log.sets && log.sets[0] && log.sets[0].weightKg > 0) {
          return { ...ex, defaultWeightKg: log.sets[0].weightKg };
        }
        return ex;
      });
      await db.routines.update(currentRoutine.id, { exercises: updatedExercises });
      const refreshedPerf = await getRoutineLastPerformances(updatedExercises);
      setLastPerfMap((prev) => ({ ...prev, ...refreshedPerf }));

      // Reset finished routine's sets to clean state for next cycle
      setLogsByRoutine((prev) => ({
        ...prev,
        [finishedRoutineId]: updatedExercises.map((ex) => {
          const last = refreshedPerf[ex.id];
          const baseWeight = last ? last.weightKg : ex.defaultWeightKg;
          const { minReps } = parseRepRange(ex.targetReps);
          return {
            exerciseId: ex.id,
            exerciseName: ex.name,
            activeExerciseName: ex.name,
            isSubstituted: false,
            abortedForFatigue: false,
            sets: Array.from({ length: ex.defaultSets }, (_, i) => {
              const prevSetReps =
                last && last.weightKg === baseWeight
                  ? last.lastSetsReps?.[i] ?? last.reps
                  : minReps;
              return {
                setNumber: i + 1,
                weightKg: baseWeight,
                reps: prevSetReps || minReps,
                completed: false
              };
            })
          };
        })
      }));
    }

    // Advance active routine in cycle (A -> B -> C -> D -> A)
    const cycle: RoutineId[] = ['A', 'B', 'C', 'D'];
    const currentIdx = cycle.indexOf(finishedRoutineId);
    const nextRoutine = cycle[(currentIdx + 1) % cycle.length];

    await db.userProfile.update('main_user', {
      activeRoutine: nextRoutine
    });
    setSelectedRoutineId(nextRoutine);

    setCompletedSummary({
      routineTitle: currentRoutine?.title || 'Treino Concluído',
      totalSets: completedSetsCount,
      totalExercises: exerciseLogs.filter((ex) => ex.sets.some((s) => s.completed)).length
    });

    setIsFinishing(false);
  };

  // Reset current session state
  const handleResetSession = () => {
    if (window.confirm('Deseja zerar as séries marcadas nesta sessão?')) {
      triggerHaptic('light');
      setLogsByRoutine((prev) => ({
        ...prev,
        [selectedRoutineId]: (prev[selectedRoutineId] || exerciseLogs).map((ex) => ({
          ...ex,
          abortedForFatigue: false,
          sets: ex.sets.map((s) => ({ ...s, completed: false }))
        }))
      }));
    }
  };

  // Touch Swipe Handlers for changing routines seamlessly
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Don't register swipe if user is interacting with form controls or buttons
    if (target?.closest('input, button, select, textarea, [role="button"]')) {
      setTouchStartX(null);
      setTouchStartY(null);
      return;
    }
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    // Must be a deliberate swipe (at least 70px) and predominantly horizontal
    if (Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY) * 1.8) {
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

  const totalActiveSets = exerciseLogs.reduce(
    (acc, ex) => acc + (ex.abortedForFatigue ? 0 : ex.sets.length),
    0
  );
  const sessionProgressPct = Math.min(
    100,
    Math.round((completedSetsCount / Math.max(1, totalActiveSets)) * 100)
  );

  return (
    <div
      className="pb-36 pt-1 max-w-lg mx-auto px-2.5 sm:px-4 touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* BARRA SUPERIOR COMPACTA E DIRETA AO PONTO */}
      <div className="sticky top-0 z-20 bg-slate-50 pt-1.5 pb-2 mb-2.5 -mx-2.5 px-2.5 sm:-mx-4 sm:px-4">
        <div className="bg-slate-900 text-white rounded-2xl p-2.5 shadow-sm border border-slate-800">
          {/* Linha 1: Seletor Direto Treino A / B / C / D */}
          <div className="grid grid-cols-4 gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/10">
            {(['A', 'B', 'C', 'D'] as RoutineId[]).map((rId) => {
              const isSelected = selectedRoutineId === rId;
              return (
                <button
                  key={rId}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedRoutineId(rId);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-black transition-all duration-150 min-h-[34px] flex items-center justify-center active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>Treino {rId}</span>
                </button>
              );
            })}
          </div>

          {/* Linha 2: Apenas os Músculos do Dia (Esquerda) + Botão Recomeçar (Direita) */}
          <div className="flex items-center justify-between gap-2 mt-2 px-1">
            <h1 className="text-xs font-extrabold text-slate-200 tracking-tight truncate">
              {currentRoutine?.subtitle}
            </h1>

            <button
              onClick={handleResetSession}
              className="w-7 h-7 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 text-slate-200 flex items-center justify-center active:scale-90 transition-all shrink-0"
              title="Recomeçar séries desta sessão"
              aria-label="Recomeçar sessão"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Barra fina de progresso (só aparece quando iniciar séries) */}
          {completedSetsCount > 0 && (
            <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  completedSetsCount >= totalActiveSets ? 'bg-emerald-400' : 'bg-blue-500'
                }`}
                style={{ width: `${sessionProgressPct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* EXERCISE CARDS LIST */}
      <div id="exercise-cards-section" className="space-y-3">
        {currentRoutine?.exercises.map((exDef) => {
          const log = exerciseLogs.find((l) => l.exerciseId === exDef.id);
          if (!log) return null;

          return (
            <div key={exDef.id}>
              <ExerciseCard
                exercise={exDef}
                log={log}
                lastPerformance={lastPerfMap[exDef.id]}
                onUpdateLog={handleUpdateLog}
              />
            </div>
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

      {/* MODAL DE CONCLUSÃO COM BOTÃO X E ESCOLHA DE FICAR OU IR PARA EVOLUÇÃO */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            {/* Botão Fechar X no topo */}
            <button
              onClick={() => setCompletedSummary(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center active:scale-90 transition-all"
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

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
                <div className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">Séries Feitas</div>
                <div className="text-base font-black text-slate-900">
                  {completedSummary.totalSets}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">Exercícios</div>
                <div className="text-base font-black text-blue-600">
                  {completedSummary.totalExercises}
                </div>
              </div>
            </div>

            {/* Opções de Ação: Ver Evolução OU Ficar nos Treinos */}
            <div className="space-y-2">
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

              <button
                onClick={() => setCompletedSummary(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs active:scale-95 transition-all"
              >
                Continuar nos Treinos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
