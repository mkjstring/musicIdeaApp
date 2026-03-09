import './Fretboard.css'

// Standard tuning open string semitones (E A D G B e)
const OPEN_STRINGS = [4, 9, 2, 7, 11, 4]
const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e']
const STRING_WIDTHS = [2.8, 2.4, 2.0, 1.5, 1.1, 0.8]

const FRET_COUNT = 15
const INLAY_FRETS = [3, 5, 7, 9, 12, 15]
const STRING_COUNT = 6

// SVG layout constants
const OPEN_COL_W = 44
const NUT_W = 5
const FRET_SPACING = 50
const NUT_X = OPEN_COL_W + NUT_W
const TOP_PAD = 20
const BOT_PAD = 22
const SVG_H = 185
const SVG_W = NUT_X + FRET_COUNT * FRET_SPACING + 16  // 815

const STR_SPAN = SVG_H - TOP_PAD - BOT_PAD  // 143
const STRING_SPACING = STR_SPAN / (STRING_COUNT - 1)  // 28.6

const CHROMATIC_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const CHROMATIC_FLAT  = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']

function noteToSemitone(note: string): number {
  let idx = CHROMATIC_SHARP.indexOf(note)
  if (idx === -1) idx = CHROMATIC_FLAT.indexOf(note)
  return idx
}

function triadTones(rootNote: string, quality: string): [number, number, number] {
  const root = noteToSemitone(rootNote)
  const intervals = quality === 'maj' ? [0, 4, 7] : quality === 'min' ? [0, 3, 7] : [0, 3, 6]
  return intervals.map(i => (root + i) % 12) as [number, number, number]
}

function stringY(s: number) { return TOP_PAD + s * STRING_SPACING }
function fretLineX(n: number) { return NUT_X + n * FRET_SPACING }
function dotCenterX(fret: number) {
  return fret === 0 ? OPEN_COL_W / 2 : NUT_X + (fret - 0.5) * FRET_SPACING
}

const midStringY = stringY(0) + STR_SPAN / 2

export interface ChordInfo { numeral: string; note: string; quality: string }

interface FretboardProps {
  tonicSemitone: number
  scaleSemitones: Set<number>
  chords: ChordInfo[]
  useFlats: boolean
  mode: 'major' | 'minor'
  selectedDegree: string
  onDegreeChange: (degree: string) => void
}

export function Fretboard({ tonicSemitone, scaleSemitones, chords, useFlats, mode, selectedDegree, onDegreeChange }: FretboardProps) {
  const chromatic = useFlats ? CHROMATIC_FLAT : CHROMATIC_SHARP

  const chord = chords.find(c => c.numeral === selectedDegree)
  const activeSemitones = selectedDegree === 'scale' || !chord
    ? scaleSemitones
    : triadSemitones(chord.note, chord.quality)

  const chordRootSemitone = chord ? noteToSemitone(chord.note) : null

  function dotClass(semitone: number): string {
    if (selectedDegree === 'scale') {
      return semitone === tonicSemitone
        ? `note-dot note-dot-tonic note-dot-tonic-${mode}`
        : 'note-dot note-dot-scale'
    }
    return semitone === chordRootSemitone
      ? `note-dot note-dot-root note-dot-root-${mode}`
      : 'note-dot note-dot-chord-tone'
  }

  return (
    <div className="fretboard-section">
      <div className="fretboard-header">
        <h3 className="fretboard-title">Fretboard</h3>
        <select
          className="degree-select"
          value={selectedDegree}
          onChange={e => onDegreeChange(e.target.value)}
        >
          <option value="scale">Scale — all diatonic notes</option>
          {chords.map(c => (
            <option key={c.numeral} value={c.numeral}>
              {c.numeral} — {c.note} ({c.quality})
            </option>
          ))}
        </select>
      </div>

      <div className="fretboard-scroll-wrapper">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="fretboard-svg" aria-label="Guitar fretboard">

          {/* Fret number labels */}
          {Array.from({ length: FRET_COUNT }, (_, i) => i + 1).map(fret => (
            <text key={fret} x={dotCenterX(fret)} y={11} textAnchor="middle" className="fret-number">
              {fret}
            </text>
          ))}

          {/* Inlay dots */}
          {INLAY_FRETS.map(fret => {
            const x = dotCenterX(fret)
            return fret === 12 ? (
              <g key={fret}>
                <circle cx={x} cy={midStringY - 9} r={3.5} className="fret-inlay" />
                <circle cx={x} cy={midStringY + 9} r={3.5} className="fret-inlay" />
              </g>
            ) : (
              <circle key={fret} cx={x} cy={midStringY} r={3.5} className="fret-inlay" />
            )
          })}

          {/* Nut */}
          <rect
            x={NUT_X - NUT_W} y={stringY(0) - 3}
            width={NUT_W} height={stringY(STRING_COUNT - 1) - stringY(0) + 6}
            rx={1} className="fret-nut"
          />

          {/* Fret lines */}
          {Array.from({ length: FRET_COUNT }, (_, i) => i + 1).map(fret => (
            <line key={fret}
              x1={fretLineX(fret)} y1={stringY(0) - 2}
              x2={fretLineX(fret)} y2={stringY(STRING_COUNT - 1) + 2}
              className="fret-line"
            />
          ))}

          {/* String lines + labels */}
          {Array.from({ length: STRING_COUNT }, (_, s) => (
            <g key={s}>
              <text x={12} y={stringY(s)} textAnchor="middle" dominantBaseline="central" className="string-label">
                {STRING_LABELS[s]}
              </text>
              <line
                x1={NUT_X - NUT_W} y1={stringY(s)}
                x2={SVG_W - 8} y2={stringY(s)}
                className="string-line"
                strokeWidth={STRING_WIDTHS[s]}
              />
            </g>
          ))}

          {/* Note dots */}
          {Array.from({ length: STRING_COUNT }, (_, s) =>
            Array.from({ length: FRET_COUNT + 1 }, (_, fret) => {
              const semitone = (OPEN_STRINGS[s] + fret) % 12
              if (!activeSemitones.has(semitone)) return null
              const x = dotCenterX(fret)
              const y = stringY(s)
              return (
                <g key={`${s}-${fret}`}>
                  <circle cx={x} cy={y} r={10.5} className={dotClass(semitone)} />
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="note-dot-label">
                    {chromatic[semitone]}
                  </text>
                </g>
              )
            })
          )}
        </svg>
      </div>
    </div>
  )
}
