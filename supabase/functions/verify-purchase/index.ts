/**
 * verify-purchase — the ONLY path that can grant a paid Roavr entitlement.
 *
 * Design rules:
 *  - the client sends receipt material only; it never sends a tier;
 *  - the tier is derived server-side from the *verified* product id;
 *  - if store credentials are absent, this returns 501 `billing_not_configured`
 *    and grants nothing. There is no simulated success path anywhere;
 *  - writes use the service role, because users hold no write grant on
 *    `public.subscriptions`.
 *
 * Required secrets for real verification:
 *   Apple  — APPLE_IAP_ISSUER_ID, APPLE_IAP_KEY_ID, APPLE_IAP_PRIVATE_KEY
 *            (App Store Connect API in-app-purchase key, .p8 contents)
 *            APPLE_BUNDLE_ID
 *   Google — GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (Play Developer API enabled)
 *            ANDROID_PACKAGE_NAME
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCT_TIER: Record<string, "plus" | "pro"> = {
  "app.roavr.plus.monthly": "plus",
  "app.roavr.plus.yearly": "plus",
  "app.roavr.pro.monthly": "pro",
  "app.roavr.pro.yearly": "pro",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

interface VerifiedPurchase {
  productId: string;
  expiresAt: string | null;
  autoRenew: boolean | null;
  originalTransactionId: string | null;
  transactionId: string | null;
  environment: string;
  active: boolean;
}

/* ------------------------------- Apple ---------------------------------- */

async function verifyApple(token: string): Promise<VerifiedPurchase | { error: string; status: number }> {
  const issuerId = Deno.env.get("APPLE_IAP_ISSUER_ID");
  const keyId = Deno.env.get("APPLE_IAP_KEY_ID");
  const privateKey = Deno.env.get("APPLE_IAP_PRIVATE_KEY");
  const bundleId = Deno.env.get("APPLE_BUNDLE_ID");
  if (!issuerId || !keyId || !privateKey || !bundleId) {
    return { error: "billing_not_configured", status: 501 };
  }

  // StoreKit 2 hands the app a JWS signed transaction. Decoding the payload is
  // not verification on its own — we confirm it with the App Store Server API,
  // which is the authoritative source for renewal/expiry state.
  const parts = token.split(".");
  if (parts.length !== 3) return { error: "malformed_receipt", status: 400 };

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return { error: "malformed_receipt", status: 400 };
  }

  const originalTransactionId = String(payload.originalTransactionId ?? "");
  if (!originalTransactionId) return { error: "malformed_receipt", status: 400 };
  if (payload.bundleId && payload.bundleId !== bundleId) {
    return { error: "bundle_mismatch", status: 400 };
  }

  const environment = String(payload.environment ?? "Production");
  const host = environment === "Sandbox"
    ? "https://api.storekit-sandbox.itunes.apple.com"
    : "https://api.storekit.itunes.apple.com";

  const jwt = await appleJwt({ issuerId, keyId, privateKey, bundleId });
  const res = await fetch(`${host}/inApps/v1/subscriptions/${originalTransactionId}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) return { error: `apple_verification_failed_${res.status}`, status: 502 };

  const body = await res.json();
  const item = body?.data?.[0]?.lastTransactions?.[0];
  if (!item) return { error: "no_transaction_found", status: 404 };

  const signed = item.signedTransactionInfo?.split(".")?.[1];
  const renewal = item.signedRenewalInfo?.split(".")?.[1];
  const txn = signed ? JSON.parse(atob(signed.replace(/-/g, "+").replace(/_/g, "/"))) : {};
  const ren = renewal ? JSON.parse(atob(renewal.replace(/-/g, "+").replace(/_/g, "/"))) : {};

  const expiresMs = Number(txn.expiresDate ?? 0);
  return {
    productId: String(txn.productId ?? payload.productId ?? ""),
    expiresAt: expiresMs ? new Date(expiresMs).toISOString() : null,
    autoRenew: ren.autoRenewStatus === undefined ? null : ren.autoRenewStatus === 1,
    originalTransactionId,
    transactionId: String(txn.transactionId ?? ""),
    environment,
    // status 1 = active, 5 = revoked. Grace period (4) still entitles.
    active: [1, 3, 4].includes(Number(item.status)),
  };
}

async function appleJwt(cfg: { issuerId: string; keyId: string; privateKey: string; bundleId: string }) {
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const header = enc({ alg: "ES256", kid: cfg.keyId, typ: "JWT" });
  const claims = enc({
    iss: cfg.issuerId,
    iat: now,
    exp: now + 600,
    aud: "appstoreconnect-v1",
    bid: cfg.bundleId,
  });
  const pem = cfg.privateKey.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(`${header}.${claims}`),
    ),
  );
  const sigB64 = btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${header}.${claims}.${sigB64}`;
}

