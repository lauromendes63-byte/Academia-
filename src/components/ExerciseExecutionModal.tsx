import React, { useEffect, useState } from 'react';
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

type MotionPattern =
  | 'vertical_pull'
  | 'horizontal_row'
  | 'rear_delt_fly'
  | 'bayesian_curl'
  | 'preacher_curl'
  | 'incline_press'
  | 'flat_press'
  | 'lateral_raise'
  | 'triceps_pushdown'
  | 'parallel_dip'
  | 'squat_hack'
  | 'leg_extension'
  | 'leg_curl'
  | 'hip_hinge'
  | 'calf_raise';

interface ExerciseGuideData {
  pattern: MotionPattern;
  primaryMuscle: string;
  concentricLabel: string;
  eccentricLabel: string;
  steps: [string, string, string];
}

function getExerciseGuide(exerciseId: string, exerciseName: string): ExerciseGuideData {
  const lower = exerciseName.toLowerCase();

  if (exerciseId === 'pull_1' || lower.includes('barra fixa') || lower.includes('puxada')) {
    return {
      pattern: 'vertical_pull',
      primaryMuscle: 'Grande Dorsal & Redondo Maior',
      concentricLabel: 'Puxada até o peito (1s)',
      eccentricLabel: 'Subida alongando a dorsal (2s)',
      steps: [
        'Deprima as escápulas (abaixe os ombros) antes de dobrar os cotovelos.',
        'Puxe conduzindo os cotovelos em direção às costelas mantendo o peito aberto.',
        'Retorne controlando o peso até alongar totalmente a dorsal no topo.'
      ]
    };
  }

  if (exerciseId === 'pull_2' || lower.includes('remada baixa') || lower.includes('triângulo')) {
    return {
      pattern: 'horizontal_row',
      primaryMuscle: 'Meio das Costas & Dorsal',
      concentricLabel: 'Puxada ao abdômen (1s)',
      eccentricLabel: 'Retorno controlado (2s)',
      steps: [
        'Mantenha a coluna neutra e o tronco firme em 90° com o banco.',
        'Puxe o puxador até a linha do umbigo fechando as escápulas atrás.',
        'Estenda os braços à frente deixando as escápulas abrirem sem curvar a lombar.'
      ]
    };
  }

  if (exerciseId === 'pull_3' || lower.includes('remada articulada') || lower.includes('cavalinho')) {
    return {
      pattern: 'horizontal_row',
      primaryMuscle: 'Dorsal & Trapézio Médio',
      concentricLabel: 'Remada esmagando as costas (1s)',
      eccentricLabel: 'Retorno controlado (2s)',
      steps: [
        'Apoie o peitoral firmemente no suporte da máquina.',
        'Traga os cotovelos para trás passando da linha do tronco.',
        'Volte devagar mantendo a tensão contínua nas costas.'
      ]
    };
  }

  if (exerciseId === 'pull_4' || lower.includes('crucifixo inverso') || lower.includes('face pull')) {
    return {
      pattern: 'rear_delt_fly',
      primaryMuscle: 'Deltoide Posterior',
      concentricLabel: 'Abertura na linha dos ombros (1s)',
      eccentricLabel: 'Retorno controlado (2s)',
      steps: [
        'Ajuste o banco para que as mãos fiquem exatamente na altura dos ombros.',
        'Abra os braços para trás mantendo os cotovelos levemente flexionados.',
        'Retorne sem deixar as placas de peso baterem no final.'
      ]
    };
  }

  if (exerciseId === 'pull_5' || lower.includes('bayesiana') || lower.includes('baiana') || lower.includes('inclinado')) {
    return {
      pattern: 'bayesian_curl',
      primaryMuscle: 'Bíceps (Cabeça Longa)',
      concentricLabel: 'Flexão do cotovelo à frente (1s)',
      eccentricLabel: 'Alongamento atrás do tronco (2s)',
      steps: [
        'Dê um passo à frente da polia baixa deixando o braço alongado atrás do corpo.',
        'Trave o cotovelo fixo e flexione o antebraço para frente contraindo o bíceps.',
        'Retorne devagar sentindo o alongamento máximo sem mover o ombro.'
      ]
    };
  }

  if (exerciseId === 'pull_6' || lower.includes('scott') || lower.includes('martelo')) {
    return {
      pattern: 'preacher_curl',
      primaryMuscle: 'Bíceps Braquial & Braquiorradial',
      concentricLabel: 'Subida contraindo o bíceps (1s)',
      eccentricLabel: 'Descida controlada no apoio (2s)',
      steps: [
        'Apoie toda a parte de trás dos braços no banco Scott sem deixar folga.',
        'Suba o peso contraindo forte o bíceps sem desencostar os cotovelos.',
        'Desça até quase estender o braço mantendo tensão na parte baixa.'
      ]
    };
  }

  if (exerciseId === 'push_1' || (lower.includes('supino') && lower.includes('inclinado'))) {
    return {
      pattern: 'incline_press',
      primaryMuscle: 'Peitoral Superior (Clavicular)',
      concentricLabel: 'Empurrar acima do peito (1s)',
      eccentricLabel: 'Descida controlada (2s)',
      steps: [
        'Banco entre 30° e 45° com escápulas fechadas e cotovelos a ~45° do tronco.',
        'Desça os halteres controladamente até a linha da clavícula.',
        'Empurre para cima alinhando os pesos sobre a parte alta do peito.'
      ]
    };
  }

  if (exerciseId === 'push_2' || lower.includes('supino máquina') || lower.includes('supino reto')) {
    return {
      pattern: 'flat_press',
      primaryMuscle: 'Peitoral Maior',
      concentricLabel: 'Empurrar contraindo o peito (1s)',
      eccentricLabel: 'Retorno alongando o peitoral (2s)',
      steps: [
        'Mantenha as costas coladas no encosto e os ombros baixos.',
        'Empurre as manoplas até quase estender os cotovelos contraindo o peitoral.',
        'Retorne controlando a fase negativa sem soltar o peso.'
      ]
    };
  }

  if (exerciseId === 'push_3' || lower.includes('elevação lateral')) {
    return {
      pattern: 'lateral_raise',
      primaryMuscle: 'Deltoide Lateral',
      concentricLabel: 'Elevação até a linha do ombro (1s)',
      eccentricLabel: 'Descida resistindo ao peso (2s)',
      steps: [
        'Incline-se sutilmente à frente e eleve os braços no plano da escápula.',
        'Suba guiando pelos cotovelos até a altura dos ombros, sem encolher o trapézio.',
        'Desça devagar parando um pouco antes de encostar na coxa.'
      ]
    };
  }

  if (exerciseId === 'push_4' || lower.includes('tríceps corda') || lower.includes('testa')) {
    return {
      pattern: 'triceps_pushdown',
      primaryMuscle: 'Tríceps Braquial',
      concentricLabel: 'Extensão total dos cotovelos (1s)',
      eccentricLabel: 'Subida até 90° (2s)',
      steps: [
        'Cole os cotovelos ao lado das costelas e mantenha-os fixos.',
        'Estenda o antebraço para baixo abrindo a corda no final do movimento.',
        'Retorne controladamente até cerca de 90° sem mover os ombros.'
      ]
    };
  }

  if (exerciseId === 'push_5' || lower.includes('mergulho') || lower.includes('paralelas')) {
    return {
      pattern: 'parallel_dip',
      primaryMuscle: 'Peitoral Inferior & Tríceps',
      concentricLabel: 'Empurrar até estender (1s)',
      eccentricLabel: 'Descida controlada até 90° (2s)',
      steps: [
        'Mantenha os ombros baixos (longe das orelhas) e o tronco levemente inclinado.',
        'Desça dobrando os cotovelos até formarem 90°.',
        'Empurre as barras para baixo estendendo os braços com firmeza.'
      ]
    };
  }

  if (exerciseId === 'leg1_1' || exerciseId === 'leg2_2' || lower.includes('hack') || lower.includes('leg press') || lower.includes('agachamento')) {
    return {
      pattern: 'squat_hack',
      primaryMuscle: 'Quadríceps & Glúteos',
      concentricLabel: 'Subida empurrando pelo calcanhar (1s)',
      eccentricLabel: 'Descida profunda controlada (2s)',
      steps: [
        'Mantenha lombar e quadril totalmente apoiados no encosto durante toda a série.',
        'Desça flexionando os joelhos na direção da ponta dos pés até ~90°.',
        'Empurre a plataforma sem travar os joelhos de forma brusca no topo.'
      ]
    };
  }

  if (exerciseId === 'leg1_2' || lower.includes('extensora')) {
    return {
      pattern: 'leg_extension',
      primaryMuscle: 'Quadríceps (Reto Femoral & Vastos)',
      concentricLabel: 'Extensão completa + 1s no topo',
      eccentricLabel: 'Descida controlada (2s)',
      steps: [
        'Alinhe o eixo da cadeira com a linha do seu joelho e segure firme nas alças.',
        'Chute para cima até estender totalmente os joelhos e segure 1 segundo no topo.',
        'Desça controlando o peso sem deixá-lo despencar.'
      ]
    };
  }

  if (exerciseId === 'leg1_3' || exerciseId === 'leg2_3' || lower.includes('flexora')) {
    return {
      pattern: 'leg_curl',
      primaryMuscle: 'Posterior de Coxa (Isquiotibiais)',
      concentricLabel: 'Flexão máxima dos joelhos (1s)',
      eccentricLabel: 'Retorno lento alongando (2s)',
      steps: [
        'Mantenha o quadril pressionado contra o banco sem levantar a lombar.',
        'Flexione os joelhos puxando o rolo o máximo possível para trás.',
        'Volte devagar controlando toda a fase excêntrica.'
      ]
    };
  }

  if (exerciseId === 'leg2_1' || lower.includes('stiff') || lower.includes('terra') || lower.includes('rdl')) {
    return {
      pattern: 'hip_hinge',
      primaryMuscle: 'Posterior de Coxa & Glúteo',
      concentricLabel: 'Subida estendendo o quadril (1s)',
      eccentricLabel: 'Descida projetando o quadril atrás (2s)',
      steps: [
        'Destrave levemente os joelhos e mantenha a coluna 100% reta.',
        'Desça deslizando a barra/halteres rente à coxa enquanto joga o quadril para trás.',
        'Suba contraindo glúteos e posterior assim que sentir o alongamento máximo.'
      ]
    };
  }

  return {
    pattern: 'calf_raise',
    primaryMuscle: 'Panturrilhas (Gastrocnêmio & Sóleo)',
    concentricLabel: 'Ponta dos pés no topo + 1s',
    eccentricLabel: 'Descida alongando o calcanhar (2s)',
    steps: [
      'Apoie a parte frontal do pé na plataforma deixando o calcanhar livre.',
      'Desça o calcanhar o máximo possível alongando bem a panturrilha.',
      'Suba o máximo que conseguir na ponta dos pés e segure 1 segundo no topo.'
    ]
  };
}

