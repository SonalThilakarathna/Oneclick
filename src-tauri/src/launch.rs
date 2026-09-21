//! Launchers for editors (VS Code, Cursor, Antigravity), terminal AI CLIs
//! (Claude Code, Codex) and OS conveniences (terminal / file manager).

use std::collections::HashMap;

use serde::Deserialize;

use crate::commands::{blocking, resolve_dir, ActionResult};
use crate::runner;
use crate::terminal;

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub enum LaunchTool {
    Vscode,
    Cursor,
    Antigravity,
    Claude,
    Codex,
}

impl LaunchTool {
    const ALL: [(&'static str, Self); 5] = [
        ("vscode", Self::Vscode),
        ("cursor", Self::Cursor),
        ("antigravity", Self::Antigravity),
        ("claude", Self::Claude),
        ("codex", Self::Codex),
    ];

    fn program(self) -> &'static str {
        match self {
            Self::Vscode => "code",
            Self::Cursor => "cursor",
            Self::Antigravity => "antigravity",
            Self::Claude => "claude",
            Self::Codex => "codex",
        }
    }

    fn name(self) -> &'static str {
        match self {
            Self::Vscode => "VS Code",
            Self::Cursor => "Cursor",
            Self::Antigravity => "Antigravity",
            Self::Claude => "Claude Code",
            Self::Codex => "Codex",
        }
    }

    fn install_hint(self) -> &'static str {
        match self {
            Self::Vscode => "In VS Code run “Shell Command: Install 'code' command in PATH”, or reinstall and tick “Add to PATH”.",
            Self::Cursor => "In Cursor run “Install 'cursor' command” from the Command Palette.",
            Self::Antigravity => "Reinstall Antigravity with the “Add to PATH” option enabled.",
            Self::Claude => "Install it with `npm install -g @anthropic-ai/claude-code`.",
            Self::Codex => "Install it with `npm install -g @openai/codex`.",
        }
    }

    /// Terminal CLIs need a live terminal; editors are GUI apps that open a folder.
    fn is_terminal_cli(self) -> bool {
        matches!(self, Self::Claude | Self::Codex)
    }
}

/// Reports which launchable tools are on PATH, keyed by the UI's tool id.
#[tauri::command]
pub async fn detect_tools() -> Result<HashMap<&'static str, bool>, String> {
    blocking(|| {
        Ok(LaunchTool::ALL
            .into_iter()
            .map(|(id, tool)| (id, runner::find_on_path(tool.program()).is_some()))
            .collect())
    })
    .await
}

#[tauri::command]
pub async fn launch_tool(tool: LaunchTool, project_dir: String) -> Result<ActionResult, String> {
    let dir = resolve_dir(&project_dir)?;

    blocking(move || {
        let program = tool.program();
        if runner::find_on_path(program).is_none() {
            return Ok(ActionResult::fail(format!(
                "`{program}` was not found on your PATH. {}",
                tool.install_hint()
            )));
        }

        if tool.is_terminal_cli() {
            terminal::open(&dir, tool.name(), Some((program, &[])))?;
            Ok(ActionResult::ok(format!("{} opened in a new terminal window.", tool.name())))
        } else {
            runner::spawn_detached(runner::build(program, &["."], &dir)?)?;
            Ok(ActionResult::ok(format!("Opening the project in {}…", tool.name())))
        }
    })
    .await
}

#[tauri::command]
pub async fn open_terminal_here(project_dir: String) -> Result<ActionResult, String> {
    let dir = resolve_dir(&project_dir)?;
    blocking(move || {
        terminal::open(&dir, "OneClick terminal", None)?;
        Ok(ActionResult::ok("Terminal opened in the project folder."))
    })
    .await
}

#[cfg(target_os = "windows")]
const FILE_MANAGER: &str = "explorer";
#[cfg(target_os = "macos")]
const FILE_MANAGER: &str = "open";
#[cfg(all(unix, not(target_os = "macos")))]
const FILE_MANAGER: &str = "xdg-open";

#[tauri::command]
pub async fn open_folder(project_dir: String) -> Result<ActionResult, String> {
    let dir = resolve_dir(&project_dir)?;
    blocking(move || {
        let path = dir.to_string_lossy().into_owned();
        runner::spawn_detached(runner::build(FILE_MANAGER, &[path.as_str()], &dir)?)?;
        Ok(ActionResult::ok("Project folder opened."))
    })
    .await
}
