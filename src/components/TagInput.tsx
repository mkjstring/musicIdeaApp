import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'

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
    <div
      className="relative bg-bg-input border border-border-dim rounded-lg cursor-text min-h-[42px] transition-colors duration-200 focus-within:border-accent"
      ref={containerRef}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex flex-wrap gap-1.5 px-2.5 py-1.5 items-center min-h-[42px]">
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-accent/20 border border-accent/40 rounded-md text-accent-soft text-[13px] py-0.5 pl-2 pr-1.5 whitespace-nowrap"
          >
            {tag}
            <button
              type="button"
              className="bg-transparent border-none text-accent-soft cursor-pointer text-[15px] leading-none p-0 opacity-70 transition-opacity duration-150 hover:opacity-100"
              onClick={e => { e.stopPropagation(); removeTag(tag) }}
              aria-label={`Remove ${tag}`}
            >×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="bg-transparent border-none text-text text-sm min-w-[80px] flex-1 outline-none py-0.5 placeholder:text-muted"
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
