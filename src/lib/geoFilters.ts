import { supabase } from "@/integrations/supabase/client";

export interface GeoFilter {
  id: string;
  label: string;
  emoji: string;
  /** Top stamp text */
  topText?: string;
  /** Bottom stamp text */
  bottomText?: string;
  /** Background gradient for emoji-only frames */
  accent: string;
  /** Optional remote image overlay (transparent PNG) */
  imageUrl?: string;
  source: "curated" | "ai";
}

// Curated pack — keyed by lowercased city or landmark name
const CURATED: Record<string, Omit<GeoFilter, "id" | "source">[]> = {
  positano: [
    { label: "Positano Postcard", emoji: "🍋", topText: "POSITANO", bottomText: "AMALFI COAST", accent: "linear-gradient(135deg,#F4A261,#E76F51)" },
    { label: "Costa di Amalfi", emoji: "⛵", topText: "COSTA AMALFI", accent: "linear-gradient(135deg,#3B82F6,#06B6D4)" },
  ],
  rome: [
    { label: "Roma Eterna", emoji: "🏛️", topText: "ROMA", bottomText: "CITTÀ ETERNA", accent: "linear-gradient(135deg,#C9A961,#8B7355)" },
    { label: "Colosseo", emoji: "⚔️", topText: "COLOSSEO", accent: "linear-gradient(135deg,#7C2D12,#C9A961)" },
  ],
  paris: [
    { label: "Bonjour Paris", emoji: "🗼", topText: "PARIS", bottomText: "VILLE LUMIÈRE", accent: "linear-gradient(135deg,#3B82F6,#EC4899)" },
    { label: "Café de Flore", emoji: "☕", topText: "PARIS", accent: "linear-gradient(135deg,#1F2937,#C9A961)" },
  ],
  "new york": [
    { label: "NYC Skyline", emoji: "🗽", topText: "NEW YORK", bottomText: "THE BIG APPLE", accent: "linear-gradient(135deg,#F59E0B,#EF4444)" },
  ],
  tokyo: [
    { label: "Tokyo Neon", emoji: "🗾", topText: "東京 TOKYO", accent: "linear-gradient(135deg,#EC4899,#3B82F6)" },
    { label: "Torii Gate", emoji: "⛩️", topText: "TOKYO", accent: "linear-gradient(135deg,#7C2D12,#EF4444)" },
  ],
  london: [
    { label: "Big Ben", emoji: "🇬🇧", topText: "LONDON", bottomText: "EST. 43 AD", accent: "linear-gradient(135deg,#1E40AF,#7F1D1D)" },
  ],
  barcelona: [
    { label: "Gaudí Vibes", emoji: "🏛️", topText: "BARCELONA", accent: "linear-gradient(135deg,#F59E0B,#EC4899)" },
  ],
  reykjavik: [
    { label: "Northern Lights", emoji: "🌌", topText: "REYKJAVÍK", accent: "linear-gradient(135deg,#10B981,#3B82F6)" },
  ],
  "cape town": [
    { label: "Table Mountain", emoji: "⛰️", topText: "CAPE TOWN", accent: "linear-gradient(135deg,#F59E0B,#10B981)" },
  ],
  marrakech: [
    { label: "Souk Spice", emoji: "🕌", topText: "MARRAKECH", accent: "linear-gradient(135deg,#E76F51,#C9A961)" },
  ],
  bangkok: [
    { label: "Bangkok Street", emoji: "🛕", topText: "BANGKOK", accent: "linear-gradient(135deg,#F59E0B,#EC4899)" },
  ],
  rio: [
    { label: "Rio Carnival", emoji: "🌴", topText: "RIO", bottomText: "DE JANEIRO", accent: "linear-gradient(135deg,#10B981,#F59E0B)" },
  ],
  sydney: [
    { label: "Sydney Harbour", emoji: "🇦🇺", topText: "SYDNEY", accent: "linear-gradient(135deg,#3B82F6,#10B981)" },
  ],
  santorini: [
    { label: "Santorini Blue", emoji: "🏖️", topText: "SANTORINI", accent: "linear-gradient(135deg,#3B82F6,#FFFFFF)" },
  ],
  bali: [
    { label: "Bali Sunset", emoji: "🌺", topText: "BALI", accent: "linear-gradient(135deg,#F59E0B,#EC4899)" },
  ],
};

const CACHE_KEY = "geofilter_cache_v1";
type CacheEntry = { city: string; filters: GeoFilter[]; ts: number };

function readCache(): Record<string, CacheEntry> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); }
  catch { return {}; }
}
function writeCache(cache: Record<string, CacheEntry>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export async function resolveGeoFilters(city: string | null): Promise<GeoFilter[]> {
  const key = (city || "").trim().toLowerCase();
  const out: GeoFilter[] = [];

  if (key && CURATED[key]) {
    out.push(...CURATED[key].map((f, i) => ({ ...f, id: `curated-${key}-${i}`, source: "curated" as const })));
  }

  // Generic fallback frames so the carousel always has something
  out.push(
    { id: "generic-passport", label: "Passport", emoji: "✈️", topText: key ? key.toUpperCase() : "WANDERLUST", accent: "linear-gradient(135deg,#3B82F6,#1E40AF)", source: "curated" },
    { id: "generic-here", label: "I Was Here", emoji: "📍", bottomText: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), accent: "linear-gradient(135deg,#F4A261,#E76F51)", source: "curated" },
  );

  // AI fallback — only if we have a city and few curated frames
  if (key && out.length < 4) {
    const cache = readCache();
    const cached = cache[key];
    if (cached && Date.now() - cached.ts < 24 * 3600e3) {
      out.push(...cached.filters);
    } else {
      try {
        const { data } = await supabase.functions.invoke("generate-geo-filter", {
          body: { city: key },
        });
        if (data?.filters?.length) {
          const aiFilters: GeoFilter[] = data.filters.map((f: any, i: number) => ({
            id: `ai-${key}-${i}`,
            label: f.label || `${city} AI`,
            emoji: f.emoji || "✨",
            topText: f.topText,
            bottomText: f.bottomText,
            accent: f.accent || "linear-gradient(135deg,#3B82F6,#F4A261)",
            source: "ai" as const,
          }));
          out.push(...aiFilters);
          cache[key] = { city: key, filters: aiFilters, ts: Date.now() };
          writeCache(cache);
        }
      } catch {
        // silent — curated already loaded
      }
    }
  }

  return out;
}
