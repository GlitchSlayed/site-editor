use serde::Serialize;
use std::{
    fs,
    io::{Read, Write},
    path::Path,
};
use crate::repo::{fail, hash, repo, safe_file, validate_slug};

#[derive(Serialize, Clone, Debug)]
pub struct Entry {
    pub path: String,
    pub kind: String,
    pub title: String,
    pub draft: bool,
    pub modified: String,
}

#[derive(Serialize, Clone, Debug)]
pub struct FileData {
    pub text: String,
    pub hash: String,
}

pub fn split_frontmatter(text: &str) -> Option<(&str, &str, &str)> {
    let (first_fence, rest) = if let Some(stripped) = text.strip_prefix("---\r\n") {
        ("---\r\n", stripped)
    } else if let Some(stripped) = text.strip_prefix("---\n") {
        ("---\n", stripped)
    } else {
        return None;
    };

    let patterns = ["\r\n---\r\n", "\r\n---\n", "\n---\r\n", "\n---\n", "\r\n---", "\n---"];
    for pat in patterns {
        if let Some(pos) = rest.find(pat) {
            let yaml = &rest[..pos];
            let after_fence = &rest[pos + pat.len()..];
            let ending = if first_fence.contains("\r\n") { "\r\n" } else { "\n" };
            return Some((yaml, after_fence, ending));
        }
    }
    None
}

pub fn parse_frontmatter_metadata(text: &str) -> (Option<String>, bool) {
    let Some((yaml, _, _)) = split_frontmatter(text) else {
        return (None, false);
    };

    if let Ok(value) = serde_yaml::from_str::<serde_yaml::Value>(yaml) {
        if let Some(mapping) = value.as_mapping() {
            let title = mapping
                .get(&serde_yaml::Value::String("title".to_string()))
                .and_then(|v| {
                    if let Some(s) = v.as_str() {
                        Some(s.trim().to_string())
                    } else if let Some(n) = v.as_i64() {
                        Some(n.to_string())
                    } else {
                        None
                    }
                });

            let draft = mapping
                .get(&serde_yaml::Value::String("draft".to_string()))
                .and_then(|v| v.as_bool())
                .unwrap_or(false);

            return (title, draft);
        }
    }

    let mut fallback_title = None;
    let mut fallback_draft = false;
    for line in yaml.lines() {
        if !line.starts_with(' ') && !line.starts_with('\t') {
            if let Some(rest) = line.strip_prefix("title:") {
                let t = rest.trim().trim_matches(['"', '\'']).to_string();
                if !t.is_empty() {
                    fallback_title = Some(t);
                }
            } else if let Some(rest) = line.strip_prefix("draft:") {
                if rest.trim() == "true" {
                    fallback_draft = true;
                }
            }
        }
    }
    (fallback_title, fallback_draft)
}

pub fn duplicate_article_text(original: &str, new_title: &str) -> Result<String, String> {
    let is_crlf = original.contains("\r\n");
    let line_ending = if is_crlf { "\r\n" } else { "\n" };
    let has_trailing_newline = original.ends_with('\n');

    let Some((yaml_str, body, _)) = split_frontmatter(original) else {
        let mut out = format!(
            "---{line_ending}title: \"{}\"{line_ending}draft: true{line_ending}---{line_ending}",
            new_title.replace('"', "\\\"")
        );
        if !original.is_empty() {
            out.push_str(original);
            if has_trailing_newline && !out.ends_with('\n') {
                out.push_str(line_ending);
            }
        }
        return Ok(out);
    };

    let mut updated_lines = Vec::new();
    let mut title_replaced = false;
    let mut draft_replaced = false;

    for line in yaml_str.split(line_ending) {
        if !line.starts_with(' ') && !line.starts_with('\t') {
            if line.starts_with("title:") {
                updated_lines.push(format!("title: \"{}\"", new_title.replace('"', "\\\"")));
                title_replaced = true;
                continue;
            } else if line.starts_with("draft:") {
                updated_lines.push("draft: true".to_string());
                draft_replaced = true;
                continue;
            }
        }
        updated_lines.push(line.to_string());
    }

    if !title_replaced {
        updated_lines.insert(0, format!("title: \"{}\"", new_title.replace('"', "\\\"")));
    }
    if !draft_replaced {
        updated_lines.push("draft: true".to_string());
    }

    let updated_yaml = updated_lines.join(line_ending);
    let mut result = format!("---{line_ending}{updated_yaml}{line_ending}---{line_ending}{body}");
    if has_trailing_newline && !result.ends_with('\n') {
        result.push_str(line_ending);
    } else if !has_trailing_newline && result.ends_with('\n') {
        while result.ends_with('\n') || result.ends_with('\r') {
            result.pop();
        }
    }
    Ok(result)
}

