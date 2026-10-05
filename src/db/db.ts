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
 * Gets the last recorded weight, reps, date and all-time best weight for a given exercise
 */
export async function getLastExercisePerformance(
  exerciseId: string,
  exerciseName: string
): Promise<{ weightKg: number; reps: number; date: string; bestWeightKg?: number } | null> {
  const orderedSessions = await db.workoutSessions.orderBy('date').reverse().toArray();
  const targetNameLower = exerciseName.toLowerCase();
  const isAssisted = isGravitonExercise(exerciseName);

  let latestPerf: { weightKg: number; reps: number; date: string } | null = null;
  let bestWeightKg: number | undefined = undefined;

  for (const session of orderedSessions) {
    if (!session.completed) continue;

    const exLog = session.exercises?.find(
      (e) =>
        e.exerciseId === exerciseId ||
        e.exerciseName.toLowerCase() === targetNameLower ||
        (e.activeExerciseName &&
          e.activeExerciseName.toLowerCase() === targetNameLower)
    );

    if (exLog && !exLog.abortedForFatigue && exLog.sets && exLog.sets.length > 0) {
      const completedSets = exLog.sets.filter((s) => s.completed && s.weightKg > 0);
      const targetSets =
        completedSets.length > 0
          ? completedSets
          : exLog.sets.filter((s) => s.weightKg > 0);

      if (targetSets.length > 0) {
        const bestSetInSession = targetSets.reduce((best, s) => {
          if (isAssisted) {
            return s.weightKg < best.weightKg ? s : best;
          }
          return s.weightKg > best.weightKg ? s : best;
        }, targetSets[0]);

        if (bestSetInSession && bestSetInSession.weightKg > 0) {
          if (!latestPerf) {
            latestPerf = {
              weightKg: bestSetInSession.weightKg,
              reps: bestSetInSession.reps,
              date: session.date
            };
          }
          if (bestWeightKg === undefined) {
            bestWeightKg = bestSetInSession.weightKg;
          } else {
            bestWeightKg = isAssisted
              ? Math.min(bestWeightKg, bestSetInSession.weightKg)
              : Math.max(bestWeightKg, bestSetInSession.weightKg);
          }
        }
      }
    }
  }

  return latestPerf ? { ...latestPerf, bestWeightKg } : null;
}

/**
 * Single-pass performance fetch for all exercises in a routine (drastically reduces CPU & DB overhead)
 */
export async function getRoutineLastPerformances(
  exercises: { id: string; name: string; isAssisted?: boolean }[]
): Promise<
  Record<string, { weightKg: number; reps: number; date: string; bestWeightKg?: number } | null>
> {
  const orderedSessions = await db.workoutSessions.orderBy('date').reverse().toArray();
  const sessions = orderedSessions.filter((s) => s.completed);

  const perfMap: Record<
    string,
    { weightKg: number; reps: number; date: string; bestWeightKg?: number } | null
  > = {};

  for (const ex of exercises) {
    perfMap[ex.id] = null;
    const targetNameLower = ex.name.toLowerCase();
    const isAssisted = isGravitonExercise(ex.name, ex.isAssisted);
    let latestPerf: { weightKg: number; reps: number; date: string } | null = null;
    let bestWeightKg: number | undefined = undefined;

    for (const session of sessions) {
      const exLog = session.exercises?.find(
        (e) =>
          e.exerciseId === ex.id ||
          e.exerciseName.toLowerCase() === targetNameLower ||
          (e.activeExerciseName &&
            e.activeExerciseName.toLowerCase() === targetNameLower)
      );

      if (exLog && !exLog.abortedForFatigue && exLog.sets && exLog.sets.length > 0) {
        const completedSets = exLog.sets.filter((s) => s.completed && s.weightKg > 0);
        const targetSets =
          completedSets.length > 0
            ? completedSets
            : exLog.sets.filter((s) => s.weightKg > 0);

        if (targetSets.length > 0) {
          const bestSetInSession = targetSets.reduce((best, s) => {
            if (isAssisted) {
              return s.weightKg < best.weightKg ? s : best;
            }
            return s.weightKg > best.weightKg ? s : best;
          }, targetSets[0]);

          if (bestSetInSession && bestSetInSession.weightKg > 0) {
            if (!latestPerf) {
              latestPerf = {
                weightKg: bestSetInSession.weightKg,
                reps: bestSetInSession.reps,
                date: session.date
              };
            }
            if (bestWeightKg === undefined) {
              bestWeightKg = bestSetInSession.weightKg;
            } else {
              bestWeightKg = isAssisted
                ? Math.min(bestWeightKg, bestSetInSession.weightKg)
                : Math.max(bestWeightKg, bestSetInSession.weightKg);
            }
          }
        }
      }
    }

    if (latestPerf) {
      perfMap[ex.id] = { ...latestPerf, bestWeightKg };
    }
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
