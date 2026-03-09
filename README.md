# Music Idea App

A React + TypeScript app for capturing and organizing music ideas — record audio snippets, tag them, add BPM/key metadata, search/filter your collection, and explore music theory via an interactive Guitar Theory Lab.

## Tech Stack

- React 19 + TypeScript + Vite
- Supabase (auth, database, storage)
- WaveSurfer.js (audio waveform playback)
- React Router 7
- music-tempo (client-side BPM detection)

## Local Development (Mock Mode)

Run the app without a real Supabase connection using the mock flag:

```bash
npm run dev:mock
```

This sets `VITE_DEV_MOCK=true`, which:
- Skips authentication — logs in automatically as `dev@local.test`
- Skips Supabase database calls — ideas are stored in local React state
- Skips Supabase storage — uploaded audio uses `URL.createObjectURL()` for local playback
- Uses a mock profile with username `dev`

No `.env` configuration needed for mock mode. The app runs fully offline.

## Real Supabase Setup

1. Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

2. Run the database migrations in Supabase SQL editor:

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Add user_email column to music_ideas (if not already present)
ALTER TABLE music_ideas ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Add estimated BPM column (auto-detected, separate from user-provided BPM)
ALTER TABLE music_ideas ADD COLUMN IF NOT EXISTS estimated_bpm integer;
```

3. Enable Email OTP in Supabase: Dashboard → Authentication → Providers → Email → enable "Magic Link / OTP"

4. Start the dev server:

```bash
npm run dev
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (requires Supabase `.env`) |
| `npm run dev:mock` | Start dev server in mock mode (no Supabase needed) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |

## Features

- **Passwordless login** — enter email, receive a one-time code, no passwords stored
- **Audio upload & playback** — waveform visualization via WaveSurfer.js, download button on every card
- **Metadata** — BPM, musical key (note + accidental + scale), description
- **BPM detection** — "~ BPM" button on each card runs client-side analysis via `music-tempo` and saves an estimated BPM range (e.g. `est. 115–125 BPM`) in amber, distinct from any user-provided BPM; visible as a read-only hint in the edit form once calculated
- **Pill-style tag picker** — autocomplete from existing tags, keyboard-friendly
- **Search & filter** — real-time text search + advanced filters (date range, BPM range, key, tags with AND/OR logic)
- **User profiles** — set a display username separate from your email
- **Guitar Theory Lab** (`/guitar-theory-lab`) — interactive music theory tools:
  - Circle of fifths — click any key to rotate it to 12 o'clock with spring animation
  - Major/minor mode — click the outer ring for major, inner ring for relative minor
  - Diatonic highlighting — non-diatonic positions dimmed; diatonic arc indicator at outer rim
  - Roman numeral scale degrees shown in the inner ring, relative to the selected tonic
  - Info panel — scale notes, diatonic chord grid (clickable to filter fretboard), key signature badge, relative key link
  - Fretboard — 6-string × 15-fret SVG diagram showing diatonic notes or triad tones (root/3rd/5th color-coded) based on the info panel selection
