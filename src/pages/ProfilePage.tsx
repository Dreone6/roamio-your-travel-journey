import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  User, Pencil, X, Check, ChevronRight,
  MapPin, Trophy, Compass, Crown, Settings, Gift, LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import EmptyState from "@/components/EmptyState";
import { SkeletonProfileHero, SkeletonStatGrid } from "@/components/ui/skeleton-card";

interface Profile {
  name: string | null;
  email: string | null;
  profile_photo: string | null;
  home_city: string | null;
  bio: string | null;
  member_since: string;
  total_countries_visited: number;
  total_cities_visited: number;
  total_trips: number;
}

interface Badge {
  id: string;
  badge_name: string;
  badge_image: string | null;
  earned_date: string;
  category: string | null;
}

const ALL_BADGES = [
  { name: "First Check In", image: "📍", description: "Complete your first check in" },
  { name: "Globetrotter", image: "🌍", description: "Visit 5 countries" },
  { name: "Wanderer", image: "🧭", description: "Visit 10 cities" },
  { name: "Foodie Explorer", image: "🍜", description: "Complete 3 food challenges" },
  { name: "Streak Keeper", image: "🔥", description: "30 day check in streak" },
];

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [checkInCount, setCheckInCount] = useState(0);
  const [trips, setTrips] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", home_city: "", bio: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    try {
      const [profileRes, badgesRes, checkInsRes, tripsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).single(),
        supabase.from("badges").select("*").eq("user_id", user!.id).order("earned_date", { ascending: false }),
        supabase.from("check_ins").select("id").eq("user_id", user!.id),
        supabase.from("trips").select("id, title, destination, start_date, status").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(3),
      ]);

      if (profileRes.data) setProfile(profileRes.data as Profile);
      setBadges((badgesRes.data as Badge[]) || []);
      setCheckInCount(checkInsRes.data?.length || 0);
      setTrips(tripsRes.data || []);

      await supabase.functions.invoke("check-badges", { body: { user_id: user!.id } });
      const { data: freshBadges } = await supabase.from("badges").select("*").eq("user_id", user!.id).order("earned_date", { ascending: false });
      setBadges((freshBadges as Badge[]) || []);
    } catch {
      toast.error("Failed to load profile data");
    }
    setLoading(false);
  };

  const startEdit = () => {
    setEditing(true);
    setEditForm({ name: profile?.name || "", home_city: profile?.home_city || "", bio: profile?.bio || "" });
  };

  const saveEdit = async () => {
    const { error } = await supabase.from("profiles").update({ name: editForm.name, home_city: editForm.home_city, bio: editForm.bio }).eq("id", user!.id);
    if (error) { toast.error(error.message); } else { setProfile((p) => p ? { ...p, ...editForm } : p); setEditing(false); toast.success("Profile updated"); }
  };

  const earnedBadgeNames = new Set(badges.map((b) => b.badge_name));

  if (loading) {
    return (
      <div className="px-5 pt-8 pb-4 space-y-5">
        <SkeletonProfileHero />
        <SkeletonStatGrid />
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  const memberDate = profile?.member_since
    ? new Date(profile.member_since).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="pb-24">
      {/* Profile Hero - Light clean */}
      <div className="bg-gradient-to-b from-primary/5 to-background px-5 pt-10 pb-6">
        <div className="relative rounded-2xl bg-card border border-border/50 p-6 text-center shadow-soft">
          <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={editing ? saveEdit : startEdit}>
            {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </Button>
          {editing && (
            <Button variant="ghost" size="icon" className="absolute top-3 left-3" onClick={() => setEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          )}

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 mb-3 border-2 border-emerald-200">
            {profile?.profile_photo ? (
              <img src={profile.profile_photo} alt="Profile" className="h-20 w-20 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <User className="h-10 w-10 text-emerald-600" />
            )}
          </div>

          {editing ? (
            <div className="space-y-2 text-left">
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Your name" />
              <Input value={editForm.home_city} onChange={(e) => setEditForm({ ...editForm, home_city: e.target.value })} placeholder="Home city" />
              <Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Bio" rows={2} />
            </div>
          ) : (
            <>
              <h2 className="font-heading text-xl font-bold text-foreground">{profile?.name || "Traveler"}</h2>
              {profile?.home_city && <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1"><MapPin className="h-3 w-3" />{profile.home_city}</p>}
              {profile?.bio && <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">{profile.bio}</p>}
              <p className="text-[10px] text-muted-foreground mt-3 tracking-wide uppercase">Member since {memberDate}</p>
            </>
          )}
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 animate-fade-in">
          {[
            { label: "Countries", value: profile?.total_countries_visited || 0, color: "text-emerald-600" },
            { label: "Cities", value: profile?.total_cities_visited || 0, color: "text-blue-600" },
            { label: "Trips", value: trips.length, color: "text-amber-600" },
            { label: "Check-ins", value: checkInCount, color: "text-rose-500" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-card border border-border/50 p-3.5 text-center shadow-soft">
              <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Trips */}
        {trips.length > 0 && (
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold text-foreground">Recent Trips</h3>
              <button onClick={() => navigate("/trips")} className="text-xs text-accent font-medium flex items-center gap-0.5">
                See All <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            {trips.map((trip) => (
              <div key={trip.id} className="flex items-center gap-3 rounded-2xl bg-card border border-border/50 p-3.5 shadow-soft">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-emerald-500/10 flex items-center justify-center shrink-0">
                  <Compass className="h-5 w-5 text-primary/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{trip.title}</p>
                  <p className="text-xs text-muted-foreground">{trip.destination}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${
                  trip.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-accent/15 text-accent"
                }`}>
                  {trip.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Badges */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <h3 className="font-heading text-base font-semibold text-foreground flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-accent" /> Badges
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {ALL_BADGES.map((badge) => {
              const earned = earnedBadgeNames.has(badge.name);
              return (
                <div key={badge.name} className={`rounded-2xl border p-3.5 text-center space-y-1 transition-all ${earned ? "border-emerald-200 bg-emerald-50" : "border-border/50 bg-card opacity-50"}`}>
                  <p className="text-2xl">{earned ? badge.image : "🔒"}</p>
                  <p className={`text-[11px] font-medium ${earned ? "text-foreground" : "text-muted-foreground"}`}>{badge.name}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          {[
            { label: "Refer Friends", icon: Gift, route: "/referral" },
            { label: "Subscription", icon: Crown, route: "/subscription" },
            { label: "Settings", icon: Settings, route: "/settings" },
          ].map((action) => (
            <button key={action.label} onClick={() => navigate(action.route)} className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border/50 p-4 hover:shadow-soft transition-all text-left">
              <action.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground flex-1">{action.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
