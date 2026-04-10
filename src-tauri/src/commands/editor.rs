use std::process::Command;

#[tauri::command]
pub fn open_in_editor(path: String) -> Result<(), String> {
    Command::new("code")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("VS Code を起動できませんでした: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn check_code_command() -> bool {
    Command::new("which")
        .arg("code")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}
