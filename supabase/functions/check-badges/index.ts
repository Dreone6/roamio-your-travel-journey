import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type BadgeDef = {
  slug: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
  test: (s: Stats) => boolean;
};

type Stats = {
  total_checkins: number;
  countries_visited: number;
  cities_visited: number;
  total_landmarks: number;
  total_trophies: number;
  offers_claimed: number;
  checkins_with_photos: number;
};

const BADGES: BadgeDef[] = [
  { slug: "first-step", name: "First Step", description: "You logged your first check-in.", category: "milestone", emoji: "📍", test: s => s.total_checkins >= 1 },
  { slug: "globetrotter-5", name: "Globetrotter", description: "Visited 5 countries.", category: "countries", emoji: "🌍", test: s => s.countries_visited >= 5 },
  { slug: "world-citizen-15", name: "World Citizen", description: "Visited 15 countries.", category: "countries", emoji: "🌐", test: s => s.countries_visited >= 15 },
  { slug: "explorer-25", name: "Explorer", description: "Visited 25 countries.", category: "countries", emoji: "🧭", test: s => s.countries_visited >= 25 },
  { slug: "city-hopper-10", name: "City Hopper", description: "Visited 10 cities.", category: "cities", emoji: "🏙", test: s => s.cities_visited >= 10 },
  { slug: "urban-legend-50", name: "Urban Legend", description: "Visited 50 cities.", category: "cities", emoji: "🌆", test: s => s.cities_visited >= 50 },
  { slug: "landmark-hunter-3", name: "Landmark Hunter", description: "Unlocked 3 landmarks.", category: "landmarks", emoji: "🏛", test: s => s.total_landmarks >= 3 },
  { slug: "landmark-master-10", name: "Landmark Master", description: "Unlocked 10 landmarks.", category: "landmarks", emoji: "🗽", test: s => s.total_landmarks >= 10 },
  { slug: "trophy-collector", name: "Trophy Collector", description: "Earned 5 trophies.", category: "trophy", emoji: "🏆", test: s => s.total_trophies >= 5 },
  { slug: "deal-seeker", name: "Deal Seeker", description: "Claimed your first partner offer.", category: "milestone", emoji: "🎟", test: s => s.offers_claimed >= 1 },
  { slug: "memory-maker", name: "Memory Maker", description: "10 check-ins with photos.", category: "milestone", emoji: "📸", test: s => s.checkins_with_photos >= 10 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [places, checks, badgesExisting, offers] = await Promise.all([
      supabase.from("places_visited").select("country,city,is_milestone").eq("user_id", user_id),
      supabase.from("check_ins").select("id,photo,photos").eq("user_id", user_id),
      supabase.from("badges").select("badge_slug").eq("user_id", user_id),
      supabase.from("offer_interactions").select("id").eq("user_id", user_id).eq("interaction_type", "claim"),
    ]);

    const countries = new Set((places.data || []).map((p: any) => p.country)).size;
    const cities = new Set((places.data || []).map((p: any) => `${p.city}-${p.country}`)).size;
    const landmarks = (places.data || []).filter((p: any) => p.is_milestone).length;
    const total_checkins = checks.data?.length || 0;
    const checkins_with_photos = (checks.data || []).filter((c: any) => c.photo || (c.photos && c.photos.length > 0)).length;
    const offers_claimed = offers.data?.length || 0;

    const owned = new Set((badgesExisting.data || []).map((b: any) => b.badge_slug).filter(Boolean));

    // First pass: count current trophies (badges) excluding pending new ones for the trophy-collector check
    let trophies = owned.size;
    const stats: Stats = {
      total_checkins, countries_visited: countries, cities_visited: cities,
      total_landmarks: landmarks, total_trophies: trophies,
      offers_claimed, checkins_with_photos,
    };

    const newly: any[] = [];
    for (const b of BADGES) {
      if (owned.has(b.slug)) continue;
      // re-evaluate trophy count each iteration so trophy-collector triggers when threshold met
      stats.total_trophies = trophies;
      if (!b.test(stats)) continue;
      const { error } = await supabase.from("badges").insert({
        user_id, badge_slug: b.slug, badge_name: b.name, description: b.description,
        category: b.category, badge_image: b.emoji,
        earned_date: new Date().toISOString().split("T")[0],
      });
      if (!error) {
        owned.add(b.slug); trophies += 1;
        newly.push({ slug: b.slug, name: b.name, description: b.description, category: b.category, emoji: b.emoji });
      }
    }

    return new Response(JSON.stringify({ newly_awarded: newly, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-badges error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
