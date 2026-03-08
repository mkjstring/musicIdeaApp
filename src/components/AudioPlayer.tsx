import { useRef, useEffect, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import './AudioPlayer.css'

interface AudioPlayerProps {
  url: string
  title?: string
  onReady?: () => void
}

export function AudioPlayer({ url, title, onReady }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current) return

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4a5568',
      progressColor: '#667eea',
      cursorColor: '#667eea',
      barWidth: 2,
      barRadius: 3,
      barGap: 2,
      height: 60,
      normalize: true,
    })

    wavesurferRef.current = wavesurfer

    wavesurfer.load(url)

    wavesurfer.on('ready', () => {
      setDuration(wavesurfer.getDuration())
      setIsLoading(false)
      onReady?.()
    })

    wavesurfer.on('audioprocess', () => {
      setCurrentTime(wavesurfer.getCurrentTime())
    })

    wavesurfer.on('play', () => setIsPlaying(true))
    wavesurfer.on('pause', () => setIsPlaying(false))
    wavesurfer.on('finish', () => setIsPlaying(false))

    return () => {
      wavesurfer.destroy()
    }
  }, [url, onReady])

  const togglePlayPause = useCallback(() => {
    wavesurferRef.current?.playPause()
  }, [])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="audio-player">
      {title && <div className="audio-player-title">{title}</div>}
      
      <div className="audio-player-controls">
        <button
          className="play-button"
          onClick={togglePlayPause}
          disabled={isLoading}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <span className="loading-spinner" />
          ) : isPlaying ? (
            <PauseIcon />
          ) : (
            <PlayIcon />
          )}
        </button>

        <div className="waveform-container" ref={containerRef} />

        <div className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  )
}
