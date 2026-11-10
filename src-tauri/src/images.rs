use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};
use crate::repo::{fail, repo, safe_file};

pub fn image_mime(path: &Path) -> Result<&'static str, String> {
    match path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "png" => Ok("image/png"),
        "jpg" | "jpeg" => Ok("image/jpeg"),
        "webp" => Ok("image/webp"),
        "avif" => Ok("image/avif"),
        "gif" => Ok("image/gif"),
        "svg" => Ok("image/svg+xml"),
        _ => Err("Choose a PNG, JPEG, WebP, AVIF, GIF, or SVG image.".into()),
    }
}

pub fn validate_image_magic_bytes(bytes: &[u8], ext: &str) -> Result<(), String> {
    if bytes.is_empty() {
        return Err("Image file is empty.".into());
    }

    match ext {
        "png" => {
            if bytes.len() < 8 || &bytes[..8] != [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] {
                return Err("File contents do not match PNG format.".into());
            }
        }
        "jpg" | "jpeg" => {
            if bytes.len() < 3 || &bytes[..3] != [0xFF, 0xD8, 0xFF] {
                return Err("File contents do not match JPEG format.".into());
            }
        }
        "gif" => {
            if bytes.len() < 6 || (&bytes[..6] != b"GIF87a" && &bytes[..6] != b"GIF89a") {
                return Err("File contents do not match GIF format.".into());
            }
        }
        "webp" => {
            if bytes.len() < 12 || &bytes[..4] != b"RIFF" || &bytes[8..12] != b"WEBP" {
                return Err("File contents do not match WebP format.".into());
            }
        }
        "avif" => {
            if bytes.len() < 12 || !bytes[..bytes.len().min(32)].windows(4).any(|w| w == b"ftyp") {
                return Err("File contents do not match AVIF format.".into());
            }
        }
        "svg" => {
            let text = String::from_utf8_lossy(bytes).to_lowercase();
            if !text.contains("<svg") {
                return Err("File contents do not contain an SVG element.".into());
            }
            if text.contains("<script")
                || text.contains("onload=")
                || text.contains("onclick=")
                || text.contains("onerror=")
                || text.contains("javascript:")
            {
                return Err("SVG contains forbidden script content or event handlers.".into());
            }
        }
        _ => return Err("Unsupported image extension.".into()),
    }
    Ok(())
}

#[tauri::command]
pub async fn import_site_image(
    path: String,
    article: String,
    source_path: String,
    usage: String,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        let article_path = safe_file(&root, &article)?;

        let family = if article.starts_with("src/content/writing/") {
            "posts"
        } else if article.starts_with("src/content/projects/") {
            "projects"
        } else {
            return Err("Images can only be added to a writing or project document.".into());
        };

        if usage != "content" && usage != "visual" {
            return Err("Choose a supported image destination.".into());
        }
        if usage == "visual" && family != "projects" {
            return Err("Project visual images can only be attached to a project.".into());
        }

        let source = Path::new(&source_path).canonicalize().map_err(fail)?;
        if !source.is_file() {
            return Err("Choose a regular image file.".into());
        }
        let ext = source
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        let _ = image_mime(&source)?;
        let bytes = fs::read(&source).map_err(fail)?;
        if bytes.is_empty() || bytes.len() > 20 * 1024 * 1024 {
            return Err("Images must be between 1 byte and 20 MB.".into());
        }
        validate_image_magic_bytes(&bytes, &ext)?;

        let stem = article_path
            .file_stem()
            .and_then(|s| s.to_str())
            .ok_or("The document name is invalid.")?;
        let mut safe_stem = String::new();
        for ch in source
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("image")
            .chars()
        {
            if ch.is_ascii_alphanumeric() {
                safe_stem.push(ch.to_ascii_lowercase());
            } else if !safe_stem.is_empty() && !safe_stem.ends_with('-') {
                safe_stem.push('-');
            }
        }
        let safe_stem = safe_stem.trim_matches('-');
        let safe_stem = if safe_stem.is_empty() { "image" } else { safe_stem };

        let relative_dir = PathBuf::from("public").join("images").join(family).join(stem);
        let directory = root.join(&relative_dir);
        fs::create_dir_all(&directory).map_err(fail)?;
        let real_directory = directory.canonicalize().map_err(fail)?;
        if !real_directory.starts_with(&root)
            || !real_directory.starts_with(root.join("public").canonicalize().map_err(fail)?)
        {
            return Err("The image destination resolves outside this repository's public folder.".into());
        }

        let mut filename = format!("{safe_stem}.{ext}");
        let mut suffix = 2;
        while real_directory.join(&filename).exists() {
            filename = format!("{safe_stem}-{suffix}.{ext}");
            suffix += 1;
        }

        let target = real_directory.join(&filename);
        let mut output = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&target)
            .map_err(fail)?;
        output.write_all(&bytes).and_then(|_| output.sync_all()).map_err(fail)?;

        Ok(relative_dir.join(filename).to_string_lossy().replace('\\', "/"))
    })
    .await
    .map_err(fail)?
}

#[tauri::command]
pub async fn read_site_image(path: String, asset: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        let relative = Path::new(&asset);
        if relative.is_absolute()
            || relative
                .components()
                .any(|c| !matches!(c, std::path::Component::Normal(_)))
            || !asset.starts_with("images/")
        {
            return Err("Invalid public image path.".into());
        }
        let public = root.join("public").canonicalize().map_err(fail)?;
        if !public.starts_with(&root) {
            return Err("The site's public folder resolves outside the repository.".into());
        }
        let file = public.join(relative);
        let real = file.canonicalize().map_err(fail)?;
        if !real.starts_with(&public) || !real.is_file() {
            return Err("The image is outside the site's public folder.".into());
        }
        let mime = image_mime(&real)?;
        let ext = real
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        let bytes = fs::read(&real).map_err(fail)?;
        if bytes.len() > 20 * 1024 * 1024 {
            return Err("Preview images must be smaller than 20 MB.".into());
        }
        validate_image_magic_bytes(&bytes, &ext)?;
        Ok(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
    })
    .await
    .map_err(fail)?
}