/* ------------------------------- Google --------------------------------- */

async function verifyGoogle(
  productId: string,
  token: string,
): Promise<VerifiedPurchase | { error: string; status: number }> {
  const saJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  const packageName = Deno.env.get("ANDROID_PACKAGE_NAME");
  if (!saJson || !packageName) return { error: "billing_not_configured", status: 501 };

  let sa: { client_email: string; private_key: string };
  try {
    sa = JSON.parse(saJson);
  } catch {
    return { error: "invalid_service_account", status: 500 };
  }

  const accessToken = await googleAccessToken(sa);
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}` +
    `/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { error: `google_verification_failed_${res.status}`, status: 502 };

  const body = await res.json();
  const line = body?.lineItems?.[0];
  const state = String(body?.subscriptionState ?? "");
  return {
    productId: String(line?.productId ?? productId),
    expiresAt: line?.expiryTime ?? null,
    autoRenew: line?.autoRenewingPlan?.autoRenewEnabled ?? null,
    originalTransactionId: String(body?.latestOrderId ?? ""),
    transactionId: String(body?.latestOrderId ?? ""),
    environment: body?.testPurchase ? "Sandbox" : "Production",
    active: ["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"].includes(state),
  };
}

async function googleAccessToken(sa: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const header = enc({ alg: "RS256", typ: "JWT" });
  const claims = enc({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const pem = sa.private_key.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`)),
  );
  const jwt = `${header}.${claims}.${
    btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  }`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const body = await res.json();
  return body.access_token as string;
}

/* -------------------------------- handler -------------------------------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const asUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: auth } = await asUser.auth.getUser();
  const user = auth?.user;
  if (!user) return json({ entitled: false, error: "unauthorized" }, 401);

  let body: { platform?: string; productId?: string; token?: string; transactionId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ entitled: false, error: "invalid_body" }, 400);
  }

  const store = body.platform;
  if (store !== "apple" && store !== "google") {
    return json({ entitled: false, error: "unsupported_platform" }, 400);
  }
  if (!body.token || !body.productId) {
    return json({ entitled: false, error: "missing_receipt" }, 400);
  }
  if (!PRODUCT_TIER[body.productId]) {
    return json({ entitled: false, error: "unknown_product" }, 400);
  }

  const verified = store === "apple"
    ? await verifyApple(body.token)
    : await verifyGoogle(body.productId, body.token);

  if ("error" in verified) {
    return json({ entitled: false, error: verified.error }, verified.status);
  }

  const tier = PRODUCT_TIER[verified.productId];
  if (!tier) return json({ entitled: false, error: "unknown_product" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);

  // A store transaction belongs to exactly one Roavr account. Refuse to move a
  // live entitlement onto a second account (account-sharing / receipt replay).
  if (verified.originalTransactionId) {
    const { data: existing } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("platform", store)
      .eq("store_original_transaction_id", verified.originalTransactionId)
      .maybeSingle();
    if (existing && existing.user_id !== user.id) {
      return json({ entitled: false, error: "receipt_belongs_to_another_account" }, 409);
    }
  }

  const active = verified.active &&
    (!verified.expiresAt || new Date(verified.expiresAt).getTime() > Date.now());

  const { error: upsertError } = await admin.from("subscriptions").upsert({
    user_id: user.id,
    tier: active ? tier : "free",
    status: active ? "active" : "expired",
    platform: store,
    entitlement_source: store === "apple" ? "app_store" : "play_store",
    product_id: verified.productId,
    store_transaction_id: verified.transactionId,
    store_original_transaction_id: verified.originalTransactionId,
    store_environment: verified.environment,
    auto_renew: verified.autoRenew,
    expires_at: verified.expiresAt,
    current_period_end: verified.expiresAt,
    last_verified_at: new Date().toISOString(),
    revoked_at: active ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (upsertError) return json({ entitled: false, error: "entitlement_write_failed" }, 500);

  return json({
    entitled: active,
    tier: active ? tier : "free",
    expires_at: verified.expiresAt,
    auto_renew: verified.autoRenew,
    environment: verified.environment,
  });
});
