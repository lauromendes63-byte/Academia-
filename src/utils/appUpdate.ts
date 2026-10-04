import { useState, useEffect } from 'react';
import { triggerHaptic } from './audio';

declare const __APP_VERSION__: string;
declare const __APP_BUILD_ID__: string;
declare const __APP_BUILD_TIME__: string;

export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.1.0';
export const APP_BUILD_ID =
  typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : '2.1.0-local';
export const APP_BUILD_TIME =
  typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : 'Hoje';

interface UpdateState {
  updateAvailable: boolean;
  remoteVersion: string | null;
  isChecking: boolean;
  isUpdating: boolean;
  dismissed: boolean;
  lastCheckedAt: string | null;
}

let state: UpdateState = {
  updateAvailable: false,
  remoteVersion: null,
  isChecking: false,
  isUpdating: false,
  dismissed: false,
  lastCheckedAt: null
};

const listeners = new Set<() => void>();
let swRegistration: ServiceWorkerRegistration | null = null;
let initialized = false;

function setState(partial: Partial<UpdateState>) {
  state = { ...state, ...partial };
  listeners.forEach((fn) => fn());
}

/**
 * Monitors a ServiceWorkerRegistration for waiting or installing workers.
 */
function watchRegistration(reg: ServiceWorkerRegistration) {
  swRegistration = reg;

  if (reg.waiting) {
    setState({ updateAvailable: true });
  }

  reg.addEventListener('updatefound', () => {
    const newWorker = reg.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        triggerHaptic('light');
        setState({ updateAvailable: true, dismissed: false });
      }
    });
  });
}

/**
 * Checks both Service Worker and /version.json (bypassing cache) for new builds.
 */
export async function checkForAppUpdate(manual = false): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (state.isChecking) return state.updateAvailable;

  setState({ isChecking: true });

  try {
    let foundNew = false;

    // 1. Check Service Worker registration
    if ('serviceWorker' in navigator) {
      const reg =
        swRegistration || (await navigator.serviceWorker.getRegistration());
      if (reg) {
        watchRegistration(reg);
        await reg.update().catch(() => {});
        if (reg.waiting) {
          foundNew = true;
        }
      }
    }

    // 2. Check live /version.json bypassing any browser/SW cache
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.buildId && data.buildId !== APP_BUILD_ID) {
          foundNew = true;
          setState({
            remoteVersion: data.version || APP_VERSION
          });
        }
      }
    } catch {
      // Offline or dev server without version.json
    }

    const nowTime = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    if (foundNew) {
      setState({
        updateAvailable: true,
        dismissed: manual ? false : state.dismissed,
        isChecking: false,
        lastCheckedAt: nowTime
      });
      return true;
    }

    setState({
      isChecking: false,
      lastCheckedAt: nowTime
    });
    return state.updateAvailable;
  } catch {
    setState({ isChecking: false });
    return state.updateAvailable;
  }
}

/**
 * Activates the new Service Worker, cleans outdated asset caches (never touches IndexedDB!),
 * and reloads the app into the latest version.
 */
export async function applyAppUpdate(): Promise<void> {
  if (typeof window === 'undefined' || state.isUpdating) return;

  triggerHaptic('success');
  setState({ isUpdating: true });

  let reloaded = false;
  const safeReload = () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  };

  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        safeReload();
      });

      const reg =
        swRegistration || (await navigator.serviceWorker.getRegistration());

      if (reg) {
        await reg.update().catch(() => {});
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          setTimeout(safeReload, 700);
          return;
        }
      }
    }

    // If detected via /version.json or SW already skipped waiting, clear old workbox precache and reload
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.includes('workbox') || k.includes('precache'))
          .map((k) => caches.delete(k))
      );
    }
  } catch {
    // Fallback to direct reload
  }

  setTimeout(safeReload, 250);
}

export function dismissUpdateBanner() {
  triggerHaptic('light');
  setState({ dismissed: true });
}

function initUpdateWatcher() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        watchRegistration(reg);
      }
    });
  }

  // Initial check shortly after startup
  setTimeout(() => {
    checkForAppUpdate(false);
  }, 1500);

  // Check whenever user brings the app to foreground / unlocks phone
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForAppUpdate(false);
    }
  });

  // Check when internet reconnects
  window.addEventListener('online', () => {
    checkForAppUpdate(false);
  });

  // Periodic background check every 2 minutes while app is open
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      checkForAppUpdate(false);
    }
  }, 120 * 1000);
}

export function useAppUpdate() {
  const [snap, setSnap] = useState<UpdateState>(state);

  useEffect(() => {
    initUpdateWatcher();
    const listener = () => setSnap({ ...state });
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    ...snap,
    version: APP_VERSION,
    buildId: APP_BUILD_ID,
    buildTime: APP_BUILD_TIME,
    checkForUpdate: checkForAppUpdate,
    applyUpdate: applyAppUpdate,
    dismissBanner: dismissUpdateBanner
  };
}
