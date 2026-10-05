import Dexie, { type Table } from 'dexie';
import type {
  RoutineDefinition,
  WorkoutSession,
  NutritionLog,
  WeightLog,
  UserProfile
} from '../types';
import { DEFAULT_ROUTINES, DEFAULT_USER_PROFILE } from './seedData';

export class AcademiaDatabase extends Dexie {
  routines!: Table<RoutineDefinition, string>;
  workoutSessions!: Table<WorkoutSession, number>;
  nutritionLogs!: Table<NutritionLog, string>;
  weightLogs!: Table<WeightLog, number>;
  userProfile!: Table<UserProfile, string>;

  constructor() {
    super('AcademiaPlusDB');
    this.version(1).stores({
      routines: 'id',
      workoutSessions: '++id, routineId, date, completed',
      nutritionLogs: 'date',
      weightLogs: '++id, date',
      userProfile: 'id'
    });
  }
}

export const db = new AcademiaDatabase();

const MIGRATION_FLAG_KEY = 'academia_db_migrated_v214';

/**
 * Initializes database with default routines and user profile if not present.
 * Uses Promise.all to eliminate sequential IndexedDB waterfalls on startup.
 */
export async function initializeDatabase(): Promise<void> {
  const [existingProfile, routinesCount, weightCount, workoutCount] =
    await Promise.all([
      db.userProfile.get('main_user'),
      db.routines.count(),
      db.weightLogs.count(),
      db.workoutSessions.count()
    ]);

  const initTasks: Promise<unknown>[] = [];

  if (!existingProfile) {
    initTasks.push(db.userProfile.put(DEFAULT_USER_PROFILE));
  } else if (!existingProfile.targetCaloriesKcal || !existingProfile.calorieMode) {
    initTasks.push(
      db.userProfile.update('main_user', {
        targetCaloriesKcal: existingProfile.targetCaloriesKcal || 2200,
        calorieMode: existingProfile.calorieMode || 'recomposicao'
      })
    );
  }

  if (routinesCount === 0) {
    initTasks.push(db.routines.bulkPut(DEFAULT_ROUTINES));
    try {
      localStorage.setItem(MIGRATION_FLAG_KEY, '1');
    } catch {
      // ignore storage errors
    }
  } else {
    let alreadyMigrated = false;
    try {
      alreadyMigrated = localStorage.getItem(MIGRATION_FLAG_KEY) === '1';
    } catch {
      alreadyMigrated = false;
    }

    if (!alreadyMigrated) {
      initTasks.push(
        (async () => {
          const routineA = await db.routines.get('A');
          if (routineA) {
            const needsUpdate = routineA.exercises.some(
              (e) => e.id === 'pull_4' && e.name !== 'Rosca Bayesiana na Polia'
            );
            if (needsUpdate) {
              routineA.exercises = routineA.exercises.map((e) => {
                if (e.id === 'pull_4') {
                  return {
                    id: 'pull_4',
                    name: 'Rosca Bayesiana na Polia',
                    muscleGroup: 'Bíceps (Pico & Tensão Contínua)',
                    gripOrForm:
                      'Polia Baixa, pegada supinada, cotovelos levemente à frente',
                    defaultSets: 3,
                    targetReps: '12-15',
                    restSeconds: 60,
                    defaultWeightKg: 15,
                    substitutes: ['Rosca Direta Polia Baixa', 'Rosca Scott Polia']
                  };
                }
                return e;
              });
              await db.routines.put(routineA);
            }
          }

          const allSessions = await db.workoutSessions.toArray();
          for (const s of allSessions) {
            let modified = false;
            const updatedExercises = s.exercises?.map((ex) => {
              if (
                ex.exerciseId === 'pull_4' &&
                (ex.exerciseName.includes('Baiana') ||
                  ex.activeExerciseName.includes('Baiana'))
              ) {
                modified = true;
                return {
                  ...ex,
                  exerciseName: 'Rosca Bayesiana na Polia',
                  activeExerciseName: 'Rosca Bayesiana na Polia'
                };
              }
              return ex;
            });
            if (modified && s.id) {
              await db.workoutSessions.update(s.id, {
                exercises: updatedExercises
              });
            }
          }

          try {
            localStorage.setItem(MIGRATION_FLAG_KEY, '1');
          } catch {
            // ignore storage errors
          }
        })()
      );
    }
  }

  if (weightCount === 0) {
    const today = new Date().toISOString().split('T')[0];
    initTasks.push(
      db.weightLogs.add({
        date: today,
        weightKg: 98,
        notes: 'Peso inicial para recomposição corporal'
      })
    );
  }

  if (workoutCount === 0) {
    const sampleDate = '2026-09-18';
    initTasks.push(
      db.workoutSessions.add({
        routineId: 'A',
        date: sampleDate,
        startTime: Date.now() - 6 * 86400000,
        endTime: Date.now() - 6 * 86400000 + 3600000,
        completed: true,
        exercises: [
          {
            exerciseId: 'pull_1',
            exerciseName: 'Barra Fixa no Graviton',
            activeExerciseName: 'Barra Fixa no Graviton',
            isSubstituted: false,
            abortedForFatigue: false,
            sets: [
              { setNumber: 1, weightKg: 40, reps: 8, completed: true },
              { setNumber: 2, weightKg: 40, reps: 8, completed: true },
              { setNumber: 3, weightKg: 40, reps: 7, completed: true }
            ]
          },
          {
            exerciseId: 'pull_2',
            exerciseName: 'Remada Baixa na Polia',
            activeExerciseName: 'Remada Baixa na Polia',
            isSubstituted: false,
            abortedForFatigue: false,
            sets: [
              { setNumber: 1, weightKg: 50, reps: 10, completed: true },
              { setNumber: 2, weightKg: 50, reps: 9, completed: true },
              { setNumber: 3, weightKg: 50, reps: 8, completed: true }
            ]
          },
          {
            exerciseId: 'pull_4',
            exerciseName: 'Rosca Bayesiana na Polia',
            activeExerciseName: 'Rosca Bayesiana na Polia',
            isSubstituted: false,
            abortedForFatigue: false,
            sets: [
              { setNumber: 1, weightKg: 15, reps: 12, completed: true },
              { setNumber: 2, weightKg: 15, reps: 12, completed: true },
              { setNumber: 3, weightKg: 15, reps: 12, completed: true }
            ]
          }
        ]
      })
    );
  }

  if (initTasks.length > 0) {
    await Promise.all(initTasks);
  }
}

