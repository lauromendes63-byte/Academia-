export type RoutineId = 'A' | 'B' | 'C' | 'D';

export interface ExerciseDefinition {
  id: string;
  name: string;
  muscleGroup: string;
  gripOrForm: string;
  defaultSets: number;
  targetReps: string;
  restSeconds: number;
  defaultWeightKg: number;
  substitutes: string[];
}

export interface RoutineDefinition {
  id: RoutineId;
  title: string;
  subtitle: string;
  exercises: ExerciseDefinition[];
}

export interface SetEntry {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  activeExerciseName: string; // If substituted, holds the replacement name
  isSubstituted: boolean;
  abortedForFatigue: boolean;
  sets: SetEntry[];
}

export interface WorkoutSession {
  id?: number;
  routineId: RoutineId;
  date: string; // YYYY-MM-DD
  startTime: number;
  endTime?: number;
  completed: boolean;
  exercises: ExerciseLog[];
}

export interface NutritionLog {
  date: string; // Key: YYYY-MM-DD
  tookWhey: boolean;
  meals: {
    breakfast: string; // 'none' | 'cafe_leite' | 'cafe_tapioca' | 'ovos'
    lunch: string;     // 'none' | 'padrao' | 'pesado' | 'leve'
    snack: string;     // 'none' | 'sem_lanche' | 'tapioca_cafe' | 'shake'
    dinner: string;    // 'none' | 'subway' | 'caseiro' | 'outro'
  };
  waterMl: number;
  escapes: {
    besteiraCount: number;
    superBesteiraCount: number;
  };
}

export interface WeightLog {
  id?: number;
  date: string; // YYYY-MM-DD
  weightKg: number;
  notes?: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  targetProteinGrams: number;
  targetWaterMl: number;
  activeRoutine: RoutineId;
}
