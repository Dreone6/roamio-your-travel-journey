/**
 * Provider sign-in (Apple / Google) for web and native.
 *
 * Web    → the Lovable Cloud managed OAuth broker (`lovable.auth.signInWithOAuth`),
 *          unchanged behaviour.
 * Native → Supabase's own OAuth endpoint opened in the system browser
 *          (SFSafariViewController / Chrome Custom Tab, which is what Apple and
 *          Google require — an embedded WebView is rejected), returning to
 *          `roavr://auth-callback` where we exchange the PKCE code for a
 *          session via `supabase.auth.exchangeCodeForSession`.
 *
 * No custom session infrastructure: Supabase issues, stores and refreshes the
 * tokens in both paths. Public identifiers (Apple Services ID, per-platform
 * Google client IDs) come from `identityConfig`; no secret is ever bundled.
 */
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { platform } from "@/lib/native/platform";
import { APP_SCHEME, OAUTH_CALLBACK_PATH } from "./deepLinks";
import { googleClientIdFor, identityConfig } from "./identityConfig";

export type OAuthProvider = "google" | "apple";

export const NATIVE_REDIRECT_URI = `${APP_SCHEME}:/${OAUTH_CALLBACK_PATH}`;

export interface OAuthStartResult {
  /** Control handed to the provider; the session arrives via deep link. */
  pending: boolean;
  error: Error | null;
}

/**
 * Extra authorization parameters for the native flow.
 *
 * Apple: the Services ID must be the audience when the request originates from
 * a native shell rather than the web origin.
 * Google: iOS and Android each have their own OAuth client; when the owner has
 * registered them we pass the platform-specific id so the consent screen and
 * the release fingerprint line up.
 */
export function nativeOAuthQueryParams(provider: OAuthProvider): Record<string, string> {
  if (provider === "apple") {
    return identityConfig.appleServicesId
      ? { client_id: identityConfig.appleServicesId }
      : {};
  }
  const target = platform.isIOS ? "ios" : platform.isAndroid ? "android" : "web";
  const clientId = googleClientIdFor(target);
  return clientId ? { client_id: clientId } : {};
}

export async function startOAuth(provider: OAuthProvider): Promise<OAuthStartResult> {
  if (!platform.isNative) {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    return { pending: !!result.redirected, error: (result.error as Error) ?? null };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: NATIVE_REDIRECT_URI,
      skipBrowserRedirect: true,
      queryParams: nativeOAuthQueryParams(provider),
    },
  });

  if (error) return { pending: false, error: error as Error };
  if (!data?.url) return { pending: false, error: new Error("No authorization URL returned.") };

  await Browser.open({ url: data.url, presentationStyle: "popover" });
  return { pending: true, error: null };
}

/**
 * Completes a native OAuth round trip from the `roavr://auth-callback` deep
 * link. Safe to call with an implicit-flow hash too.
 */
export async function completeNativeOAuth(search: string, hash: string): Promise<Error | null> {
  if (platform.isNative) await Browser.close().catch(() => undefined);

  const params = new URLSearchParams(search.replace(/^\?/, ""));
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));

  const errorDescription = params.get("error_description") ?? fragment.get("error_description");
  if (errorDescription) return new Error(errorDescription);

  const code = params.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return (error as Error) ?? null;
  }

  const access_token = fragment.get("access_token");
  const refresh_token = fragment.get("refresh_token");
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    return (error as Error) ?? null;
  }

  return new Error("Sign-in did not return credentials.");
}
