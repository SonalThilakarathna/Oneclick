import { useCallback, useEffect, useState } from "react";
import { api, isTauri, pickFolder, type LaunchTool } from "./lib/api";
import { usePolling } from "./hooks/usePolling";
import { useCustomCommands } from "./hooks/useCustomCommands";
import { useRunner } from "./hooks/useRunner";
import { CurlPanel } from "./components/CurlPanel";
import { CustomCommandsCard } from "./components/CustomCommandsCard";
import { DevCard } from "./components/DevCard";
import { GitCard } from "./components/GitCard";
import { LaunchCard } from "./components/LaunchCard";
import { ProjectBar } from "./components/ProjectBar";
import { SupabaseCard } from "./components/SupabaseCard";
import { ToolboxCard } from "./components/ToolboxCard";
import { LogoMark } from "./components/icons";
import { LogConsole, StatusDot } from "./components/ui";

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
  const customCommands = useCustomCommands();

  // Polling fetchers (safe execution with null checks)
  const supabaseFetcher = useCallback(
    () => (projectDir ? api.supabaseStatus(projectDir) : Promise.reject("No directory")),
    [projectDir]
  );
  const gitFetcher = useCallback(
    () => (projectDir ? api.gitStatus(projectDir) : Promise.reject("No directory")),
    [projectDir]
  );
  const projectFetcher = useCallback(
    () => (projectDir ? api.projectInfo(projectDir) : Promise.reject("No directory")),
    [projectDir]
  );

  // Available editors / AI CLIs on PATH
  const [available, setAvailable] = useState<Record<LaunchTool, boolean> | null>(null);

  useEffect(() => {
    if (!isTauri) return;
    api.detectTools().then(setAvailable, () => setAvailable(null));
  }, []);

  // Pause background polling while a process is running
  const active = isTauri && projectDir !== null && runner.busy === null;
  const supabase = usePolling(projectDir ? supabaseFetcher : null, 10_000, active);
  const git = usePolling(projectDir ? gitFetcher : null, 5_000, active);
  const project = usePolling(projectDir ? projectFetcher : null, 10_000, active);

  const refreshAll = useCallback(() => {
    void supabase.refresh();
    void git.refresh();
    void project.refresh();
  }, [supabase, git, project]);

  const choose = useCallback(async () => {
    try {
      const dir = await pickFolder();
      if (!dir) return;
      setProjectDir(dir);
      localStorage.setItem(STORAGE_KEY, dir);
    } catch (err) {
      runner.push("err", `Failed to open directory: ${String(err)}`);
    }
  }, [runner]);

  // Global Keyboard Shortcuts (Cmd/Ctrl + O to open, Cmd/Ctrl + K to clear logs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key.toLowerCase() === "o") {
        e.preventDefault();
        void choose();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        runner.clear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [choose, runner]);

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-[#0b0b0b] p-4 text-zinc-300 antialiased lg:h-screen lg:p-5">
      {/* App Header */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-[#121212] px-4 py-3 ring-1 ring-white/[0.06] shadow-xl">
        <div className="flex items-center gap-3">
          <LogoMark size={24} />
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white leading-none">
              OneClick
            </h1>
            <span className="text-[10px] font-medium tracking-wide text-zinc-500">
              Developer Workflow Control
            </span>
          </div>
        </div>

        {/* Global Process Status */}
        <div className="flex items-center gap-4">
          <StatusDot
            state={runner.busy !== null ? "busy" : projectDir ? "running" : "stopped"}
            label={runner.busy !== null ? `Running: ${runner.busy}` : projectDir ? "Ready" : "No Workspace"}
          />
          <div className="hidden sm:flex items-center gap-2 border-l border-white/[0.08] pl-4 text-[10px] font-mono text-zinc-500">
            <span><kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-zinc-400">⌘O</kbd> Open</span>
            <span><kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 text-zinc-400">⌘K</kbd> Clear</span>
          </div>
        </div>
      </header>

      {/* Web Fallback Warning Banner */}
      {!isTauri && (
        <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300 ring-1 ring-inset ring-amber-500/20">
          <span>
            Browser Preview Mode: Native desktop process executions require the Tauri shell.
          </span>
          <code className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[11px] text-amber-200">
            npm run tauri dev
          </code>
        </div>
      )}

      {/* Workspace Selector Bar */}
      <ProjectBar projectDir={projectDir} onPick={choose} />

      {/* Main Dashboard Workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        {/* Left Drawer: Tools & Action Cards */}
        <aside
          aria-label="Tools"
          className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto lg:pr-1.5 custom-scrollbar"
        >
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
          <CustomCommandsCard
            projectDir={projectDir}
            store={customCommands}
            runner={runner}
            onDone={refreshAll}
          />
          <LaunchCard projectDir={projectDir} available={available} runner={runner} />
          <ToolboxCard projectDir={projectDir} runner={runner} onDone={refreshAll} />
        </aside>

        {/* Right Canvas: Output & Interactive Workspaces */}
        <main aria-label="Command Canvas" className="flex min-h-0 flex-col gap-3">
          <div className="min-h-0 flex-1 lg:overflow-y-auto lg:pr-1 custom-scrollbar">
            <CurlPanel projectDir={projectDir} runner={runner} />
          </div>
          <LogConsole log={runner.log} onClear={runner.clear} />
        </main>
      </div>
    </div>
  );
}