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
import { ActionButton, Card, Modal, ConfirmDialog, inputClass } from "./ui";

type Runner = ReturnType<typeof useRunner>;
type Store = ReturnType<typeof useCustomCommands>;

const MODES: { value: RunMode; label: string; hint: string }[] = [
  {
    value: "output",
    label: "Output Panel",
    hint: "Streams logs directly inside the workspace runner.",
  },
  {
    value: "terminal",
    label: "External Terminal",
    hint: "Launches an interactive window for long-running processes.",
  },
];

function CommandDialog({
  initial,
  projectDir,
  onSave,
  onDelete,
  onClose,
}: {
  initial: CustomCommand | null;
  projectDir: string | null;
  onSave: (command: CustomCommand) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [command, setCommand] = useState(initial?.command ?? "");
  const [mode, setMode] = useState<RunMode>(initial?.mode ?? "output");
  const [allProjects, setAllProjects] = useState(
    initial ? initial.dir === null : false
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      dir: allProjects ? null : (initial?.dir ?? projectDir),
    });
    onClose();
  };

  return (
    <>
      <Modal title={initial ? "Edit Command" : "New Command"} onClose={onClose}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Button Label
            <input
              autoFocus
              className={inputClass}
              placeholder="e.g. Run Tests"
              maxLength={40}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Shell Command
            <input
              className={`${inputClass} font-mono text-xs`}
              placeholder="e.g. npm test -- --watch=false"
              spellCheck={false}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            />
            <span className="text-[11px] font-normal normal-case text-zinc-500">
              Executes relative to project root. Chain commands using <code>&amp;&amp;</code>.
            </span>
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Target Runner
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MODES.map((m) => {
                const isSelected = mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value)}
                    className={`flex flex-col items-start gap-1 rounded-xl p-3 text-left transition-all ring-1 ${
                      isSelected
                        ? "bg-well ring-white/25 text-white"
                        : "bg-well/50 ring-white/[0.06] text-zinc-400 hover:bg-well"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-semibold">{m.label}</span>
                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-[11px] leading-snug text-zinc-500">
                      {m.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-400 select-none">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 accent-white focus:ring-0"
              checked={allProjects}
              onChange={(e) => setAllProjects(e.target.checked)}
            />
            Make command available across all projects
          </label>

          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3.5">
            {initial ? (
              <ActionButton
                variant="ghost"
                className="text-zinc-500 hover:text-zinc-300"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </ActionButton>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <ActionButton variant="ghost" onClick={onClose}>
                Cancel
              </ActionButton>
              <ActionButton variant="primary" type="submit" disabled={!valid}>
                Save Command
              </ActionButton>
            </div>
          </div>
        </form>
      </Modal>

      {showDeleteConfirm && initial && (
        <ConfirmDialog
          title="Delete Command"
          body={`Are you sure you want to remove "${initial.label}"? This action cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            onDelete(initial.id);
            onClose();
          }}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
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
  const [editing, setEditing] = useState<CustomCommand | null | undefined>(
    undefined
  );
  const visible = commandsForProject(store.commands, projectDir);
  const disabled = !projectDir || runner.busy !== null;

  const run = async (c: CustomCommand) => {
    if (!projectDir) return;
    const label = `Custom: ${c.label}`;
    if (c.mode === "terminal") {
      await runner.run(label, () =>
        api.customRunTerminal(c.command, projectDir)
      );
    } else {
      await runner.run(label, (runId) =>
        api.customRun(c.command, projectDir, runId)
      );
    }
    onDone();
  };

  return (
    <Card
      title="My Commands"
      icon={<IconBolt />}
      iconTone="accent"
      status={
        visible.length > 0 && (
          <ActionButton
            variant="ghost"
            size="sm"
            disabled={!projectDir}
            onClick={() => setEditing(null)}
          >
            + Add
          </ActionButton>
        )
      }
    >
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 p-5 text-center">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-well text-zinc-300">
            <IconBolt />
          </div>
          <p className="text-xs font-semibold text-zinc-300">No Custom Commands</p>
          <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-zinc-500">
            Save repetitive scripts (build, test, deploy) as one-click action buttons.
          </p>
          <ActionButton
            variant="soft"
            size="sm"
            className="mt-3"
            disabled={!projectDir}
            onClick={() => setEditing(null)}
          >
            + Add Command
          </ActionButton>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visible.map((c) => (
            <div key={c.id} className="group flex items-center gap-1.5">
              <ActionButton
                variant="soft"
                size="md"
                className="group/btn relative min-w-0 flex-1 justify-between px-3 py-2 text-left transition-all hover:bg-white/[0.08]"
                disabled={disabled}
                title={c.command}
                onClick={() => run(c)}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-xs font-medium text-zinc-200">
                    {c.label}
                  </span>
                  {c.dir === null && (
                    <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-zinc-500">
                      Global
                    </span>
                  )}
                </div>
                <span className="max-w-[130px] shrink-0 truncate font-mono text-[10px] text-zinc-500 opacity-0 transition-opacity group-hover/btn:opacity-100">
                  {c.command}
                </span>
              </ActionButton>

              <ActionButton
                variant="ghost"
                size="sm"
                aria-label={`Edit ${c.label}`}
                title="Edit command"
                className="opacity-0 transition-opacity group-hover:opacity-100"
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