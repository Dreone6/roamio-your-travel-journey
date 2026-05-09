import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `You are Milo, a travel-savvy golden doodle assistant for the Roavr app. The traveler is starting from ${body.starting_city || "anywhere"}, has a budget around $${body.budget || "flexible"}, prefers a ${body.style} vibe, ${body.climate} climate, ${body.safety} safety, and wants a ${body.length}-day trip. Interests: ${body.interests || "open"}. Suggest 3 surprising destinations that match. For each return: destination (city), country, flight_cost (e.g. "$420 round-trip"), hotel_cost (e.g. "$90/night"), best_time (e.g. "Apr–Jun"), safety (one short sentence), vibe_match (a 2-3 word tag like "Foodie heaven"), sample_itinerary (array of 3 day-by-day strings like "Day 1: Old town walk + tapas crawl"). Return strict JSON: { "suggestions": [...] }.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!r.ok) throw new Error(`AI gateway ${r.status}`);
    const j = await r.json();
    const content = j.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { suggestions: [] }; }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
