import { api, type ToolboxAction } from "../lib/api";
import type { useRunner } from "../hooks/useRunner";
import { IconWrench } from "./icons";
import { ActionButton, ActionRow, Card } from "./ui";

type Runner = ReturnType<typeof useRunner>;

const STREAMED: { action: ToolboxAction; label: string; title: string }[] = [
  { action: "gitPull", label: "Git Pull", title: "git pull --ff-only" },
  { action: "gitLog", label: "Recent Commits", title: "git log --oneline -n 15" },
  { action: "dockerPs", label: "Docker Containers", title: "docker ps" },
  { action: "envCheck", label: "Environment Check", title: "Check which tools are installed" },
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

  return (
    <Card title="Toolbox" icon={<IconWrench />} iconTone="wrench">
      <p className="text-xs leading-relaxed text-zinc-500">Handy helpers for the selected project.</p>
      <div className="flex flex-col gap-1.5">
        {STREAMED.map(({ action, label, title }) => (
          <ActionButton
            key={action}
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2"
            disabled={disabled}
            title={title}
            onClick={async () => {
              if (!projectDir) return;
              await runner.run(`Toolbox: ${label}`, (runId) =>
                api.toolboxRun(action, projectDir, runId),
              );
              onDone();
            }}
          >
            {label}
          </ActionButton>
        ))}
      </div>
      <ActionRow className="border-t border-white/5 pt-3">
        <ActionButton
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={disabled}
          onClick={() =>
            projectDir &&
            runner.run("Toolbox: Open Terminal", () => api.openTerminalHere(projectDir))
          }
        >
          Open Terminal
        </ActionButton>
        <ActionButton
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={disabled}
          onClick={() =>
            projectDir && runner.run("Toolbox: Open Folder", () => api.openFolder(projectDir))
          }
        >
          Open Folder
        </ActionButton>
      </ActionRow>
    </Card>
  );
}
