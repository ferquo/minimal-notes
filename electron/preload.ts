import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('db', {
  getNotes: () => ipcRenderer.invoke('getNotes'),
  createNote: () => ipcRenderer.invoke('createNote'),
  updateNoteTitle: (id: number, title: string) => ipcRenderer.invoke('updateNoteTitle', id, title),
  updateNoteContent: (id: number, content: string) => ipcRenderer.invoke('updateNoteContent', id, content),
  deleteNote: (id: number) => ipcRenderer.invoke('deleteNote', id),
})
