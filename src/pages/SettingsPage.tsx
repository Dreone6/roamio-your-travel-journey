import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft, Bell, MapPin, Shield, FileText, Mail, LogOut,
  Trash2, ChevronRight, AlertTriangle, Moon, HelpCircle, Camera, Volume2,
} from "lucide-react";

const PING_SOUNDS = [
  { id: "sonar",  label: "Sonar",  desc: "Soft descending ping (default)" },
  { id: "bell",   label: "Bell",   desc: "Single clear bell tone" },
  { id: "chime",  label: "Chime",  desc: "Two-note ascending chime" },
  { id: "silent", label: "Silent", desc: "Vibration only" },
] as const;

export default function SettingsPage() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [locationStatus, setLocationStatus] = useState<string>("unknown");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pingSound, setPingSound] = useState<string>(() => localStorage.getItem("roavr.pingSound") || "sonar");

  const updatePingSound = (id: string) => {
    setPingSound(id);
    localStorage.setItem("roavr.pingSound", id);
    toast.success(`Pin ping set to ${PING_SOUNDS.find(s => s.id === id)?.label}`);
  };

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setLocationStatus(result.state);
      });
    }
  }, []);

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await Promise.all([
        supabase.from("check_ins").delete().eq("user_id", user.id),
        supabase.from("trips").delete().eq("user_id", user.id),
        supabase.from("badges").delete().eq("user_id", user.id),
        supabase.from("challenges").delete().eq("user_id", user.id),
        supabase.from("places_visited").delete().eq("user_id", user.id),
        supabase.from("checklists").delete().eq("user_id", user.id),
      ]);
      await signOut();
      toast.success("Account data deleted. You have been signed out.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account data");
    } finally {
      setDeleting(false);
    }
  };

  const settingsSections = [
    {
      title: "Preferences",
      items: [
        {
          icon: Bell,
          label: "Push Notifications",
          desc: "Trip reminders & offers",
          right: <Switch checked={notifications} onCheckedChange={setNotifications} />,
        },
        {
          icon: MapPin,
          label: "Location Access",
          desc: "Required for check-ins",
          right: (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              locationStatus === "granted" ? "bg-emerald-100 text-emerald-700" :
              locationStatus === "denied" ? "bg-destructive/15 text-destructive" :
              "bg-secondary text-muted-foreground"
            }`}>
              {locationStatus}
            </span>
          ),
        },
        {
          icon: Shield,
          label: "Privacy & Visibility",
          desc: "Stories, map, messaging",
          onClick: () => navigate("/privacy"),
        },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center", desc: "FAQs & guides", onClick: () => toast.info("Help center coming soon.") },
        { icon: Mail, label: "Contact Support", desc: "Get help via email", onClick: () => window.open("mailto:support@roavr.app") },
      ],
    },
    {
      title: "Legal",
      items: [
        { icon: Shield, label: "Privacy Policy", onClick: () => toast.info("Privacy Policy will be available at launch.") },
        { icon: FileText, label: "Terms of Service", onClick: () => toast.info("Terms of Service will be available at launch.") },
      ],
    },
  ];

  return (
    <div className="min-h-screen pb-8">
      {/* Dark Header */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-5 pt-12 pb-5">
          <button onClick={() => navigate("/profile")} className="text-dark-muted mb-3 flex items-center gap-1 text-[13px]">
            <ArrowLeft className="h-4 w-4" /> Profile
          </button>
          <h1 className="font-heading text-[22px] font-bold text-white tracking-tight">Settings</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {settingsSections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-1 mb-1.5">{section.title}</p>
            <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30 overflow-hidden shadow-soft">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between px-3.5 py-3 text-left hover:bg-secondary/30 transition-colors"
                  disabled={!item.onClick && !item.right}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-[13px] font-semibold text-foreground block">{item.label}</span>
                      {(item as any).desc && <span className="text-[11px] text-muted-foreground">{(item as any).desc}</span>}
                    </div>
                  </div>
                  {item.right || (item.onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Sign Out */}
        <Button variant="outline" onClick={signOut} className="w-full h-11 rounded-xl gap-2 font-semibold text-[13px]">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>

        {/* Delete Account */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-center text-[12px] text-destructive/70 hover:text-destructive py-2 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 space-y-2.5 animate-fade-in">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <p className="font-heading font-bold text-[13px]">Delete everything?</p>
            </div>
            <p className="text-[11px] text-muted-foreground">This permanently removes all trips, check-ins, badges, and account data.</p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={deleting} className="flex-1 rounded-xl h-9 text-[12px]">
                {deleting ? "Deleting..." : "Delete"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl h-9 text-[12px]">
                Cancel
              </Button>
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground pt-2">Roavr v1.0 · Made with ❤️ for travelers</p>
      </div>
    </div>
  );
}
