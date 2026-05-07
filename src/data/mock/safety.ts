import type {
  SafetyNote, TrustedContact,
} from "../types";

// ─── Extended SafePass Types ─────────────────────────────

export interface DestinationSafety {
  id: string;
  destination: string;
  country: string;
  overallLevel: "safe" | "caution" | "alert";
  summary: string;
  lastUpdated: string;
  categories: SafetyCategory[];
  emergencyNumbers: EmergencyNumber[];
  embassy: EmbassyInfo | null;
  tips: string[];
}

export interface SafetyCategory {
  name: string;
  level: "safe" | "caution" | "alert";
  description: string;
  icon: string;
}

export interface EmergencyNumber {
  label: string;
  number: string;
  notes?: string;
}

export interface EmbassyInfo {
  name: string;
  address: string;
  phone: string;
  email: string | null;
  hours: string;
  website: string | null;
}

export interface SafetyChecklistItem {
  id: string;
  category: "documents" | "health" | "safety" | "packing" | "sharing";
  label: string;
  description: string;
  completed: boolean;
  required: boolean;
  tripId?: string;
}

export interface TripSharingConfig {
  tripId: string;
  enabled: boolean;
  shareWith: string[]; // contact IDs
  shareItinerary: boolean;
  shareLocation: boolean;
  shareCheckIns: boolean;
  autoNotifyOnArrival: boolean;
}

// ─── Mock Data ───────────────────────────────────────────

export const MOCK_DESTINATION_SAFETY: DestinationSafety[] = [
  {
    id: "ds-1",
    destination: "Tokyo",
    country: "Japan",
    overallLevel: "safe",
    summary: "Japan is one of the safest countries for travelers. Violent crime is extremely rare and cities are well-policed.",
    lastUpdated: "2026-05-01T00:00:00Z",
    categories: [
      { name: "Street Safety", level: "safe", description: "Very safe at all hours. Well-lit streets and low crime rates.", icon: "🚶" },
      { name: "Transport", level: "safe", description: "Public transit is clean, safe, and incredibly punctual.", icon: "🚄" },
      { name: "Scams", level: "caution", description: "Rare, but watch for overcharging at tourist-area bars in Kabukicho.", icon: "⚠️" },
      { name: "Natural Disasters", level: "caution", description: "Earthquakes possible. Follow emergency procedures and keep the NHK app.", icon: "🌊" },
      { name: "Nightlife", level: "safe", description: "Generally very safe. Be cautious of drink pricing in Roppongi.", icon: "🌙" },
      { name: "Local Customs", level: "safe", description: "Bow when greeting. Remove shoes indoors. Don't tip.", icon: "🎎" },
    ],
    emergencyNumbers: [
      { label: "Police", number: "110", notes: "English support available" },
      { label: "Ambulance & Fire", number: "119" },
      { label: "Tourist Helpline", number: "03-3503-8484", notes: "English, Chinese, Korean" },
    ],
    embassy: {
      name: "U.S. Embassy Tokyo",
      address: "1-10-5 Akasaka, Minato-ku, Tokyo 107-8420",
      phone: "03-3224-5000",
      email: "TokyoACS@state.gov",
      hours: "Mon-Fri 8:30am - 5:30pm",
      website: "https://jp.usembassy.gov",
    },
    tips: [
      "Japan is extremely safe, but always carry your passport copy",
      "Download the Safety Tips app by NTA for disaster alerts",
      "Most hospitals don't accept foreign insurance — get travel coverage",
      "Cash is still king in many smaller shops and restaurants",
    ],
  },
  {
    id: "ds-2",
    destination: "Marrakech",
    country: "Morocco",
    overallLevel: "caution",
    summary: "Morocco is generally safe for tourists, but petty crime and scams are common in busy markets. Stay aware and confident.",
    lastUpdated: "2026-04-20T00:00:00Z",
    categories: [
      { name: "Street Safety", level: "caution", description: "Busy medina streets can be disorienting. Pickpocketing is common in crowds.", icon: "🚶" },
      { name: "Transport", level: "caution", description: "Use registered taxis. Agree on price before riding. Avoid unlicensed drivers.", icon: "🚕" },
      { name: "Scams", level: "alert", description: "Common scams include fake guides, inflated prices, and unsolicited henna tattoos.", icon: "⚠️" },
      { name: "Weather", level: "caution", description: "Extreme heat in summer (40°C+). Stay hydrated and avoid midday sun.", icon: "☀️" },
      { name: "Nightlife", level: "caution", description: "Stick to known venues. Solo travelers should be extra cautious after dark.", icon: "🌙" },
      { name: "Local Customs", level: "safe", description: "Dress modestly. Ask permission before photographing people. Respect Ramadan.", icon: "🕌" },
    ],
    emergencyNumbers: [
      { label: "Police", number: "19" },
      { label: "Ambulance", number: "15" },
      { label: "Tourist Police", number: "0524-384-601" },
    ],
    embassy: {
      name: "U.S. Consulate General Casablanca",
      address: "8 Boulevard Moulay Youssef, Casablanca",
      phone: "0522-642-099",
      email: null,
      hours: "Mon-Fri 8:00am - 5:00pm",
      website: "https://ma.usembassy.gov",
    },
    tips: [
      "Negotiate prices before buying — it's expected and part of the culture",
      "Keep small bills handy for tipping and small purchases",
      "Drink bottled water only",
      "Women travelers may receive more attention — a firm 'no thank you' works",
    ],
  },
  {
    id: "ds-3",
    destination: "Amalfi Coast",
    country: "Italy",
    overallLevel: "safe",
    summary: "The Amalfi Coast is a very safe destination. Main concerns are winding roads, summer crowds, and petty theft in tourist areas.",
    lastUpdated: "2026-04-15T00:00:00Z",
    categories: [
      { name: "Street Safety", level: "safe", description: "Very safe. Watch for narrow roads and fast Vespas.", icon: "🚶" },
      { name: "Transport", level: "caution", description: "Cliff-side roads can be nerve-wracking. Experienced drivers recommended.", icon: "🚗" },
      { name: "Scams", level: "safe", description: "Minimal. Occasional overcharging at restaurants — check bills carefully.", icon: "⚠️" },
      { name: "Weather", level: "safe", description: "Mediterranean climate. Use sun protection and stay hydrated in summer.", icon: "☀️" },
      { name: "Nightlife", level: "safe", description: "Safe and relaxed. Most activity winds down by midnight.", icon: "🌙" },
      { name: "Local Customs", level: "safe", description: "Cover shoulders in churches. Lunch is sacred — many shops close 1-4pm.", icon: "⛪" },
    ],
    emergencyNumbers: [
      { label: "General Emergency", number: "112" },
      { label: "Police (Carabinieri)", number: "112" },
      { label: "Ambulance", number: "118" },
    ],
    embassy: null,
    tips: [
      "Book ferries and buses in advance during summer months",
      "Wear sturdy shoes — many paths involve steps and uneven terrain",
      "Carry cash for smaller restaurants and shops",
    ],
  },
];

