import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from '../contexts/ProfileContext'
import { supabase, deleteAudioFile } from '../lib/supabase'
import type { MusicIdea, CreateMusicIdeaInput, FilterState } from '../types'
import { IdeaCard } from '../components/IdeaCard'
import { FileUpload } from '../components/FileUpload'
import { IdeaForm } from '../components/IdeaForm'
import { SearchBar } from '../components/SearchBar'
import './Home.css'

const DEV_MOCK = import.meta.env.VITE_DEV_MOCK === 'true'
const SEED_IDEAS: MusicIdea[] = DEV_MOCK ? [
  {
    id: '1',
    user_id: 'dev-user-id',
    user_email: 'dev@local.test',
    title: 'Funky Riff #1',
    description: 'Drop any audio file into the upload area to test the player',
    tags: ['funk', 'riff', 'guitar'],
    bpm: 98,
    estimated_bpm: null,
    key: 'A minor',
    audio_path: '/sample.mp3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
] : []

const EMPTY_FILTERS: FilterState = {
  text: '', dateFrom: '', dateTo: '',
  keyNote: '', keyAccidental: '', keyScale: '',
  bpmMin: '', bpmMax: '', tags: [], tagLogic: 'OR',
}

export function Home() {
  const { user, signOut } = useAuth()
  const { profile, updateUsername } = useProfile()
  const [ideas, setIdeas] = useState<MusicIdea[]>(SEED_IDEAS)
  const [loading, setLoading] = useState(!DEV_MOCK)
  const [showForm, setShowForm] = useState(false)
  const [pendingFile, setPendingFile] = useState<{ path: string; name: string } | null>(null)
  const [editingIdea, setEditingIdea] = useState<MusicIdea | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [showUsernameEdit, setShowUsernameEdit] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')

  const fetchIdeas = useCallback(async () => {
    if (DEV_MOCK || !user) return
    const { data, error } = await supabase
      .from('music_ideas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) { setError('Failed to load ideas'); console.error(error) }
    else setIdeas(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchIdeas() }, [fetchIdeas])

  // Derived: unique tags from all ideas
  const availableTags = useMemo(() =>
    [...new Set(ideas.flatMap(i => i.tags))].sort()
  , [ideas])

  // Client-side filtering
  const filteredIdeas = useMemo(() => ideas.filter(idea => {
    if (filters.text) {
      const q = filters.text.toLowerCase()
      const matches = idea.title.toLowerCase().includes(q)
        || idea.description?.toLowerCase().includes(q)
        || idea.tags.some(t => t.toLowerCase().includes(q))
      if (!matches) return false
    }
    if (filters.dateFrom && idea.created_at < filters.dateFrom) return false
    if (filters.dateTo && idea.created_at > filters.dateTo + 'T23:59:59') return false
    if (filters.keyNote) {
      const composed = filters.keyNote + filters.keyAccidental + (filters.keyScale ? ' ' + filters.keyScale : '')
      if (!idea.key?.startsWith(composed)) return false
    }
    if (filters.bpmMin && (idea.bpm ?? 0) < Number(filters.bpmMin)) return false
    if (filters.bpmMax && (idea.bpm ?? Infinity) > Number(filters.bpmMax)) return false
    if (filters.tags.length > 0) {
      if (filters.tagLogic === 'AND') return filters.tags.every(t => idea.tags.includes(t))
      else return filters.tags.some(t => idea.tags.includes(t))
    }
    return true
  }), [ideas, filters])

  const handleUploadComplete = (path: string, name: string) => {
    setPendingFile({ path, name })
    setShowForm(true)
  }

  const handleCreateIdea = async (input: CreateMusicIdeaInput) => {
    if (!user || !pendingFile) return
    if (DEV_MOCK) {
      const newIdea: MusicIdea = {
        ...input,
        id: String(Date.now()),
        user_id: user.id,
        user_email: user.email,
        audio_path: pendingFile.path,
        description: input.description ?? null,
        tags: input.tags ?? [],
        bpm: input.bpm ?? null,
        key: input.key ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setIdeas(prev => [newIdea, ...prev])
      setShowForm(false)
      setPendingFile(null)
      return
    }
    const { error } = await supabase.from('music_ideas').insert({
      ...input,
      user_id: user.id,
      user_email: user.email,
      audio_path: pendingFile.path,
    })
    if (error) { setError('Failed to create idea'); console.error(error) }
    else { setShowForm(false); setPendingFile(null); fetchIdeas() }
  }

  const handleUpdateIdea = async (input: CreateMusicIdeaInput) => {
    if (!editingIdea) return
    if (DEV_MOCK) {
      setIdeas(prev => prev.map(i => i.id === editingIdea.id
        ? { ...i, ...input, description: input.description ?? null, tags: input.tags ?? [], bpm: input.bpm ?? null, key: input.key ?? null, updated_at: new Date().toISOString() }
        : i
      ))
      setEditingIdea(null)
      return
    }
    const { error } = await supabase.from('music_ideas').update(input).eq('id', editingIdea.id)
    if (error) { setError('Failed to update idea'); console.error(error) }
    else { setEditingIdea(null); fetchIdeas() }
  }

  const handleDeleteIdea = async (id: string) => {
    const idea = ideas.find(i => i.id === id)
    if (!idea) return
    if (DEV_MOCK) { setIdeas(prev => prev.filter(i => i.id !== id)); return }
    const { error: dbError } = await supabase.from('music_ideas').delete().eq('id', id)
    if (dbError) { setError('Failed to delete idea'); console.error(dbError); return }
    await deleteAudioFile(idea.audio_path)
    setIdeas(ideas.filter(i => i.id !== id))
  }

  const handleCancelForm = async () => {
    if (pendingFile) await deleteAudioFile(pendingFile.path)
    setPendingFile(null)
    setShowForm(false)
    setEditingIdea(null)
  }

  const handleSaveUsername = async () => {
    if (!usernameInput.trim()) return
    const { error } = await updateUsername(usernameInput.trim())
    if (error) setError(error)
    else setShowUsernameEdit(false)
  }

  const displayName = profile?.username ?? (user?.email?.split('@')[0] ?? '')

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>Music Ideas</h1>
        <nav className="header-nav">
          <Link to="/guitar-theory-lab" className="nav-link">Guitar Theory Lab</Link>
        </nav>
        <div className="header-actions">
          <button className="user-display" onClick={() => { setUsernameInput(profile?.username ?? ''); setShowUsernameEdit(true) }}>
            @{displayName} ⚙
          </button>
          <button className="sign-out-button" onClick={signOut}>Sign Out</button>
        </div>
      </header>

      {showUsernameEdit && (
        <div className="username-modal-backdrop" onClick={() => setShowUsernameEdit(false)}>
          <div className="username-modal" onClick={e => e.stopPropagation()}>
            <h3>Update Username</h3>
            <input
              type="text"
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value)}
              placeholder="your-username"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSaveUsername()}
            />
            <div className="username-modal-actions">
              <button onClick={() => setShowUsernameEdit(false)}>Cancel</button>
              <button className="save-btn" onClick={handleSaveUsername}>Save</button>
            </div>
          </div>
        </div>
      )}

      <main className="home-main">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {!showForm && !editingIdea && (
          <section className="upload-section">
            <FileUpload onUploadComplete={handleUploadComplete} onError={err => setError(err.message)} />
          </section>
        )}

        {(showForm || editingIdea) && (
          <section className="form-section">
            <IdeaForm
              initialTitle={pendingFile?.name.replace(/\.[^/.]+$/, '') || editingIdea?.title}
              initialData={editingIdea || undefined}
              availableTags={availableTags}
              onSubmit={editingIdea ? handleUpdateIdea : handleCreateIdea}
              onCancel={handleCancelForm}
              isEditing={!!editingIdea}
            />
          </section>
        )}

        <section className="ideas-section">
          <div className="ideas-section-header">
            <h2>Your Ideas</h2>
            {filteredIdeas.length !== ideas.length && (
              <span className="filter-count">{filteredIdeas.length} of {ideas.length}</span>
            )}
          </div>

          <SearchBar availableTags={availableTags} onFilterChange={setFilters} />

          {loading ? (
            <div className="loading">Loading...</div>
          ) : filteredIdeas.length === 0 ? (
            <div className="empty-state">
              <p>{ideas.length === 0 ? 'No ideas yet. Upload your first riff!' : 'No ideas match your filters.'}</p>
            </div>
          ) : (
            <div className="ideas-grid">
              {filteredIdeas.map(idea => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  creatorUsername={profile?.username ?? undefined}
                  onEdit={setEditingIdea}
                  onDelete={handleDeleteIdea}
                  onUpdate={updated => setIdeas(prev => prev.map(i => i.id === updated.id ? updated : i))}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
