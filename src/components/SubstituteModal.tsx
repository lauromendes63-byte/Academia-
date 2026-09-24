import React from 'react';
import { X, Check, RefreshCw } from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface SubstituteModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalExerciseName: string;
  currentActiveName: string;
  substitutes: string[];
  onSelectSubstitute: (selectedName: string) => void;
}

export const SubstituteModal: React.FC<SubstituteModalProps> = ({
  isOpen,
  onClose,
  originalExerciseName,
  currentActiveName,
  substitutes,
  onSelectSubstitute
}) => {
  if (!isOpen) return null;

  // Options include original exercise + substitutes
  const allOptions = [originalExerciseName, ...substitutes.filter((s) => s !== originalExerciseName)];

  const handleSelect = (name: string) => {
    triggerHaptic('light');
    onSelectSubstitute(name);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Substituir Exercício
              </h3>
              <p className="text-xs text-slate-500">
                Toque na alternativa para trocar hoje
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-2.5">
          {allOptions.map((opt, idx) => {
            const isSelected = opt.toLowerCase() === currentActiveName.toLowerCase();
            const isOriginal = opt.toLowerCase() === originalExerciseName.toLowerCase();

            return (
              <button
                key={idx}
                onClick={() => handleSelect(opt)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between min-h-[58px] active:scale-[0.98] ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70 text-blue-900 shadow-xs'
                    : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div>
                  <div className="font-semibold text-sm leading-snug">{opt}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {isOriginal ? 'Exercício original da rotina' : 'Variação equivalente recomendada'}
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border border-slate-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm active:scale-[0.98] transition-all"
          >
            Manter Atual
          </button>
        </div>
      </div>
    </div>
  );
};
