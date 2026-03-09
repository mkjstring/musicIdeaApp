import { useState } from 'react'
import MusicTempo from 'music-tempo'
import type { MusicIdea } from '../types'
import { AudioPlayer } from './AudioPlayer'
import { getAudioUrl, supabase } from '../lib/supabase'
import './IdeaCard.css'

interface IdeaCardProps {
  idea: MusicIdea
  creatorUsername?: string
  onEdit?: (idea: MusicIdea) => void
  onDelete?: (id: string) => void
  onUpdate?: (updated: MusicIdea) => void
}

export function IdeaCard({ idea, creatorUsername, onEdit, onDelete, onUpdate }: IdeaCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [detectingBpm, setDetectingBpm] = useState(false)

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      + ' · '
      + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const displayName = creatorUsername
    ?? (idea.user_email ? idea.user_email.split('@')[0] : null)

  const handleDetectBpm = async () => {
    setDetectingBpm(true)
    try {
      const url = getAudioUrl(idea.audio_path)
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioCtx = new AudioContext()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      const channelData = Array.from(audioBuffer.getChannelData(0))
      const mt = new MusicTempo(channelData)
      const estimated_bpm = Math.round(mt.tempo)
      await supabase.from('music_ideas').update({ estimated_bpm }).eq('id', idea.id)
      onUpdate?.({ ...idea, estimated_bpm })
    } finally {
      setDetectingBpm(false)
    }
  }

  const handleDownload = async () => {
    const url = getAudioUrl(idea.audio_path)
    const response = await fetch(url)
    const blob = await response.blob()
    const ext = blob.type.includes('mpeg') ? 'mp3' : blob.type.split('/')[1] || 'audio'
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${idea.title}.${ext}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="idea-card">
      <div className="idea-card-header">
        <h3 className="idea-title">{idea.title}</h3>
        <div className="idea-actions">
          <button className="action-button" onClick={handleDownload} aria-label="Download">
            <DownloadIcon />
          </button>
          {onEdit && (
            <button className="action-button" onClick={() => onEdit(idea)} aria-label="Edit">
              <EditIcon />
            </button>
          )}
          {onDelete && (
            <button
              className="action-button delete"
              onClick={() => setShowDeleteDialog(true)}
              aria-label="Delete"
            >
              <DeleteIcon />
            </button>
          )}
        </div>
      </div>

      {showDeleteDialog && (
        <div className="delete-dialog">
          <p>Delete this idea?</p>
          <div className="delete-dialog-actions">
            <button className="dialog-cancel" onClick={() => setShowDeleteDialog(false)}>Cancel</button>
            <button className="dialog-confirm" onClick={() => { onDelete?.(idea.id); setShowDeleteDialog(false) }}>Delete</button>
          </div>
        </div>
      )}

      {idea.description && (
        <p className="idea-description">{idea.description}</p>
      )}

      <div className="idea-meta">
        {idea.bpm && <span className="meta-tag">{idea.bpm} BPM</span>}
        {idea.estimated_bpm
          ? <span className="meta-tag meta-tag-estimated">est. {idea.estimated_bpm - 5}–{idea.estimated_bpm + 5} BPM</span>
          : <button className="detect-bpm-btn" onClick={handleDetectBpm} disabled={detectingBpm}>
              {detectingBpm ? 'Detecting…' : '~ BPM'}
            </button>
        }
        {idea.key && <span className="meta-tag">{idea.key}</span>}
        {displayName && <span className="meta-user">@{displayName}</span>}
        <span className="meta-date">{formatDateTime(idea.created_at)}</span>
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

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
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
