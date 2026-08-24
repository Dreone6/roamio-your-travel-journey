import { useAppLifecycle } from "@/hooks/useAppLifecycle";

/**
 * Headless: mounts inside the router so lifecycle, connectivity and deep-link
 * handling are active for every route on both web and native.
 */
export default function NativeLifecycle() {
  useAppLifecycle();
  return null;
}
