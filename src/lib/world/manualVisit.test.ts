import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import { saveManualVisit, SaveError } from "./manualVisit";

const args = {
  requestId: "11111111-1111-1111-1111-111111111111", placeId: "p", start: "2020-01-01",
  end: "", note: "", photoTokens: [], visibility: "private" as const,
};
const outcome = async () => {
  try { await saveManualVisit(args); return "ok"; }
  catch (e) { return (e as SaveError).ambiguous ? "ambiguous" : "rejected"; }
};

describe("saveManualVisit outcome classification", () => {
  beforeEach(() => rpc.mockReset());
  it("SQLSTATE rejection is definitive", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "22023", message: "bad" } });
    expect(await outcome()).toBe("rejected");
  });
  it("network error without code is ambiguous", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "", message: "Failed to fetch" } });
    expect(await outcome()).toBe("ambiguous");
  });
  it("gateway/PostgREST coded error is ambiguous", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST000", message: "gateway" } });
    expect(await outcome()).toBe("ambiguous");
  });
  it("success without a valid visit_id is ambiguous", async () => {
    rpc.mockResolvedValue({ data: { memories: 0 }, error: null });
    expect(await outcome()).toBe("ambiguous");
  });
  it("valid visit_id succeeds", async () => {
    rpc.mockResolvedValue({ data: { visit_id: "22222222-2222-2222-2222-222222222222", memories: 1 }, error: null });
    expect(await outcome()).toBe("ok");
  });
});
