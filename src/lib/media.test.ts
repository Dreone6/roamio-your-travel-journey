import { describe, expect, it } from "vitest";
import { isMediaToken, mediaToken } from "./media";

describe("private media tokens", () => {
  it("recognises private-bucket tokens", () => {
    expect(isMediaToken(mediaToken("user-123/abc.jpg"))).toBe(true);
  });

  it("treats legacy and external URLs as pass-through", () => {
    expect(isMediaToken("https://cdn.example.com/a.jpg")).toBe(false);
    expect(isMediaToken(null)).toBe(false);
    expect(isMediaToken("")).toBe(false);
  });

  it("stores media under the owner's folder so storage policies can scope it", () => {
    expect(mediaToken("user-123/abc.jpg")).toBe("user-media:user-123/abc.jpg");
  });
});
