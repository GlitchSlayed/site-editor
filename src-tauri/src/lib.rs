use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{fs, io::Write, net::{SocketAddr, TcpStream}, path::{Path, PathBuf}, process::{Child, Command, Stdio}, sync::Mutex, thread, time::Duration};
use tauri::State;

struct Server(Mutex<Option<Child>>);
impl Drop for Server{fn drop(&mut self){if let Ok(slot)=self.0.get_mut(){if let Some(mut child)=slot.take(){let _=child.kill();let _=child.wait();}}}}
#[derive(Deserialize)] struct PortalDocument { id: String, path: String, origin: String }
#[derive(Serialize)] struct Entry { path: String, kind: String, title: String, draft: bool, modified: String }
#[derive(Serialize)] struct FileData { text: String, hash: String }
#[derive(Serialize)] struct CommandResult { code: i32, output: String }
#[derive(Serialize)] struct GitInfo { branch: String, upstream: String, ahead: usize, behind: usize, changed: Vec<String>, diff: String }
#[derive(Serialize)] struct Environment { node_version: String, npm_version: String, required_node: String, dependencies_installed: bool, node_compatible: bool, messages: Vec<String> }
fn fail<T: std::fmt::Display>(e:T)->String { e.to_string() }
fn repo(path:&str)->Result<PathBuf,String> {
 let p=Path::new(path).canonicalize().map_err(fail)?;
 if !p.is_dir() || !p.join(".git").exists() || !p.join("package.json").exists() || !p.join("astro.config.mjs").exists() { return Err("Choose a Git checkout containing package.json and astro.config.mjs.".into()) }
 Ok(p)
}
fn validate_slug(slug: &str) -> Result<(), String> {
 if slug.is_empty() || !slug.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-') || slug.starts_with('-') || slug.ends_with('-') || slug.contains("--") {
  return Err("Use a lowercase URL-safe filename with letters, numbers, and single hyphens.".into());
 }
 Ok(())
}
fn safe_file(root:&Path, rel:&str)->Result<PathBuf,String>{
 let relp=Path::new(rel); if relp.is_absolute() || relp.components().any(|c| !matches!(c,std::path::Component::Normal(_))) { return Err("Invalid repository path.".into()) }
 let p=root.join(relp); let real=p.canonicalize().map_err(fail)?; if !real.starts_with(root) || !real.is_file(){return Err("The selected file is outside the repository or is not a regular file.".into())} Ok(real)
}
#[tauri::command] fn create_article(path:String,kind:String,title:String,slug:String,extension:String,text:String)->Result<Entry,String>{
 let root=repo(&path)?;
 let (label,relative)=match kind.as_str(){"writing"=>("Writing","src/content/writing"),"projects"=>("Projects","src/content/projects"),_=>return Err("Choose Writing or Projects for the new document.".into())};
 if !matches!(extension.as_str(),"md"|"mdx"){return Err("Choose Markdown (.md) or MDX (.mdx) for the new document.".into())}
 validate_slug(&slug)?;
 let directory=root.join(relative).canonicalize().map_err(fail)?;
 if !directory.starts_with(&root)||!directory.is_dir(){return Err("The content folder is outside the selected repository.".into())}
 let target=directory.join(format!("{slug}.{extension}"));
 let mut file=fs::OpenOptions::new().write(true).create_new(true).open(&target).map_err(|e|if e.kind()==std::io::ErrorKind::AlreadyExists{"A file with that name already exists.".to_string()}else{fail(e)})?;
 if let Err(error)=file.write_all(text.as_bytes()).and_then(|_|file.sync_all()){let _=fs::remove_file(&target);return Err(fail(error))}
 Ok(Entry{path:format!("{relative}/{slug}.{extension}"),kind:label.into(),title,draft:true,modified:String::new()})
}
#[tauri::command] fn rename_article(path:String,file:String,new_slug:String)->Result<Entry,String>{
 let root=repo(&path)?;
 let old_path=safe_file(&root,&file)?;
 validate_slug(&new_slug)?;
 let extension=old_path.extension().and_then(|e|e.to_str()).ok_or("File has no extension")?;
 let parent=old_path.parent().ok_or("Invalid file parent")?;
 let new_file_name=format!("{new_slug}.{extension}");
 let new_path=parent.join(&new_file_name);
 if new_path.exists(){return Err("A file with that name already exists.".into())}
 fs::rename(&old_path,&new_path).map_err(fail)?;
 let rel=new_path.strip_prefix(&root).map_err(fail)?.to_string_lossy().replace('\\',"/");
 let kind=if rel.starts_with("src/content/writing/"){"Writing"}else{"Projects"};
 let text=fs::read_to_string(&new_path).unwrap_or_default();
 let first=text.lines().find(|l|l.trim_start().starts_with("title:")).unwrap_or("");
 let title=first.split_once(':').map(|x|x.1.trim().trim_matches(['"','\'']).to_string()).filter(|s|!s.is_empty()).unwrap_or_else(||new_slug.clone());
 let draft=text.lines().any(|l|l.trim()=="draft: true");
 Ok(Entry{path:rel,kind:kind.into(),title,draft,modified:String::new()})
}
#[tauri::command] fn delete_article(path:String,file:String)->Result<(),String>{
 let root=repo(&path)?;
 let target=safe_file(&root,&file)?;
 if !file.starts_with("src/content/writing/") && !file.starts_with("src/content/projects/"){
  return Err("Only content documents can be deleted.".into());
 }
 fs::remove_file(&target).map_err(fail)?;
 Ok(())
}
#[tauri::command] fn duplicate_article(path:String,file:String,new_slug:String,new_title:String)->Result<Entry,String>{
 let root=repo(&path)?;
 let source=safe_file(&root,&file)?;
 validate_slug(&new_slug)?;
 let extension=source.extension().and_then(|e|e.to_str()).ok_or("File has no extension")?;
 let parent=source.parent().ok_or("Invalid source parent")?;
 let target=parent.join(format!("{new_slug}.{extension}"));
 if target.exists(){return Err("A file with that name already exists.".into())}
 let original_text=fs::read_to_string(&source).map_err(fail)?;
 let mut lines:Vec<String>=original_text.lines().map(|s|s.to_string()).collect();
 let mut in_fm=false;
 for line in lines.iter_mut(){
  if line.trim()=="---"{if !in_fm{in_fm=true}else{break}}
  else if in_fm && line.trim_start().starts_with("title:"){*line=format!("title: \"{}\"",new_title.replace('"',"\\\""));}
  else if in_fm && line.trim_start().starts_with("draft:"){*line="draft: true".to_string();}
 }
 let duplicated_text=lines.join("\n");
 let mut out=fs::OpenOptions::new().write(true).create_new(true).open(&target).map_err(fail)?;
 out.write_all(duplicated_text.as_bytes()).map_err(fail)?;
 out.sync_all().map_err(fail)?;
 let rel=target.strip_prefix(&root).map_err(fail)?.to_string_lossy().replace('\\',"/");
 let kind=if rel.starts_with("src/content/writing/"){"Writing"}else{"Projects"};
 Ok(Entry{path:rel,kind:kind.into(),title:new_title,draft:true,modified:String::new()})
}
fn hash(bytes:&[u8])->String { format!("{:x}",Sha256::digest(bytes)) }
fn parse_counts(value:&str)->(usize,usize){let values:Vec<_>=value.split_whitespace().collect();(values.first().and_then(|x|x.parse().ok()).unwrap_or(0),values.get(1).and_then(|x|x.parse().ok()).unwrap_or(0))}
fn publishable_path(rel:&str)->bool{
 let path=Path::new(rel);let ext=path.extension().and_then(|e|e.to_str()).unwrap_or("").to_ascii_lowercase();
 if (rel.starts_with("src/content/writing/")||rel.starts_with("src/content/projects/")) && matches!(ext.as_str(),"md"|"mdx"){return true}
 rel.starts_with("public/") && matches!(ext.as_str(),"png"|"jpg"|"jpeg"|"webp"|"avif"|"gif"|"svg"|"mp4"|"pdf"|"woff"|"woff2")
}
fn after_document_id(path:&Path,id:&str)->Option<PathBuf>{
 let mut found=false;let mut suffix=PathBuf::new();for component in path.components(){if found{suffix.push(component.as_os_str())}else if component.as_os_str()==id{found=true}}if found{Some(suffix)}else{None}
}
fn host_repository(root:&Path)->Result<PathBuf,String>{
 if std::env::var_os("FLATPAK_ID").is_none(){return Ok(root.to_path_buf())}
 let output=Command::new("flatpak-spawn").args(["--host","--watch-bus","flatpak","documents","--json","--columns=all","com.glitchslayed.site-editor"]).output().map_err(fail)?;
 if !output.status.success(){return Err(String::from_utf8_lossy(&output.stderr).trim().to_string())}
 let documents:Vec<PortalDocument>=serde_json::from_slice(&output.stdout).map_err(fail)?;
 for document in documents{
  let Some(document_relative)=after_document_id(Path::new(&document.path),&document.id) else{continue};
  let Some(root_relative)=after_document_id(root,&document.id) else{continue};
  let Ok(extra)=root_relative.strip_prefix(&document_relative) else{continue};
  return Ok(Path::new(&document.origin).join(extra));
 }
 Err("The site folder’s document portal grant is missing. Reopen the repository with the folder picker, then save again.".into())
}
fn command(root:&Path, program:&str)->Result<Command,String>{
 if std::env::var_os("FLATPAK_ID").is_some(){let host_root=host_repository(root)?;let mut c=Command::new("flatpak-spawn");c.arg("--host").arg("--watch-bus").arg(format!("--directory={}",host_root.display())).arg(program);Ok(c)}
 else{let mut c=Command::new(program);c.current_dir(root);Ok(c)}
}
fn run_host_program(root:&Path, program:&str, args:&[&str])->Result<CommandResult,String>{
 let o=command(root,program)?.args(args).output().map_err(fail)?;
 Ok(CommandResult{code:o.status.code().unwrap_or(-1),output:String::from_utf8_lossy(&o.stdout).to_string()+&String::from_utf8_lossy(&o.stderr)})
}
fn run_host_version(root:&Path,program:&str)->Result<CommandResult,String>{
 let o=if std::env::var_os("FLATPAK_ID").is_some(){Command::new("flatpak-spawn").args(["--host","--watch-bus",program,"--version"]).output().map_err(fail)?}else{command(root,program)?.arg("--version").output().map_err(fail)?};
 Ok(CommandResult{code:o.status.code().unwrap_or(-1),output:String::from_utf8_lossy(&o.stdout).to_string()+&String::from_utf8_lossy(&o.stderr)})
}
fn detected_version(root:&Path,program:&str)->(String,Option<String>){
 match run_host_version(root,program){Ok(result) if result.code==0=>(result.output.trim().to_string(),None),Ok(result)=>(String::new(),Some(if result.output.trim().is_empty(){format!("{program} exited with code {}.",result.code)}else{result.output.trim().to_string()})),Err(error)=>(String::new(),Some(error))}
}
#[tauri::command] fn list_content(path:String)->Result<Vec<Entry>,String>{
 let root=repo(&path)?; let mut out=Vec::new();
 for (kind,dir) in [("Writing","src/content/writing"),("Projects","src/content/projects")] {
  let d=root.join(dir); if !d.exists(){continue} for item in fs::read_dir(d).map_err(fail)? {let item=item.map_err(fail)?; let p=item.path(); if !matches!(p.extension().and_then(|e|e.to_str()),Some("md"|"mdx")){continue} let real=p.canonicalize().map_err(fail)?; if !real.starts_with(&root)||!real.is_file(){continue} let text=fs::read_to_string(&real).map_err(fail)?; let first=text.lines().find(|l|l.trim_start().starts_with("title:" )).unwrap_or(""); let title=first.split_once(':').map(|x|x.1.trim().trim_matches(['"','\'']).to_string()).filter(|s|!s.is_empty()).unwrap_or_else(||p.file_stem().unwrap().to_string_lossy().to_string()); let draft=text.lines().any(|l|l.trim()=="draft: true"); let modified=fs::metadata(&real).ok().and_then(|m|m.modified().ok()).map(|t|format!("{:?}",t)).unwrap_or_default(); out.push(Entry{path:real.strip_prefix(&root).unwrap().to_string_lossy().replace('\\',"/"),kind:kind.into(),title,draft,modified}) }
 }
 out.sort_by(|a,b|a.kind.cmp(&b.kind).then_with(||a.title.to_lowercase().cmp(&b.title.to_lowercase()))); Ok(out)
}
#[tauri::command] fn read_article(path:String,file:String)->Result<FileData,String>{let root=repo(&path)?;let p=safe_file(&root,&file)?;let bytes=fs::read(p).map_err(fail)?;let text=String::from_utf8(bytes.clone()).map_err(fail)?;Ok(FileData{text,hash:hash(&bytes)})}
fn image_mime(path:&Path)->Result<&'static str,String>{match path.extension().and_then(|e|e.to_str()).unwrap_or("").to_ascii_lowercase().as_str(){"png"=>Ok("image/png"),"jpg"|"jpeg"=>Ok("image/jpeg"),"webp"=>Ok("image/webp"),"avif"=>Ok("image/avif"),"gif"=>Ok("image/gif"),"svg"=>Ok("image/svg+xml"),_=>Err("Choose a PNG, JPEG, WebP, AVIF, GIF, or SVG image.".into())}}
#[tauri::command] fn import_site_image(path:String,article:String,source_path:String,usage:String)->Result<String,String>{
 let root=repo(&path)?;let article_path=safe_file(&root,&article)?;
 let family=if article.starts_with("src/content/writing/"){"posts"}else if article.starts_with("src/content/projects/"){"projects"}else{return Err("Images can only be added to a writing or project document.".into())};
 if usage!="content"&&usage!="visual"{return Err("Choose a supported image destination.".into())}if usage=="visual"&&family!="projects"{return Err("Project visual images can only be attached to a project.".into())}
 let source=Path::new(&source_path).canonicalize().map_err(fail)?;if !source.is_file(){return Err("Choose a regular image file.".into())}let mime=image_mime(&source)?;let bytes=fs::read(&source).map_err(fail)?;if bytes.is_empty()||bytes.len()>20*1024*1024{return Err("Images must be smaller than 20 MB.".into())}
 let stem=article_path.file_stem().and_then(|s|s.to_str()).ok_or("The document name is invalid.")?;let mut safe_stem=String::new();for ch in source.file_stem().and_then(|s|s.to_str()).unwrap_or("image").chars(){if ch.is_ascii_alphanumeric(){safe_stem.push(ch.to_ascii_lowercase())}else if !safe_stem.is_empty()&&!safe_stem.ends_with('-'){safe_stem.push('-')}}let safe_stem=safe_stem.trim_matches('-');let safe_stem=if safe_stem.is_empty(){"image"}else{safe_stem};let ext=source.extension().and_then(|e|e.to_str()).unwrap_or("").to_ascii_lowercase();
 let relative_dir=PathBuf::from("public").join("images").join(family).join(stem);let directory=root.join(&relative_dir);fs::create_dir_all(&directory).map_err(fail)?;let real_directory=directory.canonicalize().map_err(fail)?;if !real_directory.starts_with(&root)||!real_directory.starts_with(root.join("public").canonicalize().map_err(fail)?){return Err("The image destination resolves outside this repository's public folder.".into())}
 let mut filename=format!("{safe_stem}.{ext}");let mut suffix=2;while real_directory.join(&filename).exists(){filename=format!("{safe_stem}-{suffix}.{ext}");suffix+=1}
 let target=real_directory.join(&filename);let mut output=fs::OpenOptions::new().write(true).create_new(true).open(&target).map_err(fail)?;if let Err(error)=output.write_all(&bytes).and_then(|_|output.sync_all()){let _=fs::remove_file(&target);return Err(fail(error))}let _=mime;
 Ok(relative_dir.join(filename).to_string_lossy().replace('\\',"/"))
}
#[tauri::command] fn read_site_image(path:String,asset:String)->Result<String,String>{
 let root=repo(&path)?;let relative=Path::new(&asset);if relative.is_absolute()||relative.components().any(|c|!matches!(c,std::path::Component::Normal(_)))||!asset.starts_with("images/"){return Err("Invalid public image path.".into())}
 let public=root.join("public").canonicalize().map_err(fail)?;if !public.starts_with(&root){return Err("The site's public folder resolves outside the repository.".into())}let file=public.join(relative);let real=file.canonicalize().map_err(fail)?;if !real.starts_with(&public)||!real.is_file(){return Err("The image is outside the site's public folder.".into())}let mime=image_mime(&real)?;let bytes=fs::read(real).map_err(fail)?;if bytes.len()>20*1024*1024{return Err("Preview images must be smaller than 20 MB.".into())}Ok(format!("data:{mime};base64,{}",STANDARD.encode(bytes)))
}
#[tauri::command] fn save_article(path:String,file:String,text:String,expected_hash:String)->Result<String,String>{
 let root=repo(&path)?; let p=safe_file(&root,&file)?; let current=fs::read(&p).map_err(fail)?; if hash(&current)!=expected_hash{return Err("This file changed outside the editor. Reload it or compare changes before saving.".into())}
 let tmp=p.with_extension(format!("{}.editor-tmp",p.extension().and_then(|x|x.to_str()).unwrap_or("md"))); let mut f=fs::File::create(&tmp).map_err(fail)?; f.write_all(text.as_bytes()).map_err(fail)?; f.sync_all().map_err(fail)?; fs::rename(&tmp,&p).map_err(fail)?; Ok(hash(text.as_bytes()))
}
#[tauri::command] fn environment(path:String)->Result<Environment,String>{let root=repo(&path)?;let package:serde_json::Value=serde_json::from_slice(&fs::read(root.join("package.json")).map_err(fail)?).map_err(fail)?;let required=package.get("engines").and_then(|e|e.get("node")).and_then(|v|v.as_str()).unwrap_or("not specified").to_string();let (node,node_error)=detected_version(&root,"node");let (npm,npm_error)=detected_version(&root,"npm");let major=node.trim_start_matches('v').split('.').next().and_then(|v|v.parse::<u64>().ok());let min_major=required.trim_start_matches(|c:char|!c.is_ascii_digit()).split('.').next().and_then(|v|v.parse::<u64>().ok());let compatible=major.is_some()&&min_major.map_or(true,|min|major.unwrap()>=min);let dependencies=root.join("node_modules").is_dir();let mut messages=Vec::new();if node.is_empty(){messages.push("Node.js is not available on this host.".into());if let Some(error)=node_error{messages.push(format!("Node.js check failed: {error}"))}}else if !compatible{messages.push(format!("Detected Node.js {node}; this site requires {required}."))}if npm.is_empty(){messages.push("npm is not available on this host.".into());if let Some(error)=npm_error{messages.push(format!("npm check failed: {error}"))}}if !dependencies{messages.push("Site dependencies are not installed in this repository.".into())}Ok(Environment{node_version:node,npm_version:npm,required_node:required,dependencies_installed:dependencies,node_compatible:compatible,messages})}
#[tauri::command] fn project_command(path:String,operation:String)->Result<CommandResult,String>{let root=repo(&path)?;let (prog,args):(&str,Vec<&str>)=match operation.as_str(){"check"=>("npm",vec!["run","check"]),"build"=>("npm",vec!["run","build"]),"install"=>if root.join("package-lock.json").is_file(){("npm",vec!["ci"])}else{("npm",vec!["install"])},_=>return Err("Unsupported operation.".into())}; run_host_program(&root,prog,&args)}
#[tauri::command] fn git_info(path:String)->Result<GitInfo,String>{
 let root=repo(&path)?;let b=run_host_program(&root,"git",&["branch","--show-current"])?;if b.code!=0{return Err(b.output)} let branch=b.output.trim().to_string();let u=run_host_program(&root,"git",&["rev-parse","--abbrev-ref","--symbolic-full-name","@{upstream}"])?;let upstream=if u.code==0{u.output.trim().to_string()}else{String::new()}; let (ahead,behind)=if upstream.is_empty(){(0,0)}else{let r=run_host_program(&root,"git",&["rev-list","--left-right","--count",&format!("HEAD...{}",upstream)])?;parse_counts(&r.output)};let s=run_host_program(&root,"git",&["status","--short"])?;let changed=s.output.lines().map(|l|l.get(3..).unwrap_or(l).to_string()).collect();let d=run_host_program(&root,"git",&["diff","HEAD","--"])?;Ok(GitInfo{branch,upstream,ahead,behind,changed,diff:d.output})
}
#[tauri::command] fn publish(path:String,message:String)->Result<CommandResult,String>{
 let root=repo(&path)?;if message.trim().is_empty(){return Err("Enter a commit message.".into())} let upstream=run_host_program(&root,"git",&["rev-parse","--abbrev-ref","--symbolic-full-name","@{upstream}"])?;if upstream.code!=0{return Err("This branch has no configured upstream. Configure it in Git before publishing.".into())}let upstream=upstream.output.trim().to_string();let fetch=run_host_program(&root,"git",&["fetch","--prune"])?;if fetch.code!=0{return Ok(fetch)} let counts=run_host_program(&root,"git",&["rev-list","--left-right","--count",&format!("HEAD...{}",upstream)])?;let (_,behind)=parse_counts(&counts.output);if behind>0{return Err(format!("Branch is {behind} commit(s) behind {upstream}. Integrate remote changes before publishing."))}
 let staged=run_host_program(&root,"git",&["diff","--cached","--name-only","-z"])?;let staged_paths:Vec<_>=staged.output.split('\0').filter(|p|!p.is_empty()).collect();if let Some(unrelated)=staged_paths.iter().find(|p|!publishable_path(p)){return Err(format!("Unrelated files are already staged ({unrelated}). Commit or unstage those changes before publishing."))}
 let status=run_host_program(&root,"git",&["status","--porcelain=v1","-z","--untracked-files=all"])?;let mut paths=Vec::<String>::new();for record in status.output.split('\0').filter(|r|!r.is_empty()){let rel=record.get(3..).unwrap_or("");if publishable_path(rel){paths.push(rel.to_string())}}
 if paths.is_empty(){return Err("No changed writing, project, or public asset files are available to publish.".into())}
 let mut cmd=command(&root,"git")?;cmd.arg("add").arg("--").args(&paths);let add=cmd.output().map_err(fail)?;if !add.status.success(){return Err(String::from_utf8_lossy(&add.stderr).to_string())}
 let diff=run_host_program(&root,"git",&["diff","--cached","--stat"])?;if diff.output.trim().is_empty(){return Err("There are no staged changes to commit.".into())}
 let commit=command(&root,"git")?.arg("commit").arg("-m").arg(&message).output().map_err(fail)?;if !commit.status.success(){return Err(String::from_utf8_lossy(&commit.stderr).to_string())}let push=run_host_program(&root,"git",&["push"])?;if push.code!=0{return Ok(push)}Ok(CommandResult{code:0,output:format!("{}\n{}\n{}",diff.output,String::from_utf8_lossy(&commit.stdout),push.output)})
}
#[tauri::command] fn run_dev_server(path:String,state:State<Server>)->Result<String,String>{let root=repo(&path)?;let mut slot=state.0.lock().map_err(fail)?;if slot.as_mut().is_some_and(|c|c.try_wait().ok().flatten().is_none()){return Ok("Server is already running.".into())}let mut cmd=command(&root,"npm")?;let mut child=cmd.args(["run","dev","--","--host","127.0.0.1","--port","4321","--strictPort"]).stdout(Stdio::null()).stderr(Stdio::null()).spawn().map_err(fail)?;let address:SocketAddr="127.0.0.1:4321".parse().unwrap();let mut ready=false;for _ in 0..30{if child.try_wait().map_err(fail)?.is_some(){break}if TcpStream::connect_timeout(&address,Duration::from_millis(100)).is_ok(){ready=true;break}thread::sleep(Duration::from_millis(100));}if !ready{let _=child.kill();let _=child.wait();return Err("Astro did not start on port 4321. Check that Node.js/npm and the site's dependencies are installed, and that the port is free.".into())}*slot=Some(child);Ok("Astro is running at http://127.0.0.1:4321".into())}
#[tauri::command] fn stop_dev_server(state:State<Server>)->Result<String,String>{let mut slot=state.0.lock().map_err(fail)?;if let Some(mut c)=slot.take(){let _=c.kill();let _=c.wait();}Ok("Astro server stopped.".into())}
#[tauri::command] fn validate_repo(path:String)->Result<Vec<String>,String>{let root=repo(&path)?;let mut issues=Vec::new();let schema=fs::read_to_string(root.join("src/content.config.ts")).map_err(fail)?;for field in ["title","description","date","tags","draft","sample","featured","status","art","visual","visualAccent","visualImage","visualImageAlt","visualLabel","visualAnimate"]{if !schema.contains(field){issues.push(format!("The current site schema does not declare the editor's expected {field} metadata field. Saving is disabled until the adapter is updated."))}}for art in ["wing","orbit","code"]{if !schema.contains(art){issues.push(format!("The current site schema does not contain expected project artwork value '{art}'."))}}for visual in ["dither","grain","mesh","grid","dots","asset","screenshot"]{if !schema.contains(visual){issues.push(format!("The current site schema does not contain expected project visual value '{visual}'."))}}Ok(issues)}
#[cfg_attr(mobile, tauri::mobile_entry_point)] pub fn run(){tauri::Builder::default().manage(Server(Mutex::new(None))).plugin(tauri_plugin_dialog::init()).plugin(tauri_plugin_opener::init()).invoke_handler(tauri::generate_handler![list_content,create_article,rename_article,delete_article,duplicate_article,read_article,save_article,import_site_image,read_site_image,project_command,environment,git_info,publish,run_dev_server,stop_dev_server,validate_repo]).run(tauri::generate_context!()).expect("error while running Tauri application");}

