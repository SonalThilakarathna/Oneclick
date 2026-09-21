import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

export type RunState = "running" | "stopped" | "unknown";

export interface ServiceStatus {
  state: RunState;
  detail: string | null;
}

export interface GitStatus {
  isRepo: boolean;
  branch: string | null;
  changed: number;
  detail: string | null;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

export type SupabaseAction = "start" | "stop" | "reset" | "deploy";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface ProjectInfo {
  hasPackageJson: boolean;
  packageManager: PackageManager;
  scripts: string[];
  hasNodeModules: boolean;
  detail: string | null;
}

export type DevAction = "install" | "build";
export type LaunchTool = "vscode" | "cursor" | "antigravity" | "claude" | "codex";
export type ToolboxAction = "gitPull" | "gitLog" | "dockerPs" | "envCheck";

export interface CurlRequest {
  method: string;
  url: string;
  /** One `Name: value` entry per element. */
  headers: string[];
  body: string | null;
  followRedirects: boolean;
}

export interface OutputLine {
  runId: string;
  stream: "cmd" | "stdout" | "stderr" | "info";
  line: string;
}

/** True when running inside the Tauri window (false in a plain browser, e.g. `npm run dev`). */
export const isTauri = "__TAURI_INTERNALS__" in window;

export const api = {
  supabaseStatus: (projectDir: string) =>
    invoke<ServiceStatus>("supabase_status", { projectDir }),
  supabaseRun: (action: SupabaseAction, projectDir: string, runId: string) =>
    invoke<ActionResult>("supabase_run", { action, projectDir, runId }),
  supabaseFunctionsList: (projectDir: string) =>
    invoke<string[]>("supabase_functions_list", { projectDir }),
  /** An empty `functions` list deploys every edge function. */
  supabaseFunctionsDeploy: (functions: string[], projectDir: string, runId: string) =>
    invoke<ActionResult>("supabase_functions_deploy", { functions, projectDir, runId }),
  gitStatus: (projectDir: string) => invoke<GitStatus>("git_status", { projectDir }),
  gitCommitPush: (message: string, projectDir: string, runId: string) =>
    invoke<ActionResult>("git_commit_push", { message, projectDir, runId }),
  projectInfo: (projectDir: string) => invoke<ProjectInfo>("project_info", { projectDir }),
  devRun: (action: DevAction, projectDir: string, runId: string) =>
    invoke<ActionResult>("dev_run", { action, projectDir, runId }),
  devServer: (projectDir: string) => invoke<ActionResult>("dev_server", { projectDir }),
  detectTools: () => invoke<Record<LaunchTool, boolean>>("detect_tools"),
  launchTool: (tool: LaunchTool, projectDir: string) =>
    invoke<ActionResult>("launch_tool", { tool, projectDir }),
  openTerminalHere: (projectDir: string) =>
    invoke<ActionResult>("open_terminal_here", { projectDir }),
  openFolder: (projectDir: string) => invoke<ActionResult>("open_folder", { projectDir }),
  toolboxRun: (action: ToolboxAction, projectDir: string, runId: string) =>
    invoke<ActionResult>("toolbox_run", { action, projectDir, runId }),
  curlRequest: (request: CurlRequest, projectDir: string, runId: string) =>
    invoke<ActionResult>("curl_request", { request, projectDir, runId }),
  customRun: (command: string, projectDir: string, runId: string) =>
    invoke<ActionResult>("custom_run", { command, projectDir, runId }),
  customRunTerminal: (command: string, projectDir: string) =>
    invoke<ActionResult>("custom_run_terminal", { command, projectDir }),
};

export function onOutput(handler: (line: OutputLine) => void): Promise<UnlistenFn> {
  return listen<OutputLine>("oneclick://output", (e) => handler(e.payload));
}

export async function pickFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}
