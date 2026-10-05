import React, { useState } from 'react';
import type {
  ExerciseDefinition,
  ExerciseLog,
  SetEntry,
  ExercisePerformanceSummary
} from '../types';
import { parseRepRange } from '../db/db';
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

  const isCompact4Cols = log.sets.length >= 4;

  return (
    <>
      <div
        className={`relative bg-white rounded-2xl p-4 border transition-[border-color,background-color,opacity] duration-150 ease-out shadow-2xs ${
          isAborted
            ? 'border-red-200 bg-red-50/20 opacity-80'
            : allSetsDone
            ? 'border-emerald-300/90 bg-emerald-50/10 ring-1 ring-emerald-400/20'
            : 'border-slate-200/80'
        }`}
      >
        {/* LINHA 1: Badge do Músculo (Esquerda) e Botões de Ação (Direita) — Altura idêntica h-7 */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-7 px-2.5 rounded-lg inline-flex items-center text-[11px] font-extrabold bg-blue-50/90 text-blue-700 border border-blue-200/70 whitespace-nowrap truncate">
              {exercise.muscleGroup}
            </span>

            {isNewPR && (
              <span className="h-7 px-2 rounded-lg inline-flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200/90 whitespace-nowrap shrink-0">
                <Trophy className="w-3 h-3 text-amber-500 fill-current" />
                <span>PR</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsExecModalOpen(true);
              }}
              className="h-7 px-2.5 rounded-lg border border-blue-200/90 bg-blue-50/80 text-blue-700 inline-flex items-center gap-1 active:scale-[0.96] transition-transform duration-120 ease-out"
              title="Ver animação e execução"
              aria-label="Como executar"
            >
              <PlayCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px] font-extrabold">Técnica</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsSubModalOpen(true);
              }}
              className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 inline-flex items-center justify-center active:scale-[0.95] transition-transform duration-120 ease-out"
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
                  ? 'bg-red-500 text-white ring-2 ring-red-400'
                  : 'border border-red-200 bg-red-50/80 text-red-600'
              }`}
              title="Pular por Fadiga"
              aria-label="Pular por Fadiga"
            >
              <span className="text-[11px] font-black">✕</span>
            </button>
          </div>
        </div>

        {/* LINHA 2: Nome do Exercício (Esquerda) + Alvo de Repetições Moderno (Direita) */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h3
            onClick={() => {
              triggerHaptic('light');
              setIsExecModalOpen(true);
            }}
            className="text-[15px] font-black text-slate-900 tracking-tight leading-snug truncate cursor-pointer active:text-blue-600 transition-colors min-w-0 flex-1"
            title="Toque para ver animação de execução"
          >
            {displayName}
          </h3>

          <div className="h-6 px-2.5 rounded-lg bg-slate-100 border border-slate-200/80 inline-flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
            <span className="text-[11px] font-extrabold text-slate-700 tracking-tight tabular-nums whitespace-nowrap">
              {minReps}–{maxReps} {isUnilateralReps ? 'reps/lado' : 'reps'}
            </span>
          </div>
        </div>

        {/* FATIGUE BANNER IF ABORTED */}
        {isAborted && (
          <div className="mb-2.5 p-2 rounded-xl bg-red-100/70 border border-red-200 text-red-800 text-[11px] flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
              <span className="font-semibold truncate">Interrompido por fadiga física</span>
            </div>
            <button
              onClick={handleToggleFatigue}
              className="text-[10px] underline font-bold shrink-0"
            >
              Reativar
            </button>
          </div>
        )}

        {/* LINHA 3: Histórico (Esquerda) + Contador Teto X/3 Limpo sem Estrela (Direita) */}
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mb-2.5">
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
                <span className="text-slate-400">1ª sessão nesta carga</span>
              )}
            </div>
          </div>

          {!isAborted && (
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 tabular-nums border ${
                liveStreak >= 3
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : liveStreak > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : 'bg-slate-100 text-slate-500 border-slate-200/70'
              }`}
              title={`Meta para subir carga: fechar todas as séries em ${maxReps} reps por 3 treinos seguidos`}
            >
              Teto {Math.min(3, liveStreak)}/3
            </span>
          )}
        </div>

        {/* BANNER DE PROGRESSÃO DE CARGA (APARECE AO ATINGIR 3/3 TREINOS PERFEITOS NO TETO) */}
        {showProgressionBanner && lastPerformance && (
          <div className="mb-2.5 p-2 pl-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 flex items-center justify-between gap-2">
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

        {/* LINHA 4: Controle de Carga Padronizado */}
        <div className="flex items-center justify-between gap-1.5 mb-3 py-1.5 px-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 whitespace-nowrap">
            <Dumbbell className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Carga</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleAdjustWeight(-5)}
              disabled={isAborted || currentWeight <= 0}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-extrabold text-[11px] flex items-center gap-0.5 active:scale-[0.95] transition-transform duration-120 ease-out disabled:opacity-40 shadow-2xs"
              title="Diminuir 5kg"
              aria-label="-5kg"
            >
              <Minus className="w-2.5 h-2.5 stroke-[2.5]" />
              <span>5</span>
            </button>

            <div className="relative flex items-center">
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
                className="w-14 h-8 text-center text-sm font-black text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 shadow-2xs tabular-nums"
              />
              <span className="ml-1 text-[10px] font-bold text-slate-400">kg</span>
            </div>

            <button
              type="button"
              onClick={() => handleAdjustWeight(5)}
              disabled={isAborted}
              className="h-8 px-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 font-extrabold text-[11px] flex items-center gap-0.5 active:scale-[0.95] transition-transform duration-120 ease-out disabled:opacity-40 shadow-2xs"
              title="Aumentar 5kg"
              aria-label="+5kg"
            >
              <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
              <span>5</span>
            </button>
          </div>
        </div>

        {/* LINHA 5: Séries Minimalistas com Stepper de Repetições Integrado (- / +) */}
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
                {/* Parte Superior: 1 Toque para Marcar/Desmarcar Série (Limpo, sem subtítulo redundante) */}
                <button
                  type="button"
                  onClick={() => handleToggleSet(idx)}
                  disabled={isAborted}
                  className={`w-full h-9 px-1.5 flex items-center justify-center gap-1 transition-[transform,background-color,color] duration-120 ease-out active:scale-[0.97] ${
                    isAborted
                      ? 'text-slate-400 cursor-not-allowed bg-slate-100'
                      : isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-slate-800'
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
                      : 'border-slate-100 bg-slate-50/90'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleAdjustSetReps(idx, -1)}
                    disabled={isAborted || currentReps <= 1}
                    className="w-7 h-full flex items-center justify-center text-slate-500 active:scale-90 active:bg-slate-200/70 transition-transform disabled:opacity-30 shrink-0"
                    aria-label={`Menos 1 repetição na série ${set.setNumber}`}
                  >
                    <Minus className="w-3 h-3 stroke-[2.5]" />
                  </button>

                  <div className="flex-1 text-center min-w-0 px-0.5">
                    <span
                      className={`text-[11px] font-black tabular-nums whitespace-nowrap ${
                        isAtTargetCeiling ? 'text-emerald-600' : 'text-slate-800'
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
                    className="w-7 h-full flex items-center justify-center text-blue-600 active:scale-90 active:bg-blue-100/60 transition-transform disabled:opacity-30 shrink-0"
                    aria-label={`Mais 1 repetição na série ${set.setNumber}`}
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })}
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

