export type RunMode = "output" | "terminal";

export interface CustomCommand {
  id: string;
  label: string;
  /** A single shell line, exactly as the user typed it. */
  command: string;
  /** "output" streams into the Output panel; "terminal" opens its own window. */
  mode: RunMode;
  /** Project folder this button belongs to, or null to show it in every project. */
  dir: string | null;
}

const STORAGE_KEY = "oneclick.customCommands";

export function loadCustomCommands(): CustomCommand[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    // Drop anything malformed rather than crash the whole dashboard on bad data.
    return parsed.filter(
      (c): c is CustomCommand =>
        typeof c?.id === "string" &&
        typeof c.label === "string" &&
        typeof c.command === "string" &&
        (c.mode === "output" || c.mode === "terminal") &&
        (c.dir === null || typeof c.dir === "string"),
    );
  } catch {
    return [];
  }
}

export function saveCustomCommands(commands: CustomCommand[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(commands));
  } catch {
    /* storage unavailable: commands just won't persist */
  }
}

/** The commands to show for a project: its own plus the ones shared across all projects. */
export function commandsForProject(
  commands: CustomCommand[],
  projectDir: string | null,
): CustomCommand[] {
  return commands.filter((c) => c.dir === null || c.dir === projectDir);
}
