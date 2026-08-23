/**
 * Lightweight route-transition placeholder. Deliberately not a full-screen
 * spinner — it mirrors the app's card rhythm so route switches feel like the
 * screen is filling in rather than reloading.
 */
export default function RouteFallback() {
  return (
    <div className="min-h-dvh px-5 pt-14" style={{ background: "#080D1A" }} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="h-8 w-40 rounded-lg animate-pulse" style={{ background: "#111827" }} />
      <div className="mt-6 h-[140px] rounded-[24px] animate-pulse" style={{ background: "#111827" }} />
      <div className="mt-4 h-[100px] rounded-[24px] animate-pulse" style={{ background: "#111827" }} />
      <div className="mt-4 h-[100px] rounded-[24px] animate-pulse" style={{ background: "#111827" }} />
    </div>
  );
}
