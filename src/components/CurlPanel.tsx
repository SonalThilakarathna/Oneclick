import { useMemo, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import {
  METHODS,
  PRESETS,
  hasPlaceholders,
  loadSaved,
  persistSaved,
  toCurlCommand,
  toRequest,
  type CurlTemplate,
} from "../lib/curlTemplates";
import type { useRunner } from "../hooks/useRunner";
import { ActionButton, Card, inputClass } from "./ui";

type Runner = ReturnType<typeof useRunner>;

export function CurlPanel({
  projectDir,
  runner,
}: {
  projectDir: string | null;
  runner: Runner;
}) {
  const [saved, setSaved] = useState<CurlTemplate[]>(loadSaved);
  const [selectedId, setSelectedId] = useState(PRESETS[0].id);
  const [draft, setDraft] = useState<CurlTemplate>(PRESETS[0]);
  const [copied, setCopied] = useState(false);

  const isSaved = saved.some((s) => s.id === selectedId);
  const request = useMemo(() => toRequest(draft), [draft]);
  const command = useMemo(() => toCurlCommand(request), [request]);
  const placeholders = hasPlaceholders(draft);
  const noBody = draft.method === "HEAD";

  const patch = (changes: Partial<CurlTemplate>) => setDraft((d) => ({ ...d, ...changes }));

  const select = (id: string) => {
    const tpl = [...PRESETS, ...saved].find((t) => t.id === id);
    if (!tpl) return;
    setSelectedId(id);
    setDraft(tpl);
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectDir) return;
    await runner.run(`cURL: ${draft.method} ${draft.url.trim() || "(no URL)"}`, (runId) =>
      api.curlRequest(request, projectDir, runId),
    );
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      runner.push("err", "Could not access the clipboard. Select the command and copy it manually.");
    }
  };

  const save = () => {
    const name = window.prompt("Template name", isSaved ? draft.name : "My request")?.trim();
    if (!name) return;
    const tpl: CurlTemplate = { ...draft, name, id: isSaved ? selectedId : `saved-${Date.now()}` };
    const next = isSaved ? saved.map((s) => (s.id === tpl.id ? tpl : s)) : [...saved, tpl];
    setSaved(next);
    persistSaved(next);
    setSelectedId(tpl.id);
    setDraft(tpl);
  };

  const remove = () => {
    const next = saved.filter((s) => s.id !== selectedId);
    setSaved(next);
    persistSaved(next);
    select(PRESETS[0].id);
  };

  return (
    <Card title="cURL Templates" icon="🌐">
      <form onSubmit={send} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs uppercase tracking-wide text-zinc-500" htmlFor="curl-template">
            Template
          </label>
          <select
            id="curl-template"
            value={selectedId}
            onChange={(e) => select(e.target.value)}
            className={`${inputClass} min-w-0 flex-1`}
          >
            <optgroup label="Built-in">
              {PRESETS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
            {saved.length > 0 && (
              <optgroup label="Saved">
                {saved.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="HTTP method"
            value={draft.method}
            onChange={(e) => patch({ method: e.target.value })}
            className={`${inputClass} w-28 font-mono`}
          >
            {METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <input
            aria-label="URL"
            value={draft.url}
            onChange={(e) => patch({ url: e.target.value })}
            placeholder="https://api.example.com/resource"
            spellCheck={false}
            className={`${inputClass} min-w-0 flex-1 font-mono`}
          />
          <ActionButton
            type="submit"
            variant="primary"
            disabled={!projectDir || runner.busy !== null || !draft.url.trim()}
          >
            Send
          </ActionButton>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-500">
            Headers (one per line)
            <textarea
              value={draft.headers}
              onChange={(e) => patch({ headers: e.target.value })}
              rows={5}
              spellCheck={false}
              placeholder="Name: value"
              className={`${inputClass} font-mono normal-case tracking-normal`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-zinc-500">
            Body
            <textarea
              value={noBody ? "" : draft.body}
              onChange={(e) => patch({ body: e.target.value })}
              rows={5}
              disabled={noBody}
              spellCheck={false}
              placeholder={noBody ? "HEAD requests have no body" : '{ "key": "value" }'}
              className={`${inputClass} font-mono normal-case tracking-normal`}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={draft.followRedirects}
            onChange={(e) => patch({ followRedirects: e.target.checked })}
            className="accent-indigo-500"
          />
          Follow redirects (max 5)
        </label>

        {placeholders && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            This template contains <code>YOUR_…</code> placeholders. Replace them before sending.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Copy-paste command (bash / zsh / Git Bash)
          </p>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-zinc-800 bg-black/40 p-3 font-mono text-xs text-zinc-300">
            {command}
          </pre>
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton onClick={copy}>{copied ? "Copied ✓" : "Copy command"}</ActionButton>
            <ActionButton onClick={save}>{isSaved ? "Update template" : "Save as template"}</ActionButton>
            {isSaved && (
              <ActionButton variant="danger" onClick={remove}>
                Delete template
              </ActionButton>
            )}
          </div>
          <p className="text-xs text-zinc-600">
            Saved templates live unencrypted in this app’s local storage. Keep placeholders such as{" "}
            <code>YOUR_TOKEN</code> in them, not real secrets. Only http(s) is allowed and requests time out
            after 30 s.
          </p>
        </div>
      </form>
    </Card>
  );
}
