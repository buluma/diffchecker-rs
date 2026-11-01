mod store;
mod diff;
mod highlight;
mod types;

use std::path::PathBuf;
use std::{fmt, io};

use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;

use crate::store::{
    add_history_entry, add_recent_file, clear_history as clear_stored_history,
    get_save_history as read_save_history, list_history as read_history_entries,
    list_recent_files as read_recent_files, remove_history_entry,
    set_save_history as write_save_history, HistoryAddResult, HistoryEntry, HistorySide,
    RecentFile, MAX_OPEN_BYTES,
};
use crate::diff::compute_diff;
use crate::highlight::highlight_code;
use crate::types::{DiffOptions, DiffResult};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenedFile {
    path: String,
    content: String,
}

#[derive(Debug)]
enum OpenPathError {
    NotFound,
    Other(String),
}

impl fmt::Display for OpenPathError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotFound => formatter.write_str("The selected file could not be read."),
            Self::Other(message) => formatter.write_str(message),
        }
    }
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    // Keep the existing Electron location so recent files, history, and settings survive upgrades.
    let directory = app
        .path()
        .config_dir()
        .map_err(|error| error.to_string())?
        .join("diffchecker-desktop");
    std::fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory)
}

fn open_path(app: &AppHandle, path: PathBuf) -> Result<OpenedFile, OpenPathError> {
    let metadata = std::fs::metadata(&path).map_err(|error| {
        if error.kind() == io::ErrorKind::NotFound {
            OpenPathError::NotFound
        } else {
            OpenPathError::Other("The selected file could not be read.".to_owned())
        }
    })?;
    if !metadata.is_file() {
        return Err(OpenPathError::Other("Select a regular file.".to_owned()));
    }
    if metadata.len() > MAX_OPEN_BYTES as u64 {
        return Err(OpenPathError::Other(
            "Each input is limited to 5 MiB.".to_owned(),
        ));
    }
    let content = std::fs::read_to_string(&path).map_err(|_| {
        OpenPathError::Other(format!(
            "Could not read {}.",
            path.file_name().unwrap_or_default().to_string_lossy()
        ))
    })?;
    let path_string = path.to_string_lossy().into_owned();
    let directory = app_data_dir(app).map_err(OpenPathError::Other)?;
    add_recent_file(&directory, &path_string).map_err(OpenPathError::Other)?;
    Ok(OpenedFile {
        path: path_string,
        content,
    })
}

#[tauri::command]
async fn open_file(app: AppHandle) -> Result<Option<OpenedFile>, String> {
    let (sender, receiver) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("All files", &["*"])
        .add_filter(
            "Text and code files",
            &[
                "txt", "md", "log", "json", "xml", "yaml", "yml", "toml", "csv", "tsv", "env",
                "js", "ts", "jsx", "tsx", "py", "java", "cs", "go", "rs", "rb", "php", "swift",
                "kt", "sh", "sql",
            ],
        )
        .pick_file(move |selected| {
            let _ = sender.send(selected);
        });
    let selected = receiver.await.map_err(|error| error.to_string())?;
    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = selected.into_path().map_err(|error| error.to_string())?;
    open_path(&app, path)
        .map(Some)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn save_file(
    app: AppHandle,
    content: String,
    suggested_name: String,
) -> Result<Option<String>, String> {
    if suggested_name.len() > 4096 {
        return Err("The suggested file name is too long.".to_owned());
    }
    let name = PathBuf::from(suggested_name)
        .file_name()
        .map(|name| name.to_string_lossy().chars().take(255).collect::<String>())
        .filter(|name| !name.is_empty())
        .unwrap_or_else(|| "diff.txt".to_owned());
    let (sender, receiver) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_file_name(&name)
        .save_file(move |selected| {
            let _ = sender.send(selected);
        });
    let selected = receiver.await.map_err(|error| error.to_string())?;
    let Some(selected) = selected else {
        return Ok(None);
    };
    let path = selected.into_path().map_err(|error| error.to_string())?;
    std::fs::write(&path, content).map_err(|error| error.to_string())?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn get_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
fn list_recent_files(app: AppHandle) -> Result<Vec<RecentFile>, String> {
    read_recent_files(&app_data_dir(&app)?)
}

#[tauri::command]
fn open_recent_file(app: AppHandle, path: String) -> Result<Option<OpenedFile>, String> {
    let directory = app_data_dir(&app)?;
    let recent = read_recent_files(&directory)?;
    if !recent.iter().any(|file| file.path == path) {
        return Ok(None);
    }
    match open_path(&app, PathBuf::from(&path)) {
        Ok(file) => Ok(Some(file)),
        Err(OpenPathError::NotFound) => {
            store::remove_recent_file(&directory, &path)?;
            Ok(None)
        }
        Err(OpenPathError::Other(error)) => Err(error),
    }
}

#[tauri::command]
fn list_history(app: AppHandle) -> Result<Vec<HistoryEntry>, String> {
    read_history_entries(&app_data_dir(&app)?)
}

#[tauri::command]
async fn add_history(
    app: AppHandle,
    original: HistorySide,
    changed: HistorySide,
) -> Result<HistoryAddResult, String> {
    add_history_entry(&app_data_dir(&app)?, original, changed)
}

#[tauri::command]
fn remove_history(app: AppHandle, id: String) -> Result<Vec<HistoryEntry>, String> {
    remove_history_entry(&app_data_dir(&app)?, &id)
}

#[tauri::command]
fn clear_history(app: AppHandle) -> Result<Vec<HistoryEntry>, String> {
    clear_stored_history(&app_data_dir(&app)?)
}

#[tauri::command]
fn get_save_history(app: AppHandle) -> Result<bool, String> {
    read_save_history(&app_data_dir(&app)?)
}

#[tauri::command]
fn set_save_history(app: AppHandle, enabled: bool) -> Result<bool, String> {
    write_save_history(&app_data_dir(&app)?, enabled)
}

#[tauri::command]
async fn compute_diff_cmd(
    original: String,
    changed: String,
    options: DiffOptions,
) -> Result<DiffResult, String> {
    compute_diff(&original, &changed, &options).map_err(|e| e.to_string())
}

#[tauri::command]
async fn highlight_code_cmd(
    code: String,
    language: String,
) -> Result<String, String> {
    highlight_code(&code, &language)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_file,
            save_file,
            get_version,
            list_recent_files,
            open_recent_file,
            list_history,
            add_history,
            remove_history,
            clear_history,
            get_save_history,
            set_save_history,
            compute_diff_cmd,
            highlight_code_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Diffchecker");
}
