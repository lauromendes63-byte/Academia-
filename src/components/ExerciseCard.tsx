import React, { useState } from 'react';
import type {
  ExerciseDefinition,
  ExerciseLog,
  SetEntry
} from '../types';
import { SubstituteModal } from './SubstituteModal';
import { useRestTimer } from '../context/RestTimerContext';
import { playSetCompleteSound, triggerHaptic } from '../utils/audio';
import {
  Check,
  AlertTriangle,
  History,
  Minus,
  Plus,
  ArrowRightLeft,
  Dumbbell
} from 'lucide-react';

interface ExerciseCardProps {
  exercise: ExerciseDefinition;
  log: ExerciseLog;
  lastPerformance?: { weightKg: number; reps: number; date: string } | null;
  onUpdateLog: (updatedLog: ExerciseLog) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  log,
  lastPerformance,
  onUpdateLog
}) => {
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const { startTimer } = useRestTimer();

  const isAborted = log.abortedForFatigue;
  const currentWeight =
    log.sets[0]?.weightKg ?? lastPerformance?.weightKg ?? exercise.defaultWeightKg;

  // Toggle set completion
  const handleToggleSet = (setIdx: number) => {
    if (isAborted) return;

    const newSets: SetEntry[] = log.sets.map((s, idx) => {
      if (idx === setIdx) {
        const nextCompleted = !s.completed;
        if (nextCompleted) {
          playSetCompleteSound();
          triggerHaptic('success');
          startTimer(exercise.restSeconds, log.activeExerciseName);
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

  // Adjust weight across sets
  const handleAdjustWeight = (delta: number) => {
    triggerHaptic('light');
    const newWeight = Math.max(0, currentWeight + delta);
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

  return (
    <>
      <div
        className={`relative bg-white rounded-2xl p-4 border transition-all duration-200 shadow-xs ${
          isAborted
            ? 'border-red-200 bg-red-50/20 opacity-80'
            : 'border-slate-200/90 hover:border-slate-300'
        }`}
      >
        {/* TOP ROW: Muscle Badge, Grip/Form and Actions */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100/80 whitespace-nowrap">
                {exercise.muscleGroup}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500 whitespace-nowrap">
                {exercise.restSeconds}s
              </span>
            </div>

            <h3 className="text-[15px] font-black text-slate-900 tracking-tight leading-snug truncate">
              {log.activeExerciseName}
            </h3>

            {/* Grip / Form Cue */}
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {exercise.gripOrForm}
            </p>
          </div>

          {/* Action buttons: Substituir & Pular por Fadiga (X) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsSubModalOpen(true)}
              className="w-8 h-8 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center active:scale-95 transition-all"
              title="Substituir exercício"
              aria-label="Substituir exercício"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleToggleFatigue}
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs active:scale-95 transition-all ${
                isAborted
                  ? 'bg-red-500 text-white shadow-xs ring-2 ring-red-400'
                  : 'border border-red-200 bg-red-50/80 hover:bg-red-100 text-red-600'
              }`}
              title="Pular por Fadiga"
              aria-label="Pular por Fadiga"
            >
              <span className="text-xs font-black">✕</span>
            </button>
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
              className="text-[10px] underline font-bold hover:text-red-950 shrink-0"
            >
              Reativar
            </button>
          </div>
        )}

        {/* BADGE HISTÓRICO: Linha única sem quebras */}
        <div className="flex items-center justify-between mb-3 py-1.5 px-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] gap-2">
          <div className="flex items-center gap-1.5 min-w-0 text-slate-600 truncate">
            <History className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">
              {lastPerformance ? (
                <>
                  Último:{' '}
                  <strong className="text-slate-900 font-bold">
                    {lastPerformance.weightKg}kg × {lastPerformance.reps} reps
                  </strong>
                  {formattedLastDate && (
                    <span className="text-slate-400 font-normal ml-1">
                      ({formattedLastDate})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-400">1ª sessão registrada</span>
              )}
            </span>
          </div>

          <span className="font-bold text-slate-600 shrink-0 whitespace-nowrap bg-white px-2 py-0.5 rounded-md border border-slate-200/60 text-[10px]">
            Alvo: {exercise.targetReps} reps
          </span>
        </div>

        {/* CONTROLE DE CARGA: Linha Única sem quebra */}
        <div className="flex items-center justify-between gap-2 mb-3 py-0.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 whitespace-nowrap">
            <Dumbbell className="w-3.5 h-3.5 text-blue-600" />
            <span>Carga</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => handleAdjustWeight(-2)}
              disabled={isAborted || currentWeight <= 0}
              className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center gap-0.5 active:scale-95 transition-all disabled:opacity-40"
              aria-label="-2kg"
            >
              <Minus className="w-3 h-3" />
              <span>2kg</span>
            </button>

            <div className="relative flex items-center">
              <input
                type="number"
                step="0.5"
                min="0"
                value={currentWeight}
                onChange={(e) => handleDirectWeightChange(parseFloat(e.target.value))}
                disabled={isAborted}
                className="w-14 h-8 text-center text-sm font-black text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
              <span className="ml-1 text-[11px] font-bold text-slate-400">kg</span>
            </div>

            <button
              onClick={() => handleAdjustWeight(2)}
              disabled={isAborted}
              className="h-8 px-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center gap-0.5 active:scale-95 transition-all disabled:opacity-40"
              aria-label="+2kg"
            >
              <Plus className="w-3 h-3" />
              <span>2kg</span>
            </button>
          </div>
        </div>

        {/* BOTÕES DE SÉRIES: 1-Tap */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {log.sets.map((set, idx) => {
            const isDone = set.completed;
            return (
              <button
                key={set.setNumber}
                onClick={() => handleToggleSet(idx)}
                disabled={isAborted}
                className={`h-11 rounded-xl flex flex-col items-center justify-center transition-all duration-150 font-semibold active:scale-[0.96] border ${
                  isAborted
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : isDone
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                }`}
                aria-label={`Série ${set.setNumber}`}
              >
                <div className="flex items-center gap-0.5">
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    <span className="text-[11px] font-bold uppercase tracking-tight whitespace-nowrap">
                      Série {set.setNumber}
                    </span>
                  )}
                </div>
                <div
                  className={`text-[10px] leading-tight ${
                    isDone ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  {isDone ? `${set.weightKg}kg` : `${exercise.targetReps}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal de Substituição Rápida */}
      <SubstituteModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        originalExerciseName={exercise.name}
        currentActiveName={log.activeExerciseName}
        substitutes={exercise.substitutes}
        onSelectSubstitute={handleSelectSubstitute}
      />
    </>
  );
};
