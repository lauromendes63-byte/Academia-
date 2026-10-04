import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface ExerciseExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  gripOrForm: string;
}

interface ExerciseGuideData {
  gifUrl: string;
  primaryMuscle: string;
  steps: [string, string, string];
}

function getExerciseGuide(exerciseId: string, exerciseName: string): ExerciseGuideData {
  const lower = exerciseName.toLowerCase();

  // ==========================================================================
  // 1. RESOLUÇÃO PRIORITÁRIA PELO NOME ATIVO DO EXERCÍCIO (INCLUINDO SUBSTITUTOS)
  // ==========================================================================

  // Rosca Bayesiana na Polia (pull_4 no seedData)
  if (lower.includes('bayesiana') || lower.includes('baiana') || lower.includes('rosca direta polia')) {
    return {
      gifUrl: '/exercises/pull_5.gif',
      primaryMuscle: 'Bíceps (Cabeça Longa & Pico)',
      steps: [
        'Dê um passo à frente da polia baixa deixando o braço alongado atrás da linha do tronco.',
        'Mantenha o cotovelo fixo e flexione o antebraço à frente contraindo forte o bíceps.',
        'Retorne devagar sentindo o alongamento completo sem mover o ombro.'
      ]
    };
  }

  // Rosca no Banco Inclinado
  if (lower.includes('rosca') && lower.includes('inclinado')) {
    return {
      gifUrl: '/exercises/pull_5_incline.gif',
      primaryMuscle: 'Bíceps (Cabeça Longa)',
      steps: [
        'Apoie as costas no banco inclinado deixando os braços alongados para baixo.',
        'Flexione os cotovelos mantendo os ombros fixos no lugar.',
        'Desça controlando até alongar completamente o bíceps.'
      ]
    };
  }

  // Rosca Scott
  if (lower.includes('scott')) {
    return {
      gifUrl: '/exercises/pull_6.gif',
      primaryMuscle: 'Bíceps Braquial',
      steps: [
        'Apoie toda a parte de trás dos braços no banco Scott sem deixar folga.',
        'Suba contraindo o bíceps sem desencostar os cotovelos do apoio.',
        'Desça até quase estender o braço mantendo tensão contínua.'
      ]
    };
  }

  // Rosca Martelo (pull_5 no seedData)
  if (lower.includes('martelo') || lower.includes('rosca inversa')) {
    return {
      gifUrl: '/exercises/pull_6_hammer.gif',
      primaryMuscle: 'Braquial & Antebraço',
      steps: [
        'Segure os pesos em pegada neutra (palmas voltadas uma para a outra).',
        'Suba mantendo os cotovelos colados ao lado do tronco.',
        'Desça de forma controlada sem balançar o tronco.'
      ]
    };
  }

  // Crucifixo Invertido no Peck Deck / Face Pull (pull_3 no seedData)
  if (
    lower.includes('crucifixo invertido') ||
    lower.includes('crucifixo inverso') ||
    lower.includes('face pull') ||
    lower.includes('posterior')
  ) {
    return {
      gifUrl: '/exercises/pull_4.gif',
      primaryMuscle: 'Deltoide Posterior',
      steps: [
        'Ajuste o banco para que as mãos fiquem exatamente na altura dos ombros.',
        'Abra os braços para trás conduzindo pelos cotovelos levemente flexionados.',
        'Retorne controlando o peso sem deixar as placas baterem.'
      ]
    };
  }

  // Puxada Alta / Pulley
  if (lower.includes('puxada') || lower.includes('puxador') || lower.includes('pulley')) {
    return {
      gifUrl: '/exercises/pull_1_pulldown.gif',
      primaryMuscle: 'Grande Dorsal & Costas',
      steps: [
        'Abaixe os ombros (deprima as escápulas) antes de puxar a barra.',
        'Traga a barra até a parte alta do peito conduzindo pelos cotovelos.',
        'Suba controlando o peso até alongar totalmente a dorsal.'
      ]
    };
  }

  // Barra Fixa no Graviton (pull_1 no seedData)
  if (lower.includes('barra fixa') || exerciseId === 'pull_1') {
    return {
      gifUrl: '/exercises/pull_1.gif',
      primaryMuscle: 'Grande Dorsal & Costas',
      steps: [
        'Deprima as escápulas (abaixe os ombros) antes de flexionar os cotovelos.',
        'Suba conduzindo os cotovelos em direção às costelas mantendo o peito aberto.',
        'Desça controlando o movimento até alongar totalmente a dorsal.'
      ]
    };
  }

  // Remada Articulada / Unilateral / Curvada
  if (lower.includes('remada articulada') || lower.includes('cavalinho') || lower.includes('remada curvada')) {
    return {
      gifUrl: '/exercises/pull_3.gif',
      primaryMuscle: 'Dorsal & Meio das Costas',
      steps: [
        'Mantenha o tronco firme e a coluna alinhada.',
        'Traga os cotovelos para trás passando da linha do tronco.',
        'Retorne devagar mantendo a tensão contínua nas costas.'
      ]
    };
  }

  // Remada Baixa na Polia (pull_2 no seedData)
  if (lower.includes('remada') || exerciseId === 'pull_2') {
    return {
      gifUrl: '/exercises/pull_2.gif',
      primaryMuscle: 'Costas (Espessura & Dorsal)',
      steps: [
        'Mantenha a coluna neutra, peito estufado e tronco firme em 90°.',
        'Puxe o triângulo até o abdômen fechando bem as escápulas atrás.',
        'Estenda os braços à frente alongando a dorsal sem curvar a lombar.'
      ]
    };
  }

  // Supino Inclinado c/ Halteres (push_2 no seedData)
  if (lower.includes('supino') && lower.includes('inclinado')) {
    return {
      gifUrl: '/exercises/push_1.gif',
      primaryMuscle: 'Peitoral Superior (Clavicular)',
      steps: [
        'Ajuste o banco entre 30° e 45° com escápulas fechadas e cotovelos a ~45°.',
        'Desça os halteres controladamente até a linha da clavícula.',
        'Empurre para cima alinhando os pesos sobre a parte alta do peito.'
      ]
    };
  }

  // Supino Máquina
  if (lower.includes('supino máquina')) {
    return {
      gifUrl: '/exercises/push_2.gif',
      primaryMuscle: 'Peitoral Maior',
      steps: [
        'Mantenha as costas firmes no encosto e os ombros baixos.',
        'Empurre as manoplas contraindo o peitoral sem desencostar as escápulas.',
        'Retorne devagar alongando bem o peito.'
      ]
    };
  }

  // Supino Reto Barra ou Halteres (push_1 no seedData)
  if (lower.includes('supino') || lower.includes('flexão')) {
    return {
      gifUrl: '/exercises/push_bench_press.gif',
      primaryMuscle: 'Peitoral Maior',
      steps: [
        'Feche as escápulas contra o banco e mantenha os pés firmes no chão.',
        'Desça a barra controladamente até a linha média do esterno (peitoral).',
        'Empurre com firmeza mantendo os cotovelos levemente angulados (~45°-60°).'
      ]
    };
  }

  // Crucifixo no Peck Deck / Crossover (push_4 no seedData)
  if (lower.includes('crucifixo') || lower.includes('peck deck') || lower.includes('crossover')) {
    return {
      gifUrl: '/exercises/push_pec_deck.gif',
      primaryMuscle: 'Peitoral Maior (Isolamento)',
      steps: [
        'Apoie as costas no banco e mantenha os cotovelos levemente flexionados.',
        'Feche os braços à frente esmagando o peitoral por 1 segundo no centro.',
        'Abra de forma controlada alongando o peito sem jogar os ombros para frente.'
      ]
    };
  }

  // Elevação Lateral na Polia Baixa (push_3 no seedData)
  if (lower.includes('elevação') && lower.includes('polia')) {
    return {
      gifUrl: '/exercises/push_3_cable.gif',
      primaryMuscle: 'Deltoide Lateral',
      steps: [
        'Posicione-se ao lado da polia baixa mantendo o tronco firme.',
        'Eleve o braço lateralmente até a linha do ombro guiando pelo cotovelo.',
        'Desça controlando a tensão contínua do cabo.'
      ]
    };
  }

  // Elevação Lateral c/ Halteres
  if (lower.includes('elevação')) {
    return {
      gifUrl: '/exercises/push_3.gif',
      primaryMuscle: 'Deltoide Lateral',
      steps: [
        'Incline-se sutilmente à frente com os cotovelos levemente flexionados.',
        'Suba os braços até a linha dos ombros sem encolher o trapézio.',
        'Desça controlando o peso até próximo da lateral da coxa.'
      ]
    };
  }

  // Mergulho Paralelas no Graviton (push_5 no seedData)
  if (lower.includes('mergulho') || lower.includes('paralelas') || exerciseId === 'push_5') {
    return {
      gifUrl: '/exercises/push_5.gif',
      primaryMuscle: 'Peitoral Inferior & Tríceps',
      steps: [
        'Mantenha os ombros baixos (longe das orelhas) e incline levemente o tronco à frente.',
        'Desça flexionando os cotovelos de forma controlada até cerca de 90°.',
        'Empurre as barras para baixo estendendo os braços com firmeza.'
      ]
    };
  }

  // Tríceps Francês / Testa (push_7 no seedData)
  if (lower.includes('francês') || lower.includes('testa')) {
    return {
      gifUrl: '/exercises/push_french_press.gif',
      primaryMuscle: 'Tríceps (Cabeça Longa)',
      steps: [
        'Mantenha os braços elevados e os cotovelos apontados para frente (sem abrir).',
        'Flexione os antebraços atrás da cabeça alongando bem o tríceps.',
        'Estenda completamente os cotovelos mantendo o tronco firme.'
      ]
    };
  }

  // Tríceps Polia Alta c/ Corda / Pulley (push_6 no seedData)
  if (lower.includes('tríceps')) {
    return {
      gifUrl: '/exercises/push_4.gif',
      primaryMuscle: 'Tríceps Braquial',
      steps: [
        'Cole os cotovelos ao lado das costelas e mantenha-os fixos.',
        'Estenda o antebraço para baixo abrindo a corda no final do movimento.',
        'Suba controladamente até 90° sem deixar os cotovelos subirem.'
      ]
    };
  }

  // Abdominal na Polia Alta c/ Corda (lower1_6 e lower2_6 no seedData)
  if (lower.includes('abdominal') || lower.includes('prancha') || exerciseId === 'lower1_6' || exerciseId === 'lower2_6') {
    return {
      gifUrl: '/exercises/abs_cable_crunch.gif',
      primaryMuscle: 'Reto Abdominal',
      steps: [
        'Ajoelhe-se de frente para a polia segurando a corda firme ao lado da cabeça.',
        'Curve a coluna para baixo aproximando as costelas do quadril (sem sentar nos calcanhares).',
        'Retorne devagar alongando o abdômen sob tensão.'
      ]
    };
  }

  // Leg Press 45° (lower1_1, lower1_4, lower2_2 no seedData)
  if (lower.includes('leg press') || lower.includes('leg 45')) {
    return {
      gifUrl: '/exercises/leg2_2.gif',
      primaryMuscle: 'Quadríceps & Glúteos',
      steps: [
        'Mantenha o quadril e a lombar totalmente apoiados no encosto.',
        'Desça a plataforma flexionando os joelhos de forma controlada.',
        'Empurre pelos calcanhares sem travar os joelhos no topo.'
      ]
    };
  }

  // Agachamento Hack / Smith / Búlgaro / Sumô
  if (lower.includes('hack') || lower.includes('agachamento') || lower.includes('búlgaro') || lower.includes('passada')) {
    return {
      gifUrl: '/exercises/leg1_1.gif',
      primaryMuscle: 'Quadríceps & Glúteos',
      steps: [
        'Mantenha a coluna firme e o abdômen contraído.',
        'Desça flexionando os joelhos alinhados com a ponta dos pés até ~90°.',
        'Suba empurrando firme pelo meio do pé e calcanhar.'
      ]
    };
  }

  // Cadeira Extensora (lower1_2 e lower2_4 no seedData)
  if (lower.includes('extensora') || lower.includes('sissy')) {
    return {
      gifUrl: '/exercises/leg1_2.gif',
      primaryMuscle: 'Quadríceps Isolado',
      steps: [
        'Alinhe o joelho com o eixo da máquina e segure firme nos apoios.',
        'Estenda totalmente os joelhos contraindo forte o quadríceps no topo.',
        'Desça controlando o peso na fase excêntrica.'
      ]
    };
  }

  // Mesa Flexora
  if (lower.includes('mesa flexora')) {
    return {
      gifUrl: '/exercises/leg2_3.gif',
      primaryMuscle: 'Posterior de Coxa',
      steps: [
        'Mantenha o quadril pressionado contra o banco durante toda a série.',
        'Flexione os joelhos trazendo o rolo em direção ao glúteo.',
        'Desça devagar alongando bem o posterior de coxa.'
      ]
    };
  }

  // Cadeira Flexora (lower1_3 e lower2_3 no seedData)
  if (lower.includes('flexora')) {
    return {
      gifUrl: '/exercises/leg1_3.gif',
      primaryMuscle: 'Posterior de Coxa',
      steps: [
        'Encoste bem a lombar e ajuste a trava firme sobre as coxas.',
        'Puxe o rolo para baixo e para trás flexionando ao máximo os joelhos.',
        'Retorne de forma controlada sem soltar o peso.'
      ]
    };
  }

  // Stiff / RDL (lower2_1 no seedData)
  if (lower.includes('stiff') || lower.includes('rdl') || lower.includes('good morning') || lower.includes('elevação pélvica')) {
    return {
      gifUrl: '/exercises/leg2_1.gif',
      primaryMuscle: 'Posterior de Coxa & Glúteo',
      steps: [
        'Destrave levemente os joelhos e mantenha a coluna 100% reta.',
        'Desça os pesos rente às pernas projetando o quadril para trás.',
        'Suba contraindo glúteos e posterior ao atingir o alongamento máximo.'
      ]
    };
  }

  // Panturrilha Sentado
  if (lower.includes('panturrilha') && lower.includes('sentado')) {
    return {
      gifUrl: '/exercises/leg2_4.gif',
      primaryMuscle: 'Panturrilhas (Sóleo)',
      steps: [
        'Apoie a ponta dos pés na plataforma mantendo os calcanhares livres.',
        'Desça alongando bem a panturrilha na parte baixa.',
        'Suba ao máximo na ponta dos pés e segure 1 segundo no topo.'
      ]
    };
  }

  // Panturrilha em Pé (lower1_5 e lower2_5 no seedData)
  return {
    gifUrl: '/exercises/leg1_4.gif',
    primaryMuscle: 'Panturrilhas (Gastrocnêmio)',
    steps: [
      'Mantenha os joelhos estendidos (sem travar) e o tronco alinhado.',
      'Desça o calcanhar o máximo possível fazendo pausa de 1-2s no fundo.',
      'Suba o máximo que conseguir na ponta dos pés contraindo no topo.'
    ]
  };
}

export const ExerciseExecutionModal: React.FC<ExerciseExecutionModalProps> = ({
  isOpen,
  onClose,
  exerciseId,
  exerciseName,
  gripOrForm
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  const guide = getExerciseGuide(exerciseId, exerciseName);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOPO LIMPO */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60 mb-1">
              {guide.primaryMuscle}
            </span>
            <h3 className="text-base font-black text-slate-900 leading-tight">
              {exerciseName}
            </h3>
            {gripOrForm && (
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                {gripOrForm}
              </p>
            )}
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center active:scale-90 transition-all shrink-0"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CORPO COM GIF ANIMADO REAL SUAVIZADO + 3 PASSOS DIRETOS */}
        <div className="p-4 space-y-3.5 max-h-[80vh] overflow-y-auto">
          <div className="w-full h-56 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-center overflow-hidden p-2 shadow-2xs">
            <img
              src={guide.gifUrl}
              alt={`Execução de ${exerciseName}`}
              className="h-full w-auto object-contain select-none"
              loading="eager"
            />
          </div>

          <div className="space-y-2">
            {guide.steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="font-medium">{step}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs active:scale-[0.98] transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
