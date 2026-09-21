import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Polls `fetcher` every `intervalMs` while `enabled`, pausing when the window is hidden.
 * Overlapping calls are skipped, and stale results from an old `fetcher` are dropped.
 */
export function usePolling<T>(
  fetcher: (() => Promise<T>) | null,
  intervalMs: number,
  enabled = true,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!fetcher || inFlight.current) return;
    inFlight.current = true;
    const gen = generation.current;
    try {
      const result = await fetcher();
      if (gen === generation.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (gen === generation.current) setError(String(e));
    } finally {
      inFlight.current = false;
    }
  }, [fetcher]);

  useEffect(() => {
    generation.current += 1;
    setData(null);
    setError(null);
    if (!fetcher || !enabled) return;

    void refresh();
    const id = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [fetcher, enabled, intervalMs, refresh]);

  return { data, error, refresh };
}
