/**
 * Native store adapter (Apple StoreKit 2 / Google Play Billing).
 *
 * Roavr ships the full purchase → verify → entitle pipeline, but deliberately
 * does NOT simulate transactions. Until the owner installs a billing plugin and
 * creates the products in App Store Connect / Play Console, every entry point
 * returns an honest `unavailable` outcome. Nothing here can grant access on its
 * own: the only path to an entitlement is the `verify-purchase` edge function,
 * which writes `subscriptions` with the service role after validating the
 * receipt against Apple/Google.
 *
 * OWNER STEP — to activate:
 *   1. `npm i @capgo/capacitor-purchases` (or RevenueCat / cordova-plugin-purchase)
 *   2. Implement `loadPlugin()` below to return that plugin.
 *   3. Create the products in PRODUCT_IDS in both consoles.
 *   4. Add the server secrets listed in docs/store-readiness.md.
 * No other file needs to change — the UI already speaks this interface.
 */
import { supabase } from "@/integrations/supabase/client";
import { platform } from "@/lib/native/platform";
import type { SubscriptionTier } from "@/data/types";
import {
  PRODUCT_IDS,
  PRODUCT_TIER,
  type BillingApi,
  type BillingAvailability,
  type ProductKey,
  type PurchaseOutcome,
  type PurchaseReceipt,
  type RestoreOutcome,
  type StoreProduct,
} from "./types";

/**
 * Minimal shape Roavr needs from whichever billing plugin is chosen.
 * Returning null means "no plugin installed" — the honest default today.
 */
interface StorePlugin {
  getProducts(ids: string[]): Promise<Array<{ productId: string; title: string; price: string }>>;
  purchase(productId: string): Promise<{ cancelled?: boolean; pending?: boolean; token?: string; transactionId?: string }>;
  restore(): Promise<Array<{ productId: string; token: string; transactionId?: string }>>;
}

async function loadPlugin(): Promise<StorePlugin | null> {
  return null; // no billing plugin installed yet — see OWNER STEP above
}

const UNAVAILABLE_COPY: Record<string, string> = {
  web_platform:
    "Subscriptions are purchased inside the Roavr iOS or Android app. Apple and Google require in-app purchase for digital subscriptions.",
  plugin_missing:
    "In-app purchases aren't switched on for this build yet. Store products and billing credentials must be configured first.",
  store_unavailable:
    "The App Store / Play Store isn't reachable right now. Check your connection and try again.",
  products_not_configured:
    "No subscription products were returned by the store. They must be created and approved in App Store Connect / Play Console first.",
};

export async function availability(): Promise<BillingAvailability> {
  if (!platform.isNative) {
    return { available: false, platform: "none", reason: "web_platform", message: UNAVAILABLE_COPY.web_platform };
  }
  const plugin = await loadPlugin();
  const storePlatform = platform.isIOS ? "apple" : "google";
  if (!plugin) {
    return { available: false, platform: storePlatform, reason: "plugin_missing", message: UNAVAILABLE_COPY.plugin_missing };
  }
  return { available: true, platform: storePlatform };
}

export async function listProducts(): Promise<StoreProduct[]> {
  const plugin = await loadPlugin();
  if (!plugin) return [];
  const ids = Object.values(PRODUCT_IDS);
  let raw: Awaited<ReturnType<StorePlugin["getProducts"]>>;
  try {
    raw = await plugin.getProducts(ids);
  } catch {
    return [];
  }
  return raw.flatMap((p) => {
    const key = (Object.keys(PRODUCT_IDS) as ProductKey[]).find((k) => PRODUCT_IDS[k] === p.productId);
    if (!key) return [];
    return [{
      key,
      productId: p.productId,
      title: p.title,
      displayPrice: p.price,
      period: key.endsWith("yearly") ? ("yearly" as const) : ("monthly" as const),
      tier: PRODUCT_TIER[key],
    }];
  });
}

/**
 * Hands the receipt to the server. The response is the entitlement — the client
 * never derives one from the purchase result.
 */
async function verifyOnServer(receipt: PurchaseReceipt): Promise<PurchaseOutcome> {
  const { data, error } = await supabase.functions.invoke("verify-purchase", { body: receipt });
  if (error) {
    return { status: "verification_failed", message: "We couldn't verify that purchase. You have not been charged twice — reopen this screen to retry." };
  }
  const result = data as { entitled?: boolean; tier?: string; expires_at?: string | null; error?: string };
  if (!result?.entitled) {
    return { status: "verification_failed", message: result?.error ?? "The store could not confirm this purchase." };
  }
  return {
    status: "entitled",
    tier: (result.tier ?? "free") as SubscriptionTier,
    expiresAt: result.expires_at ?? null,
  };
}

export async function purchase(key: ProductKey): Promise<PurchaseOutcome> {
  const avail = await availability();
  if (!avail.available) {
    return { status: "unavailable", reason: avail.reason!, message: avail.message! };
  }
  const plugin = (await loadPlugin())!;
  const productId = PRODUCT_IDS[key];

  let result: Awaited<ReturnType<StorePlugin["purchase"]>>;
  try {
    result = await plugin.purchase(productId);
  } catch {
    return { status: "unavailable", reason: "store_unavailable", message: UNAVAILABLE_COPY.store_unavailable };
  }
  if (result.cancelled) return { status: "cancelled" };
  if (result.pending || !result.token) return { status: "pending" };

  return verifyOnServer({
    platform: platform.isIOS ? "apple" : "google",
    productId,
    token: result.token,
    transactionId: result.transactionId,
  });
}

export async function restore(): Promise<RestoreOutcome> {
  const avail = await availability();
  if (!avail.available) {
    return { status: "unavailable", reason: avail.reason!, message: avail.message! };
  }
  const plugin = (await loadPlugin())!;
  let purchases: Awaited<ReturnType<StorePlugin["restore"]>>;
  try {
    purchases = await plugin.restore();
  } catch {
    return { status: "unavailable", reason: "store_unavailable", message: UNAVAILABLE_COPY.store_unavailable };
  }
  if (!purchases.length) return { status: "nothing_to_restore" };

  let best: RestoreOutcome = { status: "nothing_to_restore" };
  for (const p of purchases) {
    const outcome = await verifyOnServer({
      platform: platform.isIOS ? "apple" : "google",
      productId: p.productId,
      token: p.token,
      transactionId: p.transactionId,
    });
    if (outcome.status === "entitled") {
      best = { status: "restored", tier: outcome.tier, expiresAt: outcome.expiresAt };
    } else if (outcome.status === "verification_failed" && best.status === "nothing_to_restore") {
      best = outcome;
    }
  }
  return best;
}

/** OS-level manage/cancel destination. Apple and Google both require this link. */
export function manageSubscriptionUrl(): string | null {
  if (platform.isIOS) return "https://apps.apple.com/account/subscriptions";
  if (platform.isAndroid) return "https://play.google.com/store/account/subscriptions";
  return null;
}

export const billing: BillingApi = { availability, listProducts, purchase, restore, manageSubscriptionUrl };
