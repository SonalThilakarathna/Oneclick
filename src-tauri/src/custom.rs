//! User-defined commands: the repetitive things a person runs in their project
//! that OneClick's built-in cards don't cover.
//!
//! Unlike every other workflow these run through the platform shell, because
//! the command line is text the user wrote and saved themselves (pipes, `&&`
//! and quoting must work). The frontend never builds one from anything else.

use tauri::AppHandle;

use crate::commands::{blocking, resolve_dir, ActionResult};
use crate::runner::run_shell_streamed;
use crate::terminal;

/// Generous for a real command line, small enough to reject pasted garbage.
const MAX_COMMAND_LEN: usize = 4000;

fn clean(command: &str) -> Result<&str, String> {
    let line = command.trim();
    if line.is_empty() {
        return Err("This command is empty.".into());
    }
    if line.len() > MAX_COMMAND_LEN {
        return Err(format!("This command is too long (max {MAX_COMMAND_LEN} characters)."));
    }
    // A newline would end the line early in cmd.exe and split it in a shell.
    if line.contains(['\n', '\r']) {
        return Err("A command must be a single line. Chain steps with && instead.".into());
    }
    Ok(line)
}

/// Runs the command and streams its output into the Output panel.
#[tauri::command]
pub async fn custom_run(
    app: AppHandle,
    command: String,
    project_dir: String,
    run_id: String,
) -> Result<ActionResult, String> {
    let dir = resolve_dir(&project_dir)?;
    let line = clean(&command)?.to_string();

    blocking(move || {
        let ok = run_shell_streamed(&app, &run_id, &line, &dir)?;
        Ok(if ok {
            ActionResult::ok("Command finished.")
        } else {
            ActionResult::fail("Command failed. See the output above.")
        })
    })
    .await
}

/// Runs the command in its own terminal window, for long-running processes
/// (dev servers, watchers) that would block the one-at-a-time Output panel.
#[tauri::command]
pub async fn custom_run_terminal(
    command: String,
    project_dir: String,
) -> Result<ActionResult, String> {
    let dir = resolve_dir(&project_dir)?;
    let line = clean(&command)?.to_string();

    blocking(move || {
        terminal::open_shell(&dir, &line)?;
        Ok(ActionResult::ok("Opened in a new terminal window."))
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_and_accepts_a_normal_line() {
        assert_eq!(clean("  npm run lint && npm test \n").unwrap(), "npm run lint && npm test");
    }

    #[test]
    fn rejects_empty_multiline_and_oversized_commands() {
        assert!(clean("   ").is_err());
        assert!(clean("echo a\necho b").is_err());
        assert!(clean(&"x".repeat(MAX_COMMAND_LEN + 1)).is_err());
    }
}
