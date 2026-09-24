import type { RoutineDefinition, UserProfile } from '../types';

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'main_user',
  name: 'Lauro',
  age: 21,
  heightCm: 185,
  currentWeightKg: 98,
  targetProteinGrams: 185,
  targetWaterMl: 4000,
  activeRoutine: 'A'
};

export const DEFAULT_ROUTINES: RoutineDefinition[] = [
  {
    id: 'A',
    title: 'TREINO A: PULL',
    subtitle: 'Costas, Bíceps e Deltoide Posterior',
    exercises: [
      {
        id: 'pull_1',
        name: 'Barra Fixa no Graviton',
        muscleGroup: 'Costas & Dorsal',
        gripOrForm: 'Pronada Aberta (ou Neutra Curva)',
        defaultSets: 3,
        targetReps: '6-8',
        restSeconds: 120,
        defaultWeightKg: 40,
        substitutes: ['Puxador Vertical Polia Alta', 'Puxada c/ Triângulo']
      },
      {
        id: 'pull_2',
        name: 'Remada Baixa na Polia',
        muscleGroup: 'Costas (Espessura)',
        gripOrForm: 'Neutra c/ Triângulo',
        defaultSets: 3,
        targetReps: '8-10',
        restSeconds: 90,
        defaultWeightKg: 50,
        substitutes: ['Remada Unilateral Haltere', 'Remada Curvada Halteres']
      },
      {
        id: 'pull_3',
        name: 'Crucifixo Invertido no Peck Deck',
        muscleGroup: 'Deltoide Posterior',
        gripOrForm: 'Braços quase retos, foco no ombro posterior',
        defaultSets: 3,
        targetReps: '12-15',
        restSeconds: 60,
        defaultWeightKg: 35,
        substitutes: ['Crucifixo Invertido Halteres Banco', 'Face Pull Polia c/ Corda']
      },
      {
        id: 'pull_4',
        name: 'Rosca Direta Banco Inclinado c/ Halteres',
        muscleGroup: 'Bíceps (Cabeça Longa)',
        gripOrForm: 'Supinada (Banco 45°-60°)',
        defaultSets: 3,
        targetReps: '8-10',
        restSeconds: 90,
        defaultWeightKg: 12,
        substitutes: ['Rosca Direta Barra em Pé', 'Rosca Scott c/ Halteres']
      },
      {
        id: 'pull_5',
        name: 'Rosca Martelo c/ Halteres',
        muscleGroup: 'Braquial & Antebraço',
        gripOrForm: 'Pegada Neutra firme',
        defaultSets: 3,
        targetReps: '10-12',
        restSeconds: 60,
        defaultWeightKg: 14,
        substitutes: ['Rosca Martelo Polia c/ Corda', 'Rosca Inversa Barra']
      }
    ]
  },
  {
    id: 'B',
    title: 'TREINO B: LOWER 1',
    subtitle: 'Quadríceps, Panturrilhas e Abdômen',
    exercises: [
      {
        id: 'lower1_1',
        name: 'Leg Press 45° Bilateral',
        muscleGroup: 'Quadríceps & Glúteo',
        gripOrForm: 'Pés: Base média/baixa na plataforma',
        defaultSets: 3,
        targetReps: '8-10',
        restSeconds: 120,
        defaultWeightKg: 160,
        substitutes: ['Agachamento Goblet Haltere', 'Agachamento no Smith']
      },
      {
        id: 'lower1_2',
        name: 'Cadeira Extensora',
        muscleGroup: 'Quadríceps Isolado',
        gripOrForm: 'Extensão controlada com pico de contração',
        defaultSets: 3,
        targetReps: '12-15',
        restSeconds: 60,
        defaultWeightKg: 50,
        substitutes: ['Passada Curta Halteres', 'Sissy Squat']
      },
      {
        id: 'lower1_3',
        name: 'Cadeira Flexora',
        muscleGroup: 'Posterior de Coxa',
        gripOrForm: 'Flexão total, tronco estabilizado',
        defaultSets: 3,
        targetReps: '10-12',
        restSeconds: 90,
        defaultWeightKg: 45,
        substitutes: ['Mesa Flexora', 'Flexão Nórdica / Caneleira']
      },
      {
        id: 'lower1_4',
        name: 'Leg Press 45° Unilateral',
        muscleGroup: 'Quadríceps Unilateral',
        gripOrForm: '1 perna por vez, profundidade limpa',
        defaultSets: 3,
        targetReps: '10-12/lado',
        restSeconds: 90,
        defaultWeightKg: 60,
        substitutes: ['Agachamento Búlgaro', 'Step-up no Banco']
      },
      {
        id: 'lower1_5',
        name: 'Elevação de Panturrilha em Pé',
        muscleGroup: 'Gastrocnêmio',
        gripOrForm: 'Pausa de 2s no fundo do movimento',
        defaultSets: 4,
        targetReps: '10-12',
        restSeconds: 60,
        defaultWeightKg: 60,
        substitutes: ['Panturrilha no Leg 45°', 'Panturrilha Degrau']
      },
      {
        id: 'lower1_6',
        name: 'Abdominal na Polia Alta c/ Corda',
        muscleGroup: 'Reto Abdominal',
        gripOrForm: 'Corda ao lado das orelhas, curvando a coluna',
        defaultSets: 3,
        targetReps: '12-15',
        restSeconds: 60,
        defaultWeightKg: 35,
        substitutes: ['Abdominal Supra c/ Peso', 'Elevação de Pernas Suspenso']
      }
    ]
  },
  {
    id: 'C',
    title: 'TREINO C: PUSH',
    subtitle: 'Peitoral, Deltoides e Tríceps',
    exercises: [
      {
        id: 'push_1',
        name: 'Supino Reto Barra ou Halteres',
        muscleGroup: 'Peitoral Maior',
        gripOrForm: 'Pronada média, escápulas aduzidas',
        defaultSets: 3,
        targetReps: '8-10',
        restSeconds: 120,
        defaultWeightKg: 60,
        substitutes: ['Supino Reto Halteres', 'Flexão c/ Sobrecarga']
      },
      {
        id: 'push_2',
        name: 'Supino Inclinado c/ Halteres',
        muscleGroup: 'Peitoral Superior',
        gripOrForm: 'Banco em 30°-45°',
        defaultSets: 3,
        targetReps: '8-10',
        restSeconds: 120,
        defaultWeightKg: 22,
        substitutes: ['Supino Inclinado Barra', 'Supino Smith Inclinado']
      },
      {
        id: 'push_3',
        name: 'Elevação Lateral na Polia Baixa',
        muscleGroup: 'Deltoide Lateral',
        gripOrForm: 'Cabo na canela, cotovelo fletido 20°',
        defaultSets: 3,
        targetReps: '12-15/lado',
        restSeconds: 60,
        defaultWeightKg: 10,
        substitutes: ['Elevação Lateral Halteres Sentado 90°', 'Elevação Apoiada']
      },
      {
        id: 'push_4',
        name: 'Crucifixo no Peck Deck',
        muscleGroup: 'Peitoral (Alongamento/Contração)',
        gripOrForm: 'Pausa 1-2s no meio esmagando esterno',
        defaultSets: 3,
        targetReps: '12-15',
        restSeconds: 60,
        defaultWeightKg: 45,
        substitutes: ['Crossover Polia Média', 'Crucifixo Halteres']
      },
      {
        id: 'push_5',
        name: 'Mergulho Paralelas no Graviton',
        muscleGroup: 'Peitoral Inferior & Tríceps',
        gripOrForm: 'Tronco inclinado à frente',
        defaultSets: 3,
        targetReps: '8-10',
        restSeconds: 90,
        defaultWeightKg: 35,
        substitutes: ['Supino Fechado Barra', 'Flexão Diamante']
      },
      {
        id: 'push_6',
        name: 'Tríceps Polia Alta c/ Corda',
        muscleGroup: 'Tríceps (Cabeça Lateral)',
        gripOrForm: 'Pegada neutra abrindo embaixo',
        defaultSets: 3,
        targetReps: '10-12',
        restSeconds: 60,
        defaultWeightKg: 25,
        substitutes: ['Tríceps Pulley Barra Reta', 'Tríceps Coice']
      },
      {
        id: 'push_7',
        name: 'Tríceps Francês na Polia ou Haltere',
        muscleGroup: 'Tríceps (Cabeça Longa)',
        gripOrForm: 'Braço elevado acima da cabeça',
        defaultSets: 3,
        targetReps: '12-15',
        restSeconds: 60,
        defaultWeightKg: 18,
        substitutes: ['Tríceps Testa Barra W', 'Tríceps Francês Unilateral']
      }
    ]
  },
  {
    id: 'D',
    title: 'TREINO D: LOWER 2',
    subtitle: 'Posterior Coxa, Glúteo, Panturrilhas e Abdômen',
    exercises: [
      {
        id: 'lower2_1',
        name: 'Stiff / RDL c/ Halteres',
        muscleGroup: 'Isquiotibiais & Glúteo',
        gripOrForm: 'Dobradiça de quadril, halteres colados à tíbia',
        defaultSets: 3,
        targetReps: '8-10',
        restSeconds: 120,
        defaultWeightKg: 26,
        substitutes: ['Stiff com Barra', 'Good Morning no Smith']
      },
      {
        id: 'lower2_2',
        name: 'Leg Press 45° Pés Altos e Afastados',
        muscleGroup: 'Glúteo & Adutores',
        gripOrForm: 'Pés no topo da plataforma e afastados',
        defaultSets: 3,
        targetReps: '8-10',
        restSeconds: 120,
        defaultWeightKg: 150,
        substitutes: ['Agachamento Sumô Haltere', 'Elevação Pélvica']
      },
      {
        id: 'lower2_3',
        name: 'Cadeira Flexora',
        muscleGroup: 'Posterior de Coxa Isolado',
        gripOrForm: 'Tronco firme, extensão e contração completas',
        defaultSets: 3,
        targetReps: '10-12',
        restSeconds: 90,
        defaultWeightKg: 45,
        substitutes: ['Stiff Unilateral Haltere', 'Mesa Flexora']
      },
      {
        id: 'lower2_4',
        name: 'Cadeira Extensora',
        muscleGroup: 'Quadríceps Manutenção',
        gripOrForm: 'Cadência controlada',
        defaultSets: 3,
        targetReps: '12-15',
        restSeconds: 60,
        defaultWeightKg: 45,
        substitutes: ['Leg Press Pés Fechados', 'Agachamento Búlgaro']
      },
      {
        id: 'lower2_5',
        name: 'Elevação de Panturrilha em Pé',
        muscleGroup: 'Panturrilhas',
        gripOrForm: 'Pausa 2s no fundo, amplitude total',
        defaultSets: 4,
        targetReps: '10-12',
        restSeconds: 60,
        defaultWeightKg: 60,
        substitutes: ['Panturrilha Leg 45°', 'Panturrilha Degrau']
      },
      {
        id: 'lower2_6',
        name: 'Abdominal na Polia Alta c/ Corda',
        muscleGroup: 'Abdômen',
        gripOrForm: 'Corda travada, flexão do tronco',
        defaultSets: 3,
        targetReps: '12-15',
        restSeconds: 60,
        defaultWeightKg: 35,
        substitutes: ['Prancha Abdominal (60s)', 'Abdominal na Roda']
      }
    ]
  }
];
