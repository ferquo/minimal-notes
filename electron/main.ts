import { app, BrowserWindow, ipcMain, nativeImage, protocol, Menu } from 'electron'
import fs from 'node:fs'
import { createNote, deleteNote, getNotes, init, updateNoteContent, updateNoteTitle, recordImage, deleteImagesForNote, deleteImageByFilename, getNoteContent } from './database'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fsp from 'node:fs/promises'
import crypto from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// Register custom scheme privileges early
try {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'notes', privileges: { standard: true, secure: true, supportFetchAPI: false, corsEnabled: false } },
  ])
} catch {}

let win: BrowserWindow | null
let appSettings: { spellcheckEnabled: boolean } = { spellcheckEnabled: false }
let settingsPath: string

function loadSettings(p: string) {
  try {
    const raw = fs.readFileSync(p, 'utf8')
    const parsed = JSON.parse(raw)
    appSettings = { spellcheckEnabled: !!parsed.spellcheckEnabled }
  } catch {}
}

function saveSettings(p: string) {
  try {
    fs.writeFileSync(p, JSON.stringify(appSettings, null, 2), 'utf8')
  } catch (e) {
    console.warn('Failed to save settings', e)
  }
}

function applySpellcheckToRenderer() {
  try { win?.webContents.send('set-spellcheck', appSettings.spellcheckEnabled) } catch {}
}

function buildAppMenu() {
  const template: Electron.MenuItemConstructorOptions[] = []
  const isMac = process.platform === 'darwin'

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    })
  }

  template.push({
    label: 'File',
    submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
  })

  template.push({
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
      { type: 'separator' },
      {
        label: 'Spellcheck',
        type: 'checkbox',
        checked: appSettings.spellcheckEnabled,
        click: (item) => {
          appSettings.spellcheckEnabled = !!item.checked
          saveSettings(settingsPath)
          applySpellcheckToRenderer()
        },
      },
    ],
  })

  template.push({
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  })

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow() {
  // Determine icon path for platforms that use BrowserWindow icon (Win/Linux)
  const isMac = process.platform === 'darwin'
  let iconForWindow: string | undefined
  if (!isMac) {
    const winIcon = path.join(process.cwd(), 'build/icons/icon.ico')
    const pngIcon = path.join(process.cwd(), 'build/icons/icon.png')
    iconForWindow = process.platform === 'win32' && fs.existsSync(winIcon) ? winIcon : pngIcon
  }

  win = new BrowserWindow({
    icon: iconForWindow,
    webPreferences: {
      // The preload build outputs ESM `.mjs` in dist-electron
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.APP_ROOT, 'dist/index.html'))
  }
}

// Attachments base directory under userData
let attachmentsDir: string

function ensureDir(p: string) {
  try {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
  } catch (e) {
    console.error('Failed to ensure directory', p, e)
  }
}

function registerNotesProtocol() {
  protocol.registerFileProtocol('notes', (request, callback) => {
    try {
      const url = new URL(request.url)
      const host = url.host || url.hostname
      if (host !== 'attachments') return callback({ error: -6 })
      const parts = url.pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p))
      const noteId = parts[0]
      const filename = parts.slice(1).join('/')
      if (!noteId || !filename) return callback({ error: -6 })
      const resolved = path.normalize(path.join(attachmentsDir, noteId, filename))
      const expectedBase = path.join(attachmentsDir, noteId)
      if (!resolved.startsWith(expectedBase)) return callback({ error: -10 })
      return callback(resolved)
    } catch (e) {
      console.error('notes:// protocol error', e)
      return callback({ error: -2 })
    }
  })
}

type SaveImageArgs = { noteId: string; bytes: ArrayBuffer | Uint8Array | { type: string; data: number[] } | any; mime: string }

function sha256(buf: Buffer) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function extFromMime(mime: string): string {
  switch (mime) {
    case 'image/png': return 'png'
    case 'image/jpeg': return 'jpg'
    case 'image/gif': return 'gif'
    case 'image/webp': return 'webp'
    case 'image/svg+xml': return 'svg'
    default: return 'bin'
  }
}

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'])

async function writeIfMissing(filePath: string, bytes: Buffer) {
  try {
    await fsp.access(filePath, fs.constants.F_OK)
    return false
  } catch {
    await fsp.mkdir(path.dirname(filePath), { recursive: true })
    await fsp.writeFile(filePath, bytes)
    return true
  }
}

