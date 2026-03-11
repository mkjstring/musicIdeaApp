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

// A shape template defines a moveable chord fingering pattern.
//
// bassString:  which string (0=low E … 5=high e) carries the root
// offsets:     per-string instruction — index 0=low E, 5=high e
//   null       → mute ('x')
//   number     → fret = rootFret + this offset  (0 = same fret as root)
//
// Open strings are NOT encoded here. After applying the template, any string
// still marked 'x' is checked: if its open-string pitch class is present in
// the chord tones it is included as fret 0. Scanning proceeds outward from
// the highest fretted string and stops at the first miss, so no unplayable
// gaps are created.
interface ShapeTemplate {
  label: string
  bassString: number
  offsets: (number | null)[]
}

// ── Maj7 root-position shape templates ────────────────────────────────────────
//
//   A-string root (moveable)
//     G @ R+1 → M7  (G string is 10 st above A; +1 makes 11 = M7)
//     B @ R+2 → M3  (B string is 14 st above A; +2 makes 16%12 = 4 = M3)
//     e @ R+0 → P5  (e string is 19 st above A; +0 makes 19%12 = 7 = P5)
//
//   D-string barre (moveable)
//     G @ R+2 → P5  (G is 5 st above D; +2 makes 7 = P5)
//     B @ R+2 → M7  (B is 9 st above D; +2 makes 11 = M7)
//     e @ R+2 → M3  (e is 14 st above D; +2 makes 16%12 = 4 = M3)
//     (all three land on the same fret = natural barre)
//
//   A-string root + upper strings
//     G @ R+1 → M7, B @ R+2 → M3; high-e open added if E is in chord
//
//   E-string root + upper strings
//     A @ R+2 → P5, D @ R+1 → M7, G @ R+1 → M3
//     B and/or high-e open added if their PCs are in chord
//
//   E-string root (compact)
//     D @ R+1 → M7, G @ R+1 → M3, B @ R+0 → P5
//     high-e open added if E is in chord
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
    offsets: [null, 0, 2, 1, 2, null],
  },
  {
    label: 'E str. +',
    bassString: 0,
    offsets: [0, 2, 1, 1, null, null],
  },
  {
    label: 'E str.',
    bassString: 0,
    offsets: [0, null, 1, 1, 0, null],
  },
]

function applyTemplate(
  template: ShapeTemplate,
  rootSemitone: number,
  chordTones: number[],
): { voicing: Voicing; label: string } | null {
  // Root fret on the bass string (lowest position, 0–11)
  const openMidi = GUITAR_STRINGS_MIDI[template.bassString]
  let rootFret = ((rootSemitone - openMidi % 12) + 12) % 12

  // If any offset would produce a negative fret, try one octave higher.
  // This handles shapes where the root coincides with an open string (rootFret=0)
  // but the template was designed for that note at the 12th fret position.
  if (template.offsets.some(o => o !== null && rootFret + o < 0)) {
    rootFret += 12
  }
  // Still negative after octave shift (offset < -12) — reject
  if (template.offsets.some(o => o !== null && rootFret + o < 0)) return null

  const frets: (number | 'x')[] = template.offsets.map((offset) => {
    if (offset === null) return 'x'
    return rootFret + offset
  })

  // Opportunistically extend open strings upward from the highest fretted string.
  // Stop at the first string whose open PC is not in the chord — this prevents
  // unplayable gaps between sounded strings.
  const highestPlayed = frets.reduce<number>((hi, f, i) => f !== 'x' ? i : hi, -1)
  for (let s = highestPlayed + 1; s < 6; s++) {
    const openPc = GUITAR_STRINGS_MIDI[s] % 12
    if (chordTones.includes(openPc)) {
      frets[s] = 0
    } else {
      break
    }
  }

  return { label: template.label, voicing: rawToVoicing(frets) }
}

export function getStandardMaj7Voicings(
  rootSemitone: number,
  chordTones: number[],
): Array<{ voicing: Voicing; label: string }> {
  return MAJ7_TEMPLATES
    .map(template => applyTemplate(template, rootSemitone, chordTones))
    .filter((r): r is { voicing: Voicing; label: string } => r !== null)
}

