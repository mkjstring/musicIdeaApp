import { useState, useRef, useCallback, useEffect } from 'react'
import * as Tone from 'tone'
import type { ChordInfo } from './Fretboard'
import { getDiatonicChordTones } from '../utils/chordVoicings'
import { pitchClassesToMidi } from '../utils/midiUtils'
import { playChord, stopAll, setBpm as engineSetBpm, setTimeSignature as engineSetTimeSig, scheduleMetronome } from '../utils/audioEngine'
import './ProgressionLab.css'

export interface ProgressionBar {
  degree: string | null   // null = silence
}

interface ProgressionLabProps {
  chords: ChordInfo[]
  scaleSemitones: Set<number>
  bars: ProgressionBar[]
  barCount: number
  onBarsChange: (bars: ProgressionBar[]) => void
  onBarCountChange: (n: number) => void
  primedBar: number | null
  onPrimedBarChange: (idx: number | null) => void
  onPlayingChange: (playing: boolean) => void
  onActiveBarChange?: (bar: number | null) => void
  stopRequested: boolean
}

const CHROMATIC_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const CHROMATIC_FLAT  = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']

function noteToSemitone(note: string): number {
  let idx = CHROMATIC_SHARP.indexOf(note)
  if (idx === -1) idx = CHROMATIC_FLAT.indexOf(note)
  return idx
}

const DENOM_OPTIONS = [1, 2, 4, 8, 16, 32]
const BAR_COUNT_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12]

