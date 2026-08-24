import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { usePushNotifications } from "@/hooks/usePushNotifications";

/**
 * Headless: mounts inside the router so lifecycle, connectivity, deep-link and
 * push handling are active for every route on both web and native.
 */
export default function NativeLifecycle() {
  useAppLifecycle();
  usePushNotifications();
  return null;
}
