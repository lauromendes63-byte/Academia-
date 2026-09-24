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
    <aside
      aria-label="Cronômetro de Descanso"
      className="fixed bottom-[74px] left-3 right-3 z-40 max-w-md mx-auto transition-all duration-300 ease-out"
    >
      <div
        className={`relative overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md px-3.5 py-2.5 transition-all ${
          isFinished
            ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20'
            : 'bg-slate-900/95 border-slate-800 text-white shadow-slate-950/30'
        }`}
      >
        {/* Progress Bar Top Edge */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-linear ${
              isFinished ? 'bg-white w-full' : 'bg-blue-400'
            }`}
            style={{ width: isFinished ? '100%' : `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2.5">
          {/* Left: Time and Exercise info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`flex items-center justify-center px-2 py-1 rounded-lg font-mono font-bold text-sm tracking-tight shrink-0 ${
                isFinished
                  ? 'bg-white text-emerald-700 animate-pulse'
                  : 'bg-white/10 text-white border border-white/10'
              }`}
            >
              {isFinished ? <BellRing className="w-4 h-4 animate-bounce" /> : timeFormatted}
            </div>

            <div className="min-w-0 truncate">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-none">
                {isFinished ? 'Pronto!' : 'Descanso'}
              </div>
              <div className="text-xs font-semibold truncate text-white leading-tight mt-0.5">
                {isFinished ? 'Próxima série!' : exerciseName || 'Recuperação'}
              </div>
            </div>
          </div>

          {/* Right: Sleek Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isFinished && (
              <>
                <button
                  onClick={() => addTime(-15)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center text-[10px] font-bold active:scale-90 transition-transform"
                  title="-15 segundos"
                  aria-label="-15s"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => addTime(30)}
                  className="px-2 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center text-[10px] font-bold active:scale-90 transition-transform gap-0.5"
                  title="+30 segundos"
                  aria-label="+30s"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>30s</span>
                </button>
                <button
                  onClick={isPaused ? resumeTimer : pauseTimer}
                  className="w-7 h-7 rounded-lg bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center active:scale-90 transition-transform"
                  title={isPaused ? 'Continuar' : 'Pausar'}
                  aria-label={isPaused ? 'Continuar' : 'Pausar'}
                >
                  {isPaused ? <Play className="w-3 h-3 fill-current ml-0.5" /> : <Pause className="w-3 h-3" />}
                </button>
              </>
            )}

            <button
              onClick={stopTimer}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center active:scale-90 transition-transform"
              title="Fechar timer"
              aria-label="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
