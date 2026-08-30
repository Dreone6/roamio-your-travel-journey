import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core", "three"],
  },
  // Pre-bundle the heavy 3D stack up front. These are only reached through
  // lazy routes, so without this Vite re-optimizes deps mid-session and the
  // in-flight dynamic import 404s ("Failed to fetch dynamically imported module").
  optimizeDeps: {
    include: ["three", "@react-three/fiber", "@react-three/drei", "globe.gl"],
  },
}));
