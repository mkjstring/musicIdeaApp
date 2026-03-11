import { useRef, useEffect, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'

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
    <div className="bg-bg-input rounded-xl p-4 w-full">
      {title && (
        <div className="text-text text-sm font-medium mb-3 overflow-hidden text-ellipsis whitespace-nowrap">
          {title}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          className="bg-accent border-none rounded-full text-white cursor-pointer flex items-center justify-center h-11 w-11 shrink-0 transition-[background,transform] duration-200 hover:enabled:bg-accent-dim hover:enabled:scale-105 disabled:bg-muted disabled:cursor-not-allowed"
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

        <div className="flex-1 min-w-0" ref={containerRef} />

        <div className="text-text-soft text-xs font-mono shrink-0 min-w-[85px] text-right">
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
