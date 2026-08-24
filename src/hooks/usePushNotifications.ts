/**
 * Push wiring for the running app.
 *
 * - registers only when the signed-in user has push enabled and the OS has
 *   already granted permission (the prompt itself lives on the notification
 *   settings screen, behind an explicit tap);
 * - refreshes the token on every foreground so rotated tokens stay current;
 * - removes this device's tokens on sign-out;
 * - foreground notifications surface as an in-app toast (no OS banner fight);
 * - taps route through the shared allow-list.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  clearDeviceTokens,
  getPushPermission,
  isPushSupported,
  startPush,
} from "@/lib/native/push";
import { fetchPreferences } from "@/lib/notifications/preferences";
import { resolveDelivery } from "@/lib/notifications/delivery";

/** A tap within this window of registration is treated as a cold start. */
const COLD_START_WINDOW_MS = 4_000;

export function usePushNotifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const stopRef = useRef<(() => void) | null>(null);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return;
    let cancelled = false;

    const stop = () => {
      stopRef.current?.();
      stopRef.current = null;
    };

    const start = async (userId: string) => {
      const permission = await getPushPermission();
      if (permission !== "granted") return; // never prompt implicitly
      const prefs = await fetchPreferences(userId);
      if (!prefs.push_enabled) return;
      if (cancelled || stopRef.current) return;

      // A tap arriving before the app has settled is a cold start; afterwards
      // it is a background resume. The distinction only affects history depth.
      const startedAt = Date.now();

      stopRef.current = await startPush({
        onForeground: (push) => {
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          const action = resolveDelivery(push, "foreground");
          if (action.kind !== "toast") return;
          toast(action.title, {
            description: action.body,
            action: { label: "View", onClick: () => navigate(action.path) },
          });
        },
        onOpened: (push) => {
          const mode = Date.now() - startedAt < COLD_START_WINDOW_MS ? "cold_start" : "background";
          const action = resolveDelivery(push, mode);
          if (action.kind === "navigate") navigate(action.path, { replace: action.replace });
        },
      });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null;

      if (event === "SIGNED_OUT" || !userId) {
        const previous = lastUserId.current;
        lastUserId.current = null;
        stop();
        if (previous) void clearDeviceTokens(previous);
        return;
      }

      if (userId !== lastUserId.current) {
        lastUserId.current = userId;
        void start(userId);
      }
    });

    void supabase.auth.getUser().then(({ data }) => {
      if (data.user && data.user.id !== lastUserId.current) {
        lastUserId.current = data.user.id;
        void start(data.user.id);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      stop();
    };
  }, [navigate, queryClient]);
}
