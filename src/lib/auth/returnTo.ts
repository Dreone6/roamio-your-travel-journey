/**
 * "Where was the user going?" — preserved across an authentication detour.
 *
 * Only a sanitized, same-origin *path* is ever stored. No tokens, no session
 * material: this is ordinary non-sensitive UI state, so it lives in
 * sessionStorage on web and in Capacitor Preferences on native (so a cold app
 * start triggered by a deep link can still restore the destination).
 */
import { Preferences } from "@capacitor/preferences";
import { platform } from "@/lib/native/platform";

const KEY = "roavr_return_to";

/**
 * Accepts only same-origin absolute paths. Rejects protocol-relative (`//evil`),
 * absolute URLs, and anything with a scheme — an open-redirect can otherwise
 * turn "sign in and come back" into "sign in and get phished".
 */
export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  if (value === "/" || value === "/auth") return null;
  return value;
}

export function saveReturnTo(path: string | null | undefined): void {
  const safe = sanitizeReturnTo(path);
  if (!safe) return;
  try {
    sessionStorage.setItem(KEY, safe);
  } catch {
    /* storage disabled */
  }
  if (platform.isNative) void Preferences.set({ key: KEY, value: safe });
}

/** Reads and clears the stored destination. */
export function consumeReturnTo(): string | null {
  let value: string | null = null;
  try {
    value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage disabled */
  }
  if (platform.isNative) void Preferences.remove({ key: KEY });
  return sanitizeReturnTo(value);
}

/** Cold-start (native) restore: Preferences survives process death. */
export async function hydrateReturnTo(): Promise<void> {
  if (!platform.isNative) return;
  try {
    const { value } = await Preferences.get({ key: KEY });
    const safe = sanitizeReturnTo(value);
    if (safe && !sessionStorage.getItem(KEY)) sessionStorage.setItem(KEY, safe);
  } catch {
    /* ignore */
  }
}

export const RETURN_TO_KEY = KEY;
