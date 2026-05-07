import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  User, Pencil, X, Check, ChevronRight, MapPin, Trophy, Compass,
  Crown, Settings, Gift, Globe, Users, Eye, Lock, Camera
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const [isPublicMap, setIsPublicMap] = useState(true);

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
    <div className="pb-4">
      {/* Profile Hero */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute -top-20 right-0 w-48 h-48 rounded-full bg-emerald-500/6 blur-3xl" />

        <div className="relative px-5 pt-12 pb-6">
          {/* Edit button */}
          <div className="absolute top-12 right-5 flex gap-2">
            {editing && (
              <button onClick={() => setEditing(false)} className="h-8 w-8 rounded-full dark-card-elevated flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-dark-muted" />
              </button>
            )}
            <button onClick={editing ? saveEdit : startEdit} className="h-8 w-8 rounded-full dark-card-elevated flex items-center justify-center">
              {editing ? <Check className="h-3.5 w-3.5 text-glow" /> : <Pencil className="h-3.5 w-3.5 text-dark-muted" />}
            </button>
          </div>

          <div className="flex flex-col items-center text-center space-y-3">
            {/* Avatar */}
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-2 border-emerald-500/30 flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-500/20 to-teal-500/10">
                {profile?.profile_photo ? (
                  <img src={profile.profile_photo} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <User className="h-9 w-9 text-glow" />
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full gradient-accent flex items-center justify-center border-2 border-[hsl(225,28%,7%)]">
                <Camera className="h-3 w-3 text-white" />
              </button>
            </div>

            {editing ? (
              <div className="space-y-2 w-full max-w-xs text-left">
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Your name" className="bg-white/5 border-white/10 text-white placeholder:text-dark-muted" />
                <Input value={editForm.home_city} onChange={(e) => setEditForm({ ...editForm, home_city: e.target.value })} placeholder="Home city" className="bg-white/5 border-white/10 text-white placeholder:text-dark-muted" />
                <Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Tell us about your travel style..." rows={2} className="bg-white/5 border-white/10 text-white placeholder:text-dark-muted" />
              </div>
            ) : (
              <>
                <div>
                  <h2 className="font-heading text-xl font-bold text-white">{profile?.name || "Traveler"}</h2>
                  {profile?.home_city && (
                    <p className="text-[12px] text-dark-muted flex items-center justify-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />{profile.home_city}
                    </p>
                  )}
                </div>
                {profile?.bio && <p className="text-[12px] text-dark-muted max-w-[260px] leading-relaxed">{profile.bio}</p>}
                <p className="text-[10px] text-dark-muted tracking-wider uppercase">Member since {memberDate}</p>
              </>
            )}

            {/* Social stats row */}
            <div className="flex items-center gap-4 pt-1">
              <div className="text-center">
                <p className="font-heading font-bold text-base text-white">0</p>
                <p className="text-[10px] text-dark-muted">Followers</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center">
                <p className="font-heading font-bold text-base text-white">0</p>
                <p className="text-[10px] text-dark-muted">Following</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <button onClick={() => setIsPublicMap(!isPublicMap)} className="flex items-center gap-1 text-[10px] font-bold text-dark-muted">
                {isPublicMap ? <Eye className="h-3 w-3 text-glow" /> : <Lock className="h-3 w-3" />}
                <span className={isPublicMap ? "text-glow" : ""}>{isPublicMap ? "Public Map" : "Private"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Light content */}
      <div className="px-4 pt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 animate-fade-in">
          {[
            { label: "Countries", value: profile?.total_countries_visited || 0, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Cities", value: profile?.total_cities_visited || 0, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Trips", value: trips.length, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Check-ins", value: checkInCount, color: "text-rose-500", bg: "bg-rose-50" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl ${s.bg} p-3 text-center`}>
              <p className={`font-heading font-bold text-lg ${s.color} leading-none`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className="space-y-2.5 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-accent" />
            <h3 className="section-title">Badges</h3>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {ALL_BADGES.map((badge) => {
              const earned = earnedBadgeNames.has(badge.name);
              return (
                <div key={badge.name} className={`rounded-xl p-2.5 text-center transition-all ${earned ? "bg-emerald-50 border border-emerald-200" : "bg-card border border-border/40 opacity-40"}`}>
                  <p className="text-xl">{earned ? badge.image : "🔒"}</p>
                  <p className={`text-[8px] font-bold mt-1 leading-tight ${earned ? "text-foreground" : "text-muted-foreground"}`}>{badge.name}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Trips */}
        {trips.length > 0 && (
          <div className="space-y-2.5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="section-header">
              <h3 className="section-title">Recent Trips</h3>
              <button onClick={() => navigate("/trips")} className="section-link">
                See All <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            {trips.map((trip) => (
              <div key={trip.id} className="flex items-center gap-3 rounded-xl bg-card border border-border/40 p-3 shadow-soft">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/8 to-emerald-500/8 flex items-center justify-center shrink-0">
                  <Compass className="h-4 w-4 text-primary/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] text-foreground truncate">{trip.title}</p>
                  <p className="text-[11px] text-muted-foreground">{trip.destination}</p>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${
                  trip.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-accent/12 text-accent"
                }`}>
                  {trip.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-1.5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          {[
            { label: "My Globe", icon: Globe, route: "/globe", desc: "View your travel map" },
            { label: "Refer Friends", icon: Gift, route: "/referral", desc: "Earn free months" },
            { label: "Subscription", icon: Crown, route: "/subscription", desc: "Manage your plan" },
            { label: "Settings", icon: Settings, route: "/settings", desc: "App preferences" },
          ].map((action) => (
            <button key={action.label} onClick={() => navigate(action.route)} className="w-full flex items-center gap-3 rounded-xl bg-card border border-border/40 p-3.5 hover:shadow-soft transition-all text-left">
              <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <action.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground">{action.label}</p>
                <p className="text-[11px] text-muted-foreground">{action.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
