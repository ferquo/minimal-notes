import { app, BrowserWindow, ipcMain } from 'electron'
import { createNote, deleteNote, getNotes, init, updateNoteContent, updateNoteTitle } from './database'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
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

  createWindow()
})

ipcMain.handle('getNotes', getNotes)
ipcMain.handle('createNote', createNote)
ipcMain.handle('updateNoteTitle', (_event, id, title) => updateNoteTitle(id, title))
ipcMain.handle('updateNoteContent', (_event, id, content) => updateNoteContent(id, content))
ipcMain.handle('deleteNote', (_event, id) => deleteNote(id))
