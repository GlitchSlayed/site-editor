use sha2::{Digest, Sha256};
use std::{
    path::{Path, PathBuf},
    process::Command,
};
use serde::Deserialize;

pub const ALLOWED_PROGRAMS: &[&str] = &["git", "node", "npm", "bun", "pnpm", "yarn"];

#[derive(Deserialize)]
pub struct PortalDocument {
    pub id: String,
    pub path: String,
    pub origin: String,
}

pub fn fail<T: std::fmt::Display>(e: T) -> String {
    e.to_string()
}

pub fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

pub fn repo(path: &str) -> Result<PathBuf, String> {
    let p = Path::new(path).canonicalize().map_err(fail)?;
    if !p.is_dir()
        || !p.join(".git").exists()
        || !p.join("package.json").exists()
        || !p.join("astro.config.mjs").exists()
    {
        return Err("Choose a Git checkout containing package.json and astro.config.mjs.".into());
    }
    Ok(p)
}

pub fn validate_slug(slug: &str) -> Result<(), String> {
    if slug.is_empty()
        || !slug.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        || slug.starts_with('-')
        || slug.ends_with('-')
        || slug.contains("--")
    {
        return Err("Use a lowercase URL-safe filename with letters, numbers, and single hyphens.".into());
    }
    Ok(())
}

pub fn safe_file(root: &Path, rel: &str) -> Result<PathBuf, String> {
    let relp = Path::new(rel);
    if relp.is_absolute()
        || relp.components().any(|c| !matches!(c, std::path::Component::Normal(_)))
    {
        return Err("Invalid repository path.".into());
    }
    let p = root.join(relp);
    let real = p.canonicalize().map_err(fail)?;
    if !real.starts_with(root) || !real.is_file() {
        return Err("The selected file is outside the repository or is not a regular file.".into());
    }
    Ok(real)
}

pub fn after_document_id(path: &Path, id: &str) -> Option<PathBuf> {
    let mut found = false;
    let mut suffix = PathBuf::new();
    for component in path.components() {
        if found {
            suffix.push(component.as_os_str());
        } else if component.as_os_str() == id {
            found = true;
        }
    }
    if found {
        Some(suffix)
    } else {
        None
    }
}

pub fn host_repository(root: &Path) -> Result<PathBuf, String> {
    if std::env::var_os("FLATPAK_ID").is_none() {
        return Ok(root.to_path_buf());
    }
    let output = Command::new("flatpak-spawn")
        .args(["--host", "--watch-bus", "flatpak", "documents", "--json", "--columns=all", "com.glitchslayed.site-editor"])
        .output()
        .map_err(fail)?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let documents: Vec<PortalDocument> = serde_json::from_slice(&output.stdout).map_err(fail)?;
    for document in documents {
        let Some(document_relative) = after_document_id(Path::new(&document.path), &document.id) else {
            continue;
        };
        let Some(root_relative) = after_document_id(root, &document.id) else {
            continue;
        };
        let Ok(extra) = root_relative.strip_prefix(&document_relative) else {
            continue;
        };
        return Ok(Path::new(&document.origin).join(extra));
    }
    Err("The site folder’s document portal grant is missing. Reopen the repository with the folder picker, then save again.".into())
}

pub fn command(root: &Path, program: &str) -> Result<Command, String> {
    if !ALLOWED_PROGRAMS.contains(&program) {
        return Err(format!("Program '{program}' is not in the allowed command list."));
    }
    if std::env::var_os("FLATPAK_ID").is_some() {
        let host_root = host_repository(root)?;
        let mut c = Command::new("flatpak-spawn");
        c.arg("--host")
            .arg("--watch-bus")
            .arg(format!("--directory={}", host_root.display()))
            .arg(program);
        Ok(c)
    } else {
        let mut c = Command::new(program);
        c.current_dir(root);
        Ok(c)
    }
}

pub fn run_host_program(
    root: &Path,
    program: &str,
    args: &[&str],
) -> Result<crate::jobs::CommandResult, String> {
    if !ALLOWED_PROGRAMS.contains(&program) {
        return Err(format!("Program '{program}' is not in the allowed command list."));
    }
    let o = command(root, program)?.args(args).output().map_err(fail)?;
    Ok(crate::jobs::CommandResult {
        code: o.status.code().unwrap_or(-1),
        output: String::from_utf8_lossy(&o.stdout).to_string()
            + &String::from_utf8_lossy(&o.stderr),
    })
}

pub fn run_host_version(root: &Path, program: &str) -> Result<crate::jobs::CommandResult, String> {
    if !ALLOWED_PROGRAMS.contains(&program) {
        return Err(format!("Program '{program}' is not in the allowed command list."));
    }
    let o = if std::env::var_os("FLATPAK_ID").is_some() {
        Command::new("flatpak-spawn")
            .args(["--host", "--watch-bus", program, "--version"])
            .output()
            .map_err(fail)?
    } else {
        command(root, program)?.arg("--version").output().map_err(fail)?
    };
    Ok(crate::jobs::CommandResult {
        code: o.status.code().unwrap_or(-1),
        output: String::from_utf8_lossy(&o.stdout).to_string()
            + &String::from_utf8_lossy(&o.stderr),
    })
}

pub fn detected_version(root: &Path, program: &str) -> (String, Option<String>) {
    match run_host_version(root, program) {
        Ok(result) if result.code == 0 => (result.output.trim().to_string(), None),
        Ok(result) => (
            String::new(),
            Some(if result.output.trim().is_empty() {
                format!("{program} exited with code {}.", result.code)
            } else {
                result.output.trim().to_string()
            }),
        ),
        Err(error) => (String::new(), Some(error)),
    }
}

pub fn publishable_path(rel: &str) -> bool {
    let path = Path::new(rel);
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if (rel.starts_with("src/content/writing/") || rel.starts_with("src/content/projects/"))
        && matches!(ext.as_str(), "md" | "mdx")
    {
        return true;
    }
    rel.starts_with("public/")
        && matches!(
            ext.as_str(),
            "png" | "jpg" | "jpeg" | "webp" | "avif" | "gif" | "svg" | "mp4" | "pdf" | "woff" | "woff2"
        )
}
