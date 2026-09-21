//! Node project workflows: install, build, and starting the dev server.
//!
//! The package manager is detected from the lockfile, and only the fixed
//! `install` / `run <script>` forms are ever executed.

use std::path::Path;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::commands::{blocking, resolve_dir, ActionResult};
use crate::runner::{self, run_streamed};
use crate::terminal;

#[derive(Clone, Copy, PartialEq, Debug)]
enum PackageManager {
    Npm,
    Pnpm,
    Yarn,
    Bun,
}

impl PackageManager {
    fn detect(dir: &Path) -> Self {
        let has = |f: &str| dir.join(f).is_file();
        if has("pnpm-lock.yaml") {
            Self::Pnpm
        } else if has("yarn.lock") {
            Self::Yarn
        } else if has("bun.lockb") || has("bun.lock") {
            Self::Bun
        } else {
            Self::Npm
        }
    }

    fn program(self) -> &'static str {
        match self {
            Self::Npm => "npm",
            Self::Pnpm => "pnpm",
            Self::Yarn => "yarn",
            Self::Bun => "bun",
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfo {
    pub has_package_json: bool,
    pub package_manager: &'static str,
    pub scripts: Vec<String>,
    pub has_node_modules: bool,
    pub detail: Option<String>,
}

fn read_scripts(dir: &Path) -> Result<Vec<String>, String> {
    let raw = std::fs::read_to_string(dir.join("package.json"))
        .map_err(|e| format!("Could not read package.json: {e}"))?;
    let json: serde_json::Value =
        serde_json::from_str(&raw).map_err(|e| format!("package.json is not valid JSON: {e}"))?;
    Ok(json
        .get("scripts")
        .and_then(|s| s.as_object())
        .map(|s| s.keys().cloned().collect())
        .unwrap_or_default())
}

#[tauri::command]
pub async fn project_info(project_dir: String) -> Result<ProjectInfo, String> {
    let dir = resolve_dir(&project_dir)?;
    blocking(move || {
        let pm = PackageManager::detect(&dir);
        let has_node_modules = dir.join("node_modules").is_dir();

        if !dir.join("package.json").is_file() {
            return Ok(ProjectInfo {
                has_package_json: false,
                package_manager: pm.program(),
                scripts: vec![],
                has_node_modules,
                detail: Some("No package.json in this folder.".into()),
            });
        }
        let (scripts, detail) = match read_scripts(&dir) {
            Ok(s) => (s, None),
            Err(e) => (vec![], Some(e)),
        };
        Ok(ProjectInfo {
            has_package_json: true,
            package_manager: pm.program(),
            scripts,
            has_node_modules,
            detail,
        })
    })
    .await
}

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub enum DevAction {
    Install,
    Build,
}

#[tauri::command]
pub async fn dev_run(
    app: AppHandle,
    action: DevAction,
    project_dir: String,
    run_id: String,
) -> Result<ActionResult, String> {
    let dir = resolve_dir(&project_dir)?;

    blocking(move || {
        if !dir.join("package.json").is_file() {
            return Ok(ActionResult::fail("No package.json in this folder."));
        }
        let pm = PackageManager::detect(&dir);
        let program = pm.program();

        let (args, done): (&[&str], &str) = match action {
            DevAction::Install => (&["install"], "Dependencies installed."),
            DevAction::Build => {
                if !read_scripts(&dir)?.iter().any(|s| s == "build") {
                    return Ok(ActionResult::fail("package.json has no \"build\" script."));
                }
                (&["run", "build"], "Build finished.")
            }
        };

        let ok = run_streamed(&app, &run_id, program, args, &dir)?;
        Ok(if ok {
            ActionResult::ok(done)
        } else {
            ActionResult::fail(format!("`{program} {}` failed. See the output above.", args.join(" ")))
        })
    })
    .await
}

/// Starts the dev server in its own terminal window: it is long-running, so it
/// would otherwise block the one-workflow-at-a-time output panel.
#[tauri::command]
pub async fn dev_server(project_dir: String) -> Result<ActionResult, String> {
    let dir = resolve_dir(&project_dir)?;

    blocking(move || {
        if !dir.join("package.json").is_file() {
            return Ok(ActionResult::fail("No package.json in this folder."));
        }
        let scripts = read_scripts(&dir)?;
        let script = ["dev", "start"]
            .into_iter()
            .find(|name| scripts.iter().any(|s| s == name));
        let Some(script) = script else {
            return Ok(ActionResult::fail(
                "package.json has neither a \"dev\" nor a \"start\" script.",
            ));
        };

        let pm = PackageManager::detect(&dir);
        let program = pm.program();
        if runner::find_on_path(program).is_none() {
            return Ok(ActionResult::fail(format!(
                "`{program}` was not found on your PATH. Install it first."
            )));
        }

        let args = ["run", script];
        terminal::open(&dir, &format!("{program} run {script}"), Some((program, &args)))?;
        Ok(ActionResult::ok(format!(
            "`{program} run {script}` opened in a new terminal window."
        )))
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("oneclick-test-{name}-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn detects_package_manager_from_lockfile() {
        let dir = temp_dir("pm");
        assert_eq!(PackageManager::detect(&dir), PackageManager::Npm);
        std::fs::write(dir.join("yarn.lock"), "").unwrap();
        assert_eq!(PackageManager::detect(&dir), PackageManager::Yarn);
        std::fs::write(dir.join("pnpm-lock.yaml"), "").unwrap();
        assert_eq!(PackageManager::detect(&dir), PackageManager::Pnpm);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn reads_script_names() {
        let dir = temp_dir("scripts");
        std::fs::write(
            dir.join("package.json"),
            r#"{"scripts":{"dev":"vite","build":"tsc"}}"#,
        )
        .unwrap();
        let mut scripts = read_scripts(&dir).unwrap();
        scripts.sort();
        assert_eq!(scripts, ["build", "dev"]);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn invalid_package_json_is_an_error_not_a_panic() {
        let dir = temp_dir("bad");
        std::fs::write(dir.join("package.json"), "{ nope").unwrap();
        assert!(read_scripts(&dir).is_err());
        std::fs::remove_dir_all(dir).unwrap();
    }
}
