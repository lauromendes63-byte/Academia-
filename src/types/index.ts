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
  isAssisted?: boolean; // Graviton: menor peso (contrapeso) = maior força/evolução
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

export interface ExercisePerformanceSummary {
  weightKg: number;
  reps: number;
  date: string;
  bestWeightKg?: number;
  lastSetsReps: number[];
  lastSetsWeights?: number[];
  hadWeightDrop?: boolean;
  minReps: number;
  maxReps: number;
  perfectStreak: number;
  sessionsAtCurrentWeight: number;
  lastWasFatiguedOrIncomplete: boolean;
  readyToProgress: boolean;
  suggestedNextWeightKg: number;
  suggestedStepKg: number;
}

export interface PlateConfig {
  proteinType: 'carne' | 'frango' | 'peixe';
  proteinPortions: number; // 1, 2, 3, 4, 5
  ricePortions: number; // 0, 1, 2, 3, 4
  beanPortions: number; // 0, 1, 2, 3
  hasSalad: boolean;
}

export type ChurrascoCut = 'alcatra' | 'maminha' | 'fraldinha';

export interface ChurrascoConfig {
  cut: ChurrascoCut;
  skewerCount: number; // 1 a 5 espetos
  baiaoPortions: number; // 0 a 3 porções de baião de dois
  hasFarofa: boolean;
  hasVinagrete: boolean;
}

export interface SubwayConfig {
  protein: 'frango_teriyaki' | 'carne';
  size: '15cm' | '30cm';
}

export type BurgerStyle = 'artesanal_simples' | 'artesanal_duplo' | 'podrao_xtudo';

export interface BurgerConfig {
  style: BurgerStyle;
  count: number; // 1 ou 2
  hasFries: boolean;
}

export type PizzaFlavorType = 'proteica' | 'tradicional';

export interface PizzaConfig {
  flavorType: PizzaFlavorType;
  slices: number; // 1 a 8 fatias
}

export type FruitType = 'banana' | 'laranja' | 'maca';
export type EggType = 'mexidos' | 'fritos';

export interface CustomMealConfig {
  coffeeWithMilkCups: number; // canecas de café com leite (0, 1, 2...)
  tapiocaCount: number; // tapiocas com queijo (0, 1, 2...)
  eggType: EggType; // 'mexidos' | 'fritos'
  eggCount: number; // quantidade de ovos (0, 1, 2, 3...)
  fruitType: FruitType; // 'banana' | 'laranja' | 'maca'
  fruitCount: number; // quantidade de frutas (0, 1, 2...)
  shakeCount?: number; // Para o lanche da tarde opcional (0, 1...)
}

export interface DetailedEscapes {
  chocSmallCount?: number; // Bombom / Bis / Chocolate pequeno (~130 kcal)
  snickersBarCount?: number; // Snickers / Barra de chocolate (~250 kcal)
  iceCreamCount?: number; // Eskibom / Sorvete / Bolo (~380 kcal)
  saltySnackCount?: number; // Salgadinho / Biscoito / Salgado (~450 kcal)
  besteiraCount: number; // Legado (~600 kcal)
  superBesteiraCount: number; // Exagero / Refeição Livre (~1.200 kcal)
}

export type LunchType = 'caseiro' | 'churrasquinho';
export type DinnerType = 'subway' | 'caseiro' | 'churrasquinho' | 'burger' | 'pizza';

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
  escapes: DetailedEscapes;
  breakfastEggCount?: number;
  milkGlasses?: number; // Copos de leite (~200ml, 6g prot, 110 kcal)
  lunchType?: LunchType;
  lunchConfig?: PlateConfig;
  churrascoConfig?: ChurrascoConfig;
  dinnerType?: DinnerType;
  dinnerSubwayConfig?: SubwayConfig;
  dinnerPlateConfig?: PlateConfig;
  dinnerChurrascoConfig?: ChurrascoConfig;
  dinnerBurgerConfig?: BurgerConfig;
  dinnerPizzaConfig?: PizzaConfig;
  breakfastConfig?: CustomMealConfig;
  snackConfig?: CustomMealConfig;
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
