import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SYSTEM_PROMPT =
  "You are Roavr's AI travel planner. Generate a detailed day-by-day travel itinerary in valid JSON format only. Return raw JSON with no markdown, no backticks, no preamble, no explanation. Only the JSON object.";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const {
      destination,
      country = "",
      start_date,
      end_date,
      trip_length,
      group_size,
      budget,
      travel_style,
      interests = [],
      food_prefs = [],
    } = body ?? {};

    if (!destination || !start_date || !end_date || !trip_length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMessage = `Generate a ${trip_length}-day itinerary for ${destination}${
      country ? ", " + country : ""
    } for ${group_size} travelers. Budget: $${budget} total. Travel style: ${
      travel_style || "balanced"
    }. Interests: ${(interests || []).join(", ") || "general sightseeing"}. Food preferences: ${
      (food_prefs || []).join(", ") || "no restrictions"
    }. Start date: ${start_date}. Return this exact JSON structure: { trip_title: string, destination: string, country: string, summary: string, highlights: string[] (3 items), days: [ { day_number: int, date: string, theme: string, items: [ { time: string, title: string, description: string, location_name: string, item_type: string (food/activity/transport/lodging/landmark/other), estimated_cost: string, tips: string, latitude: float, longitude: float } ] } ], packing_suggestions: string[] (8 items), budget_breakdown: { accommodation: string, food: string, activities: string, transport: string, total: string }, best_neighborhoods: string[] (3 items), emergency_info: { police: string, medical: string } }`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (resp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace > Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("Gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";

    let itinerary: any;
    try {
      // Strip accidental code fences just in case
      const cleaned = content.replace(/^```json\s*|\s*```$/g, "").trim();
      itinerary = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse failed. Raw:", content);
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ itinerary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-itinerary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
