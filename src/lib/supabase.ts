import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  if (!import.meta.env.VITE_DEV_MOCK) {
    throw new Error('Missing Supabase environment variables')
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Storage bucket name for audio files
export const AUDIO_BUCKET = 'audio-files'

// Helper to get a public URL for an audio file
export const getAudioUrl = (filePath: string): string => {
  if (filePath.startsWith('/') || filePath.startsWith('http') || filePath.startsWith('blob:')) return filePath
  const { data } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

// Helper to upload an audio file
export const uploadAudioFile = async (
  file: File,
  userId: string
): Promise<{ path: string; error: Error | null }> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`

  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    return { path: '', error }
  }

  return { path: fileName, error: null }
}

// Helper to delete an audio file
export const deleteAudioFile = async (filePath: string): Promise<Error | null> => {
  const { error } = await supabase.storage.from(AUDIO_BUCKET).remove([filePath])
  return error
}
