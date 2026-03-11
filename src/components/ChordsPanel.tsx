import { useState, useMemo, useEffect } from 'react'
import type { ChordInfo } from './Fretboard'
import { getDiatonicChordTones, findVoicing, getInversions, type ChordType } from '../utils/chordVoicings'
import {
  getStandardMaj7Voicings,
  getStandardMaj6Voicings,
  getStandardMaj7Inv1Voicings,
  getStandardMinor6Voicings,
  getStandardMinorMaj6Voicings,
  getStandardMinor7Inv1Voicings,
  getStandardHalfDim7Voicings,
  getStandardHalfDim7Inv1Voicings,
  getStandardHalfDim7Inv2Voicings,
  getStandardHalfDim7Inv3Voicings,
} from '../utils/standardVoicings'
import { ChordDiagram } from './ChordDiagram'
import { ChordVoicingsDisplay, type VoicingSection } from './ChordVoicingsDisplay'
import { CustomSelect } from './CustomSelect'

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

const INV_LABELS = ['Root', '3rd bass', '5th bass', '7th bass']

type SubstituteOption = {
  label: string
  sections: VoicingSection[]
  chordTones?: number[]  // re-ordered from substitute root for correct dot labeling
}

export function ChordsPanel({ chords, scaleSemitones, useFlats, mode, selectedDegree, onDegreeChange }: ChordsPanelProps) {
  const [chordType, setChordType] = useState<ChordType>('triad')
  const [showWovbc, setShowWovbc] = useState(false)
  const [inversionIndex, setInversionIndex] = useState(0)
  const [substituteIndex, setSubstituteIndex] = useState(0)

  // Reset to root position when chord type changes
  useEffect(() => { setInversionIndex(0) }, [chordType])
  // Reset substitute when chord, type, or inversion changes
  useEffect(() => { setSubstituteIndex(0) }, [selectedDegree, chordType, inversionIndex])

  const selectedChord = chords.find(c => c.numeral === selectedDegree)

  const computed = useMemo(() => {
    if (!selectedChord) return null
    const rootSemitone = noteToSemitone(selectedChord.note)
    const chordTones = getDiatonicChordTones(rootSemitone, scaleSemitones, chordType)

    // Algorithmic inversions (wovbc)
    const invDefs = getInversions(chordTones, chordType)
    const wovbcVoicings = invDefs.map(({ label, bassNote }) => ({
      label,
      voicing: findVoicing(chordTones, bassNote),
    }))

    // Standard template voicings — quality detection
    const third   = chordTones.length >= 2 ? (chordTones[1] - chordTones[0] + 12) % 12 : -1
    const fifth   = chordTones.length >= 3 ? (chordTones[2] - chordTones[0] + 12) % 12 : -1
    const sixth   = chordTones.length >= 4 ? (chordTones[3] - chordTones[0] + 12) % 12 : -1
    const isMaj7      = chordType === '7th' && sixth === 11
    const isMinor7    = chordType === '7th' && third === 3 && sixth === 10
    const isMaj6      = chordType === '6th' && third === 4 && sixth === 9
    // Minor 6th (m6) templates encode root + m3 + P5 + m6 (8 semitones).
    // Bdim6 has dim5 (6) — excluded. Dm6 has M6 (9) — handled by isMinorMaj6.
    const isMinor6    = chordType === '6th' && third === 3 && fifth === 7 && sixth === 8
    // Minor chord with major 6th (M6=9): e.g. Dm6 = D F A B
    const isMinorMaj6 = chordType === '6th' && third === 3 && fifth === 7 && sixth === 9

    let standardVoicings: Array<{ voicing: import('../utils/chordVoicings').Voicing; label: string }> | null = null
    if (inversionIndex === 0) {
      if (isMaj7)           standardVoicings = getStandardMaj7Voicings(rootSemitone, chordTones)
      else if (isMaj6)      standardVoicings = getStandardMaj6Voicings(rootSemitone, chordTones)
      else if (isMinor6)    standardVoicings = getStandardMinor6Voicings(rootSemitone, chordTones)
      else if (isMinorMaj6) standardVoicings = getStandardMinorMaj6Voicings(rootSemitone, chordTones)
    } else if (inversionIndex === 1) {
      if (isMaj7)      standardVoicings = getStandardMaj7Inv1Voicings(rootSemitone, chordTones)
      else if (isMinor7) standardVoicings = getStandardMaj6Voicings((rootSemitone + 3) % 12, chordTones)
    }
    // 5th bass / 7th bass: no template sets yet — falls through to algorithmic single voicing

    // Substitute chord options (6th diminished enharmonic equivalencies)
    //
    // Each 6th chord quality has an enharmonic twin — the same pitch classes
    // reinterpreted from a different root. These substitutes are drawn from the
    // 6th-diminished scale tradition (e.g., Dm6 = Bø7, Cmaj6 = Am7/C, Am6 = Fmaj7).
    //
    //   maj6  (M3+M6):  root + M6 → minor 7th   e.g. Cmaj6 → Am7
    //   min6  (m3+m6):  root + M6 → major 7th   e.g. Am6  → Fmaj7  (F = 8st above A)
    //   mM6   (m3+M6):  root + M6 → half-dim 7  e.g. Dm6  → Bø7
    //
    const noteNames = useFlats ? CHROMATIC_FLAT : CHROMATIC_SHARP
    const substituteOptions: SubstituteOption[] = []

    if (chordType === '6th') {
      if (isMaj6) {
        // Cmaj6 {C,E,G,A} = Am7/C — same shapes, re-interpreted from the 6th degree
        const subRoot = (rootSemitone + 9) % 12
        substituteOptions.push({
          label: noteNames[subRoot] + 'm7',
          sections: [{ voicings: getStandardMinor7Inv1Voicings(subRoot, chordTones) }],
        })
      } else if (isMinor6) {
        // Am6 {A,C,E,F} = Fmaj7 — F is 8 semitones above A; shows Fmaj7 root-bass shapes
        const subRoot = (rootSemitone + 8) % 12
        substituteOptions.push({
          label: noteNames[subRoot] + 'maj7',
          sections: [{ voicings: getStandardMaj7Voicings(subRoot, chordTones) }],
        })
      } else if (isMinorMaj6) {
        // Dm6 {D,F,A,B} = Bø7 — same pitch classes, B is the ø7 root (M6 above D)
        // subChordTones re-orders from B so the diagram labels B as root, D as 3rd, etc.
        const subRoot = (rootSemitone + 9) % 12
        const subChordTones = [subRoot, (subRoot + 3) % 12, (subRoot + 6) % 12, (subRoot + 10) % 12]
        substituteOptions.push({
          label: noteNames[subRoot] + 'ø7',
          chordTones: subChordTones,
          sections: [
            { heading: 'Root',      voicings: getStandardHalfDim7Voicings(subRoot, chordTones) },
            { heading: '3rd bass',  voicings: getStandardHalfDim7Inv1Voicings(subRoot, chordTones) },
            { heading: 'dim5 bass', voicings: getStandardHalfDim7Inv2Voicings(subRoot, chordTones) },
            { heading: '7th bass',  voicings: getStandardHalfDim7Inv3Voicings(subRoot, chordTones) },
          ],
        })
      }
    }

    if (chordType === '7th' && isMinor7) {
      // Cm7 {C,Eb,G,Bb} = Ebmaj6 — same pitch classes, Eb is the maj6 root
      const subRoot = (rootSemitone + 3) % 12
      const subChordTones = [subRoot, (subRoot + 4) % 12, (subRoot + 7) % 12, (subRoot + 9) % 12]
      substituteOptions.push({
        label: noteNames[subRoot] + 'maj6',
        chordTones: subChordTones,
        sections: [{ voicings: getStandardMaj6Voicings(subRoot, chordTones) }],
      })
    }

    return { chordTones, wovbcVoicings, standardVoicings, substituteOptions }
  }, [selectedChord, scaleSemitones, chordType, inversionIndex, useFlats])

  const chordTones = computed?.chordTones ?? []
  const wovbcVoicings = computed?.wovbcVoicings ?? []
  const standardVoicings = computed?.standardVoicings ?? null
  const substituteOptions = computed?.substituteOptions ?? []

  // Number of valid inversion positions for the current chord type
  const invCount = Math.min(chordTones.length, 4)
  const safeInvIdx = Math.min(inversionIndex, Math.max(0, invCount - 1))

  // The 4th inversion label depends on chord type
  const invLabels = [...INV_LABELS]
  if (chordType === '6th') invLabels[3] = '6th bass'

  // Active substitute option (null = showing main chord voicings)
  const safeSubIdx = Math.min(substituteIndex, substituteOptions.length)
  const activeSub = safeSubIdx > 0 ? substituteOptions[safeSubIdx - 1] : null

  // Single algorithmic voicing for the selected inversion (fallback + wovbc mode)
  const algorithmicVoicing = wovbcVoicings[safeInvIdx] ?? null

  // Build sections for ChordVoicingsDisplay
  const mainSections: VoicingSection[] = chordType === 'triad'
    ? [{
        voicings: wovbcVoicings
          .filter(v => v.voicing != null)
          .map(v => ({ voicing: v.voicing!, label: v.label }))
      }]
    : standardVoicings && standardVoicings.length > 0
      ? [{ voicings: standardVoicings }]
      : algorithmicVoicing?.voicing
        ? [{ voicings: [{ voicing: algorithmicVoicing.voicing, label: algorithmicVoicing.label }] }]
        : []

  return (
    <div className="w-full p-6 flex flex-col gap-5">
      <div className="flex items-center gap-4 flex-wrap">
        <CustomSelect
          id="chords-type-select"
          value={chordType}
          onChange={v => setChordType(v as ChordType)}
          options={[
            { value: 'triad', label: 'Triads' },
            { value: '6th',   label: '6th chords' },
            { value: '7th',   label: '7th chords' },
            { value: '9th',   label: '9th chords' },
          ]}
        />
        <button
          className={`bg-transparent border rounded-md text-[11px] font-semibold tracking-[0.05em] px-[10px] py-1.5 cursor-pointer transition-[color,border-color,background] duration-200 ${showWovbc ? 'text-text-soft border-accent bg-[rgba(102,126,234,0.08)]' : 'border-border text-muted hover:text-text-dim hover:border-muted'}`}
          title="weird open voicings by claude"
          onClick={() => setShowWovbc(v => !v)}
        >
          wovbc
        </button>
        <div className="flex gap-2 flex-wrap ml-auto">
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
      </div>

      {selectedChord && invCount > 1 && chordType !== 'triad' && (
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: invCount }, (_, i) => (
            <button
              key={i}
              className={`bg-transparent border rounded-md text-[11px] font-semibold tracking-[0.04em] px-[11px] py-[5px] cursor-pointer transition-[color,border-color,background] duration-150 ${safeInvIdx === i ? 'text-accent-soft border-accent bg-[rgba(102,126,234,0.1)]' : 'border-border text-muted hover:text-text-soft hover:border-muted'}`}
              onClick={() => setInversionIndex(i)}
            >
              {invLabels[i]}
            </button>
          ))}
        </div>
      )}

      {selectedChord && substituteOptions.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <button
            className={`bg-transparent border rounded-md text-[11px] font-semibold tracking-[0.04em] px-[11px] py-[5px] cursor-pointer transition-[color,border-color,background] duration-150 ${safeSubIdx === 0 ? 'text-green-soft border-green bg-[rgba(74,222,128,0.08)]' : 'border-border text-muted hover:text-text-soft hover:border-muted'}`}
            onClick={() => setSubstituteIndex(0)}
          >
            main
          </button>
          {substituteOptions.map((sub, i) => (
            <button
              key={sub.label}
              className={`bg-transparent border rounded-md text-[11px] font-semibold tracking-[0.04em] px-[11px] py-[5px] cursor-pointer transition-[color,border-color,background] duration-150 ${safeSubIdx === i + 1 ? 'text-green-soft border-green bg-[rgba(74,222,128,0.08)]' : 'border-border text-muted hover:text-text-soft hover:border-muted'}`}
              onClick={() => setSubstituteIndex(i + 1)}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {selectedChord ? (
        showWovbc ? (
          // Wovbc mode: all inversions visible at once (unchanged behavior)
          <div className="flex justify-evenly flex-wrap gap-4 items-start">
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
                <div key={label} className="flex flex-col items-center gap-1.5 w-[150px] py-5">
                  <span className="text-text-soft text-xs font-medium">{label}</span>
                  <span className="text-muted text-[11px]">No shape found</span>
                </div>
              )
            )}
          </div>
        ) : activeSub ? (
          <ChordVoicingsDisplay
            sections={activeSub.sections}
            chordTones={activeSub.chordTones ?? chordTones}
            useFlats={useFlats}
            mode={mode}
          />
        ) : mainSections.length > 0 ? (
          <ChordVoicingsDisplay
            sections={mainSections}
            chordTones={chordTones}
            useFlats={useFlats}
            mode={mode}
          />
        ) : (
          <p className="text-muted text-sm text-center py-5 m-0">No shape found</p>
        )
      ) : (
        <p className="text-muted text-sm text-center py-5 m-0">Select a chord above to see shapes</p>
      )}
    </div>
  )
}
