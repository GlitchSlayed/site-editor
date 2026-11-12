use serde::Serialize;
use std::{fs, path::Path};
use crate::repo::{detected_version, fail, repo};

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub enum PackageManager {
    Bun,
    Pnpm,
    Yarn,
    Npm,
}

impl PackageManager {
    pub fn as_str(&self) -> &'static str {
        match self {
            PackageManager::Bun => "bun",
            PackageManager::Pnpm => "pnpm",
            PackageManager::Yarn => "yarn",
            PackageManager::Npm => "npm",
        }
    }
}

pub fn detect_package_manager(root: &Path) -> PackageManager {
    if let Ok(data) = fs::read(root.join("package.json")) {
        if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&data) {
            if let Some(pm_str) = val.get("packageManager").and_then(|v| v.as_str()) {
                let trimmed = pm_str.trim().to_lowercase();
                if trimmed.starts_with("bun") {
                    return PackageManager::Bun;
                } else if trimmed.starts_with("pnpm") {
                    return PackageManager::Pnpm;
                } else if trimmed.starts_with("yarn") {
                    return PackageManager::Yarn;
                } else if trimmed.starts_with("npm") {
                    return PackageManager::Npm;
                }
            }
        }
    }

    if root.join("bun.lock").exists() || root.join("bun.lockb").exists() {
        PackageManager::Bun
    } else if root.join("pnpm-lock.yaml").exists() {
        PackageManager::Pnpm
    } else if root.join("yarn.lock").exists() {
        PackageManager::Yarn
    } else if root.join("package-lock.json").exists() {
        PackageManager::Npm
    } else {
        PackageManager::Npm
    }
}

pub fn effective_package_manager(root: &Path) -> (PackageManager, Option<String>) {
    let pm = detect_package_manager(root);
    let (pm_ver, _) = detected_version(root, pm.as_str());
    if !pm_ver.is_empty() {
        return (pm, None);
    }
    if pm != PackageManager::Npm {
        let (npm_ver, _) = detected_version(root, "npm");
        if !npm_ver.is_empty() {
            return (
                PackageManager::Npm,
                Some(format!(
                    "{} was detected from project configuration but is not available on this host. Falling back to npm {}.",
                    pm.as_str(),
                    npm_ver
                )),
            );
        }
    }
    (pm, None)
}

pub fn parse_version_triplet(ver_str: &str) -> Option<(u64, u64, u64)> {
    let cleaned = ver_str.trim().trim_start_matches(|c: char| !c.is_ascii_digit());
    let mut parts = cleaned.split('.');
    let major = parts.next()?.parse::<u64>().ok()?;
    let minor = parts.next().and_then(|v| v.parse::<u64>().ok()).unwrap_or(0);
    let patch = parts.next().and_then(|v| v.parse::<u64>().ok()).unwrap_or(0);
    Some((major, minor, patch))
}

pub fn is_version_compatible(current: &str, required_req: &str) -> bool {
    if required_req == "not specified" || required_req.trim().is_empty() {
        return true;
    }
    let Some(cur) = parse_version_triplet(current) else {
        return false;
    };
    let Some(req) = parse_version_triplet(required_req) else {
        return true;
    };
    cur >= req
}

#[derive(Serialize)]
pub struct Environment {
    pub package_manager: String,
    pub package_manager_version: String,
    pub runtime: String,
    pub runtime_version: String,
    pub required_runtime: String,
    pub runtime_compatible: bool,
    pub node_version: String,
    pub npm_version: String,
    pub required_node: String,
    pub dependencies_installed: bool,
    pub node_compatible: bool,
    pub messages: Vec<String>,
}

