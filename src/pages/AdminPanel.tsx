import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Users, MapPin, Tag, BarChart3, Plus, Search,
  ArrowLeft, Eye, Edit2, Power, PowerOff, ChevronRight, TrendingUp
} from "lucide-react";

type AdminTab = "dashboard" | "partners" | "offers" | "users" | "analytics";

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<AdminTab>("dashboard");

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) { navigate("/"); return; }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!data || data.length === 0) {
      toast({ title: "Access denied", description: "You do not have admin privileges.", variant: "destructive" });
      navigate("/");
    } else {
      setIsAdmin(true);
    }
  };

  if (isAdmin === null) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const tabs: { id: AdminTab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "partners", label: "Partners", icon: Tag },
    { id: "offers", label: "Offers", icon: Tag },
    { id: "users", label: "Users", icon: Users },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-5 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-heading text-lg font-semibold text-foreground">Admin Panel</h1>
      </div>

      <div className="flex overflow-x-auto border-b border-border bg-card">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${tab === id ? "border-accent text-accent" : "border-transparent text-muted-foreground"}`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "partners" && <PartnersTab />}
        {tab === "offers" && <OffersTab />}
        {tab === "users" && <UsersTab />}
        {tab === "analytics" && <AnalyticsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const [stats, setStats] = useState({ users: 0, trips: 0, checkIns: 0, activeOffers: 0, claims: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [usersRes, tripsRes, checkInsRes, offersRes, claimsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("trips").select("id", { count: "exact", head: true }),
      supabase.from("check_ins").select("id", { count: "exact", head: true }),
      supabase.from("partner_offers").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("offer_interactions").select("id", { count: "exact", head: true }).eq("interaction_type", "claim"),
    ]);
    setStats({
      users: usersRes.count || 0,
      trips: tripsRes.count || 0,
      checkIns: checkInsRes.count || 0,
      activeOffers: offersRes.count || 0,
      claims: claimsRes.count || 0,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold">Dashboard</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Users", value: stats.users, icon: "👥" },
          { label: "Total Trips", value: stats.trips, icon: "✈️" },
          { label: "Check Ins", value: stats.checkIns, icon: "📍" },
          { label: "Active Offers", value: stats.activeOffers, icon: "🏷️" },
          { label: "Offer Claims", value: stats.claims, icon: "🎯" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl">{s.icon}</p>
            <p className="font-heading text-xl font-bold text-foreground mt-1">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartnersTab() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ business_name: "", contact_email: "", contact_phone: "", commission_rate: "", address: "", latitude: "", longitude: "", category: "other" });

  useEffect(() => { loadPartners(); }, []);

  const loadPartners = async () => {
    const { data } = await supabase.from("partners").select("*").order("created_at", { ascending: false });
    setPartners(data || []);
  };

  const addPartner = async () => {
    const { error } = await supabase.from("partners").insert({
      business_name: form.business_name,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      commission_rate: form.commission_rate ? parseFloat(form.commission_rate) : 0,
      address: form.address || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      category: form.category as any,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setShowAdd(false);
      setForm({ business_name: "", contact_email: "", contact_phone: "", commission_rate: "", address: "", latitude: "", longitude: "", category: "other" });
      loadPartners();
      toast({ title: "Partner added" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">Partners</h2>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1"><Plus className="h-3 w-3" /> Add</Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Business Name *</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Category</Label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {["food", "activity", "lodging", "transport", "shopping", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Commission %</Label><Input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Latitude</Label><Input type="number" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Longitude</Label><Input type="number" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
          </div>
          <Button onClick={addPartner} disabled={!form.business_name} size="sm">Save Partner</Button>
        </div>
      )}

      <div className="space-y-2">
        {partners.map((p) => (
          <div key={p.id} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-foreground">{p.business_name}</p>
              <p className="text-xs text-muted-foreground">{p.category} · {p.commission_rate}% commission</p>
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {p.active ? "Active" : "Inactive"}
            </span>
          </div>
        ))}
        {partners.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No partners yet</p>}
      </div>
    </div>
  );
}

function OffersTab() {
  const { toast } = useToast();
  const [offers, setOffers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ business_name: "", category: "other", address: "", latitude: "", longitude: "", offer_description: "", discount: "", image: "" });

  useEffect(() => { loadOffers(); }, []);

  const loadOffers = async () => {
    const { data } = await supabase.from("partner_offers").select("*").order("created_at", { ascending: false });
    setOffers(data || []);
  };

  const addOffer = async () => {
    const { error } = await supabase.from("partner_offers").insert({
      business_name: form.business_name,
      category: form.category as any,
      address: form.address || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      offer_description: form.offer_description,
      discount: form.discount || null,
      image: form.image || null,
      active: true,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setShowAdd(false);
      setForm({ business_name: "", category: "other", address: "", latitude: "", longitude: "", offer_description: "", discount: "", image: "" });
      loadOffers();
      toast({ title: "Offer created" });
    }
  };

  const toggleOffer = async (id: string, active: boolean) => {
    await supabase.from("partner_offers").update({ active: !active }).eq("id", id);
    loadOffers();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">Offers</h2>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1"><Plus className="h-3 w-3" /> Add</Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Business Name *</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Category</Label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {["food", "activity", "lodging", "transport", "shopping", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1"><Label className="text-xs">Offer Description *</Label><Textarea value={form.offer_description} onChange={(e) => setForm({ ...form, offer_description: e.target.value })} rows={2} /></div>
            <div className="space-y-1"><Label className="text-xs">Discount</Label><Input placeholder="20% off" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Image URL</Label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Lat, Lng</Label>
              <div className="flex gap-2">
                <Input type="number" placeholder="Lat" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
                <Input type="number" placeholder="Lng" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
              </div>
            </div>
          </div>
          <Button onClick={addOffer} disabled={!form.business_name || !form.offer_description} size="sm">Create Offer</Button>
        </div>
      )}

      <div className="space-y-2">
        {offers.map((o) => (
          <div key={o.id} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-foreground">{o.business_name}</p>
              <p className="text-xs text-muted-foreground">{o.offer_description?.substring(0, 60)}...</p>
            </div>
            <button onClick={() => toggleOffer(o.id, o.active)} className={`p-1.5 rounded-md ${o.active ? "text-green-600" : "text-red-500"}`}>
              {o.active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            </button>
          </div>
        ))}
        {offers.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No offers yet</p>}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
    setUsers(data || []);
  };

  const filtered = users.filter((u) =>
    (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg font-semibold">Users</h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-foreground">{u.name || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">{u.email} · {u.home_city || "No city"}</p>
            </div>
            <div className="text-xs text-muted-foreground">
              {u.total_trips || 0} trips · {u.total_countries_visited || 0} countries
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const [topOffers, setTopOffers] = useState<any[]>([]);
  const [topDestinations, setTopDestinations] = useState<any[]>([]);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    // Top offers by claims
    const { data: interactions } = await supabase
      .from("offer_interactions")
      .select("offer_id, partner_offers(business_name)")
      .eq("interaction_type", "claim");

    if (interactions) {
      const counts: Record<string, { name: string; count: number }> = {};
      interactions.forEach((i: any) => {
        const name = i.partner_offers?.business_name || "Unknown";
        if (!counts[i.offer_id]) counts[i.offer_id] = { name, count: 0 };
        counts[i.offer_id].count++;
      });
      setTopOffers(Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10));
    }

    // Top destinations
    const { data: places } = await supabase.from("places_visited").select("country, city");
    if (places) {
      const destCounts: Record<string, number> = {};
      places.forEach((p: any) => {
        const key = `${p.city}, ${p.country}`;
        destCounts[key] = (destCounts[key] || 0) + 1;
      });
      setTopDestinations(
        Object.entries(destCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10)
      );
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-lg font-semibold">Analytics</h2>

      <div className="space-y-3">
        <h3 className="font-heading text-sm font-semibold text-foreground">Top Offers by Claims</h3>
        {topOffers.length > 0 ? (
          <div className="space-y-2">
            {topOffers.map((o, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2">
                <span className="text-sm font-bold text-accent w-6">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{o.name}</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{o.count} claims</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">No claims yet</p>}
      </div>

      <div className="space-y-3">
        <h3 className="font-heading text-sm font-semibold text-foreground">Top Destinations</h3>
        {topDestinations.length > 0 ? (
          <div className="space-y-2">
            {topDestinations.map((d, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2">
                <span className="text-sm font-bold text-accent w-6">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{d.name}</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{d.count} visits</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">No destination data yet</p>}
      </div>
    </div>
  );
}
