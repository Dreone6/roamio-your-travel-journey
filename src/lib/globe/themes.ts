/** Globe colour themes. Users pick one; choice is stored per device. */
export interface GlobePalette {
  ocean: string;
  land: string;
  glow: string;
  pin: string;
  arc: string;
  backdrop: string;
}

export interface GlobeTheme {
  id: string;
  name: string;
  palette: GlobePalette;
}

export const GLOBE_THEMES: GlobeTheme[] = [
  { id: "midnight", name: "Midnight", palette: { ocean: "#080D1A", land: "#2A4A7F", glow: "#3B82F6", pin: "#FFFFFF", arc: "#3B82F6", backdrop: "#0F1828" } },
  { id: "sandstone", name: "Sandstone", palette: { ocean: "#1C1814", land: "#6B4E36", glow: "#F4A261", pin: "#FFF4E6", arc: "#F4A261", backdrop: "#2A221B" } },
  { id: "blueprint", name: "Blueprint", palette: { ocean: "#0D1B2A", land: "#1F4B7A", glow: "#38E1FF", pin: "#FFFFFF", arc: "#38E1FF", backdrop: "#132A40" } },
  { id: "nordic", name: "Nordic", palette: { ocean: "#121214", land: "#3A3A42", glow: "#F8F9FA", pin: "#F8F9FA", arc: "#CBD5E1", backdrop: "#1C1C20" } },
  { id: "tropic", name: "Tropic", palette: { ocean: "#04363B", land: "#2D6A4F", glow: "#FFD166", pin: "#FFFFFF", arc: "#FF8FAB", backdrop: "#08484E" } },
];

const KEY = "roavr.globeTheme";
export const CUSTOM_ID = "custom";

export function loadPalette(): { id: string; palette: GlobePalette } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (v?.id === CUSTOM_ID && v.palette?.ocean) return v;
      const t = GLOBE_THEMES.find((x) => x.id === v?.id);
      if (t) return { id: t.id, palette: t.palette };
    }
  } catch { /* ignore */ }
  return { id: GLOBE_THEMES[0].id, palette: GLOBE_THEMES[0].palette };
}

export function savePalette(id: string, palette: GlobePalette) {
  try { localStorage.setItem(KEY, JSON.stringify({ id, palette })); } catch { /* ignore */ }
}
