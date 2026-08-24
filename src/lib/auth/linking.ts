/**
 * Account linking — one Roavr account, several sign-in methods.
 *
 * Supabase owns identity storage: `linkIdentity` attaches an Apple/Google
 * identity to the *currently signed-in* user, and `unlinkIdentity` detaches
 * one. We never merge accounts client-side and never create a second user
 * record; if the provider identity already belongs to another account Supabase
 * rejects the link and we surface that verbatim.
 *
 * Safety rule enforced here: a user may never unlink their last remaining
 * sign-in method, which would lock them out of their own data.
 */
import { supabase } from "@/integrations/supabase/client";
import { platform } from "@/lib/native/platform";
import type { OAuthProvider } from "./oauth";
import { NATIVE_REDIRECT_URI, nativeOAuthQueryParams } from "./oauth";

export interface LinkedIdentity {
  id: string;
  provider: string;
  email: string | null;
  createdAt: string | null;
}

export async function listIdentities(): Promise<LinkedIdentity[]> {
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error || !data) return [];
  return data.identities.map((identity) => ({
    id: identity.identity_id ?? identity.id,
    provider: identity.provider,
    email: (identity.identity_data?.email as string | undefined) ?? null,
    createdAt: identity.created_at ?? null,
  }));
}

/** Starts an OAuth round trip that attaches the provider to the current user. */
export async function linkProvider(provider: OAuthProvider): Promise<Error | null> {
  const { error } = await supabase.auth.linkIdentity({
    provider,
    options: platform.isNative
      ? {
          redirectTo: NATIVE_REDIRECT_URI,
          queryParams: nativeOAuthQueryParams(provider),
        }
      : { redirectTo: `${window.location.origin}/settings/identity` },
  });
  return (error as Error) ?? null;
}

export async function unlinkProvider(identity: LinkedIdentity): Promise<Error | null> {
  const identities = await listIdentities();
  if (identities.length <= 1) {
    return new Error("This is your only sign-in method. Add another before removing it.");
  }
  const { data, error: lookupError } = await supabase.auth.getUserIdentities();
  if (lookupError || !data) return (lookupError as Error) ?? new Error("Could not read identities.");
  const target = data.identities.find(
    (i) => (i.identity_id ?? i.id) === identity.id,
  );
  if (!target) return new Error("Identity not found.");
  const { error } = await supabase.auth.unlinkIdentity(target);
  return (error as Error) ?? null;
}
