import { describe, expect, it } from "vitest";
import { assetFileName, assetSrcCandidates, mapWithConcurrency } from "./assets";
import { mapPhotoPermission } from "./photos";
import { mapLocationPermission } from "./location";
import { isUsable, PERMISSION_COPY } from "./permissionCopy";
import {
  clampDisplayDuration,
  evaluateDuration,
  PHOTO_DURATION_MAX,
  VIDEO_DURATION_MAX,
} from "@/lib/mediaDuration";

describe("native asset resolution", () => {
  it("prefers the on-device path over webPath so EXIF survives", () => {
    const candidates = assetSrcCandidates({ path: "/var/tmp/IMG_1.HEIC", webPath: "capacitor://x/IMG_1.jpg" });
    expect(candidates.length).toBe(2);
    expect(candidates[0]).toContain("IMG_1.HEIC");
  });

  it("falls back to webPath when there is no native path", () => {
    expect(assetSrcCandidates({ webPath: "blob:abc" })).toEqual(["blob:abc"]);
  });

  it("derives a usable filename, with a format fallback", () => {
    expect(assetFileName({ path: "/a/b/IMG_9.jpg" }, 0)).toBe("IMG_9.jpg");
    expect(assetFileName({ webPath: "capacitor://asset", format: "png" }, 2)).toBe("photo-3.png");
  });

  it("processes large selections with bounded concurrency", async () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    let inFlight = 0;
    let peak = 0;
    const out = await mapWithConcurrency(items, 4, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight--;
      return n * 2;
    });
    expect(out[49]).toBe(98);
    expect(peak).toBeLessThanOrEqual(4);
  });
});

describe("permission mapping", () => {
  it("treats iOS limited photo access as usable", () => {
    expect(mapPhotoPermission("limited")).toBe("limited");
    expect(isUsable(mapPhotoPermission("limited"))).toBe(true);
  });

  it("distinguishes denied from restricted", () => {
    expect(mapPhotoPermission("denied")).toBe("denied");
    expect(mapPhotoPermission("restricted")).toBe("restricted");
    expect(isUsable("restricted")).toBe(false);
  });

  it("lets the OS ask when the state is still prompt", () => {
    expect(mapPhotoPermission("prompt")).toBe("granted");
    expect(mapLocationPermission("prompt-with-rationale")).toBe("granted");
  });

  it("has purpose copy for exactly the three capabilities Roavr uses", () => {
    expect(Object.keys(PERMISSION_COPY).sort()).toEqual(["camera", "location", "photos"]);
  });
});

describe("story media duration rules", () => {
  it("rejects video over the advertised maximum instead of pretending to trim", () => {
    const check = evaluateDuration(75, true);
    expect(check.ok).toBe(false);
    expect(check.reason).toContain(String(VIDEO_DURATION_MAX));
  });

  it("tolerates container rounding at the limit", () => {
    expect(evaluateDuration(60.2, true).ok).toBe(true);
  });

  it("allows video whose duration cannot be read, without claiming a value", () => {
    const check = evaluateDuration(null, true);
    expect(check.ok).toBe(true);
    expect(check.seconds).toBeNull();
  });

  it("clamps photo display duration to the photo range", () => {
    expect(clampDisplayDuration(99, false, null)).toBe(PHOTO_DURATION_MAX);
    expect(clampDisplayDuration(0, false, null)).toBe(1);
  });

  it("never lets a story outlast the real clip", () => {
    expect(clampDisplayDuration(60, true, 12.4)).toBe(13);
  });
});
