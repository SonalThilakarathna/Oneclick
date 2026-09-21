import { useEffect, useState } from "react";
import { api, type ServiceStatus, type SupabaseAction } from "../lib/api";
import type { useRunner } from "../hooks/useRunner";
import { IconStack } from "./icons";
import {
  ActionButton,
  ActionRow,
  Card,
  ConfirmDialog,
  Modal,
  StatusDot,
  type DotState,
} from "./ui";

type Runner = ReturnType<typeof useRunner>;

const LABELS: Record<SupabaseAction, string> = {
  start: "Supabase: Start Local",
  stop: "Supabase: Stop Local",
  reset: "Supabase: Reset DB",
  deploy: "Supabase: Deploy to Remote",
};

/** Lists the project's edge functions; deploys all of them or a chosen subset. */
function FunctionsDialog({
  projectDir,
  onDeploy,
  onClose,
}: {
  projectDir: string;
  /** An empty list means "all functions". */
  onDeploy: (functions: string[]) => void;
  onClose: () => void;
}) {
  const [names, setNames] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .supabaseFunctionsList(projectDir)
      .then(setNames)
      .catch((e) => setError(String(e)));
  }, [projectDir]);

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(name)) next.add(name);
      return next;
    });

  const allSelected = names !== null && names.length > 0 && selected.size === names.length;
  const start = (fns: string[]) => {
    onClose();
    onDeploy(fns);
  };

  return (
    <Modal title="Deploy edge functions" onClose={onClose}>
      {error ? (
        <p className="mb-4 text-sm text-rose-400">{error}</p>
      ) : names === null ? (
        <p className="mb-4 text-sm text-zinc-500">Loading functions…</p>
      ) : names.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-500">No edge functions found in supabase/functions.</p>
      ) : (
        <>
          <label className="mb-1 flex cursor-pointer items-center gap-2.5 px-1 py-1.5 text-xs font-medium text-zinc-400">
            <input
              type="checkbox"
              className="accent-brand-500"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(names))}
            />
            Select all ({names.length})
          </label>
          <ul className="mb-4 max-h-56 overflow-y-auto rounded-lg bg-[#0e0e0e] py-1 ring-1 ring-inset ring-white/[0.06]">
            {names.map((name) => (
              <li key={name}>
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 font-mono text-xs text-zinc-300 hover:bg-white/[0.03]">
                  <input
                    type="checkbox"
                    className="accent-brand-500"
                    checked={selected.has(name)}
                    onChange={() => toggle(name)}
                  />
                  {name}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <ActionButton variant="ghost" onClick={onClose}>
          Cancel
        </ActionButton>
        <ActionButton
          variant="outline"
          disabled={!names?.length}
          onClick={() => start([])}
        >
          Deploy all
        </ActionButton>
        <ActionButton
          variant="primary"
          disabled={selected.size === 0}
          onClick={() => start(names!.filter((n) => selected.has(n)))}
        >
          Deploy selected{selected.size > 0 ? ` (${selected.size})` : ""}
        </ActionButton>
      </div>
    </Modal>
  );
}

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
  const [confirm, setConfirm] = useState<"reset" | "deploy" | "functions" | null>(null);
  const disabled = !projectDir || runner.busy !== null;

  const run = async (action: SupabaseAction) => {
    if (!projectDir) return;
    await runner.run(LABELS[action], (runId) => api.supabaseRun(action, projectDir, runId));
    onDone();
  };

  const deployFunctions = async (functions: string[]) => {
    if (!projectDir) return;
    const label = functions.length
      ? `Supabase: Deploy ${functions.length} Function(s)`
      : "Supabase: Deploy All Functions";
    await runner.run(label, (runId) =>
      api.supabaseFunctionsDeploy(functions, projectDir, runId),
    );
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
    <Card
      title="Supabase"
      icon={<IconStack />}
      iconTone="stack"
      status={<StatusDot state={dot} label={label} />}
    >
      <p className="text-xs leading-relaxed text-zinc-500">
        {status?.detail ?? "Local stack via the Supabase CLI and Docker."}
      </p>
      <ActionRow>
        <ActionButton
          variant="success"
          size="lg"
          className="min-w-[7.5rem] flex-1"
          disabled={disabled}
          onClick={() => run("start")}
        >
          Start Local
        </ActionButton>
        <ActionButton variant="outline" size="sm" disabled={disabled} onClick={() => run("stop")}>
          Stop
        </ActionButton>
      </ActionRow>
      <ActionRow>
        <ActionButton
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => setConfirm("deploy")}
        >
          Deploy to Remote
        </ActionButton>
        <ActionButton
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => setConfirm("functions")}
        >
          Deploy Functions…
        </ActionButton>
        <ActionButton
          variant="ghost"
          size="sm"
          className="text-rose-400/80 hover:text-rose-300"
          disabled={disabled}
          onClick={() => setConfirm("reset")}
        >
          Reset DB
        </ActionButton>
      </ActionRow>

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
      {confirm === "functions" && projectDir && (
        <FunctionsDialog
          projectDir={projectDir}
          onDeploy={deployFunctions}
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
