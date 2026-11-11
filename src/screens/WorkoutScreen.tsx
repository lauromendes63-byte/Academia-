import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type {
  RoutineId,
  RoutineDefinition,
  ExerciseDefinition,
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
  X,
  Undo2
} from 'lucide-react';

const WORKOUT_DRAFT_KEY = 'academia_workout_draft_v1';
const AUTO_FINISH_DELAY_MS = 420;

function buildFreshExerciseLog(
  ex: ExerciseDefinition,
  last?: ExercisePerformanceSummary | null
): ExerciseLog {
  const baseWeight = last ? last.weightKg : ex.defaultWeightKg;
  const { minReps } = parseRepRange(ex.targetReps);

  return {
    exerciseId: ex.id,
    exerciseName: ex.name,
    activeExerciseName: ex.name,
    isSubstituted: false,
    abortedForFatigue: false,
    sets: Array.from({ length: ex.defaultSets }, (_, i) => {
      const setMatchedBaseWeight =
        last &&
        last.weightKg === baseWeight &&
        (!last.lastSetsWeights ||
          last.lastSetsWeights[i] === undefined ||
          last.lastSetsWeights[i] === baseWeight);

      const prevSetReps = setMatchedBaseWeight
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
}

function alignRoutineLogsStructure(
  routine: RoutineDefinition,
  existingLogs: ExerciseLog[] | undefined,
  perfMap: Record<string, ExercisePerformanceSummary | null>
): ExerciseLog[] {
  if (
    existingLogs &&
    existingLogs.length === routine.exercises.length &&
    existingLogs.every(
      (log, idx) =>
        log.exerciseId === routine.exercises[idx]?.id &&
        log.sets.length === routine.exercises[idx]?.defaultSets
    )
  ) {
    return existingLogs;
  }

  const existingById = new Map(
    (existingLogs ?? []).map((item) => [item.exerciseId, item])
  );

  return routine.exercises.map((ex) => {
    const existing = existingById.get(ex.id);
    if (!existing) {
      return buildFreshExerciseLog(ex, perfMap[ex.id]);
    }

    const syncedName = existing.isSubstituted
      ? existing.activeExerciseName
      : ex.name;
    const freshTemplate = buildFreshExerciseLog(ex, perfMap[ex.id]);
    const reconciledSets =
      existing.sets.length === ex.defaultSets
        ? existing.sets
        : Array.from({ length: ex.defaultSets }, (_, i) => {
            return existing.sets[i] ?? freshTemplate.sets[i];
          });

    return {
      ...existing,
      exerciseName: ex.name,
      activeExerciseName: syncedName,
      sets: reconciledSets
    };
  });
}

function reconcileRoutineLogsOnPreload(
  routine: RoutineDefinition,
  existingLogs: ExerciseLog[] | undefined,
  perfMap: Record<string, ExercisePerformanceSummary | null>
): ExerciseLog[] {
  const existingById = new Map(
    (existingLogs ?? []).map((item) => [item.exerciseId, item])
  );

  return routine.exercises.map((ex) => {
    const existing = existingById.get(ex.id);
    if (!existing) {
      return buildFreshExerciseLog(ex, perfMap[ex.id]);
    }

    const hasProgress =
      existing.abortedForFatigue ||
      existing.isSubstituted ||
      existing.sets.some((s) => s.completed);

    if (!hasProgress) {
      return buildFreshExerciseLog(ex, perfMap[ex.id]);
    }

    const syncedName = existing.isSubstituted
      ? existing.activeExerciseName
      : ex.name;
    const freshTemplate = buildFreshExerciseLog(ex, perfMap[ex.id]);
    const reconciledSets =
      existing.sets.length === ex.defaultSets
        ? existing.sets
        : Array.from({ length: ex.defaultSets }, (_, i) => {
            return existing.sets[i] ?? freshTemplate.sets[i];
          });

    return {
      ...existing,
      exerciseName: ex.name,
      activeExerciseName: syncedName,
      sets: reconciledSets
    };
  });
}

function isWorkoutFullyComplete(logs: ExerciseLog[]): boolean {
  if (logs.length === 0) return false;
  const hasAnyCompletedSet = logs.some((ex) =>
    ex.sets.some((s) => s.completed)
  );
  if (!hasAnyCompletedSet) return false;

  return logs.every(
    (ex) =>
      ex.abortedForFatigue ||
      (ex.sets.length > 0 && ex.sets.every((s) => s.completed))
  );
}

function stripTransientSetFields(logs: ExerciseLog[]): ExerciseLog[] {
  return logs.map((ex) => ({
    ...ex,
    sets: ex.sets.map(({ completedAt: _completedAt, ...rest }) => rest)
  }));
}

interface WorkoutScreenProps {
  onGoToEvolution?: () => void;
}

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({
  onGoToEvolution
}) => {
  const routines = useLiveQuery(() => db.routines.toArray());
  const userProfile = useLiveQuery(() => db.userProfile.get('main_user'));
  const sessionsCount = useLiveQuery(() => db.workoutSessions.count());

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
  const [isUndoing, setIsUndoing] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<{
    routineTitle: string;
    totalSets: number;
    totalExercises: number;
    isAutoCompleted?: boolean;
  } | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<{
    sessionId: number;
    routineId: RoutineId;
    previousLogs: ExerciseLog[];
    previousRoutineExercises: ExerciseDefinition[] | null;
    previousActiveRoutine: RoutineId;
  } | null>(null);

  // Refs for stable callbacks, zero-rerender-cascade updates & safe async finish/undo
  const isMountedRef = useRef(true);
  const isFinishingRef = useRef(false);
  const autoFinishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weightPersistTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const selectedRoutineIdRef = useRef<RoutineId>(selectedRoutineId);
  const logsByRoutineRef = useRef<Record<string, ExerciseLog[]>>(logsByRoutine);
  const currentRoutineRef = useRef<RoutineDefinition | undefined>(currentRoutine);
  const routinesRef = useRef<RoutineDefinition[] | undefined>(routines);
  const lastPerfMapRef = useRef<Record<string, ExercisePerformanceSummary | null>>(lastPerfMap);
  const userProfileRef = useRef(userProfile);

  useEffect(() => {
    selectedRoutineIdRef.current = selectedRoutineId;
    logsByRoutineRef.current = logsByRoutine;
    currentRoutineRef.current = currentRoutine;
    routinesRef.current = routines;
    lastPerfMapRef.current = lastPerfMap;
    userProfileRef.current = userProfile;
  });

  const cancelAutoFinish = useCallback(() => {
    if (autoFinishTimerRef.current) {
      clearTimeout(autoFinishTimerRef.current);
      autoFinishTimerRef.current = null;
    }
  }, []);

  const selectRoutine = useCallback(
    (nextRoutineId: RoutineId) => {
      cancelAutoFinish();
      selectedRoutineIdRef.current = nextRoutineId;
      setSelectedRoutineId(nextRoutineId);
    },
    [cancelAutoFinish]
  );

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

  // Preload all routines and refresh automatically if sessions are added/deleted in Evolution
  useEffect(() => {
    let isEffectActive = true;

    async function preloadAllRoutines() {
      const allRoutines = await db.routines.toArray();
      if (!allRoutines || allRoutines.length === 0 || !isEffectActive) return;

      const allExercises = allRoutines.flatMap((r) => r.exercises);
      const perfMap = await getRoutineLastPerformances(allExercises);

      if (isEffectActive && isMountedRef.current) {
        setLastPerfMap(perfMap);
        setLogsByRoutine((prev) => {
          const reconciled: Record<string, ExerciseLog[]> = {};
          for (const routine of allRoutines) {
            reconciled[routine.id] = reconcileRoutineLogsOnPreload(
              routine,
              prev[routine.id],
              perfMap
            );
          }
          logsByRoutineRef.current = reconciled;
          return reconciled;
        });
      }
    }

    preloadAllRoutines();

    return () => {
      isEffectActive = false;
    };
  }, [sessionsCount]);

  // Synchronous structural alignment so exerciseLogs is NEVER empty or stale after routine updates
  const exerciseLogs = useMemo<ExerciseLog[]>(() => {
    const cached = logsByRoutine[selectedRoutineId];
    if (currentRoutine) {
      return alignRoutineLogsStructure(currentRoutine, cached, lastPerfMap);
    }
    return cached ?? [];
  }, [logsByRoutine, selectedRoutineId, currentRoutine, lastPerfMap]);

  useEffect(() => {
    isMountedRef.current = true;
    const weightTimers = weightPersistTimersRef.current;
    return () => {
      isMountedRef.current = false;
      cancelAutoFinish();
      Object.values(weightTimers).forEach(clearTimeout);
    };
  }, [cancelAutoFinish]);

  // Core workout finalization (shared between manual tap and 100% auto-completion)
  const executeFinishWorkout = useCallback(
    async (
      finishedRoutineId: RoutineId,
      logsSnapshot: ExerciseLog[],
      routineSnapshot: RoutineDefinition | undefined,
      isAutoCompleted: boolean
    ) => {
      if (isFinishingRef.current) return;

      const doneSetsTotal = logsSnapshot.reduce(
        (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
        0
      );

      if (doneSetsTotal === 0) {
        if (!isAutoCompleted) {
          alert('Conclua ao menos uma série antes de finalizar o treino!');
        }
        return;
      }

      cancelAutoFinish();
      Object.keys(weightPersistTimersRef.current).forEach((key) => {
        clearTimeout(weightPersistTimersRef.current[key]);
        delete weightPersistTimersRef.current[key];
      });

      isFinishingRef.current = true;
      setIsFinishing(true);
      triggerHaptic('success');

      // Lightweight confetti effect (smooth 60/120fps)
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      try {
        const resolvedRoutine =
          routineSnapshot ?? (await db.routines.get(finishedRoutineId));
        const previousRoutineExercises = resolvedRoutine
          ? resolvedRoutine.exercises.map((ex) => ({ ...ex }))
          : null;
        const previousActiveRoutine: RoutineId =
          userProfileRef.current?.activeRoutine || finishedRoutineId;

        const now = Date.now();
        const newSession: WorkoutSession = {
          routineId: finishedRoutineId,
          date: getLocalDateStr(),
          startTime: now - 45 * 60000,
          endTime: now,
          completed: true,
          exercises: stripTransientSetFields(logsSnapshot)
        };

        const cycle: RoutineId[] = ['A', 'B', 'C', 'D'];
        const currentIdx = cycle.indexOf(finishedRoutineId);
        const nextRoutine = cycle[(currentIdx + 1) % cycle.length];

        const updatedExercises = resolvedRoutine
          ? resolvedRoutine.exercises.map((ex) => {
              const log = logsSnapshot.find((l) => l.exerciseId === ex.id);
              if (log && log.sets) {
                const completedSets = log.sets.filter(
                  (s) => s.completed && s.weightKg > 0
                );
                const refSets =
                  completedSets.length > 0
                    ? completedSets
                    : log.sets.filter((s) => s.weightKg > 0);
                if (refSets.length > 0) {
                  const isGraviton =
                    Boolean(ex.isAssisted) ||
                    ex.name.toLowerCase().includes('graviton');
                  const workingWeight = isGraviton
                    ? Math.min(...refSets.map((s) => s.weightKg))
                    : Math.max(...refSets.map((s) => s.weightKg));
                  return { ...ex, defaultWeightKg: workingWeight };
                }
              }
              return ex;
            })
          : null;

        // Save session (without transient set timestamps), update weights & advance routine atomically
        const savedSessionId = await db.transaction(
          'rw',
          [db.workoutSessions, db.routines, db.userProfile],
          async () => {
            const id = await db.workoutSessions.add(newSession);
            if (resolvedRoutine && updatedExercises) {
              await db.routines.update(resolvedRoutine.id, {
                exercises: updatedExercises
              });
            }
            await db.userProfile.update('main_user', {
              activeRoutine: nextRoutine
            });
            return id;
          }
        );

        if (updatedExercises) {
          const refreshedPerf = await getRoutineLastPerformances(updatedExercises);

          if (isMountedRef.current) {
            setLastPerfMap((prev) => ({ ...prev, ...refreshedPerf }));
            setLogsByRoutine((prev) => {
              const nextMap = {
                ...prev,
                [finishedRoutineId]: updatedExercises.map((ex) =>
                  buildFreshExerciseLog(ex, refreshedPerf[ex.id])
                )
              };
              logsByRoutineRef.current = nextMap;
              return nextMap;
            });
          }
        }

        if (isMountedRef.current) {
          selectedRoutineIdRef.current = nextRoutine;
          setSelectedRoutineId(nextRoutine);
          setUndoSnapshot({
            sessionId: savedSessionId,
            routineId: finishedRoutineId,
            previousLogs: logsSnapshot,
            previousRoutineExercises,
            previousActiveRoutine
          });
          setCompletedSummary({
            routineTitle: resolvedRoutine?.title || 'Treino Concluído',
            totalSets: doneSetsTotal,
            totalExercises: logsSnapshot.filter((ex) =>
              ex.sets.some((s) => s.completed)
            ).length,
            isAutoCompleted
          });
        }
      } finally {
        isFinishingRef.current = false;
        if (isMountedRef.current) {
          setIsFinishing(false);
        }
      }
    },
    [cancelAutoFinish]
  );

  // Update an exercise log in 0ms, persist load with 350ms debounce & auto-finish on 100% completion
  const handleUpdateLog = useCallback(
    (updated: ExerciseLog) => {
      cancelAutoFinish();

      const routineId = selectedRoutineIdRef.current;
      const routineObj =
        currentRoutineRef.current?.id === routineId
          ? currentRoutineRef.current
          : routinesRef.current?.find((r) => r.id === routineId);

      const prevRaw = logsByRoutineRef.current[routineId];
      const currentList = routineObj
        ? alignRoutineLogsStructure(routineObj, prevRaw, lastPerfMapRef.current)
        : prevRaw || [];

      const prevLog = currentList.find(
        (item) => item.exerciseId === updated.exerciseId
      );
      const nextList = currentList.map((item) =>
        item.exerciseId === updated.exerciseId ? updated : item
      );

      const nextMap = {
        ...logsByRoutineRef.current,
        [routineId]: nextList
      };
      logsByRoutineRef.current = nextMap;
      setLogsByRoutine(nextMap);

      // Persist the primary working weight into db.routines after rapid taps settle (350ms)
      if (updated.sets && updated.sets[0] && updated.sets[0].weightKg > 0) {
        const newWeight = updated.sets[0].weightKg;
        const exId = updated.exerciseId;

        if (weightPersistTimersRef.current[exId]) {
          clearTimeout(weightPersistTimersRef.current[exId]);
        }

        weightPersistTimersRef.current[exId] = setTimeout(async () => {
          delete weightPersistTimersRef.current[exId];
          const routine = await db.routines.get(routineId);
          if (routine) {
            const exIdx = routine.exercises.findIndex((e) => e.id === exId);
            if (
              exIdx !== -1 &&
              routine.exercises[exIdx].defaultWeightKg !== newWeight
            ) {
              routine.exercises[exIdx].defaultWeightKg = newWeight;
              await db.routines.put(routine);
            }
          }
        }, 350);
      }

      // Auto-recognize workout end immediately after finishing the last pending set or skipping last exercise for fatigue
      const prevCompletedCount = prevLog
        ? prevLog.sets.filter((s) => s.completed).length
        : 0;
      const nextCompletedCount = updated.sets.filter((s) => s.completed).length;
      const didCompleteASet = nextCompletedCount > prevCompletedCount;
      const didAbortForFatigue = Boolean(
        !prevLog?.abortedForFatigue && updated.abortedForFatigue
      );

      if (
        !isFinishingRef.current &&
        (didCompleteASet || didAbortForFatigue) &&
        isWorkoutFullyComplete(nextList)
      ) {
        autoFinishTimerRef.current = setTimeout(() => {
          autoFinishTimerRef.current = null;
          void executeFinishWorkout(routineId, nextList, routineObj, true);
        }, AUTO_FINISH_DELAY_MS);
      }
    },
    [cancelAutoFinish, executeFinishWorkout]
  );

  const completedSetsCount = useMemo(() => {
    return exerciseLogs.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
      0
    );
  }, [exerciseLogs]);

  // Manual Finalize Workout
  const handleFinishWorkout = () => {
    void executeFinishWorkout(
      selectedRoutineId,
      exerciseLogs,
      currentRoutine,
      false
    );
  };

  // Undo last workout save & restore full active session (including set timestamps)
  const handleUndoFinish = async () => {
    if (!undoSnapshot || isUndoing) return;
    setIsUndoing(true);
    cancelAutoFinish();
    triggerHaptic('light');

    try {
      const snap = undoSnapshot;
      await db.transaction(
        'rw',
        [db.workoutSessions, db.routines, db.userProfile],
        async () => {
          await db.workoutSessions.delete(snap.sessionId);
          if (snap.previousRoutineExercises) {
            await db.routines.update(snap.routineId, {
              exercises: snap.previousRoutineExercises
            });
          }
          await db.userProfile.update('main_user', {
            activeRoutine: snap.previousActiveRoutine
          });
        }
      );

      if (snap.previousRoutineExercises) {
        const restoredPerf = await getRoutineLastPerformances(
          snap.previousRoutineExercises
        );
        if (isMountedRef.current) {
          setLastPerfMap((prev) => ({ ...prev, ...restoredPerf }));
        }
      }

      if (isMountedRef.current) {
        const nextMap = {
          ...logsByRoutineRef.current,
          [snap.routineId]: snap.previousLogs
        };
        logsByRoutineRef.current = nextMap;
        selectedRoutineIdRef.current = snap.routineId;
        setLogsByRoutine(nextMap);
        setSelectedRoutineId(snap.routineId);
        setCompletedSummary(null);
        setUndoSnapshot(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsUndoing(false);
      }
    }
  };

  const dismissCompletedModal = () => {
    setCompletedSummary(null);
    setUndoSnapshot(null);
  };

  // Reset current session state
  const handleResetSession = () => {
    if (window.confirm('Deseja zerar as séries marcadas nesta sessão?')) {
      cancelAutoFinish();
      triggerHaptic('light');
      const currentList = logsByRoutineRef.current[selectedRoutineId] || exerciseLogs;
      const resetList = currentList.map((ex) => ({
        ...ex,
        abortedForFatigue: false,
        sets: ex.sets.map(({ completedAt: _cleared, ...s }) => ({
          ...s,
          completed: false
        }))
      }));
      const nextMap = {
        ...logsByRoutineRef.current,
        [selectedRoutineId]: resetList
      };
      logsByRoutineRef.current = nextMap;
      setLogsByRoutine(nextMap);
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
        selectRoutine(cycle[nextIdx]);
      } else {
        // Swiped right -> Previous routine
        const prevIdx = (currentIdx - 1 + cycle.length) % cycle.length;
        triggerHaptic('light');
        selectRoutine(cycle[prevIdx]);
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
                    selectRoutine(rId);
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

      {/* MODAL DE CONCLUSÃO COM BOTÃO X, OPÇÕES E DESFAZER SALVAMENTO */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            {/* Botão Fechar X no topo */}
            <button
              onClick={dismissCompletedModal}
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
              {completedSummary.isAutoCompleted
                ? 'Treino 100% Concluído & Salvo!'
                : 'Treino Salvo com Sucesso!'}
            </span>

            <h2 className="text-lg font-black text-slate-900 mb-1">
              {completedSummary.routineTitle}
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              {completedSummary.isAutoCompleted
                ? 'Todas as séries do dia foram concluídas e a sobrecarga foi atualizada.'
                : 'Sessão gravada no histórico e sobrecarga atualizada.'}
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">Séries Feitas</div>
                <div className="text-base font-black text-slate-900 tabular-nums">
                  {completedSummary.totalSets}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">Exercícios</div>
                <div className="text-base font-black text-blue-600 tabular-nums">
                  {completedSummary.totalExercises}
                </div>
              </div>
            </div>

            {/* Opções de Ação: Ver Evolução, Ficar nos Treinos ou Desfazer */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  dismissCompletedModal();
                  if (onGoToEvolution) onGoToEvolution();
                }}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 min-h-[42px] active:scale-95 transition-all"
              >
                <span>Ver Minha Evolução</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={dismissCompletedModal}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs min-h-[40px] active:scale-95 transition-all"
              >
                Continuar nos Treinos
              </button>

              {undoSnapshot && (
                <button
                  type="button"
                  onClick={handleUndoFinish}
                  disabled={isUndoing}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs inline-flex items-center justify-center gap-1.5 min-h-[38px] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Undo2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isUndoing ? 'Desfazendo...' : 'Desfazer salvamento'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
