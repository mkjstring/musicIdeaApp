import { useState, type FormEvent } from 'react'
import type { CreateMusicIdeaInput, MusicIdea } from '../types'
import './IdeaForm.css'

interface IdeaFormProps {
  initialTitle?: string
  initialData?: MusicIdea
  onSubmit: (data: CreateMusicIdeaInput) => void
  onCancel: () => void
  isEditing?: boolean
}

const MUSIC_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'
]

export function IdeaForm({ initialTitle, initialData, onSubmit, onCancel, isEditing }: IdeaFormProps) {
  const [title, setTitle] = useState(initialTitle || initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [bpm, setBpm] = useState(initialData?.bpm?.toString() || '')
  const [key, setKey] = useState(initialData?.key || '')
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(', ') || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    const data: CreateMusicIdeaInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      bpm: bpm ? parseInt(bpm, 10) : undefined,
      key: key || undefined,
      tags,
      audio_path: initialData?.audio_path || '', // Will be set by parent for new ideas
    }

    await onSubmit(data)
    setSubmitting(false)
  }

  return (
    <form className="idea-form" onSubmit={handleSubmit}>
      <h3 className="form-title">{isEditing ? 'Edit Idea' : 'New Idea'}</h3>

      <div className="form-row">
        <div className="form-group flex-1">
          <label htmlFor="title">Title *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Funky riff in Am"
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group flex-1">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add notes about this idea..."
            rows={3}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="bpm">BPM</label>
          <input
            id="bpm"
            type="number"
            value={bpm}
            onChange={e => setBpm(e.target.value)}
            placeholder="120"
            min="20"
            max="300"
          />
        </div>

        <div className="form-group">
          <label htmlFor="key">Key</label>
          <select id="key" value={key} onChange={e => setKey(e.target.value)}>
            <option value="">Select...</option>
            {MUSIC_KEYS.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group flex-1">
          <label htmlFor="tags">Tags</label>
          <input
            id="tags"
            type="text"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="rock, guitar, verse (comma separated)"
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="submit-button" disabled={submitting || !title.trim()}>
          {submitting ? 'Saving...' : isEditing ? 'Update' : 'Save Idea'}
        </button>
      </div>
    </form>
  )
}
