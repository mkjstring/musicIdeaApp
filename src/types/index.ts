export interface MusicIdea {
  id: string
  user_id: string
  title: string
  description: string | null
  tags: string[]
  bpm: number | null
  key: string | null
  audio_path: string
  created_at: string
  updated_at: string
}

export interface CreateMusicIdeaInput {
  title: string
  description?: string
  tags?: string[]
  bpm?: number
  key?: string
  audio_path: string
}

export interface UpdateMusicIdeaInput {
  title?: string
  description?: string
  tags?: string[]
  bpm?: number
  key?: string
}
