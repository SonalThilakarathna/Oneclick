import { api, type LaunchTool } from "../lib/api";
import type { useRunner } from "../hooks/useRunner";
import { IconLaunch } from "./icons";
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

  const button = (tool: { id: LaunchTool; name: string }, variant: "outline" | "soft") => {
    const missing = available !== null && !available[tool.id];
    return (
      <ActionButton
        key={tool.id}
        variant={variant}
        size="sm"
        disabled={!projectDir || runner.busy !== null || missing}
        title={missing ? `\`${tool.name}\` was not found on your PATH` : undefined}
        onClick={() => launch(tool)}
      >
        {tool.name}
      </ActionButton>
    );
  };

  return (
    <Card title="Launch" icon={<IconLaunch />} iconTone="launch">
      <div className="flex flex-col gap-2.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">Editors</p>
        <div className="flex flex-wrap gap-1.5">
          {EDITORS.map((t) => button(t, "soft"))}
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">
          AI coding CLIs
        </p>
        <div className="flex flex-wrap gap-1.5">
          {AI_CLIS.map((t) => button(t, "outline"))}
        </div>
      </div>
      {available && Object.values(available).some((v) => !v) && (
        <p className="text-xs text-zinc-600">
          Greyed-out tools aren’t on your PATH. Run{" "}
          <span className="text-zinc-400">Environment Check</span> in the Toolbox for install hints.
        </p>
      )}
    </Card>
  );
}
