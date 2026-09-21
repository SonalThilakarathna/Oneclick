import { useState } from "react";
import { api } from "../lib/api";
import {
  commandsForProject,
  type CustomCommand,
  type RunMode,
} from "../lib/customCommands";
import type { useCustomCommands } from "../hooks/useCustomCommands";
import type { useRunner } from "../hooks/useRunner";
import { IconBolt, IconPencil } from "./icons";
import { ActionButton, Card, Modal, inputClass } from "./ui";

type Runner = ReturnType<typeof useRunner>;
type Store = ReturnType<typeof useCustomCommands>;

const MODES: { value: RunMode; label: string; hint: string }[] = [
  { value: "output", label: "Output panel", hint: "Shows the result here. Best for commands that finish." },
  { value: "terminal", label: "Terminal window", hint: "Opens its own window. Best for dev servers and watchers." },
];

function CommandDialog({
  initial,
  projectDir,
  onSave,
  onDelete,
  onClose,
}: {
  /** The command being edited, or null when adding a new one. */
  initial: CustomCommand | null;
  projectDir: string | null;
  onSave: (command: CustomCommand) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [command, setCommand] = useState(initial?.command ?? "");
  const [mode, setMode] = useState<RunMode>(initial?.mode ?? "output");
  // New commands default to "this project": most repetitive commands are project-specific.
  const [allProjects, setAllProjects] = useState(initial ? initial.dir === null : false);

  const line = command.trim();
  const multiline = /[\r\n]/.test(line);
  const valid = label.trim() !== "" && line !== "" && !multiline;

  const submit = () => {
    if (!valid) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      label: label.trim(),
      command: line,
      mode,
      // An existing project-scoped command keeps its own folder when edited from another project.
      dir: allProjects ? null : (initial?.dir ?? projectDir),
    });
    onClose();
  };

  return (
    <Modal title={initial ? "Edit command" : "Add a command"} onClose={onClose}>
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400">
          Button name
          <input
            autoFocus
            className={inputClass}
            placeholder="e.g. Run tests"
            maxLength={40}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-400">
          Command
          <input
            className={`${inputClass} font-mono`}
            placeholder="e.g. npm test -- --watch=false"
            spellCheck={false}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
          />
          <span className="font-normal text-zinc-600">
            Runs in the project folder. Chain steps with <code>&amp;&amp;</code>.
          </span>
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-xs font-medium text-zinc-400">Run it in</legend>
          {MODES.map((m) => (
            <label
              key={m.value}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]"
            >
              <input
                type="radio"
                name="mode"
                className="mt-0.5 accent-brand-500"
                checked={mode === m.value}
                onChange={() => setMode(m.value)}
              />
              <span className="text-xs text-zinc-300">
                {m.label}
                <span className="block text-zinc-600">{m.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <label className="flex cursor-pointer items-center gap-2.5 px-1 text-xs text-zinc-400">
          <input
            type="checkbox"
            className="accent-brand-500"
            checked={allProjects}
            onChange={(e) => setAllProjects(e.target.checked)}
          />
          Show in every project (otherwise only this one)
        </label>

        <div className="flex items-center justify-between gap-2 pt-1">
          {initial ? (
            <ActionButton
              variant="ghost"
              className="text-rose-400/80 hover:text-rose-300"
              onClick={() => {
                onDelete(initial.id);
                onClose();
              }}
            >
              Delete
            </ActionButton>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <ActionButton variant="ghost" onClick={onClose}>
              Cancel
            </ActionButton>
            <ActionButton variant="primary" type="submit" disabled={!valid}>
              Save
            </ActionButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function CustomCommandsCard({
  projectDir,
  store,
  runner,
  onDone,
}: {
  projectDir: string | null;
  store: Store;
  runner: Runner;
  onDone: () => void;
}) {
  // `undefined` = dialog closed, `null` = adding, otherwise editing that command.
  const [editing, setEditing] = useState<CustomCommand | null | undefined>(undefined);
  const visible = commandsForProject(store.commands, projectDir);
  const disabled = !projectDir || runner.busy !== null;

  const run = async (c: CustomCommand) => {
    if (!projectDir) return;
    const label = `Custom: ${c.label}`;
    if (c.mode === "terminal") {
      await runner.run(label, () => api.customRunTerminal(c.command, projectDir));
    } else {
      await runner.run(label, (runId) => api.customRun(c.command, projectDir, runId));
    }
    onDone();
  };

  return (
    <Card
      title="My Commands"
      icon={<IconBolt />}
      iconTone="accent"
      status={
        <ActionButton
          variant="ghost"
          size="sm"
          disabled={!projectDir}
          onClick={() => setEditing(null)}
        >
          + Add
        </ActionButton>
      }
    >
      {visible.length === 0 ? (
        <p className="text-xs leading-relaxed text-zinc-500">
          Save the commands you keep retyping (tests, lint, deploy scripts…) as one-click buttons.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visible.map((c) => (
            <div key={c.id} className="group flex items-center gap-1">
              <ActionButton
                variant="soft"
                size="sm"
                className="min-w-0 flex-1 justify-start px-2.5"
                disabled={disabled}
                title={c.command}
                onClick={() => run(c)}
              >
                <span className="truncate">{c.label}</span>
                {c.dir === null && (
                  <span className="ml-2 shrink-0 text-[10px] font-normal text-zinc-600">all projects</span>
                )}
              </ActionButton>
              <ActionButton
                variant="ghost"
                size="sm"
                aria-label={`Edit ${c.label}`}
                title="Edit"
                onClick={() => setEditing(c)}
              >
                <IconPencil size={13} />
              </ActionButton>
            </div>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <CommandDialog
          initial={editing}
          projectDir={projectDir}
          onSave={store.save}
          onDelete={store.remove}
          onClose={() => setEditing(undefined)}
        />
      )}
    </Card>
  );
}
