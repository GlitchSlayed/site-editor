# Site adapter

The editor targets the checked-out Astro website content schema extracted dynamically from `src/content.config.ts`:

- `src/content/writing/**/*.{md,mdx}` uses `title`, `description`, `date`, `tags`, and defaults for `draft`, `sample`, and `featured`.
- `src/content/projects/**/*.{md,mdx}` adds:
  - `status`: one of `Concept`, `In Development`, `Prototype`, `Completed`, or `Released`.
  - `drawing`: one of `airfoils`, `gridfin`, `wing`, `turbine`, `rocket`, or `none`.
  - `art`: `wing`, `orbit`, `code`.
  - `engineering`: structured record (`question`, `approach`, `constraint`, `evidence`, `nextCheck`, `methods`).
  - `visual`: `dither`, `grain`, `mesh`, `grid`, `dots`, `asset`, `screenshot`, plus `visualAccent` (#RRGGBB), `visualImage`, `visualImageAlt`, `visualLabel`, and `visualAnimate`.
- The current schema does not include `thumbnail` fields. The editor does not write them.

## Dual Schema Extraction & Validation

Both the TypeScript adapter (`src/lib/site-adapter.ts`) and Rust backend (`src-tauri/src/env.rs`) parse `src/content.config.ts` directly, extracting all valid enum values and fields using AST / regex parsing rather than arbitrary substrings. If `content.config.ts` cannot be parsed, the validator fails loudly with an actionable error.

## Preservation & Safety Model

The TypeScript adapter parses frontmatter as structured YAML; it never executes Astro or MDX. Body-only edits retain the exact frontmatter prefix byte-for-byte and preserve code, math delimiters, links, indentation, tables, and custom MDX components. Metadata edits serialize the metadata map, preserving unrecognized keys and values. The source editor exposes the complete original file for raw control.

External file modification conflict detection checks file hashes before writes, preventing accidental overwrite of outside edits. Autosave recovery periodically caches unsaved buffers locally to prevent loss during crashes or unexpected shutdowns.