export const MOCK_SAFETY_CHECKLIST: SafetyChecklistItem[] = [
  { id: "sc-1", category: "documents", label: "Passport valid for 6+ months", description: "Check your passport expiration date", completed: true, required: true },
  { id: "sc-2", category: "documents", label: "Visa requirements checked", description: "Verify if you need a visa for your destination", completed: true, required: true },
  { id: "sc-3", category: "documents", label: "Travel insurance purchased", description: "Get coverage for medical, cancellation, and baggage", completed: false, required: true },
  { id: "sc-4", category: "documents", label: "Copy of passport stored", description: "Keep a digital copy in cloud storage", completed: true, required: false },
  { id: "sc-5", category: "health", label: "Vaccinations up to date", description: "Check CDC requirements for your destination", completed: false, required: true },
  { id: "sc-6", category: "health", label: "Prescription medications packed", description: "Bring enough for the trip plus extra days", completed: false, required: false },
  { id: "sc-7", category: "health", label: "First aid kit prepared", description: "Band-aids, pain relief, anti-diarrheal, antihistamines", completed: false, required: false },
  { id: "sc-8", category: "safety", label: "Emergency contacts set up", description: "Add trusted contacts in Roavr SafePass", completed: true, required: true },
  { id: "sc-9", category: "safety", label: "Embassy info saved", description: "Know your nearest embassy or consulate", completed: false, required: false },
  { id: "sc-10", category: "safety", label: "Trip shared with contacts", description: "Share your itinerary with someone you trust", completed: false, required: true },
  { id: "sc-11", category: "packing", label: "Money belt or hidden pouch", description: "Keep valuables secure while exploring", completed: false, required: false },
  { id: "sc-12", category: "packing", label: "Portable phone charger", description: "Never run out of battery when you need maps or help", completed: false, required: false },
  { id: "sc-13", category: "sharing", label: "Live location enabled", description: "Share real-time location with trusted contacts", completed: false, required: false },
  { id: "sc-14", category: "sharing", label: "Check-in notifications on", description: "Auto-notify contacts when you check in", completed: false, required: false },
];

export const MOCK_TRIP_SHARING: TripSharingConfig = {
  tripId: "t-001",
  enabled: true,
  shareWith: ["tc-1", "tc-2"],
  shareItinerary: true,
  shareLocation: false,
  shareCheckIns: true,
  autoNotifyOnArrival: true,
};
