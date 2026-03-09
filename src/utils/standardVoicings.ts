import type { Voicing } from './chordVoicings'

const GUITAR_STRINGS_MIDI = [40, 45, 50, 55, 59, 64]

function rawToVoicing(frets: (number | 'x')[]): Voicing {
  const pressedFrets = frets.filter((f): f is number => typeof f === 'number' && f > 0)
  const baseFret = pressedFrets.length > 0 ? Math.min(...pressedFrets) : 0
  const tonesPresent = frets
    .map((f, i) => f !== 'x' ? (GUITAR_STRINGS_MIDI[i] + (f as number)) % 12 : -1)
    .filter(pc => pc >= 0)
  return { frets: frets as (number | 'x')[], baseFret, tonesPresent }
}

// [label, [E, A, D, G, B, e]]  — 'x' = muted, number = fret (0 = open)
type ShapeEntry = [string, (number | 'x')[]]

// Maj7 root position shapes, keyed by root semitone (C=0 … B=11)
// Shape A: A-string root (moveable)         x-R-x-(R+1)-(R+2)-R
// Shape B: D-string barre (moveable)        x-x-R-(R+2)-(R+2)-(R+2)
// Shape C: A-string root + open e           x-R-(R+2)-(R+1)-(R+2)-0  (E must be a chord tone)
// Shape D: E-string root + open B,e         R-(R+2)-(R+1)-(R+1)-0-0  (B and E must be chord tones)
// Shape E: E-string root + open e           R-x-(R+1)-(R+1)-R-0      (E must be a chord tone)
const MAJ7_ROOT: Record<number, ShapeEntry[]> = {
  0: [ // C
    ['A str.', ['x', 3, 'x', 4, 5, 3]],
    ['D str.', ['x', 'x', 10, 12, 12, 12]],
    ['A str. +', ['x', 3, 5, 4, 5, 0]],
    ['E str. +', [8, 10, 9, 9, 0, 0]],
    ['E str.', [8, 'x', 9, 9, 8, 0]],
  ],
  1: [ // Db
    ['A str.', ['x', 4, 'x', 5, 6, 4]],
    ['D str.', ['x', 'x', 11, 13, 13, 13]],
  ],
  2: [ // D
    ['A str.', ['x', 5, 'x', 6, 7, 5]],
    ['D str.', ['x', 'x', 0, 2, 2, 2]],
  ],
  3: [ // Eb
    ['A str.', ['x', 6, 'x', 7, 8, 6]],
    ['D str.', ['x', 'x', 1, 3, 3, 3]],
  ],
  4: [ // E
    ['A str.', ['x', 7, 'x', 8, 9, 7]],
    ['D str.', ['x', 'x', 2, 4, 4, 4]],
    ['A str. +', ['x', 7, 9, 8, 9, 0]],
    ['E str. +', [0, 2, 1, 1, 0, 0]],
    ['E str.', [0, 'x', 1, 1, 0, 0]],
  ],
  5: [ // F
    ['A str.', ['x', 8, 'x', 9, 10, 8]],
    ['D str.', ['x', 'x', 3, 5, 5, 5]],
    ['A str. +', ['x', 8, 10, 9, 10, 0]],
    ['E str.', [1, 'x', 2, 2, 1, 0]],
  ],
  6: [ // F#
    ['A str.', ['x', 9, 'x', 10, 11, 9]],
    ['D str.', ['x', 'x', 4, 6, 6, 6]],
  ],
  7: [ // G
    ['A str.', ['x', 10, 'x', 11, 12, 10]],
    ['D str.', ['x', 'x', 5, 7, 7, 7]],
  ],
  8: [ // Ab
    ['A str.', ['x', 11, 'x', 12, 13, 11]],
    ['D str.', ['x', 'x', 6, 8, 8, 8]],
  ],
  9: [ // A
    ['A str.', ['x', 0, 'x', 1, 2, 0]],
    ['D str.', ['x', 'x', 7, 9, 9, 9]],
    ['A str. +', ['x', 0, 2, 1, 2, 0]],
    ['E str.', [5, 'x', 6, 6, 5, 0]],
  ],
  10: [ // Bb
    ['A str.', ['x', 1, 'x', 2, 3, 1]],
    ['D str.', ['x', 'x', 8, 10, 10, 10]],
  ],
  11: [ // B
    ['A str.', ['x', 2, 'x', 3, 4, 2]],
    ['D str.', ['x', 'x', 9, 11, 11, 11]],
  ],
}

export function getStandardMaj7Voicings(
  rootSemitone: number,
): Array<{ voicing: Voicing; label: string }> {
  return (MAJ7_ROOT[rootSemitone] ?? []).map(([label, frets]) => ({
    label,
    voicing: rawToVoicing(frets),
  }))
}