// ── Maj6 root-position shape templates ────────────────────────────────────────
//
// Derived from Cmaj6 voicings (root = fret 8 on E-string, fret 3 on A-string,
// fret 10 on D-string). Offsets are relative to rootFret on the bassString.
// Negative offsets (-1) occur when an upper string is tuned higher than the
// interval distance from the root string would place the note — valid only
// when rootFret >= 1.
//
//   E str.   [0,  2, -1,  1, null, null]  — C E G A (low cluster)
//   E str. + [0, null, -1, 1,  0,  null]  — C G A E (4-string)
//   A str.   [null, 0,  2, -1,  2,  null] — C E A E (A-string root)
//   A str. + [null, 0, null, -1, 2,  0]   — C A E C (spread)
//   D str.   [null, null, 0,  2,  0,  2]  — C E C E (high barre)
//
const MAJ6_TEMPLATES: ShapeTemplate[] = [
  {
    label: 'E str.',
    bassString: 0,
    offsets: [0, 2, -1, 1, null, null],
  },
  {
    label: 'E str. +',
    bassString: 0,
    offsets: [0, null, -1, 1, 0, null],
  },
  {
    label: 'A str.',
    bassString: 1,
    offsets: [null, 0, 2, -1, 2, null],
  },
  {
    label: 'A str. +',
    bassString: 1,
    offsets: [null, 0, null, -1, 2, 0],
  },
  {
    label: 'D str.',
    bassString: 2,
    offsets: [null, null, 0, 2, 0, 2],
  },
]

export function getStandardMaj6Voicings(
  rootSemitone: number,
  chordTones: number[],
): Array<{ voicing: Voicing; label: string }> {
  return MAJ6_TEMPLATES
    .map(template => applyTemplate(template, rootSemitone, chordTones))
    .filter((r): r is { voicing: Voicing; label: string } => r !== null)
}

// ── Maj7 1st-inversion shape templates ────────────────────────────────────────
//
// Derived from Cmaj7/E voicings (E = major 3rd of C, fret 12 on E-string,
// fret 7 on A-string, fret 2 on D-string).
//
// The `rootSemitone` passed to applyTemplate is the BASS NOTE (the major 3rd),
// not the chord root. Callers compute: bass = (chordRoot + 4) % 12.
//
// Enharmonic equivalency: Xmaj7/3rd == X-relative-minor root-position m6
//   e.g. Cmaj7/E == Em6 (both = {C, E, G, B}, E in bass)
// Both getStandardMaj7Inv1Voicings and getStandardMinor6Voicings use this array.
//
// Negative offsets (-2) are valid for most keys; for the case where the bass
// note on the E-string is at fret 0 (e.g. Cmaj7/E), those shapes are filtered
// by the negative-fret guard — A-string and D-string shapes provide coverage.
//
const MAJ7_INV1_TEMPLATES: ShapeTemplate[] = [
  {
    label: 'E str.',
    bassString: 0,
    offsets: [0, 2, -2, 0, null, null],
  },
  {
    label: 'E str. +',
    bassString: 0,
    offsets: [0, null, -2, 0, 0, null],
  },
  {
    label: 'A str.',
    bassString: 1,
    offsets: [null, 0, 2, -2, 1, null],
  },
  {
    label: 'A str. +',
    bassString: 1,
    offsets: [null, 0, null, -2, 1, 0],
  },
  {
    label: 'D str.',
    bassString: 2,
    offsets: [null, null, 0, 2, -1, 1],
  },
]

export function getStandardMaj7Inv1Voicings(
  chordRoot: number,
  chordTones: number[],
): Array<{ voicing: Voicing; label: string }> {
  const thirdSemitone = (chordRoot + 4) % 12
  return MAJ7_INV1_TEMPLATES
    .map(template => applyTemplate(template, thirdSemitone, chordTones))
    .filter((r): r is { voicing: Voicing; label: string } => r !== null)
}

// Em6 root-position voicings are enharmonically identical to Xmaj7 1st inversion
// (same pitch classes, same bass note). Uses the same MAJ7_INV1_TEMPLATES.
export function getStandardMinor6Voicings(
  minorRoot: number,
  chordTones: number[],
): Array<{ voicing: Voicing; label: string }> {
  return MAJ7_INV1_TEMPLATES
    .map(template => applyTemplate(template, minorRoot, chordTones))
    .filter((r): r is { voicing: Voicing; label: string } => r !== null)
}

// ── Minor maj6 (m+M6) root-position shape templates ──────────────────────────
//
// Interval structure: root + m3(3) + P5(7) + M6(9)
// Example: Dm6 = D F A B  (D=2, F=5, A=9, B=11)
//
// This is DISTINCT from the minor-6th (m6) templates which encode m6(8).
// Dm6 has a major 6th (M6=9), not a minor 6th (m6=8).
//
// Derived from Dm6 voicing [null, 5, 3, 2, 0, null] (D on A-string, rootFret=5):
//   A str.  offsets [null, 0, -2, -3, -5, null]
//     A@0=D(root), D@-2=F(m3), G@-3=A(P5), B@-5=B(M6)
//
const MINOR_MAJ6_TEMPLATES: ShapeTemplate[] = [
  {
    label: 'A str.',
    bassString: 1,
    offsets: [null, 0, -2, -3, -5, null],
  },
]

export function getStandardMinorMaj6Voicings(
  minorRoot: number,
  chordTones: number[],
): Array<{ voicing: Voicing; label: string }> {
  return MINOR_MAJ6_TEMPLATES
    .map(template => applyTemplate(template, minorRoot, chordTones))
    .filter((r): r is { voicing: Voicing; label: string } => r !== null)
}

