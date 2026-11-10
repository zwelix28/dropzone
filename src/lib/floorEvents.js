import { isLocalMode } from "./localMode.js";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";
import { uploadMixCover } from "./uploadMixCover.js";
import { randomUUID } from "./uuid.js";

const LOCAL_KEY = "dhlab.floor-events";
const MAX_TITLE = 120;
const MAX_VENUE = 120;
const MAX_CITY = 80;
const MAX_URL = 500;
const MAX_LINEUP = 500;

export const FLOOR_STATUS_PENDING = "pending";
export const FLOOR_STATUS_APPROVED = "approved";
export const FLOOR_STATUS_REJECTED = "rejected";

function mapRow(data) {
  if (!data) return null;
  return {
    id: data.id,
    title: data.title || "",
    venue: data.venue || "",
    city: data.city || "",
    startsAt: data.starts_at || data.startsAt || "",
    endsAt: data.ends_at || data.endsAt || "",
    flyerUrl: data.flyer_url || data.flyerUrl || "",
    ticketUrl: data.ticket_url || data.ticketUrl || "",
    detailsUrl: data.details_url || data.detailsUrl || "",
    lineup: data.lineup || "",
    isFeatured: Boolean(data.is_featured ?? data.isFeatured),
    isPublished: data.is_published ?? data.isPublished ?? true,
    isPromoting: Boolean(data.is_promoting ?? data.isPromoting),
    status: data.status || FLOOR_STATUS_APPROVED,
    submitterId: data.submitter_id || data.submitterId || null,
    reviewNote: data.review_note || data.reviewNote || "",
    sortOrder: Number(data.sort_order ?? data.sortOrder ?? 0),
    submittedAt: data.submitted_at || data.submittedAt || null,
    updatedAt: data.updated_at || data.updatedAt || null,
  };
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(mapRow).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

function sortEvents(list) {
  return [...list].sort((a, b) => {
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
    const aTime = new Date(a.startsAt).getTime() || 0;
    const bTime = new Date(b.startsAt).getTime() || 0;
    if (aTime !== bTime) return aTime - bTime;
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });
}

function isSafeHttpUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function validateEvent(input, { requireVenue = false } = {}) {
  const title = (input.title || "").trim();
  const venue = (input.venue || "").trim();
  const city = (input.city || "").trim();
  const startsAt = (input.startsAt || "").trim();
  const endsAt = (input.endsAt || "").trim();
  const ticketUrl = (input.ticketUrl || "").trim();
  const detailsUrl = (input.detailsUrl || "").trim();
  const lineup = (input.lineup || "").trim();

  if (!title) return { ok: false, error: "Add an event title." };
  if (title.length > MAX_TITLE) return { ok: false, error: `Title must be ${MAX_TITLE} characters or fewer.` };
  if (requireVenue && !venue) return { ok: false, error: "Add a venue." };
  if (venue.length > MAX_VENUE) return { ok: false, error: `Venue must be ${MAX_VENUE} characters or fewer.` };
  if (city.length > MAX_CITY) return { ok: false, error: `City must be ${MAX_CITY} characters or fewer.` };
  if (!startsAt) return { ok: false, error: "Set a start date and time." };
  if (Number.isNaN(new Date(startsAt).getTime())) return { ok: false, error: "Start date is invalid." };
  if (endsAt && Number.isNaN(new Date(endsAt).getTime())) return { ok: false, error: "End date is invalid." };
  if (ticketUrl.length > MAX_URL || detailsUrl.length > MAX_URL) {
    return { ok: false, error: "Links must be 500 characters or fewer." };
  }
  if (ticketUrl && !isSafeHttpUrl(ticketUrl)) {
    return { ok: false, error: "Ticket link must be an http(s) URL." };
  }
  if (detailsUrl && !isSafeHttpUrl(detailsUrl)) {
    return { ok: false, error: "Details link must be an http(s) URL." };
  }
  if (lineup.length > MAX_LINEUP) return { ok: false, error: `Lineup must be ${MAX_LINEUP} characters or fewer.` };

  return {
    ok: true,
    value: {
      title,
      venue,
      city,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      ticketUrl,
      detailsUrl,
      lineup,
      isFeatured: Boolean(input.isFeatured),
      isPublished: input.isPublished !== false,
      isPromoting: Boolean(input.isPromoting),
      sortOrder: Number(input.sortOrder) || 0,
    },
  };
}

async function resolveFlyerUrl(input, uploaderId) {
  let flyerUrl = (input.existingFlyerUrl || "").trim();
  if (!input.flyerFile) return { ok: true, flyerUrl };

  if (isLocalMode()) {
    if (input.flyerFile.size > 2.5 * 1024 * 1024) {
      return { ok: false, error: "While Supabase is paused, use a flyer under 2.5 MB." };
    }
    try {
      flyerUrl = await readFile(input.flyerFile);
    } catch {
      return { ok: false, error: "Could not read that flyer image." };
    }
    return { ok: true, flyerUrl };
  }

  try {
    flyerUrl = await uploadMixCover(input.flyerFile, uploaderId);
    return { ok: true, flyerUrl };
  } catch (err) {
    return { ok: false, error: err?.message || "Could not upload the flyer." };
  }
}

/** Published upcoming + ongoing events for Home. Featured first. */
export async function listFloorEventsForHome({ limit = 4 } = {}) {
  const { rows, error } = await listFloorEvents({ includeUnpublished: false });
  if (error) return { rows: [], error };

  const now = Date.now();
  const visible = rows.filter((row) => {
    if (row.status && row.status !== FLOOR_STATUS_APPROVED) return false;
    const start = new Date(row.startsAt).getTime();
    const end = row.endsAt ? new Date(row.endsAt).getTime() : start + 12 * 60 * 60 * 1000;
    return end >= now - 6 * 60 * 60 * 1000;
  });

  return { rows: sortEvents(visible).slice(0, limit), error: null };
}

export async function listFloorEvents({ includeUnpublished = true, status = null } = {}) {
  if (isLocalMode()) {
    let rows = readLocal();
    if (!includeUnpublished) rows = rows.filter((row) => row.isPublished && row.status === FLOOR_STATUS_APPROVED);
    if (status) rows = rows.filter((row) => row.status === status);
    return { rows: sortEvents(rows), error: null };
  }

  if (!isSupabaseConfigured()) return { rows: [], error: null };

  let query = supabase.from("floor_events").select("*").order("starts_at", { ascending: true });
  if (!includeUnpublished) {
    query = query.eq("is_published", true).eq("status", FLOOR_STATUS_APPROVED);
  }
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return { rows: [], error: formatDbError(error) };
  return { rows: sortEvents((data || []).map(mapRow).filter(Boolean)), error: null };
}

/** Admin create/update (can publish immediately). */
export async function saveFloorEvent(input) {
  const checked = validateEvent(input);
  if (!checked.ok) return checked;

  const flyer = await resolveFlyerUrl(input, input.adminId);
  if (!flyer.ok) return flyer;
  if (!flyer.flyerUrl) return { ok: false, error: "Upload an event flyer." };

  const payload = {
    ...checked.value,
    flyerUrl: flyer.flyerUrl,
    status: input.status || FLOOR_STATUS_APPROVED,
    submitterId: input.submitterId || null,
  };

  if (isLocalMode()) {
    const rows = readLocal();
    const id = input.id || randomUUID();
    const nextRow = {
      id,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    let next = rows.filter((row) => row.id !== id);
    if (payload.isFeatured) next = next.map((row) => ({ ...row, isFeatured: false }));
    next.push(nextRow);
    try {
      writeLocal(next);
    } catch {
      return { ok: false, error: "That flyer is too large to store in this browser. Try a smaller image." };
    }
    return { ok: true, row: nextRow };
  }

  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured." };

  const dbPayload = {
    title: payload.title,
    venue: payload.venue,
    city: payload.city,
    starts_at: payload.startsAt,
    ends_at: payload.endsAt,
    flyer_url: payload.flyerUrl,
    ticket_url: payload.ticketUrl,
    details_url: payload.detailsUrl,
    lineup: payload.lineup,
    is_featured: payload.isFeatured,
    is_published: payload.isPublished,
    is_promoting: payload.isPromoting,
    status: payload.status,
    sort_order: payload.sortOrder,
    updated_at: new Date().toISOString(),
    updated_by: input.adminId || null,
  };

  if (payload.isFeatured) {
    await supabase
      .from("floor_events")
      .update({ is_featured: false })
      .neq("id", input.id || "00000000-0000-0000-0000-000000000000");
  }

  if (input.id) {
    const { data, error } = await supabase.from("floor_events").update(dbPayload).eq("id", input.id).select("*").single();
    if (error) return { ok: false, error: formatDbError(error) };
    return { ok: true, row: mapRow(data) };
  }

  const { data, error } = await supabase.from("floor_events").insert(dbPayload).select("*").single();
  if (error) return { ok: false, error: formatDbError(error) };
  return { ok: true, row: mapRow(data) };
}

/** Member submission — always pending until admin approval. */
export async function submitFloorEvent(input) {
  const uid = input.submitterId;
  if (!uid) return { ok: false, error: "Sign in to submit an event." };

  const checked = validateEvent(input, { requireVenue: true });
  if (!checked.ok) return checked;

  const flyer = await resolveFlyerUrl(input, uid);
  if (!flyer.ok) return flyer;
  if (!flyer.flyerUrl) return { ok: false, error: "Upload an event flyer." };

  const nowIso = new Date().toISOString();
  const payload = {
    ...checked.value,
    flyerUrl: flyer.flyerUrl,
    isFeatured: false,
    isPublished: false,
    status: FLOOR_STATUS_PENDING,
    submitterId: uid,
    isPromoting: Boolean(input.isPromoting),
    submittedAt: nowIso,
  };

  if (isLocalMode()) {
    // Local testing: publish immediately so Home can show multiple promotions without admin review.
    const nextRow = {
      id: randomUUID(),
      ...payload,
      status: FLOOR_STATUS_APPROVED,
      isPublished: true,
      updatedAt: nowIso,
    };
    const next = [...readLocal(), nextRow];
    try {
      writeLocal(next);
    } catch {
      return { ok: false, error: "That flyer is too large to store in this browser. Try a smaller image." };
    }
    return { ok: true, row: nextRow };
  }

  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured." };

  const { data, error } = await supabase
    .from("floor_events")
    .insert({
      title: payload.title,
      venue: payload.venue,
      city: payload.city,
      starts_at: payload.startsAt,
      ends_at: payload.endsAt,
      flyer_url: payload.flyerUrl,
      ticket_url: payload.ticketUrl,
      details_url: payload.detailsUrl,
      lineup: payload.lineup,
      is_featured: false,
      is_published: false,
      is_promoting: payload.isPromoting,
      status: FLOOR_STATUS_PENDING,
      submitter_id: uid,
      submitted_at: nowIso,
      updated_at: nowIso,
      updated_by: uid,
    })
    .select("*")
    .single();

  if (error) return { ok: false, error: formatDbError(error) };
  return { ok: true, row: mapRow(data) };
}

export async function reviewFloorEvent({ id, status, reviewNote = "", adminId, isFeatured = false }) {
  if (!id) return { ok: false, error: "Missing event id." };
  if (status !== FLOOR_STATUS_APPROVED && status !== FLOOR_STATUS_REJECTED) {
    return { ok: false, error: "Choose approve or reject." };
  }

  const nowIso = new Date().toISOString();

  if (isLocalMode()) {
    const rows = readLocal();
    const idx = rows.findIndex((row) => row.id === id);
    if (idx < 0) return { ok: false, error: "Event not found." };
    let next = rows.slice();
    if (status === FLOOR_STATUS_APPROVED && isFeatured) {
      next = next.map((row) => ({ ...row, isFeatured: false }));
    }
    next[idx] = {
      ...next[idx],
      status,
      isPublished: status === FLOOR_STATUS_APPROVED,
      isFeatured: status === FLOOR_STATUS_APPROVED ? Boolean(isFeatured) : false,
      reviewNote: (reviewNote || "").trim(),
      updatedAt: nowIso,
    };
    writeLocal(next);
    return { ok: true, row: next[idx] };
  }

  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured." };

  if (status === FLOOR_STATUS_APPROVED && isFeatured) {
    await supabase.from("floor_events").update({ is_featured: false }).neq("id", id);
  }

  const { data, error } = await supabase
    .from("floor_events")
    .update({
      status,
      is_published: status === FLOOR_STATUS_APPROVED,
      is_featured: status === FLOOR_STATUS_APPROVED ? Boolean(isFeatured) : false,
      review_note: (reviewNote || "").trim(),
      reviewed_at: nowIso,
      reviewed_by: adminId || null,
      updated_at: nowIso,
      updated_by: adminId || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { ok: false, error: formatDbError(error) };
  return { ok: true, row: mapRow(data) };
}

export async function deleteFloorEvent(id) {
  if (!id) return { ok: false, error: "Missing event id." };

  if (isLocalMode()) {
    writeLocal(readLocal().filter((row) => row.id !== id));
    return { ok: true };
  }

  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured." };
  const { error } = await supabase.from("floor_events").delete().eq("id", id);
  if (error) return { ok: false, error: formatDbError(error) };
  return { ok: true };
}

function formatDbError(error) {
  const missing = /floor_events|schema cache|does not exist|status|submitter_id|lineup|is_promoting/i.test(
    error.message || "",
  );
  if (missing && /status|submitter_id|lineup|is_promoting/i.test(error.message || "")) {
    return import.meta.env.DEV
      ? "Run supabase/floor-events-submissions.sql in the Supabase SQL editor, then try again."
      : "Could not save the event. Please try again later.";
  }
  if (missing) {
    return import.meta.env.DEV
      ? "Run supabase/floor-events.sql (then floor-events-submissions.sql) in the Supabase SQL editor, then try again."
      : "Could not save the event. Please try again later.";
  }
  return error.message || "Could not save the event.";
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

export function formatFloorEventWhen(startsAt, endsAt) {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return "";
  const now = Date.now();
  const end = endsAt ? new Date(endsAt) : null;
  const endMs = end && !Number.isNaN(end.getTime()) ? end.getTime() : start.getTime() + 12 * 60 * 60 * 1000;
  if (start.getTime() <= now && endMs >= now) return "Happening now";

  const sameDay =
    start.toDateString() === new Date().toDateString()
      ? "Today"
      : start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${sameDay} · ${time}`;
}

export function formatFloorEventPlace(venue, city) {
  const bits = [venue, city].map((part) => (part || "").trim()).filter(Boolean);
  return bits.join(" · ");
}

export function floorStatusLabel(status) {
  if (status === FLOOR_STATUS_PENDING) return "Pending review";
  if (status === FLOOR_STATUS_REJECTED) return "Rejected";
  return "Approved";
}
