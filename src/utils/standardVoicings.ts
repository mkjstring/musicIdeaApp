import type { Voicing } from './chordVoicings'

// Open string MIDI pitches: low E → high e
const GUITAR_STRINGS_MIDI = [40, 45, 50, 55, 59, 64]

function rawToVoicing(frets: (number | 'x')[]): Voicing {
  const pressedFrets = frets.filter((f): f is number => typeof f === 'number' && f > 0)
  const baseFret = pressedFrets.length > 0 ? Math.min(...pressedFrets) : 0
  const tonesPresent = frets
    .map((f, i) => f !== 'x' ? (GUITAR_STRINGS_MIDI[i] + (f as number)) % 12 : -1)
    .filter(pc => pc >= 0)
  return { frets: frets as (number | 'x')[], baseFret, tonesPresent }
}

// A shape template defines a moveable or open-string chord fingering pattern.
//
// bassString:      which string (0=low E, 1=A, 2=D) carries the root
// offsets:         per-string instruction — index 0=low E, 5=high e
//   null           → mute ('x')
//   'open'         → forced open string (fret 0), independent of root position
//   number         → fret = rootFret + this offset  (0 = same fret as root)
// openConstraints: pitch classes that must appear in chordTones for open strings
//                  to be valid (e.g. if the high e is forced open, E=pc4 must be
//                  in the chord; otherwise the shape is skipped for that key)
interface ShapeTemplate {
  label: string
  bassString: number
  offsets: (number | null | 'open')[]
  openConstraints?: number[]
}

// ── Maj7 root-position shape templates ────────────────────────────────────────
//
// All shapes verified against music theory:
//
//   A-string root (moveable)
//     G @ R+1 → M7  (G string is 10 st above A; +1 makes 11 = M7)
//     B @ R+2 → M3  (B string is 14 st above A; +2 makes 16%12 = 4 = M3)
//     e @ R+0 → P5  (e string is 19 st above A; +0 makes 19%12 = 7 = P5)
//
//   D-string barre (moveable)
//     G @ R+2 → P5  (G is 5 st above D; +2 makes 7 = P5)
//     B @ R+2 → M7  (B is 9 st above D; +2 makes 11 = M7... wait that's 11 ✓)
//     e @ R+2 → M3  (e is 14 st above D; +2 makes 16%12 = 4 = M3)
//     (all three land on the same fret = natural barre)
//
//   A-string root + open high-e  [E must be a chord tone]
//     (same intervals as moveable A-shape but high-e plays open E)
//
//   E-string root + open B + open e  [B=pc11 and E=pc4 must be chord tones]
//     A @ R+2 → P5  (A is 5 st above E; +2 makes 7 = P5)
//     D @ R+1 → M7  (D is 10 st above E; +1 makes 11 = M7)
//     G @ R+1 → M3  (G is 15 st above E; +1 makes 16%12 = 4 = M3)
//
//   E-string root + open high-e  [E must be a chord tone]
//     D @ R+1 → M7, G @ R+1 → M3, B @ R+0 → P5  (same as above minus A string)
//
const MAJ7_TEMPLATES: ShapeTemplate[] = [
  {
    label: 'A str.',
    bassString: 1,
    offsets: [null, 0, null, 1, 2, 0],
  },
  {
    label: 'D str.',
    bassString: 2,
    offsets: [null, null, 0, 2, 2, 2],
  },
  {
    label: 'A str. +',
    bassString: 1,
    offsets: [null, 0, 2, 1, 2, 'open'],
    openConstraints: [4],             // open high-e = E (pc4) must be a chord tone
  },
  {
    label: 'E str. +',
    bassString: 0,
    offsets: [0, 2, 1, 1, 'open', 'open'],
    openConstraints: [11, 4],         // open B = pc11, open e = pc4 must both be chord tones
  },
  {
    label: 'E str.',
    bassString: 0,
    offsets: [0, null, 1, 1, 0, 'open'],
    openConstraints: [4],             // open high-e = E (pc4) must be a chord tone
  },
]

function applyTemplate(
  tmpl: ShapeTemplate,
  rootSemitone: number,
  chordTones: number[],
): { voicing: Voicing; label: string } | null {
  // Check open-string pitch-class constraints
  if (tmpl.openConstraints?.some(pc => !chordTones.includes(pc))) return null

  // Root fret on the bass string (lowest position, 0–11)
  const openMidi = GUITAR_STRINGS_MIDI[tmpl.bassString]
  const rootFret = ((rootSemitone - openMidi % 12) + 12) % 12

  const frets: (number | 'x')[] = tmpl.offsets.map((offset) => {
    if (offset === null) return 'x'
    if (offset === 'open') return 0
    return rootFret + offset
  })

  return { label: tmpl.label, voicing: rawToVoicing(frets) }
}

export function getStandardMaj7Voicings(
  rootSemitone: number,
  chordTones: number[],
): Array<{ voicing: Voicing; label: string }> {
  return MAJ7_TEMPLATES
    .map(tmpl => applyTemplate(tmpl, rootSemitone, chordTones))
    .filter((v): v is { voicing: Voicing; label: string } => v !== null)
}
