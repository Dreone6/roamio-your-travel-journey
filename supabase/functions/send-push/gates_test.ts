import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isDeadToken,
  pushDecision,
  relationshipSkip,
  requiresRelationship,
  validatePayload,
} from "./gates.ts";

Deno.test("validatePayload rejects malformed input", () => {
  assertEquals(validatePayload({}).ok, false);
  assertEquals(validatePayload({ userId: "u1", type: "message" }).ok, false);
  assertEquals(validatePayload({ userId: "u1", type: "nope", title: "hi" }).ok, false);
  assertEquals(validatePayload({ userId: "u1", type: "message", title: "x".repeat(200) }).ok, false);
});

Deno.test("validatePayload normalises data to strings", () => {
  const result = validatePayload({
    userId: "u1",
    type: "message",
    title: "New message",
    data: { conversationId: "c1", count: 3, nested: { a: 1 } },
  });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.data, { conversationId: "c1", count: "3" });
  }
});

Deno.test("relationship-scoped types are limited to story activity", () => {
  assertEquals(requiresRelationship("story_reply"), true);
  assertEquals(requiresRelationship("story_reaction"), true);
  assertEquals(requiresRelationship("message"), false);
  assertEquals(requiresRelationship("new_follower"), false);
});

Deno.test("private relationship notifications are rejected without an accepted follow", () => {
  const base = {
    type: "story_reply",
    actorId: "actor",
    recipientPrivate: true,
    actorFollowsRecipient: false,
    recipientFollowsActor: false,
  };
  assertEquals(relationshipSkip(base), "private_relationship");
  assertEquals(relationshipSkip({ ...base, actorFollowsRecipient: true }), null);
  assertEquals(relationshipSkip({ ...base, recipientFollowsActor: true }), null);
  assertEquals(relationshipSkip({ ...base, recipientPrivate: false }), null);
  // A service-role caller with no actor cannot bypass a private recipient.
  assertEquals(relationshipSkip({ ...base, actorId: null }), "private_relationship");
  // Non-scoped types are unaffected.
  assertEquals(relationshipSkip({ ...base, type: "message" }), null);
});

Deno.test("pushDecision honours preferences, devices and configuration", () => {
  const devices = 2;
  assertEquals(
    pushDecision({ type: "message", prefs: { push_enabled: false }, deviceCount: devices, fcmConfigured: true }),
    "muted",
  );
  assertEquals(
    pushDecision({ type: "message", prefs: { messages: false }, deviceCount: devices, fcmConfigured: true }),
    "muted",
  );
  // Commercial categories are off unless explicitly enabled.
  assertEquals(
    pushDecision({ type: "nearby_offer", prefs: {}, deviceCount: devices, fcmConfigured: true }),
    "muted",
  );
  assertEquals(
    pushDecision({ type: "nearby_offer", prefs: { nearby_offers: true }, deviceCount: devices, fcmConfigured: true }),
    "send",
  );
  assertEquals(
    pushDecision({ type: "message", prefs: {}, deviceCount: 0, fcmConfigured: true }),
    "no_devices",
  );
  assertEquals(
    pushDecision({ type: "message", prefs: {}, deviceCount: devices, fcmConfigured: false }),
    "not_configured",
  );
  assertEquals(
    pushDecision({ type: "message", prefs: {}, deviceCount: devices, fcmConfigured: true }),
    "send",
  );
});

Deno.test("dead tokens are only the permanent failures", () => {
  assertEquals(isDeadToken(404), true);
  assertEquals(isDeadToken(403), true);
  assertEquals(isDeadToken(429), false);
  assertEquals(isDeadToken(500), false);
});
