/**
 * Device-token lifecycle: registration is scoped to the signed-in user and
 * sign-out removes that user's tokens, so a shared device never keeps
 * delivering someone else's activity.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  user: { id: "user-1" } as { id: string } | null,
  upserts: [] as Array<{ table: string; row: Record<string, unknown>; options: unknown }>,
  deletes: [] as Array<{ table: string; column: string; value: unknown }>,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => ({
      upsert: async (row: Record<string, unknown>, options: unknown) => {
        state.upserts.push({ table, row, options });
        return { error: null };
      },
      delete: () => ({
        eq: async (column: string, value: unknown) => {
          state.deletes.push({ table, column, value });
          return { error: null };
        },
      }),
    }),
  },
}));

vi.mock("@/lib/native/platform", () => ({
  platform: { isNative: true, isIOS: true, isAndroid: false, platform: "ios" },
}));

vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    checkPermissions: async () => ({ receive: "granted" }),
    requestPermissions: async () => ({ receive: "granted" }),
    addListener: async () => ({ remove: () => undefined }),
    register: async () => undefined,
    removeAllDeliveredNotifications: async () => undefined,
  },
}));

const { clearDeviceTokens, persistDeviceToken } = await import("./push");

beforeEach(() => {
  state.user = { id: "user-1" };
  state.upserts = [];
  state.deletes = [];
});

describe("persistDeviceToken", () => {
  it("binds the token to the signed-in user and de-duplicates on token", () => {
    return persistDeviceToken("apns-token-1").then(() => {
      expect(state.upserts).toHaveLength(1);
      const [entry] = state.upserts;
      expect(entry.table).toBe("push_devices");
      expect(entry.row).toMatchObject({
        user_id: "user-1",
        token: "apns-token-1",
        provider: "apns",
        enabled: true,
      });
      expect(entry.options).toEqual({ onConflict: "token" });
    });
  });

  it("stores nothing when no one is signed in", async () => {
    state.user = null;
    await persistDeviceToken("apns-token-1");
    expect(state.upserts).toHaveLength(0);
  });

  it("stores nothing for an empty token", async () => {
    await persistDeviceToken("");
    expect(state.upserts).toHaveLength(0);
  });
});

describe("clearDeviceTokens (logout cleanup)", () => {
  it("removes every token for the given user", async () => {
    await clearDeviceTokens("user-2");
    expect(state.deletes).toEqual([
      { table: "push_devices", column: "user_id", value: "user-2" },
    ]);
  });

  it("falls back to the current session user", async () => {
    await clearDeviceTokens();
    expect(state.deletes).toEqual([
      { table: "push_devices", column: "user_id", value: "user-1" },
    ]);
  });

  it("does nothing when there is no user to clean up", async () => {
    state.user = null;
    await clearDeviceTokens();
    expect(state.deletes).toHaveLength(0);
  });
});
