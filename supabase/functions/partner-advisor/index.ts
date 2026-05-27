import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const PROMPTS = {
  advisor: {
    system:
      "You are Roavr's partner AI advisor. Analyze this partner's monthly performance and generate a single specific actionable recommendation to help them hit their quota. Be direct and specific. Maximum 70 words. Plain text only. No bullet points. No markdown.",
  },
  upsell: {
    system:
      "You are Roavr's partner growth advisor. Write a 2-sentence upsell message. First sentence: acknowledge their performance with a specific stat. Second sentence: recommend upgrading with a specific projected benefit. Maximum 40 words total. Plain text only.",
  },
  suggestions: {
    system:
      'Return exactly 3 actionable suggestions as a JSON array. Each item: { "icon": string (emoji), "title": string (max 6 words), "description": string (max 25 words), "action_label": string (max 3 words) }. Raw JSON only. No markdown fence.',
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { mode, context } = await req.json();
    const p = PROMPTS[mode as keyof typeof PROMPTS];
    if (!p) throw new Error("Invalid mode");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: p.system },
          { role: "user", content: context },
        ],
      }),
    });

    if (res.status === 429)
      return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (res.status === 402)
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (!res.ok) throw new Error(`Gateway ${res.status}`);

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";

    let payload: unknown = text;
    if (mode === "suggestions") {
      try {
        const cleaned = text.replace(/```json|```/g, "").trim();
        payload = JSON.parse(cleaned);
      } catch {
        payload = [];
      }
    }
    return new Response(JSON.stringify({ result: payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("partner-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
