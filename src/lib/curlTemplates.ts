import type { CurlRequest } from "./api";

export interface CurlTemplate {
  id: string;
  name: string;
  method: string;
  url: string;
  /** One `Name: value` per line. */
  headers: string;
  body: string;
  followRedirects: boolean;
}

export const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

const JSON_HEADER = "Content-Type: application/json";
const SUPABASE_LOCAL = "http://127.0.0.1:54321";
const SUPABASE_HEADERS = "apikey: YOUR_ANON_KEY\nAuthorization: Bearer YOUR_ANON_KEY";

const t = (
  id: string,
  name: string,
  method: string,
  url: string,
  headers = "",
  body = "",
  followRedirects = false,
): CurlTemplate => ({ id, name, method, url, headers, body, followRedirects });

/** Built-in starting points. Anything written `YOUR_…` is a placeholder to replace. */
export const PRESETS: CurlTemplate[] = [
  t("get", "GET · fetch JSON", "GET", "https://jsonplaceholder.typicode.com/posts/1", "Accept: application/json"),
  t(
    "post-json",
    "POST · send JSON",
    "POST",
    "https://jsonplaceholder.typicode.com/posts",
    JSON_HEADER,
    '{\n  "title": "Hello from OneClick",\n  "body": "It works!",\n  "userId": 1\n}',
  ),
  t(
    "put-json",
    "PUT · replace a resource",
    "PUT",
    "https://jsonplaceholder.typicode.com/posts/1",
    JSON_HEADER,
    '{\n  "id": 1,\n  "title": "Updated title",\n  "body": "Updated body",\n  "userId": 1\n}',
  ),
  t(
    "patch-json",
    "PATCH · partial update",
    "PATCH",
    "https://jsonplaceholder.typicode.com/posts/1",
    JSON_HEADER,
    '{ "title": "Only the title changes" }',
  ),
  t("delete", "DELETE · remove a resource", "DELETE", "https://jsonplaceholder.typicode.com/posts/1"),
  t(
    "bearer",
    "GET · Bearer token auth",
    "GET",
    "https://api.example.com/v1/me",
    "Authorization: Bearer YOUR_TOKEN\nAccept: application/json",
  ),
  t(
    "form",
    "POST · form-encoded",
    "POST",
    "https://httpbin.org/post",
    "Content-Type: application/x-www-form-urlencoded",
    "name=OneClick&type=demo",
  ),
  t(
    "graphql",
    "POST · GraphQL query",
    "POST",
    "https://countries.trevorblades.com/graphql",
    JSON_HEADER,
    '{ "query": "{ country(code: \\"LK\\") { name capital currency } }" }',
  ),
  t("head", "HEAD · headers only", "HEAD", "https://example.com", "", "", true),
  t("dev-health", "GET · local dev server", "GET", "http://localhost:5173", "Accept: text/html"),
  t(
    "sb-rest",
    "Supabase · query a table (REST)",
    "GET",
    `${SUPABASE_LOCAL}/rest/v1/YOUR_TABLE?select=*&limit=5`,
    SUPABASE_HEADERS,
  ),
  t(
    "sb-insert",
    "Supabase · insert a row (REST)",
    "POST",
    `${SUPABASE_LOCAL}/rest/v1/YOUR_TABLE`,
    `${SUPABASE_HEADERS}\n${JSON_HEADER}\nPrefer: return=representation`,
    '{ "name": "example" }',
  ),
  t("sb-auth", "Supabase · Auth health", "GET", `${SUPABASE_LOCAL}/auth/v1/health`, "apikey: YOUR_ANON_KEY"),
  t(
    "sb-fn",
    "Supabase · invoke Edge Function",
    "POST",
    `${SUPABASE_LOCAL}/functions/v1/YOUR_FUNCTION`,
    `Authorization: Bearer YOUR_ANON_KEY\n${JSON_HEADER}`,
    '{ "name": "Functions" }',
  ),
];

export function toRequest(tpl: Pick<CurlTemplate, "method" | "url" | "headers" | "body" | "followRedirects">): CurlRequest {
  return {
    method: tpl.method,
    url: tpl.url.trim(),
    headers: tpl.headers.split("\n"),
    // HEAD has no body; the textarea is hidden for it but may still hold old text.
    body: tpl.body.trim() === "" || tpl.method === "HEAD" ? null : tpl.body,
    followRedirects: tpl.followRedirects,
  };
}

/** True while a template still contains a `YOUR_…` placeholder the user should replace. */
export function hasPlaceholders(tpl: Pick<CurlTemplate, "url" | "headers" | "body">): boolean {
  return /YOUR_[A-Z_]+/.test(`${tpl.url}\n${tpl.headers}\n${tpl.body}`);
}

const quote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** A copy-pasteable curl command (POSIX quoting: bash, zsh, Git Bash). */
export function toCurlCommand(req: CurlRequest): string {
  const method = req.method.toUpperCase();
  const parts = ["curl", "-i"];
  if (req.followRedirects) parts.push("-L");
  parts.push(method === "HEAD" ? "-I" : `-X ${method}`);
  for (const h of req.headers.map((h) => h.trim()).filter(Boolean)) parts.push(`-H ${quote(h)}`);
  if (req.body && method !== "HEAD") parts.push(`--data-raw ${quote(req.body)}`);
  parts.push(quote(req.url || "https://…"));
  return parts.join(" ");
}

// ── Saved templates (per-machine, in the webview's localStorage) ──────────

const STORAGE_KEY = "oneclick.curlTemplates";

export function loadSaved(): CurlTemplate[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as CurlTemplate[]) : [];
  } catch {
    return [];
  }
}

export function persistSaved(list: CurlTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: templates just won't persist */
  }
}
