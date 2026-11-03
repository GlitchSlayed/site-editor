# Blog Editor

A local React + TypeScript frontend with a Tauri 2 desktop shell for editing Markdown and MDX in the existing Astro website. The first vertical slice handles repository selection, writing/projects discovery, metadata editing, Markdown source, a safe approximation preview, Astro validation/build, and a constrained Git publish path.

## Current implementation status

- The editor is separate from the site and expects an existing Git checkout.
- The adapter matches the current repository's Astro 7 content schema. Project art values are currently `wing`, `orbit`, and `code`; visual styles are the seven values in `src/content.config.ts`.
- Markdown body edits preserve the original frontmatter bytes. Untouched documents save byte-for-byte; changing structured metadata rewrites only the YAML header while keeping unknown metadata and the body.
- MDX source is not evaluated. MDX files remain editable in source mode; component-rich MDX does not render in the approximation preview.
- Native repository, filesystem, command, and Git operations are only available in Tauri. Browser mode shows the interface and disables those operations.
- The editor currently supports editing existing entries. Creating, duplicating, renaming, deleting/archive, asset import/relink, config.ts, and About/homepage controls are not implemented yet.
- The visual preview is an approximation. The actual Astro server is available separately.
- Git publish runs `npm run check`, `npm run build`, fetches upstream, stages only changed files under `src/content/writing`, `src/content/projects`, and `public`, commits, and pushes. It never runs `git add -A`.
- The native Tauri binary and Flatpak bundle have been built, installed for the current user, and launched. The manifest packages a prebuilt binary from `src-tauri/target/flatpak-stage`; it is not yet a reproducible source-build pipeline.
- The installed Flatpak successfully ran host Node.js/npm through `flatpak-spawn`. Portal access to the website checkout and actual Git publishing have not been exercised.

## Development

Requirements: Node.js 24 or newer, npm, Rust, and the Linux Tauri/WebKitGTK development packages. On Fedora 44 you also need:

```bash
sudo dnf install javascriptcoregtk4.1-devel libsoup3-devel webkit2gtk4.1-devel
```

Then:

```bash
npm ci                      # install site + editor dependencies
npm run dev                 # editor dev server (desktop file ops disabled in browser)
npm run tauri -- dev        # desktop app (full filesystem/Git access)
npm test                    # vitest suite
npm run build               # web frontend only (dist/)
npx tauri build             # desktop app + bundles (deb/rpm/appimage); runs `npm run build` first
```

Build speed: the first `npx tauri build` compiles the WebKitGTK/Rust bindings (~1 minute). Subsequent builds reuse the `src-tauri/target/` cargo cache and are much faster. The web frontend (`npm run build`) builds independently in ~20s.

See [`docs/build.md`](docs/build.md) for the full build process, Flatpak rebuild steps, and how to keep builds fast.

## Browser limitations

A normal browser cannot open a repository folder, read/write arbitrary local files, or run npm and Git. This mode is a UI development preview only; it does not start a companion backend. Use the Tauri application for editing and publishing.

## Flatpak

The manifest is at `packaging/com.glitchslayed.site-editor.yml`. The intended bridge is limited in application code to the fixed `git` operations and `npm run check/build/dev` calls. The Flatpak needs network access for Git and local preview, the document portal for user-selected repository access, and `org.freedesktop.Flatpak` talk permission for `flatpak-spawn --host`. `ssh-auth` is exposed to reuse an SSH agent. No blanket home filesystem access is requested.

The bridge executes host Git/Node/npm and reads the selected checkout on the host. A user must have Git, Node 24+, npm, and the website dependencies available on the host. This is a deliberate bridge strategy, not bundled tools. The host-command permission is powerful; the Rust command surface must remain fixed and argument-array based. Do not grant a generic command endpoint. The Flatpak was built from a prebuilt Tauri binary and installed locally; its repository portal and Git workflow still need an end-to-end check.

Build notes and environment expectations are in [the Flatpak guide](docs/flatpak.md).

## Site adapter

The adapter intentionally reads only the known `src/content.config.ts` shape rather than evaluating TypeScript configuration. See [the adapter notes](docs/site-adapter.md).
