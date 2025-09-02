# Image Paste & Attachment Storage — Implementation Plan

This plan adds image pasting, drag-and-drop, and storage for a desktop Electron + TipTap app. Images are saved as files under the Electron `userData` directory and referenced from TipTap via a custom `notes://` protocol. The database only stores note content (with image URLs) and optional image metadata.

## Goals

- Reliable paste/drag of image data into TipTap.
- Store images on disk under `userData/attachments/<noteId>/` with content-addressed filenames.
- Serve images to the renderer via a read-only custom protocol (`notes://attachments/...`).
- Keep DB small and portable; avoid base64 in content and SQLite BLOBs.
- Add basic cleanup on note deletion and optional orphan GC.

## High-Level Architecture

- Filesystem: `attachmentsDir = path.join(app.getPath('userData'), 'attachments')`.
- Per-note folder: `attachments/<noteId>/`.
- Filenames: `<sha256>.<ext>` from image bytes to dedupe and avoid collisions.
- Custom protocol: `notes://attachments/<noteId>/<filename>` → resolves to the file on disk.
- TipTap: stores only `attrs.src` pointing to the `notes://...` URL.
- IPC: renderer requests `saveImage` with bytes + mime + noteId; main writes file and returns `url`.

## Main Process Changes (`electron/main.ts`)

1) Setup attachments directory on app ready

```ts
import { app, protocol, ipcMain, nativeImage } from 'electron';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const attachmentsDir = path.join(app.getPath('userData'), 'attachments');

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

app.whenReady().then(() => {
  ensureDir(attachmentsDir);
  registerNotesProtocol();
  registerIpcHandlers();
});
```

2) Register a secure, read-only file protocol

```ts
function registerNotesProtocol() {
  protocol.registerFileProtocol('notes', (request, callback) => {
    try {
      // Expected URL: notes://attachments/<noteId>/<filename>
      const url = new URL(request.url);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length < 3 || parts[0] !== 'attachments') return callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND

      const noteId = parts[1];
      const filename = parts.slice(2).join('/'); // no traversal allowed below

      // Normalize and prevent path traversal
      const resolved = path.normalize(path.join(attachmentsDir, noteId, filename));
      if (!resolved.startsWith(path.join(attachmentsDir, noteId))) return callback({ error: -10 }); // net::ERR_ACCESS_DENIED

      return callback(resolved);
    } catch (e) {
      return callback({ error: -2 }); // net::FAILED
    }
  });
}
```

3) IPC handler to save images to disk

```ts
type SaveImageArgs = { noteId: string; bytes: Buffer; mime: string };

function sha256(buf: Buffer) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/png': return 'png';
    case 'image/jpeg': return 'jpg';
    case 'image/gif': return 'gif';
    case 'image/webp': return 'webp';
    case 'image/svg+xml': return 'svg';
    default: return 'bin';
  }
}

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED = new Set(['image/png','image/jpeg','image/gif','image/webp','image/svg+xml']);

async function writeIfMissing(filePath: string, bytes: Buffer) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return false; // exists
  } catch {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, bytes);
    return true;
  }
}

function registerIpcHandlers() {
  ipcMain.handle('saveImage', async (_e, args: SaveImageArgs) => {
    const { noteId, bytes, mime } = args;
    if (!noteId) throw new Error('noteId required');
    if (!Buffer.isBuffer(bytes)) throw new Error('bytes must be Buffer');
    if (!ALLOWED.has(mime)) throw new Error(`Unsupported mime: ${mime}`);
    if (bytes.byteLength > MAX_BYTES) throw new Error('Image too large');

    const hash = sha256(bytes);
    const ext = extFromMime(mime);
    const filename = `${hash}.${ext}`;
    const filePath = path.join(attachmentsDir, noteId, filename);

    await writeIfMissing(filePath, bytes); // dedupe by content hash

    // Optionally derive dimensions (png/jpg/webp/gif)
    let width: number | undefined;
    let height: number | undefined;
    try {
      const img = nativeImage.createFromBuffer(bytes);
      const size = img.getSize();
      width = size.width; height = size.height;
    } catch {}

    const url = `notes://attachments/${encodeURIComponent(noteId)}/${encodeURIComponent(filename)}`;
    return { url, mime, filename, width, height };
  });

  // Optional: delete all attachments for a note (call on note delete)
  ipcMain.handle('deleteNoteAttachments', async (_e, noteId: string) => {
    if (!noteId) return false;
    const dir = path.join(attachmentsDir, noteId);
    try {
      await fsp.rm(dir, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  });
}
```

## Preload Bridge (`electron/preload.ts`)

Expose a narrow API; never leak Node primitives to the renderer.

```ts
import { contextBridge, ipcRenderer } from 'electron';

type SaveImageRequest = { noteId: string; bytes: ArrayBuffer; mime: string };
type SaveImageResponse = { url: string; mime: string; filename: string; width?: number; height?: number };

const api = {
  saveImage: async (noteId: string, data: ArrayBuffer | Uint8Array, mime: string): Promise<SaveImageResponse> => {
    const buf = data instanceof Uint8Array ? Buffer.from(data) : Buffer.from(data);
    return ipcRenderer.invoke('saveImage', { noteId, bytes: buf, mime });
  },
  deleteNoteAttachments: (noteId: string) => ipcRenderer.invoke('deleteNoteAttachments', noteId),
};

declare global { interface Window { api: typeof api } }
contextBridge.exposeInMainWorld('api', api);
```

## Renderer: TipTap Integration (`src/...`)

1) Ensure Image extension is enabled in your editor setup.

2) Add paste and drop handlers that intercept image files or data-URLs:

```ts
function extractImagesFromClipboard(e: ClipboardEvent): File[] {
  const files: File[] = [];
  if (!e.clipboardData) return files;
  for (const item of e.clipboardData.items) {
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file && file.type.startsWith('image/')) files.push(file);
    }
  }
  return files;
}

