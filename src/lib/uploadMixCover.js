import { supabase } from "./supabaseClient.js";
import { randomUUID } from "./uuid.js";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_COVER_BYTES = 10 * 1024 * 1024;

/**
 * Upload replacement cover art into the authenticated admin's storage folder.
 * Returns the public URL used by mixes.cover_url.
 */
export async function uploadMixCover(file, userId) {
  if (!file || !userId) throw new Error("Choose a cover image first.");
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Cover artwork must be a JPG, PNG, or WebP image.");
  }
  if (file.size > MAX_COVER_BYTES) {
    throw new Error("Cover artwork must be smaller than 10 MB.");
  }

  const extByType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extByType[file.type] || "jpg";
  const path = `${userId}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("mix-covers").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  return supabase.storage.from("mix-covers").getPublicUrl(path).data.publicUrl;
}
