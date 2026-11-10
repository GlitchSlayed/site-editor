# Flatpak packaging notes

The package uses a host-command bridge because arbitrary Astro repositories can require different package managers (Bun, PNPM, Yarn, npm), Node versions, and Git authentication setups. Git and package managers are not assumed to exist in the Flatpak runtime. The Tauri backend invokes only fixed Git operations and package manager commands (`<pm> run check`, `<pm> run build`, `<pm> install`, or `<pm> run dev`), using structured argument vectors and a controlled selected-repository working directory. It does not expose a generic shell endpoint.


The manifest requests Wayland/fallback X11, GPU access, networking, the Flatpak session service needed by `flatpak-spawn --host`, and the SSH agent socket. It does not request full home access. The native directory picker is intended to use the desktop portal to grant access to the selected checkout. Git credential helpers remain on the host. A successful push is reported separately from Pages deployment.

## Development packaging steps

1. Build the native app with `npm run tauri -- build --no-bundle` on Fedora with the Tauri v2 prerequisites installed.
2. Stage the binary and desktop metadata used by the manifest:

   ```bash
   stage=src-tauri/target/flatpak-stage
   mkdir -p "$stage/bin" "$stage/share/applications" "$stage/share/icons/hicolor/scalable/apps" "$stage/share/metainfo"
   install -Dm755 src-tauri/target/release/glitchys-site-editor "$stage/bin/glitchys-site-editor"
   install -Dm644 packaging/com.glitchslayed.site-editor.desktop "$stage/share/applications/com.glitchslayed.site-editor.desktop"
   install -Dm644 packaging/icons/hicolor/scalable/apps/com.glitchslayed.site-editor.svg "$stage/share/icons/hicolor/scalable/apps/com.glitchslayed.site-editor.svg"
   install -Dm644 packaging/com.glitchslayed.site-editor.metainfo.xml "$stage/share/metainfo/com.glitchslayed.site-editor.metainfo.xml"
   ```

3. Build the app repo with `flatpak-builder` and bundle it. If using the Flatpak Builder app, expose the host user installation so it can find the GNOME SDK:

   ```bash
   flatpak run --filesystem="$HOME/.local/share/flatpak" \
     --env=FLATPAK_USER_DIR="$HOME/.local/share/flatpak" \
     --command=flatpak-builder org.flatpak.Builder \
     --user --force-clean --repo=repo build-dir packaging/com.glitchslayed.site-editor.yml
   flatpak build-bundle repo glitchys-site-editor.flatpak com.glitchslayed.site-editor master \
     --runtime-repo=https://dl.flathub.org/repo/flathub.flatpakrepo
   ```

4. Install locally with `flatpak install --user ./glitchys-site-editor.flatpak` and launch with `flatpak run --user com.glitchslayed.site-editor`.
5. Verify the document portal grants access, Git status/fetch/push behave normally, and Astro preview connects to `127.0.0.1:4321` before relying on the host bridge.

The current manifest consumes a local source directory containing a prebuilt binary. It has been built and installed locally, but remains a packaging starting point rather than a reproducible source-build pipeline. Portal access to the website checkout and repository publishing still need an end-to-end check. Before distributing, add pinned source archives/lockfile-driven offline dependency sources, a Tauri-produced icon set, validate permissions with Flatpak tooling, and test SSH and credential-helper behavior in an installed sandbox.
