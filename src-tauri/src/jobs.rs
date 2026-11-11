use serde::Serialize;
use std::{
    collections::VecDeque,
    io::{BufRead, BufReader},
    process::{Child, Stdio},
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, Emitter, State};
use crate::env::{effective_package_manager, PackageManager};
use crate::repo::{command, fail, repo};

#[derive(Serialize, Clone, Debug)]
pub struct CommandResult {
    pub code: i32,
    pub output: String,
}

#[derive(Default)]
pub struct JobManager {
    current_child: Arc<Mutex<Option<Child>>>,
}

impl JobManager {
    pub fn cancel(&self) -> Result<bool, String> {
        let mut slot = self.current_child.lock().map_err(fail)?;
        if let Some(mut child) = slot.take() {
            #[cfg(unix)]
            {
                let pid = child.id() as i32;
                unsafe {
                    libc::kill(-pid, libc::SIGKILL);
                    libc::kill(pid, libc::SIGKILL);
                }
            }
            let _ = child.kill();
            let _ = child.wait();
            Ok(true)
        } else {
            Ok(false)
        }
    }
}

pub struct JobsState(pub Arc<JobManager>);

#[tauri::command]
pub fn exit_app(
    app: AppHandle,
    dev: State<'_, crate::devserver::DevServerState>,
    jobs: State<'_, JobsState>,
) {
    let _ = dev.0.lock().map(|mut d| d.stop());
    let _ = jobs.0.cancel();
    app.exit(0);
}

#[tauri::command]
pub async fn cancel_project_command(state: State<'_, JobsState>) -> Result<String, String> {
    let cancelled = state.0.cancel()?;
    if cancelled {
        Ok("Command cancelled.".into())
    } else {
        Ok("No active command was running.".into())
    }
}

#[tauri::command]
pub async fn project_command(
    app: AppHandle,
    state: State<'_, JobsState>,
    path: String,
    operation: String,
) -> Result<CommandResult, String> {
    let root = repo(&path)?;
    let (pm, _) = effective_package_manager(&root);
    let prog = pm.as_str();

    let args: Vec<&str> = match operation.as_str() {
        "check" => vec!["run", "check"],
        "build" => vec!["run", "build"],
        "install" => match pm {
            PackageManager::Bun => {
                if root.join("bun.lock").is_file() {
                    vec!["install", "--frozen-lockfile"]
                } else {
                    vec!["install"]
                }
            }
            PackageManager::Pnpm => {
                if root.join("pnpm-lock.yaml").is_file() {
                    vec!["install", "--frozen-lockfile"]
                } else {
                    vec!["install"]
                }
            }
            PackageManager::Yarn => {
                if root.join("yarn.lock").is_file() {
                    vec!["install", "--immutable"]
                } else {
                    vec!["install"]
                }
            }
            PackageManager::Npm => {
                if root.join("package-lock.json").is_file() {
                    vec!["ci"]
                } else {
                    vec!["install"]
                }
            }
        },
        _ => return Err("Unsupported operation.".into()),
    };

    let mut cmd = command(&root, prog)?;
    cmd.args(&args);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }

    let mut child = cmd.spawn().map_err(fail)?;
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    {
        let mut slot = state.0.current_child.lock().map_err(fail)?;
        *slot = Some(child);
    }

    const MAX_RING_LINES: usize = 2000;
    let ring_buffer = Arc::new(Mutex::new(VecDeque::<String>::with_capacity(MAX_RING_LINES)));

    let stdout_handle = {
        let app = app.clone();
        let ring = Arc::clone(&ring_buffer);
        std::thread::spawn(move || {
            if let Some(out) = stdout {
                let reader = BufReader::new(out);
                for line in reader.lines().map_while(Result::ok) {
                    let _ = app.emit("command-output-line", &line);
                    if let Ok(mut buf) = ring.lock() {
                        if buf.len() >= MAX_RING_LINES {
                            buf.pop_front();
                        }
                        buf.push_back(line);
                    }
                }
            }
        })
    };

    let stderr_handle = {
        let app = app.clone();
        let ring = Arc::clone(&ring_buffer);
        std::thread::spawn(move || {
            if let Some(err) = stderr {
                let reader = BufReader::new(err);
                for line in reader.lines().map_while(Result::ok) {
                    let _ = app.emit("command-output-line", &line);
                    if let Ok(mut buf) = ring.lock() {
                        if buf.len() >= MAX_RING_LINES {
                            buf.pop_front();
                        }
                        buf.push_back(line);
                    }
                }
            }
        })
    };

    let status = {
        let child_slot = Arc::clone(&state.0.current_child);
        tauri::async_runtime::spawn_blocking(move || -> Result<i32, String> {
            let _ = stdout_handle.join();
            let _ = stderr_handle.join();

            let mut slot = child_slot.lock().map_err(fail)?;
            if let Some(mut child) = slot.take() {
                let s = child.wait().map_err(fail)?;
                Ok(s.code().unwrap_or(-1))
            } else {
                Ok(-1)
            }
        })
        .await
        .map_err(fail)??
    };

    let output = {
        let buf = ring_buffer.lock().map_err(fail)?;
        buf.iter().cloned().collect::<Vec<_>>().join("\n")
    };

    Ok(CommandResult {
        code: status,
        output,
    })
}
