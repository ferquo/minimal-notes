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
      }[]>
      createNote: () => Promise<{
        id: number
        title: string
        content: string | null
        createdAt: string
        updatedAt: string
      }>
      updateNoteTitle: (id: number, title: string) => Promise<void>
      updateNoteContent: (id: number, content: string) => Promise<void>
      deleteNote: (id: number) => Promise<void>
    }
  }
}

export {}
