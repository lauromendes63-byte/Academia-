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

export interface PlateConfig {
  proteinType: 'carne' | 'frango' | 'peixe';
  proteinPortions: number; // 1, 2, 3, 4, 5
  ricePortions: number; // 0, 1, 2, 3, 4
  beanPortions: number; // 0, 1, 2, 3
  hasSalad: boolean;
}

export interface SubwayConfig {
  protein: 'frango_teriyaki' | 'carne';
  size: '15cm' | '30cm';
}

export interface NutritionLog {
  date: string; // Key: YYYY-MM-DD
  tookWhey: boolean;
  wheyScoops: number; // 20g of protein per scoop
  meals: {
    breakfast: string;
    lunch: string;
    snack: string;
    dinner: string;
  };
  waterMl: number;
  escapes: {
    besteiraCount: number;
    superBesteiraCount: number;
  };
  breakfastEggCount?: number;
  lunchConfig?: PlateConfig;
  dinnerType?: 'subway' | 'caseiro';
  dinnerSubwayConfig?: SubwayConfig;
  dinnerPlateConfig?: PlateConfig;
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
  targetCaloriesKcal: number; // 2200 or 2700
  calorieMode: 'recomposicao' | 'manutencao';
  activeRoutine: RoutineId;
}
