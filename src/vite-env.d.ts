/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** When true, skip cloud Supabase and use a local demo session + seed data. */
  readonly VITE_LOCAL_MODE?: string;
  readonly VITE_MAX_AUDIO_MB?: string;
  /** Base64 URL-safe VAPID public key for Web Push (pair with edge function secrets). */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
