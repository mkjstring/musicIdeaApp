import { useState, useMemo } from 'react'
import type { ChordInfo } from './Fretboard'
import { getDiatonicChordTones, findVoicing, getInversions, type ChordType } from '../utils/chordVoicings'
import { getStandardMaj7Voicings } from '../utils/standardVoicings'
import { ChordDiagram } from './ChordDiagram'
import './ChordsPanel.css'

interface ChordsPanelProps {
  chords: ChordInfo[]
  scaleSemitones: Set<number>
  useFlats: boolean
  mode: 'major' | 'minor'
  selectedDegree: string
  onDegreeChange: (degree: string) => void
}

const CHROMATIC_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const CHROMATIC_FLAT  = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']

function noteToSemitone(note: string): number {
  let idx = CHROMATIC_SHARP.indexOf(note)
  if (idx === -1) idx = CHROMATIC_FLAT.indexOf(note)
  return idx
}

export function ChordsPanel({ chords, scaleSemitones, useFlats, mode, selectedDegree, onDegreeChange }: ChordsPanelProps) {
  const [chordType, setChordType] = useState<ChordType>('triad')
  const [showWovbc, setShowWovbc] = useState(false)

  const selectedChord = chords.find(c => c.numeral === selectedDegree)

  const computed = useMemo(() => {
    if (!selectedChord) return null
    const rootSemitone = noteToSemitone(selectedChord.note)
    const chordTones = getDiatonicChordTones(rootSemitone, scaleSemitones, chordType)

    // WOVBC: algorithm-generated inversions
    const invDefs = getInversions(chordTones, chordType)
    const wovbcVoicings = invDefs.map(({ label, bassNote }) => ({
      label,
      voicing: findVoicing(chordTones, bassNote),
    }))

    // Standard lookup: maj7 root position only
    let standardVoicings: ReturnType<typeof getStandardMaj7Voicings> | null = null
    if (chordType === '7th' && chordTones.length >= 4) {
      const isMaj7 = ((chordTones[3] - chordTones[0] + 12) % 12) === 11
      if (isMaj7) standardVoicings = getStandardMaj7Voicings(rootSemitone, chordTones)
    }

    return { chordTones, wovbcVoicings, standardVoicings }
  }, [selectedChord, scaleSemitones, chordType])

  const chordTones = computed?.chordTones ?? []
  const wovbcVoicings = computed?.wovbcVoicings ?? []
  const standardVoicings = computed?.standardVoicings ?? null

  return (
    <div className="chords-panel">
      <div className="chords-panel-header">
        <select
          id="chords-type-select"
          className="chords-type-select"
          value={chordType}
          onChange={e => setChordType(e.target.value as ChordType)}
        >
          <option value="triad">Triads</option>
          <option value="6th">6th chords</option>
          <option value="7th">7th chords</option>
          <option value="9th">9th chords</option>
        </select>
        <button
          className={`wovbc-toggle${showWovbc ? ' wovbc-toggle--active' : ''}`}
          title="weird open voicings by claude"
          onClick={() => setShowWovbc(v => !v)}
        >
          wovbc
        </button>
      </div>

      <div className="chords-degree-row">
        {chords.map(c => (
          <button
            key={c.numeral}
            className={`info-chord${selectedDegree === c.numeral ? ' info-chord-active' : ''}`}
            onClick={() => onDegreeChange(selectedDegree === c.numeral ? 'scale' : c.numeral)}
            aria-label={`${c.numeral} — ${c.note} ${c.quality}`}
          >
            <span className="chord-numeral">{c.numeral}</span>
            <span className="chord-name">{c.note}</span>
            <span className="chord-quality">{c.quality}</span>
          </button>
        ))}
      </div>

      {selectedChord ? (
        showWovbc ? (
          <div className="chord-inversions">
            {wovbcVoicings.map(({ label, voicing }) =>
              voicing ? (
                <ChordDiagram
                  key={label}
                  voicing={voicing}
                  chordTones={chordTones}
                  useFlats={useFlats}
                  mode={mode}
                  label={label}
                />
              ) : (
                <div key={label} className="chord-diagram-empty">
                  <span className="chord-diagram-empty-label">{label}</span>
                  <span className="chord-diagram-empty-msg">No shape found</span>
                </div>
              )
            )}
          </div>
        ) : standardVoicings ? (
          <div className="chord-inversions">
            {standardVoicings.map(({ voicing, label }) => (
              <ChordDiagram
                key={label}
                voicing={voicing}
                chordTones={chordTones}
                useFlats={useFlats}
                mode={mode}
                label={label}
              />
            ))}
          </div>
        ) : (
          <p className="chords-empty">Toggle wovbc to see chord shapes</p>
        )
      ) : (
        <p className="chords-empty">Select a chord above to see shapes</p>
      )}
    </div>
  )
}
