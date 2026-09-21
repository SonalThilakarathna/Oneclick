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
import { IconRequest } from "./icons";
import {
  ActionButton,
  ActionRow,
  Card,
  ConfirmDialog,
  TextArea,
  inputClass,
} from "./ui";

type Runner = ReturnType<typeof useRunner>;

// ── Method Color Helpers ──────────────────────────────────────────────────

const METHOD_COLOR: Record<string, string> = {
  GET: "text-zinc-300",
  POST: "text-white font-semibold",
  PUT: "text-zinc-300",
  PATCH: "text-zinc-400",
  DELETE: "text-zinc-200 font-semibold",
  HEAD: "text-zinc-500",
  OPTIONS: "text-zinc-500",
};

export function CurlPanel({
  projectDir,
  runner,
}: {
  projectDir: string | null;
  runner: Runner;
}) {
  const [saved, setSaved] = useState<CurlTemplate[]>(loadSaved);
  const [selectedId, setSelectedId] = useState<string>(PRESETS[0].id);
  const [draft, setDraft] = useState<CurlTemplate>(PRESETS[0]);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isSaved = saved.some((s) => s.id === selectedId);
  const request = useMemo(() => toRequest(draft), [draft]);
  const command = useMemo(() => toCurlCommand(request), [request]);
  const placeholders = hasPlaceholders(draft);
  const noBody = draft.method === "HEAD" || draft.method === "GET";

  const patch = (changes: Partial<CurlTemplate>) =>
    setDraft((d) => ({ ...d, ...changes }));

  const select = (id: string) => {
    const tpl = [...PRESETS, ...saved].find((t) => t.id === id);
    if (!tpl) return;
    setSelectedId(id);
    setDraft(tpl);
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectDir) return;
    await runner.run(
      `cURL: ${draft.method} ${draft.url.trim() || "(no URL)"}`,
      (runId) => api.curlRequest(request, projectDir, runId),
    );
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      runner.push(
        "err",
        "Could not access the clipboard. Select the command and copy it manually.",
      );
    }
  };

  const save = () => {
    const name = window
      .prompt("Template name", isSaved ? draft.name : "My request")
      ?.trim();
    if (!name) return;
    const tpl: CurlTemplate = {
      ...draft,
      name,
      id: isSaved ? selectedId : `saved-${Date.now()}`,
    };
    const next = isSaved
      ? saved.map((s) => (s.id === tpl.id ? tpl : s))
      : [...saved, tpl];
    setSaved(next);
    persistSaved(next);
    setSelectedId(tpl.id);
    setDraft(tpl);
  };

  const remove = () => {
    const next = saved.filter((s) => s.id !== selectedId);
    setSaved(next);
    persistSaved(next);
    setShowDeleteConfirm(false);
    select(PRESETS[0].id);
  };

  return (
    <>
      <Card
        title="cURL Workspace"
        icon={<IconRequest />}
        iconTone="request"
        className="h-full"
      >
        <form onSubmit={send} className="flex flex-col gap-4">
          {/* Template Bar */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.04] pb-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <label
                className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500"
                htmlFor="curl-template"
              >
                Template
              </label>
              <select
                id="curl-template"
                value={selectedId}
                onChange={(e) => select(e.target.value)}
                className={`${inputClass} min-w-0 flex-1 py-1.5 text-xs font-medium`}
              >
                <optgroup label="Presets">
                  {PRESETS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
                {saved.length > 0 && (
                  <optgroup label="Saved Templates">
                    {saved.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <ActionRow>
              <ActionButton variant="soft" size="sm" onClick={save}>
                {isSaved ? "Update" : "Save as..."}
              </ActionButton>
              {isSaved && (
                <ActionButton
                  variant="ghost"
                  size="sm"
                  className="text-zinc-500 hover:text-zinc-300"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </ActionButton>
              )}
            </ActionRow>
          </div>

          {/* Request Address Bar */}
          <div className="flex items-center gap-2">
            <select
              aria-label="HTTP method"
              value={draft.method}
              onChange={(e) => patch({ method: e.target.value })}
              className={`${inputClass} w-28 font-mono text-xs ${
                METHOD_COLOR[draft.method] || "text-zinc-200"
              }`}
            >
              {METHODS.map((m) => (
                <option key={m} className="bg-card text-zinc-200" value={m}>
                  {m}
                </option>
              ))}
            </select>

            <input
              aria-label="URL"
              value={draft.url}
              onChange={(e) => patch({ url: e.target.value })}
              placeholder="https://api.example.com/v1/resource"
              spellCheck={false}
              className={`${inputClass} min-w-0 flex-1 font-mono text-xs`}
            />

            <ActionButton
              type="submit"
              variant="primary"
              size="md"
              disabled={!projectDir || runner.busy !== null || !draft.url.trim()}
            >
              Send
            </ActionButton>
          </div>

          {/* Headers & Body Area */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              Headers
              <TextArea
                value={draft.headers}
                onChange={(e) => patch({ headers: e.target.value })}
                rows={4}
                spellCheck={false}
                placeholder="Accept: application/json&#10;Authorization: Bearer YOUR_TOKEN"
                className="font-mono text-xs text-zinc-300"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              Body
              <TextArea
                value={noBody ? "" : draft.body}
                onChange={(e) => patch({ body: e.target.value })}
                rows={4}
                disabled={noBody}
                spellCheck={false}
                placeholder={
                  noBody
                    ? `${draft.method} requests typically carry no body`
                    : '{\n  "key": "value"\n}'
                }
                className="font-mono text-xs text-zinc-300 disabled:opacity-30"
              />
            </label>
          </div>

          {/* Options & Placeholders */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-400 select-none">
              <input
                type="checkbox"
                checked={draft.followRedirects}
                onChange={(e) => patch({ followRedirects: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 accent-white focus:ring-0"
              />
              Follow redirects (max 5)
            </label>

            {placeholders && (
              <span className="rounded-md bg-well px-2.5 py-1 text-[11px] font-medium text-zinc-300 ring-1 ring-inset ring-white/10">
                Replace <code>YOUR_…</code> placeholders before sending
              </span>
            )}
          </div>

          {/* cURL Command Output Snippet */}
          <div className="flex flex-col gap-2 rounded-xl bg-well p-3 ring-1 ring-white/[0.1]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                Generated cURL Command
              </span>
              <button
                type="button"
                onClick={copy}
                className="text-[11px] font-medium text-white hover:text-zinc-300 transition-colors"
              >
                {copied ? "Copied to clipboard!" : "Copy command"}
              </button>
            </div>
            <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-zinc-400 selection:bg-white/20 selection:text-white">
              {command}
            </pre>
          </div>

          <p className="text-[10px] leading-relaxed text-zinc-600">
            Saved templates reside in local storage. Avoid storing raw production API keys. Requests timeout after 30 seconds.
          </p>
        </form>
      </Card>

      {/* Delete Template Modal */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Template"
          body={`Are you sure you want to delete "${draft.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={remove}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}