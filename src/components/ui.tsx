import type { ButtonHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "../hooks/useRunner";

// ── Utility ───────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Status dot ────────────────────────────────────────────────────────────

export type DotState = "running" | "stopped" | "unknown" | "busy";

const DOT: Record<DotState, string> = {
  running: "bg-white shadow-[0_0_8px_rgba(255,255,255,0.35)]",
  stopped: "bg-zinc-600",
  unknown: "bg-zinc-700",
  busy: "bg-zinc-300 animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.25)]",
};

export function StatusDot({ state, label }: { state: DotState; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wide text-zinc-400">
      <span className={cn("h-1.5 w-1.5 rounded-full transition-all duration-300", DOT[state])} aria-hidden />
      {label}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────

const ICON_TINT: Record<string, string> = {
  stack: "text-zinc-400 bg-white/[0.04]",
  branch: "text-zinc-400 bg-white/[0.04]",
  play: "text-zinc-400 bg-white/[0.04]",
  launch: "text-zinc-400 bg-white/[0.04]",
  wrench: "text-zinc-400 bg-white/[0.04]",
  request: "text-zinc-300 bg-white/[0.06] ring-1 ring-white/10",
  folder: "text-zinc-400 bg-white/[0.04]",
  accent: "text-zinc-200 bg-white/[0.08] ring-1 ring-white/12",
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
      className={cn(
        "flex flex-col gap-3.5 rounded-2xl bg-card px-4 py-4 ring-1 ring-white/[0.06] transition-all",
        className
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <h2 className="flex items-center gap-2.5 text-[13px] font-semibold tracking-wide text-white">
          <span
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-colors",
              ICON_TINT[iconTone] || ICON_TINT.wrench
            )}
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
  "w-full rounded-lg border-0 bg-well px-3 py-2 text-xs text-white ring-1 ring-inset ring-white/[0.07] placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/25 disabled:opacity-40 font-mono transition-all";

export const textareaClass = cn(inputClass, "resize-none leading-relaxed");

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(textareaClass, className)} {...props} />;
}

// ── Buttons ───────────────────────────────────────────────────────────────

type Variant = "primary" | "success" | "outline" | "soft" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  /* Mid-grey primary — readable without stealing focus from content */
  primary:
    "bg-[#2e2e2e] text-zinc-100 font-medium ring-1 ring-inset ring-white/10 hover:bg-[#383838] hover:text-white active:bg-[#424242]",
  success:
    "bg-[#2e2e2e] text-zinc-100 font-medium ring-1 ring-inset ring-white/10 hover:bg-[#383838] hover:text-white active:bg-[#424242]",
  outline:
    "bg-transparent text-zinc-300 ring-1 ring-inset ring-white/10 hover:bg-white/[0.04] hover:text-zinc-100 hover:ring-white/16 active:bg-white/[0.06]",
  soft: "bg-well text-zinc-400 hover:bg-[#2a2a2a] hover:text-zinc-200 active:bg-[#303030]",
  danger: "bg-transparent text-zinc-500 ring-1 ring-inset ring-white/8 hover:bg-white/[0.04] hover:text-zinc-300",
  ghost: "bg-transparent text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300 active:bg-white/[0.06]",
};

const SIZE: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-[11px]",
  md: "px-3 py-2 text-xs",
  lg: "px-4 py-2.5 text-xs font-semibold",
};

export function ActionButton({
  variant = "soft",
  size = "md",
  loading = false,
  icon,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]",
        VARIANT[variant],
        SIZE[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon && <span className="opacity-80">{icon}</span>
      )}
      {children}
    </button>
  );
}

export function ActionRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
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
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-modal p-5 shadow-2xl shadow-black/60 ring-1 ring-white/[0.08]"
      >
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-white">{title}</h3>
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
      <p className="mb-5 text-xs leading-relaxed text-zinc-400">{body}</p>
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
  cmd: "text-zinc-100 font-semibold",
  stdout: "text-zinc-400",
  stderr: "text-zinc-300",
  info: "text-zinc-600",
  ok: "text-white",
  err: "text-zinc-200",
};

export function LogConsole({ log, onClear }: { log: LogEntry[]; onClear: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    // Smart Auto-Scroll: Only scroll down if user is already near bottom (<= 40px)
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 40;
    if (isAtBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [log]);

  const handleCopy = () => {
    const fullText = log.map((l) => l.text).join("\n");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="flex h-56 shrink-0 flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-white/[0.06]">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
            Output Stream
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {log.length > 0 && (
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Clear
          </button>
        </div>
      </header>
      <div
        ref={bodyRef}
        className="min-h-0 flex-1 overflow-y-auto bg-[#0a0a0a] px-4 py-3 font-mono text-[11px] leading-5 text-zinc-400 selection:bg-white/20 selection:text-white"
      >
        {log.length === 0 ? (
          <p className="text-zinc-600 italic">Command output will appear here...</p>
        ) : (
          log.map((l) => (
            <div key={l.id} className={cn("whitespace-pre-wrap break-words", LOG_COLOR[l.kind] || "text-zinc-300")}>
              {l.text}
            </div>
          ))
        )}
      </div>
    </section>
  );
}