import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback
} from 'react';
import { playTimerFinishSound, triggerHaptic } from '../utils/audio';

interface RestTimerContextType {
  isActive: boolean;
  isPaused: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  exerciseName: string;
  startTimer: (seconds: number, exerciseName: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  addTime: (seconds: number) => void;
}

const RestTimerContext = createContext<RestTimerContextType | undefined>(undefined);

export const RestTimerProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(90);
  const [remainingSeconds, setRemainingSeconds] = useState(90);
  const [exerciseName, setExerciseName] = useState('');

  const timerRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    setIsPaused(false);
  }, []);

  const startTimer = useCallback(
    (seconds: number, name: string) => {
      stopTimer();
      setTotalSeconds(seconds);
      setRemainingSeconds(seconds);
      setExerciseName(name);
      setIsActive(true);
      setIsPaused(false);
      triggerHaptic('light');
    },
    [stopTimer]
  );

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    setIsPaused(false);
  }, []);

  const addTime = useCallback((secs: number) => {
    setRemainingSeconds((prev) => Math.max(5, prev + secs));
    setTotalSeconds((prev) => Math.max(prev, prev + (secs > 0 ? secs : 0)));
    triggerHaptic('light');
  }, []);

  useEffect(() => {
    if (!isActive || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Timer finished
          playTimerFinishSound();
          triggerHaptic('alert');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, isPaused]);

  // When timer reaches 0, keep it active briefly showing "Pronto!" then auto dismiss after 4s
  useEffect(() => {
    if (isActive && remainingSeconds === 0) {
      const timeout = setTimeout(() => {
        stopTimer();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isActive, remainingSeconds, stopTimer]);

  return (
    <RestTimerContext.Provider
      value={{
        isActive,
        isPaused,
        totalSeconds,
        remainingSeconds,
        exerciseName,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        addTime
      }}
    >
      {children}
    </RestTimerContext.Provider>
  );
};

export function useRestTimer(): RestTimerContextType {
  const context = useContext(RestTimerContext);
  if (!context) {
    throw new Error('useRestTimer must be used within a RestTimerProvider');
  }
  return context;
}
