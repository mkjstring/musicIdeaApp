export interface Database {
  public: {
    Tables: {
      music_ideas: {
        Row: {
          id: string
          user_id: string
          user_email: string | null
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
          user_email?: string | null
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
          user_email?: string | null
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
      profiles: {
        Row: {
          id: string
          username: string | null
          email: string
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          email: string
          created_at?: string
        }
        Update: {
          username?: string | null
          email?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
