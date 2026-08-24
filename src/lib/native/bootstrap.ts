/**
 * One-time native shell setup. Safe to call on web — it no-ops there.
 * Configures the dark status bar and keyboard behaviour so auth, messaging,
 * Ask Roavr, search, trip editing and profile editing keep their inputs
 * visible above the on-screen keyboard without redesigning those screens.
 */
import { platform } from "./index";

export async function initNativeShell() {
  if (!platform.isNative) return;

  document.documentElement.dataset.platform = platform.platform;
  document.documentElement.classList.add("is-native");

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: true });
    if (platform.isAndroid) await StatusBar.setBackgroundColor({ color: "#080D1A" });
  } catch {
    /* status bar unavailable */
  }

  try {
    const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    if (platform.isIOS) await Keyboard.setAccessoryBarVisible({ isVisible: true });

    // Expose keyboard height as a CSS var so fixed footers/composers can lift.
    Keyboard.addListener("keyboardWillShow", (info) => {
      document.documentElement.style.setProperty("--keyboard-height", `${info.keyboardHeight}px`);
      document.documentElement.classList.add("keyboard-open");
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.documentElement.style.setProperty("--keyboard-height", "0px");
      document.documentElement.classList.remove("keyboard-open");
    });
  } catch {
    /* keyboard plugin unavailable */
  }
}
