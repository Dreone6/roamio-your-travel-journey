/**
 * Deep-link routing decisions — pure, so both the native handler and the tests
 * exercise exactly the same logic.
 *
 * Inputs: a parsed link + whether the user currently has a session.
 * Output: what the app should do. Nothing here reads or writes data; RLS
 * remains the authorisation boundary. The worst a hostile link can do is land
 * a signed-in user on a screen they could have reached from the UI.
 */
import { parseDeepLink, type ParsedDeepLink } from "./deepLinks";
import { sanitizeReturnTo } from "./returnTo";

export type DeepLinkAction =
  | { kind: "ignore"; reason: string }
  | { kind: "oauth"; search: string; hash: string }
  | { kind: "navigate"; path: string }
  | { kind: "authenticate"; path: string; returnTo: string };

export interface RouteContext {
  authenticated: boolean;
}

export function resolveDeepLink(
  input: URL | string | ParsedDeepLink | null,
  ctx: RouteContext,
): DeepLinkAction {
  const link =
    input && typeof input === "object" && "pathname" in input
      ? (input as ParsedDeepLink)
      : parseDeepLink(input as URL | string);

  if (!link) return { kind: "ignore", reason: "unrecognised-link" };

  if (link.isOAuthCallback) {
    return { kind: "oauth", search: link.search, hash: link.hash };
  }

  if (link.isPublic || ctx.authenticated) {
    return { kind: "navigate", path: link.path };
  }

  // Protected destination without a session: park at /auth and remember where
  // they were going. Only a sanitized same-origin path is ever preserved.
  const returnTo = sanitizeReturnTo(link.path);
  return { kind: "authenticate", path: "/auth", returnTo: returnTo ?? "/home" };
}

/** Destination for a notification tap, honouring the same auth rules. */
export function resolveNotificationRoute(path: string, ctx: RouteContext): DeepLinkAction {
  return resolveDeepLink(`roavr:/${path}`, ctx);
}
