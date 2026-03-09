import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { useAuth } from './AuthContext'

interface ProfileContextType {
  profile: Profile | null
  loading: boolean
  updateUsername: (username: string) => Promise<{ error: string | null }>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

const DEV_MOCK = import.meta.env.VITE_DEV_MOCK === 'true'
const mockProfile: Profile = {
  id: 'dev-user-id',
  username: 'dev',
  email: 'dev@local.test',
  created_at: new Date().toISOString(),
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(DEV_MOCK ? mockProfile : null)
  const [loading, setLoading] = useState(!DEV_MOCK)

  useEffect(() => {
    if (DEV_MOCK || !user) return

    const fetchOrCreateProfile = async () => {
      // Try to fetch existing profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setLoading(false)
        return
      }

      // Create profile on first login
      if (error?.code === 'PGRST116') {
        const { data: created } = await supabase
          .from('profiles')
          .insert({ id: user.id, email: user.email ?? '', username: null })
          .select()
          .single()
        setProfile(created)
      }

      setLoading(false)
    }

    fetchOrCreateProfile()
  }, [user])

  const updateUsername = useCallback(async (username: string): Promise<{ error: string | null }> => {
    if (DEV_MOCK) {
      setProfile(prev => prev ? { ...prev, username } : prev)
      return { error: null }
    }

    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id)

    if (error) return { error: error.message }

    setProfile(prev => prev ? { ...prev, username } : prev)
    return { error: null }
  }, [user])

  return (
    <ProfileContext.Provider value={{ profile, loading, updateUsername }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
