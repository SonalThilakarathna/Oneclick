import { api, type DevAction, type ProjectInfo } from "../lib/api";
import type { useRunner } from "../hooks/useRunner";
import { IconPlay } from "./icons";
import { ActionButton, ActionRow, Card, StatusDot, type DotState } from "./ui";

type Runner = ReturnType<typeof useRunner>;

const LABELS: Record<DevAction, string> = {
  install: "Dev: Install Dependencies",
  build: "Dev: Build",
};

export function DevCard({
  projectDir,
  info,
  runner,
  onDone,
}: {
  projectDir: string | null;
  info: ProjectInfo | null;
  runner: Runner;
  onDone: () => void;
}) {
  const busyHere = runner.busy?.startsWith("Dev");
  const hasPkg = Boolean(info?.hasPackageJson);
  const disabled = !projectDir || !hasPkg || runner.busy !== null;

  const devScript = info?.scripts.includes("dev")
    ? "dev"
    : info?.scripts.includes("start")
    ? "start"
    : null;

  const pm = info?.packageManager ?? "npm";
  const hasDeps = Boolean(info?.hasNodeModules);

  const dot: DotState = busyHere
    ? "busy"
    : !hasPkg
    ? "unknown"
    : hasDeps
    ? "running"
    : "stopped";

  const label = busyHere
    ? "Working…"
    : !info
    ? "Unknown"
    : !hasPkg
    ? "No package.json"
    : hasDeps
    ? "Deps Installed"
    : "Missing node_modules";

  const install = async () => {
    if (!projectDir) return;
    await runner.run(LABELS.install, (runId) =>
      api.devRun("install", projectDir, runId)
    );
    onDone();
  };

  const build = async () => {
    if (!projectDir) return;
    await runner.run(LABELS.build, (runId) =>
      api.devRun("build", projectDir, runId)
    );
    onDone();
  };

  const startServer = async () => {
    if (!projectDir) return;
    await runner.run("Dev: Start Server", () => api.devServer(projectDir));
  };

  return (
    <Card
      title="Dev Server"
      icon={<IconPlay />}
      iconTone="play"
      status={<StatusDot state={dot} label={label} />}
    >
      {/* Script & Package Manager Metadata */}
      {hasPkg ? (
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">Environment</span>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-zinc-300 ring-1 ring-white/10">
              {pm}
            </span>
            {devScript && (
              <span className="rounded-md bg-brand-500/10 px-2 py-0.5 text-brand-400 ring-1 ring-brand-500/20">
                {pm} run {devScript}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-zinc-500">
          {info?.detail ?? "No Node.js project or package.json detected in root."}
        </p>
      )}

      {/* Main Dev Action */}
      <ActionRow>
        {!hasDeps && hasPkg ? (
          <ActionButton
            variant="primary"
            size="md"
            className="w-full justify-center font-medium shadow-sm"
            disabled={disabled}
            onClick={install}
          >
            Install Dependencies First
          </ActionButton>
        ) : (
          <ActionButton
            variant="success"
            size="md"
            className="w-full justify-center font-medium shadow-sm"
            disabled={disabled || !devScript}
            title={!devScript ? "No 'dev' or 'start' script in package.json" : undefined}
            onClick={startServer}
          >
            {devScript ? `Run Dev Server (${pm} run ${devScript})` : "No Dev Script Found"}
          </ActionButton>
        )}
      </ActionRow>

      {/* Secondary Commands */}
      <ActionRow>
        <ActionButton
          variant="soft"
          size="sm"
          className="flex-1 justify-center"
          disabled={disabled || !info?.scripts.includes("build")}
          onClick={build}
        >
          Build
        </ActionButton>
        <ActionButton
          variant="soft"
          size="sm"
          className="flex-1 justify-center"
          disabled={disabled}
          onClick={install}
        >
          Install Deps
        </ActionButton>
      </ActionRow>
    </Card>
  );
}