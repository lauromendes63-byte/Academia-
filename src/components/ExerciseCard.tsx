import React, { useState } from 'react';
import type {
  ExerciseDefinition,
  ExerciseLog,
  SetEntry,
  ExercisePerformanceSummary
} from '../types';
import { parseRepRange } from '../db/db';
import { getExerciseGuide } from '../utils/exerciseGuide';
import { SubstituteModal } from './SubstituteModal';
import { ExerciseExecutionModal } from './ExerciseExecutionModal';
import { playSetCompleteSound, triggerHaptic } from '../utils/audio';
import {
  Check,
  AlertTriangle,
  History,
  Minus,
  Plus,
  ArrowRightLeft,
  Dumbbell,
  PlayCircle,
  Trophy,
  Flame,
  Target,
  Lock
} from 'lucide-react';

interface ExerciseCardProps {
  exercise: ExerciseDefinition;
  log: ExerciseLog;
  lastPerformance?: ExercisePerformanceSummary | null;
  onUpdateLog: (updatedLog: ExerciseLog) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = React.memo(({
  exercise,
  log,
  lastPerformance,
  onUpdateLog
}) => {
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isExecModalOpen, setIsExecModalOpen] = useState(false);

  const isAborted = log.abortedForFatigue;
  const displayName =
    log.activeExerciseName.includes('Baiana') || exercise.name.includes('Baiana')
      ? 'Rosca Bayesiana na Polia'
      : log.activeExerciseName;

  // Ilustração anatômica correspondente ao exercício ativo (ou substituto)
  const guide = getExerciseGuide(exercise.id, displayName);

  // Lógica interna invertida para o Graviton (sem poluição visual)
  const isGraviton =
    (!log.isSubstituted && exercise.isAssisted) ||
    displayName.toLowerCase().includes('graviton');

  const { minReps, maxReps } = parseRepRange(exercise.targetReps);
  const isUnilateralReps = exercise.targetReps.toLowerCase().includes('lado');

  const completedCount = log.sets.filter((s) => s.completed).length;
  const allSetsDone = !isAborted && completedCount === log.sets.length && log.sets.length > 0;

  // Primeira série pendente (não concluída) recebe os ajustes da barra de Carga
  const firstPendingSet = log.sets.find((s) => !s.completed);
  const currentWeight =
    firstPendingSet?.weightKg ??
    log.sets[log.sets.length - 1]?.weightKg ??
    lastPerformance?.weightKg ??
    exercise.defaultWeightKg;

  // Carga principal de trabalho da sessão (maior carga nos exercícios normais, menor contrapeso no Graviton)
  const validWeightSets = log.sets.filter((s) => s.weightKg > 0);
  const workingWeight =
    validWeightSets.length > 0
      ? isGraviton
        ? Math.min(...validWeightSets.map((s) => s.weightKg))
        : Math.max(...validWeightSets.map((s) => s.weightKg))
      : currentWeight;

  // Detecta se houve dropset / mudança de carga entre as séries hoje
  const hasTodayWeightVariation =
    new Set(log.sets.map((s) => s.weightKg)).size > 1;
  const hasCompletedWeightDrop =
    new Set(log.sets.filter((s) => s.completed).map((s) => s.weightKg)).size > 1;

  // Check if current working weight beats historical Personal Record (PR)
  const referenceBest = lastPerformance?.bestWeightKg ?? lastPerformance?.weightKg;
  const isNewPR =
    !isAborted &&
    referenceBest !== undefined &&
    workingWeight > 0 &&
    (isGraviton ? workingWeight < referenceBest : workingWeight > referenceBest);

  // Check if all sets in today's session are completed at the same workingWeight AND at/above maxReps
  const isTodayPerfectAtTarget =
    allSetsDone &&
    workingWeight > 0 &&
    log.sets.every((s) => s.reps >= maxReps && s.weightKg === workingWeight);

  // Historical streak at the current working weight (0, 1, 2, or 3+ workouts at rep ceiling)
  const isSameWeightAsLast =
    lastPerformance !== null &&
    lastPerformance !== undefined &&
    workingWeight === lastPerformance.weightKg;

  const baseStreak = isSameWeightAsLast ? Math.min(3, lastPerformance.perfectStreak) : 0;
  const liveStreak = Math.min(3, isTodayPerfectAtTarget ? baseStreak + 1 : baseStreak);

  // Progresso da sessão de hoje para preencher parcialmente o segmento atual (séries no teto mantendo a carga principal)
  const todaySetsAtCeiling = log.sets.filter(
    (s) => s.completed && s.reps >= maxReps && s.weightKg === workingWeight
  ).length;
  const todayCeilingRatio =
    log.sets.length > 0 ? todaySetsAtCeiling / log.sets.length : 0;

  // Show progression recommendation banner when user has 3/3 perfect workouts at this weight
  const showProgressionBanner =
    !isAborted &&
    completedCount === 0 &&
    isSameWeightAsLast &&
    Boolean(lastPerformance?.readyToProgress) &&
    (lastPerformance?.suggestedNextWeightKg ?? 0) > 0;

  // Toggle set completion (locks/unlocks that set's weight and reps)
  const handleToggleSet = (setIdx: number) => {
    if (isAborted) return;

    const newSets: SetEntry[] = log.sets.map((s, idx) => {
      if (idx === setIdx) {
        const nextCompleted = !s.completed;
        if (nextCompleted) {
          playSetCompleteSound();
          triggerHaptic('success');
        } else {
          triggerHaptic('light');
        }
        return { ...s, completed: nextCompleted };
      }
      return s;
    });

    onUpdateLog({
      ...log,
      sets: newSets
    });
  };

  // Adjust reps for a single pending set (-1 / +1) — locked once completed!
  const handleAdjustSetReps = (setIdx: number, delta: number) => {
    if (isAborted || log.sets[setIdx]?.completed) return;
    triggerHaptic('light');

    const newSets: SetEntry[] = log.sets.map((s, idx) => {
      if (idx === setIdx) {
        const nextReps = Math.max(1, Math.min(35, (s.reps || minReps) + delta));
        return { ...s, reps: nextReps };
      }
      return s;
    });

    onUpdateLog({
      ...log,
      sets: newSets
    });
  };

  // Apply 1-tap weight progression & reset reps to floor of target range (Double Progression)
  const handleApplyProgression = () => {
    if (!lastPerformance || isAborted || allSetsDone) return;
    triggerHaptic('success');
    const nextWeight = lastPerformance.suggestedNextWeightKg;
    const updatedSets = log.sets.map((s) =>
      s.completed
        ? s
        : {
            ...s,
            weightKg: nextWeight,
            reps: minReps
          }
    );
    onUpdateLog({
      ...log,
      sets: updatedSets
    });
  };

  // Adjust weight ONLY for uncompleted sets (preserves locked completed sets & enables dropsets!)
  const handleAdjustWeight = (delta: number) => {
    if (isAborted || allSetsDone) return;
    triggerHaptic('light');
    const newWeight = Math.max(0, Number((currentWeight + delta).toFixed(1)));
    const updatedSets = log.sets.map((s) =>
      s.completed
        ? s
        : {
            ...s,
            weightKg: newWeight
          }
    );
    onUpdateLog({
      ...log,
      sets: updatedSets
    });
  };

  const handleDirectWeightChange = (val: number) => {
    if (isAborted || allSetsDone) return;
    const newWeight = Math.max(0, isNaN(val) ? 0 : val);
    const updatedSets = log.sets.map((s) =>
      s.completed
        ? s
        : {
            ...s,
            weightKg: newWeight
          }
    );
    onUpdateLog({
      ...log,
      sets: updatedSets
    });
  };

  const handleToggleFatigue = () => {
    triggerHaptic('alert');
    onUpdateLog({
      ...log,
      abortedForFatigue: !isAborted
    });
  };

  const handleSelectSubstitute = (chosenName: string) => {
    const isSub = chosenName.toLowerCase() !== exercise.name.toLowerCase();
    onUpdateLog({
      ...log,
      activeExerciseName: chosenName,
      isSubstituted: isSub
    });
  };

  const formattedLastDate = lastPerformance?.date
    ? new Date(lastPerformance.date + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      })
    : null;

