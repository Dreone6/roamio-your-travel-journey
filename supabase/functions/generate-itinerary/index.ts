import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { destination, start_date, end_date, budget, travelers, trip_style, pace, interests, dietary, regenerate_day } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let prompt: string;

    if (regenerate_day) {
      prompt = `You are a travel expert. The traveler is in ${destination} from ${start_date} to ${end_date} with a budget of ${budget} USD for ${travelers} people. Their style is ${trip_style} with a ${pace} pace. They are interested in ${interests}${dietary ? ` and prefer ${dietary}` : ""}. Generate ONLY day ${regenerate_day.day_number} (date: ${regenerate_day.date}) activities. Return JSON: { "morning": { "activity": "...", "location": "...", "estimated_cost": number, "time": "HH:MM", "description": "..." }, "afternoon": {...}, "evening": {...} }. Keep activities realistic for the destination and budget.`;
    } else {
      prompt = `You are a travel expert creating a personalized itinerary. The traveler is going to ${destination} from ${start_date} to ${end_date} with a budget of ${budget} USD for ${travelers} people. Their style is ${trip_style} with a ${pace} pace. They are interested in ${interests}${dietary ? ` and prefer ${dietary}` : ""}. Create a realistic day by day itinerary with morning, afternoon, and evening activities. For each activity include a name (as "activity"), brief description, estimated cost in USD (as a number), location name, and approximate time (as "time" in HH:MM format). Return the response as structured JSON with this shape: { "days": [ { "day": 1, "date": "YYYY-MM-DD", "morning": { "activity": "...", "location": "...", "estimated_cost": 0, "time": "09:00", "description": "..." }, "afternoon": {...}, "evening": {...} } ] }. Keep activities realistic for the destination and budget.`;
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
          { role: "system", content: "You are a travel planning AI. Always respond with valid JSON only, no markdown fences." },
          { role: "user", content: prompt },
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