async function saveFileAsAttachment(noteId: string, file: File) {
  const ab = await file.arrayBuffer();
  const { url, width, height } = await window.api.saveImage(noteId, ab, file.type);
  return { url, width, height };
}

// Example TipTap editor setup hook
const editor = useEditor({
  extensions: [StarterKit, Image],
  editorProps: {
    handlePaste(view, event) {
      const e = event as ClipboardEvent;
      const files = extractImagesFromClipboard(e);
      if (files.length === 0) return false;
      e.preventDefault();
      (async () => {
        for (const f of files) {
          const { url, width, height } = await saveFileAsAttachment(currentNoteId, f);
          editor?.chain().focus().setImage({ src: url, alt: f.name, width, height }).run();
        }
      })();
      return true;
    },
    handleDrop(view, event, _slice, moved) {
      const e = event as DragEvent;
      if (moved || !e.dataTransfer) return false;
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) return false;
      e.preventDefault();
      (async () => {
        for (const f of files) {
          const { url, width, height } = await saveFileAsAttachment(currentNoteId, f);
          editor?.chain().focus().setImage({ src: url, alt: f.name, width, height }).run();
        }
      })();
      return true;
    },
  },
});
```

3) Optional: Convert pasted HTML data-URLs to attachments

```ts
function dataUrlToBytes(src: string): { bytes: Uint8Array; mime: string } | null {
  const m = src.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
  return { bytes, mime };
}

// In handlePaste: parse e.clipboardData.getData('text/html') and replace <img src="data:..."> with saved URLs.
```

## Database (Optional)

If you want metadata tracking and robust cleanup, add an `images` table:

Schema suggestion (better-sqlite3):

```sql
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,        -- sha256
  note_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS images_note_id ON images(note_id);
```

Usage:
- Insert on first write (ignore on conflict by `id`).
- On note delete: delete rows for `note_id` then remove folder.
- Optional orphan GC: parse note content `src`s and delete files not referenced.

## Cleanup & Lifecycle

- On note deletion: call `window.api.deleteNoteAttachments(noteId)`.
- Optional periodic GC: scan `attachments/<noteId>/` and compare against current note content `src`s.

## Security & Limits

- Allowed mimes: png, jpeg, gif, webp, svg.
- Max size: 20 MB (configurable).
- Path traversal protection when resolving `notes://` requests.
- Read-only protocol; no write endpoints exposed to renderer.
- Do not expose absolute paths or `file://` URLs in note content.

## UX Considerations

- Show a small toast/progress when saving large images.
- On error (size/format), display a helpful message.
- Optional: Client-side downscale via Canvas before save to limit size.
- Respect undo/redo: image insertions should be a single transaction in TipTap.

## Manual Verification Steps

1) Run `npm run dev` and paste an image (Cmd+V) into the editor.
2) Drag and drop a `.png`/`.jpg` from Finder/Explorer.
3) Relaunch the app; confirm images render via `notes://` URLs.
4) Check `userData/attachments/<noteId>/` contains files; dedupe by content hash.
5) Delete a note; confirm its `attachments/<noteId>` folder is removed.

## Integration Checklist

- [x] Add protocol + IPC in `electron/main.ts`.
- [x] Expose `saveImage` bridge in `electron/preload.ts`.
- [x] Wire paste/drop handlers in editor setup under `src/`.
- [x] Delete attachments on note deletion.
- [x] Optional: add `images` table and GC logic.
- [ ] Lint and run through manual tests above.

## Future Enhancements

- Generate thumbnails for faster list views.
- Export/import notes with attachments (rewrite URLs on import/export).
- Image compression/resize settings per user preference.
- Drag in non-image files as attachments (future).
