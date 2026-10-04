import React from 'react';
import { triggerHaptic } from '../utils/audio';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Activity,
  Target,
  ShieldCheck
} from 'lucide-react';

interface ExerciseExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  gripOrForm: string;
  isAssisted?: boolean;
}

interface BiomechanicsGuide {
  movementPattern: 'pull_vertical' | 'pull_horizontal' | 'rear_delt' | 'biceps_cable' | 'biceps_curl' | 'leg_press' | 'knee_ext' | 'knee_flex' | 'calf' | 'abs_crunch' | 'chest_press' | 'lateral_raise' | 'pec_fly' | 'dip_graviton' | 'triceps_push' | 'triceps_overhead' | 'hip_hinge';
  primaryMuscles: string[];
  secondaryMuscles: string[];
  cadence: string;
  steps: [string, string, string];
  goldenTip: string;
  commonMistake: string;
}

function getExerciseGuide(id: string, name: string): BiomechanicsGuide {
  const lower = name.toLowerCase();

  if (id === 'pull_1' || lower.includes('barra fixa') || lower.includes('puxador')) {
    return {
      movementPattern: 'pull_vertical',
      primaryMuscles: ['Grande Dorsal (Latíssimo)', 'Redondo Maior'],
      secondaryMuscles: ['Bíceps Braquial', 'Trapézio Inferior'],
      cadence: '1s subida • 1s contração • 2.5s descida',
      steps: [
        'Segure na barra com pegada pronada aberta (ou neutra), deite os ombros longe das orelhas (depressão escapular) antes de dobrar os cotovelos.',
        'Puxe o corpo para cima direcionando os cotovelos em direção aos bolsos da calça até o queixo passar a linha das mãos.',
        'Desça controlando o movimento por 2 a 3 segundos até alongar completamente a dorsal no fundo.'
      ],
      goldenTip: 'Pense em "puxar com os cotovelos" para baixo e não com as mãos; isso desliga o excesso de bíceps e isola a dorsal.',
      commonMistake: 'Encolher os ombros no topo ou soltar o corpo rápido demais na descida perdendo a tensão excêntrica.'
    };
  }

  if (id === 'pull_2' || lower.includes('remada')) {
    return {
      movementPattern: 'pull_horizontal',
      primaryMuscles: ['Meio das Costas (Romboides)', 'Grande Dorsal'],
      secondaryMuscles: ['Trapézio Médio', 'Deltoide Posterior', 'Bíceps'],
      cadence: '1s puxada • 1s pausa colado ao abdômen • 2s volta',
      steps: [
        'Sente-se com os joelhos semifletidos, coluna neutra firme e peito estufado.',
        'Traga o triângulo em direção à linha do umbigo, fechando bem as escápulas atrás no final da puxada.',
        'Retorne deixando as escápulas abrirem levemente à frente para alongar as costas, sem curvar a lombar.'
      ],
      goldenTip: 'Mantenha o tronco fixo em 90°; quem faz o curso é a escápula e o cotovelo, não o balanço da lombar.',
      commonMistake: 'Jogar o tronco para trás usando impulso da lombar para puxar mais peso.'
    };
  }

  if (id === 'pull_3' || lower.includes('crucifixo invertido') || lower.includes('face pull')) {
    return {
      movementPattern: 'rear_delt',
      primaryMuscles: ['Deltoide Posterior'],
      secondaryMuscles: ['Trapézio Médio', 'Infraespinhal'],
      cadence: '1s abertura • 1s pico atrás • 2s retorno',
      steps: [
        'Ajuste o banco para que os apoios fiquem exatamente na linha horizontal dos seus ombros.',
        'Empurre os braços para trás mantendo uma leve flexão nos cotovelos (sem dobrar e esticar o tríceps).',
        'Pare na linha das costas sentindo a queimação atrás do ombro e retorne devagar sem deixar as placas baterem.'
      ],
      goldenTip: 'Evite juntar/esmagar as escápulas demais no início; pense em abrir os braços em um arco amplo para isolar o posterior de ombro.',
      commonMistake: 'Deixar o banco baixo demais e acabar puxando com o trapézio superior.'
    };
  }

  if (id === 'pull_4' || lower.includes('bayesiana')) {
    return {
      movementPattern: 'biceps_cable',
      primaryMuscles: ['Bíceps Braquial (Cabeça Longa)'],
      secondaryMuscles: ['Braquial', 'Antebraço'],
      cadence: '1s subida • 1s aperto no topo • 2.5s descida alongando',
      steps: [
        'De costas para a polia baixa, dê um passo à frente para que o cabo puxe seu braço levemente para trás da linha do tronco.',
        'Mantendo o cotovelo apontado para o chão (e levemente atrás do corpo), flexione o antebraço até a contração máxima.',
        'Desça devagar deixando a polia alongar totalmente o bíceps lá atrás antes da próxima repetição.'
      ],
      goldenTip: 'A mágica da Rosca Bayesiana é o estiramento máximo da cabeça longa do bíceps com o braço atrás do tronco. Crave o cotovelo no lugar!',
      commonMistake: 'Jogar o cotovelo para frente durante a subida, transformando o exercício numa elevação frontal de ombro.'
    };
  }

  if (id === 'pull_5' || lower.includes('martelo') || lower.includes('rosca')) {
    return {
      movementPattern: 'biceps_curl',
      primaryMuscles: ['Braquial', 'Braquiorradial (Antebraço)'],
      secondaryMuscles: ['Bíceps Braquial'],
      cadence: '1s subida • 1s pico • 2s descida',
      steps: [
        'Em pé, segure os halteres com as palmas das mãos voltadas uma para a outra (pegada neutra / martelo).',
        'Suba o haltere mantendo o cotovelo colado na lateral da costela até contrair totalmente.',
        'Desça de forma controlada até estender o braço, sem balançar o quadril.'
      ],
      goldenTip: 'Aperte o cabo do haltere com firmeza; isso maximiza o recrutamento do braquiorradial e dá aspecto denso ao braço.',
      commonMistake: 'Usar impulso do quadril ou girar o punho no meio do caminho.'
    };
  }

  if (id === 'lower2_1' || lower.includes('stiff') || lower.includes('rdl')) {
    return {
      movementPattern: 'hip_hinge',
      primaryMuscles: ['Isquiotibiais (Posterior de Coxa)', 'Glúteo Máximo'],
      secondaryMuscles: ['Eretores da Espinha', 'Core'],
      cadence: '2.5s descida controlada • 1s subida firme',
      steps: [
        'Pés na largura do quadril, joelhos destravados (levemente flexionados em ~15° fixos) e coluna 100% alinhada.',
        'Inicie o movimento empurrando o quadril para trás (como se fosse fechar uma porta com o glúteo), deslizando os halteres rente à coxa e canela.',
        'Desça até sentir o alongamento máximo do posterior (geralmente no meio da canela) e suba contraindo o glúteo.'
      ],
      goldenTip: 'O movimento acaba quando seu quadril para de ir para trás. Descer além disso só dobra a lombar sem acionar mais o posterior!',
      commonMistake: 'Afastar os halteres da perna ou arredondar as costas olhando para cima.'
    };
  }

  if (lower.includes('leg press')) {
    const isGluteFocus = lower.includes('altos') || id === 'lower2_2';
    const isUnilateral = lower.includes('unilateral') || id === 'lower1_4';
    return {
      movementPattern: 'leg_press',
      primaryMuscles: isGluteFocus
        ? ['Glúteo Máximo', 'Posterior & Adutores']
        : ['Quadríceps (Vasto Lateral, Medial e Reto Femoral)'],
      secondaryMuscles: ['Glúteo Máximo', 'Adutores'],
      cadence: '2.5s descida • 0.5s transição • 1.5s empurrada',
      steps: [
        isGluteFocus
          ? 'Posicione os pés na parte alta da plataforma e mais afastados, pontas levemente para fora.'
          : isUnilateral
          ? 'Posicione apenas uma perna centralizada/firme na plataforma e mantenha o quadril totalmente encaixado no banco.'
          : 'Posicione os pés na largura dos ombros no centro/base da plataforma e cole o quadril e a lombar no encosto.',
        'Destrave e desça a plataforma controlando o peso até atingir 90° ou mais de flexão nos joelhos, sem deixar o quadril descolar do banco.',
        'Empurre a plataforma fazendo força pelo calcanhar e meio do pé, parando um pouco antes de trancar totalmente os joelhos.'
      ],
      goldenTip: 'Use as alças laterais do assento para "puxar" seu quadril para baixo contra o banco durante toda a série.',
      commonMistake: 'Tirar a lombar do encosto no fundo ou empurrar os próprios joelhos com as mãos.'
    };
  }

  if (lower.includes('extensora')) {
    return {
      movementPattern: 'knee_ext',
      primaryMuscles: ['Quadríceps Isolado (4 Cabeças)'],
      secondaryMuscles: [],
      cadence: '1s subida • 1.5s pico travado no topo • 2s descida',
      steps: [
        'Ajuste o encosto para que a dobra do seu joelho fique exatamente alinhada ao eixo de rotação da máquina.',
        'Chute para cima até estender 100% os joelhos e segure 1 segundo cheio no topo esmagando a coxa.',
        'Desça controlando o peso até o final da amplitude, sem deixar as placas baterem.'
      ],
      goldenTip: 'A parte mais importante da Cadeira Extensora é o 1 segundo de parada isométrica no topo de cada repetição!',
      commonMistake: 'Chutar o peso usando impulso balístico e não travar no topo.'
    };
  }

  if (lower.includes('flexora')) {
    return {
      movementPattern: 'knee_flex',
      primaryMuscles: ['Isquiotibiais (Posterior de Coxa)'],
      secondaryMuscles: ['Gastrocnêmio (Panturrilha)'],
      cadence: '1s flexão • 1s contração embaixo • 2.5s subida',
      steps: [
        'Ajuste o rolo logo acima do calcanhar e trave bem o apoio de coxa para o corpo não subir.',
        'Puxe o rolo para baixo o máximo possível aproximando o calcanhar do banco.',
        'Retorne devagar controlando toda a subida até alongar completamente o posterior.'
      ],
      goldenTip: 'Mantenha a ponta dos pés puxada para cima (dorsiflexão) para aumentar a tensão na cadeia posterior.',
      commonMistake: 'Tirar o quadril do banco tentando roubar nas últimas repetições.'
    };
  }

  if (lower.includes('panturrilha')) {
    return {
      movementPattern: 'calf',
      primaryMuscles: ['Gastrocnêmio (Medial e Lateral)'],
      secondaryMuscles: ['Sóleo'],
      cadence: '1s subida • 1s topo • 2s descida • 2s pausa no fundo!',
      steps: [
        'Apoie apenas a parte da frente dos pés (metatarso) no degrau, mantendo os joelhos estendidos (sem hiperestender).',
        'Desça o calcanhar ao máximo possível e FAÇA UMA PAUSA DE 2 SEGUNDOS no fundo para eliminar o reflexo elástico do tendão.',
        'Suba na ponta dos pés até a contração máxima e segure 1 segundo no topo.'
      ],
      goldenTip: 'A pausa de 2 segundos lá no fundo alongando é o que força a fibra muscular da panturrilha a trabalhar em vez do tendão de Aquiles!',
      commonMistake: 'Fazer repetições curtas e rápidas quicando ("bombeando") sem amplitude.'
    };
  }

  if (lower.includes('abdominal')) {
    return {
      movementPattern: 'abs_crunch',
      primaryMuscles: ['Reto Abdominal (Gomos)'],
      secondaryMuscles: ['Oblíquos'],
      cadence: '1.5s enrolando • 1s soltando o ar • 2s subindo',
      steps: [
        'Ajoelhe-se de frente (ou de costas) para a polia alta segurando a corda firme ao lado das têmporas/orelhas.',
        'Mantenha o quadril fixo e enrole a coluna para baixo, aproximando as costelas da pelve enquanto solta todo o ar.',
        'Retorne devagar esticando o abdômen sem sentar nos calcanhares.'
      ],
      goldenTip: 'Imagine que sua coluna é um tapete enrolando vértebra por vértebra; não desça com as costas retas.',
      commonMistake: 'Sentar nos calcanhares usando o peso do quadril para puxar a corda em vez de dobrar o abdômen.'
    };
  }

  if (lower.includes('supino')) {
    const isIncline = lower.includes('inclinado');
    return {
      movementPattern: 'chest_press',
      primaryMuscles: isIncline
        ? ['Peitoral Superior (Clavicular)']
        : ['Peitoral Maior (Esternal)'],
      secondaryMuscles: ['Deltoide Anterior', 'Tríceps Braquial'],
      cadence: '2s descida controlada • 1s empurrada firme',
      steps: [
        isIncline
          ? 'Ajuste o banco em 30° a 45°, feche as escápulas atrás e firme os pés no chão.'
          : 'Deite no banco reto, feche as escápulas para trás e para baixo criando uma base sólida para os ombros.',
        'Desça os halteres/barra com os cotovelos a ~45°-60° em relação ao tronco (nunca 90° abertos) até alongar o peitoral.',
        'Empurre para cima convergindo levemente sem desencostar os ombros do banco no topo.'
      ],
      goldenTip: 'Mantenha o peito sempre mais alto que os ombros durante toda a série através da retração escapular.',
      commonMistake: 'Abrir os cotovelos na linha do pescoço (90°), sobrecarregando o manguito rotador.'
    };
  }

  if (lower.includes('elevação lateral')) {
    return {
      movementPattern: 'lateral_raise',
      primaryMuscles: ['Deltoide Lateral (Largura do Ombro)'],
      secondaryMuscles: ['Supraespinhal'],
      cadence: '1s subida • 0.5s topo • 2s descida',
      steps: [
        'De lado para a polia baixa, segure o puxador com o cabo passando pela frente ou por trás das pernas.',
        'Eleve o braço no plano escapular (~20° à frente da linha lateral do corpo) até a altura do ombro.',
        'Desça controlando a resistência contínua do cabo sem relaxar no fundo.'
      ],
      goldenTip: 'Pense em empurrar a parede longe com o punho/cotovelo, e não em levantar o peso para o teto (evita ativar o trapézio).',
      commonMistake: 'Subir acima da linha da cabeça ou dar impulso com o tronco.'
    };
  }

  if (lower.includes('peck deck') || lower.includes('crucifixo')) {
    return {
      movementPattern: 'pec_fly',
      primaryMuscles: ['Peitoral Maior (Fibras Internas & Alongamento)'],
      secondaryMuscles: ['Deltoide Anterior'],
      cadence: '1s fechamento • 1.5s esmagando no meio • 2s abrindo',
      steps: [
        'Ajuste o assento para que suas mãos fiquem na linha do meio do peito e cole as escápulas no encosto.',
        'Feche os braços em arco pensando em encostar um bíceps no outro e segure 1 a 2 segundos esmagando o peitoral.',
        'Abra controlando o movimento até a linha do tronco, sentindo o peitoral alongar.'
      ],
      goldenTip: 'A pausa de 1.5s com as alças unidas na frente gera recrutamento máximo das fibras do peitoral.',
      commonMistake: 'Tirar as costas do encosto e projetar os ombros para frente ao fechar.'
    };
  }

  if (id === 'push_5' || lower.includes('mergulho') || lower.includes('paralelas')) {
    return {
      movementPattern: 'dip_graviton',
      primaryMuscles: ['Peitoral Inferior', 'Tríceps Braquial'],
      secondaryMuscles: ['Deltoide Anterior'],
      cadence: '2s descida • 1s subida forte',
      steps: [
        'Apoie os joelhos na plataforma do Graviton, segure firme nas barras paralelas e incline o tronco ~20° para frente.',
        'Desça controlando o corpo até os ombros ficarem na linha dos cotovelos (90°), alongando o peitoral inferior.',
        'Empurre as barras para baixo até estender os braços mantendo o peito aberto.'
      ],
      goldenTip: 'Incline levemente o tronco à frente para focar no peitoral inferior; tronco reto foca mais no tríceps.',
      commonMistake: 'Descer além da mobilidade do ombro ou encolher o pescoço entre os ombros.'
    };
  }

  if (id === 'push_6' || lower.includes('corda') || lower.includes('pulley')) {
    return {
      movementPattern: 'triceps_push',
      primaryMuscles: ['Tríceps (Cabeça Lateral e Medial)'],
      secondaryMuscles: ['Ancôneo'],
      cadence: '1s descida • 1s abrindo a corda embaixo • 2s subida',
      steps: [
        'Fique em pé com leve inclinação do tronco à frente e cole os cotovelos na lateral do corpo.',
        'Estenda os antebraços para baixo e, no final do movimento, afaste as pontas da corda contraindo forte o tríceps.',
        'Suba devagar apenas o antebraço até ~90°, mantendo o cotovelo imóvel como uma dobradiça.'
      ],
      goldenTip: 'O cotovelo não deve ir para frente nem para trás; apenas o antebraço se move.',
      commonMistake: 'Subir os cotovelos na volta e jogar o peso do corpo sobre a corda.'
    };
  }

  // Default / Triceps Francês
  return {
    movementPattern: 'triceps_overhead',
    primaryMuscles: ['Tríceps (Cabeça Longa)'],
    secondaryMuscles: ['Cabeça Lateral e Medial'],
    cadence: '2s descida atrás da cabeça • 1s extensão completa',
    steps: [
      'Com o braço elevado acima da cabeça (na polia ou c/ haltere), mantenha o cotovelo apontado para cima/frente.',
      'Deixe o peso descer atrás da cabeça flexionando completamente o cotovelo para alongar a cabeça longa do tríceps.',
      'Estenda o braço até o topo mantendo os cotovelos fechados.'
    ],
    goldenTip: 'A cabeça longa do tríceps é a maior porção do braço e só é totalmente esticada quando o cotovelo está elevado acima do ombro!',
    commonMistake: 'Deixar os cotovelos abrirem demais para os lados durante a força.'
  };
}

