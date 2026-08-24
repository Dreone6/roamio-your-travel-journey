import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Bell, Loader2, ShieldCheck } from "lucide-react";
import {
  DEFAULT_PREFERENCES,
  PREFERENCE_COPY,
  fetchPreferences,
  savePreferences,
  type NotificationPreferences,
} from "@/lib/notifications/preferences";
import {
  getPushPermission,
  isPushSupported,
  requestPushPermission,
  type PushPermission,
} from "@/lib/native/push";

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("unavailable");

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [p, perm] = await Promise.all([fetchPreferences(user.id), getPushPermission()]);
      setPrefs(p);
      setPermission(perm);
      setLoading(false);
    })();
  }, [user]);

  const update = (patch: Partial<NotificationPreferences>) =>
    setPrefs((prev) => ({ ...prev, ...patch }));

  const enableDevice = async () => {
    const result = await requestPushPermission();
    setPermission(result);
    if (result === "granted") toast.success("Push notifications enabled on this device");
    else if (result === "denied") toast.error("Enable notifications for Roavr in your device settings");
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await savePreferences(user.id, prefs);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Notification preferences saved");
  };

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-10">
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-5 pt-12 pb-5">
          <button onClick={() => navigate("/settings")} className="text-dark-muted mb-3 flex items-center gap-1 text-[13px]">
            <ArrowLeft className="h-4 w-4" /> Settings
          </button>
          <h1 className="font-heading text-[22px] font-bold text-white tracking-tight">Notifications</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Device permission */}
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2 shadow-soft">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <p className="font-heading text-[13px] font-bold text-foreground">This device</p>
          </div>
          {!isPushSupported() ? (
            <p className="text-[11px] text-muted-foreground">
              Push notifications are delivered in the Roavr mobile app. Your choices below apply as soon as you sign in there.
            </p>
          ) : permission === "granted" ? (
            <p className="text-[11px] text-muted-foreground">This device is registered for Roavr notifications.</p>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground">
                Roavr only notifies you about people and trips you're part of. Turn it on to get message and trip activity.
              </p>
              <Button size="sm" onClick={enableDevice} className="rounded-xl h-9 text-[12px]">
                {permission === "denied" ? "Open device settings" : "Turn on notifications"}
              </Button>
            </>
          )}
        </div>

        {/* Master switch */}
        <div className="rounded-xl border border-border/40 bg-card px-3.5 py-3 flex items-center justify-between shadow-soft">
          <div>
            <span className="text-[13px] font-semibold text-foreground block">Push notifications</span>
            <span className="text-[11px] text-muted-foreground">Turn everything off in one place</span>
          </div>
          <Switch checked={prefs.push_enabled} onCheckedChange={(v) => update({ push_enabled: v })} />
        </div>

        {/* Categories */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-1">What you hear about</p>
          <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30 overflow-hidden shadow-soft">
            {PREFERENCE_COPY.map((item) => (
              <div key={item.key} className="flex items-center justify-between px-3.5 py-3 gap-3">
                <div>
                  <span className="text-[13px] font-semibold text-foreground block">
                    {item.label}
                    {item.commercial && (
                      <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Opt-in</span>
                    )}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{item.desc}</span>
                </div>
                <Switch
                  checked={prefs.push_enabled && prefs[item.key]}
                  disabled={!prefs.push_enabled}
                  onCheckedChange={(v) => update({ [item.key]: v } as Partial<NotificationPreferences>)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-secondary/30 p-3 flex gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">
            Roavr never notifies anyone you've blocked, and never sends location-based marketing unless you switch on Nearby offers.
          </p>
        </div>

        <Button onClick={save} disabled={saving} className="w-full h-11 rounded-xl font-semibold text-[13px]">
          {saving ? "Saving..." : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}
