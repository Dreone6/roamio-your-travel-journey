import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user_id, city, lat, lng } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [profileRes, offersRes] = await Promise.all([
      supabase.from("profiles").select("travel_style,interests").eq("id", user_id).maybeSingle(),
      lat != null && lng != null
        ? supabase.rpc("nearby_offers", { lat, lng, radius_miles: 5 })
        : supabase.from("partner_offers").select("id,business_name,category,offer_description").eq("active", true).limit(20),
    ]);

    const profile = profileRes.data || { travel_style: "balanced", interests: [] };
    const offers = (offersRes.data as any[]) || [];
    if (offers.length === 0) {
      return new Response(JSON.stringify({ recommended_offer_id: null, reason: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const offerList = offers.slice(0, 12).map((o: any) => ({
      id: o.id, title: o.business_name, category: o.category, blurb: o.offer_description?.slice(0, 80),
    }));

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Pick the single best partner offer for the traveler. Reply with the tool call only." },
          { role: "user", content: `Traveler style: ${profile.travel_style || "balanced"}. Interests: ${(profile.interests || []).join(", ") || "varied"}. City: ${city || "unknown"}. Offers: ${JSON.stringify(offerList)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "pick_offer",
            description: "Return the chosen offer id and a short reason.",
            parameters: {
              type: "object",
              properties: {
                recommended_offer_id: { type: "string" },
                reason: { type: "string", description: "Max 15 words" },
              },
              required: ["recommended_offer_id", "reason"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "pick_offer" } },
      }),
    });

    if (resp.status === 429 || resp.status === 402) {
      return new Response(JSON.stringify({ recommended_offer_id: offers[0].id, reason: "Closest to you", fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) throw new Error(`AI gateway ${resp.status}`);

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { recommended_offer_id: offers[0].id, reason: "Top match" };

    // ensure id is valid
    if (!offers.find((o: any) => o.id === parsed.recommended_offer_id)) {
      parsed.recommended_offer_id = offers[0].id;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recommend-offer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