export function isGravitonExercise(name?: string, isAssisted?: boolean): boolean {
  if (isAssisted) return true;
  if (!name) return false;
  return name.toLowerCase().includes('graviton');
}

/**
 * Extracts min and max target reps from strings like '8-10', '12-15/lado', '6-8'
 */
export function parseRepRange(targetReps?: string): { minReps: number; maxReps: number } {
  if (!targetReps) return { minReps: 8, maxReps: 10 };
  const matches = targetReps.match(/\d+/g);
  if (!matches || matches.length === 0) return { minReps: 8, maxReps: 10 };
  if (matches.length === 1) {
    const val = parseInt(matches[0], 10) || 10;
    return { minReps: val, maxReps: val };
  }
  const minReps = parseInt(matches[0], 10) || 8;
  const maxReps = parseInt(matches[1], 10) || minReps;
  return { minReps, maxReps: Math.max(minReps, maxReps) };
}

/**
 * Returns the ideal weight progression step in kg:
 * - Graviton (assisted): -5kg (less counterweight = more strength)
 * - Unilateral / Isolation / Dumbbells: +2kg
 * - Compound / Heavy Machines: +5kg
 */
export function getSuggestedWeightStep(
  exerciseId: string,
  exerciseName: string,
  isAssisted?: boolean
): number {
  if (isGravitonExercise(exerciseName, isAssisted)) {
    return -5;
  }
  const lowerName = exerciseName.toLowerCase();
  const isSmallStepIsolation =
    ['pull_4', 'pull_5', 'push_2', 'push_3', 'push_6', 'push_7', 'lower2_1'].includes(
      exerciseId
    ) ||
    lowerName.includes('haltere') ||
    lowerName.includes('rosca') ||
    lowerName.includes('elevação lateral') ||
    lowerName.includes('tríceps');

  return isSmallStepIsolation ? 2 : 5;
}

