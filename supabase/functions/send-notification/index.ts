import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().max(500).optional().default(""),
  url: z.string().max(500).optional().default("/notifications"),
  type: z.string().max(50).optional().default("system"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { user_id, title, body, url, type } = parsed.data;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { error } = await supabase.from("notifications").insert({
    user_id,
    type,
    title,
    body,
    data: { url },
    read: false,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Web Push subscription delivery is gated on a `notifications_subscription` column
  // that doesn't yet exist on profiles. The in-app notification is logged above and
  // surfaces via the bell + NotificationsPage. Push delivery can be added once
  // the subscription column + VAPID keys are configured.

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
