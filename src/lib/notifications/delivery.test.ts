import { describe, expect, it } from "vitest";
import { resolveDelivery } from "./delivery";

describe("notification opened from cold start", () => {
  it("replaces the launch route with the payload destination", () => {
    expect(
      resolveDelivery({ data: { type: "message", conversationId: "c1" } }, "cold_start")
    ).toEqual({ kind: "navigate", path: "/messages/c1", replace: true });
  });

  it("lands on the inbox when the payload carries no destination", () => {
    expect(resolveDelivery({ data: {} }, "cold_start")).toEqual({
      kind: "navigate",
      path: "/notifications",
      replace: true,
    });
  });
});

describe("notification opened from background", () => {
  it("pushes onto the stack so Back still works", () => {
    expect(resolveDelivery({ data: { type: "trip_invite", tripId: "t1" } }, "background")).toEqual({
      kind: "navigate",
      path: "/trips/t1",
      replace: false,
    });
  });
});

describe("foreground notification", () => {
  it("shows a toast instead of navigating", () => {
    const action = resolveDelivery(
      { title: "New message", body: "Hey", data: { type: "message", conversationId: "c2" } },
      "foreground"
    );
    expect(action).toEqual({
      kind: "toast",
      path: "/messages/c2",
      title: "New message",
      body: "Hey",
    });
  });

  it("falls back to the brand title when the payload has none", () => {
    const action = resolveDelivery({ data: { type: "new_follower", handle: "andre" } }, "foreground");
    expect(action).toMatchObject({ kind: "toast", path: "/u/andre", title: "Roavr" });
  });
});

describe("unknown or hostile payloads route to /notifications", () => {
  it.each([
    [{ data: { type: "totally_unknown" } }],
    [{ data: { path: "//evil.com" } }],
    [{ data: { path: "https://evil.com/steal" } }],
    [{ data: { path: "/admin" } }],
    [{ data: { type: "message", path: "/../../etc/passwd" } }],
    [{ data: "not-an-object" }],
    [{}],
    [null],
  ])("%#", (push) => {
    const cold = resolveDelivery(push as never, "cold_start");
    expect(cold.path === "/notifications" || cold.path === "/messages").toBe(true);
  });

  it("never returns a path outside the app", () => {
    for (const mode of ["cold_start", "background", "foreground"] as const) {
      const action = resolveDelivery({ data: { path: "https://evil.com" } }, mode);
      expect(action.path.startsWith("/")).toBe(true);
      expect(action.path.startsWith("//")).toBe(false);
    }
  });
});