#[tauri::command]
pub async fn environment(path: String) -> Result<Environment, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        let (pm, fallback_msg) = effective_package_manager(&root);
        let pm_name = pm.as_str().to_string();

        let package: serde_json::Value =
            serde_json::from_slice(&fs::read(root.join("package.json")).map_err(fail)?).map_err(fail)?;
        let engines = package.get("engines");
        let required_node = engines
            .and_then(|e| e.get("node"))
            .and_then(|v| v.as_str())
            .unwrap_or("not specified")
            .to_string();
        let required_bun = engines
            .and_then(|e| e.get("bun"))
            .and_then(|v| v.as_str())
            .unwrap_or("not specified")
            .to_string();

        let (node, node_error) = detected_version(&root, "node");
        let (pm_ver, pm_error) = detected_version(&root, pm.as_str());
        let npm_ver = if pm == PackageManager::Npm {
            pm_ver.clone()
        } else {
            let (npm, _) = detected_version(&root, "npm");
            npm
        };

        let mut messages = Vec::new();
        if let Some(msg) = fallback_msg {
            messages.push(msg);
        }

        let is_bun_native = pm == PackageManager::Bun;
        let (runtime, runtime_version, required_runtime, runtime_compatible, node_compatible) =
            if is_bun_native {
                let bun_compat = is_version_compatible(&pm_ver, &required_bun);
                let rt_compat = !pm_ver.is_empty() && bun_compat;

                if pm_ver.is_empty() {
                    messages.push("Bun is not available on this host.".into());
                    if let Some(error) = pm_error {
                        messages.push(format!("Bun check failed: {error}"));
                    }
                } else if !bun_compat {
                    messages.push(format!(
                        "Detected Bun {pm_ver}; this site requires {required_bun}."
                    ));
                }

                (
                    "bun".to_string(),
                    pm_ver.clone(),
                    if required_bun != "not specified" {
                        required_bun.clone()
                    } else {
                        "any".to_string()
                    },
                    rt_compat,
                    rt_compat,
                )
            } else {
                let node_compat = is_version_compatible(&node, &required_node);
                let rt_compat = !node.is_empty() && node_compat;

                if node.is_empty() {
                    messages.push("Node.js is not available on this host.".into());
                    if let Some(error) = node_error {
                        messages.push(format!("Node.js check failed: {error}"));
                    }
                } else if !node_compat {
                    messages.push(format!(
                        "Detected Node.js {node}; this site requires {required_node}."
                    ));
                }

                if pm_ver.is_empty() {
                    messages.push(format!("{pm_name} is not available on this host."));
                    if let Some(error) = pm_error {
                        messages.push(format!("{pm_name} check failed: {error}"));
                    }
                }

                (
                    "node".to_string(),
                    node.clone(),
                    required_node.clone(),
                    rt_compat,
                    node_compat,
                )
            };

        let dependencies = root.join("node_modules").is_dir();
        if !dependencies {
            messages.push("Site dependencies are not installed in this repository.".into());
        }

        let reported_required_node = if is_bun_native && required_node == "not specified" {
            format!("bun {}", required_bun)
        } else {
            required_node
        };

        Ok(Environment {
            package_manager: pm_name,
            package_manager_version: pm_ver,
            runtime,
            runtime_version,
            required_runtime,
            runtime_compatible,
            node_version: node,
            npm_version: npm_ver,
            required_node: reported_required_node,
            dependencies_installed: dependencies,
            node_compatible,
            messages,
        })
    })
    .await
    .map_err(fail)?
}

#[derive(Debug, PartialEq, Eq)]
pub struct ExtractedSchema {
    pub project_statuses: Vec<String>,
    pub project_art: Vec<String>,
    pub project_drawings: Vec<String>,
    pub project_visuals: Vec<String>,
    pub common_fields: Vec<String>,
    pub project_fields: Vec<String>,
}

