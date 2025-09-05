import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('db', {
  getNotes: () => ipcRenderer.invoke('getNotes'),
  createNote: () => ipcRenderer.invoke('createNote'),
  updateNoteTitle: (id: number, title: string) => ipcRenderer.invoke('updateNoteTitle', id, title),
  updateNoteContent: (id: number, content: string) => ipcRenderer.invoke('updateNoteContent', id, content),
  deleteNote: (id: number) => ipcRenderer.invoke('deleteNote', id),
  reorderNotes: (ids: number[]) => ipcRenderer.invoke('reorderNotes', ids),
})

// Narrow bridge for attachments/images
contextBridge.exposeInMainWorld('api', {
  saveImage: (noteId: string, data: ArrayBuffer | Uint8Array, mime: string) =>
    ipcRenderer.invoke('saveImage', { noteId, bytes: data, mime }),
  deleteNoteAttachments: (noteId: string) => ipcRenderer.invoke('deleteNoteAttachments', noteId),
  gcNoteAttachments: (noteId: string) => ipcRenderer.invoke('gcNoteAttachments', noteId),
  // App settings bridge
  getSettings: () => ipcRenderer.invoke('getSettings'),
  onSetSpellcheck: (cb: (enabled: boolean) => void) => {
    const listener = (_: unknown, enabled: boolean) => cb(enabled)
    ipcRenderer.on('set-spellcheck', listener)
    return () => ipcRenderer.removeListener('set-spellcheck', listener)
  },
})
