import type { ButtonHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useEffect, useRef } from "react";
import type { LogEntry } from "../hooks/useRunner";

// ── Status dot ────────────────────────────────────────────────────────────

export type DotState = "running" | "stopped" | "unknown" | "busy";

const DOT: Record<DotState, string> = {
  running: "bg-brand-500",
  stopped: "bg-zinc-500",
  unknown: "bg-zinc-700",
  busy: "bg-brand-400 animate-pulse",
};

export function StatusDot({ state, label }: { state: DotState; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wide text-zinc-500">
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[state]}`} aria-hidden />
      {label}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────

/** Icon chips stay muted grey; only `accent` uses the lime token. */
const ICON_TINT: Record<string, string> = {
  stack: "text-zinc-400 bg-white/[0.04]",
  branch: "text-zinc-400 bg-white/[0.04]",
  play: "text-zinc-400 bg-white/[0.04]",
  launch: "text-zinc-400 bg-white/[0.04]",
  wrench: "text-zinc-400 bg-white/[0.04]",
  request: "text-brand-500 bg-brand-500/10",
  folder: "text-zinc-400 bg-white/[0.04]",
  accent: "text-brand-500 bg-brand-500/10",
};

export function Card({
  title,
  icon,
  iconTone = "wrench",
  status,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  iconTone?: keyof typeof ICON_TINT;
  status?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col gap-3.5 rounded-2xl bg-[#121212] px-4 py-4 ${className}`}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-[13px] font-semibold tracking-wide text-white">
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${ICON_TINT[iconTone]}`}
          >
            {icon}
          </span>
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
  "rounded-lg border-0 bg-[#0e0e0e] px-3 py-2 text-sm text-white ring-1 ring-inset ring-white/[0.06] placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-500/40 disabled:opacity-40";

export const textareaClass = `${inputClass} resize-none`;

export function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${textareaClass} ${className}`} {...props} />;
}

// ── Buttons ───────────────────────────────────────────────────────────────

type Variant = "primary" | "success" | "outline" | "soft" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  /* Lime fill + black label — OpenRouter / Denvar primary pattern */
  primary: "bg-brand-500 text-black hover:bg-brand-400",
  success: "bg-brand-500 text-black hover:bg-brand-400",
  outline:
    "bg-transparent text-zinc-200 ring-1 ring-inset ring-white/10 hover:bg-white/[0.04] hover:ring-white/18",
  soft: "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08] hover:text-white",
  danger: "bg-rose-600/90 text-white hover:bg-rose-500",
  ghost: "bg-transparent text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300",
};

const SIZE: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-2.5 text-sm font-semibold",
};

export function ActionButton({
  variant = "soft",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...props}
    />
  );
}

export function ActionRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-[#161616] p-5 shadow-2xl shadow-black/60 ring-1 ring-white/[0.06]"
      >
        <h3 className="mb-3 text-base font-semibold text-white">{title}</h3>
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
        <ActionButton variant="ghost" onClick={onClose}>
          Cancel
        </ActionButton>
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
  cmd: "text-brand-400",
  stdout: "text-zinc-300",
  stderr: "text-amber-300",
  info: "text-zinc-500",
  ok: "text-brand-500",
  err: "text-red-400",
};

export function LogConsole({ log, onClear }: { log: LogEntry[]; onClear: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  return (
    <section className="flex h-56 shrink-0 flex-col rounded-2xl bg-[#0e0e0e]">
      <header className="flex items-center justify-between px-4 py-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
          Output
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] text-zinc-600 transition-colors hover:text-zinc-300"
        >
          Clear
        </button>
      </header>
      <div
        ref={bodyRef}
        className="min-h-0 flex-1 overflow-y-auto border-t border-white/[0.04] px-4 py-3 font-mono text-xs leading-5"
      >
        {log.length === 0 ? (
          <p className="text-zinc-600">Command output will appear here.</p>
        ) : (
          log.map((l) => (
            <div key={l.id} className={`whitespace-pre-wrap break-words ${LOG_COLOR[l.kind]}`}>
              {l.text}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
