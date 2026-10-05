import type {
  NutritionLog,
  PlateConfig,
  ChurrascoConfig,
  SubwayConfig,
  BurgerConfig,
  PizzaConfig,
  CustomMealConfig,
  DetailedEscapes
} from '../types';

export const DEFAULT_LUNCH_CONFIG: PlateConfig = {
  proteinType: 'carne',
  proteinPortions: 2,
  ricePortions: 2,
  beanPortions: 1,
  hasSalad: true
};

export const DEFAULT_CHURRASCO_CONFIG: ChurrascoConfig = {
  cut: 'alcatra',
  skewerCount: 2,
  baiaoPortions: 1,
  hasFarofa: false,
  hasVinagrete: true
};

export const DEFAULT_SUBWAY_CONFIG: SubwayConfig = {
  protein: 'frango_teriyaki',
  size: '15cm'
};

export const DEFAULT_DINNER_PLATE_CONFIG: PlateConfig = {
  proteinType: 'carne',
  proteinPortions: 2,
  ricePortions: 2,
  beanPortions: 1,
  hasSalad: true
};

export const DEFAULT_BURGER_CONFIG: BurgerConfig = {
  style: 'artesanal_simples',
  count: 1,
  hasFries: false
};

export const DEFAULT_PIZZA_CONFIG: PizzaConfig = {
  flavorType: 'proteica',
  slices: 3
};

export const DEFAULT_BREAKFAST_CONFIG: CustomMealConfig = {
  coffeeWithMilkCups: 1,
  tapiocaCount: 0,
  eggType: 'mexidos',
  eggCount: 2,
  fruitType: 'banana',
  fruitCount: 0
};

export const DEFAULT_SNACK_CONFIG: CustomMealConfig = {
  coffeeWithMilkCups: 0,
  tapiocaCount: 0,
  eggType: 'mexidos',
  eggCount: 0,
  fruitType: 'banana',
  fruitCount: 1,
  shakeCount: 0
};

export function calculatePlateMacros(config: PlateConfig = DEFAULT_LUNCH_CONFIG) {
  const pCount = config.proteinPortions ?? 2;
  const rCount = config.ricePortions ?? 2;
  const bCount = config.beanPortions ?? 1;
  const salad = config.hasSalad ?? true;

  let protPerPortion = { protein: 28, carbs: 0, fat: 9, calories: 195 };
  if (config.proteinType === 'frango') {
    protPerPortion = { protein: 32, carbs: 0, fat: 4, calories: 165 };
  } else if (config.proteinType === 'peixe') {
    protPerPortion = { protein: 26, carbs: 0, fat: 3, calories: 135 };
  }

  const ricePerPortion = { protein: 2.5, carbs: 28, fat: 0.5, calories: 130 };
  const beanPerPortion = { protein: 6, carbs: 14, fat: 1, calories: 90 };
  const saladMacros = salad
    ? { protein: 1, carbs: 4, fat: 2, calories: 35 }
    : { protein: 0, carbs: 0, fat: 0, calories: 0 };

  const protein = Math.round(
    pCount * protPerPortion.protein +
      rCount * ricePerPortion.protein +
      bCount * beanPerPortion.protein +
      saladMacros.protein
  );
  const carbs = Math.round(
    pCount * protPerPortion.carbs +
      rCount * ricePerPortion.carbs +
      bCount * beanPerPortion.carbs +
      saladMacros.carbs
  );
  const fat = Math.round(
    pCount * protPerPortion.fat +
      rCount * ricePerPortion.fat +
      bCount * beanPerPortion.fat +
      saladMacros.fat
  );
  const calories = Math.round(
    pCount * protPerPortion.calories +
      rCount * ricePerPortion.calories +
      bCount * beanPerPortion.calories +
      saladMacros.calories
  );

  return { protein, carbs, fat, calories };
}

