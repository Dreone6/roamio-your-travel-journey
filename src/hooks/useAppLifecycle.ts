/**
 * App lifecycle + connectivity + deep-link wiring, shared by web and native.
 *
 * - Foreground/background transitions (Capacitor appStateChange on native,
 *   visibilitychange on web).
 * - Refetches active React Query data on resume and on network reconnect,
 *   which also re-validates the Supabase session without a full reload.
 * - Inbound deep links are normalised, auth-gated, and routed. Unauthenticated
 *   users are parked at /auth with the intended destination preserved.
 */
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { native } from "@/lib/native";
import type { AppState } from "@/lib/native";
import { parseDeepLink } from "@/lib/auth/deepLinks";
import { completeNativeOAuth } from "@/lib/auth/oauth";
import { consumeReturnTo, hydrateReturnTo, saveReturnTo } from "@/lib/auth/returnTo";

/** Minimum background time before a resume triggers a refresh. */
const STALE_AFTER_MS = 30_000;

export function useAppLifecycle() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const backgroundedAt = useRef<number | null>(null);
  const [appState, setAppState] = useState<AppState>("active");
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    native.network.status().then((s) => !cancelled && setOnline(s.connected));
    void hydrateReturnTo();

    const refresh = async () => {
      // Re-validate the session first so refetches carry a fresh token.
      await supabase.auth.getSession();
      await queryClient.invalidateQueries({ type: "active" });
    };

    const offState = native.lifecycle.onStateChange((state) => {
      setAppState(state);
      if (state === "background") {
        backgroundedAt.current = Date.now();
        return;
      }
      const away = backgroundedAt.current ? Date.now() - backgroundedAt.current : 0;
      backgroundedAt.current = null;
      if (away > STALE_AFTER_MS) void refresh();
    });

    const offNetwork = native.network.onChange((status) => {
      setOnline(status.connected);
      if (status.connected) void refresh();
    });

    const offDeepLink = native.lifecycle.onDeepLink((url) => {
      const link = parseDeepLink(url);
      if (!link) return;

      void (async () => {
        if (link.isOAuthCallback) {
          const error = await completeNativeOAuth(link.search, link.hash);
          if (error) {
            navigate("/auth", { replace: true });
            return;
          }
          navigate(consumeReturnTo() ?? "/home", { replace: true });
          return;
        }

        if (link.isPublic) {
          navigate(link.path);
          return;
        }

        // Protected destination: only route there with a validated session.
        // RLS still governs what the screen can read.
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          saveReturnTo(link.path);
          navigate("/auth");
          return;
        }
        navigate(link.path);
      })();
    });

    return () => {
      cancelled = true;
      offState();
      offNetwork();
      offDeepLink();
    };
  }, [queryClient, navigate]);

  return { appState, online, isBackgrounded: appState === "background" };
}
