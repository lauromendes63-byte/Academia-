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

/**
 * Initializes database with default routines and user profile if not present
 */
export async function initializeDatabase(): Promise<void> {
  const profileCount = await db.userProfile.count();
  if (profileCount === 0) {
    await db.userProfile.put(DEFAULT_USER_PROFILE);
  } else {
    const existing = await db.userProfile.get('main_user');
    if (existing && (!existing.targetCaloriesKcal || !existing.calorieMode)) {
      await db.userProfile.update('main_user', {
        targetCaloriesKcal: existing.targetCaloriesKcal || 2200,
        calorieMode: existing.calorieMode || 'recomposicao'
      });
    }
  }

  const routinesCount = await db.routines.count();
  if (routinesCount === 0) {
    await db.routines.bulkPut(DEFAULT_ROUTINES);
  }

  const weightCount = await db.weightLogs.count();
  if (weightCount === 0) {
    const today = new Date().toISOString().split('T')[0];
    await db.weightLogs.add({
      date: today,
      weightKg: 98,
      notes: 'Peso inicial para recomposição corporal'
    });
  }

  // Pre-seed a friendly initial workout history so "Último: XX kg x YY reps" has realistic values
  const workoutCount = await db.workoutSessions.count();
  if (workoutCount === 0) {
    const sampleDate = '2026-09-18';
    await db.workoutSessions.add({
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
          exerciseName: 'Rosca Direta Banco Inclinado c/ Halteres',
          activeExerciseName: 'Rosca Direta Banco Inclinado c/ Halteres',
          isSubstituted: false,
          abortedForFatigue: false,
          sets: [
            { setNumber: 1, weightKg: 12, reps: 10, completed: true },
            { setNumber: 2, weightKg: 12, reps: 9, completed: true },
            { setNumber: 3, weightKg: 12, reps: 8, completed: true }
          ]
        }
      ]
    });
  }
}

/**
 * Gets the last recorded weight, reps and date for a given exercise
 */
export async function getLastExercisePerformance(
  exerciseId: string,
  exerciseName: string
): Promise<{ weightKg: number; reps: number; date: string } | null> {
  const sessions = await db.workoutSessions
    .where('completed')
    .equals(1 as any)
    .reverse()
    .sortBy('date');

  for (const session of sessions) {
    const exLog = session.exercises?.find(
      (e) =>
        e.exerciseId === exerciseId ||
        e.exerciseName.toLowerCase() === exerciseName.toLowerCase() ||
        e.activeExerciseName.toLowerCase() === exerciseName.toLowerCase()
    );

    if (exLog && !exLog.abortedForFatigue && exLog.sets && exLog.sets.length > 0) {
      const completedSets = exLog.sets.filter((s) => s.completed);
      if (completedSets.length > 0) {
        // Return highest weight or last set weight
        const topSet = completedSets.reduce(
          (max, s) => (s.weightKg > max.weightKg ? s : max),
          completedSets[0]
        );
        return {
          weightKg: topSet.weightKg,
          reps: topSet.reps,
          date: session.date
        };
      }
    }
  }

  return null;
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
