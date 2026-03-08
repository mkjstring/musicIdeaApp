import { useState } from 'react'
import type { MusicIdea } from '../types'
import { AudioPlayer } from './AudioPlayer'
import { getAudioUrl } from '../lib/supabase'
import './IdeaCard.css'

interface IdeaCardProps {
  idea: MusicIdea
  onEdit?: (idea: MusicIdea) => void
  onDelete?: (id: string) => void
}

export function IdeaCard({ idea, onEdit, onDelete }: IdeaCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete?.(idea.id)
    } else {
      setShowDeleteConfirm(true)
      setTimeout(() => setShowDeleteConfirm(false), 3000)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="idea-card">
      <div className="idea-card-header">
        <h3 className="idea-title">{idea.title}</h3>
        <div className="idea-actions">
          {onEdit && (
            <button className="action-button" onClick={() => onEdit(idea)} aria-label="Edit">
              <EditIcon />
            </button>
          )}
          {onDelete && (
            <button
              className={`action-button delete ${showDeleteConfirm ? 'confirm' : ''}`}
              onClick={handleDelete}
              aria-label={showDeleteConfirm ? 'Confirm delete' : 'Delete'}
            >
              <DeleteIcon />
            </button>
          )}
        </div>
      </div>

      {idea.description && (
        <p className="idea-description">{idea.description}</p>
      )}

      <div className="idea-meta">
        {idea.bpm && <span className="meta-tag">{idea.bpm} BPM</span>}
        {idea.key && <span className="meta-tag">{idea.key}</span>}
        <span className="meta-date">{formatDate(idea.created_at)}</span>
      </div>

      {idea.tags.length > 0 && (
        <div className="idea-tags">
          {idea.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}

      <AudioPlayer url={getAudioUrl(idea.audio_path)} />
    </div>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
