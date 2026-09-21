import { useState, type FormEvent } from "react";
import { api, type GitStatus } from "../lib/api";
import type { useRunner } from "../hooks/useRunner";
import { ActionButton, Card, Modal, StatusDot, inputClass, type DotState } from "./ui";

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
  const dot: DotState = busyHere
    ? "busy"
    : !status
      ? "unknown"
      : !status.isRepo
        ? "stopped"
        : status.changed > 0
          ? "busy"
          : "running";
  const label = busyHere
    ? "Working…"
    : !status
      ? "Unknown"
      : !status.isRepo
        ? "No repo"
        : status.changed > 0
          ? `${status.changed} changed`
          : "Clean";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!projectDir || !text) return;
    setOpen(false);
    setMessage("");
    await runner.run("Git: Quick Commit & Push", (runId) =>
      api.gitCommitPush(text, projectDir, runId),
    );
    onDone();
  };

  return (
    <Card title="Git" icon="🌿" status={<StatusDot state={dot} label={label} />}>
      <p className="min-h-5 text-xs text-zinc-500">
        {status?.isRepo
          ? `Branch: ${status.branch ?? "(detached HEAD)"}`
          : (status?.detail ?? "Stage, commit and push in one step.")}
      </p>
      <ActionButton
        variant="primary"
        disabled={!projectDir || !status?.isRepo || runner.busy !== null}
        onClick={() => setOpen(true)}
      >
        Quick Commit & Push
      </ActionButton>

      {open && (
        <Modal title="Commit & push" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <p className="text-xs text-zinc-500">
              Runs <code>git add .</code>, <code>git commit</code> and <code>git push</code> on{" "}
              <b className="text-zinc-300">{status?.branch}</b>.
            </p>
            <input
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Commit message"
              className={inputClass}
            />
            <div className="flex justify-end gap-2">
              <ActionButton onClick={() => setOpen(false)}>Cancel</ActionButton>
              <ActionButton type="submit" variant="primary" disabled={!message.trim()}>
                Commit & Push
              </ActionButton>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
