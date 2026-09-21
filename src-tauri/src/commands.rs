//! Tauri commands for Supabase and Git. Other workflows live in `devtools`,
//! `launch`, `toolbox` and `curl`.
//!
//! The frontend can only trigger the fixed workflows below; it can never submit
//! an arbitrary command line.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::runner::{emit_line, run_quiet, run_streamed};

// ───────────────────────────── shared types ─────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionResult {
    pub success: bool,
    pub message: String,
}

impl ActionResult {
    pub(crate) fn ok(message: impl Into<String>) -> Self {
        Self { success: true, message: message.into() }
    }
    pub(crate) fn fail(message: impl Into<String>) -> Self {
        Self { success: false, message: message.into() }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RunState {
    Running,
    Stopped,
    Unknown,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceStatus {
    pub state: RunState,
    pub detail: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub is_repo: bool,
    pub branch: Option<String>,
    pub changed: usize,
    pub detail: Option<String>,
}

pub(crate) fn resolve_dir(dir: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(dir);
    if dir.trim().is_empty() || !path.is_dir() {
        return Err(format!("Project folder does not exist: {dir}"));
    }
    Ok(path)
}

/// Runs a blocking closure off the async runtime so the UI stays responsive.
pub(crate) async fn blocking<T, F>(f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| format!("Background task failed: {e}"))?
}

// ───────────────────────────── Supabase ─────────────────────────────

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub enum SupabaseAction {
    Start,
    Stop,
    Reset,
    Deploy,
}

impl SupabaseAction {
    fn args(self) -> &'static [&'static str] {
        match self {
            Self::Start => &["start"],
            Self::Stop => &["stop"],
            Self::Reset => &["db", "reset"],
            // `--yes` answers the CLI's interactive confirmation; the UI asks first.
            Self::Deploy => &["db", "push", "--yes"],
        }
    }

    fn done_message(self) -> &'static str {
        match self {
            Self::Start => "Supabase is running.",
            Self::Stop => "Supabase stopped.",
            Self::Reset => "Local database reset.",
            Self::Deploy => "Migrations pushed to the remote project.",
        }
    }
}

#[tauri::command]
pub async fn supabase_status(project_dir: String) -> Result<ServiceStatus, String> {
    let dir = resolve_dir(&project_dir)?;
    blocking(move || Ok(probe_supabase(&dir))).await
}

fn probe_supabase(dir: &Path) -> ServiceStatus {
    if !dir.join("supabase").join("config.toml").is_file() {
        return ServiceStatus {
            state: RunState::Unknown,
            detail: Some("No supabase/config.toml here. Run `supabase init` first.".into()),
        };
    }

    let out = match run_quiet("supabase", &["status"], dir) {
        Ok(out) => out,
        Err(e) => return ServiceStatus { state: RunState::Unknown, detail: Some(e) },
    };

    if out.success {
        return ServiceStatus { state: RunState::Running, detail: None };
    }

    let err = out.stderr.to_lowercase();
    if err.contains("docker") && (err.contains("daemon") || err.contains("connect")) {
        ServiceStatus {
            state: RunState::Unknown,
            detail: Some("Docker doesn't appear to be running.".into()),
        }
    } else {
        // `supabase status` exits non-zero when the local stack is not running.
        ServiceStatus { state: RunState::Stopped, detail: None }
    }
}

#[tauri::command]
pub async fn supabase_run(
    app: AppHandle,
    action: SupabaseAction,
    project_dir: String,
    run_id: String,
) -> Result<ActionResult, String> {
    let dir = resolve_dir(&project_dir)?;
    if !dir.join("supabase").join("config.toml").is_file() {
        return Ok(ActionResult::fail(
            "No supabase/config.toml in this folder. Run `supabase init` first.",
        ));
    }

    blocking(move || {
        let ok = run_streamed(&app, &run_id, "supabase", action.args(), &dir)?;
        Ok(if ok {
            ActionResult::ok(action.done_message())
        } else {
            ActionResult::fail(format!(
                "`supabase {}` failed. See the output above.",
                action.args().join(" ")
            ))
        })
    })
    .await
}

// ─────────────────────────────── Git ───────────────────────────────

#[tauri::command]
pub async fn git_status(project_dir: String) -> Result<GitStatus, String> {
    let dir = resolve_dir(&project_dir)?;
    blocking(move || Ok(probe_git(&dir))).await
}

fn probe_git(dir: &Path) -> GitStatus {
    let not_repo = |detail: String| GitStatus {
        is_repo: false,
        branch: None,
        changed: 0,
        detail: Some(detail),
    };

    match run_quiet("git", &["rev-parse", "--is-inside-work-tree"], dir) {
        Err(e) => return not_repo(e),
        Ok(out) if !out.success => return not_repo("Not a git repository.".into()),
        Ok(_) => {}
    }

    // `symbolic-ref` also works on a fresh repo with no commits yet.
    let branch = run_quiet("git", &["symbolic-ref", "--short", "-q", "HEAD"], dir)
        .ok()
        .filter(|o| o.success)
        .map(|o| o.stdout.trim().to_string())
        .filter(|b| !b.is_empty());

    let changed = run_quiet("git", &["status", "--porcelain"], dir)
        .ok()
        .filter(|o| o.success)
        .map(|o| o.stdout.lines().filter(|l| !l.trim().is_empty()).count())
        .unwrap_or(0);

    GitStatus { is_repo: true, branch, changed, detail: None }
}

#[tauri::command]
pub async fn git_commit_push(
    app: AppHandle,
    message: String,
    project_dir: String,
    run_id: String,
) -> Result<ActionResult, String> {
    let message = message.trim().to_string();
    if message.is_empty() {
        return Ok(ActionResult::fail("A commit message is required."));
    }
    let dir = resolve_dir(&project_dir)?;

    blocking(move || {
        let status = probe_git(&dir);
        if !status.is_repo {
            return Ok(ActionResult::fail(
                status.detail.unwrap_or_else(|| "Not a git repository.".into()),
            ));
        }
        let Some(branch) = status.branch else {
            return Ok(ActionResult::fail(
                "HEAD is detached. Check out a branch before pushing.",
            ));
        };

        // Sequential steps; the first failure stops the workflow.
        if status.changed > 0 {
            if !run_streamed(&app, &run_id, "git", &["add", "."], &dir)? {
                return Ok(ActionResult::fail("`git add .` failed."));
            }
            // The message is a single argv entry: no shell, no injection.
            if !run_streamed(&app, &run_id, "git", &["commit", "-m", message.as_str()], &dir)? {
                return Ok(ActionResult::fail("`git commit` failed."));
            }
        } else {
            emit_line(&app, &run_id, "info", "Nothing to commit; pushing existing commits.");
        }

        let has_upstream = run_quiet(
            "git",
            &["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
            &dir,
        )
        .map(|o| o.success)
        .unwrap_or(false);

        let pushed = if has_upstream {
            run_streamed(&app, &run_id, "git", &["push"], &dir)?
        } else {
            // First push of a new branch: publish it and set the upstream.
            run_streamed(&app, &run_id, "git", &["push", "-u", "origin", branch.as_str()], &dir)?
        };

        Ok(if pushed {
            ActionResult::ok(format!("Pushed to {branch}."))
        } else {
            ActionResult::fail("`git push` failed. See the output above.")
        })
    })
    .await
}
