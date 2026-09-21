import { useState } from "react";
import { api, type ServiceStatus, type SupabaseAction } from "../lib/api";
import type { useRunner } from "../hooks/useRunner";
import { ActionButton, Card, ConfirmDialog, StatusDot, type DotState } from "./ui";

type Runner = ReturnType<typeof useRunner>;

const LABELS: Record<SupabaseAction, string> = {
  start: "Supabase: Start Local",
  stop: "Supabase: Stop Local",
  reset: "Supabase: Reset DB",
  deploy: "Supabase: Deploy to Remote",
};

export function SupabaseCard({
  projectDir,
  status,
  runner,
  onDone,
}: {
  projectDir: string | null;
  status: ServiceStatus | null;
  runner: Runner;
  onDone: () => void;
}) {
  const [confirm, setConfirm] = useState<"reset" | "deploy" | null>(null);
  const disabled = !projectDir || runner.busy !== null;

  const run = async (action: SupabaseAction) => {
    if (!projectDir) return;
    await runner.run(LABELS[action], (runId) => api.supabaseRun(action, projectDir, runId));
    onDone();
  };

  const busyHere = runner.busy?.startsWith("Supabase");
  const dot: DotState = busyHere ? "busy" : (status?.state ?? "unknown");
  const label = busyHere
    ? "Working…"
    : status?.state === "running"
      ? "Running"
      : status?.state === "stopped"
        ? "Stopped"
        : "Unknown";

  return (
    <Card title="Supabase" icon="⚡" status={<StatusDot state={dot} label={label} />}>
      <p className="min-h-5 text-xs text-zinc-500">
        {status?.detail ?? "Local stack via the Supabase CLI and Docker."}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <ActionButton variant="primary" disabled={disabled} onClick={() => run("start")}>
          Start Local
        </ActionButton>
        <ActionButton disabled={disabled} onClick={() => run("stop")}>
          Stop Local
        </ActionButton>
        <ActionButton disabled={disabled} onClick={() => setConfirm("reset")}>
          Reset DB
        </ActionButton>
        <ActionButton disabled={disabled} onClick={() => setConfirm("deploy")}>
          Deploy to Remote
        </ActionButton>
      </div>

      {confirm === "reset" && (
        <ConfirmDialog
          danger
          title="Reset local database?"
          body="This drops the local database and re-applies all migrations and seed data. Local data will be lost."
          confirmLabel="Reset DB"
          onConfirm={() => run("reset")}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "deploy" && (
        <ConfirmDialog
          title="Push migrations to remote?"
          body="Runs `supabase db push --yes` against the linked remote project. Make sure the project is linked and the migrations are what you expect."
          confirmLabel="Deploy"
          onConfirm={() => run("deploy")}
          onClose={() => setConfirm(null)}
        />
      )}
    </Card>
  );
}
