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

  // 1. Puxada / Barra Fixa no Graviton
  if (lower.includes('puxada alta') || lower.includes('pulley')) {
    return {
      gifUrl: '/exercises/pull_1_pulldown.gif',
      primaryMuscle: 'Grande Dorsal & Redondo Maior',
      steps: [
        'Abaixe os ombros (deprima as escápulas) antes de puxar a barra.',
        'Traga a barra em direção à parte alta do peito conduzindo pelos cotovelos.',
        'Suba controlando o peso até alongar totalmente a dorsal no topo.'
      ]
    };
  }

  if (exerciseId === 'pull_1' || lower.includes('barra fixa')) {
    return {
      gifUrl: '/exercises/pull_1.gif',
      primaryMuscle: 'Grande Dorsal & Redondo Maior',
      steps: [
        'Deprima as escápulas (abaixe os ombros) antes de dobrar os cotovelos.',
        'Suba conduzindo os cotovelos em direção às costelas mantendo o peito aberto.',
        'Desça controlando o movimento até alongar totalmente a dorsal.'
      ]
    };
  }

  // 2. Remada Baixa na Polia
  if (exerciseId === 'pull_2' || lower.includes('remada baixa') || lower.includes('triângulo')) {
    return {
      gifUrl: '/exercises/pull_2.gif',
      primaryMuscle: 'Meio das Costas & Dorsal',
      steps: [
        'Mantenha a coluna neutra e o tronco firme em 90°.',
        'Puxe até a linha do abdômen fechando as escápulas atrás.',
        'Estenda os braços à frente alongando as costas sem curvar a lombar.'
      ]
    };
  }

  // 3. Remada Articulada Máquina
  if (exerciseId === 'pull_3' || lower.includes('remada articulada') || lower.includes('cavalinho')) {
    return {
      gifUrl: '/exercises/pull_3.gif',
      primaryMuscle: 'Dorsal & Trapézio Médio',
      steps: [
        'Apoie o peitoral firmemente no suporte da máquina.',
        'Traga os cotovelos para trás passando da linha do tronco.',
        'Retorne devagar mantendo a tensão contínua nas costas.'
      ]
    };
  }

  // 4. Crucifixo Invertido no Peck Deck
  if (exerciseId === 'pull_4' || lower.includes('crucifixo inverso') || lower.includes('crucifixo invertido') || lower.includes('face pull')) {
    return {
      gifUrl: '/exercises/pull_4.gif',
      primaryMuscle: 'Deltoide Posterior',
      steps: [
        'Ajuste o banco para que as mãos fiquem na altura dos ombros.',
        'Abra os braços para trás com os cotovelos levemente flexionados.',
        'Volte controlando o peso sem deixar as placas baterem.'
      ]
    };
  }

  // 5. Rosca Bayesiana / Rosca no Banco Inclinado
  if (lower.includes('inclinado')) {
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

  if (exerciseId === 'pull_5' || lower.includes('bayesiana') || lower.includes('baiana')) {
    return {
      gifUrl: '/exercises/pull_5.gif',
      primaryMuscle: 'Bíceps (Cabeça Longa)',
      steps: [
        'Dê um passo à frente da polia baixa deixando o braço alongado atrás do tronco.',
        'Mantenha o cotovelo fixo e flexione o antebraço à frente contraindo o bíceps.',
        'Retorne devagar sentindo o alongamento sem mover o ombro.'
      ]
    };
  }

  // 6. Rosca Martelo / Rosca Scott Máquina
  if (lower.includes('martelo')) {
    return {
      gifUrl: '/exercises/pull_6_hammer.gif',
      primaryMuscle: 'Braquial & Braquiorradial',
      steps: [
        'Segure os halteres em pegada neutra (palmas voltadas uma para a outra).',
        'Suba os pesos mantendo os cotovelos colados ao lado do tronco.',
        'Desça de forma controlada sem balançar o corpo.'
      ]
    };
  }

  if (exerciseId === 'pull_6' || lower.includes('scott')) {
    return {
      gifUrl: '/exercises/pull_6.gif',
      primaryMuscle: 'Bíceps Braquial',
      steps: [
        'Apoie toda a parte de trás dos braços no banco Scott sem deixar folga.',
        'Suba contraindo o bíceps sem desencostar os cotovelos do apoio.',
        'Desça até quase estender o braço mantendo tensão na parte baixa.'
      ]
    };
  }

  // 7. Supino Inclinado c/ Halteres
  if (exerciseId === 'push_1' || (lower.includes('supino') && lower.includes('inclinado'))) {
    return {
      gifUrl: '/exercises/push_1.gif',
      primaryMuscle: 'Peitoral Superior (Clavicular)',
      steps: [
        'Banco entre 30° e 45° com escápulas fechadas e cotovelos a ~45° do tronco.',
        'Desça os halteres controladamente até a linha da clavícula.',
        'Empurre para cima alinhando os pesos sobre a parte alta do peito.'
      ]
    };
  }

  // 8. Supino Máquina
  if (exerciseId === 'push_2' || lower.includes('supino máquina') || lower.includes('supino reto')) {
    return {
      gifUrl: '/exercises/push_2.gif',
      primaryMuscle: 'Peitoral Maior',
      steps: [
        'Mantenha as costas firmes no encosto e os ombros baixos.',
        'Empurre as manoplas até quase estender os cotovelos contraindo o peitoral.',
        'Retorne devagar alongando bem o peito sem soltar o peso.'
      ]
    };
  }

  // 9. Elevação Lateral
  if (lower.includes('elevação lateral') && lower.includes('polia')) {
    return {
      gifUrl: '/exercises/push_3_cable.gif',
      primaryMuscle: 'Deltoide Lateral',
      steps: [
        'Posicione-se ao lado da polia baixa mantendo o tronco firme.',
        'Eleve o braço lateralmente até a linha do ombro guiando pelo cotovelo.',
        'Desça controlando a resistência contínua do cabo.'
      ]
    };
  }

  if (exerciseId === 'push_3' || lower.includes('elevação lateral')) {
    return {
      gifUrl: '/exercises/push_3.gif',
      primaryMuscle: 'Deltoide Lateral',
      steps: [
        'Incline-se levemente à frente com os cotovelos sutilmente flexionados.',
        'Suba os braços até a linha dos ombros sem encolher o trapézio.',
        'Desça controlando o peso até próximo da lateral da coxa.'
      ]
    };
  }

  // 10. Tríceps Corda na Polia
  if (exerciseId === 'push_4' || lower.includes('tríceps corda') || lower.includes('testa')) {
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

  // 11. Mergulho Paralelas no Graviton
  if (exerciseId === 'push_5' || lower.includes('mergulho') || lower.includes('paralelas')) {
    return {
      gifUrl: '/exercises/push_5.gif',
      primaryMuscle: 'Peitoral Inferior & Tríceps',
      steps: [
        'Mantenha os ombros baixos (longe das orelhas) e o tronco levemente inclinado.',
        'Desça dobrando os cotovelos de forma controlada até cerca de 90°.',
        'Empurre as barras para baixo estendendo os braços com firmeza.'
      ]
    };
  }

  // 12. Agachamento Hack Machine / Leg Press
  if (lower.includes('leg press')) {
    return {
      gifUrl: '/exercises/leg2_2.gif',
      primaryMuscle: 'Quadríceps & Glúteos',
      steps: [
        'Mantenha o quadril e a lombar totalmente colados no banco.',
        'Desça a plataforma flexionando os joelhos em direção ao peito.',
        'Empurre pelos calcanhares sem travar os joelhos no topo.'
      ]
    };
  }

  if (exerciseId === 'leg1_1' || lower.includes('hack') || lower.includes('agachamento')) {
    return {
      gifUrl: '/exercises/leg1_1.gif',
      primaryMuscle: 'Quadríceps & Glúteos',
      steps: [
        'Apoie totalmente a coluna e os ombros no suporte do Hack.',
        'Desça flexionando os joelhos na direção da ponta dos pés até ~90°.',
        'Suba empurrando firme pelo meio do pé e calcanhar.'
      ]
    };
  }

  // 13. Cadeira Extensora
  if (exerciseId === 'leg1_2' || lower.includes('extensora')) {
    return {
      gifUrl: '/exercises/leg1_2.gif',
      primaryMuscle: 'Quadríceps',
      steps: [
        'Alinhe o joelho com o eixo da máquina e segure firme nos apoios.',
        'Estenda totalmente os joelhos contraindo forte o quadríceps no topo.',
        'Desça controlando o peso na fase excêntrica.'
      ]
    };
  }

  // 14. Cadeira Flexora / Mesa Flexora
  if (exerciseId === 'leg2_3' || lower.includes('mesa flexora')) {
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

  if (exerciseId === 'leg1_3' || lower.includes('flexora')) {
    return {
      gifUrl: '/exercises/leg1_3.gif',
      primaryMuscle: 'Posterior de Coxa',
      steps: [
        'Encoste bem a lombar e ajuste a trava sobre as coxas.',
        'Puxe o rolo para baixo e para trás flexionando ao máximo os joelhos.',
        'Retorne de forma controlada sem soltar o peso.'
      ]
    };
  }

  // 15. Stiff / RDL
  if (exerciseId === 'leg2_1' || lower.includes('stiff') || lower.includes('rdl') || lower.includes('terra')) {
    return {
      gifUrl: '/exercises/leg2_1.gif',
      primaryMuscle: 'Posterior de Coxa & Glúteo',
      steps: [
        'Destrave levemente os joelhos e mantenha a coluna 100% reta.',
        'Desça a barra rente às pernas projetando o quadril para trás.',
        'Suba contraindo glúteos e posterior assim que sentir o alongamento máximo.'
      ]
    };
  }

  // 16. Panturrilha Sentado vs Em Pé
  if (exerciseId === 'leg2_4' || lower.includes('sentado')) {
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

  return {
    gifUrl: '/exercises/leg1_4.gif',
    primaryMuscle: 'Panturrilhas (Gastrocnêmio)',
    steps: [
      'Mantenha os joelhos estendidos (sem travar) e o tronco alinhado.',
      'Desça o calcanhar o máximo possível alongando a panturrilha.',
      'Suba o máximo que conseguir na ponta dos pés contraindo no topo.'
    ]
  };
}

export const ExerciseExecutionModal: React.FC<ExerciseExecutionModalProps> = ({
  isOpen,
  onClose,
  exerciseId,
  exerciseName,
  muscleGroup,
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
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Limpo */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <span className="inline-block text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 mb-1">
              {muscleGroup} • {guide.primaryMuscle}
            </span>
            <h3 className="text-base font-black text-slate-900 leading-snug">
              {exerciseName}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {gripOrForm}
            </p>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* GIF Real Animado do Exercício */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-3 flex items-center justify-center overflow-hidden shadow-2xs">
          <img
            src={guide.gifUrl}
            alt={`Execução de ${exerciseName}`}
            className="w-48 h-48 object-contain select-none"
            loading="eager"
          />
        </div>

        {/* 3 Passos Diretos e Limpos */}
        <div className="mt-4 space-y-2">
          {guide.steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 border border-blue-100">
                {idx + 1}
              </span>
              <span className="font-medium">{step}</span>
            </div>
          ))}
        </div>

        {/* Botão Fechar */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="mt-4 w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs active:scale-[0.98] transition-all cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </div>,
    document.body
  );
};
