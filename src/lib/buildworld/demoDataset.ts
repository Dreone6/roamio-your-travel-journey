/**
 * DEMO DATASET — development / demonstration only.
 *
 * This data is NEVER used for a real user's account unless demo mode is
 * explicitly enabled in the Build My World flow, and everything persisted
 * from it is tagged `source: "demo"` so it can be identified and removed.
 */
import type { MediaItem } from "./types";

interface DemoCluster {
  city: string;
  country: string;
  lat: number;
  lng: number;
  start: string;
  photos: number;
  thumbs: string[];
}

const CLUSTERS: DemoCluster[] = [
  {
    city: "Positano", country: "Italy", lat: 40.6281, lng: 14.4841, start: "2024-05-14", photos: 9,
    thumbs: [
      "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400",
      "https://images.unsplash.com/photo-1534445867742-43195f401b6c?w=400",
      "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=400",
    ],
  },
  {
    city: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, start: "2024-03-02", photos: 12,
    thumbs: [
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400",
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=400",
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400",
    ],
  },
  {
    city: "Lisbon", country: "Portugal", lat: 38.7223, lng: -9.1393, start: "2023-09-08", photos: 7,
    thumbs: [
      "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400",
      "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400",
    ],
  },
  {
    city: "Marrakech", country: "Morocco", lat: 31.6295, lng: -7.9811, start: "2023-04-19", photos: 8,
    thumbs: [
      "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=400",
      "https://images.unsplash.com/photo-1489493887464-892be6d1daae?w=400",
    ],
  },
  {
    city: "Reykjavík", country: "Iceland", lat: 64.1466, lng: -21.9426, start: "2022-11-05", photos: 6,
    thumbs: [
      "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=400",
      "https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=400",
    ],
  },
  {
    city: "Mexico City", country: "Mexico", lat: 19.4326, lng: -99.1332, start: "2022-07-21", photos: 10,
    thumbs: [
      "https://images.unsplash.com/photo-1518659526054-190340b32735?w=400",
      "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?w=400",
    ],
  },
];

function jitter(v: number) {
  return v + (Math.random() - 0.5) * 0.04;
}

export const DEMO_MEDIA: MediaItem[] = CLUSTERS.flatMap((c, ci) =>
  Array.from({ length: c.photos }, (_, i) => {
    const day = new Date(c.start);
    day.setDate(day.getDate() + Math.floor(i / 2));
    return {
      id: `demo-${ci}-${i}`,
      name: `${c.city.toLowerCase()}-${i + 1}.jpg`,
      previewUrl: c.thumbs[i % c.thumbs.length],
      knownLatitude: jitter(c.lat),
      knownLongitude: jitter(c.lng),
      knownTakenAt: day.toISOString(),
      knownCity: c.city,
      knownCountry: c.country,
    } as MediaItem;
  })
);