#[cfg(test)] mod tests {
 use super::*;
 #[test] fn git_ahead_behind_counts_are_parsed_in_order(){assert_eq!(parse_counts("3\t2\n"),(3,2));assert_eq!(parse_counts("bad 4"),(0,4));assert_eq!(parse_counts(""),(0,0));}
 #[test] fn publish_allowlist_excludes_site_code_and_non_asset_public_files(){assert!(publishable_path("src/content/writing/story.mdx"));assert!(publishable_path("public/images/rocket.webp"));assert!(!publishable_path("src/pages/index.astro"));assert!(!publishable_path("public/.env"));assert!(!publishable_path("public/scripts/app.js"));}
 #[test] fn repository_file_paths_cannot_escape_or_follow_outside_symlinks(){let dir=std::env::temp_dir().join(format!("site-editor-path-test-{}",std::process::id()));let outside=dir.with_extension("outside");let _=fs::remove_dir_all(&dir);let _=fs::remove_file(&outside);fs::create_dir_all(&dir).unwrap();fs::write(dir.join("entry.md"),"safe").unwrap();fs::write(&outside,"outside").unwrap();#[cfg(unix)] std::os::unix::fs::symlink(&outside,dir.join("escape.md")).unwrap();assert!(safe_file(&dir,"entry.md").is_ok());assert!(safe_file(&dir,"../outside").is_err());#[cfg(unix)] assert!(safe_file(&dir,"escape.md").is_err());let _=fs::remove_dir_all(&dir);let _=fs::remove_file(&outside);}
}
