import { useState, type FormEvent } from 'react'
import type { CreateMusicIdeaInput, MusicIdea } from '../types'
import { TagInput } from './TagInput'

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

  /* Shared classes for form inputs/selects/textareas */
  const inputCls =
    'bg-bg-input border border-border-dim rounded-lg text-text text-sm px-3 py-[10px] transition-[border-color] duration-200 focus:border-accent focus:outline-none idea-form-field'

  return (
    <form className="bg-bg-card rounded-2xl p-6" onSubmit={handleSubmit}>
      <h3 className="text-text text-xl m-0 mb-5">{isEditing ? 'Edit Idea' : 'New Idea'}</h3>

      {/* Title row */}
      <div className="idea-form-row flex gap-4 mb-4">
        <div className="flex flex-col gap-[6px] flex-1">
          <label htmlFor="title" className="text-text-soft text-sm font-medium">Title *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Funky riff in Am"
            required
            className={inputCls}
          />
        </div>
      </div>

      {/* Description row */}
      <div className="idea-form-row flex gap-4 mb-4">
        <div className="flex flex-col gap-[6px] flex-1">
          <label htmlFor="description" className="text-text-soft text-sm font-medium">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add notes about this idea..."
            rows={3}
            className={`${inputCls} font-[inherit] resize-y`}
          />
        </div>
      </div>

      {/* BPM + Key row */}
      <div className="idea-form-row flex gap-4 mb-4">
        {/* BPM */}
        <div className="flex flex-col gap-[6px]">
          <label htmlFor="bpm" className="text-text-soft text-sm font-medium">BPM</label>
          <input
            id="bpm"
            type="number"
            value={bpm}
            onChange={e => setBpm(e.target.value)}
            placeholder="120"
            min="20"
            max="300"
            className={`${inputCls} w-[100px]`}
          />
          {initialData?.estimated_bpm && (
            <span className="text-[#d97706] text-[11px] font-medium">
              est. {initialData.estimated_bpm - 5}–{initialData.estimated_bpm + 5} BPM
            </span>
          )}
        </div>

        {/* Key */}
        <div className="flex flex-col gap-[6px]">
          <label className="text-text-soft text-sm font-medium">Key</label>
          <div className="flex gap-[6px]">
            <select
              id="idea-key-note"
              value={keyNote}
              onChange={e => setKeyNote(e.target.value)}
              aria-label="Note"
              className={`${inputCls} min-w-[120px]`}
            >
              <option value="">—</option>
              {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select
              id="idea-key-accidental"
              value={keyAccidental}
              onChange={e => setKeyAccidental(e.target.value)}
              aria-label="Accidental"
              disabled={!keyNote}
              className={`${inputCls} min-w-0 flex-1 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {ACCIDENTALS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <select
              id="idea-key-scale"
              value={keyScale}
              onChange={e => setKeyScale(e.target.value)}
              aria-label="Scale"
              disabled={!keyNote}
              className={`${inputCls} min-w-0 flex-1 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <option value="">—</option>
              {SCALES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tags row */}
      <div className="idea-form-row flex gap-4 mb-4">
        <div className="flex flex-col gap-[6px] flex-1">
          <label className="text-text-soft text-sm font-medium">Tags</label>
          <TagInput value={tags} onChange={setTags} suggestions={availableTags} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          className="bg-transparent border border-muted rounded-lg text-text-soft cursor-pointer text-sm px-5 py-[10px] transition-[border-color,color] duration-200 hover:border-text-dim hover:text-text"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="bg-[linear-gradient(135deg,#667eea,#764ba2)] border-none rounded-lg text-white cursor-pointer text-sm font-semibold px-6 py-[10px] transition-opacity duration-200 enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Saving...' : isEditing ? 'Update' : 'Save Idea'}
        </button>
      </div>
    </form>
  )
}