/**
 * Evaluates an exercise's historical performance and Double Progression (3-session perfect target rule)
 */
export function evaluateExerciseHistory(
  ex: {
    id: string;
    name: string;
    targetReps?: string;
    defaultSets?: number;
    isAssisted?: boolean;
  },
  completedSessionsNewestFirst: WorkoutSession[]
): import('../types').ExercisePerformanceSummary | null {
  const targetNameLower = ex.name.toLowerCase();
  const isAssisted = isGravitonExercise(ex.name, ex.isAssisted);
  const { minReps, maxReps } = parseRepRange(ex.targetReps);
  const suggestedStepKg = getSuggestedWeightStep(ex.id, ex.name, isAssisted);
  const requiredSets = ex.defaultSets || 3;

  interface SessionEval {
    date: string;
    weightKg: number;
    bestReps: number;
    setsReps: number[];
    wasFatiguedOrIncomplete: boolean;
    isPerfectAtTarget: boolean;
  }

  const history: SessionEval[] = [];
  let bestWeightKg: number | undefined = undefined;

  for (const session of completedSessionsNewestFirst) {
    if (!session.completed) continue;

    const exLog = session.exercises?.find(
      (e) =>
        e.exerciseId === ex.id ||
        e.exerciseName.toLowerCase() === targetNameLower ||
        (e.activeExerciseName &&
          e.activeExerciseName.toLowerCase() === targetNameLower)
    );

    if (!exLog || !exLog.sets || exLog.sets.length === 0) continue;

    const completedSets = exLog.sets.filter((s) => s.completed && s.weightKg > 0);
    if (!exLog.abortedForFatigue && completedSets.length === 0) continue;

    const targetSets =
      completedSets.length > 0
        ? completedSets
        : exLog.sets.filter((s) => s.weightKg > 0);

    if (targetSets.length === 0) continue;

    const bestSetInSession = targetSets.reduce((best, s) => {
      if (isAssisted) {
        return s.weightKg < best.weightKg ? s : best;
      }
      return s.weightKg > best.weightKg ? s : best;
    }, targetSets[0]);

    const sessionWeight = bestSetInSession.weightKg;
    if (sessionWeight <= 0) continue;

    if (!exLog.abortedForFatigue && completedSets.length > 0) {
      if (bestWeightKg === undefined) {
        bestWeightKg = sessionWeight;
      } else {
        bestWeightKg = isAssisted
          ? Math.min(bestWeightKg, sessionWeight)
          : Math.max(bestWeightKg, sessionWeight);
      }
    }

    const wasFatiguedOrIncomplete =
      Boolean(exLog.abortedForFatigue) || completedSets.length < requiredSets;

    const isPerfectAtTarget =
      !wasFatiguedOrIncomplete &&
      completedSets.every((s) => s.reps >= maxReps && s.weightKg === sessionWeight);

    history.push({
      date: session.date,
      weightKg: sessionWeight,
      bestReps: bestSetInSession.reps,
      setsReps:
        completedSets.length > 0
          ? completedSets.map((s) => s.reps)
          : targetSets.map((s) => s.reps),
      wasFatiguedOrIncomplete,
      isPerfectAtTarget
    });
  }

  if (history.length === 0) return null;

  const latest = history[0];
  const currentRefWeight = latest.weightKg;

  let sessionsAtCurrentWeight = 0;
  for (const h of history) {
    if (h.weightKg === currentRefWeight) {
      sessionsAtCurrentWeight++;
    } else {
      break;
    }
  }

  let perfectStreak = 0;
  for (const h of history) {
    if (h.weightKg === currentRefWeight && h.isPerfectAtTarget) {
      perfectStreak++;
    } else {
      break;
    }
  }

  const readyToProgress = perfectStreak >= 3;
  const suggestedNextWeightKg = Math.max(
    0,
    Number((currentRefWeight + suggestedStepKg).toFixed(1))
  );

  return {
    weightKg: latest.weightKg,
    reps: latest.bestReps,
    date: latest.date,
    bestWeightKg,
    lastSetsReps: latest.setsReps,
    minReps,
    maxReps,
    perfectStreak,
    sessionsAtCurrentWeight,
    lastWasFatiguedOrIncomplete: latest.wasFatiguedOrIncomplete,
    readyToProgress,
    suggestedNextWeightKg,
    suggestedStepKg
  };
}

