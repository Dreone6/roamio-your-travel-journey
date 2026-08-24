/**
 * Roavr native capability contracts.
 *
 * Screens depend on these interfaces only — never on `Capacitor.isNativePlatform()`
 * checks scattered through components. Each capability has a web implementation
 * today; native implementations swap in behind the same shape.
 */

export type RoavrPlatform = "ios" | "android" | "web";

export interface PlatformInfo {
  platform: RoavrPlatform;
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
}

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
  /** Toast copy used by the clipboard fallback. */
  copiedMessage?: string;
}

export type ShareResult = "shared" | "copied" | "dismissed" | "unavailable";

export interface SecureStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export type AppState = "active" | "background";

export interface LifecycleApi {
  /** Fires on foreground/background transitions (web: visibilitychange). */
  onStateChange(cb: (state: AppState) => void): () => void;
  /** Fires when the OS/browser hands a URL to the app (deep link). */
  onDeepLink(cb: (url: URL) => void): () => void;
  /** Android hardware back / iOS no-op. Return true to consume the event. */
  onBackButton(cb: () => boolean): () => void;
}

export interface NetworkStatus {
  connected: boolean;
  connectionType: string;
}

export interface NetworkApi {
  status(): Promise<NetworkStatus>;
  onChange(cb: (status: NetworkStatus) => void): () => void;
}

/* ---- Phase-next capabilities: interfaces only, deliberately unimplemented ---- */

export interface PushRegistry {
  isSupported(): boolean;
  /** Registers with APNs/FCM and returns a device token to persist per profile. */
  register(): Promise<string | null>;
  unregister(): Promise<void>;
}

export interface BillingApi {
  isSupported(): boolean;
  /** StoreKit / Play Billing product listing. */
  listProducts(): Promise<Array<{ id: string; price: string }>>;
  purchase(productId: string): Promise<{ ok: boolean; reason?: string }>;
}

export interface NativeCapabilities {
  platform: PlatformInfo;
  share(payload: SharePayload): Promise<ShareResult>;
  secureStore: SecureStore;
  lifecycle: LifecycleApi;
  network: NetworkApi;
  push: PushRegistry;
  billing: BillingApi;
}
