/**
 * Single entry point for device capabilities.
 *
 *   import { native } from "@/lib/native";
 *   await native.share({ text, url });
 *
 * Web stays first-class: every method has a browser implementation and no
 * native plugin is required for a web route to work.
 */
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { Preferences } from "@capacitor/preferences";
import { Share } from "@capacitor/share";
import type {
  AppState,
  BillingApi,
  LifecycleApi,
  NativeCapabilities,
  NetworkApi,
  NetworkStatus,
  PlatformInfo,
  PushRegistry,
  SecureStore,
  SharePayload,
  ShareResult,
  RoavrPlatform,
} from "./types";

export * from "./types";
export * from "./permissionCopy";
export { getCurrentLocation, ensureLocationAccess } from "./location";
export { takePhoto, chooseFromLibrary, ensureNativeCameraAccess, isNativeCameraAvailable } from "./camera";
export { pickNativePhotos, ensureNativePhotoAccess, expandLimitedSelection, isNativePhotoLibraryAvailable } from "./photos";

export { platform } from "./platform";
import { platform } from "./platform";

/* ------------------------------- sharing -------------------------------- */

async function share(payload: SharePayload): Promise<ShareResult> {
  const { title, text, url } = payload;
  try {
    if (platform.isNative && (await Share.canShare()).value) {
      await Share.share({ title, text, url, dialogTitle: title });
      return "shared";
    }
  } catch {
    return "dismissed";
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch {
      return "dismissed";
    }
  }

  const clipboardValue = [text, url].filter(Boolean).join(" ");
  if (clipboardValue && typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(clipboardValue);
      return "copied";
    } catch {
      return "unavailable";
    }
  }
  return "unavailable";
}

/* ---------------------------- secure storage ---------------------------- */

const secureStore: SecureStore = {
  async get(key) {
    if (platform.isNative) return (await Preferences.get({ key })).value ?? null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    if (platform.isNative) {
      await Preferences.set({ key, value });
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage disabled */
    }
  },
  async remove(key) {
    if (platform.isNative) {
      await Preferences.remove({ key });
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage disabled */
    }
  },
};

/* ------------------------------ lifecycle ------------------------------- */

const lifecycle: LifecycleApi = {
  onStateChange(cb: (state: AppState) => void) {
    if (platform.isNative) {
      const handle = CapApp.addListener("appStateChange", ({ isActive }) =>
        cb(isActive ? "active" : "background")
      );
      return () => void handle.then((h) => h.remove());
    }
    if (typeof document === "undefined") return () => undefined;
    const onVis = () => cb(document.hidden ? "background" : "active");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  },

  onDeepLink(cb: (url: URL) => void) {
    if (!platform.isNative) return () => undefined;
    const handle = CapApp.addListener("appUrlOpen", ({ url }) => {
      try {
        cb(new URL(url));
      } catch {
        /* malformed deep link */
      }
    });
    return () => void handle.then((h) => h.remove());
  },

  onBackButton(cb: () => boolean) {
    if (!platform.isAndroid) return () => undefined;
    const handle = CapApp.addListener("backButton", () => {
      if (!cb()) CapApp.exitApp();
    });
    return () => void handle.then((h) => h.remove());
  },
};

/* -------------------------------- network -------------------------------- */

const network: NetworkApi = {
  async status(): Promise<NetworkStatus> {
    if (platform.isNative) {
      const s = await Network.getStatus();
      return { connected: s.connected, connectionType: s.connectionType };
    }
    const online = typeof navigator === "undefined" ? true : navigator.onLine;
    return { connected: online, connectionType: online ? "unknown" : "none" };
  },
  onChange(cb) {
    if (platform.isNative) {
      const handle = Network.addListener("networkStatusChange", (s) =>
        cb({ connected: s.connected, connectionType: s.connectionType })
      );
      return () => void handle.then((h) => h.remove());
    }
    if (typeof window === "undefined") return () => undefined;
    const on = () => cb({ connected: true, connectionType: "unknown" });
    const off = () => cb({ connected: false, connectionType: "none" });
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  },
};

/* ------------------- next-phase capabilities (not built) ------------------ */

const push: PushRegistry = {
  isSupported: () => false,
  async register() {
    return null;
  },
  async unregister() {
    /* no push provider configured yet */
  },
};

/**
 * Billing lives in `@/lib/billing` (store adapter + server-verified
 * entitlements). This shim keeps the capability surface consistent; it never
 * decides entitlement itself.
 */
const billing: BillingApi = {
  isSupported: () => platform.isNative,
  async listProducts() {
    const { billing: store } = await import("@/lib/billing/store");
    const products = await store.listProducts();
    return products.map((p) => ({ id: p.productId, price: p.displayPrice }));
  },
  async purchase(productId: string) {
    const { billing: store } = await import("@/lib/billing/store");
    const { PRODUCT_IDS } = await import("@/lib/billing/types");
    const key = (Object.keys(PRODUCT_IDS) as Array<keyof typeof PRODUCT_IDS>)
      .find((k) => PRODUCT_IDS[k] === productId);
    if (!key) return { ok: false, reason: "Unknown product." };
    const outcome = await store.purchase(key);
    if (outcome.status === "entitled") return { ok: true };
    const reason =
      outcome.status === "unavailable" || outcome.status === "verification_failed"
        ? outcome.message
        : outcome.status;
    return { ok: false, reason };
  },
};

export const native: NativeCapabilities = {
  platform,
  share,
  secureStore,
  lifecycle,
  network,
  push,
  billing,
};
