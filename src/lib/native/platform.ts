/**
 * Platform detection — kept in its own module so capability adapters can use it
 * without importing the full `native` singleton (and creating import cycles).
 */
import { Capacitor } from "@capacitor/core";
import type { PlatformInfo, RoavrPlatform } from "./types";

function readPlatform(): PlatformInfo {
  const raw = (Capacitor.getPlatform?.() ?? "web") as RoavrPlatform;
  const detected: RoavrPlatform = raw === "ios" || raw === "android" ? raw : "web";
  const isNative = detected !== "web" && Capacitor.isNativePlatform?.() === true;
  return {
    platform: detected,
    isNative,
    isIOS: isNative && detected === "ios",
    isAndroid: isNative && detected === "android",
    isWeb: !isNative,
  };
}

export const platform: PlatformInfo = readPlatform();
