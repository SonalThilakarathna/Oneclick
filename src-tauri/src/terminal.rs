//! Opens a native terminal window in a project folder, optionally running a
//! command inside it. `open` only takes a fixed program plus arguments;
//! `open_shell` runs a line the user wrote themselves (a saved custom command).

use std::path::Path;
use std::process::Command;

use crate::runner;

/// A program plus its arguments, run inside the new terminal.
pub type Program<'a> = (&'a str, &'a [&'a str]);

#[cfg(target_os = "windows")]
pub fn open(dir: &Path, title: &str, command: Option<Program>) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    let mut cmd = Command::new("cmd");
    cmd.current_dir(dir).args(["/C", "start", title, "cmd", "/K"]);
    if let Some((program, args)) = command {
        cmd.arg(program).args(args);
    }
    cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW for the launcher only
    runner::spawn_detached(cmd)
}

/// Opens a terminal window that runs a user-written shell `line` and stays open
/// afterwards, so long-running commands and their output remain visible.
#[cfg(target_os = "windows")]
pub fn open_shell(dir: &Path, line: &str) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;
    let mut cmd = Command::new("cmd");
    // Raw + quoted so cmd.exe receives the line exactly as typed.
    cmd.current_dir(dir)
        .raw_arg("/K")
        .raw_arg(format!("\"{line}\""))
        .creation_flags(CREATE_NEW_CONSOLE);
    runner::spawn_detached(cmd)
}

#[cfg(target_os = "macos")]
pub fn open_shell(dir: &Path, line: &str) -> Result<(), String> {
    open(dir, "", Some((line, &[])))
}

#[cfg(all(unix, not(target_os = "macos")))]
pub fn open_shell(dir: &Path, line: &str) -> Result<(), String> {
    let script = format!("{line}; exec \"${{SHELL:-sh}}\"");
    open(dir, "", Some(("sh", &["-c", &script])))
}

#[cfg(target_os = "macos")]
pub fn open(dir: &Path, _title: &str, command: Option<Program>) -> Result<(), String> {
    let mut shell_cmd = format!("cd '{}'", dir.to_string_lossy().replace('\'', r"'\''"));
    if let Some((program, args)) = command {
        shell_cmd.push_str(" && ");
        shell_cmd.push_str(program);
        for arg in args {
            shell_cmd.push(' ');
            shell_cmd.push_str(arg);
        }
    }
    let script_cmd = shell_cmd.replace('\\', "\\\\").replace('"', "\\\"");
    let mut cmd = Command::new("osascript");
    cmd.args([
        "-e",
        &format!("tell application \"Terminal\" to do script \"{script_cmd}\""),
        "-e",
        "tell application \"Terminal\" to activate",
    ]);
    runner::spawn_detached(cmd)
}

#[cfg(all(unix, not(target_os = "macos")))]
pub fn open(dir: &Path, _title: &str, command: Option<Program>) -> Result<(), String> {
    // (terminal, flag that precedes the command to run)
    const TERMINALS: &[(&str, &[&str])] = &[
        ("x-terminal-emulator", &["-e"]),
        ("gnome-terminal", &["--"]),
        ("konsole", &["-e"]),
        ("xfce4-terminal", &["-e"]),
        ("alacritty", &["-e"]),
        ("kitty", &[]),
        ("xterm", &["-e"]),
    ];

    for (term, flags) in TERMINALS {
        if runner::find_on_path(term).is_none() {
            continue;
        }
        let mut cmd = Command::new(term);
        cmd.current_dir(dir);
        if *term == "gnome-terminal" {
            cmd.arg(format!("--working-directory={}", dir.to_string_lossy()));
        }
        if let Some((program, args)) = command {
            cmd.args(*flags).arg(program).args(args);
        }
        return runner::spawn_detached(cmd);
    }
    Err("No supported terminal emulator found (tried x-terminal-emulator, gnome-terminal, konsole, xfce4-terminal, alacritty, kitty, xterm).".into())
}
