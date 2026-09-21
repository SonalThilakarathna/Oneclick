import { useCallback, useEffect, useRef, useState } from "react";
import { onOutput, type ActionResult } from "../lib/api";

export interface LogEntry {
  id: number;
  kind: "cmd" | "stdout" | "stderr" | "info" | "ok" | "err";
  text: string;
}

const MAX_LOG_LINES = 1000;

/**
 * Runs one workflow at a time, streaming backend output into a log.
 * `busy` holds the label of the running workflow (or null when idle).
 */
export function useRunner() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const activeRun = useRef<string | null>(null);
  const nextId = useRef(0);

  const push = useCallback((kind: LogEntry["kind"], text: string) => {
    setLog((prev) => [...prev, { id: nextId.current++, kind, text }].slice(-MAX_LOG_LINES));
  }, []);

  useEffect(() => {
    const unlisten = onOutput((o) => {
      if (o.runId === activeRun.current) push(o.stream, o.line);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [push]);

  const run = useCallback(
    async (label: string, task: (runId: string) => Promise<ActionResult>) => {
      if (activeRun.current) return;
      const runId = crypto.randomUUID();
      activeRun.current = runId;
      setBusy(label);
      push("info", `── ${label} ──`);
      try {
        const result = await task(runId);
        push(result.success ? "ok" : "err", result.message);
        return result;
      } catch (e) {
        push("err", String(e));
      } finally {
        activeRun.current = null;
        setBusy(null);
      }
    },
    [push],
  );

  const clear = useCallback(() => setLog([]), []);

  return { log, busy, run, clear, push };
}