/**
 * Gets the last recorded weight, reps, date and progression status for a given exercise
 */
export async function getLastExercisePerformance(
  exerciseId: string,
  exerciseName: string,
  targetReps?: string,
  defaultSets?: number,
  isAssisted?: boolean
): Promise<import('../types').ExercisePerformanceSummary | null> {
  const orderedSessions = await db.workoutSessions.orderBy('date').reverse().toArray();
  const sessions = orderedSessions.filter((s) => s.completed);
  return evaluateExerciseHistory(
    { id: exerciseId, name: exerciseName, targetReps, defaultSets, isAssisted },
    sessions
  );
}

/**
 * Single-pass performance fetch for all exercises in a routine (drastically reduces CPU & DB overhead)
 */
export async function getRoutineLastPerformances(
  exercises: {
    id: string;
    name: string;
    targetReps?: string;
    defaultSets?: number;
    isAssisted?: boolean;
  }[]
): Promise<Record<string, import('../types').ExercisePerformanceSummary | null>> {
  const orderedSessions = await db.workoutSessions.orderBy('date').reverse().toArray();
  const sessions = orderedSessions.filter((s) => s.completed);

  const perfMap: Record<string, import('../types').ExercisePerformanceSummary | null> = {};

  for (const ex of exercises) {
    perfMap[ex.id] = evaluateExerciseHistory(ex, sessions);
  }

  return perfMap;
}

/**
 * Exports all data from IndexedDB as a downloadable JSON object
 */
export async function exportAllData() {
  const [routines, workoutSessions, nutritionLogs, weightLogs, userProfile] =
    await Promise.all([
      db.routines.toArray(),
      db.workoutSessions.toArray(),
      db.nutritionLogs.toArray(),
      db.weightLogs.toArray(),
      db.userProfile.toArray()
    ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      routines,
      workoutSessions,
      nutritionLogs,
      weightLogs,
      userProfile
    }
  };
}

/**
 * Imports and replaces database data from JSON backup
 */
export async function importAllData(payload: any): Promise<boolean> {
  if (!payload || !payload.data) {
    throw new Error('Arquivo de backup inválido.');
  }

  const { data } = payload;

  await db.transaction(
    'rw',
    [
      db.routines,
      db.workoutSessions,
      db.nutritionLogs,
      db.weightLogs,
      db.userProfile
    ],
    async () => {
      if (data.routines) {
        await db.routines.clear();
        await db.routines.bulkPut(data.routines);
      }
      if (data.workoutSessions) {
        await db.workoutSessions.clear();
        await db.workoutSessions.bulkPut(data.workoutSessions);
      }
      if (data.nutritionLogs) {
        await db.nutritionLogs.clear();
        await db.nutritionLogs.bulkPut(data.nutritionLogs);
      }
      if (data.weightLogs) {
        await db.weightLogs.clear();
        await db.weightLogs.bulkPut(data.weightLogs);
      }
      if (data.userProfile) {
        await db.userProfile.clear();
        await db.userProfile.bulkPut(data.userProfile);
      }
    }
  );

  return true;
}
