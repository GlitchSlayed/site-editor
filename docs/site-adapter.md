# Site adapter

The editor currently targets the checked-out Glitchy's Technical Blog schema:

- `src/content/writing/**/*.{md,mdx}` uses `title`, `description`, `date`, `tags`, and defaults for `draft`, `sample`, and `featured`.
- `src/content/projects/**/*.{md,mdx}` adds required `status` (one of `Concept`, `In Development`, `Prototype`, `Completed`) and `art` (`wing`, `orbit`, `code`), plus optional `category`.
- Projects may use `visual` (`dither`, `grain`, `mesh`, `grid`, `dots`, `asset`, `screenshot`), `visualAccent` (#RRGGBB), `visualImage`, `visualImageAlt`, `visualLabel`, and `visualAnimate`.
- The current schema does not include `thumbnail` fields. The editor does not write them.

The TypeScript adapter parses frontmatter as data; it never executes Astro or MDX. Body-only edits retain the exact frontmatter prefix and preserve code, math delimiters, links, indentation, tables, and unknown Markdown syntax. Metadata edits serialize the metadata map, preserving unknown keys and values but not YAML comments or original key formatting. The source editor exposes the complete original file for syntax that cannot be safely represented in forms.

The repository's `src/config.ts`, About Astro page, and homepage currently have no structured editing controls. Those files remain outside the editor's write/publish allowlist.
