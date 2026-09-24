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
  ArrowRightLeft
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

  // If the user aborted this exercise due to fatigue
  const isAborted = log.abortedForFatigue;

  // Current weight in kg for the active exercise
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
          // Start rest timer automatically with exercise specific duration
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

  // Adjust weight across incomplete sets or all sets
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

  // Abort / toggle fatigue
  const handleToggleFatigue = () => {
    triggerHaptic('alert');
    onUpdateLog({
      ...log,
      abortedForFatigue: !isAborted
    });
  };

  // Handle substitute selection
  const handleSelectSubstitute = (chosenName: string) => {
    const isSub = chosenName.toLowerCase() !== exercise.name.toLowerCase();
    onUpdateLog({
      ...log,
      activeExerciseName: chosenName,
      isSubstituted: isSub
    });
  };

  // Format date DD/MM for last performance
  const formattedLastDate = lastPerformance?.date
    ? new Date(lastPerformance.date + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      })
    : null;

  return (
    <>
      <div
        className={`relative bg-white rounded-3xl p-5 border transition-all duration-200 shadow-sm ${
          isAborted
            ? 'border-red-200/80 bg-red-50/20 opacity-80'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* TOP ROW: Muscle Badge, Grip/Form and Actions */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100/60">
                {exercise.muscleGroup}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                {exercise.restSeconds}s descanso
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
              {log.activeExerciseName}
            </h3>

            {/* Grip / Form Cue */}
            <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
              {exercise.gripOrForm}
            </p>
          </div>

          {/* Action buttons: Substituir & Pular por Fadiga (X) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsSubModalOpen(true)}
              className="h-9 px-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
              title="Substituir exercício"
              aria-label="Substituir exercício"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Substituir</span>
            </button>

            <button
              onClick={handleToggleFatigue}
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs active:scale-95 transition-all ${
                isAborted
                  ? 'bg-red-500 text-white shadow-sm shadow-red-200 ring-2 ring-red-400'
                  : 'border border-red-200 bg-red-50 hover:bg-red-100 text-red-600'
              }`}
              title="Pular por Fadiga / Falha física"
              aria-label="Pular por Fadiga"
            >
              <span className="text-sm font-black">✕</span>
            </button>
          </div>
        </div>

        {/* FATIGUE BANNER IF ABORTED */}
        {isAborted && (
          <div className="mb-3 p-2.5 rounded-2xl bg-red-100/70 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-semibold">Exercício interrompido por fadiga muscular</span>
            </div>
            <button
              onClick={handleToggleFatigue}
              className="text-[11px] underline font-bold hover:text-red-950"
            >
              Reativar
            </button>
          </div>
        )}

        {/* BADGE HISTÓRICO: Último peso e reps */}
        <div className="flex items-center justify-between mb-4 py-2 px-3 rounded-2xl bg-slate-50 border border-slate-100/90 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-medium">
              {lastPerformance ? (
                <>
                  Último:{' '}
                  <strong className="text-slate-900 font-bold">
                    {lastPerformance.weightKg} kg × {lastPerformance.reps} reps
                  </strong>
                  {formattedLastDate && (
                    <span className="text-slate-400 font-normal ml-1">
                      (em {formattedLastDate})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-400">
                  Primeira sessão registrada nesta carga
                </span>
              )}
            </span>
          </div>

          <span className="text-[11px] font-bold text-slate-500">
            Alvo: {exercise.targetReps} reps
          </span>
        </div>

        {/* CONTROLE DE CARGA (Zero Fricção com [-2kg] [+2kg]) */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Carga da Série
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAdjustWeight(-2)}
              disabled={isAborted || currentWeight <= 0}
              className="h-10 px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-0.5 active:scale-95 transition-all disabled:opacity-40"
              aria-label="Diminuir 2 quilos"
            >
              <Minus className="w-3.5 h-3.5" />
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
                className="w-16 h-10 text-center text-base font-black text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
              />
              <span className="ml-1.5 text-xs font-bold text-slate-400">kg</span>
            </div>

            <button
              onClick={() => handleAdjustWeight(2)}
              disabled={isAborted}
              className="h-10 px-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-0.5 active:scale-95 transition-all disabled:opacity-40"
              aria-label="Aumentar 2 quilos"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>2kg</span>
            </button>
          </div>
        </div>

        {/* BOTÕES DE SÉRIES (Blocos Arredondados com 1-Tap) */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Marcar Séries ({log.sets.filter((s) => s.completed).length}/{log.sets.length})
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {log.sets.map((set, idx) => {
              const isDone = set.completed;
              return (
                <button
                  key={set.setNumber}
                  onClick={() => handleToggleSet(idx)}
                  disabled={isAborted}
                  className={`h-13 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 font-semibold active:scale-[0.96] border min-h-[52px] ${
                    isAborted
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : isDone
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200 scale-[1.02]'
                      : 'bg-slate-50 border-slate-200/90 text-slate-700 hover:bg-slate-100'
                  }`}
                  aria-label={`Série ${set.setNumber} ${isDone ? 'Concluída' : 'Pendente'}`}
                >
                  <div className="flex items-center gap-1">
                    {isDone ? (
                      <Check className="w-4 h-4 stroke-[3] animate-in zoom-in-50 duration-150" />
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Série {set.setNumber}
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[11px] font-medium ${
                      isDone ? 'text-emerald-100' : 'text-slate-400'
                    }`}
                  >
                    {isDone ? `${set.weightKg}kg feita` : `${exercise.targetReps} reps`}
                  </div>
                </button>
              );
            })}
          </div>
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
