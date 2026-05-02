# Dropzone (Vite + React)

## Run

```bash
npm install
npm run dev
```

### Let’s DJ — optional Node API (MongoDB + Multer)

The web app works fully in the browser for local files. To exercise the **Express** routes (`POST /api/dj/tracks`, `POST /api/dj/mixes`), run the small server alongside Vite (proxy is already configured for `/api` and `/files`):

```bash
cd server && cp .env.example .env   # edit MONGODB_URI if you want DB writes
npm install
npm start
```

In another terminal, from the repo root:

```bash
npm run dev
```

Open [http://localhost:5173/dj](http://localhost:5173/dj). Leave `VITE_DJ_API_URL` unset so the client calls `/api` through the Vite proxy. If the API runs elsewhere, set `VITE_DJ_API_URL` to that origin (no trailing slash).

**Testing:** load MP3/WAV on decks A & B, click the page once if audio is suspended, adjust crossfader and FX, use **Sync BPM** to align deck B to deck A’s effective tempo, toggle **Auto mix** with queued tracks, **record** then **Publish** (requires sign-in + Supabase).

## Routes

- `/` Home
- `/discover` Discover
- `/live` Live
- `/top10` Top10
- `/upload` Upload
- `/dj` **Let’s DJ** — two-deck Web Audio mixer (waveforms, crossfader, tempo/BPM hint, FX, auto mix, record, publish to profile via Supabase)
- `/profile` Profile
- `/stats` Stats
- `/settings` Settings

