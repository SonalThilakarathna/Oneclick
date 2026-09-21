import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useRef } from "react";
import type { LogEntry } from "../hooks/useRunner";

// ── Status dot ────────────────────────────────────────────────────────────

export type DotState = "running" | "stopped" | "unknown" | "busy";

const DOT: Record<DotState, string> = {
  running: "bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/70",
  stopped: "bg-red-500 shadow-[0_0_8px] shadow-red-500/60",
  unknown: "bg-zinc-500",
  busy: "bg-amber-400 animate-pulse shadow-[0_0_8px] shadow-amber-400/60",
};

export function StatusDot({ state, label }: { state: DotState; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-zinc-400">
      <span className={`h-2.5 w-2.5 rounded-full ${DOT[state]}`} aria-hidden />
      {label}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────

export function Card({
  title,
  icon,
  status,
  children,
}: {
  title: string;
  icon: string;
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-5">
      <header className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-100">
          <span aria-hidden>{icon}</span>
          {title}
        </h2>
        {status}
      </header>
      {children}
    </section>
  );
}

// ── Form fields ───────────────────────────────────────────────────────────

export const inputClass =
  "rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none disabled:opacity-40";

// ── Buttons ───────────────────────────────────────────────────────────────

type Variant = "primary" | "neutral" | "danger";

const VARIANT: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500",
  neutral: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
  danger: "bg-red-600/90 text-white hover:bg-red-500",
};

export function ActionButton({
  variant = "neutral",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[variant]} ${className}`}
      {...props}
    />
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
      >
        <h3 className="mb-3 text-base font-semibold text-zinc-100">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="mb-5 text-sm text-zinc-400">{body}</p>
      <div className="flex justify-end gap-2">
        <ActionButton onClick={onClose}>Cancel</ActionButton>
        <ActionButton
          variant={danger ? "danger" : "primary"}
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {confirmLabel}
        </ActionButton>
      </div>
    </Modal>
  );
}

// ── Log console ───────────────────────────────────────────────────────────


const LOG_COLOR: Record<LogEntry["kind"], string> = {
  cmd: "text-indigo-300",
  stdout: "text-zinc-300",
  stderr: "text-amber-300",
  info: "text-zinc-500",
  ok: "text-emerald-400",
  err: "text-red-400",
};

export function LogConsole({ log, onClear }: { log: LogEntry[]; onClear: () => void }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [log]);

  return (
    <section className="flex h-44 shrink-0 flex-col rounded-xl border border-zinc-800 bg-black/40">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <h2 className="text-sm font-semibold text-zinc-300">Output</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Clear
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-5">
        {log.length === 0 ? (
          <p className="text-zinc-600">Command output will appear here.</p>
        ) : (
          log.map((l) => (
            <div key={l.id} className={`whitespace-pre-wrap break-words ${LOG_COLOR[l.kind]}`}>
              {l.text}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}