export const ExerciseExecutionModal: React.FC<ExerciseExecutionModalProps> = ({
  isOpen,
  onClose,
  exerciseId,
  exerciseName,
  muscleGroup,
  gripOrForm,
  isAssisted
}) => {
  if (!isOpen) return null;

  const guide = getExerciseGuide(exerciseId, exerciseName);
  const isGraviton = isAssisted || exerciseName.toLowerCase().includes('graviton');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                <Activity className="w-3 h-3 text-blue-600" />
                {muscleGroup}
              </span>
              {isGraviton && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ⚡ Graviton (Contrapeso)
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              {exerciseName}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {gripOrForm}
            </p>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 active:scale-90 transition-all"
            aria-label="Fechar guia"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* ANIMAÇÃO BIOMECÂNICA EM LOOP (100% OFFLINE & FLUIDA) */}
        {/* ========================================================= */}
        <div className="relative rounded-2xl bg-slate-900 text-white p-4 mb-4 overflow-hidden border border-slate-800 shadow-inner">
          <style>{`
            @keyframes kineticRep {
              0%, 100% { transform: translateY(0px) scale(1); }
              40% { transform: translateY(-16px) scale(1.03); }
              55% { transform: translateY(-16px) scale(1.05); }
            }
            @keyframes kineticArc {
              0%, 100% { stroke-dashoffset: 60; opacity: 0.45; }
              45%, 55% { stroke-dashoffset: 0; opacity: 1; }
            }
            @keyframes musclePulse {
              0%, 100% { opacity: 0.55; r: 10px; }
              45%, 55% { opacity: 1; r: 14px; }
            }
            .anim-kinetic-limb {
              animation: kineticRep 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
            .anim-kinetic-arc {
              stroke-dasharray: 60;
              animation: kineticArc 3.2s ease-in-out infinite;
            }
            .anim-muscle-node {
              animation: musclePulse 3.2s ease-in-out infinite;
            }
          `}</style>

          <div className="flex items-center justify-between gap-3">
            {/* SVG Biomechanical Vector Monitor */}
            <div className="w-28 h-28 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center shrink-0 relative">
              <svg viewBox="0 0 120 120" className="w-24 h-24 overflow-visible">
                {/* Grid reference */}
                <line x1="15" y1="100" x2="105" y2="100" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
                <line x1="60" y1="15" x2="60" y2="100" stroke="#1e293b" strokeDasharray="3 3" strokeWidth="1.5" />

                {/* Trajectory Vector Arc */}
                <path
                  d="M 35 80 Q 60 25 85 80"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="anim-kinetic-arc"
                />

                {/* Animated Biomechanical Figure / Force Vector */}
                <g className="anim-kinetic-limb">
                  {/* Target Muscle Glow */}
                  <circle
                    cx="60"
                    cy="56"
                    r="12"
                    fill="#ef4444"
                    className="anim-muscle-node"
                  />
                  {/* Joint & Limb Structure */}
                  <line x1="60" y1="30" x2="60" y2="78" stroke="#f8fafc" strokeWidth="4.5" strokeLinecap="round" />
                  <line x1="38" y1="62" x2="60" y2="46" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" />
                  <line x1="82" y1="62" x2="60" y2="46" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="60" cy="24" r="6" fill="#f8fafc" />
                  {/* Resistance / Cable / Bar Indicator */}
                  <rect x="30" y="58" width="60" height="5" rx="2.5" fill="#10b981" />
                </g>
              </svg>

              <span className="absolute bottom-1.5 left-2 right-2 text-[8px] font-black uppercase tracking-wider text-center text-emerald-400 bg-slate-900/90 py-0.5 rounded">
                Loop Cinético
              </span>
            </div>

            {/* Muscle Activation & Cadence Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  Músculo Alvo Principal (Foco)
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {guide.primaryMuscles.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {guide.secondaryMuscles.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    Sinergistas / Auxiliares
                  </span>
                  <div className="text-[11px] font-semibold text-blue-300 truncate">
                    {guide.secondaryMuscles.join(' • ')}
                  </div>
                </div>
              )}

              <div className="pt-1 border-t border-slate-800 flex items-center gap-1.5 text-[10px] font-bold text-amber-300">
                <Target className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span className="truncate">{guide.cadence}</span>
              </div>
            </div>
          </div>
        </div>

        {/* AVISO ESPECIAL GRAVITON SE APLICÁVEL */}
        {isGraviton && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-black block text-emerald-900">
                Mecânica Invertida do Graviton:
              </strong>
              <span className="text-[11px] text-emerald-800 leading-relaxed">
                Neste aparelho, a placa de peso empurra você para cima (ajuda).{' '}
                <strong>Diminuir o peso na máquina (-5kg)</strong> significa usar menos ajuda e fazer{' '}
                <strong>mais força real</strong>!
              </span>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PASSO A PASSO TÉCNICO (3 ETAPAS) */}
        {/* ========================================================= */}
        <div className="space-y-2 mb-4">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Passo a Passo da Execução
          </h3>
          {guide.steps.map((step, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5"
            >
              <span className="w-5 h-5 rounded-lg bg-blue-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                {step}
              </p>
            </div>
          ))}
        </div>

        {/* ========================================================= */}
        {/* DICA DE OURO & ERRO A EVITAR */}
        {/* ========================================================= */}
        <div className="space-y-2 mb-5">
          <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-950 leading-relaxed">
              <strong className="font-black text-blue-800">Dica de Ouro: </strong>
              {guide.goldenTip}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 leading-relaxed">
              <strong className="font-black text-amber-800">Evite este Erro: </strong>
              {guide.commonMistake}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Entendi, Voltar ao Treino</span>
        </button>
      </div>
    </div>
  );
};