function registerAttachmentIpc() {
  ipcMain.handle('saveImage', async (_e, args: SaveImageArgs) => {
    const { noteId, bytes: rawBytes, mime } = args
    if (!noteId) throw new Error('noteId required')
    // Normalize incoming bytes into a Node Buffer
    let bytes: Buffer
    if (Buffer.isBuffer(rawBytes)) {
      bytes = rawBytes
    } else if (rawBytes instanceof Uint8Array) {
      bytes = Buffer.from(rawBytes)
    } else if (rawBytes && rawBytes.type === 'Buffer' && Array.isArray(rawBytes.data)) {
      // Electron may serialize Buffers as { type: 'Buffer', data: number[] }
      bytes = Buffer.from(rawBytes.data)
    } else if (rawBytes instanceof ArrayBuffer) {
      bytes = Buffer.from(new Uint8Array(rawBytes))
    } else {
      throw new Error('Unsupported bytes payload')
    }
    if (!ALLOWED.has(mime)) throw new Error(`Unsupported mime: ${mime}`)
    if (bytes.byteLength > MAX_BYTES) throw new Error('Image too large')

    const hash = sha256(bytes)
    const ext = extFromMime(mime)
    const filename = `${hash}.${ext}`
    const filePath = path.join(attachmentsDir, noteId, filename)

    await writeIfMissing(filePath, bytes)

    let width: number | undefined
    let height: number | undefined
    try {
      const img = nativeImage.createFromBuffer(bytes)
      const size = img.getSize()
      width = size.width
      height = size.height
    } catch {}

    const url = `notes://attachments/${encodeURIComponent(noteId)}/${encodeURIComponent(filename)}`

    // Record metadata for Level 1 tracking (best-effort)
    try {
      recordImage({
        noteId: Number(noteId),
        hash,
        filename,
        mime,
        sizeBytes: bytes.byteLength,
        createdAt: Date.now(),
      })
    } catch (e) {
      console.warn('Failed to record image metadata', e)
    }
    return { url, mime, filename, width, height }
  })

  ipcMain.handle('deleteNoteAttachments', async (_e, noteId: string) => {
    if (!noteId) return false
    const dir = path.join(attachmentsDir, noteId)
    try {
      await fsp.rm(dir, { recursive: true, force: true })
      try { deleteImagesForNote(Number(noteId)) } catch {}
      return true
    } catch (e) {
      console.warn('Failed to delete attachments dir', dir, e)
      return false
    }
  })

  // Garbage collect unreferenced attachments for a note by parsing current HTML
  ipcMain.handle('gcNoteAttachments', async (_e, noteId: string) => {
    if (!noteId) return { deleted: 0 }
    const dir = path.join(attachmentsDir, noteId)
    let html: string | null = null
    try { html = getNoteContent(Number(noteId)) } catch {}
    const referenced = new Set<string>()
    if (html) {
      // Match src="notes://attachments/<noteId>/<filename>"
      const re = new RegExp(`src=\\"notes://attachments/${noteId}/([^\\"]+)\\"`, 'g')
      let m: RegExpExecArray | null
      while ((m = re.exec(html)) !== null) {
        referenced.add(m[1])
      }
    }
    let files: string[] = []
    try {
      files = await fsp.readdir(dir)
    } catch {
      return { deleted: 0 }
    }
    let deleted = 0
    for (const fname of files) {
      if (!referenced.has(fname)) {
        try {
          await fsp.rm(path.join(dir, fname), { force: true })
          try { deleteImageByFilename(Number(noteId), fname) } catch {}
          deleted++
        } catch (e) {
          console.warn('Failed to remove orphan attachment', fname, e)
        }
      }
    }
    return { deleted }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  process.env.APP_ROOT = app.getAppPath()
  process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : path.join(process.env.APP_ROOT, 'dist')

  const dbPath = path.join(app.getPath('userData'), 'notes.db')
  init(dbPath)

  // Initialize attachments storage and protocol
  attachmentsDir = path.join(app.getPath('userData'), 'attachments')
  ensureDir(attachmentsDir)
  registerNotesProtocol()
  registerAttachmentIpc()

  // Settings storage
  settingsPath = path.join(app.getPath('userData'), 'settings.json')
  loadSettings(settingsPath)
  buildAppMenu()

  // On macOS in development, set the Dock icon explicitly.
  // The app bundle icon is only applied to packaged apps.
  if (process.platform === 'darwin') {
    const icnsCandidates = [
      path.join(process.cwd(), 'build/icons/icon.icns'),
      path.join(app.getAppPath(), 'build/icons/icon.icns'),
      path.join(__dirname, '..', 'build/icons/icon.icns'),
      path.join(__dirname, 'build/icons/icon.icns'),
    ]
    const pngCandidates = [
      path.join(process.cwd(), 'build/icons/icon.png'),
      path.join(app.getAppPath(), 'build/icons/icon.png'),
      path.join(__dirname, '..', 'build/icons/icon.png'),
      path.join(__dirname, 'build/icons/icon.png'),
    ]

    const firstExisting = (paths: string[]) => paths.find(p => { try { return fs.existsSync(p) } catch { return false } })

    const trySetIconFrom = (p: string | undefined) => {
      if (!p) return false
      const img = nativeImage.createFromPath(p)
      if (!img.isEmpty()) {
        app.dock.setIcon(img)
        console.log('[icon] macOS Dock icon set from:', p)
        return true
      }
      console.warn('[icon] Failed to load icon image:', p)
      return false
    }

    // Prefer ICNS, then PNG
    const icnsPath = firstExisting(icnsCandidates)
    const pngPath = firstExisting(pngCandidates)

    if (!trySetIconFrom(icnsPath)) {
      // Try PNG if ICNS failed
      if (!trySetIconFrom(pngPath)) {
        // As a last resort, read PNG into a buffer and try again
        if (pngPath) {
          try {
            const buf = fs.readFileSync(pngPath)
            const img = nativeImage.createFromBuffer(buf)
            if (!img.isEmpty()) {
              app.dock.setIcon(img)
              console.log('[icon] macOS Dock icon set from buffer:', pngPath)
            } else {
              console.warn('[icon] PNG buffer produced empty image:', pngPath)
            }
          } catch (e) {
            console.warn('[icon] Error reading PNG for buffer fallback:', e)
          }
        } else {
          console.warn('[icon] No icon file found in expected paths for macOS dev')
        }
      }
    }
  }

  createWindow()

  // After window created, apply current spellcheck setting to renderer
  applySpellcheckToRenderer()
})

ipcMain.handle('getNotes', getNotes)
ipcMain.handle('createNote', createNote)
ipcMain.handle('updateNoteTitle', (_event, id, title) => updateNoteTitle(id, title))
ipcMain.handle('updateNoteContent', (_event, id, content) => updateNoteContent(id, content))
ipcMain.handle('deleteNote', (_event, id) => deleteNote(id))

// Settings IPC
ipcMain.handle('getSettings', () => ({ ...appSettings }))
