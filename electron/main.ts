import { app, BrowserWindow, ipcMain, nativeImage } from 'electron'
import fs from 'node:fs'
import { createNote, deleteNote, getNotes, init, updateNoteContent, updateNoteTitle } from './database'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let win: BrowserWindow | null

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
})

ipcMain.handle('getNotes', getNotes)
ipcMain.handle('createNote', createNote)
ipcMain.handle('updateNoteTitle', (_event, id, title) => updateNoteTitle(id, title))
ipcMain.handle('updateNoteContent', (_event, id, content) => updateNoteContent(id, content))
ipcMain.handle('deleteNote', (_event, id) => deleteNote(id))
