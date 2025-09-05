export interface Note {
  id: number
  title: string
  content: string | null
  createdAt: string
  updatedAt: string
  position?: number
}
