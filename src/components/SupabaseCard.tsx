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

  const allSelected =
    names !== null && names.length > 0 && selected.size === names.length;

  const start = (fns: string[]) => {
    onClose();
    onDeploy(fns);
  };

  return (
    <Modal title="Deploy Edge Functions" onClose={onClose}>
      {error ? (
        <p className="mb-4 text-xs font-medium text-rose-400">{error}</p>
      ) : names === null ? (
        <p className="mb-4 text-xs text-zinc-500">Loading edge functions…</p>
      ) : names.length === 0 ? (
        <p className="mb-4 text-xs text-zinc-500">
          No edge functions found in <code>supabase/functions</code>.
        </p>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between px-1">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-300 select-none">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 accent-brand-500 focus:ring-0"
                checked={allSelected}
                onChange={() =>
                  setSelected(allSelected ? new Set() : new Set(names))
                }
              />
              Select All
            </label>
            <span className="text-[11px] text-zinc-500">
              {selected.size} of {names.length} selected
            </span>
          </div>

          <ul className="mb-4 max-h-56 overflow-y-auto rounded-xl bg-[#0e0e0e] py-1 ring-1 ring-white/[0.08]">
            {names.map((name) => (
              <li key={name}>
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 font-mono text-xs text-zinc-300 transition-colors hover:bg-white/[0.04]">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 accent-brand-500 focus:ring-0"
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

      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3.5">
        <ActionButton variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </ActionButton>
        <div className="flex items-center gap-2">
          <ActionButton
            variant="outline"
            size="sm"
            disabled={!names?.length}
            onClick={() => start([])}
          >
            Deploy All
          </ActionButton>
          <ActionButton
            variant="primary"
            size="sm"
            disabled={selected.size === 0}
            onClick={() => start(names!.filter((n) => selected.has(n)))}
          >
            Deploy Selected {selected.size > 0 ? `(${selected.size})` : ""}
          </ActionButton>
        </div>
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
  const [confirm, setConfirm] = useState<
    "reset" | "deploy" | "functions" | null
  >(null);
  const disabled = !projectDir || runner.busy !== null;

  const run = async (action: SupabaseAction) => {
    if (!projectDir) return;
    await runner.run(LABELS[action], (runId) =>
      api.supabaseRun(action, projectDir, runId)
    );
    onDone();
  };

  const deployFunctions = async (functions: string[]) => {
    if (!projectDir) return;
    const label = functions.length
      ? `Supabase: Deploy ${functions.length} Function(s)`
      : "Supabase: Deploy All Functions";
    await runner.run(label, (runId) =>
      api.supabaseFunctionsDeploy(functions, projectDir, runId)
    );
    onDone();
  };

  const busyHere = runner.busy?.startsWith("Supabase");
  const isRunning = status?.state === "running";
  const dot: DotState = busyHere ? "busy" : status?.state ?? "unknown";
  const label = busyHere
    ? "Working…"
    : isRunning
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
        {status?.detail ?? "Local stack managed via Supabase CLI & Docker."}
      </p>

      {/* Primary Stack Actions */}
      <ActionRow>
        {isRunning ? (
          <>
            <ActionButton
              variant="outline"
              size="md"
              className="flex-1 border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              disabled={disabled}
              onClick={() => run("stop")}
            >
              Stop Stack
            </ActionButton>
            <ActionButton
              variant="soft"
              size="md"
              className="flex-1"
              disabled={disabled}
              onClick={() => run("start")}
            >
              Restart
            </ActionButton>
          </>
        ) : (
          <ActionButton
            variant="success"
            size="md"
            className="w-full justify-center font-medium shadow-sm"
            disabled={disabled}
            onClick={() => run("start")}
          >
            Start Local Stack
          </ActionButton>
        )}
      </ActionRow>

      {/* Remote & Function Deployment Actions */}
      <ActionRow>
        <ActionButton
          variant="soft"
          size="sm"
          className="flex-1 justify-center"
          disabled={disabled}
          onClick={() => setConfirm("functions")}
        >
          Deploy Functions…
        </ActionButton>
        <ActionButton
          variant="soft"
          size="sm"
          className="flex-1 justify-center"
          disabled={disabled}
          onClick={() => setConfirm("deploy")}
        >
          Deploy Remote
        </ActionButton>
      </ActionRow>

      {/* Database Maintenance Section */}
      <div className="mt-1 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
        <span className="text-[11px] font-medium text-zinc-500">
          Database Tools
        </span>
        <ActionButton
          variant="ghost"
          size="sm"
          className="text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-300"
          disabled={disabled}
          onClick={() => setConfirm("reset")}
        >
          Reset DB
        </ActionButton>
      </div>

      {confirm === "reset" && (
        <ConfirmDialog
          danger
          title="Reset local database?"
          body="This drops the local database and re-applies all migrations and seed data. Local data will be permanently lost."
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
          body="Runs `supabase db push --yes` against the linked remote project. Make sure the remote project is linked and your local migrations are verified."
          confirmLabel="Deploy Remote"
          onConfirm={() => run("deploy")}
          onClose={() => setConfirm(null)}
        />
      )}
    </Card>
  );
}