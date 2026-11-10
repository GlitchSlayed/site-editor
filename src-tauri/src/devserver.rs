use serde::Serialize;
use std::{
    io::{BufRead, BufReader},
    net::{SocketAddr, TcpListener, TcpStream},
    process::{Child, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter, State};
use crate::env::detect_package_manager;
use crate::repo::{command, fail, repo};

#[derive(Serialize, Clone, Debug)]
pub struct DevServerStatus {
    pub state: String, // "stopped" | "starting" | "running" | "errored"
    pub url: Option<String>,
    pub port: Option<u16>,
    pub last_error: Option<String>,
}

pub fn find_available_port(start_port: u16) -> u16 {
    for port in start_port..(start_port + 50) {
        let addr: SocketAddr = format!("127.0.0.1:{port}").parse().unwrap();
        if TcpListener::bind(addr).is_ok() {
            return port;
        }
    }
    start_port
}

pub struct DevServerManager {
    child: Option<Child>,
    port: Option<u16>,
    status: DevServerStatus,
}

impl Default for DevServerManager {
    fn default() -> Self {
        Self {
            child: None,
            port: None,
            status: DevServerStatus {
                state: "stopped".into(),
                url: None,
                port: None,
                last_error: None,
            },
        }
    }
}

impl DevServerManager {
    pub fn stop(&mut self) -> Result<String, String> {
        if let Some(mut child) = self.child.take() {
            #[cfg(unix)]
            {
                let pid = child.id() as i32;
                unsafe {
                    libc::kill(-pid, libc::SIGTERM);
                    libc::kill(pid, libc::SIGTERM);
                }
                thread::sleep(Duration::from_millis(50));
                unsafe {
                    libc::kill(-pid, libc::SIGKILL);
                    libc::kill(pid, libc::SIGKILL);
                }
            }
            let _ = child.kill();
            let _ = child.wait();
        }
        self.port = None;
        self.status = DevServerStatus {
            state: "stopped".into(),
            url: None,
            port: None,
            last_error: None,
        };
        Ok("Astro server stopped.".into())
    }
}

impl Drop for DevServerManager {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

pub struct DevServerState(pub Arc<Mutex<DevServerManager>>);

#[tauri::command]
pub async fn dev_server_status(state: State<'_, DevServerState>) -> Result<DevServerStatus, String> {
    let mgr = state.0.lock().map_err(fail)?;
    Ok(mgr.status.clone())
}

#[tauri::command]
pub async fn run_dev_server(
    app: AppHandle,
    state: State<'_, DevServerState>,
    path: String,
) -> Result<String, String> {
    let root = repo(&path)?;
    let pm = detect_package_manager(&root);
    let prog = pm.as_str();

    let port = find_available_port(4321);
    let url = format!("http://127.0.0.1:{port}");

    {
        let mut mgr = state.0.lock().map_err(fail)?;
        if mgr.child.as_mut().is_some_and(|c| c.try_wait().ok().flatten().is_none()) {
            return Ok(format!("Server is already running at {}", mgr.status.url.as_deref().unwrap_or(&url)));
        }
        mgr.status.state = "starting".into();
        mgr.status.last_error = None;
    }

    let mut cmd = command(&root, prog)?;
    cmd.args([
        "run",
        "dev",
        "--",
        "--host",
        "127.0.0.1",
        "--port",
        &port.to_string(),
        "--strictPort",
    ]);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }

    let mut child = cmd.spawn().map_err(|e| {
        let err_msg = format!("Failed to spawn {prog} dev server: {e}");
        if let Ok(mut mgr) = state.0.lock() {
            mgr.status.state = "errored".into();
            mgr.status.last_error = Some(err_msg.clone());
        }
        err_msg
    })?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let app_stdout = app.clone();
    thread::spawn(move || {
        if let Some(out) = stdout {
            let reader = BufReader::new(out);
            for line in reader.lines().map_while(Result::ok) {
                let _ = app_stdout.emit("dev-server-log", &line);
            }
        }
    });

    let app_stderr = app.clone();
    thread::spawn(move || {
        if let Some(err) = stderr {
            let reader = BufReader::new(err);
            for line in reader.lines().map_while(Result::ok) {
                let _ = app_stderr.emit("dev-server-log", &line);
            }
        }
    });

    let address: SocketAddr = format!("127.0.0.1:{port}").parse().unwrap();
    let mut ready = false;

    for _ in 0..40 {
        if child.try_wait().map_err(fail)?.is_some() {
            break;
        }
        if TcpStream::connect_timeout(&address, Duration::from_millis(100)).is_ok() {
            ready = true;
            break;
        }
        thread::sleep(Duration::from_millis(100));
    }

    if !ready {
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

        let err_msg = format!(
            "Astro did not start on port {port}. Check that {prog} and the site's dependencies are installed, and that port {port} is free."
        );
        let mut mgr = state.0.lock().map_err(fail)?;
        mgr.status = DevServerStatus {
            state: "errored".into(),
            url: None,
            port: None,
            last_error: Some(err_msg.clone()),
        };
        return Err(err_msg);
    }

    {
        let mut mgr = state.0.lock().map_err(fail)?;
        mgr.child = Some(child);
        mgr.port = Some(port);
        mgr.status = DevServerStatus {
            state: "running".into(),
            url: Some(url.clone()),
            port: Some(port),
            last_error: None,
        };
    }

    Ok(format!("Astro is running at {url}"))
}

#[tauri::command]
pub async fn stop_dev_server(state: State<'_, DevServerState>) -> Result<String, String> {
    let mut mgr = state.0.lock().map_err(fail)?;
    mgr.stop()
}
