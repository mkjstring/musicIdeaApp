import { useState } from 'react'
import MusicTempo from 'music-tempo'
import type { MusicIdea } from '../types'
import { AudioPlayer } from './AudioPlayer'
import { getAudioUrl, supabase } from '../lib/supabase'

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
    <div className="bg-bg-card rounded-2xl p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex justify-between items-start gap-3">
        <h3 className="text-text text-lg font-semibold m-0 flex-1">{idea.title}</h3>
        <div className="flex gap-2">
          <button
            className="idea-card-action-btn bg-transparent border-none text-text-dim cursor-pointer p-1 rounded-md transition-[color,background] duration-200 hover:bg-white/10 hover:text-text"
            onClick={handleDownload}
            aria-label="Download"
          >
            <DownloadIcon />
          </button>
          {onEdit && (
            <button
              className="idea-card-action-btn bg-transparent border-none text-text-dim cursor-pointer p-1 rounded-md transition-[color,background] duration-200 hover:bg-white/10 hover:text-text"
              onClick={() => onEdit(idea)}
              aria-label="Edit"
            >
              <EditIcon />
            </button>
          )}
          {onDelete && (
            <button
              className="idea-card-action-btn idea-card-action-btn--delete bg-transparent border-none text-text-dim cursor-pointer p-1 rounded-md transition-[color,background] duration-200 hover:bg-white/10 hover:text-text hover:text-red-soft"
              onClick={() => setShowDeleteDialog(true)}
              aria-label="Delete"
            >
              <DeleteIcon />
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="bg-bg-input border border-red-soft rounded-[10px] px-4 py-[14px] flex items-center justify-between gap-3">
          <p className="text-text text-sm m-0">Delete this idea?</p>
          <div className="flex gap-2 shrink-0">
            <button
              className="bg-transparent border border-muted rounded-md text-text-soft cursor-pointer text-[13px] px-[14px] py-[6px] transition-[border-color,color] duration-200 hover:border-text-dim hover:text-text"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </button>
            <button
              className="bg-red-soft border-none rounded-md text-bg-input cursor-pointer text-[13px] font-semibold px-[14px] py-[6px] transition-opacity duration-200 hover:opacity-85"
              onClick={() => { onDelete?.(idea.id); setShowDeleteDialog(false) }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Description */}
      {idea.description && (
        <p className="text-text-soft text-sm leading-[1.5] m-0">{idea.description}</p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        {idea.bpm && (
          <span className="bg-accent/20 text-accent text-xs font-medium px-2 py-1 rounded">
            {idea.bpm} BPM
          </span>
        )}
        {idea.estimated_bpm
          ? (
            <span className="bg-[rgba(217,119,6,0.12)] text-[#d97706] border border-[rgba(217,119,6,0.3)] text-xs font-medium px-2 py-1 rounded">
              est. {idea.estimated_bpm - 5}–{idea.estimated_bpm + 5} BPM
            </span>
          )
          : (
            <button
              className="detect-bpm-btn-inline bg-transparent border border-dashed border-muted rounded text-text-dim cursor-pointer text-xs font-medium px-2 py-[3px] transition-[border-color,color] duration-200 disabled:cursor-default disabled:opacity-60"
              onClick={handleDetectBpm}
              disabled={detectingBpm}
            >
              {detectingBpm ? 'Detecting…' : '~ BPM'}
            </button>
          )
        }
        {idea.key && (
          <span className="bg-accent/20 text-accent text-xs font-medium px-2 py-1 rounded">
            {idea.key}
          </span>
        )}
        {displayName && (
          <span className="text-accent-soft text-xs font-medium">@{displayName}</span>
        )}
        <span className="text-text-dim text-xs ml-auto">{formatDateTime(idea.created_at)}</span>
      </div>

      {/* Tags */}
      {idea.tags.length > 0 && (
        <div className="flex flex-wrap gap-[6px]">
          {idea.tags.map(tag => (
            <span key={tag} className="bg-border-dim text-[#cbd5e0] text-xs px-[10px] py-1 rounded-xl">
              {tag}
            </span>
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
