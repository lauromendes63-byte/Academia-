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

import { getExerciseGuide } from '../utils/exerciseGuide';

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
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200"
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
