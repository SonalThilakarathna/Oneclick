import { useCallback, useState } from "react";
import {
  loadCustomCommands,
  saveCustomCommands,
  type CustomCommand,
} from "../lib/customCommands";

/** The saved custom commands, persisted to localStorage on every change. */
export function useCustomCommands() {
  const [commands, setCommands] = useState<CustomCommand[]>(loadCustomCommands);

  const update = useCallback((change: (prev: CustomCommand[]) => CustomCommand[]) => {
    setCommands((prev) => {
      const next = change(prev);
      saveCustomCommands(next);
      return next;
    });
  }, []);

  /** Adds a new command, or replaces the one with the same id. */
  const save = useCallback(
    (command: CustomCommand) =>
      update((prev) =>
        prev.some((c) => c.id === command.id)
          ? prev.map((c) => (c.id === command.id ? command : c))
          : [...prev, command],
      ),
    [update],
  );

  const remove = useCallback(
    (id: string) => update((prev) => prev.filter((c) => c.id !== id)),
    [update],
  );

  return { commands, save, remove };
}
