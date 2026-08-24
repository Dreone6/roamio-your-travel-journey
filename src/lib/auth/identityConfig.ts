/**
 * Native identity configuration — the app-side half of Sign in with Apple,
 * Google OAuth and Universal / App Links.
 *
 * NOTHING SECRET LIVES HERE. Only public identifiers (Services IDs, OAuth
 * client IDs, bundle IDs, domains) are read, and only from build-time env
 * vars. Apple's .p8 private key, the Apple client-secret JWT and the Google
 * client secret are configured in the Lovable Cloud auth settings and are
 * never shipped to a device.
 *
 * Every value is optional: an unset value means "owner configuration
 * required", which the diagnostics surface reports honestly instead of the app
 * pretending the integration is live.
 */

const env = import.meta.env as Record<string, string | undefined>;

function read(name: string): string | null {
  const value = env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function readList(name: string): string[] {
  const value = read(name);
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase())
    .filter(Boolean);
}

export interface IdentityConfig {
  /** iOS bundle id / Android applicationId used for the native OAuth audience. */
  appId: string | null;
  /** Apple Services ID (the web/OAuth client id registered in Apple Developer). */
  appleServicesId: string | null;
  /** Apple Team ID — only used to render setup guidance and AASA templates. */
  appleTeamId: string | null;
  /** Google OAuth client id used by the iOS app (separate from the web client). */
  googleIosClientId: string | null;
  /** Google OAuth client id used by the Android app. */
  googleAndroidClientId: string | null;
  /** Google *web* client id — the one Supabase itself is configured with. */
  googleWebClientId: string | null;
  /** Hosts allowed to open the app via Universal / App Links. */
  universalLinkHosts: string[];
  /** True once the owner has published the domain association files. */
  associatedDomainsVerified: boolean;
}

export const identityConfig: IdentityConfig = {
  appId: read("VITE_NATIVE_APP_ID") ?? "app.lovable.p5f9b5ca8aa1d4b7781099bda94ab9271",
  appleServicesId: read("VITE_APPLE_SERVICES_ID"),
  appleTeamId: read("VITE_APPLE_TEAM_ID"),
  googleIosClientId: read("VITE_GOOGLE_IOS_CLIENT_ID"),
  googleAndroidClientId: read("VITE_GOOGLE_ANDROID_CLIENT_ID"),
  googleWebClientId: read("VITE_GOOGLE_WEB_CLIENT_ID"),
  universalLinkHosts: readList("VITE_UNIVERSAL_LINK_HOSTS"),
  associatedDomainsVerified: read("VITE_ASSOCIATED_DOMAINS_VERIFIED") === "true",
};

/** Google client id that applies to the current runtime platform, if any. */
export function googleClientIdFor(target: "ios" | "android" | "web"): string | null {
  if (target === "ios") return identityConfig.googleIosClientId;
  if (target === "android") return identityConfig.googleAndroidClientId;
  return identityConfig.googleWebClientId;
}

/** Hosts that may deliver an https deep link into the app. */
export function isUniversalLinkHost(host: string): boolean {
  return identityConfig.universalLinkHosts.includes(host.toLowerCase());
}
