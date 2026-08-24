/**
 * Deep-link normalisation.
 *
 * A link can arrive as:
 *   - a custom scheme:      roavr://u/andre           (registered, works today)
 *   - a Universal / App Link: https://<host>/u/andre  (requires verified domain
 *     association files — see docs/native-boundaries.md; NOT verified yet)
 *   - an OAuth return:      roavr://auth-callback?code=...
 *
 * All of them are reduced to an in-app router path plus an auth-requirement
 * flag. Routing decisions never grant data access: RLS still governs every
 * read, so a deep link can only ever take a user to a screen they could have
 * navigated to by hand.
 */

export const APP_SCHEME = "roavr";
export const OAUTH_CALLBACK_PATH = "/auth-callback";

/** Routes that render for signed-out users. Everything else needs a session. */
const PUBLIC_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/auth$/,
  /^\/onboarding$/,
  /^\/i\/[^/]+$/, // shared itinerary token (server-side token scope, read-only)
];

/** Routes we are willing to open from an external link. */
const ALLOWED_PATTERNS: RegExp[] = [
  ...PUBLIC_PATTERNS,
  /^\/home$/,
  /^\/u\/[^/]+$/,
  /^\/passport(\/[^/]+)?$/,
  /^\/trips$/,
  /^\/trips\/[^/]+$/,
  /^\/messages$/,
  /^\/messages\/[^/]+$/,
  /^\/globe$/,
  /^\/discover$/,
  /^\/explore$/,
  /^\/nearby$/,
  /^\/profile$/,
  /^\/notifications$/,
  /^\/settings$/,
  /^\/settings\/notifications$/,
];

export interface ParsedDeepLink {
  /** In-app router path, e.g. `/u/andre?ref=x`. */
  path: string;
  /** Path without query/hash. */
  pathname: string;
  /** True when the destination renders without a session. */
  isPublic: boolean;
  /** True when this link is an OAuth provider return. */
  isOAuthCallback: boolean;
  /** Raw query string (leading `?`) — used by the OAuth code exchange. */
  search: string;
  hash: string;
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATTERNS.some((p) => p.test(pathname));
}

function isAllowedPath(pathname: string) {
  return ALLOWED_PATTERNS.some((p) => p.test(pathname));
}

/**
 * Turns an inbound URL into a routing decision, or `null` when the link points
 * at nothing we recognise (never navigate blindly on an untrusted URL).
 */
export function parseDeepLink(input: URL | string): ParsedDeepLink | null {
  let url: URL;
  try {
    url = typeof input === "string" ? new URL(input) : input;
  } catch {
    return null;
  }

  const custom = url.protocol.replace(":", "").toLowerCase() === APP_SCHEME;
  // roavr://u/andre parses with host="u" and pathname="/andre".
  let pathname = custom
    ? `/${[url.hostname, url.pathname.replace(/^\//, "")].filter(Boolean).join("/")}`
    : url.pathname;
  pathname = pathname.replace(/\/+$/, "") || "/";

  const isOAuthCallback =
    pathname === OAUTH_CALLBACK_PATH ||
    pathname === "/auth/callback" ||
    /[?#].*\b(code|access_token)=/.test(url.href);

  if (isOAuthCallback) {
    return {
      path: OAUTH_CALLBACK_PATH,
      pathname: OAUTH_CALLBACK_PATH,
      isPublic: true,
      isOAuthCallback: true,
      search: url.search,
      hash: url.hash,
    };
  }

  if (!isAllowedPath(pathname)) return null;

  return {
    path: `${pathname}${url.search}${url.hash}`,
    pathname,
    isPublic: isPublicPath(pathname),
    isOAuthCallback: false,
    search: url.search,
    hash: url.hash,
  };
}
