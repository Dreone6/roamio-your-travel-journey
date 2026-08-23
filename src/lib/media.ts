import { supabase } from "@/integrations/supabase/client";

/**
 * User-generated media (camera captures, stories, check-in photos) lives in the
 * PRIVATE `user-media` bucket. Rows store a token — `user-media:<path>` — rather
 * than a public URL, and viewers resolve it to a short-lived signed URL. Storage
 * policies mirror the row's visibility (owner / accepted followers / public),
 * so follower-only media is never reachable by URL guessing.
 *
 * Legacy rows that still hold an `http(s)` URL keep working untouched.
 */
export const USER_MEDIA_BUCKET = "user-media";
const TOKEN_PREFIX = `${USER_MEDIA_BUCKET}:`;
const SIGNED_TTL_SECONDS = 60 * 60;

const cache = new Map<string, { url: string; expiresAt: number }>();

export function isMediaToken(value: string | null | undefined): boolean {
  return !!value && value.startsWith(TOKEN_PREFIX);
}

export function mediaToken(path: string): string {
  return `${TOKEN_PREFIX}${path}`;
}

/** Uploads a file to the private bucket and returns the token to persist. */
export async function uploadUserMedia(file: File | Blob, userId: string, ext = "jpg"): Promise<string> {
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(USER_MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return mediaToken(path);
}

/** Resolves one stored media value into something an <img>/<video> can render. */
export async function resolveMediaUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (!isMediaToken(value)) return value;
  const path = value.slice(TOKEN_PREFIX.length);
  const hit = cache.get(path);
  if (hit && hit.expiresAt > Date.now()) return hit.url;
  const { data } = await supabase.storage.from(USER_MEDIA_BUCKET).createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (!data?.signedUrl) return null;
  cache.set(path, { url: data.signedUrl, expiresAt: Date.now() + (SIGNED_TTL_SECONDS - 60) * 1000 });
  return data.signedUrl;
}

/**
 * Batch variant used at data-load boundaries so a list render does not fire one
 * signing request per row.
 */
export async function resolveMediaUrls(values: (string | null | undefined)[]): Promise<(string | null)[]> {
  const tokens = Array.from(new Set(values.filter(isMediaToken) as string[]));
  const resolved = new Map<string, string | null>();
  await Promise.all(
    tokens.map(async (t) => {
      resolved.set(t, await resolveMediaUrl(t));
    })
  );
  return values.map((v) => (isMediaToken(v) ? resolved.get(v as string) ?? null : v ?? null));
}