export function calculateChurrascoMacros(
  config: ChurrascoConfig = DEFAULT_CHURRASCO_CONFIG
) {
  const skewers = config.skewerCount ?? 2;
  const baiao = config.baiaoPortions ?? 1;
  const farofa = config.hasFarofa ?? false;
  const vinagrete = config.hasVinagrete ?? true;

  let cutPerSkewer = { protein: 31, carbs: 0, fat: 10, calories: 220 };
  if (config.cut === 'maminha') {
    cutPerSkewer = { protein: 29, carbs: 0, fat: 12, calories: 235 };
  } else if (config.cut === 'fraldinha') {
    cutPerSkewer = { protein: 27, carbs: 0, fat: 16, calories: 260 };
  }

  const baiaoPerPortion = { protein: 9, carbs: 34, fat: 6, calories: 230 };
  const farofaMacros = farofa
    ? { protein: 1, carbs: 15, fat: 2, calories: 75 }
    : { protein: 0, carbs: 0, fat: 0, calories: 0 };
  const vinagreteMacros = vinagrete
    ? { protein: 0.5, carbs: 5, fat: 0.5, calories: 25 }
    : { protein: 0, carbs: 0, fat: 0, calories: 0 };

  return {
    protein: Math.round(
      skewers * cutPerSkewer.protein +
        baiao * baiaoPerPortion.protein +
        farofaMacros.protein +
        vinagreteMacros.protein
    ),
    carbs: Math.round(
      skewers * cutPerSkewer.carbs +
        baiao * baiaoPerPortion.carbs +
        farofaMacros.carbs +
        vinagreteMacros.carbs
    ),
    fat: Math.round(
      skewers * cutPerSkewer.fat +
        baiao * baiaoPerPortion.fat +
        farofaMacros.fat +
        vinagreteMacros.fat
    ),
    calories: Math.round(
      skewers * cutPerSkewer.calories +
        baiao * baiaoPerPortion.calories +
        farofaMacros.calories +
        vinagreteMacros.calories
    )
  };
}

export function calculateSubwayMacros(config: SubwayConfig = DEFAULT_SUBWAY_CONFIG) {
  const mult = config.size === '30cm' ? 2 : 1;
  if (config.protein === 'carne') {
    return {
      protein: 30 * mult,
      carbs: 46 * mult,
      fat: 20 * mult,
      calories: 490 * mult
    };
  }
  return {
    protein: 32 * mult,
    carbs: 48 * mult,
    fat: 16 * mult,
    calories: 460 * mult
  };
}

export function calculateBurgerMacros(config: BurgerConfig = DEFAULT_BURGER_CONFIG) {
  const count = config.count ?? 1;
  let base = { protein: 34, carbs: 42, fat: 34, calories: 620 };
  if (config.style === 'artesanal_duplo') {
    base = { protein: 58, carbs: 45, fat: 58, calories: 940 };
  } else if (config.style === 'podrao_xtudo') {
    base = { protein: 46, carbs: 62, fat: 68, calories: 1050 };
  }

  const fries = config.hasFries
    ? { protein: 4, carbs: 48, fat: 18, calories: 380 }
    : { protein: 0, carbs: 0, fat: 0, calories: 0 };

  return {
    protein: base.protein * count + fries.protein,
    carbs: base.carbs * count + fries.carbs,
    fat: base.fat * count + fries.fat,
    calories: base.calories * count + fries.calories
  };
}

export function calculatePizzaMacros(config: PizzaConfig = DEFAULT_PIZZA_CONFIG) {
  const slices = config.slices ?? 3;
  const perSlice =
    config.flavorType === 'proteica'
      ? { protein: 14, carbs: 28, fat: 12, calories: 285 }
      : { protein: 12, carbs: 29, fat: 17, calories: 320 };

  return {
    protein: perSlice.protein * slices,
    carbs: perSlice.carbs * slices,
    fat: perSlice.fat * slices,
    calories: perSlice.calories * slices
  };
}

export function calculateCustomMealMacros(config: CustomMealConfig) {
  const coffeeCups = config.coffeeWithMilkCups || 0;
  const tapiocas = config.tapiocaCount || 0;
  const eggs = config.eggCount || 0;
  const eggType = config.eggType || 'mexidos';
  const fruits = config.fruitCount || 0;
  const fruitType = config.fruitType || 'banana';
  const shakes = config.shakeCount || 0;

  const coffeeP = coffeeCups * 6;
  const coffeeC = coffeeCups * 9;
  const coffeeF = coffeeCups * 4;
  const coffeeKcal = coffeeCups * 95;

  const tapP = tapiocas * 10;
  const tapC = tapiocas * 33;
  const tapF = tapiocas * 8;
  const tapKcal = tapiocas * 240;

  const eggPerUnit =
    eggType === 'fritos'
      ? { p: 6, c: 0.6, f: 7, kcal: 90 }
      : { p: 6, c: 0.6, f: 5.5, kcal: 80 };
  const eggP = eggs * eggPerUnit.p;
  const eggC = eggs * eggPerUnit.c;
  const eggF = eggs * eggPerUnit.f;
  const eggKcal = eggs * eggPerUnit.kcal;

  let fruitPerUnit = { p: 1.3, c: 26, f: 0.3, kcal: 105 };
  if (fruitType === 'laranja') {
    fruitPerUnit = { p: 1.2, c: 15, f: 0.2, kcal: 62 };
  } else if (fruitType === 'maca') {
    fruitPerUnit = { p: 0.4, c: 19, f: 0.2, kcal: 75 };
  }
  const fruitP = fruits * fruitPerUnit.p;
  const fruitC = fruits * fruitPerUnit.c;
  const fruitF = fruits * fruitPerUnit.f;
  const fruitKcal = fruits * fruitPerUnit.kcal;

  const shakeP = shakes * 25;
  const shakeC = shakes * 20;
  const shakeF = shakes * 3;
  const shakeKcal = shakes * 210;

  return {
    protein: Math.round(coffeeP + tapP + eggP + fruitP + shakeP),
    carbs: Math.round(coffeeC + tapC + eggC + fruitC + shakeC),
    fat: Math.round(coffeeF + tapF + eggF + fruitF + shakeF),
    calories: Math.round(coffeeKcal + tapKcal + eggKcal + fruitKcal + shakeKcal)
  };
}

