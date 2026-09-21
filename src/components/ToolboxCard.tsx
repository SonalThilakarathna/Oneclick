import { api, type ToolboxAction } from "../lib/api";
import type { useRunner } from "../hooks/useRunner";
import { IconWrench } from "./icons";
import { ActionButton, ActionRow, Card } from "./ui";

type Runner = ReturnType<typeof useRunner>;

interface HelperTool {
  action: ToolboxAction;
  label: string;
  command: string;
  description: string;
}

const TOOLS: HelperTool[] = [
  {
    action: "gitPull",
    label: "Git Pull",
    command: "git pull --ff-only",
    description: "Fast-forward merge remote updates",
  },
  {
    action: "gitLog",
    label: "Recent Commits",
    command: "git log --oneline -n 15",
    description: "View the last 15 commits",
  },
  {
    action: "dockerPs",
    label: "Docker Status",
    command: "docker ps",
    description: "List active containers",
  },
  {
    action: "envCheck",
    label: "Environment Check",
    command: "path check",
    description: "Verify CLI tools on system PATH",
  },
];

export function ToolboxCard({
  projectDir,
  runner,
  onDone,
}: {
  projectDir: string | null;
  runner: Runner;
  onDone: () => void;
}) {
  const disabled = !projectDir || runner.busy !== null;

  const runTool = async (tool: HelperTool) => {
    if (!projectDir) return;
    await runner.run(`Toolbox: ${tool.label}`, (runId) =>
      api.toolboxRun(tool.action, projectDir, runId)
    );
    onDone();
  };

  const openTerminal = () => {
    if (!projectDir) return;
    void runner.run("Toolbox: Open Terminal", () =>
      api.openTerminalHere(projectDir)
    );
  };

  const openFolder = () => {
    if (!projectDir) return;
    void runner.run("Toolbox: Open Folder", () =>
      api.openFolder(projectDir)
    );
  };

  return (
    <Card title="Toolbox" icon={<IconWrench />} iconTone="wrench">
      <p className="text-xs leading-relaxed text-zinc-500">
        Workspace utilities, terminal access, and system diagnostics.
      </p>

      {/* Utility Action List */}
      <div className="flex flex-col gap-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.action}
            type="button"
            disabled={disabled}
            onClick={() => runTool(tool)}
            title={tool.description}
            className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-left transition-all ring-1 ${
              disabled
                ? "cursor-not-allowed bg-white/[0.02] opacity-50 ring-white/[0.04]"
                : "bg-[#0e0e0e] ring-white/[0.08] hover:bg-white/[0.06] hover:ring-white/20 active:scale-[0.99]"
            }`}
          >
            <span className="text-xs font-medium text-zinc-200 group-hover:text-white">
              {tool.label}
            </span>
            <code className="font-mono text-[10px] text-zinc-500 group-hover:text-zinc-400">
              {tool.command}
            </code>
          </button>
        ))}
      </div>

      {/* System Workspace Navigation Row */}
      <div className="mt-1 border-t border-white/[0.06] pt-3">
        <ActionRow>
          <ActionButton
            variant="outline"
            size="sm"
            className="flex-1 justify-center"
            disabled={disabled}
            onClick={openTerminal}
          >
            Open Terminal
          </ActionButton>
          <ActionButton
            variant="outline"
            size="sm"
            className="flex-1 justify-center"
            disabled={disabled}
            onClick={openFolder}
          >
            Open Folder
          </ActionButton>
        </ActionRow>
      </div>
    </Card>
  );
}