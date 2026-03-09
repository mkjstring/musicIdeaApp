export interface MusicIdea {
  id: string
  user_id: string
  user_email?: string
  title: string
  description: string | null
  tags: string[]
  bpm: number | null
  estimated_bpm: number | null
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
  user_email?: string
}

export interface UpdateMusicIdeaInput {
  title?: string
  description?: string
  tags?: string[]
  bpm?: number
  estimated_bpm?: number | null
  key?: string
}

export interface Profile {
  id: string
  username: string | null
  email: string
  created_at: string
}

export interface FilterState {
  text: string
  dateFrom: string
  dateTo: string
  keyNote: string
  keyAccidental: string
  keyScale: string
  bpmMin: string
  bpmMax: string
  tags: string[]
  tagLogic: 'AND' | 'OR'
}