export function calculateEscapesMacros(escapes?: DetailedEscapes) {
  if (!escapes) return { protein: 0, carbs: 0, fat: 0, calories: 0 };

  const chocSmall = escapes.chocSmallCount || 0;
  const snickers = escapes.snickersBarCount || 0;
  const iceCream = escapes.iceCreamCount || 0;
  const saltySnack = escapes.saltySnackCount || 0;
  const legacyBesteira = escapes.besteiraCount || 0;
  const superBesteira = escapes.superBesteiraCount || 0;

  return {
    protein:
      chocSmall * 1 +
      snickers * 4 +
      iceCream * 5 +
      saltySnack * 6 +
      legacyBesteira * 6 +
      superBesteira * 35,
    carbs:
      chocSmall * 16 +
      snickers * 30 +
      iceCream * 44 +
      saltySnack * 52 +
      legacyBesteira * 65 +
      superBesteira * 120,
    fat:
      chocSmall * 7 +
      snickers * 12 +
      iceCream * 20 +
      saltySnack * 24 +
      legacyBesteira * 30 +
      superBesteira * 65,
    calories:
      chocSmall * 130 +
      snickers * 250 +
      iceCream * 380 +
      saltySnack * 450 +
      legacyBesteira * 600 +
      superBesteira * 1200
  };
}

export function getResolvedBreakfastConfig(log: NutritionLog): CustomMealConfig {
  if (log.breakfastConfig) return log.breakfastConfig;
  const legacyMeal = log.meals?.breakfast;
  const legacyEggs = log.breakfastEggCount ?? 2;

  if (legacyMeal === 'tapioca') {
    return {
      coffeeWithMilkCups: 1,
      tapiocaCount: 1,
      eggType: 'mexidos',
      eggCount: 0,
      fruitType: 'banana',
      fruitCount: 0
    };
  }
  if (legacyMeal === 'ovos') {
    return {
      coffeeWithMilkCups: 1,
      tapiocaCount: 0,
      eggType: 'mexidos',
      eggCount: legacyEggs,
      fruitType: 'banana',
      fruitCount: 0
    };
  }
  if (legacyMeal === '') {
    return {
      coffeeWithMilkCups: 0,
      tapiocaCount: 0,
      eggType: 'mexidos',
      eggCount: 0,
      fruitType: 'banana',
      fruitCount: 0
    };
  }
  return DEFAULT_BREAKFAST_CONFIG;
}

export function getResolvedSnackConfig(log: NutritionLog): CustomMealConfig {
  if (log.snackConfig) return log.snackConfig;
  const legacySnack = log.meals?.snack;
  if (legacySnack === 'fruta_whey') {
    return {
      coffeeWithMilkCups: 0,
      tapiocaCount: 0,
      eggType: 'mexidos',
      eggCount: 0,
      fruitType: 'banana',
      fruitCount: 1,
      shakeCount: 1
    };
  }
  if (legacySnack === 'sanduiche') {
    return {
      coffeeWithMilkCups: 1,
      tapiocaCount: 1,
      eggType: 'mexidos',
      eggCount: 2,
      fruitType: 'banana',
      fruitCount: 0,
      shakeCount: 0
    };
  }
  return {
    coffeeWithMilkCups: 0,
    tapiocaCount: 0,
    eggType: 'mexidos',
    eggCount: 0,
    fruitType: 'banana',
    fruitCount: 0,
    shakeCount: 0
  };
}
