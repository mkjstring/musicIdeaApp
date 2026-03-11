import { useState, useCallback } from 'react'
import type { FilterState } from '../types'
import { TagInput } from './TagInput'

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
    <div className="bg-bg-card rounded-xl p-3">
      <div className="flex gap-[10px] items-center">
        <div className="flex items-center bg-bg-input border border-border-dim rounded-lg flex-1 gap-2 px-3 py-2 transition-colors duration-200 focus-within:border-accent">
          <SearchIcon />
          <input
            className="bg-transparent border-none text-text flex-1 text-sm outline-none placeholder:text-muted"
            type="text"
            value={filters.text}
            onChange={e => update('text', e.target.value)}
            placeholder="Search ideas..."
          />
          {filters.text && (
            <button className="bg-transparent border-none text-text-dim cursor-pointer text-lg leading-none p-0 hover:text-text" onClick={() => update('text', '')} aria-label="Clear search">×</button>
          )}
        </div>
        <button
          className={`bg-transparent border border-border-dim rounded-lg text-text-soft cursor-pointer text-[13px] px-[14px] py-2 relative transition-[border-color,color] duration-200 whitespace-nowrap hover:border-accent hover:text-text ${expanded ? '!border-accent !text-text' : ''}`}
          onClick={() => setExpanded(v => !v)}
        >
          Advanced {expanded ? '▲' : '▼'}
          {hasActiveFilters && !expanded && <span className="bg-accent rounded-full inline-block h-[6px] ml-[6px] align-middle w-[6px]" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border-dim flex flex-col gap-3 mt-3 pt-3">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <label className="text-text-dim text-xs font-medium uppercase tracking-[0.05em]">Date from</label>
              <input className="bg-bg-input border border-border-dim rounded-md text-text text-[13px] px-[10px] py-[7px] transition-colors duration-200 focus:border-accent focus:outline-none w-[130px]" type="date" value={filters.dateFrom} onChange={e => update('dateFrom', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-text-dim text-xs font-medium uppercase tracking-[0.05em]">Date to</label>
              <input className="bg-bg-input border border-border-dim rounded-md text-text text-[13px] px-[10px] py-[7px] transition-colors duration-200 focus:border-accent focus:outline-none w-[130px]" type="date" value={filters.dateTo} onChange={e => update('dateTo', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-text-dim text-xs font-medium uppercase tracking-[0.05em]">BPM min</label>
              <input className="bg-bg-input border border-border-dim rounded-md text-text text-[13px] px-[10px] py-[7px] transition-colors duration-200 focus:border-accent focus:outline-none w-20" type="number" value={filters.bpmMin} onChange={e => update('bpmMin', e.target.value)} placeholder="—" min="20" max="300" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-text-dim text-xs font-medium uppercase tracking-[0.05em]">BPM max</label>
              <input className="bg-bg-input border border-border-dim rounded-md text-text text-[13px] px-[10px] py-[7px] transition-colors duration-200 focus:border-accent focus:outline-none w-20" type="number" value={filters.bpmMax} onChange={e => update('bpmMax', e.target.value)} placeholder="—" min="20" max="300" />
            </div>
          </div>

          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <label className="text-text-dim text-xs font-medium uppercase tracking-[0.05em]">Key</label>
              <div className="flex gap-1.5">
                <select id="search-key-note" className="bg-bg-input border border-border-dim rounded-md text-text text-[13px] px-2 py-[7px] transition-colors duration-200 focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed" value={filters.keyNote} onChange={e => update('keyNote', e.target.value)} aria-label="Note">
                  <option value="">—</option>
                  {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <select id="search-key-accidental" className="bg-bg-input border border-border-dim rounded-md text-text text-[13px] px-2 py-[7px] transition-colors duration-200 focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed" value={filters.keyAccidental} onChange={e => update('keyAccidental', e.target.value)} aria-label="Accidental" disabled={!filters.keyNote}>
                  {ACCIDENTALS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
                <select id="search-key-scale" className="bg-bg-input border border-border-dim rounded-md text-text text-[13px] px-2 py-[7px] transition-colors duration-200 focus:border-accent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed" value={filters.keyScale} onChange={e => update('keyScale', e.target.value)} aria-label="Scale" disabled={!filters.keyNote}>
                  <option value="">—</option>
                  {SCALES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap items-start">
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-text-dim text-xs font-medium uppercase tracking-[0.05em]">Tags</label>
              <TagInput
                value={filters.tags}
                onChange={tags => update('tags', tags)}
                suggestions={availableTags}
                placeholder="Filter by tags..."
              />
            </div>
            {filters.tags.length >= 2 && (
              <div className="flex flex-col gap-1 shrink-0">
                <label className="text-text-dim text-xs font-medium uppercase tracking-[0.05em]">Logic</label>
                <div className="flex border border-border-dim rounded-md overflow-hidden">
                  <button
                    type="button"
                    className={`bg-transparent border-none text-[12px] font-semibold px-[14px] py-[7px] cursor-pointer transition-[background,color] duration-150 ${filters.tagLogic === 'OR' ? 'bg-accent text-white' : 'text-text-dim'}`}
                    onClick={() => update('tagLogic', 'OR')}
                  >OR</button>
                  <button
                    type="button"
                    className={`bg-transparent border-none text-[12px] font-semibold px-[14px] py-[7px] cursor-pointer transition-[background,color] duration-150 ${filters.tagLogic === 'AND' ? 'bg-accent text-white' : 'text-text-dim'}`}
                    onClick={() => update('tagLogic', 'AND')}
                  >AND</button>
                </div>
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <div className="flex gap-3 flex-wrap justify-end">
              <button className="bg-transparent border-none text-text-dim cursor-pointer text-[13px] py-1 px-0 underline transition-colors duration-150 hover:text-text" onClick={clearAll}>Clear all filters</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="text-muted shrink-0">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
