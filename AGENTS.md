# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Dropzone is a React 19 + Vite 5 music/DJ social platform (SoundCloud-like). The frontend is a SPA; the backend is Supabase (hosted BaaS: PostgreSQL, Auth, Storage, Realtime).

### Prerequisites

- **Node.js 20** (specified in `netlify.toml`). Use `nvm use 20` if nvm is available.
- **npm** is the package manager (`package-lock.json`).

### Running the Dev Server

```bash
npm install
npm run dev          # starts Vite on http://localhost:5173
```

The app renders and navigates without Supabase credentials (graceful fallback to empty states). Full data operations require `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set in `.env.local`.

### Building

```bash
npm run build        # outputs to dist/
```

### Lint / Test

No ESLint, Prettier, or test framework is currently configured. The only verification is `npm run build` (which runs `vite build`).

### Optional: Express DJ API

The "Let's DJ" feature is **disabled by default** (`src/featureFlags.js`: `FEATURE_LETS_DJ = false`). Its backend lives in `server/` (Express + Multer, optional MongoDB). To run it:

```bash
cd server && npm install && npm start   # port 3001
```

The Vite config already proxies `/api` and `/files` to `localhost:3001`.

### Key Gotchas

- The Supabase client (`src/lib/supabaseClient.js`) creates a client with placeholder values when env vars are missing — the app won't crash, but all data fetches return empty results.
- `vite.config.js` proxies `/api` and `/files` to `localhost:3001`. If the Express server isn't running, those proxy requests will fail silently; the main SPA still works.
- The build produces a single large JS bundle (>500 kB); this is expected and non-blocking.