// ── Half-diminished 7th (ø7) shape templates ─────────────────────────────────
//
// Interval structure from bass: dim5(+6), m7(+10), m3(+3)
// Example: Bø7 = B D F A  (B=11, D=2, F=5, A=9)
//
// Enharmonic equivalency: Dm6 {D,F,A,B} = Bø7 {B,D,F,A} (same pitch classes).
// These templates are used as the substitute voicing for isMinorMaj6 chords.
//
// Root position — offsets derived from Bø7 [null,2,3,2,3,null] (A-string) and
// verified for E-string [7,8,7,7,null,null] and D-string [null,null,9,10,10,10]:
//
const HALF_DIM7_ROOT_TEMPLATES: ShapeTemplate[] = [
  { label: 'A str.', bassString: 1, offsets: [null, 0, 1, 0, 1, null] },
  { label: 'E str.', bassString: 0, offsets: [0, 1, 0, 0, null, null] },
  { label: 'D str.', bassString: 2, offsets: [null, null, 0, 1, 1, 1] },
]

// 1st inversion — m3 in bass (D for Bø7). User: [null,5,7,4,6,null].
// E str. derived: [10,12,9,10,null,null].
const HALF_DIM7_INV1_TEMPLATES: ShapeTemplate[] = [
  { label: 'A str.', bassString: 1, offsets: [null, 0, 2, -1, 1, null] },
  { label: 'E str.', bassString: 0, offsets: [0, 2, -1, 0, null, null] },
]

// 2nd inversion — dim5 in bass (F for Bø7). User's B-string fret was Ab (error);
// corrected to [null,8,9,7,10,null] = F B D A, all four unique tones.
// E str. derived: [1,2,0,2,null,null] — uses open D-string at fret 0.
const HALF_DIM7_INV2_TEMPLATES: ShapeTemplate[] = [
  { label: 'A str.', bassString: 1, offsets: [null, 0, 1, -1, 2, null] },
  { label: 'E str.', bassString: 0, offsets: [0, 1, -1, 1, null, null] },
]

// 3rd inversion — m7 in bass (A for Bø7). User: [null,12,12,10,12,null]
// (rootFret=12 because A open → octave shift). E str. derived: [5,5,3,4,null,null].
const HALF_DIM7_INV3_TEMPLATES: ShapeTemplate[] = [
  { label: 'A str.', bassString: 1, offsets: [null, 0, 0, -2, 0, null] },
  { label: 'E str.', bassString: 0, offsets: [0, 0, -2, -1, null, null] },
]

export function getStandardHalfDim7Voicings(
  root: number,
  chordTones: number[],
): Array<{ voicing: Voicing; label: string }> {
  return HALF_DIM7_ROOT_TEMPLATES
    .map(t => applyTemplate(t, root, chordTones))
    .filter((r): r is { voicing: Voicing; label: string } => r !== null)
}

export function getStandardHalfDim7Inv1Voicings(
  root: number,
  chordTones: number[],
): Array<{ voicing: Voicing; label: string }> {
  const bass = (root + 3) % 12
  return HALF_DIM7_INV1_TEMPLATES
    .map(t => applyTemplate(t, bass, chordTones))
    .filter((r): r is { voicing: Voicing; label: string } => r !== null)
}

export function getStandardHalfDim7Inv2Voicings(
  root: number,
  chordTones: number[],
): Array<{ voicing: Voicing; label: string }> {
  const bass = (root + 6) % 12
  return HALF_DIM7_INV2_TEMPLATES
    .map(t => applyTemplate(t, bass, chordTones))
    .filter((r): r is { voicing: Voicing; label: string } => r !== null)
}

export function getStandardHalfDim7Inv3Voicings(
  root: number,
  chordTones: number[],
): Array<{ voicing: Voicing; label: string }> {
  const bass = (root + 10) % 12
  return HALF_DIM7_INV3_TEMPLATES
    .map(t => applyTemplate(t, bass, chordTones))
    .filter((r): r is { voicing: Voicing; label: string } => r !== null)
}

// Am7 1st-inversion voicings are enharmonically identical to Xmaj6 root position
// (same pitch classes, same bass note). Uses the existing MAJ6_TEMPLATES.
// Bass note = minor 3rd above minorRoot = (minorRoot + 3) % 12.
export function getStandardMinor7Inv1Voicings(
  minorRoot: number,
  chordTones: number[],
): Array<{ voicing: Voicing; label: string }> {
  const thirdSemitone = (minorRoot + 3) % 12
  return MAJ6_TEMPLATES
    .map(template => applyTemplate(template, thirdSemitone, chordTones))
    .filter((r): r is { voicing: Voicing; label: string } => r !== null)
}
