import { useCallback, useState, useRef } from 'react'
import { uploadAudioFile } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import './FileUpload.css'

interface FileUploadProps {
  onUploadComplete: (filePath: string, fileName: string) => void
  onError?: (error: Error) => void
}

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/aac', 'audio/ogg']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export function FileUpload({ onUploadComplete, onError }: FileUploadProps) {
  const { user } = useAuth()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please upload an audio file (MP3, WAV, AAC, or OGG)'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 50MB'
    }
    return null
  }

  const handleUpload = useCallback(async (file: File) => {
    if (!user) {
      onError?.(new Error('You must be logged in to upload files'))
      return
    }

    const validationError = validateFile(file)
    if (validationError) {
      onError?.(new Error(validationError))
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    if (import.meta.env.VITE_DEV_MOCK === 'true') {
      const localUrl = URL.createObjectURL(file)
      setUploadProgress(100)
      onUploadComplete(localUrl, file.name)
      setIsUploading(false)
      setUploadProgress(0)
      return
    }

    // Simulate progress (Supabase doesn't have built-in progress)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90))
    }, 200)

    try {
      const { path, error } = await uploadAudioFile(file, user.id)

      clearInterval(progressInterval)

      if (error) {
        throw error
      }

      setUploadProgress(100)
      onUploadComplete(path, file.name)
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Upload failed'))
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [user, onUploadComplete, onError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleUpload(file)
    }
  }, [handleUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }, [handleUpload])

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      className={`file-upload ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="file-input"
      />

      {isUploading ? (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <span className="progress-text">Uploading... {uploadProgress}%</span>
        </div>
      ) : (
        <>
          <UploadIcon />
          <p className="upload-text">
            Drag & drop an audio file here, or click to browse
          </p>
          <p className="upload-hint">MP3, WAV, AAC, OGG • Max 50MB</p>
        </>
      )}
    </div>
  )
}

function UploadIcon() {
  return (
    <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
