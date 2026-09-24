import React from 'react';
import { useRestTimer } from '../context/RestTimerContext';
import { Play, Pause, X, Plus, Minus, BellRing } from 'lucide-react';

export const RestTimerBar: React.FC = () => {
  const {
    isActive,
    isPaused,
    totalSeconds,
    remainingSeconds,
    exerciseName,
    pauseTimer,
    resumeTimer,
    stopTimer,
    addTime
  } = useRestTimer();

  if (!isActive) return null;

  const progressPercent = Math.max(
    0,
    Math.min(100, (remainingSeconds / totalSeconds) * 100)
  );
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isFinished = remainingSeconds === 0;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-40 max-w-md mx-auto transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4">
      <div
        className={`relative overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md p-3.5 transition-colors ${
          isFinished
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-emerald-100'
            : 'bg-white/95 border-slate-200/80 text-slate-800 shadow-slate-200/70'
        }`}
      >
        {/* Progress Bar Top Edge */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-linear ${
              isFinished ? 'bg-emerald-500 w-full' : 'bg-blue-600'
            }`}
            style={{ width: isFinished ? '100%' : `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          {/* Left: Time and Exercise info */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex items-center justify-center w-11 h-11 rounded-xl font-bold font-mono text-lg shrink-0 transition-transform ${
                isFinished
                  ? 'bg-emerald-500 text-white animate-bounce'
                  : 'bg-blue-50 text-blue-600 border border-blue-100'
              }`}
            >
              {isFinished ? <BellRing className="w-5 h-5" /> : timeFormatted}
            </div>

            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {isFinished ? 'Tempo Esgotado!' : 'Descanso Ativo'}
              </div>
              <div className="text-sm font-semibold truncate text-slate-800">
                {isFinished ? 'Bora pra próxima série!' : exerciseName || 'Descanso'}
              </div>
            </div>
          </div>

          {/* Right: Quick Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isFinished && (
              <>
                <button
                  onClick={() => addTime(-15)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold active:scale-95 transition-transform"
                  title="Diminuir 15 segundos"
                  aria-label="-15s"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => addTime(30)}
                  className="px-2 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold active:scale-95 transition-transform gap-0.5"
                  title="Aumentar 30 segundos"
                  aria-label="+30s"
                >
                  <Plus className="w-3 h-3" />
                  <span>30s</span>
                </button>
                <button
                  onClick={isPaused ? resumeTimer : pauseTimer}
                  className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center active:scale-95 transition-transform"
                  title={isPaused ? 'Continuar' : 'Pausar'}
                  aria-label={isPaused ? 'Continuar' : 'Pausar'}
                >
                  {isPaused ? <Play className="w-4 h-4 fill-current ml-0.5" /> : <Pause className="w-4 h-4" />}
                </button>
              </>
            )}

            <button
              onClick={stopTimer}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center active:scale-95 transition-transform"
              title="Fechar timer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
