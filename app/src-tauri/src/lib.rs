// Settings → Databases → Add (20 Sep 2026, working/wireframes/settings-databases-add.html):
// creating a brand-new Library needs its default Libraries directory to exist before
// `@tauri-apps/plugin-sql` can open a `.db` file inside it — the plugin has no filesystem
// access of its own, and this project takes no new dependency (no `fs` plugin) for two
// small filesystem operations. `std::fs` covers both. See `data/backends/tauri.js`'s
// `ensureDirectory()`/`listDirectoryNames()`, the only callers of these two commands.
// Not run against a real Rust toolchain from this change — see PROGRESS.md.

#[tauri::command]
fn ensure_dir_exists(path: String) -> Result<(), String> {
  std::fs::create_dir_all(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_dir_entries(path: String) -> Result<Vec<String>, String> {
  let dir = std::path::Path::new(&path);
  if !dir.exists() {
    // A fresh install with no Libraries directory yet is not an error — it
    // simply has no entries to collide with.
    return Ok(Vec::new());
  }
  let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
  let mut names = Vec::new();
  for entry in entries {
    let entry = entry.map_err(|e| e.to_string())?;
    if let Some(name) = entry.file_name().to_str() {
      names.push(name.to_string());
    }
  }
  Ok(names)
}

// Engine Stage 2 (26 Sep 2026, engine-stage2-plan.md): a downloaded WASM
// engine's files are written to a real directory on desktop (see
// `engine/storage.js`'s own header), then served to the engine's Web Worker
// through Tauri's asset protocol (`convertFileSrc`) rather than a subprocess
// — Stage 3's job once native engines exist. Same reasoning as the two
// commands above: no new dependency (no `fs` plugin) for plain byte writes
// and a recursive delete; `std::fs` covers both. Bytes cross the IPC bridge
// as a JSON array of numbers, the same way every other argument here already
// serializes (`serde_json`, already a dependency) — no base64 layer, nothing
// new to decode.

#[tauri::command]
fn write_binary_file(path: String, bytes: Vec<u8>) -> Result<(), String> {
  if let Some(parent) = std::path::Path::new(&path).parent() {
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }
  std::fs::write(path, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_dir_all(path: String) -> Result<(), String> {
  let dir = std::path::Path::new(&path);
  if !dir.exists() {
    // Removing an engine that was never fully installed (a write failed
    // partway) is not an error — there is simply nothing left to remove.
    return Ok(());
  }
  std::fs::remove_dir_all(dir).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .invoke_handler(tauri::generate_handler![
      ensure_dir_exists, list_dir_entries, write_binary_file, remove_dir_all
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
