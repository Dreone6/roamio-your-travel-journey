import type { Visibility, RelationshipPermission, PrivacySettings } from "../data/types";
import { MOCK_PRIVACY, MOCK_FOLLOWERS } from "../data";

// ─── Privacy Helpers ──────────────────────────────────────

export function getPrivacySettings(userId: string): PrivacySettings {
  // In production this would fetch from DB; for now return mock
  return MOCK_PRIVACY;
}

export function canViewContent(
  viewerId: string,
  ownerId: string,
  visibility: Visibility
): boolean {
  if (viewerId === ownerId) return true;
  if (visibility === "public") return true;
  if (visibility === "private") return false;
  // "followers" — check if viewer follows owner
  return isFollowing(viewerId, ownerId);
}

export function canPerformAction(
  actorId: string,
  targetId: string,
  permission: RelationshipPermission
): boolean {
  if (actorId === targetId) return true;
  switch (permission) {
    case "everyone": return true;
    case "nobody": return false;
    case "followers": return isFollowing(actorId, targetId);
    case "mutual": return isFollowing(actorId, targetId) && isFollowing(targetId, actorId);
    default: return false;
  }
}

export function isFollowing(followerId: string, followingId: string): boolean {
  // Mock implementation — check mock followers list
  return MOCK_FOLLOWERS.some(
    (f) => f.userId === followingId && f.isFollowingBack
  );
}

export function isMutualFollow(userA: string, userB: string): boolean {
  return isFollowing(userA, userB) && isFollowing(userB, userA);
}
