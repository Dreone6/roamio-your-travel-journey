import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Roavr — Capacitor configuration.
 *
 * appId is a TEMPORARY development identifier issued by the Lovable project.
 * OWNER DECISION REQUIRED: the final iOS Bundle ID / Android applicationId
 * (e.g. `com.<company>.roavr`) must replace it before any store submission.
 * Changing it here + re-running `npx cap sync` is the only step needed while
 * the native projects are still generated (no signing/profiles created yet).
 *
 * The native shell loads the standard Vite production output in `dist/`.
 * Set CAP_SERVER_URL when you want live-reload from a dev/preview server;
 * it must be unset for release builds so assets are bundled.
 */
const liveReloadUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "app.lovable.p5f9b5ca8aa1d4b7781099bda94ab9271",
  appName: "Roavr",
  webDir: "dist",
  backgroundColor: "#080D1A",
  ios: {
    contentInset: "never",
    backgroundColor: "#080D1A",
  },
  android: {
    backgroundColor: "#080D1A",
  },
  plugins: {
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#080D1A",
      overlaysWebView: true,
    },
  },
  ...(liveReloadUrl
    ? { server: { url: liveReloadUrl, cleartext: true } }
    : {}),
};

export default config;
