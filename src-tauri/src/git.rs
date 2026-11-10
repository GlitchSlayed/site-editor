use serde::Serialize;
use crate::jobs::CommandResult;
use crate::repo::{command, fail, publishable_path, repo, run_host_program, safe_file};

#[derive(Serialize, Clone, Debug)]
pub struct GitInfo {
    pub branch: String,
    pub upstream: String,
    pub ahead: usize,
    pub behind: usize,
    pub changed: Vec<String>,
    pub diff: String,
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub struct GitStatusEntry {
    pub index_status: char,
    pub worktree_status: char,
    pub path: String,
    pub orig_path: Option<String>,
}

pub fn parse_counts(value: &str) -> (usize, usize) {
    let values: Vec<_> = value.split_whitespace().collect();
    (
        values.first().and_then(|x| x.parse().ok()).unwrap_or(0),
        values.get(1).and_then(|x| x.parse().ok()).unwrap_or(0),
    )
}

pub fn parse_porcelain_z(output: &str) -> Vec<GitStatusEntry> {
    let mut entries = Vec::new();
    let mut iter = output.split('\0');

    while let Some(record) = iter.next() {
        if record.is_empty() || record.len() < 3 {
            continue;
        }

        let mut chars = record.chars();
        let index_status = chars.next().unwrap_or(' ');
        let worktree_status = chars.next().unwrap_or(' ');
        let path = record[3..].to_string();

        let is_rename_or_copy = index_status == 'R'
            || index_status == 'C'
            || worktree_status == 'R'
            || worktree_status == 'C';

        if is_rename_or_copy {
            if let Some(dest_path) = iter.next() {
                if !dest_path.is_empty() {
                    entries.push(GitStatusEntry {
                        index_status,
                        worktree_status,
                        path: dest_path.to_string(),
                        orig_path: Some(path),
                    });
                    continue;
                }
            }
        }

        entries.push(GitStatusEntry {
            index_status,
            worktree_status,
            path,
            orig_path: None,
        });
    }

    entries
}

#[tauri::command]
pub async fn git_diff_file(path: String, file: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        let args: Vec<String> = if let Some(ref rel) = file {
            let p = safe_file(&root, rel)?;
            let safe_rel = p
                .strip_prefix(&root)
                .map_err(fail)?
                .to_string_lossy()
                .replace('\\', "/");
            vec!["diff".into(), "HEAD".into(), "--".into(), safe_rel]
        } else {
            vec!["diff".into(), "HEAD".into(), "--".into()]
        };

        let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        let result = run_host_program(&root, "git", &arg_refs)?;

        const MAX_DIFF_BYTES: usize = 50_000;
        if result.output.len() > MAX_DIFF_BYTES {
            let truncated = &result.output[..MAX_DIFF_BYTES];
            Ok(format!("{truncated}\n\n[Diff truncated: diff exceeds 50 KB limit]"))
        } else {
            Ok(result.output)
        }
    })
    .await
    .map_err(fail)?
}

#[tauri::command]
pub async fn git_info(path: String) -> Result<GitInfo, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        let b = run_host_program(&root, "git", &["branch", "--show-current"])?;
        if b.code != 0 {
            return Err(b.output);
        }
        let branch = b.output.trim().to_string();

        let u = run_host_program(
            &root,
            "git",
            &["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
        )?;
        let upstream = if u.code == 0 {
            u.output.trim().to_string()
        } else {
            String::new()
        };

        let (ahead, behind) = if upstream.is_empty() {
            (0, 0)
        } else {
            let r = run_host_program(
                &root,
                "git",
                &["rev-list", "--left-right", "--count", &format!("HEAD...{}", upstream)],
            )?;
            parse_counts(&r.output)
        };

        let s = run_host_program(
            &root,
            "git",
            &["status", "--porcelain=v1", "-z", "--untracked-files=all"],
        )?;
        let entries = parse_porcelain_z(&s.output);
        let changed = entries.into_iter().map(|e| e.path).collect();

        Ok(GitInfo {
            branch,
            upstream,
            ahead,
            behind,
            changed,
            diff: String::new(),
        })
    })
    .await
    .map_err(fail)?
}

#[tauri::command]
pub async fn publish(path: String, message: String) -> Result<CommandResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = repo(&path)?;
        if message.trim().is_empty() {
            return Err("Enter a commit message.".into());
        }

        let upstream = run_host_program(
            &root,
            "git",
            &["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
        )?;
        if upstream.code != 0 {
            return Err("This branch has no configured upstream. Configure it in Git before publishing.".into());
        }
        let upstream = upstream.output.trim().to_string();

        let fetch = run_host_program(&root, "git", &["fetch", "--prune"])?;
        if fetch.code != 0 {
            return Ok(fetch);
        }

        let counts = run_host_program(
            &root,
            "git",
            &["rev-list", "--left-right", "--count", &format!("HEAD...{}", upstream)],
        )?;
        let (_, behind) = parse_counts(&counts.output);
        if behind > 0 {
            return Err(format!("Branch is {behind} commit(s) behind {upstream}. Integrate remote changes before publishing."));
        }

        let staged = run_host_program(&root, "git", &["diff", "--cached", "--name-only", "-z"])?;
        let staged_paths: Vec<_> = staged.output.split('\0').filter(|p| !p.is_empty()).collect();
        if let Some(unrelated) = staged_paths.iter().find(|p| !publishable_path(p)) {
            return Err(format!("Unrelated files are already staged ({unrelated}). Commit or unstage those changes before publishing."));
        }

        let status = run_host_program(
            &root,
            "git",
            &["status", "--porcelain=v1", "-z", "--untracked-files=all"],
        )?;
        let entries = parse_porcelain_z(&status.output);
        let mut paths = Vec::<String>::new();

        for entry in entries {
            if publishable_path(&entry.path) {
                if let Some(orig) = entry.orig_path {
                    if publishable_path(&orig) {
                        paths.push(orig);
                    }
                }
                paths.push(entry.path);
            }
        }

        if paths.is_empty() {
            return Err("No changed writing, project, or public asset files are available to publish.".into());
        }

        let mut cmd = command(&root, "git")?;
        cmd.arg("add").arg("--").args(&paths);
        let add = cmd.output().map_err(fail)?;
        if !add.status.success() {
            return Err(String::from_utf8_lossy(&add.stderr).to_string());
        }

        let diff = run_host_program(&root, "git", &["diff", "--cached", "--stat"])?;
        if diff.output.trim().is_empty() {
            return Err("There are no staged changes to commit.".into());
        }

        let commit = command(&root, "git")?
            .arg("commit")
            .arg("-m")
            .arg(&message)
            .output()
            .map_err(fail)?;
        if !commit.status.success() {
            return Err(String::from_utf8_lossy(&commit.stderr).to_string());
        }

        let push = run_host_program(&root, "git", &["push"])?;
        if push.code != 0 {
            return Ok(push);
        }

        Ok(CommandResult {
            code: 0,
            output: format!(
                "{}\n{}\n{}",
                diff.output,
                String::from_utf8_lossy(&commit.stdout),
                push.output
            ),
        })
    })
    .await
    .map_err(fail)?
}
