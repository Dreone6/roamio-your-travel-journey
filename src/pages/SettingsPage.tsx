import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft, Bell, MapPin, Shield, FileText, Mail, LogOut,
  Trash2, ChevronRight, AlertTriangle
} from "lucide-react";

export default function SettingsPage() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [locationStatus, setLocationStatus] = useState<string>("unknown");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useState(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setLocationStatus(result.state);
      });
    }
  });

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // Delete user data
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
          label: "Notifications",
          right: <Switch checked={notifications} onCheckedChange={setNotifications} />,
        },
        {
          icon: MapPin,
          label: "Location Permissions",
          right: (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
              locationStatus === "granted" ? "bg-green-100 text-green-700" :
              locationStatus === "denied" ? "bg-destructive/15 text-destructive" :
              "bg-secondary text-muted-foreground"
            }`}>
              {locationStatus}
            </span>
          ),
        },
      ],
    },
    {
      title: "Legal",
      items: [
        { icon: Shield, label: "Privacy Policy", onClick: () => toast.info("Privacy Policy will be available at launch.") },
        { icon: FileText, label: "Terms of Service", onClick: () => toast.info("Terms of Service will be available at launch.") },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: Mail, label: "Contact Support", onClick: () => window.open("mailto:support@roamio.app") },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-4 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/profile")} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-heading text-xl font-semibold text-foreground">Settings</h1>
        </div>

        {settingsSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">{section.title}</p>
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors"
                  disabled={!item.onClick && !item.right}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </div>
                  {item.right || (item.onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Sign Out */}
        <Button variant="outline" onClick={signOut} className="w-full gap-2">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>

        {/* Delete Account */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-center text-sm text-destructive hover:underline py-2"
          >
            Delete Account
          </button>
        ) : (
          <div className="rounded-xl border-2 border-destructive bg-destructive/5 p-4 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-heading font-semibold text-sm">Are you sure?</p>
            </div>
            <p className="text-xs text-muted-foreground">This will permanently delete all your trips, check-ins, badges, and account data.</p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={deleting} className="flex-1">
                {deleting ? "Deleting..." : "Delete Everything"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
