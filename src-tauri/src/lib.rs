mod commands;
mod curl;
mod devtools;
mod launch;
mod runner;
mod terminal;
mod toolbox;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::supabase_status,
            commands::supabase_run,
            commands::git_status,
            commands::git_commit_push,
            devtools::project_info,
            devtools::dev_run,
            devtools::dev_server,
            launch::detect_tools,
            launch::launch_tool,
            launch::open_terminal_here,
            launch::open_folder,
            toolbox::toolbox_run,
            curl::curl_request,
        ])
        .run(tauri::generate_context!())
        .expect("error while running OneClick");
}
