import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BADGE_DEFINITIONS = [
  { name: "First Check In", category: "milestones", check: "check_ins", threshold: 1, image: "📍" },
  { name: "Globetrotter", category: "milestones", check: "countries", threshold: 5, image: "🌍" },
  { name: "Wanderer", category: "milestones", check: "cities", threshold: 10, image: "🧭" },
  { name: "Foodie Explorer", category: "challenges", check: "food_challenges", threshold: 3, image: "🍜" },
  { name: "Streak Keeper", category: "streaks", check: "streak_days", threshold: 30, image: "🔥" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch user stats
    const [checkInsRes, placesRes, challengesRes, badgesRes] = await Promise.all([
      supabase.from("check_ins").select("id, timestamp").eq("user_id", user_id),
      supabase.from("places_visited").select("id, country, city").eq("user_id", user_id),
      supabase.from("challenges").select("id, status, challenge_text").eq("user_id", user_id).eq("status", "completed"),
      supabase.from("badges").select("badge_name").eq("user_id", user_id),
    ]);

    const checkInCount = checkInsRes.data?.length || 0;
    const countries = new Set(placesRes.data?.map((p: any) => p.country) || []).size;
    const cities = new Set(placesRes.data?.map((p: any) => `${p.city}-${p.country}`) || []).size;
    const foodChallenges = challengesRes.data?.filter((c: any) =>
      c.challenge_text?.toLowerCase().includes("food") ||
      c.challenge_text?.toLowerCase().includes("restaurant") ||
      c.challenge_text?.toLowerCase().includes("eat") ||
      c.challenge_text?.toLowerCase().includes("cuisine")
    ).length || 0;

    // Calculate streak (consecutive days)
    let streakDays = 0;
    if (checkInsRes.data && checkInsRes.data.length > 0) {
      const dates = new Set(
        checkInsRes.data.map((c: any) => new Date(c.timestamp).toISOString().split("T")[0])
      );
      const sorted = [...dates].sort().reverse();
      const today = new Date().toISOString().split("T")[0];
      let checkDate = today;
      for (const d of sorted) {
        if (d === checkDate) {
          streakDays++;
          const prev = new Date(checkDate);
          prev.setDate(prev.getDate() - 1);
          checkDate = prev.toISOString().split("T")[0];
        } else if (d < checkDate) {
          break;
        }
      }
    }

    const existingBadges = new Set(badgesRes.data?.map((b: any) => b.badge_name) || []);

    const stats: Record<string, number> = {
      check_ins: checkInCount,
      countries,
      cities,
      food_challenges: foodChallenges,
      streak_days: streakDays,
    };

    const awarded: string[] = [];
    for (const badge of BADGE_DEFINITIONS) {
      if (existingBadges.has(badge.name)) continue;
      if (stats[badge.check] >= badge.threshold) {
        await supabase.from("badges").insert({
          user_id,
          badge_name: badge.name,
          badge_image: badge.image,
          category: badge.category,
          earned_date: new Date().toISOString().split("T")[0],
        });
        awarded.push(badge.name);
      }
    }

    return new Response(JSON.stringify({ awarded, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-badges error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
