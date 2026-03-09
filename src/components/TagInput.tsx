import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import './TagInput.css'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
  placeholder?: string
}

export function TagInput({ value, onChange, suggestions, placeholder = 'Add tags...' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = suggestions.filter(
    s => s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s)
  )

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInputValue('')
    setShowDropdown(false)
    inputRef.current?.focus()
  }, [value, onChange])

  const removeTag = useCallback((tag: string) => {
    onChange(value.filter(t => t !== tag))
  }, [value, onChange])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="tag-input-container" ref={containerRef} onClick={() => inputRef.current?.focus()}>
      <div className="tag-input-inner">
        {value.map(tag => (
          <span key={tag} className="tag-pill">
            {tag}
            <button
              type="button"
              className="tag-pill-remove"
              onClick={e => { e.stopPropagation(); removeTag(tag) }}
              aria-label={`Remove ${tag}`}
            >×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="tag-input-field"
          value={inputValue}
          placeholder={value.length === 0 ? placeholder : ''}
          onChange={e => { setInputValue(e.target.value); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {showDropdown && filtered.length > 0 && (
        <ul className="tag-dropdown">
          {filtered.map(s => (
            <li key={s} onMouseDown={e => { e.preventDefault(); addTag(s) }}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
