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
  const disabled = !projectDir || !info?.hasPackageJson || runner.busy !== null;

  const devScript = info?.scripts.includes("dev")
    ? "dev"
    : info?.scripts.includes("start")
      ? "start"
      : null;
  const pm = info?.packageManager ?? "npm";

  const dot: DotState = busyHere
    ? "busy"
    : !info?.hasPackageJson
      ? "unknown"
      : info.hasNodeModules
        ? "running"
        : "stopped";
  const label = busyHere
    ? "Working…"
    : !info
      ? "Unknown"
      : !info.hasPackageJson
        ? "No package.json"
        : info.hasNodeModules
          ? "Deps installed"
          : "Deps missing";

  const install = async () => {
    if (!projectDir) return;
    await runner.run(LABELS.install, (runId) => api.devRun("install", projectDir, runId));
    onDone();
  };
  const build = async () => {
    if (!projectDir) return;
    await runner.run(LABELS.build, (runId) => api.devRun("build", projectDir, runId));
    onDone();
  };

  return (
    <Card
      title="Dev Server"
      icon={<IconPlay />}
      iconTone="play"
      status={<StatusDot state={dot} label={label} />}
    >
      <p className="text-xs leading-relaxed text-zinc-500">
        {info?.detail ??
          (info?.hasPackageJson
            ? `Using ${pm}${devScript ? ` · dev script: ${devScript}` : " · no dev/start script"}`
            : "Run, build and install your Node project.")}
      </p>
      <ActionButton
        variant="success"
        size="lg"
        className="w-full"
        disabled={disabled || !devScript}
        onClick={() =>
          projectDir && runner.run("Dev: Start Server", () => api.devServer(projectDir))
        }
      >
        Run Dev Server
      </ActionButton>
      <ActionRow>
        <ActionButton
          variant="soft"
          size="sm"
          className="flex-1"
          disabled={disabled || !info?.scripts.includes("build")}
          onClick={build}
        >
          Build
        </ActionButton>
        <ActionButton variant="soft" size="sm" className="flex-1" disabled={disabled} onClick={install}>
          Install Deps
        </ActionButton>
      </ActionRow>
    </Card>
  );
}