fn read_frontmatter_prefix(path: &Path) -> Result<String, std::io::Error> {
    let mut f = fs::File::open(path)?;
    let mut buf = vec![0u8; 8192];
    let n = f.read(&mut buf)?;
    buf.truncate(n);
    if let Ok(s) = String::from_utf8(buf) {
        if split_frontmatter(&s).is_some() {
            return Ok(s);
        }
    }
    fs::read_to_string(path)
}

#[tauri::command]
pub async fn list_content(path: String) -> Result<Vec<Entry>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        let mut out = Vec::new();
        for (kind, dir) in [("Writing", "src/content/writing"), ("Projects", "src/content/projects")] {
            let d = root.join(dir);
            if !d.exists() {
                continue;
            }
            for item in fs::read_dir(d).map_err(fail)? {
                let item = item.map_err(fail)?;
                let p = item.path();
                if !matches!(p.extension().and_then(|e| e.to_str()), Some("md" | "mdx")) {
                    continue;
                }
                let real = p.canonicalize().map_err(fail)?;
                if !real.starts_with(&root) || !real.is_file() {
                    continue;
                }
                let prefix_text = read_frontmatter_prefix(&real).unwrap_or_default();
                let (parsed_title, draft) = parse_frontmatter_metadata(&prefix_text);
                let title = parsed_title.unwrap_or_else(|| p.file_stem().unwrap().to_string_lossy().to_string());
                let modified = fs::metadata(&real)
                    .ok()
                    .and_then(|m| m.modified().ok())
                    .map(|t| format!("{:?}", t))
                    .unwrap_or_default();
                out.push(Entry {
                    path: real.strip_prefix(&root).unwrap().to_string_lossy().replace('\\', "/"),
                    kind: kind.into(),
                    title,
                    draft,
                    modified,
                });
            }
        }
        out.sort_by(|a, b| a.kind.cmp(&b.kind).then_with(|| a.title.to_lowercase().cmp(&b.title.to_lowercase())));
        Ok(out)
    })
    .await
    .map_err(fail)?
}

#[tauri::command]
pub async fn read_article(path: String, file: String) -> Result<FileData, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        let p = safe_file(&root, &file)?;
        let bytes = fs::read(p).map_err(fail)?;
        let text = String::from_utf8(bytes.clone()).map_err(fail)?;
        Ok(FileData {
            text,
            hash: hash(&bytes),
        })
    })
    .await
    .map_err(fail)?
}

#[tauri::command]
pub async fn save_article(
    path: String,
    file: String,
    text: String,
    expected_hash: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        let p = safe_file(&root, &file)?;
        let current = fs::read(&p).map_err(fail)?;
        if hash(&current) != expected_hash {
            return Err("This file changed outside the editor. Reload it or compare changes before saving.".into());
        }
        let tmp = p.with_extension(format!("{}.editor-tmp", p.extension().and_then(|x| x.to_str()).unwrap_or("md")));
        let mut f = fs::File::create(&tmp).map_err(fail)?;
        f.write_all(text.as_bytes()).map_err(fail)?;
        f.sync_all().map_err(fail)?;
        fs::rename(&tmp, &p).map_err(fail)?;
        Ok(hash(text.as_bytes()))
    })
    .await
    .map_err(fail)?
}

