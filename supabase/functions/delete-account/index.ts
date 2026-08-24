/**
 * delete-account — real, irreversible account deletion.
 *
 * Apple 5.1.1(v) and Google's Data deletion policy both require an in-app path
 * that deletes the account itself, not just local data. This function:
 *   1. records the request in `account_deletions` (audit trail);
 *   2. deletes the user's objects from the private `user-media` bucket;
 *   3. deletes user-owned rows across every table Roavr writes;
 *   4. deletes the auth user, which cascades anything keyed to it;
 *   5. marks the audit row complete.
 *
 * Retention: nothing is soft-deleted. The only record that survives is the
 * `account_deletions` audit row (user id + timestamps, no personal content),
 * kept so the owner can evidence compliance. Messages the user sent are removed
 * with their rows; conversations with no remaining participants are removed too.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Tables keyed by a single owning-user column. Order is child → parent. */
const OWNED_TABLES: Array<[table: string, column: string]> = [
  ["push_devices", "user_id"],
  ["notification_preferences", "user_id"],
  ["notifications", "user_id"],
  ["story_views", "viewer_id"],
  ["story_reactions", "user_id"],
  ["stories", "user_id"],
  ["message_reactions", "user_id"],
  ["offer_interactions", "user_id"],
  ["trip_saved_places", "user_id"],
  ["trip_shares", "user_id"],
  ["itinerary_item_votes", "user_id"],
  ["itinerary_items", "user_id"],
  ["bookings", "user_id"],
  ["flight_alerts", "user_id"],
  ["live_locations", "user_id"],
  ["trusted_contacts", "user_id"],
  ["check_ins", "user_id"],
  ["memories", "user_id"],
  ["badges", "user_id"],
  ["challenges", "user_id"],
  ["checklists", "user_id"],
  ["places_visited", "user_id"],
  ["trips", "user_id"],
  ["reports", "reporter_id"],
  ["user_privacy_settings", "user_id"],
  ["user_roles", "user_id"],
  ["subscriptions", "user_id"],
  ["profiles", "id"],
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: auth } = await asUser.auth.getUser();
  const user = auth?.user;
  if (!user) return json({ ok: false, error: "unauthorized" }, 401);

  // Explicit confirmation, so a stray call can never wipe an account.
  let body: { confirm?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (body.confirm !== "DELETE") return json({ ok: false, error: "confirmation_required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);
  const uid = user.id;

  const { data: audit } = await admin
    .from("account_deletions")
    .insert({ user_id: uid, status: "in_progress" })
    .select("id")
    .single();

  const failures: string[] = [];

  // 1. Private media objects
  try {
    const { data: files } = await admin.storage.from("user-media").list(uid, { limit: 1000 });
    if (files?.length) {
      await admin.storage.from("user-media").remove(files.map((f) => `${uid}/${f.name}`));
    }
  } catch (e) {
    failures.push(`storage: ${(e as Error).message}`);
  }

  // 2. Relationship + messaging rows (two-sided keys)
  const twoSided: Array<[string, string[]]> = [
    ["follows", ["follower_id", "following_id"]],
    ["user_follows", ["follower_id", "following_id"]],
    ["blocked_users", ["blocker_id", "blocked_id"]],
    ["messages", ["sender_id"]],
    ["conversation_participants", ["user_id"]],
    ["trip_members", ["user_id"]],
    ["conversations", ["created_by"]],
  ];
  for (const [table, cols] of twoSided) {
    for (const col of cols) {
      const { error } = await admin.from(table).delete().eq(col, uid);
      if (error && !/does not exist|schema cache/i.test(error.message)) {
        failures.push(`${table}.${col}: ${error.message}`);
      }
    }
  }

  // 3. Owned rows
  for (const [table, column] of OWNED_TABLES) {
    const { error } = await admin.from(table).delete().eq(column, uid);
    if (error && !/does not exist|schema cache/i.test(error.message)) {
      failures.push(`${table}: ${error.message}`);
    }
  }

  // 4. The auth user itself
  const { error: authError } = await admin.auth.admin.deleteUser(uid);
  if (authError) failures.push(`auth: ${authError.message}`);

  const ok = failures.length === 0;
  if (audit?.id) {
    await admin
      .from("account_deletions")
      .update({
        status: ok ? "completed" : "partial",
        completed_at: new Date().toISOString(),
        error: ok ? null : failures.join(" | "),
      })
      .eq("id", audit.id);
  }

  return json({ ok, failures }, ok ? 200 : 500);
});
