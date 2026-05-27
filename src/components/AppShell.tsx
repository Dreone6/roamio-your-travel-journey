import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import ShellTopBar from "./shell/ShellTopBar";
import SideDrawer from "./shell/SideDrawer";
import OfflineBanner from "./shell/OfflineBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStore } from "@/stores/useAppStore";
import { supabase } from "@/integrations/supabase/client";

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, session } = useAuth();
  const setUser = useAppStore((s) => s.user.setUser);
  const setNotifications = useAppStore((s) => s.notifications.setNotifications);
  const setApp = useAppStore((s) => s.app.setApp);

  // Hydrate user slice from AuthContext
  useEffect(() => {
    setUser({ authUser: user, session, isLoading: false });
  }, [user, session, setUser]);

  // Fetch profile + notifications on mount / user change
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const [{ data: profile }, { count }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false),
      ]);
      if (cancelled) return;
      if (profile) setUser({ profile });
      setNotifications({ count: count ?? 0 });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, setUser, setNotifications]);

  // Online / offline
  useEffect(() => {
    const update = () => setApp({ isOffline: !navigator.onLine });
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [setApp]);

  // Geolocation: prompt only, don't block
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setApp({ currentLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, [setApp]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShellTopBar onMenuClick={() => setDrawerOpen(true)} />
      <OfflineBanner />
      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Outlet />
      <BottomNav />
    </div>
  );
}