export function ProgressionLab({
  chords,
  scaleSemitones,
  bars,
  barCount,
  onBarsChange,
  onBarCountChange,
  primedBar,
  onPrimedBarChange,
  onPlayingChange,
  onActiveBarChange,
  stopRequested,
}: ProgressionLabProps) {
  const [bpm, setBpmState] = useState(120)
  const [timeSig, setTimeSig] = useState<[number, number]>([4, 4])
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeBar, setActiveBar] = useState<number | null>(null)

  useEffect(() => {
    if (stopRequested && isPlaying) {
      handleStop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopRequested])

  const barsRef = useRef(bars)
  barsRef.current = bars
  const timeSigRef = useRef(timeSig)
  timeSigRef.current = timeSig
  const bpmRef = useRef(bpm)
  bpmRef.current = bpm

  function handleBarClick(idx: number) {
    if (isPlaying) return
    if (primedBar === idx) {
      onPrimedBarChange(null)       // second click = unprime
    } else if (primedBar === null) {
      onPrimedBarChange(idx)        // prime this bar
    }
    // if a different bar is primed: do nothing (locked)
  }

  function handleClearBar(idx: number) {
    onBarsChange(bars.map((b, i) => i === idx ? { degree: null } : b))
    if (primedBar === idx) onPrimedBarChange(null)
  }

  function handleBarCountChange(n: number) {
    onBarCountChange(n)
    if (n > bars.length) {
      onBarsChange([...bars, ...Array(n - bars.length).fill(null).map(() => ({ degree: null }))])
    } else {
      onBarsChange(bars.slice(0, n))
    }
  }

  function handleAddBar() {
    const newCount = barCount + 1
    onBarCountChange(newCount)
    onBarsChange([...bars, { degree: null }])
    onPrimedBarChange(barCount) // new bar index = current barCount (0-based)
  }

  function handleBpmChange(val: number) {
    const clamped = Math.max(20, Math.min(300, val))
    setBpmState(clamped)
    engineSetBpm(clamped)
  }

  const startPlayback = useCallback(async () => {
    await Tone.start()

    const currentBars = barsRef.current
    const [num, denom] = timeSigRef.current
    const currentBpm = bpmRef.current

    engineSetBpm(currentBpm)
    engineSetTimeSig(num, denom)

    const secPerBeat = (60 / currentBpm) * (4 / denom)
    const barDuration = num * secPerBeat

    Tone.getTransport().cancel()
    Tone.getTransport().stop()

    onPrimedBarChange(null)

    // Schedule metronome clicks on every beat
    scheduleMetronome(denom)

    // Loop the progression
    const loopDuration = currentBars.length * barDuration
    Tone.getTransport().loop = true
    Tone.getTransport().loopStart = 0
    Tone.getTransport().loopEnd = loopDuration

    // Schedule chord playback per bar (events repeat automatically each loop)
    currentBars.forEach((bar, i) => {
      Tone.getTransport().schedule((time: number) => {
        Tone.getDraw().schedule(() => { setActiveBar(i); onActiveBarChange?.(i) }, time)

        if (bar.degree) {
          const chord = chords.find(c => c.numeral === bar.degree)
          if (chord) {
            const rootSt = noteToSemitone(chord.note)
            const tones = getDiatonicChordTones(rootSt, scaleSemitones, 'triad')
            const midiNotes = pitchClassesToMidi(tones, rootSt)
            playChord(midiNotes, barDuration * 0.88, time)
          }
        }
      }, i * barDuration)
    })

    Tone.getTransport().start()
    setIsPlaying(true)
    onPlayingChange(true)
  }, [chords, scaleSemitones, onPrimedBarChange, onPlayingChange])

  function handleStop() {
    stopAll()
    setIsPlaying(false)
    setActiveBar(null)
    onActiveBarChange?.(null)
    onPlayingChange(false)
  }

  return (
    <div className="progression-lab">
      {/* Transport controls */}
      <div className="progression-controls">
        <div className="progression-control-group">
          <label htmlFor="prog-bpm" className="progression-control-label">BPM</label>
          <input
            id="prog-bpm"
            type="number"
            className="progression-bpm-input"
            value={bpm}
            min={20}
            max={300}
            disabled={isPlaying}
            onChange={e => handleBpmChange(Number(e.target.value))}
          />
        </div>

        <div className="progression-control-group">
          <label className="progression-control-label">Time</label>
          <div className="progression-timesig">
            <input
              id="prog-timesig-num"
              type="number"
              className="progression-timesig-input"
              value={timeSig[0]}
              min={1}
              max={12}
              disabled={isPlaying}
              onChange={e => setTimeSig([Math.max(1, Math.min(12, Number(e.target.value))), timeSig[1]])}
            />
            <span className="progression-timesig-sep">/</span>
            <select
              id="prog-timesig-denom"
              className="progression-timesig-select"
              value={timeSig[1]}
              disabled={isPlaying}
              onChange={e => setTimeSig([timeSig[0], Number(e.target.value)])}
            >
              {DENOM_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="progression-control-group">
          <label htmlFor="prog-bars" className="progression-control-label">Bars</label>
          <select
            id="prog-bars"
            className="progression-bars-select"
            value={barCount}
            disabled={isPlaying}
            onChange={e => handleBarCountChange(Number(e.target.value))}
          >
            {BAR_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <button
          className={`progression-play-btn${isPlaying ? ' progression-play-btn--stop' : ''}`}
          onClick={isPlaying ? handleStop : startPlayback}
        >
          {isPlaying ? '■ Stop' : '▶ Play'}
        </button>
      </div>

      {/* Bar grid */}
      <div className="progression-bar-grid">
        {bars.map((bar, i) => {
          const chord = bar.degree ? chords.find(c => c.numeral === bar.degree) : null
          const isActive = activeBar === i
          const isPrimed = primedBar === i
          const isLocked = primedBar !== null && primedBar !== i
          return (
            <button
              key={i}
              className={[
                'progression-bar',
                chord ? 'progression-bar--filled' : '',
                isActive ? 'progression-bar--active' : '',
                isPrimed ? 'progression-bar--primed' : '',
                isLocked ? 'progression-bar--locked' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleBarClick(i)}
              disabled={isPlaying || isLocked}
            >
              <span className="progression-bar-num">{i + 1}</span>
              {chord && !isPlaying && (
                <span
                  className="progression-bar-clear"
                  role="button"
                  aria-label="Clear chord"
                  onClick={e => { e.stopPropagation(); handleClearBar(i) }}
                >
                  ×
                </span>
              )}
              {chord ? (
                <>
                  <span className="progression-bar-numeral">{chord.numeral}</span>
                  <span className="progression-bar-note">{chord.note}</span>
                  <span className="progression-bar-quality">{chord.quality}</span>
                </>
              ) : (
                <span className="progression-bar-empty">{isPrimed ? '?' : '—'}</span>
              )}
            </button>
          )
        })}
        {!isPlaying && barCount < 12 && (
          <button className="progression-bar-add" onClick={handleAddBar}>+</button>
        )}
      </div>

      <p className="progression-hint">
        {isPlaying
          ? 'Playing…'
          : primedBar !== null
          ? 'Select a chord from the info panel above to assign it to this bar.'
          : 'Click a bar to select it, then choose a chord from the panel above. Click again to deselect.'}
      </p>
    </div>
  )
}
