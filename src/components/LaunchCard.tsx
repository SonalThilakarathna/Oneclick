import { api, type LaunchTool } from "../lib/api";
import type { useRunner } from "../hooks/useRunner";
import { ActionButton, Card } from "./ui";

type Runner = ReturnType<typeof useRunner>;

const EDITORS: { id: LaunchTool; name: string }[] = [
  { id: "vscode", name: "VS Code" },
  { id: "cursor", name: "Cursor" },
  { id: "antigravity", name: "Antigravity" },
];

const AI_CLIS: { id: LaunchTool; name: string }[] = [
  { id: "claude", name: "Claude Code" },
  { id: "codex", name: "Codex" },
];

export function LaunchCard({
  projectDir,
  available,
  runner,
}: {
  projectDir: string | null;
  /** null until PATH detection finishes (buttons stay enabled meanwhile). */
  available: Record<LaunchTool, boolean> | null;
  runner: Runner;
}) {
  const launch = (tool: { id: LaunchTool; name: string }) =>
    projectDir && runner.run(`Launch: ${tool.name}`, () => api.launchTool(tool.id, projectDir));

  const button = (tool: { id: LaunchTool; name: string }, variant: "primary" | "neutral") => {
    const missing = available !== null && !available[tool.id];
    return (
      <ActionButton
        key={tool.id}
        variant={variant}
        disabled={!projectDir || runner.busy !== null || missing}
        title={missing ? `\`${tool.name}\` was not found on your PATH` : undefined}
        onClick={() => launch(tool)}
      >
        {tool.name}
      </ActionButton>
    );
  };

  return (
    <Card title="Launch" icon="🧰">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Open project in editor</p>
        <div className="grid grid-cols-2 gap-2">
          {EDITORS.map((t) => button(t, "neutral"))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">AI coding CLIs (new terminal)</p>
        <div className="grid grid-cols-2 gap-2">
          {AI_CLIS.map((t) => button(t, "primary"))}
        </div>
      </div>
      {available && Object.values(available).some((v) => !v) && (
        <p className="text-xs text-zinc-500">
          Greyed-out tools aren’t on your PATH. Run <b className="text-zinc-400">Environment Check</b>{" "}
          in the Toolbox for install hints.
        </p>
      )}
    </Card>
  );
}
