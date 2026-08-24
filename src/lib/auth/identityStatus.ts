/**
 * Identity + deep-link configuration status.
 *
 * Distinguishes three states so the app never claims an integration works when
 * only half of it exists:
 *
 *   "ready"        configured, and the backend confirms the provider is enabled
 *   "unverified"   configured locally, but something external is unproven
 *                  (provider flag unknown, domain association not published,
 *                  real-device round trip not yet performed)
 *   "missing"      required credentials / identifiers are absent
 *
 * The provider probe reads Supabase's public `/auth/v1/settings` document,
 * which lists enabled external providers. It contains no secrets.
 */
import { identityConfig } from "./identityConfig";
import { platform } from "@/lib/native/platform";

export type ConfigState = "ready" | "unverified" | "missing";

export interface ConfigCheck {
  id: string;
  label: string;
  state: ConfigState;
  detail: string;
  /** Who has to act when this is not `ready`. */
  owner: "app" | "apple" | "google" | "backend" | "domain" | "device";
}

export interface IdentityStatus {
  checks: ConfigCheck[];
  /** Providers reported enabled by the auth backend, or null when unknown. */
  enabledProviders: string[] | null;
  probedAt: Date;
}

interface AuthSettings {
  external?: Record<string, boolean>;
}

const SETTINGS_TIMEOUT_MS = 6000;

/** Reads the public auth settings document. Returns null when unreachable. */
export async function fetchEnabledProviders(): Promise<string[] | null> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SETTINGS_TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as AuthSettings;
    const external = body.external ?? {};
    return Object.entries(external)
      .filter(([, enabled]) => enabled === true)
      .map(([name]) => name);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function providerCheck(
  id: "apple" | "google",
  label: string,
  owner: ConfigCheck["owner"],
  enabled: string[] | null,
): ConfigCheck {
  if (enabled === null) {
    return {
      id: `${id}-provider`,
      label,
      state: "unverified",
      detail: "Could not reach the auth service to confirm the provider is enabled.",
      owner: "backend",
    };
  }
  return enabled.includes(id)
    ? {
        id: `${id}-provider`,
        label,
        state: "ready",
        detail: "Provider is enabled on the auth backend.",
        owner,
      }
    : {
        id: `${id}-provider`,
        label,
        state: "missing",
        detail: "Provider is disabled on the auth backend. Sign-in will fail.",
        owner: "backend",
      };
}

/** Builds the full status matrix. Pure apart from the provider probe. */
export function buildChecks(enabled: string[] | null): ConfigCheck[] {
  const c = identityConfig;
  const checks: ConfigCheck[] = [];

  checks.push(providerCheck("apple", "Sign in with Apple — provider", "apple", enabled));
  checks.push({
    id: "apple-services-id",
    label: "Apple Services ID",
    state: c.appleServicesId ? "ready" : "missing",
    detail: c.appleServicesId
      ? `Configured (${c.appleServicesId}).`
      : "Set VITE_APPLE_SERVICES_ID to the Services ID registered in Apple Developer.",
    owner: "apple",
  });
  checks.push({
    id: "apple-team-id",
    label: "Apple Team ID",
    state: c.appleTeamId ? "ready" : "missing",
    detail: c.appleTeamId
      ? `Configured (${c.appleTeamId}).`
      : "Set VITE_APPLE_TEAM_ID. Needed for the AASA file and the client-secret JWT.",
    owner: "apple",
  });
  checks.push({
    id: "apple-secret",
    label: "Apple client-secret JWT",
    state: "unverified",
    detail:
      "Held only in the backend auth settings and expires after 6 months. Never shipped in the app, so it cannot be checked from here.",
    owner: "backend",
  });

  checks.push(providerCheck("google", "Google OAuth — provider", "google", enabled));
  checks.push({
    id: "google-ios-client",
    label: "Google iOS client ID",
    state: c.googleIosClientId ? "ready" : "missing",
    detail: c.googleIosClientId
      ? "Configured."
      : "Set VITE_GOOGLE_IOS_CLIENT_ID (Google Cloud → Credentials → iOS OAuth client).",
    owner: "google",
  });
  checks.push({
    id: "google-android-client",
    label: "Google Android client ID",
    state: c.googleAndroidClientId ? "ready" : "missing",
    detail: c.googleAndroidClientId
      ? "Configured."
      : "Set VITE_GOOGLE_ANDROID_CLIENT_ID (requires the release SHA-1 fingerprint).",
    owner: "google",
  });
  checks.push({
    id: "google-web-client",
    label: "Google web client ID (backend)",
    state: c.googleWebClientId ? "ready" : "unverified",
    detail: c.googleWebClientId
      ? "Configured; must match the client ID set on the auth backend."
      : "Optional locally, but the backend Google provider must hold a web client ID and secret.",
    owner: "backend",
  });

  checks.push({
    id: "custom-scheme",
    label: "roavr:// auth callback",
    state: "ready",
    detail:
      "Registered in Info.plist (CFBundleURLTypes) and AndroidManifest.xml. Real-device round trip still required.",
    owner: "app",
  });

  const hosts = c.universalLinkHosts;
  checks.push({
    id: "universal-links",
    label: "iOS Universal Links",
    state: hosts.length === 0 ? "missing" : c.associatedDomainsVerified ? "ready" : "unverified",
    detail:
      hosts.length === 0
        ? "Set VITE_UNIVERSAL_LINK_HOSTS once the production domain is chosen."
        : c.associatedDomainsVerified
          ? `Associated Domains verified for ${hosts.join(", ")}.`
          : `Hosts declared (${hosts.join(", ")}) but apple-app-site-association is not confirmed published. Add the applinks: entitlement in Xcode.`,
    owner: "domain",
  });
  checks.push({
    id: "app-links",
    label: "Android App Links",
    state: hosts.length === 0 ? "missing" : c.associatedDomainsVerified ? "ready" : "unverified",
    detail:
      hosts.length === 0
        ? "Set VITE_UNIVERSAL_LINK_HOSTS once the production domain is chosen."
        : c.associatedDomainsVerified
          ? `assetlinks.json verified for ${hosts.join(", ")}.`
          : "The autoVerify intent-filter stays commented out until /.well-known/assetlinks.json is published with the release signing fingerprint.",
    owner: "domain",
  });

  checks.push({
    id: "device-verification",
    label: "Real-device verification",
    state: "unverified",
    detail: platform.isNative
      ? "Running natively. Complete one Apple and one Google sign-in, plus one link of each type, on a physical device."
      : "Running on web. Native sign-in and link handling can only be proven on a device or simulator build.",
    owner: "device",
  });

  return checks;
}

export async function getIdentityStatus(): Promise<IdentityStatus> {
  const enabledProviders = await fetchEnabledProviders();
  return { checks: buildChecks(enabledProviders), enabledProviders, probedAt: new Date() };
}

/** Worst state across a set of checks, used for headline badges. */
export function rollup(checks: ConfigCheck[]): ConfigState {
  if (checks.some((c) => c.state === "missing")) return "missing";
  if (checks.some((c) => c.state === "unverified")) return "unverified";
  return "ready";
}