/**
 * Renderiza uma animação biomecânica fluida a 60fps com boneco articulado + equipamento.
 * `t` varia suavemente entre 0 (alongado/início) e 1 (contração máxima).
 */
const BiomechanicalCanvas: React.FC<{
  pattern: MotionPattern;
  concentricLabel: string;
  eccentricLabel: string;
}> = ({ pattern, concentricLabel, eccentricLabel }) => {
  const [phase, setPhase] = useState(0); // 0 -> 1 -> 0
  const [isConcentric, setIsConcentric] = useState(true);

  useEffect(() => {
    let rafId: number;
    const startTime = performance.now();
    // Ciclo completo de 3.2s: 1.1s concêntrica, 0.35s pico, 1.45s excêntrica, 0.3s base
    const cycleMs = 3200;

    const tick = (now: number) => {
      const elapsed = (now - startTime) % cycleMs;
      let t = 0;
      let conc = true;

      if (elapsed < 1100) {
        // Subida / Contração (easeInOutCubic)
        const p = elapsed / 1100;
        t = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        conc = true;
      } else if (elapsed < 1450) {
        // Pico de contração isométrica
        t = 1;
        conc = true;
      } else if (elapsed < 2900) {
        // Descida controlada (excêntrica)
        const p = (elapsed - 1450) / 1450;
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        t = 1 - eased;
        conc = false;
      } else {
        t = 0;
        conc = false;
      }

      setPhase(t);
      setIsConcentric(conc);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const lerp = (a: number, b: number) => a + (b - a) * phase;

  return (
    <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      {/* Indicador de fase ao vivo */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950/70 border-b border-slate-800/80 text-[11px] font-bold">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full transition-colors duration-200 ${
              isConcentric ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
            }`}
          />
          <span className="text-white">
            {isConcentric ? concentricLabel : eccentricLabel}
          </span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {Math.round(phase * 100)}%
        </span>
      </div>

      {/* Área Gráfica Biomecânica Ampla */}
      <div className="h-48 w-full flex items-center justify-center relative px-4">
        <svg viewBox="0 0 300 180" className="w-full h-full">
          {/* Grade de referência */}
          <line x1="20" y1="158" x2="280" y2="158" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="30" x2="280" y2="30" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="20" y1="95" x2="280" y2="95" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />

          {/* 1. PUXADA VERTICAL / BARRA FIXA */}
          {pattern === 'vertical_pull' && (() => {
            const barY = lerp(38, 86);
            const elbowXLeft = lerp(112, 102);
            const elbowXRight = lerp(188, 198);
            const elbowY = lerp(60, 108);
            const handXLeft = 104;
            const handXRight = 196;

            return (
              <g>
                {/* Estrutura da polia superior */}
                <line x1="150" y1="10" x2="150" y2={barY} stroke="#64748b" strokeWidth="2.5" strokeDasharray="3 2" />
                {/* Banco e pernas fixas */}
                <rect x="132" y="138" width="36" height="8" rx="4" fill="#475569" />
                <line x1="150" y1="146" x2="150" y2="158" stroke="#475569" strokeWidth="6" />
                {/* Tronco + Dorsal ativada */}
                <path
                  d="M128 88 L172 88 L163 136 L137 136 Z"
                  fill="#3b82f6"
                  fillOpacity={lerp(0.25, 0.85)}
                  stroke="#60a5fa"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                {/* Cabeça */}
                <circle cx="150" cy="70" r="11" fill="#e2e8f0" />
                {/* Braço Esquerdo (Ombro -> Cotovelo -> Mão) */}
                <polyline
                  points={`128,90 ${elbowXLeft},${elbowY} ${handXLeft},${barY}`}
                  fill="none"
                  stroke="#f8fafc"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Braço Direito */}
                <polyline
                  points={`172,90 ${elbowXRight},${elbowY} ${handXRight},${barY}`}
                  fill="none"
                  stroke="#f8fafc"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Barra */}
                <line x1="88" y1={barY} x2="212" y2={barY} stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
              </g>
            );
          })()}

          {/* 2. REMADA HORIZONTAL */}
          {(pattern === 'horizontal_row' || pattern === 'rear_delt_fly') && (() => {
            const handX = lerp(92, 162);
            const elbowX = lerp(132, 196);
            const elbowY = pattern === 'rear_delt_fly' ? lerp(80, 74) : lerp(88, 96);
            const handY = pattern === 'rear_delt_fly' ? 78 : 88;
            const weightY = lerp(125, 65);

            return (
              <g>
                {/* Coluna da polia à esquerda */}
                <rect x="44" y="30" width="12" height="128" rx="4" fill="#334155" />
                {/* Bloco de peso subindo e descendo */}
                <rect x="40" y={weightY} width="20" height="16" rx="3" fill="#38bdf8" />
                {/* Cabo */}
                <line x1="56" y1={handY} x2={handX} y2={handY} stroke="#94a3b8" strokeWidth="2.5" />
                {/* Banco */}
                <line x1="150" y1="132" x2="225" y2="132" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
                {/* Pernas apoiadas */}
                <polyline points="175,130 120,122 72,145" fill="none" stroke="#64748b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                {/* Tronco firme em 90° */}
                <line x1="175" y1="130" x2="175" y2="74" stroke="#60a5fa" strokeWidth="14" strokeLinecap="round" />
                {/* Costas / Deltoide posterior brilhando */}
                <circle cx="180" cy="86" r={lerp(7, 12)} fill="#3b82f6" fillOpacity={lerp(0.3, 0.9)} />
                {/* Cabeça */}
                <circle cx="175" cy="54" r="11" fill="#e2e8f0" />
                {/* Braço puxando */}
                <polyline
                  points={`175,78 ${elbowX},${elbowY} ${handX},${handY}`}
                  fill="none"
                  stroke="#f8fafc"
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx={handX} cy={handY} r="4.5" fill="#38bdf8" />
              </g>
            );
          })()}

          {/* 3. ROSCA BAYESIANA / ROSCA SCOTT */}
          {(pattern === 'bayesian_curl' || pattern === 'preacher_curl') && (() => {
            const shoulderX = 160;
            const shoulderY = 72;
            const elbowX = pattern === 'bayesian_curl' ? 148 : 174;
            const elbowY = 108;
            // Ângulo do antebraço: de estendido para flexionado
            const angle = pattern === 'bayesian_curl'
              ? lerp(125, 25) * (Math.PI / 180)
              : lerp(70, -35) * (Math.PI / 180);
            const handX = elbowX + Math.cos(angle) * 38;
            const handY = elbowY + Math.sin(angle) * 38;

            return (
              <g>
                {/* Polia baixa atrás (se bayesiana) ou Banco Scott */}
                {pattern === 'bayesian_curl' ? (
                  <>
                    <rect x="65" y="40" width="10" height="118" rx="3" fill="#334155" />
                    <line x1="75" y1="145" x2={handX} y2={handY} stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="3 2" />
                  </>
                ) : (
                  <path d="M165 158 L165 98 L195 118" fill="none" stroke="#475569" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                )}
                {/* Pernas e Tronco */}
                <line x1="160" y1="118" x2="152" y2="156" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
                <line x1="160" y1="118" x2="172" y2="156" stroke="#475569" strokeWidth="8" strokeLinecap="round" />
                <line x1="160" y1="72" x2="160" y2="118" stroke="#64748b" strokeWidth="14" strokeLinecap="round" />
                {/* Cabeça */}
                <circle cx="162" cy="52" r="11" fill="#e2e8f0" />
                {/* Braço (Úmero fixo) + Bíceps ativado */}
                <line x1={shoulderX} y1={shoulderY} x2={elbowX} y2={elbowY} stroke="#94a3b8" strokeWidth="7" strokeLinecap="round" />
                <circle
                  cx={(shoulderX + elbowX) / 2 + 4}
                  cy={(shoulderY + elbowY) / 2}
                  r={lerp(5, 9.5)}
                  fill="#3b82f6"
                  fillOpacity={lerp(0.35, 0.95)}
                />
                {/* Antebraço se movendo */}
                <line x1={elbowX} y1={elbowY} x2={handX} y2={handY} stroke="#f8fafc" strokeWidth="6.5" strokeLinecap="round" />
                {/* Halter / Manopla */}
                <circle cx={handX} cy={handY} r="6" fill="#38bdf8" />
              </g>
            );
          })()}

          {/* 4. SUPINO INCLINADO / RETO */}
          {(pattern === 'incline_press' || pattern === 'flat_press') && (() => {
            const handY = lerp(92, 42);
            const handX = lerp(142, 152);
            const elbowX = lerp(136, 147);
            const elbowY = lerp(114, 68);

            return (
              <g>
                {/* Banco inclinado ou reto */}
                {pattern === 'incline_press' ? (
                  <polyline points="95,68 158,125 205,125" fill="none" stroke="#475569" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <line x1="90" y1="118" x2="205" y2="118" stroke="#475569" strokeWidth="7" strokeLinecap="round" />
                )}
                <line x1="120" y1="118" x2="120" y2="158" stroke="#334155" strokeWidth="6" />
                <line x1="190" y1="125" x2="190" y2="158" stroke="#334155" strokeWidth="6" />
                {/* Tronco e Peitoral ativado */}
                <line
                  x1={pattern === 'incline_press' ? 118 : 112}
                  y1={pattern === 'incline_press' ? 84 : 108}
                  x2="165"
                  y2="116"
                  stroke="#60a5fa"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <circle
                  cx="136"
                  cy={pattern === 'incline_press' ? 92 : 104}
                  r={lerp(6, 11)}
                  fill="#3b82f6"
                  fillOpacity={lerp(0.3, 0.9)}
                />
                {/* Cabeça */}
                <circle
                  cx={pattern === 'incline_press' ? 104 : 96}
                  cy={pattern === 'incline_press' ? 72 : 104}
                  r="10"
                  fill="#e2e8f0"
                />
                {/* Braço empurrando */}
                <polyline
                  points={`132,${pattern === 'incline_press' ? 92 : 106} ${elbowX},${elbowY} ${handX},${handY}`}
                  fill="none"
                  stroke="#f8fafc"
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Halter no topo */}
                <line x1={handX - 12} y1={handY} x2={handX + 12} y2={handY} stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
              </g>
            );
          })()}

          {/* 5. ELEVAÇÃO LATERAL */}
          {pattern === 'lateral_raise' && (() => {
            const angle = lerp(75, 2) * (Math.PI / 180);
            const leftHandX = 128 - Math.cos(angle) * 48;
            const leftHandY = 82 + Math.sin(angle) * 48;
            const rightHandX = 172 + Math.cos(angle) * 48;
            const rightHandY = 82 + Math.sin(angle) * 48;

            return (
              <g>
                {/* Tronco e Pernas */}
                <line x1="142" y1="122" x2="138" y2="156" stroke="#64748b" strokeWidth="7" strokeLinecap="round" />
                <line x1="158" y1="122" x2="162" y2="156" stroke="#64748b" strokeWidth="7" strokeLinecap="round" />
                <path d="M132 80 L168 80 L160 124 L140 124 Z" fill="#475569" />
                {/* Cabeça */}
                <circle cx="150" cy="60" r="11" fill="#e2e8f0" />
                {/* Ombros (Deltoides Laterais) em destaque */}
                <circle cx="128" cy="82" r={lerp(6, 10)} fill="#3b82f6" fillOpacity={lerp(0.35, 0.95)} />
                <circle cx="172" cy="82" r={lerp(6, 10)} fill="#3b82f6" fillOpacity={lerp(0.35, 0.95)} />
                {/* Braços subindo lateralmente */}
                <line x1="128" y1="82" x2={leftHandX} y2={leftHandY} stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" />
                <line x1="172" y1="82" x2={rightHandX} y2={rightHandY} stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" />
                {/* Halteres */}
                <circle cx={leftHandX} cy={leftHandY} r="5.5" fill="#38bdf8" />
                <circle cx={rightHandX} cy={rightHandY} r="5.5" fill="#38bdf8" />
              </g>
            );
          })()}

          {/* 6. TRÍCEPS CORDA / MERGULHO */}
          {(pattern === 'triceps_pushdown' || pattern === 'parallel_dip') && (() => {
            if (pattern === 'parallel_dip') {
              const bodyY = lerp(52, 24);
              const elbowY = lerp(68, 82);
              return (
                <g>
                  {/* Barras paralelas fixas */}
                  <line x1="105" y1="92" x2="195" y2="92" stroke="#475569" strokeWidth="5" strokeLinecap="round" />
                  <line x1="115" y1="92" x2="115" y2="158" stroke="#334155" strokeWidth="5" />
                  <line x1="185" y1="92" x2="185" y2="158" stroke="#334155" strokeWidth="5" />
                  {/* Cabeça e Tronco subindo e descendo */}
                  <circle cx="150" cy={bodyY} r="10" fill="#e2e8f0" />
                  <line x1="150" y1={bodyY + 12} x2="146" y2={bodyY + 56} stroke="#3b82f6" strokeWidth="14" strokeLinecap="round" />
                  <line x1="146" y1={bodyY + 56} x2="138" y2={bodyY + 92} stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
                  {/* Braços empurrando nas paralelas */}
                  <polyline
                    points={`138,${bodyY + 18} 122,${elbowY} 130,92`}
                    fill="none"
                    stroke="#f8fafc"
                    strokeWidth="6.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={`162,${bodyY + 18} 178,${elbowY} 170,92`}
                    fill="none"
                    stroke="#f8fafc"
                    strokeWidth="6.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            }

            // Tríceps Polia
            const elbowX = 152;
            const elbowY = 98;
            const angle = lerp(-15, 78) * (Math.PI / 180);
            const handX = elbowX - Math.cos(angle) * 36;
            const handY = elbowY + Math.sin(angle) * 36;

            return (
              <g>
                {/* Polia alta à esquerda */}
                <rect x="72" y="24" width="10" height="134" rx="3" fill="#334155" />
                <line x1="82" y1="30" x2={handX} y2={handY} stroke="#94a3b8" strokeWidth="2.5" />
                {/* Corpo */}
                <line x1="162" y1="118" x2="158" y2="156" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
                <line x1="162" y1="70" x2="162" y2="118" stroke="#475569" strokeWidth="14" strokeLinecap="round" />
                <circle cx="160" cy="52" r="11" fill="#e2e8f0" />
                {/* Braço fixo + Tríceps brilhando */}
                <line x1="158" y1="72" x2={elbowX} y2={elbowY} stroke="#94a3b8" strokeWidth="7" strokeLinecap="round" />
                <circle cx="158" cy="84" r={lerp(5, 9)} fill="#3b82f6" fillOpacity={lerp(0.3, 0.95)} />
                {/* Antebraço estendendo para baixo */}
                <line x1={elbowX} y1={elbowY} x2={handX} y2={handY} stroke="#f8fafc" strokeWidth="6.5" strokeLinecap="round" />
                <circle cx={handX} cy={handY} r="5" fill="#38bdf8" />
              </g>
            );
          })()}

          {/* 7. HACK SQUAT / LEG PRESS / AGACHAMENTO */}
          {pattern === 'squat_hack' && (() => {
            const hipY = lerp(118, 82);
            const shoulderY = hipY - 38;
            const kneeX = lerp(116, 138);
            const kneeY = lerp(96, 114);

            return (
              <g>
                {/* Trilho inclinado do Hack */}
                <line x1="130" y1="154" x2="185" y2="36" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
                {/* Cabeça e Tronco apoiados */}
                <circle cx="162" cy={shoulderY - 14} r="10" fill="#e2e8f0" />
                <line x1="162" y1={shoulderY} x2="152" y2={hipY} stroke="#475569" strokeWidth="14" strokeLinecap="round" />
                {/* Coxa (Quadríceps ativado) */}
                <line x1="152" y1={hipY} x2={kneeX} y2={kneeY} stroke="#3b82f6" strokeWidth="11" strokeLinecap="round" />
                {/* Panturrilha e Pé firme na plataforma */}
                <line x1={kneeX} y1={kneeY} x2="122" y2="148" stroke="#f8fafc" strokeWidth="8" strokeLinecap="round" />
                <line x1="102" y1="152" x2="140" y2="146" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
              </g>
            );
          })()}

          {/* 8. CADEIRA EXTENSORA / FLEXORA */}
          {(pattern === 'leg_extension' || pattern === 'leg_curl') && (() => {
            const kneeX = 132;
            const kneeY = 104;
            // Extensora: perna sobe até horizontal (0 rad); Flexora: perna dobra para trás
            const angle = pattern === 'leg_extension'
              ? lerp(80, 4) * (Math.PI / 180)
              : lerp(8, 82) * (Math.PI / 180);
            const footX = kneeX - Math.cos(angle) * 44;
            const footY = kneeY + Math.sin(angle) * 44;

            return (
              <g>
                {/* Assento e Encosto da Cadeira */}
                <polyline points="130,108 182,108 192,56" fill="none" stroke="#475569" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="162" y1="108" x2="162" y2="158" stroke="#334155" strokeWidth="6" />
                {/* Tronco e Cabeça */}
                <circle cx="182" cy="46" r="10" fill="#e2e8f0" />
                <line x1="182" y1="62" x2="174" y2="102" stroke="#64748b" strokeWidth="13" strokeLinecap="round" />
                {/* Coxa apoiada com músculo alvo brilhando */}
                <line x1="174" y1="104" x2={kneeX} y2={kneeY} stroke="#3b82f6" strokeWidth="12" strokeLinecap="round" />
                {/* Perna articulando */}
                <line x1={kneeX} y1={kneeY} x2={footX} y2={footY} stroke="#f8fafc" strokeWidth="7.5" strokeLinecap="round" />
                {/* Rolo estofado no tornozelo */}
                <circle cx={footX} cy={footY} r="6.5" fill="#38bdf8" />
              </g>
            );
          })()}

          {/* 9. STIFF / RDL (DOBRADIÇA DE QUADRIL) */}
          {pattern === 'hip_hinge' && (() => {
            const hipX = lerp(176, 152);
            const hipY = 106;
            const shoulderX = lerp(122, 152);
            const shoulderY = lerp(94, 62);
            const barX = lerp(128, 146);
            const barY = lerp(132, 102);

            return (
              <g>
                {/* Pernas semirrígidas */}
                <line x1="150" y1="154" x2="154" y2="128" stroke="#64748b" strokeWidth="8" strokeLinecap="round" />
                <line x1="154" y1="128" x2={hipX} y2={hipY} stroke="#3b82f6" strokeWidth="11" strokeLinecap="round" />
                {/* Tronco reto inclinando pelo quadril */}
                <line x1={hipX} y1={hipY} x2={shoulderX} y2={shoulderY} stroke="#e2e8f0" strokeWidth="13" strokeLinecap="round" />
                <circle cx={shoulderX - 8} cy={shoulderY - 12} r="10" fill="#e2e8f0" />
                {/* Braço segurando a barra rente à perna */}
                <line x1={shoulderX} y1={shoulderY} x2={barX} y2={barY} stroke="#94a3b8" strokeWidth="5.5" strokeLinecap="round" />
                <circle cx={barX} cy={barY} r="9" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
              </g>
            );
          })()}

          {/* 10. PANTURRILHA */}
          {pattern === 'calf_raise' && (() => {
            const heelY = lerp(148, 124);
            const bodyOffset = lerp(0, -18);

            return (
              <g>
                {/* Degrau / Step */}
                <rect x="112" y="144" width="42" height="14" rx="3" fill="#475569" />
                {/* Perna e Panturrilha contraindo */}
                <line x1="150" y1={52 + bodyOffset} x2="150" y2={98 + bodyOffset} stroke="#64748b" strokeWidth="14" strokeLinecap="round" />
                <circle cx="150" cy={34 + bodyOffset} r="10" fill="#e2e8f0" />
                <line x1="150" y1={98 + bodyOffset} x2="154" y2={heelY} stroke="#f8fafc" strokeWidth="8.5" strokeLinecap="round" />
                {/* Gastrocnêmio brilhando */}
                <circle cx="156" cy={112 + bodyOffset} r={lerp(5, 9.5)} fill="#3b82f6" fillOpacity={lerp(0.35, 0.95)} />
                {/* Pé articulando na ponta */}
                <line x1="154" y1={heelY} x2="132" y2="144" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
};

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
        {/* Header Limpo e Direto */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
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
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center shrink-0 active:scale-90 transition-all"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Animação Biomecânica 60fps */}
        <BiomechanicalCanvas
          pattern={guide.pattern}
          concentricLabel={guide.concentricLabel}
          eccentricLabel={guide.eccentricLabel}
        />

        {/* 3 Passos Enxutos sem Poluição Visual */}
        <div className="mt-4 space-y-2">
          {guide.steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
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
