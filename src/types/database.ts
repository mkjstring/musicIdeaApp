export interface Database {
  public: {
    Tables: {
      music_ideas: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          tags?: string[]
          bpm?: number | null
          key?: string | null
          audio_path: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          tags?: string[]
          bpm?: number | null
          key?: string | null
          audio_path?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