  const lastRepsFormatted =
    lastPerformance?.lastSetsReps && lastPerformance.lastSetsReps.length > 0
      ? lastPerformance.lastSetsReps.join('/')
      : lastPerformance?.reps
      ? `${lastPerformance.reps}`
      : null;

  const lastHadWeightDrop =
    Boolean(lastPerformance?.hadWeightDrop) &&
    (lastPerformance?.lastSetsWeights?.length ?? 0) > 1;

  const lastWeightsFormatted = lastHadWeightDrop
    ? `${lastPerformance!.lastSetsWeights!.join('→')}kg`
    : lastPerformance
    ? `${lastPerformance.weightKg}kg`
    : null;

  const isCompact4Cols = log.sets.length >= 4;

  return (
    <>
      <div
        className={`relative bg-white rounded-3xl overflow-hidden border transition-[border-color,box-shadow,opacity] duration-150 ease-out shadow-xs ${
          isAborted
            ? 'border-red-300 opacity-85'
            : allSetsDone
            ? 'border-emerald-400 ring-1 ring-emerald-400/25'
            : 'border-slate-200/90'
        }`}
      >
        {/* ===================================================================== */}
        {/* ZONA 1: CABEÇALHO ESCURO DE ALTO CONTRASTE (NAVY SLATE-900)           */}
        {/* ===================================================================== */}
        <div
          className={`px-4 pt-3.5 pb-3 transition-colors duration-150 ${
            isAborted
              ? 'bg-red-950 text-white'
              : allSetsDone
              ? 'bg-slate-900 text-white border-b-2 border-emerald-500'
              : 'bg-slate-900 text-white'
          }`}
        >
          {/* Linha 1: Badge do Músculo (Esquerda) e Botões de Ação (Direita) — h-7 */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-7 px-2.5 rounded-lg inline-flex items-center text-[11px] font-extrabold bg-blue-500/20 text-blue-200 border border-blue-400/30 whitespace-nowrap truncate">
                {exercise.muscleGroup}
              </span>

              {isNewPR && (
                <span className="h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 whitespace-nowrap shrink-0">
                  <Trophy className="w-3 h-3 text-amber-300 fill-current" />
                  <span>PR</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsExecModalOpen(true);
                }}
                className="h-7 px-2.5 rounded-lg border border-white/15 bg-white/10 text-white inline-flex items-center gap-1.5 active:scale-[0.96] transition-transform duration-120 ease-out"
                title="Ver animação e execução"
                aria-label="Como executar"
              >
                <PlayCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-[11px] font-extrabold">Técnica</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsSubModalOpen(true);
                }}
                className="w-7 h-7 rounded-lg border border-white/15 bg-white/10 text-slate-200 inline-flex items-center justify-center active:scale-[0.95] transition-transform duration-120 ease-out"
                title="Substituir exercício"
                aria-label="Substituir exercício"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleToggleFatigue}
                className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-xs active:scale-[0.95] transition-[transform,background-color] duration-120 ease-out ${
                  isAborted
                    ? 'bg-red-500 text-white ring-2 ring-red-300'
                    : 'border border-red-400/35 bg-red-500/20 text-red-300'
                }`}
                title="Pular por Fadiga"
                aria-label="Pular por Fadiga"
              >
                <span className="text-[11px] font-black">✕</span>
              </button>
            </div>
          </div>

          {/* Linha 2: Nome do Exercício em Branco Puro de Alto Contraste */}
          <h3
            onClick={() => {
              triggerHaptic('light');
              setIsExecModalOpen(true);
            }}
            className="text-[16px] font-black text-white tracking-tight leading-snug truncate cursor-pointer active:text-blue-300 transition-colors"
            title="Toque para ver animação de execução"
          >
            {displayName}
          </h3>
        </div>

        {/* ===================================================================== */}
        {/* CORPO BRANCO PURO DO CARD                                             */}
        {/* ===================================================================== */}
        <div className="p-3.5 bg-white">
          {/* AVISO DE FADIGA SE INTERROMPIDO */}
          {isAborted && (
            <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 truncate">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                <span className="font-bold truncate">Interrompido por fadiga física</span>
              </div>
              <button
                type="button"
                onClick={handleToggleFatigue}
                className="text-[10px] underline font-black shrink-0"
              >
                Reativar
              </button>
            </div>
          )}

          {/* =================================================================== */}
          {/* ZONA 2: ILUSTRAÇÃO ANATÔMICA + PAINEL DE DOMÍNIO DA CARGA (3 ETAPAS) */}
          {/* =================================================================== */}
          <div className="flex items-stretch gap-3 mb-3">
            {/* Desenho Anatômico na Máquina (Toque abre o guia de execução) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsExecModalOpen(true);
              }}
              className="w-20 h-20 rounded-2xl bg-white border border-slate-200/90 p-1 flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-2xs overflow-hidden"
              title="Ver execução detalhada"
              aria-label={`Ilustração de ${displayName}`}
            >
              <img
                src={guide.thumbUrl}
                alt={displayName}
                loading="lazy"
                className="w-full h-full object-contain"
              />
            </button>

            {/* Painel de Domínio da Carga (3 Treinos no Teto para Subir Peso) */}
            <div className="flex-1 min-w-0 rounded-2xl bg-slate-50/90 border border-slate-200/80 px-3 py-2 flex flex-col justify-between">
              {/* Linha Superior: Rótulo Intuitivo + Badge de Domínio (0/3, 1/3, 2/3, 3/3) */}
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-black text-slate-800 tracking-tight truncate">
                  Domínio da Carga
                </span>

                {!isAborted && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 tabular-nums shadow-2xs ${
                      hasCompletedWeightDrop
                        ? 'bg-amber-500 text-white'
                        : liveStreak >= 3
                        ? 'bg-amber-500 text-white'
                        : liveStreak > 0
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    {hasCompletedWeightDrop
                      ? 'Drop ativo'
                      : `${liveStreak}/3 ${liveStreak >= 3 ? 'PRONTO' : 'no teto'}`}
                  </span>
                )}
              </div>

              {/* Barra de Progresso Intuitiva de 3 Etapas (1 bloco = 1 treino perfeito no teto) */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-full bg-slate-200/75 border border-slate-300/60 my-1">
                {[0, 1, 2].map((stepIdx) => {
                  const isCompletedStep = stepIdx < liveStreak;
                  const isCurrentActiveStep =
                    stepIdx === baseStreak && !isTodayPerfectAtTarget && todayCeilingRatio > 0;

                  return (
                    <div
                      key={stepIdx}
                      className="h-2.5 rounded-full bg-white/80 overflow-hidden flex items-center relative"
                    >
                      {isCompletedStep ? (
                        <div
                          className={`w-full h-full rounded-full flex items-center justify-end pr-1 transition-all duration-200 ${
                            liveStreak >= 3 ? 'bg-amber-500' : 'bg-blue-600'
                          }`}
                        >
                          {stepIdx === liveStreak - 1 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-2xs" />
                          )}
                        </div>
                      ) : isCurrentActiveStep ? (
                        <div
                          className="h-full rounded-full bg-slate-900 transition-all duration-200"
                          style={{ width: `${Math.round(todayCeilingRatio * 100)}%` }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Linha Inferior: Faixa de Repetições (Esquerda) + Ícone de Alvo Máximo (Direita) */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black text-slate-900 tracking-tight tabular-nums">
                  Faixa: {minReps}–{maxReps} {isUnilateralReps ? 'reps/lado' : 'reps'}
                </span>

                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200/90 text-[10px] font-black text-slate-800 tabular-nums shrink-0 shadow-2xs"
                  title={`Alvo máximo de ${maxReps} repetições para domínio da carga`}
                >
                  <Target className="w-3 h-3 text-blue-600 stroke-[2.5] shrink-0" />
                  <span>{maxReps} reps</span>
                </span>
              </div>
            </div>
          </div>

          {/* BANNER DE PROGRESSÃO DE 1 TOQUE (QUANDO ATINGIR 3/3 NO TETO) */}
          {showProgressionBanner && lastPerformance && (
            <div className="mb-3 p-2 pl-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Flame className="w-4 h-4 text-amber-600 shrink-0 fill-amber-500/20" />
                <div className="min-w-0">
                  <div className="text-[11px] font-black text-amber-950 truncate leading-tight">
                    Carga dominada (3/3 no teto de {maxReps} reps)
                  </div>
                  <div className="text-[10px] font-semibold text-amber-800 truncate leading-tight">
                    {isGraviton
                      ? `Reduzir assistência e reiniciar em ${minReps} reps`
                      : `Subir carga e reiniciar ciclo em ${minReps} reps`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyProgression}
                className="h-7 px-2.5 rounded-lg bg-amber-600 text-white font-black text-[10px] shrink-0 active:scale-95 transition-transform duration-120 ease-out shadow-2xs whitespace-nowrap"
              >
                {isGraviton
                  ? `Ir p/ ${lastPerformance.suggestedNextWeightKg}kg`
                  : `Subir p/ ${lastPerformance.suggestedNextWeightKg}kg`}
              </button>
            </div>
          )}

          {/* =================================================================== */}
          {/* ZONA 3: BARRA DE CARGA DE ALTO CONTRASTE (TRAVA SÉRIES CONCLUÍDAS)   */}
          {/* =================================================================== */}
          <div
            className={`flex items-center justify-between gap-2 mb-3 p-1.5 rounded-2xl border transition-colors ${
              allSetsDone
                ? 'bg-emerald-50/50 border-emerald-200/80'
                : 'bg-slate-100/90 border-slate-200/80'
            }`}
          >
            {/* Selo Esquerdo em Azul-Marinho combinando com o Header */}
            <div className="h-8 px-3 rounded-xl bg-slate-900 text-white flex items-center gap-1.5 text-xs font-extrabold tracking-tight shrink-0 shadow-2xs">
              {allSetsDone ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Carga Travada</span>
                </>
              ) : (
                <>
                  <Dumbbell className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>
                    {completedCount > 0 && firstPendingSet
                      ? `Carga (S${firstPendingSet.setNumber}+)`
                      : 'Carga'}
                  </span>
                </>
              )}
            </div>

            {/* Controles Direitos: -5 | 60 kg (ou 60→55→50 kg quando todas concluídas em drop) | +5 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleAdjustWeight(-5)}
                disabled={isAborted || allSetsDone || currentWeight <= 0}
                className="h-8 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-black text-xs flex items-center gap-0.5 active:scale-[0.95] transition-transform duration-120 ease-out disabled:opacity-35 disabled:pointer-events-none shadow-2xs"
                title={
                  allSetsDone
                    ? 'Desmarque uma série caso queira alterar a carga'
                    : 'Diminuir 5kg nas séries pendentes'
                }
                aria-label="-5kg"
              >
                <Minus className="w-3 h-3 stroke-[2.5]" />
                <span>5</span>
              </button>

              {allSetsDone && hasTodayWeightVariation ? (
                <div
                  className="flex items-center bg-white border border-emerald-200 rounded-xl px-2.5 h-8 shadow-2xs"
                  title="Cargas registradas em cada série concluída"
                >
                  <span className="text-xs font-black text-slate-900 tabular-nums whitespace-nowrap">
                    {log.sets.map((s) => s.weightKg).join('→')}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-400 ml-1 select-none">
                    kg
                  </span>
                </div>
              ) : (
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-2 h-8 shadow-2xs">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={currentWeight === 0 ? '' : currentWeight}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleDirectWeightChange(val === '' ? 0 : parseFloat(val));
                    }}
                    disabled={isAborted || allSetsDone}
                    className="w-11 h-full text-center text-sm font-black text-slate-900 bg-transparent focus:outline-none disabled:opacity-60 tabular-nums"
                  />
                  <span className="text-[10px] font-extrabold text-slate-400 select-none">
                    kg
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleAdjustWeight(5)}
                disabled={isAborted || allSetsDone}
                className="h-8 px-3 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center gap-0.5 active:scale-[0.95] transition-transform duration-120 ease-out disabled:opacity-35 disabled:pointer-events-none shadow-2xs"
                title={
                  allSetsDone
                    ? 'Desmarque uma série caso queira alterar a carga'
                    : 'Aumentar 5kg nas séries pendentes'
                }
                aria-label="+5kg"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>5</span>
              </button>
            </div>
          </div>

          {/* =================================================================== */}
          {/* ZONA 4: OS 3 BOTÕES DE SÉRIES DE ALTO CONTRASTE (SLATE-900 / BLUE)  */}
          {/* =================================================================== */}
          <div
            className={`grid ${
              isCompact4Cols ? 'grid-cols-4 gap-1.5' : 'grid-cols-3 gap-2'
            }`}
          >
            {log.sets.map((set, idx) => {
              const isDone = set.completed;
              const currentReps = set.reps || minReps;
              const isAtTargetCeiling =
                currentReps >= maxReps && set.weightKg === workingWeight;
              const showSetWeightOnButton = isDone || hasTodayWeightVariation;

              return (
                <div
                  key={set.setNumber}
                  className={`rounded-2xl border overflow-hidden transition-[border-color,background-color,box-shadow] duration-120 ease-out ${
                    isAborted
                      ? 'border-slate-200 bg-slate-100 opacity-60'
                      : isDone
                      ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500/20 shadow-2xs'
                      : 'border-slate-300/90 bg-slate-100/80 shadow-2xs'
                  }`}
                >
                  {/* Parte Superior: 1 Toque para Marcar/Desmarcar Série (Trava Peso & Reps ao concluir) */}
                  <button
                    type="button"
                    onClick={() => handleToggleSet(idx)}
                    disabled={isAborted}
                    className={`w-full h-9 px-1.5 flex items-center justify-center gap-1 transition-[transform,background-color,color] duration-120 ease-out active:scale-[0.97] ${
                      isAborted
                        ? 'text-slate-400 cursor-not-allowed bg-slate-200'
                        : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-900 text-white'
                    }`}
                    title={
                      isDone
                        ? `Série ${set.setNumber} travada com ${set.weightKg}kg (${currentReps} reps). Toque para destravar/editar.`
                        : `Concluir Série ${set.setNumber} com ${set.weightKg}kg`
                    }
                    aria-label={`Concluir Série ${set.setNumber}`}
                  >
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 stroke-[3] shrink-0 text-white" />
                    ) : (
                      <span className="w-2 h-2 rounded-full border-2 border-blue-400 shrink-0" />
                    )}
                    <span className="text-[11px] font-black tracking-tight whitespace-nowrap tabular-nums">
                      {showSetWeightOnButton
                        ? isCompact4Cols
                          ? `S${set.setNumber}•${set.weightKg}`
                          : `S${set.setNumber} • ${set.weightKg}kg`
                        : isCompact4Cols
                        ? `S${set.setNumber}`
                        : `Série ${set.setNumber}`}
                    </span>
                  </button>

                  {/* Parte Inferior: Stepper de Repetições (Travado quando a série está concluída) */}
                  <div
                    className={`p-1 flex items-center justify-between gap-0.5 ${
                      isDone ? 'bg-emerald-50/70' : 'bg-slate-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleAdjustSetReps(idx, -1)}
                      disabled={isAborted || isDone || currentReps <= 1}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200/90 flex items-center justify-center text-slate-700 active:scale-90 transition-transform disabled:opacity-25 disabled:pointer-events-none shrink-0 shadow-2xs"
                      aria-label={`Menos 1 repetição na série ${set.setNumber}`}
                    >
                      <Minus className="w-3 h-3 stroke-[2.5]" />
                    </button>

                    <div className="flex-1 text-center min-w-0 px-0.5">
                      <span
                        className={`text-xs font-black tabular-nums whitespace-nowrap ${
                          isAtTargetCeiling ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {currentReps}
                        <span
                          className={`text-[9px] font-extrabold ml-0.5 ${
                            isAtTargetCeiling ? 'text-emerald-600' : 'text-slate-500'
                          }`}
                        >
                          {isCompact4Cols ? 'r' : 'reps'}
                        </span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAdjustSetReps(idx, 1)}
                      disabled={isAborted || isDone || currentReps >= 35}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-white active:scale-90 transition-transform disabled:opacity-25 disabled:pointer-events-none shrink-0 shadow-2xs ${
                        isDone ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}
                      aria-label={`Mais 1 repetição na série ${set.setNumber}`}
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* =================================================================== */}
          {/* ZONA 5: RODAPÉ ÚNICO E ESTRUTURADO DE HISTÓRICO (COM RELOGINHO)     */}
          {/* =================================================================== */}
          <div className="mt-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <History className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <div className="truncate flex items-center gap-1">
                {lastPerformance && lastWeightsFormatted ? (
                  <>
                    <span className="truncate">
                      Último:{' '}
                      <strong className="text-slate-900 font-black tabular-nums">
                        {lastWeightsFormatted}
                      </strong>
                      {lastRepsFormatted && (
                        <span className="text-slate-700 font-bold ml-1 tabular-nums">
                          ({lastRepsFormatted} {lastHadWeightDrop ? 'r' : 'reps'})
                        </span>
                      )}
                      {formattedLastDate && (
                        <span className="text-slate-400 font-semibold ml-1">
                          • {formattedLastDate}
                        </span>
                      )}
                    </span>
                    {lastHadWeightDrop && (
                      <span
                        className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200/80 text-[9px] font-black shrink-0"
                        title="Na última sessão houve redução de carga (dropset) entre as séries"
                      >
                        Drop
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500 font-medium">
                    1ª sessão registrada nesta carga
                  </span>
                )}
              </div>
            </div>

            {completedCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 text-[10px] font-black shrink-0 tabular-nums">
                {completedCount}/{log.sets.length} feitas
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Guia de Execução & Animação (montado sob demanda) */}
      {isExecModalOpen && (
        <ExerciseExecutionModal
          isOpen={isExecModalOpen}
          onClose={() => setIsExecModalOpen(false)}
          exerciseId={exercise.id}
          exerciseName={displayName}
          muscleGroup={exercise.muscleGroup}
          gripOrForm={exercise.gripOrForm}
        />
      )}

      {/* Modal de Substituição Rápida (montado sob demanda) */}
      {isSubModalOpen && (
        <SubstituteModal
          isOpen={isSubModalOpen}
          onClose={() => setIsSubModalOpen(false)}
          originalExerciseName={exercise.name}
          currentActiveName={log.activeExerciseName}
          substitutes={exercise.substitutes}
          onSelectSubstitute={handleSelectSubstitute}
        />
      )}
    </>
  );
});
