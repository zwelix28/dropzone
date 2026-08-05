import { Upload as TusUpload } from "tus-js-client";
import { supabase } from "./supabaseClient.js";

/** Supabase Storage requires 6MB TUS chunks. */
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;
/** Use resumable upload for anything larger than one chunk. */
const RESUMABLE_THRESHOLD_BYTES = TUS_CHUNK_SIZE;

function readViteEnv(value) {
  if (value == null || typeof value !== "string") return "";
  let s = value.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function projectRefFromSupabaseUrl(url) {
  try {
    const host = new URL(url).hostname; // e.g. puoszqxiugositqtfzlt.supabase.co
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

function tusEndpoint() {
  const url = readViteEnv(import.meta.env.VITE_SUPABASE_URL);
  const ref = projectRefFromSupabaseUrl(url);
  if (ref) {
    // Direct storage hostname — required for good large-file performance
    return `https://${ref}.storage.supabase.co/storage/v1/upload/resumable`;
  }
  return `${url.replace(/\/$/, "")}/storage/v1/upload/resumable`;
}

function guessContentType(file) {
  if (file?.type) return file.type;
  const name = String(file?.name || "").toLowerCase();
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".flac")) return "audio/flac";
  if (name.endsWith(".aac") || name.endsWith(".m4a")) return "audio/aac";
  if (name.endsWith(".ogg")) return "audio/ogg";
  return "audio/mpeg";
}

/**
 * Upload to mix-audio with live progress.
 * Uses TUS resumable uploads for files ≥ 6MB (recommended by Supabase for large mixes).
 *
 * @param {object} opts
 * @param {File|Blob} opts.file
 * @param {string} opts.path - object path inside the bucket
 * @param {(pct: number) => void} [opts.onProgress] - 0–100 for the audio transfer only
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ path: string }>}
 */
export async function uploadMixAudio({ file, path, onProgress, signal }) {
  if (!file) throw new Error("No audio file selected");
  if (!path) throw new Error("Storage path required");

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const session = sessionData?.session;
  if (!session?.access_token) throw new Error("Sign in to upload");

  if (file.size < RESUMABLE_THRESHOLD_BYTES) {
    const { error } = await supabase.storage.from("mix-audio").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: guessContentType(file),
    });
    if (error) throw error;
    onProgress?.(100);
    return { path };
  }

  const anonKey = readViteEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

  await new Promise((resolve, reject) => {
    const upload = new TusUpload(file, {
      endpoint: tusEndpoint(),
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: "mix-audio",
        objectName: path,
        contentType: guessContentType(file),
        cacheControl: "3600",
      },
      chunkSize: TUS_CHUNK_SIZE,
      onError(error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (!bytesTotal) return;
        const pct = Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100));
        onProgress?.(pct);
      },
      onSuccess() {
        onProgress?.(100);
        resolve();
      },
    });

    const abort = () => {
      try {
        upload.abort(true);
      } catch {
        /* ignore */
      }
      reject(new Error("Upload cancelled"));
    };
    if (signal) {
      if (signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener("abort", abort, { once: true });
    }

    upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      })
      .catch(reject);
  });

  return { path };
}

/** Default client-side ceiling for Pro projects (raise Storage global limit in Dashboard to match). */
export const DEFAULT_MAX_AUDIO_MB = 250;

export function readMaxAudioMb() {
  const raw = import.meta.env.VITE_MAX_AUDIO_MB;
  if (raw === undefined || raw === "") return DEFAULT_MAX_AUDIO_MB;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_AUDIO_MB;
}
