import { useCallback, useEffect, useState } from "react";
import { api, isTauri, pickFolder, type LaunchTool } from "./lib/api";
import { usePolling } from "./hooks/usePolling";
import { useRunner } from "./hooks/useRunner";
import { CurlPanel } from "./components/CurlPanel";
import { DevCard } from "./components/DevCard";
import { GitCard } from "./components/GitCard";
import { LaunchCard } from "./components/LaunchCard";
import { ProjectBar } from "./components/ProjectBar";
import { SupabaseCard } from "./components/SupabaseCard";
import { ToolboxCard } from "./components/ToolboxCard";
import { LogConsole } from "./components/ui";

const STORAGE_KEY = "oneclick.projectDir";

function loadProjectDir(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function App() {
  const [projectDir, setProjectDir] = useState<string | null>(loadProjectDir);
  const runner = useRunner();

  const supabaseFetcher = useCallback(
    () => api.supabaseStatus(projectDir!),
    [projectDir],
  );
  const gitFetcher = useCallback(() => api.gitStatus(projectDir!), [projectDir]);
  const projectFetcher = useCallback(() => api.projectInfo(projectDir!), [projectDir]);

  // Which editors / AI CLIs are on PATH. PATH is fixed for the life of the process, so once is enough.
  const [available, setAvailable] = useState<Record<LaunchTool, boolean> | null>(null);
  useEffect(() => {
    if (!isTauri) return;
    api.detectTools().then(setAvailable, () => setAvailable(null));
  }, []);

  // Pause polling while a workflow runs; results are refreshed when it finishes.
  const active = isTauri && projectDir !== null && runner.busy === null;
  const supabase = usePolling(projectDir ? supabaseFetcher : null, 10_000, active);
  const git = usePolling(projectDir ? gitFetcher : null, 5_000, active);
  const project = usePolling(projectDir ? projectFetcher : null, 10_000, active);

  const refreshAll = useCallback(() => {
    void supabase.refresh();
    void git.refresh();
    void project.refresh();
  }, [supabase, git, project]);

  const choose = async () => {
    const dir = await pickFolder();
    if (!dir) return;
    setProjectDir(dir);
    try {
      localStorage.setItem(STORAGE_KEY, dir);
    } catch {
      /* storage unavailable: selection just won't persist */
    }
  };

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-zinc-950 p-4 text-zinc-200 lg:h-screen lg:p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h1 className="text-xl font-bold tracking-tight text-zinc-50">
          One<span className="text-brand-400">Click</span>
        </h1>
        <span className="text-xs text-zinc-500">Supabase · Git · Dev · Editors · AI CLIs · cURL</span>
      </header>

      {!isTauri && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          Running in a plain browser: buttons need the desktop shell. Start it with{" "}
          <code>npm run tauri dev</code>.
        </p>
      )}

      <ProjectBar projectDir={projectDir} onPick={choose} />

      {/* Two columns from lg up (tools | command canvas); one stacked column below. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        <aside aria-label="Tools" className="flex min-h-0 flex-col gap-4 lg:overflow-y-auto lg:pr-1">
          <SupabaseCard
            projectDir={projectDir}
            status={supabase.data}
            runner={runner}
            onDone={refreshAll}
          />
          <GitCard
            projectDir={projectDir}
            status={git.data}
            runner={runner}
            onDone={refreshAll}
          />
          <DevCard
            projectDir={projectDir}
            info={project.data}
            runner={runner}
            onDone={refreshAll}
          />
          <LaunchCard projectDir={projectDir} available={available} runner={runner} />
          <ToolboxCard projectDir={projectDir} runner={runner} onDone={refreshAll} />
        </aside>

        <main aria-label="Command canvas" className="flex min-h-0 flex-col gap-4">
          <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-1">
            <CurlPanel projectDir={projectDir} runner={runner} />
          </div>
          <LogConsole log={runner.log} onClear={runner.clear} />
        </main>
      </div>
    </div>
  );
}
