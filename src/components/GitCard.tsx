import { useState, type FormEvent } from "react";
import { api, type GitStatus } from "../lib/api";
import type { useRunner } from "../hooks/useRunner";
import { IconBranch } from "./icons";
import {
  ActionButton,
  ActionRow,
  Card,
  Modal,
  StatusDot,
  inputClass,
  type DotState,
} from "./ui";

type Runner = ReturnType<typeof useRunner>;

export function GitCard({
  projectDir,
  status,
  runner,
  onDone,
}: {
  projectDir: string | null;
  status: GitStatus | null;
  runner: Runner;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const busyHere = runner.busy?.startsWith("Git");
  const isRepo = Boolean(status?.isRepo);
  const changedCount = status?.changed ?? 0;
  const hasChanges = changedCount > 0;

  const dot: DotState = busyHere
    ? "busy"
    : !status
    ? "unknown"
    : !isRepo
    ? "stopped"
    : hasChanges
    ? "busy"
    : "running";

  const label = busyHere
    ? "Working…"
    : !status
    ? "Unknown"
    : !isRepo
    ? "No Repo"
    : hasChanges
    ? `${changedCount} changed`
    : "Clean";

  const disabled = !projectDir || !isRepo || runner.busy !== null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!projectDir || !text) return;

    setOpen(false);
    setMessage("");

    await runner.run("Git: Quick Commit & Push", (runId) =>
      api.gitCommitPush(text, projectDir, runId)
    );
    onDone();
  };

  return (
    <Card
      title="Git"
      icon={<IconBranch />}
      iconTone="branch"
      status={<StatusDot state={dot} label={label} />}
    >
      {/* Branch & Workspace Overview */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">Active Branch</span>
        {isRepo && status?.branch ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] font-medium text-zinc-200 ring-1 ring-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {status.branch}
          </span>
        ) : (
          <span className="text-xs text-zinc-500 italic">
            {status?.detail ?? "No repository detected"}
          </span>
        )}
      </div>

      {/* Main Action Row */}
      <ActionRow>
        <ActionButton
          variant={hasChanges ? "primary" : "outline"}
          size="md"
          className="w-full justify-center font-medium shadow-sm"
          disabled={disabled || !hasChanges}
          onClick={() => setOpen(true)}
        >
          {hasChanges
            ? `Quick Commit & Push (${changedCount})`
            : "No Uncommitted Changes"}
        </ActionButton>
      </ActionRow>

      {/* Quick Commit & Push Modal */}
      {open && (
        <Modal title="Quick Commit & Push" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="rounded-xl bg-[#0e0e0e] p-3.5 ring-1 ring-white/[0.08]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Target Branch</span>
                <span className="font-mono font-semibold text-brand-400">
                  {status?.branch ?? "main"}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                Executes <code>git add .</code>, <code>git commit -m "..."</code>, and <code>git push</code> directly to origin.
              </p>
            </div>

            <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Commit Message
              <input
                autoFocus
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. feat: add automated workflow runner"
                className={inputClass}
              />
            </label>

            <div className="flex items-center justify-between border-t border-white/[0.06] pt-3.5">
              <span className="text-[11px] text-zinc-500">
                Press <kbd className="rounded bg-white/[0.08] px-1 py-0.5 font-mono text-[10px] text-zinc-400">Enter</kbd> to submit
              </span>
              <div className="flex items-center gap-2">
                <ActionButton variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </ActionButton>
                <ActionButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!message.trim()}
                >
                  Commit & Push
                </ActionButton>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}