# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React + TypeScript renderer (UI), components, styles.
- `electron/`: Main process (`main.ts`), `preload.ts`, local DB (`database.ts`).
- `public/`: Static assets served in dev/build.
- `build/`: App icons and packaging assets; generated ICO/ICNS live here.
- `scripts/`: Utility scripts (e.g., `png-to-ico.js`).
- Outputs: `dist/` (renderer), `dist-electron/` (main/preload), installers in `release/`.

## Build, Test, and Development Commands
- `npm run dev`: Start Vite + Electron for local development.
- `npm run build:renderer`: Type-check and bundle renderer only.
- `npm run build`: Full app build and package via electron-builder.
- `npm run preview`: Serve built renderer locally (no Electron shell).
- `npm run lint`: ESLint over `src/` and `electron/`.
- Icons: `npm run icons:win` (Windows ICO), `npm run icons:win:mac` (macOS resize + ICO).

## Coding Style & Naming Conventions
- Language: TypeScript with `strict` mode (see `tsconfig.json`).
- Linting: ESLint with TypeScript + React Hooks plugins. Fix warnings before PR.
- Components: PascalCase files (`Editor.tsx`, `Sidebar.tsx`). Modules/utilities: camelCase.
- Indentation/formatting: follow existing style in repo; prefer 2 spaces and single quotes.
- CSS: Tailwind utility-first; keep custom CSS in `src/index.css` minimal.

## Testing Guidelines
- Automated tests are not configured yet. For changes, manually verify by:
  - Running `npm run dev`, creating/renaming/deleting notes, and restarting the app.
  - Confirming DB persistence under Electron `userData` path.
- If adding tests, propose Vitest for unit and Playwright for E2E in a separate PR.

## Commit & Pull Request Guidelines
- Commits: short, imperative summaries (e.g., "Fix windows build", "Add note renaming").
- PRs should include: concise description, screenshots for UI changes, steps to reproduce/verify, and any related issue links. Ensure `npm run lint` and `npm run build` pass.

## Security & Configuration Tips
- Keep logic in `preload.ts` and use IPC; do not expose Node APIs directly to the renderer.
- Database lives in `userData/notes.db` (see `electron/database.ts`). Coordinate schema changes and include a simple migration if needed.
- macOS signing is not configured; see README for Gatekeeper instructions.

## Architecture Overview
- Main process manages windows and persistence (better-sqlite3 via IPC handlers).
- Renderer handles UI (React, Tiptap). IPC channels: `getNotes`, `createNote`, `updateNoteTitle`, `updateNoteContent`, `deleteNote`.
