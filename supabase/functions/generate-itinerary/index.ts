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
    const {
      destination, start_date, end_date, budget, travelers,
      trip_style, traveler_type, pace, interests, dietary,
      mobility, safety_notes, surprise_me, regenerate_day,
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are Roavr AI, a premium travel planning assistant. You create detailed, realistic, and personalized travel itineraries. Always respond with valid JSON only — no markdown fences, no extra text. Every activity must be a real place, restaurant, or attraction that exists at the destination. Include realistic prices in USD. Tailor the itinerary to the traveler's style, interests, pace, and needs.`;

    let userPrompt: string;

    if (regenerate_day) {
      userPrompt = `Regenerate ONLY day ${regenerate_day.day_number} (date: ${regenerate_day.date}) for a trip to ${destination}.

Traveler info: ${travelers} people, ${trip_style} style, ${pace} pace, interested in ${interests}.${dietary ? ` Dietary: ${dietary}.` : ""}${mobility ? ` Accessibility: ${mobility}.` : ""}

Return JSON:
{
  "morning": { "activity": "...", "location": "...", "estimated_cost": number, "time": "HH:MM", "description": "1-2 sentence description", "travel_time": "X min from previous", "restaurant_nearby": "name or null", "safety_note": "note or null" },
  "afternoon": { ... },
  "evening": { ... }
}`;
    } else if (surprise_me) {
      userPrompt = `The traveler wants a SURPRISE destination! Pick a unique, exciting destination that fits:
- Trip style: ${trip_style}
- Traveler type: ${traveler_type || "solo"}
- ${travelers} travelers
- Budget: $${budget} per person
- Interests: ${interests}
- Pace: ${pace}
${dietary ? `- Dietary: ${dietary}` : ""}
${mobility ? `- Accessibility: ${mobility}` : ""}
${safety_notes ? `- Safety notes: ${safety_notes}` : ""}

Create a 7-day itinerary. Return JSON:
{
  "destination": "City, Country",
  "why_this_destination": "1-2 sentences explaining why this fits the traveler",
  "days": [
    {
      "day": 1,
      "date": "Day 1",
      "theme": "Arrival & First Impressions",
      "morning": { "activity": "...", "location": "...", "estimated_cost": number, "time": "09:00", "description": "...", "travel_time": null, "restaurant_nearby": "name or null", "safety_note": null },
      "afternoon": { ... },
      "evening": { ... },
      "day_total_cost": number
    }
  ],
  "total_estimated_cost": number,
  "packing_tips": ["tip1", "tip2"],
  "safety_summary": "brief safety overview"
}`;
    } else {
      userPrompt = `Create a personalized itinerary for ${destination} from ${start_date} to ${end_date}.

Traveler info:
- ${travelers} ${traveler_type || "solo"} travelers
- Style: ${trip_style}
- Budget: $${budget} per person total
- Interests: ${interests}
- Pace: ${pace}
${dietary ? `- Dietary: ${dietary}` : ""}
${mobility ? `- Accessibility: ${mobility}` : ""}
${safety_notes ? `- Safety notes: ${safety_notes}` : ""}

Create a day-by-day itinerary. For each activity include: name, real location, estimated cost in USD, time (HH:MM), 1-2 sentence description, estimated travel time from previous activity, a nearby restaurant recommendation, and any relevant safety notes.

Return JSON:
{
  "destination": "${destination}",
  "days": [
    {
      "day": 1,
      "date": "${start_date}",
      "theme": "Day theme title",
      "morning": { "activity": "...", "location": "...", "estimated_cost": number, "time": "09:00", "description": "...", "travel_time": null, "restaurant_nearby": "name or null", "safety_note": null },
      "afternoon": { "activity": "...", "location": "...", "estimated_cost": number, "time": "13:00", "description": "...", "travel_time": "15 min", "restaurant_nearby": "name or null", "safety_note": null },
      "evening": { "activity": "...", "location": "...", "estimated_cost": number, "time": "19:00", "description": "...", "travel_time": "20 min", "restaurant_nearby": "name or null", "safety_note": null },
      "day_total_cost": number
    }
  ],
  "total_estimated_cost": number,
  "packing_tips": ["tip1", "tip2", "tip3"],
  "safety_summary": "brief safety overview for the destination"
}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate itinerary" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Strip markdown fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse itinerary. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("generate-itinerary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
