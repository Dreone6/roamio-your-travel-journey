import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AVS = Deno.env.get("AVIATIONSTACK_API_KEY")!;

function diff(prev: any, curr: any, types: string[]): string[] {
  const changes: string[] = [];
  const p = prev || {};
  if (types.includes("gate_change") && p?.departure?.gate !== curr?.departure?.gate) changes.push("Gate changed");
  if (types.includes("cancellation") && curr?.flight_status === "cancelled" && p?.flight_status !== "cancelled") changes.push("Flight cancelled");
  const prevDelay = Number(p?.departure?.delay || 0);
  const currDelay = Number(curr?.departure?.delay || 0);
  const threshold = types.includes("delay_15") ? 15 : types.includes("delay_60") ? 60 : 30;
  if (types.includes("departure_delay") && currDelay >= threshold && currDelay !== prevDelay) changes.push(`Departure delayed ${currDelay} min`);
  if (types.includes("arrival_delay") && Number(curr?.arrival?.delay || 0) >= 15 && p?.arrival?.delay !== curr?.arrival?.delay) changes.push(`Arrival delayed ${curr.arrival.delay} min`);
  if (types.includes("baggage") && p?.arrival?.baggage !== curr?.arrival?.baggage && curr?.arrival?.baggage) changes.push(`Baggage carousel ${curr.arrival.baggage}`);
  return changes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const today = new Date().toISOString().slice(0, 10);

  const { data: alerts } = await supabase
    .from("flight_alerts")
    .select("*")
    .eq("active", true)
    .gte("departure_date", today);

  let checked = 0;
  for (const a of alerts || []) {
    checked++;
    try {
      const url = `https://api.aviationstack.com/v1/flights?access_key=${AVS}&flight_iata=${a.flight_number}&flight_date=${a.departure_date}`;
      const res = await fetch(url);
      const json = await res.json();
      const curr = json?.data?.[0];
      if (!curr) continue;

      const changes = diff(a.last_status, curr, a.alert_types || []);

      const patch: any = { last_status: curr };
      if (!a.origin && curr?.departure?.iata) patch.origin = curr.departure.iata;
      if (!a.destination && curr?.arrival?.iata) patch.destination = curr.arrival.iata;
      await supabase.from("flight_alerts").update(patch).eq("id", a.id);

      if (changes.length > 0) {
        await supabase.functions.invoke("send-notification", {
          body: {
            user_id: a.user_id,
            title: `${a.flight_number}: ${changes[0]}`,
            body: changes.join(" · "),
            url: "/notifications",
            type: "flight_alert",
          },
        });
      }
    } catch (e) {
      console.error("flight check error", a.flight_number, e);
    }
  }

  return new Response(JSON.stringify({ checked }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
