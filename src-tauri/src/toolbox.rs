//! Small supporting utilities: `git pull`, recent commits, running Docker
//! containers, and an environment check that helps diagnose a broken setup.

use serde::Deserialize;
use tauri::AppHandle;

use crate::commands::{blocking, resolve_dir, ActionResult};
use crate::runner::{emit_line, find_on_path, run_quiet, run_streamed};

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub enum ToolboxAction {
    GitPull,
    GitLog,
    DockerPs,
    EnvCheck,
}

/// (program, args that print its version, required for OneClick's core features)
const ENV_CHECKS: &[(&str, &[&str], bool)] = &[
    ("git", &["--version"], true),
    ("node", &["--version"], true),
    ("npm", &["--version"], true),
    ("supabase", &["--version"], false),
    ("docker", &["--version"], false),
    ("curl", &["--version"], false),
    ("claude", &["--version"], false),
    ("codex", &["--version"], false),
];

/// Editors are only checked for presence: `--version` would start a GUI process.
const ENV_PRESENCE_ONLY: &[&str] = &["code", "cursor", "antigravity"];

#[tauri::command]
pub async fn toolbox_run(
    app: AppHandle,
    action: ToolboxAction,
    project_dir: String,
    run_id: String,
) -> Result<ActionResult, String> {
    let dir = resolve_dir(&project_dir)?;

    blocking(move || {
        let (program, args, done): (&str, &[&str], &str) = match action {
            // `--ff-only` never opens a merge editor (there is no stdin here).
            ToolboxAction::GitPull => ("git", &["pull", "--ff-only"], "git pull finished."),
            ToolboxAction::GitLog => (
                "git",
                &["log", "--oneline", "--decorate", "-n", "15"],
                "Showing the last 15 commits.",
            ),
            ToolboxAction::DockerPs => (
                "docker",
                &["ps", "--format", "table {{.Names}}\t{{.Status}}\t{{.Ports}}"],
                "Listed running containers.",
            ),
            ToolboxAction::EnvCheck => return Ok(env_check(&app, &run_id, &dir)),
        };

        let ok = run_streamed(&app, &run_id, program, args, &dir)?;
        Ok(if ok {
            ActionResult::ok(done)
        } else {
            ActionResult::fail(format!("`{program} {}` failed. See the output above.", args[0]))
        })
    })
    .await
}

fn env_check(app: &AppHandle, run_id: &str, dir: &std::path::Path) -> ActionResult {
    let mut found = 0;
    let mut missing_required: Vec<&str> = vec![];

    for &(program, version_args, required) in ENV_CHECKS {
        let Some(path) = find_on_path(program) else {
            emit_line(app, run_id, if required { "stderr" } else { "info" }, format!("✗ {program:<12} not found"));
            if required {
                missing_required.push(program);
            }
            continue;
        };
        found += 1;
        let version = run_quiet(program, version_args, dir)
            .ok()
            .filter(|o| o.success)
            .and_then(|o| o.stdout.lines().next().map(|l| l.trim().to_string()))
            .unwrap_or_else(|| "installed".into());
        emit_line(app, run_id, "stdout", format!("✓ {program:<12} {version}  ({})", path.display()));
    }

    for &program in ENV_PRESENCE_ONLY {
        match find_on_path(program) {
            Some(path) => {
                found += 1;
                emit_line(app, run_id, "stdout", format!("✓ {program:<12} {}", path.display()));
            }
            None => emit_line(app, run_id, "info", format!("✗ {program:<12} not found")),
        }
    }

    let total = ENV_CHECKS.len() + ENV_PRESENCE_ONLY.len();
    if missing_required.is_empty() {
        ActionResult::ok(format!("{found} of {total} tools found. Required tools are all present."))
    } else {
        ActionResult::fail(format!("Missing required tools: {}.", missing_required.join(", ")))
    }
}
