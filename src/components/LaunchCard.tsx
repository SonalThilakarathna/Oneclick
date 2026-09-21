import { api, type LaunchTool } from "../lib/api";
import type { useRunner } from "../hooks/useRunner";
import { IconLaunch } from "./icons";
import { Card } from "./ui";

type Runner = ReturnType<typeof useRunner>;

interface ToolOption {
  id: LaunchTool;
  name: string;
}

const EDITORS: ToolOption[] = [
  { id: "vscode", name: "VS Code" },
  { id: "cursor", name: "Cursor" },
  { id: "antigravity", name: "Antigravity" },
];

const AI_CLIS: ToolOption[] = [
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
  const launch = (tool: ToolOption) => {
    if (!projectDir) return;
    void runner.run(`Launch: ${tool.name}`, () =>
      api.launchTool(tool.id, projectDir)
    );
  };

  const renderToolGroup = (groupTitle: string, tools: ToolOption[]) => (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {groupTitle}
      </span>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {tools.map((tool) => {
          const isMissing = available !== null && !available[tool.id];
          const isDisabled = !projectDir || runner.busy !== null || isMissing;

          return (
            <button
              key={tool.id}
              type="button"
              disabled={isDisabled}
              onClick={() => launch(tool)}
              title={
                isMissing
                  ? `"${tool.name}" executable was not found on your system PATH`
                  : !projectDir
                  ? "Select a project workspace first"
                  : `Open workspace in ${tool.name}`
              }
              className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-all ring-1 ${
                isDisabled
                  ? "cursor-not-allowed bg-white/[0.02] text-zinc-600 ring-white/[0.04]"
                  : "bg-[#0e0e0e] text-zinc-200 ring-white/[0.08] hover:bg-white/[0.06] hover:text-white hover:ring-white/20 active:scale-[0.98]"
              }`}
            >
              <span className="truncate">{tool.name}</span>
              {available !== null && (
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                    isMissing
                      ? "bg-zinc-700"
                      : "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const hasMissingTools =
    available && Object.values(available).some((v) => !v);

  return (
    <Card title="Launch" icon={<IconLaunch />} iconTone="launch">
      <div className="flex flex-col gap-4">
        {renderToolGroup("Code Editors", EDITORS)}
        {renderToolGroup("AI Coding CLIs", AI_CLIS)}

        {hasMissingTools && (
          <div className="rounded-xl bg-white/[0.02] p-2.5 text-[11px] leading-relaxed text-zinc-500 ring-1 ring-white/[0.04]">
            Disabled items were not detected on system <code className="text-zinc-400">PATH</code>. Run{" "}
            <span className="font-medium text-zinc-300">Environment Check</span> in Toolbox for setup instructions.
          </div>
        )}
      </div>
    </Card>
  );
}