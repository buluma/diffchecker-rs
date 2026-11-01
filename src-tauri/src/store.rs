use std::{
    fs,
    path::Path,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{de::DeserializeOwned, Deserialize, Serialize};
use uuid::Uuid;

pub const MAX_RECENT_FILES: usize = 10;
pub const MAX_HISTORY_ENTRIES: usize = 20;
pub const MAX_SIDE_BYTES: usize = 1024 * 1024;
pub const MAX_HISTORY_BYTES: usize = 20 * 1024 * 1024;
pub const MAX_OPEN_BYTES: usize = 5 * 1024 * 1024;
const MAX_PATH_LENGTH: usize = 4096;
static STORE_LOCK: Mutex<()> = Mutex::new(());

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistorySide {
    pub path: Option<String>,
    pub content: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: String,
    pub created_at: u64,
    pub original: HistorySide,
    pub changed: HistorySide,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentFile {
    pub path: String,
    pub opened_at: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryAddResult {
    pub entries: Vec<HistoryEntry>,
    pub status: &'static str,
}

#[derive(Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    save_history: Option<bool>,
}

fn read_json<T: DeserializeOwned + Default>(path: &Path) -> T {
    let backup = path.with_extension("json.bak");
    if !path.exists() && backup.exists() {
        let _ = fs::rename(&backup, path);
    }
    fs::read(path)
        .ok()
        .and_then(|data| serde_json::from_slice(&data).ok())
        .unwrap_or_default()
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let data = serde_json::to_vec(value).map_err(|error| error.to_string())?;
    let temp = path.with_extension(format!("json.{}.tmp", Uuid::new_v4()));
    fs::write(&temp, data).map_err(|error| error.to_string())?;
    if path.exists() {
        let backup = path.with_extension("json.bak");
        if backup.exists() {
            fs::remove_file(&backup).map_err(|error| error.to_string())?;
        }
        fs::rename(path, &backup).map_err(|error| error.to_string())?;
        if let Err(error) = fs::rename(&temp, path) {
            let _ = fs::rename(&backup, path);
            return Err(error.to_string());
        }
        fs::remove_file(backup).map_err(|error| error.to_string())?;
        Ok(())
    } else {
        fs::rename(&temp, path).map_err(|error| error.to_string())
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn validate_side(side: &HistorySide) -> Result<(), String> {
    if side.content.as_bytes().len() > MAX_SIDE_BYTES {
        return Err("too-large".to_owned());
    }
    if side
        .path
        .as_ref()
        .is_some_and(|path| path.len() > MAX_PATH_LENGTH)
    {
        return Err("invalid".to_owned());
    }
    Ok(())
}

pub fn list_recent_files(directory: &Path) -> Result<Vec<RecentFile>, String> {
    Ok(read_json(&directory.join("recent-files.json")))
}

pub fn add_recent_file(directory: &Path, path: &str) -> Result<(), String> {
    let _guard = STORE_LOCK
        .lock()
        .map_err(|_| "store lock poisoned".to_owned())?;
    let file = directory.join("recent-files.json");
    let mut recent: Vec<RecentFile> = read_json(&file);
    recent.retain(|item| item.path != path);
    recent.insert(
        0,
        RecentFile {
            path: path.to_owned(),
            opened_at: now_ms(),
        },
    );
    recent.truncate(MAX_RECENT_FILES);
    write_json(&file, &recent)
}

pub fn remove_recent_file(directory: &Path, path: &str) -> Result<(), String> {
    let _guard = STORE_LOCK
        .lock()
        .map_err(|_| "store lock poisoned".to_owned())?;
    let file = directory.join("recent-files.json");
    let mut recent: Vec<RecentFile> = read_json(&file);
    recent.retain(|item| item.path != path);
    write_json(&file, &recent)
}

pub fn list_history(directory: &Path) -> Result<Vec<HistoryEntry>, String> {
    let mut history: Vec<HistoryEntry> = read_json(&directory.join("history.json"));
    history.retain(|entry| {
        validate_side(&entry.original).is_ok() && validate_side(&entry.changed).is_ok()
    });
    Ok(history)
}

pub fn add_history_entry(
    directory: &Path,
    original: HistorySide,
    changed: HistorySide,
) -> Result<HistoryAddResult, String> {
    let _guard = STORE_LOCK
        .lock()
        .map_err(|_| "store lock poisoned".to_owned())?;
    let mut history = list_history(directory)?;
    if !get_save_history(directory)? {
        return Ok(HistoryAddResult {
            entries: history,
            status: "disabled",
        });
    }
    let status = match (validate_side(&original), validate_side(&changed)) {
        (Ok(()), Ok(())) if !original.content.is_empty() || !changed.content.is_empty() => "saved",
        (Err(reason), _) | (_, Err(reason)) if reason == "too-large" => "too-large",
        _ => "disabled",
    };
    if status != "saved" {
        return Ok(HistoryAddResult {
            entries: history,
            status,
        });
    }

    history.retain(|entry| {
        entry.original.path != original.path
            || entry.original.content != original.content
            || entry.changed.path != changed.path
            || entry.changed.content != changed.content
    });
    history.insert(
        0,
        HistoryEntry {
            id: Uuid::new_v4().to_string(),
            created_at: now_ms(),
            original,
            changed,
        },
    );
    history.truncate(MAX_HISTORY_ENTRIES);
    let mut total_bytes: usize = history
        .iter()
        .map(|item| item.original.content.len() + item.changed.content.len())
        .sum();
    while history.len() > 1 && total_bytes > MAX_HISTORY_BYTES {
        if let Some(removed) = history.pop() {
            total_bytes -= removed.original.content.len() + removed.changed.content.len();
        }
    }
    write_json(&directory.join("history.json"), &history)?;
    Ok(HistoryAddResult {
        entries: history,
        status,
    })
}

pub fn remove_history_entry(directory: &Path, id: &str) -> Result<Vec<HistoryEntry>, String> {
    let _guard = STORE_LOCK
        .lock()
        .map_err(|_| "store lock poisoned".to_owned())?;
    let mut history = list_history(directory)?;
    history.retain(|entry| entry.id != id);
    write_json(&directory.join("history.json"), &history)?;
    Ok(history)
}

pub fn clear_history(directory: &Path) -> Result<Vec<HistoryEntry>, String> {
    let _guard = STORE_LOCK
        .lock()
        .map_err(|_| "store lock poisoned".to_owned())?;
    write_json(&directory.join("history.json"), &Vec::<HistoryEntry>::new())?;
    Ok(Vec::new())
}

pub fn get_save_history(directory: &Path) -> Result<bool, String> {
    let settings: Settings = read_json(&directory.join("settings.json"));
    Ok(settings.save_history.unwrap_or(true))
}

pub fn set_save_history(directory: &Path, enabled: bool) -> Result<bool, String> {
    let _guard = STORE_LOCK
        .lock()
        .map_err(|_| "store lock poisoned".to_owned())?;
    write_json(
        &directory.join("settings.json"),
        &Settings {
            save_history: Some(enabled),
        },
    )?;
    Ok(enabled)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn side(path: Option<&str>, content: &str) -> HistorySide {
        HistorySide {
            path: path.map(str::to_owned),
            content: content.to_owned(),
        }
    }

    #[test]
    fn reads_existing_electron_store_files_and_setting_names() {
        let directory = tempdir().unwrap();
        fs::write(
            directory.path().join("recent-files.json"),
            r#"[{"path":"/tmp/old.txt","openedAt":42}]"#,
        )
        .unwrap();
        fs::write(
            directory.path().join("history.json"),
            r#"[{"id":"legacy","createdAt":123,"original":{"path":null,"content":"left"},"changed":{"path":"/tmp/old.txt","content":"right"}}]"#,
        )
        .unwrap();
        fs::write(
            directory.path().join("settings.json"),
            r#"{"saveHistory":false}"#,
        )
        .unwrap();

        let recent = list_recent_files(directory.path()).unwrap();
        let history = list_history(directory.path()).unwrap();
        assert_eq!(recent[0].path, "/tmp/old.txt");
        assert_eq!(recent[0].opened_at, 42);
        assert_eq!(history[0].created_at, 123);
        assert!(!get_save_history(directory.path()).unwrap());

        let result = add_history_entry(
            directory.path(),
            side(None, "new left"),
            side(None, "new right"),
        )
        .unwrap();
        assert_eq!(result.status, "disabled");
        assert_eq!(result.entries.len(), 1);
    }

    #[test]
    fn history_defaults_on_and_deduplicates_saved_comparisons() {
        let directory = tempdir().unwrap();
        assert!(get_save_history(directory.path()).unwrap());

        let original = side(Some("/tmp/original.txt"), "left");
        let changed = side(None, "right");
        let first = add_history_entry(directory.path(), original.clone(), changed.clone()).unwrap();
        let duplicate = add_history_entry(directory.path(), original, changed).unwrap();

        assert_eq!(first.status, "saved");
        assert_eq!(first.entries.len(), 1);
        assert_eq!(duplicate.entries.len(), 1);
    }

    #[test]
    fn recent_files_keep_the_ten_most_recent_paths() {
        let directory = tempdir().unwrap();
        for index in 0..12 {
            add_recent_file(directory.path(), &format!("/tmp/{index}.txt")).unwrap();
        }

        let recent = list_recent_files(directory.path()).unwrap();
        assert_eq!(recent.len(), MAX_RECENT_FILES);
        assert_eq!(recent[0].path, "/tmp/11.txt");
        assert_eq!(recent[9].path, "/tmp/2.txt");
    }
}
