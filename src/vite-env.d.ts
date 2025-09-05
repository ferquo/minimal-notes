/// <reference types="vite/client" />

// Ambient declarations for the preload-exposed database API
declare global {
  interface Window {
    db: {
      getNotes: () => Promise<{
        id: number
        title: string
        content: string | null
        createdAt: string
        updatedAt: string
        position?: number
      }[]>
      createNote: () => Promise<{
        id: number
        title: string
        content: string | null
        createdAt: string
        updatedAt: string
        position?: number
      }>
      updateNoteTitle: (id: number, title: string) => Promise<void>
      updateNoteContent: (id: number, content: string) => Promise<void>
      deleteNote: (id: number) => Promise<void>
      reorderNotes: (ids: number[]) => Promise<void>
    }
    api: {
      saveImage: (
        noteId: string,
        data: ArrayBuffer | Uint8Array,
        mime: string
      ) => Promise<{
        url: string
        mime: string
        filename: string
        width?: number
        height?: number
      }>
      deleteNoteAttachments: (noteId: string) => Promise<boolean>
      gcNoteAttachments: (noteId: string) => Promise<{ deleted: number }>
    }
  }
}

export {}