#[tauri::command]
pub async fn create_article(
    path: String,
    kind: String,
    slug: String,
    extension: String,
    title: String,
    text: String,
) -> Result<Entry, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        let (label, relative) = match kind.as_str() {
            "writing" => ("Writing", "src/content/writing"),
            "projects" => ("Projects", "src/content/projects"),
            _ => return Err("Choose Writing or Projects for the new document.".into()),
        };
        if !matches!(extension.as_str(), "md" | "mdx") {
            return Err("Choose Markdown (.md) or MDX (.mdx) for the new document.".into());
        }
        validate_slug(&slug)?;
        let directory = root.join(relative).canonicalize().map_err(fail)?;
        if !directory.starts_with(&root) || !directory.is_dir() {
            return Err("The content folder is outside the selected repository.".into());
        }
        let target = directory.join(format!("{slug}.{extension}"));
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&target)
            .map_err(|e| {
                if e.kind() == std::io::ErrorKind::AlreadyExists {
                    "A file with that name already exists.".to_string()
                } else {
                    fail(e)
                }
            })?;
        if let Err(error) = file.write_all(text.as_bytes()).and_then(|_| file.sync_all()) {
            let _ = fs::remove_file(&target);
            return Err(fail(error));
        }
        Ok(Entry {
            path: format!("{relative}/{slug}.{extension}"),
            kind: label.into(),
            title,
            draft: true,
            modified: String::new(),
        })
    })
    .await
    .map_err(fail)?
}

#[tauri::command]
pub async fn rename_article(path: String, file: String, new_slug: String) -> Result<Entry, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        let old_path = safe_file(&root, &file)?;
        validate_slug(&new_slug)?;
        let extension = old_path.extension().and_then(|e| e.to_str()).ok_or("File has no extension")?;
        let parent = old_path.parent().ok_or("Invalid file parent")?;
        let new_file_name = format!("{new_slug}.{extension}");
        let new_path = parent.join(&new_file_name);
        if new_path.exists() {
            return Err("A file with that name already exists.".into());
        }
        fs::rename(&old_path, &new_path).map_err(fail)?;
        let rel = new_path.strip_prefix(&root).map_err(fail)?.to_string_lossy().replace('\\', "/");
        let kind = if rel.starts_with("src/content/writing/") { "Writing" } else { "Projects" };
        let text = fs::read_to_string(&new_path).unwrap_or_default();
        let (parsed_title, draft) = parse_frontmatter_metadata(&text);
        let title = parsed_title.unwrap_or_else(|| new_slug.clone());
        Ok(Entry {
            path: rel,
            kind: kind.into(),
            title,
            draft,
            modified: String::new(),
        })
    })
    .await
    .map_err(fail)?
}

#[tauri::command]
pub async fn delete_article(path: String, file: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        let target = safe_file(&root, &file)?;
        if !file.starts_with("src/content/writing/") && !file.starts_with("src/content/projects/") {
            return Err("Only content documents can be deleted.".into());
        }
        // Move to OS trash via trash crate; fall back to removal if trash fails
        if trash::delete(&target).is_err() {
            fs::remove_file(&target).map_err(fail)?;
        }
        Ok(())
    })
    .await
    .map_err(fail)?
}

#[tauri::command]
pub async fn duplicate_article(
    path: String,
    file: String,
    new_slug: String,
    new_title: String,
) -> Result<Entry, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        let source = safe_file(&root, &file)?;
        validate_slug(&new_slug)?;
        let extension = source.extension().and_then(|e| e.to_str()).ok_or("File has no extension")?;
        let parent = source.parent().ok_or("Invalid source parent")?;
        let target = parent.join(format!("{new_slug}.{extension}"));
        if target.exists() {
            return Err("A file with that name already exists.".into());
        }
        let original_text = fs::read_to_string(&source).map_err(fail)?;
        let duplicated_text = duplicate_article_text(&original_text, &new_title)?;
        let mut out = fs::OpenOptions::new().write(true).create_new(true).open(&target).map_err(fail)?;
        out.write_all(duplicated_text.as_bytes()).map_err(fail)?;
        out.sync_all().map_err(fail)?;
        let rel = target.strip_prefix(&root).map_err(fail)?.to_string_lossy().replace('\\', "/");
        let kind = if rel.starts_with("src/content/writing/") { "Writing" } else { "Projects" };
        Ok(Entry {
            path: rel,
            kind: kind.into(),
            title: new_title,
            draft: true,
            modified: String::new(),
        })
    })
    .await
    .map_err(fail)?
}
