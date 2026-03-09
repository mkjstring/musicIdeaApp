import { useState, useCallback } from 'react'
import type { FilterState } from '../types'
import { TagInput } from './TagInput'
import './SearchBar.css'

const NOTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const ACCIDENTALS = [{ value: '', label: '—' }, { value: '♭', label: '♭' }, { value: '♯', label: '♯' }]
const SCALES = ['major', 'minor', 'other']

const EMPTY_FILTERS: FilterState = {
  text: '',
  dateFrom: '',
  dateTo: '',
  keyNote: '',
  keyAccidental: '',
  keyScale: '',
  bpmMin: '',
  bpmMax: '',
  tags: [],
  tagLogic: 'OR',
}

interface SearchBarProps {
  availableTags: string[]
  onFilterChange: (filters: FilterState) => void
}

export function SearchBar({ availableTags, onFilterChange }: SearchBarProps) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [expanded, setExpanded] = useState(false)

  const update = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value }
      onFilterChange(next)
      return next
    })
  }, [onFilterChange])

  const clearAll = () => {
    setFilters(EMPTY_FILTERS)
    onFilterChange(EMPTY_FILTERS)
  }

  const hasActiveFilters = filters.text || filters.dateFrom || filters.dateTo ||
    filters.keyNote || filters.bpmMin || filters.bpmMax || filters.tags.length > 0

  return (
    <div className="search-bar">
      <div className="search-bar-top">
        <div className="search-input-wrap">
          <SearchIcon />
          <input
            className="search-text-input"
            type="text"
            value={filters.text}
            onChange={e => update('text', e.target.value)}
            placeholder="Search ideas..."
          />
          {filters.text && (
            <button className="search-clear-btn" onClick={() => update('text', '')} aria-label="Clear search">×</button>
          )}
        </div>
        <button
          className={`advanced-toggle ${expanded ? 'active' : ''}`}
          onClick={() => setExpanded(v => !v)}
        >
          Advanced {expanded ? '▲' : '▼'}
          {hasActiveFilters && !expanded && <span className="filter-dot" />}
        </button>
      </div>

      {expanded && (
        <div className="search-advanced">
          <div className="search-row">
            <div className="search-group">
              <label>Date from</label>
              <input type="date" value={filters.dateFrom} onChange={e => update('dateFrom', e.target.value)} />
            </div>
            <div className="search-group">
              <label>Date to</label>
              <input type="date" value={filters.dateTo} onChange={e => update('dateTo', e.target.value)} />
            </div>
            <div className="search-group">
              <label>BPM min</label>
              <input type="number" value={filters.bpmMin} onChange={e => update('bpmMin', e.target.value)} placeholder="—" min="20" max="300" />
            </div>
            <div className="search-group">
              <label>BPM max</label>
              <input type="number" value={filters.bpmMax} onChange={e => update('bpmMax', e.target.value)} placeholder="—" min="20" max="300" />
            </div>
          </div>

          <div className="search-row">
            <div className="search-group">
              <label>Key</label>
              <div className="key-selects">
                <select id="search-key-note" value={filters.keyNote} onChange={e => update('keyNote', e.target.value)} aria-label="Note">
                  <option value="">—</option>
                  {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <select id="search-key-accidental" value={filters.keyAccidental} onChange={e => update('keyAccidental', e.target.value)} aria-label="Accidental" disabled={!filters.keyNote}>
                  {ACCIDENTALS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
                <select id="search-key-scale" value={filters.keyScale} onChange={e => update('keyScale', e.target.value)} aria-label="Scale" disabled={!filters.keyNote}>
                  <option value="">—</option>
                  {SCALES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="search-row search-row-tags">
            <div className="search-group flex-1">
              <label>Tags</label>
              <TagInput
                value={filters.tags}
                onChange={tags => update('tags', tags)}
                suggestions={availableTags}
                placeholder="Filter by tags..."
              />
            </div>
            {filters.tags.length >= 2 && (
              <div className="search-group tag-logic-group">
                <label>Logic</label>
                <div className="tag-logic-toggle">
                  <button
                    type="button"
                    className={filters.tagLogic === 'OR' ? 'active' : ''}
                    onClick={() => update('tagLogic', 'OR')}
                  >OR</button>
                  <button
                    type="button"
                    className={filters.tagLogic === 'AND' ? 'active' : ''}
                    onClick={() => update('tagLogic', 'AND')}
                  >AND</button>
                </div>
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <div className="search-row search-row-clear">
              <button className="clear-all-btn" onClick={clearAll}>Clear all filters</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="search-icon">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
