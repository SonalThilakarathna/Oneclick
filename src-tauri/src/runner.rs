//! Safe process execution helpers.
//!
//! Every command is spawned directly (never through a shell), with arguments
//! passed as separate strings, so user input such as a commit message can never
//! be interpreted as shell syntax.

use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

/// Event name the frontend listens on for live command output.
pub const OUTPUT_EVENT: &str = "oneclick://output";

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputLine {
    pub run_id: String,
    /// "cmd" | "stdout" | "stderr" | "info"
    pub stream: &'static str,
    pub line: String,
}

/// Output of a quiet (non-streamed) command.
pub struct Captured {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
}

/// Emits a line of output to the UI. Failures are ignored on purpose: a closed
/// window must not abort a running workflow.
pub fn emit_line(app: &AppHandle, run_id: &str, stream: &'static str, line: impl Into<String>) {
    let _ = app.emit(
        OUTPUT_EVENT,
        OutputLine {
            run_id: run_id.to_string(),
            stream,
            line: line.into(),
        },
    );
}

/// Resolves `program` on PATH (honouring PATHEXT on Windows, so `.cmd` shims work)
/// and builds a `Command` configured for headless use in `dir`.
pub fn build(program: &str, args: &[&str], dir: &Path) -> Result<Command, String> {
    let exe: PathBuf = which::which(program).map_err(|_| {
        format!("`{program}` was not found on your PATH. Install it and restart OneClick.")
    })?;

    let mut cmd = Command::new(exe);
    cmd.args(args)
        .current_dir(dir)
        .stdin(Stdio::null())
        .env("NO_COLOR", "1")
        .env("TERM", "dumb")
        .env("GIT_TERMINAL_PROMPT", "0");

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    Ok(cmd)
}

/// Runs a command to completion and captures its output. Used for status probes.
pub fn run_quiet(program: &str, args: &[&str], dir: &Path) -> Result<Captured, String> {
    let output = build(program, args, dir)?
        .output()
        .map_err(|e| format!("Failed to run `{program}`: {e}"))?;

    Ok(Captured {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    })
}

/// Runs a command and streams stdout/stderr line-by-line to the UI as it is produced.
/// Returns `Ok(true)` when the process exits successfully.
pub fn run_streamed(
    app: &AppHandle,
    run_id: &str,
    program: &str,
    args: &[&str],
    dir: &Path,
) -> Result<bool, String> {
    emit_line(app, run_id, "cmd", format!("$ {program} {}", args.join(" ")));

    let mut child = build(program, args, dir)?
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start `{program}`: {e}"))?;

    let stdout = child.stdout.take().map(|s| pump(app.clone(), run_id, "stdout", s));
    let stderr = child.stderr.take().map(|s| pump(app.clone(), run_id, "stderr", s));

    let status = child
        .wait()
        .map_err(|e| format!("Failed while waiting for `{program}`: {e}"))?;

    for handle in [stdout, stderr].into_iter().flatten() {
        let _ = handle.join();
    }

    Ok(status.success())
}

/// Reads a pipe on its own thread, emitting each line. Handles `\r` progress
/// updates (keeps only the latest frame) and non-UTF-8 bytes.
fn pump<R: Read + Send + 'static>(
    app: AppHandle,
    run_id: &str,
    stream: &'static str,
    reader: R,
) -> thread::JoinHandle<()> {
    let run_id = run_id.to_string();
    thread::spawn(move || {
        for chunk in BufReader::new(reader).split(b'\n') {
            let Ok(bytes) = chunk else { break };
            let text = String::from_utf8_lossy(&bytes);
            let line = text.rsplit('\r').find(|s| !s.is_empty()).unwrap_or("");
            if !line.trim().is_empty() {
                emit_line(&app, &run_id, stream, line.trim_end());
            }
        }
    })
}

/// Spawns a detached process (native terminal windows, editors) without waiting.
pub fn spawn_detached(mut cmd: Command) -> Result<(), String> {
    cmd.stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Failed to launch: {e}"))
}

/// Resolves an executable on PATH, for pre-flight checks.
pub fn find_on_path(program: &str) -> Option<PathBuf> {
    which::which(program).ok()
}
