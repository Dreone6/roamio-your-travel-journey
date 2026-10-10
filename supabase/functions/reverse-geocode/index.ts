import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const latitude = typeof body.latitude === "number" ? body.latitude : body.lat;
    const longitude = typeof body.longitude === "number" ? body.longitude : body.lng;
    const generate_challenge = body.generate_challenge;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return new Response(JSON.stringify({ error: "latitude and longitude are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reverse geocode. Nominatim blocks cloud hosts ("Access denied"), so use
    // Photon (komoot, free OSM data) first and never parse a non-OK body as JSON.
    let city = "", country = "", landmark = "", name = "";
    try {
      const r = await fetch(
        `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}&limit=1&lang=en`,
        { headers: { "User-Agent": "Roavr/1.0" } }
      );
      if (r.ok) {
        const p = (await r.json())?.features?.[0]?.properties ?? {};
        city = p.city || p.town || p.village || p.county || p.state || "";
        country = p.country || "";
        name = p.name || "";
        landmark = [p.name, p.street, city, p.state, country].filter(Boolean).join(", ");
      } else {
        console.warn("photon reverse failed", r.status, (await r.text()).slice(0, 200));
      }
    } catch (e) {
      console.warn("photon reverse error", e);
    }
    const locationName = name || city || landmark.split(",")[0] || "Unknown Location";

    const result: any = { city, country, landmark, location_name: locationName };

    // Generate AI challenge if requested
    if (generate_challenge) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        try {
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: "You are a fun travel challenge creator. Return ONLY a JSON object, no markdown." },
                {
                  role: "user",
                  content: `Create one fun, achievable travel challenge for someone who just checked in at ${locationName}, ${city}, ${country}. Examples: "Try the local specialty at a nearby restaurant", "Take a photo with a famous landmark within walking distance", "Ask a local for their favorite hidden gem". Return JSON: { "challenge": "...", "reward_badge": "..." } where reward_badge is a short badge name like "Local Foodie" or "Explorer".`,
                },
              ],
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            let content = aiData.choices?.[0]?.message?.content || "";
            content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
            try {
              result.challenge = JSON.parse(content);
            } catch {
              result.challenge = { challenge: "Explore the area and find something unexpected!", reward_badge: "Curious Explorer" };
            }
          }
        } catch (e) {
          console.error("AI challenge error:", e);
          result.challenge = { challenge: "Explore the area and find something unexpected!", reward_badge: "Curious Explorer" };
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("reverse-geocode error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
