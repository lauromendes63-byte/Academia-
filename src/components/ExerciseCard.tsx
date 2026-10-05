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
  Flame
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

  const currentWeight =
    log.sets[0]?.weightKg ?? lastPerformance?.weightKg ?? exercise.defaultWeightKg;

  // Check if current weight beats historical Personal Record (PR)
  const referenceBest = lastPerformance?.bestWeightKg ?? lastPerformance?.weightKg;
  const isNewPR =
    !isAborted &&
    referenceBest !== undefined &&
    currentWeight > 0 &&
    (isGraviton ? currentWeight < referenceBest : currentWeight > referenceBest);

  const completedCount = log.sets.filter((s) => s.completed).length;
  const allSetsDone = !isAborted && completedCount === log.sets.length && log.sets.length > 0;

  // Check if all sets in today's session are completed AND at or above the target rep ceiling (maxReps)
  const isTodayPerfectAtTarget =
    allSetsDone && log.sets.every((s) => s.reps >= maxReps && s.weightKg > 0);

  // Historical streak at the current weight
  const isSameWeightAsLast =
    lastPerformance !== null &&
    lastPerformance !== undefined &&
    currentWeight === lastPerformance.weightKg;

  const baseStreak = isSameWeightAsLast ? lastPerformance.perfectStreak : 0;
  const liveStreak = isTodayPerfectAtTarget ? baseStreak + 1 : baseStreak;

  // Cálculo dos 6 segmentos da Barra de Progresso do Exercício:
  // Segmentos 1..3: evolução das repetições dentro da faixa (ex: 6 -> 7 -> 8 reps)
  // Segmentos 4..6: consolidação dos 3 treinos perfeitos no teto (1/3, 2/3, 3/3)
  const avgSetReps =
    log.sets.reduce((acc, s) => acc + (s.reps || minReps), 0) /
    Math.max(1, log.sets.length);
  const repRangeSpan = Math.max(1, maxReps - minReps);
  const repRatio = Math.max(0, Math.min(1, (avgSetReps - minReps) / repRangeSpan));

  const filledSegments =
    liveStreak >= 3
      ? 6
      : liveStreak === 2
      ? 5
      : liveStreak === 1
      ? 4
      : Math.max(1, Math.min(3, 1 + Math.round(repRatio * 2)));

  // Show progression recommendation banner when user has 3/3 perfect workouts at this weight
  const showProgressionBanner =
    !isAborted &&
    isSameWeightAsLast &&
    Boolean(lastPerformance?.readyToProgress) &&
    (lastPerformance?.suggestedNextWeightKg ?? 0) > 0;

  // Toggle set completion
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

  // Adjust reps for a single set (-1 / +1) with zero typing
  const handleAdjustSetReps = (setIdx: number, delta: number) => {
    if (isAborted) return;
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
    if (!lastPerformance || isAborted) return;
    triggerHaptic('success');
    const nextWeight = lastPerformance.suggestedNextWeightKg;
    const updatedSets = log.sets.map((s) => ({
      ...s,
      weightKg: nextWeight,
      reps: minReps
    }));
    onUpdateLog({
      ...log,
      sets: updatedSets
    });
  };

  // Adjust weight across sets
  const handleAdjustWeight = (delta: number) => {
    triggerHaptic('light');
    const newWeight = Math.max(0, Number((currentWeight + delta).toFixed(1)));
    const updatedSets = log.sets.map((s) => ({
      ...s,
      weightKg: newWeight
    }));
    onUpdateLog({
      ...log,
      sets: updatedSets
    });
  };

  const handleDirectWeightChange = (val: number) => {
    const newWeight = Math.max(0, isNaN(val) ? 0 : val);
    const updatedSets = log.sets.map((s) => ({
      ...s,
      weightKg: newWeight
    }));
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

  const currentRepsFormatted = log.sets.map((s) => s.reps || minReps).join('/');
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
          {/* ZONA 2: ILUSTRAÇÃO ANATÔMICA NA MÁQUINA + BARRA DE PROGRESSO        */}
          {/* =================================================================== */}
          <div className="flex items-center gap-3.5 mb-3">
            {/* Desenho Anatômico na Máquina (Toque abre o guia de execução) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsExecModalOpen(true);
              }}
              className="w-20 h-20 rounded-2xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-2xs overflow-hidden"
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

            {/* Barra de Progresso de Repetições & Domínio (2 tons de azul) */}
            <div className="flex-1 min-w-0">
              {/* Callout Superior */}
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200/70 text-[10px] font-extrabold text-slate-700 tabular-nums truncate">
                  {lastRepsFormatted
                    ? `Último: ${lastRepsFormatted} reps`
                    : `Hoje: ${currentRepsFormatted} reps`}
                </span>

                {!isAborted && (
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 tabular-nums border ${
                      liveStreak >= 3
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : liveStreak > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200/70'
                    }`}
                  >
                    Teto {Math.min(3, liveStreak)}/3
                  </span>
                )}
              </div>

              {/* Barra Segmentada (6 blocos com ponteiro branco no segmento ativo) */}
              <div className="grid grid-cols-6 gap-1 p-1 rounded-full bg-slate-100 border border-slate-200/80">
                {[0, 1, 2, 3, 4, 5].map((segIdx) => {
                  const isFilled = segIdx < filledSegments;
                  const isCurrentTip = segIdx === filledSegments - 1;
                  // Apenas 2 tons de azul: Slate-900 (base de repetições) e Blue-600 (domínio de teto)
                  const fillClass = !isFilled
                    ? 'bg-slate-200/70'
                    : segIdx < 3
                    ? 'bg-slate-900'
                    : 'bg-blue-600';

                  return (
                    <div
                      key={segIdx}
                      className={`h-2.5 rounded-full flex items-center justify-center transition-colors duration-200 ${fillClass}`}
                    >
                      {isCurrentTip && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-2xs" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Faixa Alvo de Repetições Abaixo da Barra */}
              <div className="flex items-center justify-between mt-1.5 px-0.5">
                <span className="text-[11px] font-extrabold text-slate-700 tracking-tight tabular-nums">
                  {minReps}–{maxReps} {isUnilateralReps ? 'reps/lado' : 'reps'}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                  {allSetsDone
                    ? 'Séries concluídas'
                    : `Alvo máx: ${maxReps} reps`}
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
          {/* ZONA 3: BARRA DE CARGA DE ALTO CONTRASTE (SEM PRATA CAFONA)         */}
          {/* =================================================================== */}
          <div className="flex items-center justify-between gap-2 mb-3 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/80">
            {/* Selo Esquerdo em Azul-Marinho combinando com o Header */}
            <div className="h-8 px-3 rounded-xl bg-slate-900 text-white flex items-center gap-1.5 text-xs font-extrabold tracking-tight shrink-0 shadow-2xs">
              <Dumbbell className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Carga</span>
            </div>

            {/* Controles Direitos: -5 | 60 kg | +5 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleAdjustWeight(-5)}
                disabled={isAborted || currentWeight <= 0}
                className="h-8 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-black text-xs flex items-center gap-0.5 active:scale-[0.95] transition-transform duration-120 ease-out disabled:opacity-40 shadow-2xs"
                title="Diminuir 5kg"
                aria-label="-5kg"
              >
                <Minus className="w-3 h-3 stroke-[2.5]" />
                <span>5</span>
              </button>

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
                  disabled={isAborted}
                  className="w-11 h-full text-center text-sm font-black text-slate-900 bg-transparent focus:outline-none disabled:opacity-50 tabular-nums"
                />
                <span className="text-[10px] font-extrabold text-slate-400 select-none">
                  kg
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleAdjustWeight(5)}
                disabled={isAborted}
                className="h-8 px-3 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center gap-0.5 active:scale-[0.95] transition-transform duration-120 ease-out disabled:opacity-40 shadow-2xs"
                title="Aumentar 5kg"
                aria-label="+5kg"
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                <span>5</span>
              </button>
            </div>
          </div>

          {/* =================================================================== */}
          {/* ZONA 4: OS 3 BOTÕES DE SÉRIES COM STEPPER INTEGRADO (- / +)         */}
          {/* =================================================================== */}
          <div
            className={`grid ${
              isCompact4Cols ? 'grid-cols-4 gap-1.5' : 'grid-cols-3 gap-2'
            }`}
          >
            {log.sets.map((set, idx) => {
              const isDone = set.completed;
              const currentReps = set.reps || minReps;
              const isAtTargetCeiling = currentReps >= maxReps;

              return (
                <div
                  key={set.setNumber}
                  className={`rounded-xl border overflow-hidden transition-[border-color,background-color] duration-120 ease-out ${
                    isAborted
                      ? 'border-slate-200 bg-slate-100 opacity-60'
                      : isDone
                      ? 'border-emerald-500 bg-emerald-50/20 shadow-2xs'
                      : 'border-slate-200/90 bg-white'
                  }`}
                >
                  {/* Parte Superior: 1 Toque para Marcar/Desmarcar Série */}
                  <button
                    type="button"
                    onClick={() => handleToggleSet(idx)}
                    disabled={isAborted}
                    className={`w-full h-9 px-1.5 flex items-center justify-center gap-1 transition-[transform,background-color,color] duration-120 ease-out active:scale-[0.97] ${
                      isAborted
                        ? 'text-slate-400 cursor-not-allowed bg-slate-100'
                        : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-50/70 text-slate-800'
                    }`}
                    aria-label={`Concluir Série ${set.setNumber}`}
                  >
                    {isDone && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                    <span className="text-[11px] font-black tracking-tight whitespace-nowrap">
                      {isCompact4Cols ? `S${set.setNumber}` : `Série ${set.setNumber}`}
                    </span>
                  </button>

                  {/* Parte Inferior: Stepper Rápido de Repetições (- / +) */}
                  <div
                    className={`h-8 flex items-center justify-between border-t ${
                      isDone
                        ? 'border-emerald-200/80 bg-emerald-50/50'
                        : 'border-slate-200/70 bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleAdjustSetReps(idx, -1)}
                      disabled={isAborted || currentReps <= 1}
                      className="w-7 h-full flex items-center justify-center text-slate-500 active:scale-90 active:bg-slate-100 transition-transform disabled:opacity-30 shrink-0 border-r border-slate-100"
                      aria-label={`Menos 1 repetição na série ${set.setNumber}`}
                    >
                      <Minus className="w-3 h-3 stroke-[2.5]" />
                    </button>

                    <div className="flex-1 text-center min-w-0 px-0.5">
                      <span
                        className={`text-[11px] font-black tabular-nums whitespace-nowrap ${
                          isAtTargetCeiling ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {currentReps}
                        <span
                          className={`text-[9px] font-bold ml-0.5 ${
                            isAtTargetCeiling ? 'text-emerald-600/80' : 'text-slate-400'
                          }`}
                        >
                          {isCompact4Cols ? 'r' : 'reps'}
                        </span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAdjustSetReps(idx, 1)}
                      disabled={isAborted || currentReps >= 35}
                      className="w-7 h-full flex items-center justify-center text-blue-600 active:scale-90 active:bg-blue-50 transition-transform disabled:opacity-30 shrink-0 border-l border-slate-100"
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
          {/* ZONA 5: RODAPÉ DISCRETO DE HISTÓRICO                                */}
          {/* =================================================================== */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <History className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <div className="truncate">
                {lastPerformance ? (
                  <span>
                    Último:{' '}
                    <strong className="text-slate-800 font-bold tabular-nums">
                      {lastPerformance.weightKg}kg
                    </strong>
                    {lastRepsFormatted && (
                      <span className="text-slate-600 font-semibold ml-1 tabular-nums">
                        ({lastRepsFormatted} reps)
                      </span>
                    )}
                    {formattedLastDate && (
                      <span className="text-slate-400 font-normal ml-1">
                        • {formattedLastDate}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-slate-400">1ª sessão registrada nesta carga</span>
                )}
              </div>
            </div>

            {completedCount > 0 && (
              <span className="text-[10px] font-extrabold text-emerald-600 shrink-0 tabular-nums">
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
