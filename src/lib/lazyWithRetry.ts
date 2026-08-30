import { lazy, type ComponentType } from "react";

/**
 * React.lazy with self-healing for stale chunk URLs.
 *
 * When a deploy or a Vite dep re-optimization invalidates a chunk, the pending
 * dynamic import rejects with "Failed to fetch dynamically imported module" and
 * the route renders a blank screen. We retry once after a short delay, then fall
 * back to a single hard reload (guarded by sessionStorage so we never loop).
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  key: string,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        return await factory();
      } catch (err2) {
        const flag = `lazy-reload:${key}`;
        if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(flag)) {
          sessionStorage.setItem(flag, "1");
          window.location.reload();
          // Never resolves; the reload takes over.
          return await new Promise<{ default: T }>(() => {});
        }
        throw err2;
      }
    }
  });
}
