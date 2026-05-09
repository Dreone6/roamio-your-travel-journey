import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ensureLocationPermission } from "@/lib/permissions";
import { Switch } from "@/components/ui/switch";
import { Radio } from "lucide-react";
import { toast } from "sonner";

export default function LiveLocationToggle() {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("live_locations").select("active, updated_at").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setActive(data.active); setUpdatedAt(data.updated_at); }
    });
  }, [user]);

  const toggle = async (v: boolean) => {
    if (!user) return;
    if (v) {
      const ok = await ensureLocationPermission();
      if (!ok) return toast.error("Location access required");
      navigator.geolocation.getCurrentPosition(async (pos) => {
        await supabase.from("live_locations").upsert({
          user_id: user.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          active: true,
          updated_at: new Date().toISOString(),
        });
        setActive(true);
        setUpdatedAt(new Date().toISOString());
        toast.success("Live location shared with trusted contacts");
      });
    } else {
      await supabase.from("live_locations").upsert({
        user_id: user.id, active: false, updated_at: new Date().toISOString(),
      });
      setActive(false);
      toast.success("Live location paused");
    }
  };

  return (
    <div className="dark-card rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className={`h-4 w-4 ${active ? "text-emerald-400 animate-pulse" : "text-dark-muted"}`} />
          <p className="text-[12px] font-bold text-white">Live location</p>
        </div>
        <Switch checked={active} onCheckedChange={toggle} />
      </div>
      <p className="text-[10px] text-dark-muted">
        Share your real-time location with trusted contacts who have live-location access enabled.
      </p>
      {active && updatedAt && (
        <p className="text-[10px] text-emerald-400">
          Sharing since {new Date(updatedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
