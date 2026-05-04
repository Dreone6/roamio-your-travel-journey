import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  User, LogOut, Pencil, X, Check, Globe, ChevronRight,
  MapPin, Trophy, Compass, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const coralIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [20, 33], iconAnchor: [10, 33], popupAnchor: [1, -28], shadowSize: [33, 33],
});

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

interface Place {
  latitude: number | null;
  longitude: number | null;
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [checkInCount, setCheckInCount] = useState(0);
  const [trips, setTrips] = useState<any[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", home_city: "", bio: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  const loadAll = async () => {
    const [profileRes, badgesRes, checkInsRes, tripsRes, placesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user!.id).single(),
      supabase.from("badges").select("*").eq("user_id", user!.id).order("earned_date", { ascending: false }),
      supabase.from("check_ins").select("id").eq("user_id", user!.id),
      supabase.from("trips").select("id, title, destination, start_date, status").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(3),
      supabase.from("places_visited").select("latitude, longitude").eq("user_id", user!.id),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);
    setBadges((badgesRes.data as Badge[]) || []);
    setCheckInCount(checkInsRes.data?.length || 0);
    setTrips(tripsRes.data || []);
    setPlaces((placesRes.data as Place[]) || []);

    // Trigger badge check
    await supabase.functions.invoke("check-badges", { body: { user_id: user!.id } });
    // Reload badges after check
    const { data: freshBadges } = await supabase.from("badges").select("*").eq("user_id", user!.id).order("earned_date", { ascending: false });
    setBadges((freshBadges as Badge[]) || []);

    setLoading(false);
  };

  const startEdit = () => {
    setEditing(true);
    setEditForm({
      name: profile?.name || "",
      home_city: profile?.home_city || "",
      bio: profile?.bio || "",
    });
  };

  const saveEdit = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ name: editForm.name, home_city: editForm.home_city, bio: editForm.bio })
      .eq("id", user!.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProfile((p) => p ? { ...p, ...editForm } : p);
      setEditing(false);
      toast({ title: "Profile updated" });
    }
  };

  const earnedBadgeNames = new Set(badges.map((b) => b.badge_name));
  const mapPlaces = places.filter((p) => p.latitude && p.longitude);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const memberDate = profile?.member_since
    ? new Date(profile.member_since).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="px-5 pt-8 pb-4 space-y-5">
      {/* Hero */}
      <div className="relative rounded-2xl bg-card border border-border p-5 text-center">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3"
          onClick={editing ? saveEdit : startEdit}
        >
          {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </Button>
        {editing && (
          <Button variant="ghost" size="icon" className="absolute top-3 left-3" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        )}

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary mb-3">
          {profile?.profile_photo ? (
            <img src={profile.profile_photo} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <User className="h-10 w-10 text-primary" />
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
            <h2 className="font-heading text-xl font-semibold text-foreground">{profile?.name || "Traveler"}</h2>
            {profile?.home_city && <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><MapPin className="h-3 w-3" />{profile.home_city}</p>}
            {profile?.bio && <p className="text-xs text-muted-foreground mt-1">{profile.bio}</p>}
            <p className="text-[10px] text-muted-foreground mt-2">Member since {memberDate}</p>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Countries", value: profile?.total_countries_visited || new Set(places.map(() => "")).size, icon: "🌍" },
          { label: "Cities", value: profile?.total_cities_visited || places.length, icon: "🏙️" },
          { label: "Trips", value: profile?.total_trips || trips.length, icon: "✈️" },
          { label: "Check ins", value: checkInCount, icon: "📍" },
          { label: "Badges", value: badges.length, icon: "🏅" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-card border border-border p-2 text-center">
            <p className="text-base">{s.icon}</p>
            <p className="font-heading font-semibold text-sm text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Mini Globe */}
      {mapPlaces.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-semibold text-foreground">Your Globe</h3>
            <button onClick={() => navigate("/globe")} className="text-xs text-accent flex items-center gap-0.5">
              See Full Globe <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border border-border h-40">
            <MapContainer center={[20, 0]} zoom={1} className="h-full w-full" scrollWheelZoom={false} zoomControl={false} dragging={false} attributionControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {mapPlaces.map((p, i) => (
                <Marker key={i} position={[p.latitude!, p.longitude!]} icon={coralIcon} />
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Recent Trips */}
      {trips.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-heading text-sm font-semibold text-foreground">Recent Trips</h3>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5">
            {trips.map((trip) => (
              <div key={trip.id} className="shrink-0 w-48 rounded-xl border border-border bg-card overflow-hidden">
                <div className="h-20 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Compass className="h-8 w-8 text-primary/40" />
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm text-foreground truncate">{trip.title}</p>
                  <p className="text-xs text-muted-foreground">{trip.destination}</p>
                  <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${trip.status === "completed" ? "bg-green-100 text-green-700" : trip.status === "active" ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"}`}>
                    {trip.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="space-y-2">
        <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-accent" /> Badges
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {ALL_BADGES.map((badge) => {
            const earned = earnedBadgeNames.has(badge.name);
            const earnedBadge = badges.find((b) => b.badge_name === badge.name);
            return (
              <div
                key={badge.name}
                className={`rounded-xl border p-3 text-center space-y-1 transition-all ${earned ? "border-accent/30 bg-accent/5" : "border-border bg-card opacity-50"}`}
              >
                <p className="text-2xl">{earned ? badge.image : "🔒"}</p>
                <p className={`text-xs font-medium ${earned ? "text-foreground" : "text-muted-foreground"}`}>{badge.name}</p>
                {earned && earnedBadge ? (
                  <p className="text-[10px] text-muted-foreground">{new Date(earnedBadge.earned_date).toLocaleDateString()}</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">{badge.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sign Out */}
      <Button variant="outline" onClick={signOut} className="w-full gap-2">
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
}
