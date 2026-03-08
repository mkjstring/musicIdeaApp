import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, deleteAudioFile } from '../lib/supabase'
import type { MusicIdea, CreateMusicIdeaInput } from '../types'
import { IdeaCard } from '../components/IdeaCard'
import { FileUpload } from '../components/FileUpload'
import { IdeaForm } from '../components/IdeaForm'
import './Home.css'

const DEV_MOCK = import.meta.env.VITE_DEV_MOCK === 'true'
const SEED_IDEAS: MusicIdea[] = DEV_MOCK ? [
  {
    id: '1',
    user_id: 'dev-user-id',
    title: 'Funky Riff #1',
    description: 'Drop the sample.mp3 file into public/ to hear this play',
    tags: ['funk', 'riff'],
    bpm: 98,
    key: 'A minor',
    audio_path: '/sample.mp3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
] : []

export function Home() {
  const { user, signOut } = useAuth()
  const [ideas, setIdeas] = useState<MusicIdea[]>(SEED_IDEAS)
  const [loading, setLoading] = useState(!DEV_MOCK)
  const [showForm, setShowForm] = useState(false)
  const [pendingFile, setPendingFile] = useState<{ path: string; name: string } | null>(null)
  const [editingIdea, setEditingIdea] = useState<MusicIdea | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchIdeas = useCallback(async () => {
    if (DEV_MOCK || !user) return

    const { data, error } = await supabase
      .from('music_ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setError('Failed to load ideas')
      console.error(error)
    } else {
      setIdeas(data || [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchIdeas()
  }, [fetchIdeas])

  const handleUploadComplete = (path: string, name: string) => {
    setPendingFile({ path, name })
    setShowForm(true)
  }

  const handleCreateIdea = async (input: CreateMusicIdeaInput) => {
    if (!user || !pendingFile) return

    const { error } = await supabase.from('music_ideas').insert({
      ...input,
      user_id: user.id,
      audio_path: pendingFile.path,
    })

    if (error) {
      setError('Failed to create idea')
      console.error(error)
    } else {
      setShowForm(false)
      setPendingFile(null)
      fetchIdeas()
    }
  }

  const handleUpdateIdea = async (input: CreateMusicIdeaInput) => {
    if (!editingIdea) return

    const { error } = await supabase
      .from('music_ideas')
      .update(input)
      .eq('id', editingIdea.id)

    if (error) {
      setError('Failed to update idea')
      console.error(error)
    } else {
      setEditingIdea(null)
      fetchIdeas()
    }
  }

  const handleDeleteIdea = async (id: string) => {
    const idea = ideas.find(i => i.id === id)
    if (!idea) return

    // Delete from database
    const { error: dbError } = await supabase
      .from('music_ideas')
      .delete()
      .eq('id', id)

    if (dbError) {
      setError('Failed to delete idea')
      console.error(dbError)
      return
    }

    // Delete audio file
    await deleteAudioFile(idea.audio_path)
    
    setIdeas(ideas.filter(i => i.id !== id))
  }

  const handleCancelForm = async () => {
    // Clean up uploaded file if canceling
    if (pendingFile) {
      await deleteAudioFile(pendingFile.path)
    }
    setPendingFile(null)
    setShowForm(false)
    setEditingIdea(null)
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>🎸 Music Ideas</h1>
        <div className="header-actions">
          <span className="user-email">{user?.email}</span>
          <button className="sign-out-button" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="home-main">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {!showForm && !editingIdea && (
          <section className="upload-section">
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onError={err => setError(err.message)}
            />
          </section>
        )}

        {(showForm || editingIdea) && (
          <section className="form-section">
            <IdeaForm
              initialTitle={pendingFile?.name.replace(/\.[^/.]+$/, '') || editingIdea?.title}
              initialData={editingIdea || undefined}
              onSubmit={editingIdea ? handleUpdateIdea : handleCreateIdea}
              onCancel={handleCancelForm}
              isEditing={!!editingIdea}
            />
          </section>
        )}

        <section className="ideas-section">
          <h2>Your Ideas</h2>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : ideas.length === 0 ? (
            <div className="empty-state">
              <p>No ideas yet. Upload your first riff!</p>
            </div>
          ) : (
            <div className="ideas-grid">
              {ideas.map(idea => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onEdit={setEditingIdea}
                  onDelete={handleDeleteIdea}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
