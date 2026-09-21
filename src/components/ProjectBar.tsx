import { ActionButton } from "./ui";

export function ProjectBar({
  projectDir,
  onPick,
}: {
  projectDir: string | null;
  onPick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-zinc-500">Project</span>
      <span
        className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-300"
        title={projectDir ?? undefined}
      >
        {projectDir ?? "No folder selected"}
      </span>
      <ActionButton onClick={onPick}>{projectDir ? "Change…" : "Choose folder…"}</ActionButton>
    </div>
  );
}
