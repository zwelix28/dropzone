/**
 * Mixes published while VITE_LOCAL_MODE is on.
 * Audio and cover stay in this browser (IndexedDB). Nothing is sent to Supabase.
 * Turn the flag off and these rows are ignored — publish them again through the normal upload.
 */

const DB_NAME = "dhlab-local";
const STORE = "uploads";

/** @type {Map<string, string>} */
const objectUrls = new Map();

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open local upload storage."));
  });
}

function rememberUrl(key, blob) {
  if (!blob) return "";
  const existing = objectUrls.get(key);
  if (existing) return existing;
  const url = URL.createObjectURL(blob);
  objectUrls.set(key, url);
  return url;
}

/**
 * @param {object} record episode fields plus audioBlob and optional coverBlob
 */
export async function saveLocalUpload(record) {
  if (!record?.id || !record.audioBlob) throw new Error("Choose an audio file to upload.");
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Could not save this mix on this device."));
    tx.onabort = () => reject(tx.error || new Error("Could not save this mix on this device."));
    tx.objectStore(STORE).put({
      id: record.id,
      userId: record.userId,
      title: record.title,
      description: record.description || "",
      genre: record.genre || "Tech House",
      tags: record.tags || [],
      tracklist: record.tracklist || [],
      durationSecs: record.durationSecs || 0,
      contentType: record.contentType === "single" ? "single" : "mix",
      isForSale: Boolean(record.isForSale),
      priceZar: record.priceZar ?? null,
      createdAt: record.createdAt || new Date().toISOString(),
      audioBlob: record.audioBlob,
      coverBlob: record.coverBlob || null,
    });
  });
  db.close();
}

/** Newest local uploads first, with playable blob URLs. */
export async function listLocalUploadEpisodes() {
  let db;
  try {
    db = await openDb();
  } catch {
    return [];
  }
  const rows = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  db.close();

  return rows
    .map((row) => ({
      id: row.id,
      userId: row.userId,
      title: row.title,
      description: row.description || "",
      genre: row.genre || "",
      tags: Array.isArray(row.tags) ? row.tags : [],
      coverUrl: row.coverBlob ? rememberUrl(`cover:${row.id}`, row.coverBlob) : "/DeepHouseLabLogo.png",
      audioUrl: rememberUrl(`audio:${row.id}`, row.audioBlob),
      audioStoragePath: "",
      audioPreviewPath: "",
      durationSecs: row.durationSecs || 0,
      plays: 0,
      downloads: 0,
      shares: 0,
      likesCount: 0,
      createdAt: row.createdAt,
      tracklist: Array.isArray(row.tracklist) ? row.tracklist : [],
      trending: 999,
      isForSale: Boolean(row.isForSale),
      priceZar: row.priceZar != null ? Number(row.priceZar) : null,
      salesCount: 0,
      contentType: row.contentType === "single" ? "single" : "mix",
      status: "approved",
      reviewNote: "",
      reviewedAt: null,
      submittedAt: null,
    }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}
