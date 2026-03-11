import { useCallback, useState, useRef } from 'react'
import { uploadAudioFile } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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
      className={[
        'bg-bg-input border-2 border-dashed rounded-xl cursor-pointer flex flex-col items-center justify-center py-10 px-5 text-center transition-[border-color,background] duration-200',
        isDragging
          ? 'bg-accent/10 border-accent'
          : 'border-muted hover:border-accent',
        isUploading ? 'cursor-default pointer-events-none' : '',
      ].join(' ')}
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
        className="hidden"
      />

      {isUploading ? (
        <div className="w-full max-w-[300px]">
          <div className="bg-border-dim rounded h-2 overflow-hidden w-full">
            <div
              className="upload-progress-fill h-full transition-[width] duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="text-text-soft block text-sm mt-3">
            Uploading... {uploadProgress}%
          </span>
        </div>
      ) : (
        <>
          <UploadIcon />
          <p className="text-text text-base m-0 mb-2">
            Drag & drop an audio file here, or click to browse
          </p>
          <p className="text-text-dim text-sm m-0">MP3, WAV, AAC, OGG • Max 50MB</p>
        </>
      )}
    </div>
  )
}

function UploadIcon() {
  return (
    <svg
      className="text-accent h-12 w-12 mb-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
