# Build process

The editor has two buildable parts:

1. **Web frontend** — Vite + TypeScript, output to `dist/` (embedded into the desktop binary at compile time).
2. **Desktop shell** — Tauri 2 (Rust), which loads `dist/` and exposes filesystem/Git commands.

## One-time system setup

Node 24+, npm, and Rust are required. On Fedora 44 the Tauri/WebKitGTK build also needs these system development libraries:

```bash
sudo dnf install javascriptcoregtk4.1-devel libsoup3-devel webkit2gtk4.1-devel
```

Without them, `npx tauri build` fails compiling `webkit2gtk-sys` / `soup3-sys` / `javascriptcore-rs-sys` (missing `*.pc` files for pkg-config).

## Build commands

Run from the Site Editor project root:

```bash
npm ci                      # install editor + site dependencies
npm run build               # web frontend only -> dist/ (~20s)
npx tauri build             # desktop app: runs `npm run build`, then compiles Rust and bundles deb/rpm/appimage
```

`npx tauri build` output lands in `src-tauri/target/release/bundle/{deb,rpm,appimage}/`, and the binary itself at `src-tauri/target/release/glitchys-site-editor`.

## Rebuilding the installed Flatpak

The installed Flatpak bundles a **prebuilt** Tauri binary (the frontend `dist/` is compiled into the binary). To ship frontend changes (e.g. the status dropdown / category field) to the installed app, rebuild the binary and repackage:

```bash
# 1. rebuild the Tauri binary (embeds fresh dist/)
npx tauri build

# 2. copy the new binary over the staged one
cp src-tauri/target/release/glitchys-site-editor src-tauri/target/flatpak-stage/bin/glitchys-site-editor

# 3. build a new bundle from the stage dir (flatpak build-init / build-finish / build-export / build-bundle)
flatpak build-init /tmp/se-build com.glitchslayed.site-editor org.gnome.Sdk org.gnome.Platform 49 --arch=x86_64
cp -r src-tauri/target/flatpak-stage/* /tmp/se-build/files/
flatpak build-finish /tmp/se-build --socket=wayland --socket=fallback-x11 --device=dri --share=network --share=ipc --socket=ssh-auth --talk-name=org.freedesktop.Flatpak --command=glitchys-site-editor
rm -rf /tmp/se-repo && flatpak build-export /tmp/se-repo /tmp/se-build
rm -f /tmp/se-bundle.flatpak && flatpak build-bundle /tmp/se-repo /tmp/se-bundle.flatpak com.glitchslayed.site-editor master

# 4. install over the existing Flatpak
flatpak install --user /tmp/se-bundle.flatpak -y
```

## Keeping builds fast

- **First `npx tauri build` is slow (~1 minute)** — it compiles `webkit2gtk`, `soup3`, `javascriptcore-rs`, and the Tauri runtime. This is a one-time cost.
- **Subsequent builds are fast** — cargo caches compiled crates in `src-tauri/target/`. Do not delete `target/` unless you need a clean rebuild.
- **Web-only changes** — run `npm run build` (~20s) to regenerate `dist/` without touching Rust. Only re-run `npx tauri build` when you need to repackage the desktop app.
- **ccache** — `.flatpak-builder/ccache/` is present for Flatpak builds; host `npx tauri build` relies on cargo's native incremental cache.

## Browser vs desktop

Browser mode (`npm run dev`) shows the UI but disables filesystem, Git, and npm/Git operations. Use `npm run tauri -- dev` (the Tauri desktop app) for real editing and publishing.