pub fn extract_schema_from_content_config(source: &str) -> Result<ExtractedSchema, String> {
    if source.trim().is_empty() {
        return Err("Failed to parse site content schema: src/content.config.ts is empty.".to_string());
    }

    let extract_enum = |pattern: &regex::Regex, name: &str| -> Result<Vec<String>, String> {
        let caps = pattern.captures(source).ok_or_else(|| {
            format!("Failed to parse site schema from src/content.config.ts: missing {name} z.enum declaration.")
        })?;
        let inner = caps.get(1).or_else(|| caps.get(2)).map(|m| m.as_str()).unwrap_or("");
        let item_re = regex::Regex::new(r#"['"]([^'"]+)['"]"#).map_err(|e| e.to_string())?;
        let items: Vec<String> = item_re.captures_iter(inner).map(|c| c[1].to_string()).collect();
        if items.is_empty() {
            return Err(format!("Failed to parse site schema from src/content.config.ts: {name} enum is empty."));
        }
        Ok(items)
    };

    let status_re = regex::Regex::new(r#"(?:ProjectStatus\s*=\s*z\.enum\(\s*\[([\s\S]*?)\]\s*\)|status\s*:\s*z\.enum\(\s*\[([\s\S]*?)\]\s*\))"#).map_err(|e| e.to_string())?;
    let art_re = regex::Regex::new(r#"art\s*:\s*z\.enum\(\s*\[([\s\S]*?)\]\s*\)"#).map_err(|e| e.to_string())?;
    let drawing_re = regex::Regex::new(r#"drawing\s*:\s*z\.enum\(\s*\[([\s\S]*?)\]\s*\)"#).map_err(|e| e.to_string())?;
    let visual_re = regex::Regex::new(r#"visual\s*:\s*z\.enum\(\s*\[([\s\S]*?)\]\s*\)"#).map_err(|e| e.to_string())?;

    let project_statuses = extract_enum(&status_re, "ProjectStatus")?;
    let project_art = extract_enum(&art_re, "art")?;
    let project_drawings = extract_enum(&drawing_re, "drawing")?;
    let project_visuals = extract_enum(&visual_re, "visual")?;

    let common_re = regex::Regex::new(r#"const\s+common\s*=\s*\{([\s\S]*?)\};"#).map_err(|e| e.to_string())?;
    let common_caps = common_re.captures(source).ok_or_else(|| {
        "Failed to parse site schema from src/content.config.ts: missing common fields declaration.".to_string()
    })?;
    let field_re = regex::Regex::new(r#"(\w+)\s*:\s*z\."#).map_err(|e| e.to_string())?;
    let common_fields: Vec<String> = field_re.captures_iter(&common_caps[1]).map(|c| c[1].to_string()).collect();

    let project_re = regex::Regex::new(r#"projects\s*:\s*defineCollection\(\{[\s\S]*?schema\s*:\s*z\.object\(\{([\s\S]*?)\}\s*\)\s*\}\)"#).map_err(|e| e.to_string())?;
    let project_caps = project_re.captures(source).ok_or_else(|| {
        "Failed to parse site schema from src/content.config.ts: missing projects collection schema.".to_string()
    })?;
    let proj_field_re = regex::Regex::new(r#"(\w+)\s*:\s*(?:z\.|ProjectStatus)"#).map_err(|e| e.to_string())?;
    let project_fields: Vec<String> = proj_field_re.captures_iter(&project_caps[1]).map(|c| c[1].to_string()).collect();

    Ok(ExtractedSchema {
        project_statuses,
        project_art,
        project_drawings,
        project_visuals,
        common_fields,
        project_fields,
    })
}

pub fn validate_repo_schema(extracted: &ExtractedSchema) -> Vec<String> {
    let mut issues = Vec::new();
    let required_common = ["title", "description", "date", "tags", "draft", "sample", "featured"];
    for field in required_common {
        if !extracted.common_fields.iter().any(|f| f == field) {
            issues.push(format!("The site schema does not declare expected common field '{field}'."));
        }
    }

    let required_projects = ["status", "art", "drawing", "engineering", "visual", "visualAccent", "visualImage", "visualImageAlt", "visualLabel", "visualAnimate"];
    for field in required_projects {
        if !extracted.project_fields.iter().any(|f| f == field) {
            issues.push(format!("The site schema does not declare expected project field '{field}'."));
        }
    }

    for status in ["Concept", "In Development", "Prototype", "Completed", "Released"] {
        if !extracted.project_statuses.iter().any(|s| s == status) {
            issues.push(format!("The site schema does not contain expected project status '{status}'."));
        }
    }

    for art in ["wing", "orbit", "code"] {
        if !extracted.project_art.iter().any(|a| a == art) {
            issues.push(format!("The site schema does not contain expected project art '{art}'."));
        }
    }

    for visual in ["dither", "grain", "mesh", "grid", "dots", "asset", "screenshot"] {
        if !extracted.project_visuals.iter().any(|v| v == visual) {
            issues.push(format!("The site schema does not contain expected project visual '{visual}'."));
        }
    }

    for drawing in ["airfoils", "bwb", "uki", "gofr", "rocket", "wing", "orbit", "code"] {
        if !extracted.project_drawings.iter().any(|d| d == drawing) {
            issues.push(format!("The site schema does not contain expected project drawing '{drawing}'."));
        }
    }

    issues
}

#[tauri::command]
pub async fn validate_repo(path: String) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        let schema_path = root.join("src/content.config.ts");
        if !schema_path.exists() {
            return Err("Repository is missing src/content.config.ts".to_string());
        }
        let schema_text = fs::read_to_string(&schema_path).map_err(fail)?;
        let extracted = extract_schema_from_content_config(&schema_text)?;
        Ok(validate_repo_schema(&extracted))
    })
    .await
    .map_err(fail)?
}
