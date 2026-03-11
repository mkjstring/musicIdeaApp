import { useState, useRef, useCallback, useEffect } from 'react'
import * as Tone from 'tone'
import type { ChordInfo } from './Fretboard'
import { getDiatonicChordTones } from '../utils/chordVoicings'
import { CustomSelect } from './CustomSelect'
import { pitchClassesToMidi } from '../utils/midiUtils'
import { playChord, stopAll, setBpm as engineSetBpm, setTimeSignature as engineSetTimeSig, scheduleMetronome } from '../utils/audioEngine'

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
    <div className="p-6 flex flex-col gap-6">
      {/* Transport controls */}
      <div className="flex items-end gap-5 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="prog-bpm" className="text-text-dim text-[10px] font-semibold tracking-[0.08em] uppercase">BPM</label>
          <input
            id="prog-bpm"
            type="number"
            className="progression-bpm-input bg-bg-input border border-border rounded-lg text-text text-sm px-[10px] py-2 w-[72px] outline-none transition-colors duration-200 focus:border-accent"
            value={bpm}
            min={20}
            max={300}
            disabled={isPlaying}
            onChange={e => handleBpmChange(Number(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-text-dim text-[10px] font-semibold tracking-[0.08em] uppercase">Time</label>
          <div className="flex items-center gap-1">
            <input
              id="prog-timesig-num"
              type="number"
              className="progression-timesig-input bg-bg-input border border-border rounded-lg text-text text-sm px-[10px] py-2 w-[52px] outline-none text-center transition-colors duration-200 focus:border-accent"
              value={timeSig[0]}
              min={1}
              max={12}
              disabled={isPlaying}
              onChange={e => setTimeSig([Math.max(1, Math.min(12, Number(e.target.value))), timeSig[1]])}
            />
            <span className="text-muted text-lg font-light leading-none pb-0.5">/</span>
            <CustomSelect
              id="prog-timesig-denom"
              className="w-[60px]"
              value={String(timeSig[1])}
              disabled={isPlaying}
              showChevron={false}
              onChange={v => setTimeSig([timeSig[0], Number(v)])}
              options={DENOM_OPTIONS.map(d => ({ value: String(d), label: String(d) }))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="prog-bars" className="text-text-dim text-[10px] font-semibold tracking-[0.08em] uppercase">Bars</label>
          <CustomSelect
            id="prog-bars"
            className="w-[60px]"
            value={String(barCount)}
            disabled={isPlaying}
            showChevron={false}
            onChange={v => handleBarCountChange(Number(v))}
            options={BAR_COUNT_OPTIONS.map(n => ({ value: String(n), label: String(n) }))}
          />
        </div>

        <button
          className={`border rounded-lg cursor-pointer text-[13px] font-semibold px-5 py-[9px] transition-[background,border-color,color] duration-200 tracking-[0.02em] ${isPlaying ? 'bg-[rgba(239,68,68,0.12)] border-[rgba(239,68,68,0.35)] text-[#fca5a5] hover:bg-[rgba(239,68,68,0.22)] hover:border-[rgba(239,68,68,0.6)] hover:text-[#fecaca]' : 'bg-[rgba(102,126,234,0.15)] border-[rgba(102,126,234,0.4)] text-accent-soft hover:bg-[rgba(102,126,234,0.28)] hover:border-[rgba(102,126,234,0.7)] hover:text-[#c7d2fe]'}`}
          onClick={isPlaying ? handleStop : startPlayback}
        >
          {isPlaying ? '■ Stop' : '▶ Play'}
        </button>
      </div>

      {/* Bar grid */}
      <div className="flex gap-3 flex-wrap">
        {bars.map((bar, i) => {
          const chord = bar.degree ? chords.find(c => c.numeral === bar.degree) : null
          const isActive = activeBar === i
          const isPrimed = primedBar === i
          const isLocked = primedBar !== null && primedBar !== i
          return (
            <button
              key={i}
              className={[
                'bg-bg-input border border-border-dim rounded-[10px] cursor-pointer flex flex-col items-center gap-1 min-w-[72px] px-[10px] pt-3 pb-[10px] relative transition-[background,border-color,transform] duration-150',
                'hover:enabled:bg-bg-raised hover:enabled:border-[rgba(102,126,234,0.3)]',
                chord ? 'border-border' : '',
                isActive ? '!bg-[rgba(102,126,234,0.18)] !border-[rgba(102,126,234,0.65)] -translate-y-0.5 shadow-[0_4px_16px_rgba(102,126,234,0.2)]' : '',
                isPrimed ? '!border-accent !bg-[rgba(102,126,234,0.12)] shadow-[0_0_0_2px_rgba(102,126,234,0.25)]' : '',
                isLocked ? 'opacity-30 cursor-not-allowed' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleBarClick(i)}
              disabled={isPlaying || isLocked}
            >
              <span className="absolute top-[5px] left-1/2 -translate-x-1/2 text-muted text-[9px] font-semibold tracking-[0.05em] pointer-events-none">{i + 1}</span>
              {chord && !isPlaying && (
                <span
                  className="absolute top-[3px] left-1 bg-transparent border-none rounded-[3px] text-border cursor-pointer text-[13px] leading-none px-[3px] py-px transition-[color,background] duration-150 hover:text-red-soft hover:bg-[rgba(239,68,68,0.12)]"
                  role="button"
                  aria-label="Clear chord"
                  onClick={e => { e.stopPropagation(); handleClearBar(i) }}
                >
                  ×
                </span>
              )}
              {chord ? (
                <>
                  <span className="text-accent text-[13px] font-bold mt-2">{chord.numeral}</span>
                  <span className="text-text text-[15px] font-semibold leading-none">{chord.note}</span>
                  <span className="text-text-dim text-[10px]">{chord.quality}</span>
                </>
              ) : (
                <span className="text-border text-[20px] font-light mt-2 leading-[1.2]">{isPrimed ? '?' : '—'}</span>
              )}
            </button>
          )
        })}
        {!isPlaying && barCount < 12 && (
          <button className="bg-transparent border border-dashed border-border rounded-[10px] text-muted cursor-pointer text-[22px] font-light min-w-[72px] px-[10px] pt-3 pb-[10px] transition-[border-color,color] duration-150 leading-none self-stretch hover:border-[rgba(102,126,234,0.5)] hover:text-accent" onClick={handleAddBar}>+</button>
        )}
      </div>

      <p className="text-muted text-xs m-0">
        {isPlaying
          ? 'Playing…'
          : primedBar !== null
          ? 'Select a chord from the info panel above to assign it to this bar.'
          : 'Click a bar to select it, then choose a chord from the panel above. Click again to deselect.'}
      </p>
    </div>
  )
}
