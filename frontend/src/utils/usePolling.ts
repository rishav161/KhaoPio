import { useEffect, useRef } from 'react';

/**
 * Runs `callback` on an interval, but only while the browser tab is visible.
 *
 * The POS screens refresh themselves every 5–30s. Left unguarded those timers
 * keep firing in background tabs, so a terminal parked on the checkout screen
 * overnight keeps hitting the API for nothing. Pausing on `visibilitychange`
 * costs nothing when the tab is in front and stops the traffic entirely when
 * it is not.
 *
 * On becoming visible again the callback fires immediately, so the operator
 * never looks at data that went stale while the tab was hidden.
 *
 * `callback` is held in a ref, so an inline arrow function does not restart
 * the timer on every render — only `intervalMs` and `enabled` do.
 */
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      if (timer === null) {
        timer = setInterval(() => saved.current(), intervalMs);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        saved.current();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [intervalMs, enabled]);
}

export default usePolling;
