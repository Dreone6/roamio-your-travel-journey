import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find expired stories that should be auto-saved
    const now = new Date().toISOString();
    const { data: expiredStories, error: fetchError } = await supabase
      .from("stories")
      .select("*")
      .lt("expires_at", now)
      .eq("auto_save_to_globe", true);

    if (fetchError) throw fetchError;

    if (!expiredStories || expiredStories.length === 0) {
      return new Response(
        JSON.stringify({ converted: 0, message: "No expired stories to convert" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let converted = 0;
    const errors: string[] = [];

    for (const story of expiredStories) {
      // Check user privacy settings
      const { data: privacySettings } = await supabase
        .from("user_privacy_settings")
        .select("auto_save_stories")
        .eq("user_id", story.user_id)
        .maybeSingle();

      const savePreference = privacySettings?.auto_save_stories ?? "auto";

      if (savePreference === "never") {
        // Delete the expired story without converting
        await supabase.from("stories").delete().eq("id", story.id);
        continue;
      }

      if (savePreference === "ask") {
        // Skip — user wants to be asked (handled client-side)
        continue;
      }

      // Auto-save: convert story to memory
      const { error: insertError } = await supabase.from("memories").insert({
        user_id: story.user_id,
        media_url: story.media_url,
        media_type: story.media_type,
        caption: story.caption,
        location_name: story.location_name,
        latitude: story.latitude,
        longitude: story.longitude,
        trip_id: story.trip_id,
        source: "story",
        source_id: story.id,
        visibility: story.visibility,
        pinned_to_globe: true,
      });

      if (insertError) {
        errors.push(`Story ${story.id}: ${insertError.message}`);
        continue;
      }

      // Delete the converted story
      await supabase.from("stories").delete().eq("id", story.id);
      converted++;
    }

    return new Response(
      JSON.stringify({
        converted,
        total_expired: expiredStories.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
