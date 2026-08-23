// Ask Roavr — the real planning brain behind the Trips planner.
//
// Returns BOTH a short conversational reply and a structured, machine-readable
// plan so the client can turn suggestions into editable itinerary rows.
// If no AI provider is configured, it answers 503 with { aiAvailable: false }
// so the UI can show an honest "AI unavailable" state instead of faking one.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Body {
  prompt?: string;
  trip?: {
    title?: string;
    destination?: string;
    start_date?: string | null;
    end_date?: string | null;
    travelers?: number;
    interests?: string[] | null;
    pace?: string | null;
    dietary?: string | null;
  };
  existing?: { day_number: number; activity: string; time?: string | null }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return json(
      { aiAvailable: false, error: "AI planning is not configured for this environment." },
      503,
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const prompt = (body.prompt ?? "").trim();
  if (!prompt || prompt.length > 2000) {
    return json({ error: "prompt is required and must be under 2000 characters" }, 400);
  }

  const trip = body.trip ?? {};
  const context = [
    trip.destination ? `Destination: ${trip.destination}` : null,
    trip.start_date ? `Start date: ${trip.start_date}` : null,
    trip.end_date ? `End date: ${trip.end_date}` : null,
    trip.travelers ? `Travelers: ${trip.travelers}` : null,
    trip.pace ? `Pace: ${trip.pace}` : null,
    trip.dietary ? `Dietary: ${trip.dietary}` : null,
    trip.interests?.length ? `Interests: ${trip.interests.join(", ")}` : null,
    body.existing?.length
      ? `Already planned: ${body.existing
          .slice(0, 40)
          .map((e) => `Day ${e.day_number}${e.time ? ` ${e.time}` : ""} — ${e.activity}`)
          .join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `You are Roavr, a travel planner. Reply ONLY with valid JSON, no markdown fences.

Schema:
{
  "reply": "1-3 sentence conversational answer",
  "days": [
    {
      "day_number": 1,
      "label": "Day theme",
      "items": [
        {
          "time": "10:00",
          "title": "Getsemani walking tour",
          "type": "activity",
          "location": "Getsemani, Cartagena",
          "notes": "One or two sentences",
          "estimated_cost": 25
        }
      ]
    }
  ]
}

Rules:
- "type" is one of: flight, lodging, restaurant, food, activity, transport, note.
- Use real, existing places at the destination. Never invent venues.
- "days" may be empty when the question is not a plan (e.g. a packing question) — put the answer in "reply".
- time is 24h "HH:MM" or null. estimated_cost is USD number or null.
- Never claim any specific person recommends something.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context ? `${context}\n\nRequest: ${prompt}` : prompt },
        ],
      }),
    });

    if (res.status === 429) {
      return json({ aiAvailable: true, error: "Roavr AI is rate limited. Try again in a moment." }, 429);
    }
    if (res.status === 402) {
      return json({ aiAvailable: true, error: "AI credits are exhausted for this workspace." }, 402);
    }
    if (!res.ok) {
      console.error("ask-roavr gateway error", res.status, await res.text());
      return json({ aiAvailable: true, error: "Roavr AI could not answer right now." }, 502);
    }

    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return json({
        aiAvailable: true,
        reply: typeof parsed.reply === "string" ? parsed.reply : "",
        days: Array.isArray(parsed.days) ? parsed.days : [],
      });
    } catch {
      // Still useful: surface the prose, no fabricated structure.
      return json({ aiAvailable: true, reply: cleaned.slice(0, 2000), days: [] });
    }
  } catch (e) {
    console.error("ask-roavr error", e);
    return json({ aiAvailable: true, error: "Roavr AI could not answer right now." }, 500);
  }
});
