pub mod content;
pub mod devserver;
pub mod env;
pub mod git;
pub mod images;
pub mod jobs;
pub mod repo;

use std::sync::{Arc, Mutex};
use devserver::{DevServerManager, DevServerState};
use jobs::{JobManager, JobsState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(JobsState(Arc::new(JobManager::default())))
        .manage(DevServerState(Arc::new(Mutex::new(DevServerManager::default()))))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            content::list_content,
            content::create_article,
            content::rename_article,
            content::delete_article,
            content::duplicate_article,
            content::read_article,
            content::save_article,
            images::import_site_image,
            images::read_site_image,
            jobs::project_command,
            jobs::cancel_project_command,
            env::environment,
            env::validate_repo,
            git::git_info,
            git::git_diff_file,
            git::publish,
            devserver::run_dev_server,
            devserver::stop_dev_server,
            devserver::dev_server_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn git_ahead_behind_counts_are_parsed_in_order() {
        assert_eq!(git::parse_counts("3\t2\n"), (3, 2));
        assert_eq!(git::parse_counts("bad 4"), (0, 4));
        assert_eq!(git::parse_counts(""), (0, 0));
    }

    #[test]
    fn publish_allowlist_excludes_site_code_and_non_asset_public_files() {
        assert!(repo::publishable_path("src/content/writing/story.mdx"));
        assert!(repo::publishable_path("public/images/rocket.webp"));
        assert!(!repo::publishable_path("src/pages/index.astro"));
        assert!(!repo::publishable_path("public/.env"));
        assert!(!repo::publishable_path("public/scripts/app.js"));
    }

    #[test]
    fn repository_file_paths_cannot_escape_or_follow_outside_symlinks() {
        let dir = std::env::temp_dir().join(format!("site-editor-path-test-{}", std::process::id()));
        let outside = dir.with_extension("outside");
        let _ = fs::remove_dir_all(&dir);
        let _ = fs::remove_file(&outside);
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("entry.md"), "safe").unwrap();
        fs::write(&outside, "outside").unwrap();
        #[cfg(unix)]
        std::os::unix::fs::symlink(&outside, dir.join("escape.md")).unwrap();
        assert!(repo::safe_file(&dir, "entry.md").is_ok());
        assert!(repo::safe_file(&dir, "../outside").is_err());
        #[cfg(unix)]
        assert!(repo::safe_file(&dir, "escape.md").is_err());
        let _ = fs::remove_dir_all(&dir);
        let _ = fs::remove_file(&outside);
    }

    #[test]
    fn schema_extraction_from_real_fixture_matches_all_rules() {
        let fixture = include_str!("../../tests/fixtures/content.config.ts");
        let extracted = env::extract_schema_from_content_config(fixture).expect("schema extraction failed");
        assert!(extracted.project_statuses.contains(&"Released".to_string()));
        assert!(extracted.project_drawings.contains(&"airfoils".to_string()));
        assert!(extracted.project_art.contains(&"wing".to_string()));
        assert!(extracted.project_visuals.contains(&"mesh".to_string()));
        assert!(extracted.common_fields.contains(&"title".to_string()));
        assert!(extracted.project_fields.contains(&"engineering".to_string()));
        let issues = env::validate_repo_schema(&extracted);
        assert!(issues.is_empty(), "Validation issues found: {:?}", issues);
    }

    #[test]
    fn schema_extraction_fails_loudly_on_malformed_input() {
        assert!(env::extract_schema_from_content_config("").is_err());
        assert!(env::extract_schema_from_content_config("const x = 1;").is_err());
    }

    #[test]
    fn detect_package_manager_detects_from_package_json_and_lockfiles() {
        let dir = std::env::temp_dir().join(format!("pm-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        fs::write(dir.join("package.json"), r#"{"packageManager": "bun@1.2.4"}"#).unwrap();
        assert_eq!(env::detect_package_manager(&dir), env::PackageManager::Bun);

        fs::write(dir.join("package.json"), r#"{"packageManager": "pnpm@9.0.0"}"#).unwrap();
        assert_eq!(env::detect_package_manager(&dir), env::PackageManager::Pnpm);

        fs::write(dir.join("package.json"), r#"{"packageManager": "yarn@4.0.0"}"#).unwrap();
        assert_eq!(env::detect_package_manager(&dir), env::PackageManager::Yarn);

        fs::write(dir.join("package.json"), r#"{"packageManager": "npm@10.0.0"}"#).unwrap();
        assert_eq!(env::detect_package_manager(&dir), env::PackageManager::Npm);

        fs::write(dir.join("package.json"), r#"{}"#).unwrap();
        fs::write(dir.join("bun.lock"), "").unwrap();
        assert_eq!(env::detect_package_manager(&dir), env::PackageManager::Bun);

        let _ = fs::remove_file(dir.join("bun.lock"));
        fs::write(dir.join("pnpm-lock.yaml"), "").unwrap();
        assert_eq!(env::detect_package_manager(&dir), env::PackageManager::Pnpm);

        let _ = fs::remove_file(dir.join("pnpm-lock.yaml"));
        fs::write(dir.join("yarn.lock"), "").unwrap();
        assert_eq!(env::detect_package_manager(&dir), env::PackageManager::Yarn);

        let _ = fs::remove_file(dir.join("yarn.lock"));
        fs::write(dir.join("package-lock.json"), "").unwrap();
        assert_eq!(env::detect_package_manager(&dir), env::PackageManager::Npm);

        let _ = fs::remove_file(dir.join("package-lock.json"));
        assert_eq!(env::detect_package_manager(&dir), env::PackageManager::Npm);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn allowed_programs_rejects_unauthorized_binaries() {
        assert!(repo::ALLOWED_PROGRAMS.contains(&"git"));
        assert!(repo::ALLOWED_PROGRAMS.contains(&"bun"));
        assert!(repo::ALLOWED_PROGRAMS.contains(&"pnpm"));
        assert!(repo::ALLOWED_PROGRAMS.contains(&"yarn"));
        assert!(repo::ALLOWED_PROGRAMS.contains(&"npm"));
        assert!(repo::ALLOWED_PROGRAMS.contains(&"node"));
        assert!(!repo::ALLOWED_PROGRAMS.contains(&"sh"));
        assert!(!repo::ALLOWED_PROGRAMS.contains(&"bash"));
        assert!(!repo::ALLOWED_PROGRAMS.contains(&"curl"));
    }

    #[test]
    fn frontmatter_parsing_ignores_body_draft_in_code_block() {
        let doc = "---\ntitle: Real Title\ndraft: false\n---\n\n```yaml\ndraft: true\ntitle: Fake Title\n```\n";
        let (title, draft) = content::parse_frontmatter_metadata(doc);
        assert_eq!(title, Some("Real Title".to_string()));
        assert_eq!(draft, false);
    }

    #[test]
    fn frontmatter_parsing_ignores_nested_title_keys() {
        let doc = "---\ntitle: Top Level Title\nengineering:\n  title: Nested Spec Title\ndraft: false\n---\nBody\n";
        let (title, draft) = content::parse_frontmatter_metadata(doc);
        assert_eq!(title, Some("Top Level Title".to_string()));
        assert_eq!(draft, false);
    }

    #[test]
    fn frontmatter_parsing_and_duplication_handles_crlf_files() {
        let doc = "---\r\ntitle: CRLF Article\r\ndraft: false\r\n---\r\n\r\nLine 1\r\nLine 2\r\n";
        let (title, draft) = content::parse_frontmatter_metadata(doc);
        assert_eq!(title, Some("CRLF Article".to_string()));
        assert_eq!(draft, false);

        let duplicated = content::duplicate_article_text(doc, "CRLF Duplicated").unwrap();
        assert!(duplicated.contains("\r\n"));
        assert!(!duplicated.contains("\r\r\n"));
        assert!(duplicated.ends_with("\r\n"));
        assert!(duplicated.contains("title: \"CRLF Duplicated\""));
        assert!(duplicated.contains("draft: true"));
        let (dup_title, dup_draft) = content::parse_frontmatter_metadata(&duplicated);
        assert_eq!(dup_title, Some("CRLF Duplicated".to_string()));
        assert_eq!(dup_draft, true);
    }

    #[test]
    fn frontmatter_parsing_handles_folded_multiline_titles() {
        let doc = "---\ntitle: >\n  This is a folded\n  multiline title\ndraft: false\n---\nBody\n";
        let (title, _) = content::parse_frontmatter_metadata(doc);
        assert_eq!(title, Some("This is a folded multiline title".to_string()));
    }

    #[test]
    fn frontmatter_parsing_and_duplication_handles_missing_frontmatter() {
        let doc = "# Plain Markdown with no frontmatter\n\nSome text.\n";
        let (title, draft) = content::parse_frontmatter_metadata(doc);
        assert_eq!(title, None);
        assert_eq!(draft, false);

        let duplicated = content::duplicate_article_text(doc, "Added Frontmatter").unwrap();
        assert!(duplicated.starts_with("---\n"));
        assert!(duplicated.contains("title: \"Added Frontmatter\"\n"));
        assert!(duplicated.contains("draft: true\n"));
        assert!(duplicated.contains("# Plain Markdown with no frontmatter"));
        let (dup_title, dup_draft) = content::parse_frontmatter_metadata(&duplicated);
        assert_eq!(dup_title, Some("Added Frontmatter".to_string()));
        assert_eq!(dup_draft, true);
    }

    #[test]
    fn porcelain_z_parsing_handles_standard_records_and_renames() {
        let raw = " M src/content/writing/article.md\0?? src/content/projects/new.md\0R  src/content/writing/old.md\0src/content/writing/renamed.md\0";
        let entries = git::parse_porcelain_z(raw);
        assert_eq!(entries.len(), 3);

        assert_eq!(entries[0].index_status, ' ');
        assert_eq!(entries[0].worktree_status, 'M');
        assert_eq!(entries[0].path, "src/content/writing/article.md");
        assert_eq!(entries[0].orig_path, None);

        assert_eq!(entries[1].index_status, '?');
        assert_eq!(entries[1].worktree_status, '?');
        assert_eq!(entries[1].path, "src/content/projects/new.md");
        assert_eq!(entries[1].orig_path, None);

        assert_eq!(entries[2].index_status, 'R');
        assert_eq!(entries[2].worktree_status, ' ');
        assert_eq!(entries[2].path, "src/content/writing/renamed.md");
        assert_eq!(entries[2].orig_path, Some("src/content/writing/old.md".to_string()));
    }

    #[test]
    fn image_magic_bytes_validation() {
        // PNG valid and invalid
        let valid_png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00];
        assert!(images::validate_image_magic_bytes(&valid_png, "png").is_ok());
        assert!(images::validate_image_magic_bytes(b"badpng", "png").is_err());

        // JPEG valid and invalid
        let valid_jpeg = [0xFF, 0xD8, 0xFF, 0xE0];
        assert!(images::validate_image_magic_bytes(&valid_jpeg, "jpg").is_ok());
        assert!(images::validate_image_magic_bytes(b"badjpeg", "jpg").is_err());

        // SVG script injection rejection
        let safe_svg = b"<svg xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"10\"/></svg>";
        assert!(images::validate_image_magic_bytes(safe_svg, "svg").is_ok());
        let dangerous_svg = b"<svg><script>alert(1)</script></svg>";
        assert!(images::validate_image_magic_bytes(dangerous_svg, "svg").is_err());
        let onload_svg = b"<svg onload=\"alert(1)\"></svg>";
        assert!(images::validate_image_magic_bytes(onload_svg, "svg").is_err());
    }
}
