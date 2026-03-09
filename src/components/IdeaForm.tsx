import { useState, type FormEvent } from 'react'
import type { CreateMusicIdeaInput, MusicIdea } from '../types'
import { TagInput } from './TagInput'
import './IdeaForm.css'

interface IdeaFormProps {
  initialTitle?: string
  initialData?: MusicIdea
  availableTags: string[]
  onSubmit: (data: CreateMusicIdeaInput) => void
  onCancel: () => void
  isEditing?: boolean
}

const NOTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const ACCIDENTALS = [
  { value: '', label: '—' },
  { value: '♭', label: '♭' },
  { value: '♯', label: '♯' },
]
const SCALES = ['major', 'minor', 'other']

function parseKey(raw: string): { note: string; accidental: string; scale: string } {
  if (!raw) return { note: '', accidental: '', scale: '' }
  const old = raw.match(/^([A-G])([#b]?)([m]?)$/)
  if (old) {
    return {
      note: old[1],
      accidental: old[2] === '#' ? '♯' : old[2] === 'b' ? '♭' : '',
      scale: old[3] === 'm' ? 'minor' : 'major',
    }
  }
  const newer = raw.match(/^([A-G])([♯♭]?)(?:\s+(.+))?$/)
  if (newer) {
    return { note: newer[1], accidental: newer[2] || '', scale: newer[3] || '' }
  }
  return { note: '', accidental: '', scale: '' }
}

function composeKey(note: string, accidental: string, scale: string): string {
  if (!note) return ''
  return `${note}${accidental}${scale ? ' ' + scale : ''}`
}

export function IdeaForm({ initialTitle, initialData, availableTags, onSubmit, onCancel, isEditing }: IdeaFormProps) {
  const [title, setTitle] = useState(initialTitle || initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [bpm, setBpm] = useState(initialData?.bpm?.toString() || '')
  const parsedKey = parseKey(initialData?.key || '')
  const [keyNote, setKeyNote] = useState(parsedKey.note)
  const [keyAccidental, setKeyAccidental] = useState(parsedKey.accidental)
  const [keyScale, setKeyScale] = useState(parsedKey.scale)
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? [])
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const data: CreateMusicIdeaInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      bpm: bpm ? parseInt(bpm, 10) : undefined,
      key: composeKey(keyNote, keyAccidental, keyScale) || undefined,
      tags,
      audio_path: initialData?.audio_path || '',
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
          <label>Key</label>
          <div className="key-selects">
            <select value={keyNote} onChange={e => setKeyNote(e.target.value)} aria-label="Note">
              <option value="">—</option>
              {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={keyAccidental} onChange={e => setKeyAccidental(e.target.value)} aria-label="Accidental" disabled={!keyNote}>
              {ACCIDENTALS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <select value={keyScale} onChange={e => setKeyScale(e.target.value)} aria-label="Scale" disabled={!keyNote}>
              <option value="">—</option>
              {SCALES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group flex-1">
          <label>Tags</label>
          <TagInput value={tags} onChange={setTags} suggestions={availableTags} />
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
