// Travel stats aggregator.

interface Visit { latitude: number | null; longitude: number | null; country?: string; city?: string; date_visited?: string | null; }

const CONTINENT_MAP: Record<string, string> = {
  // tiny sample — extend as needed
  "United States": "North America", "Canada": "North America", "Mexico": "North America",
  "Brazil": "South America", "Argentina": "South America", "Peru": "South America",
  "France": "Europe", "Italy": "Europe", "Spain": "Europe", "Germany": "Europe", "Greece": "Europe", "Croatia": "Europe", "Iceland": "Europe",
  "Japan": "Asia", "Thailand": "Asia", "Indonesia": "Asia", "Vietnam": "Asia", "India": "Asia",
  "Morocco": "Africa", "Egypt": "Africa", "Kenya": "Africa", "South Africa": "Africa",
  "Australia": "Oceania", "New Zealand": "Oceania",
};

function haversineMiles(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3959;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function computeTravelStats(visits: Visit[], opts: {
  trips?: number; checkIns?: number; memories?: number; badges?: number;
} = {}) {
  const valid = visits.filter((v) => v.latitude != null && v.longitude != null) as Required<Visit>[];
  const sorted = [...valid].sort((a, b) => (a.date_visited || "").localeCompare(b.date_visited || ""));

  let miles = 0;
  for (let i = 1; i < sorted.length; i++) {
    miles += haversineMiles(sorted[i - 1] as any, sorted[i] as any);
  }

  const countries = new Set(valid.map((v) => v.country).filter(Boolean));
  const cities = new Set(valid.map((v) => `${v.city}|${v.country}`).filter(Boolean));
  const continents = new Set([...countries].map((c) => CONTINENT_MAP[c!] || "Other"));

  // Streak: consecutive months with at least one visit
  const months = new Set(valid.map((v) => (v.date_visited || "").slice(0, 7)).filter(Boolean));
  let streak = 0;
  if (months.size > 0) {
    const arr = [...months].sort();
    streak = 1;
    for (let i = arr.length - 1; i > 0; i--) {
      const cur = new Date(arr[i] + "-01");
      const prev = new Date(arr[i - 1] + "-01");
      const diff = (cur.getFullYear() - prev.getFullYear()) * 12 + (cur.getMonth() - prev.getMonth());
      if (diff === 1) streak++; else break;
    }
  }

  // Favorites: most repeated city
  const cityCount: Record<string, number> = {};
  valid.forEach((v) => {
    const k = `${v.city}, ${v.country}`;
    cityCount[k] = (cityCount[k] || 0) + 1;
  });
  const favorites = Object.entries(cityCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  return {
    countries: countries.size,
    cities: cities.size,
    miles: Math.round(miles),
    continents: continents.size,
    trips: opts.trips ?? 0,
    checkIns: opts.checkIns ?? 0,
    memories: opts.memories ?? 0,
    badges: opts.badges ?? 0,
    heritageSites: Math.min(valid.length, 12), // placeholder cross-reference
    favorites,
    streakMonths: streak,
  };
}

export type TravelStats = ReturnType<typeof computeTravelStats>;
