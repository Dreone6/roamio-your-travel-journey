import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft, Globe, Eye, MessageCircle, Image, Shield, Save, Loader2,
} from "lucide-react";

interface PrivacySettings {
  public_map_enabled: boolean;
  default_story_visibility: string;
  message_permission: string;
  auto_save_stories: string;
}

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Everyone", icon: Globe },
  { value: "followers", label: "Followers Only", icon: Eye },
  { value: "private", label: "Only Me", icon: Shield },
];

const MESSAGE_OPTIONS = [
  { value: "everyone", label: "Everyone" },
  { value: "followers", label: "Followers Only" },
  { value: "nobody", label: "Nobody" },
];

const STORY_SAVE_OPTIONS = [
  { value: "auto", label: "Auto-save to Globe", desc: "Expired stories become memories" },
  { value: "ask", label: "Ask Me Each Time", desc: "Get a prompt before saving" },
  { value: "never", label: "Never Save", desc: "Stories vanish after 24h" },
];

export default function PrivacySettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>({
    public_map_enabled: true,
    default_story_visibility: "public",
    message_permission: "everyone",
    auto_save_stories: "auto",
  });

  useEffect(() => {
    if (!user) return;
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("user_privacy_settings")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data) {
      setSettings({
        public_map_enabled: data.public_map_enabled,
        default_story_visibility: data.default_story_visibility,
        message_permission: data.message_permission,
        auto_save_stories: data.auto_save_stories,
      });
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("user_privacy_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_privacy_settings")
          .update({ ...settings, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("user_privacy_settings")
          .insert({ user_id: user.id, ...settings });
      }
      toast.success("Privacy settings saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-8">
      {/* Dark Header */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-5 pt-12 pb-5">
          <button onClick={() => navigate("/settings")} className="text-dark-muted mb-3 flex items-center gap-1 text-[13px]">
            <ArrowLeft className="h-4 w-4" /> Settings
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-glow" />
            <h1 className="font-heading text-[22px] font-bold text-white tracking-tight">Privacy</h1>
          </div>
          <p className="text-dark-muted text-[13px] mt-1">Control who sees your travel world</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Public Map Toggle */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-1">Globe & Map</p>
          <div className="rounded-xl border border-border/40 bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Globe className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">Public Globe</p>
                  <p className="text-[11px] text-muted-foreground">Let others view your travel map</p>
                </div>
              </div>
              <Switch
                checked={settings.public_map_enabled}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, public_map_enabled: v }))}
              />
            </div>
          </div>
        </div>

        {/* Story Visibility */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-1">Default Story Visibility</p>
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-soft divide-y divide-border/30">
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSettings((s) => ({ ...s, default_story_visibility: opt.value }))}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <opt.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground">{opt.label}</span>
                </div>
                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  settings.default_story_visibility === opt.value
                    ? "border-accent bg-accent"
                    : "border-border"
                }`}>
                  {settings.default_story_visibility === opt.value && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message Permissions */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-1">Who Can Message You</p>
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-soft divide-y divide-border/30">
            {MESSAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSettings((s) => ({ ...s, message_permission: opt.value }))}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground">{opt.label}</span>
                </div>
                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  settings.message_permission === opt.value
                    ? "border-accent bg-accent"
                    : "border-border"
                }`}>
                  {settings.message_permission === opt.value && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Story Auto-Save */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-1">Expired Stories</p>
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-soft divide-y divide-border/30">
            {STORY_SAVE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSettings((s) => ({ ...s, auto_save_stories: opt.value }))}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <div className="text-left">
                    <span className="text-[13px] font-medium text-foreground block">{opt.label}</span>
                    <span className="text-[11px] text-muted-foreground">{opt.desc}</span>
                  </div>
                </div>
                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  settings.auto_save_stories === opt.value
                    ? "border-accent bg-accent"
                    : "border-border"
                }`}>
                  {settings.auto_save_stories === opt.value && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="w-full h-11 rounded-xl gradient-accent border-0 font-bold text-[13px] gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Privacy Settings"}
        </Button>
      </div>
    </div>
  );
}
