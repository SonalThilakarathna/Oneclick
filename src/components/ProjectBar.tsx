import { ActionButton } from "./ui";
import { IconFolder } from "./icons";

function shortPath(dir: string): string {
  const parts = dir.replace(/[/\\]+$/, "").split(/[/\\]/);
  if (parts.length <= 3) return dir;
  return `…/${parts.slice(-2).join("/")}`;
}

export function ProjectBar({
  projectDir,
  onPick,
}: {
  projectDir: string | null;
  onPick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card px-3.5 py-2.5 ring-1 ring-white/[0.06]">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-zinc-400">
        <IconFolder />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-500">Project</p>
        <p className="truncate text-sm text-white" title={projectDir ?? undefined}>
          {projectDir ? shortPath(projectDir) : "No folder selected"}
        </p>
      </div>
      <ActionButton variant="outline" size="sm" onClick={onPick}>
        {projectDir ? "Change" : "Choose folder"}
      </ActionButton>
    </div>
  );
}
