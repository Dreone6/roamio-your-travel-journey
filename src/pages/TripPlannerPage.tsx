import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import roavrPin from "@/assets/roavr-pin.png";

const POPULAR_DESTINATIONS = [
  { flag: "🇮🇹", city: "Rome", country: "Italy" },
  { flag: "🇮🇹", city: "Florence", country: "Italy" },
  { flag: "🇮🇹", city: "Positano", country: "Italy" },
  { flag: "🇯🇵", city: "Tokyo", country: "Japan" },
  { flag: "🇯🇵", city: "Kyoto", country: "Japan" },
  { flag: "🇫🇷", city: "Paris", country: "France" },
  { flag: "🇪🇸", city: "Barcelona", country: "Spain" },
  { flag: "🇪🇸", city: "Madrid", country: "Spain" },
  { flag: "🇵🇹", city: "Lisbon", country: "Portugal" },
  { flag: "🇬🇧", city: "London", country: "United Kingdom" },
  { flag: "🇺🇸", city: "New York", country: "United States" },
  { flag: "🇺🇸", city: "San Francisco", country: "United States" },
  { flag: "🇺🇸", city: "Los Angeles", country: "United States" },
  { flag: "🇲🇽", city: "Mexico City", country: "Mexico" },
  { flag: "🇹🇭", city: "Bangkok", country: "Thailand" },
  { flag: "🇮🇩", city: "Bali", country: "Indonesia" },
  { flag: "🇬🇷", city: "Athens", country: "Greece" },
  { flag: "🇬🇷", city: "Santorini", country: "Greece" },
  { flag: "🇲🇦", city: "Marrakech", country: "Morocco" },
  { flag: "🇦🇪", city: "Dubai", country: "United Arab Emirates" },
];

const STYLES = [
  { id: "adventure", label: "Adventure", emoji: "🏔" },
  { id: "relaxation", label: "Relax", emoji: "🌴" },
  { id: "culture", label: "Culture", emoji: "🏛" },
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "nightlife", label: "Nightlife", emoji: "🌃" },
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "luxury", label: "Luxury", emoji: "✨" },
  { id: "budget", label: "Budget", emoji: "🎒" },
];

const GROUP_CHIPS = ["Solo", "Partner", "Friends", "Family", "Kids"];
const FOOD_PREFS = [
  "No restrictions",
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Gluten free",
  "Nut allergy",
];

const LOADING_MESSAGES = [
  "Mapping your adventure...",
  "Curating local favorites...",
  "Sequencing your route...",
  "Checking the weather...",
  "Adding hidden gems...",
  "Almost ready...",
];

const ACCENT = "#3B82F6"; // dark-brand swap for "amber"
const SURFACE = "#111827";
const ELEVATED = "#1A2236";
const BORDER = "#1E2A3F";
const BG = "#080D1A";

export default function TripPlannerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [destination, setDestination] = useState("");
  const [selectedDest, setSelectedDest] = useState<{ city: string; country: string; flag: string } | null>(null);
  const [destOpen, setDestOpen] = useState(false);

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const [budget, setBudget] = useState(3500);
  const [perPerson, setPerPerson] = useState(false);

  const [groupSize, setGroupSize] = useState(2);
  const [groupTags, setGroupTags] = useState<string[]>([]);

  const [style, setStyle] = useState<string>("adventure");
  const [foods, setFoods] = useState<string[]>(["No restrictions"]);

  const [generating, setGenerating] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState(0);

  // Rotate loading messages
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => setLoadingIdx((i) => (i + 1) % LOADING_MESSAGES.length), 1800);
    return () => clearInterval(t);
  }, [generating]);

  const filteredDest = useMemo(() => {
    if (!destination) return POPULAR_DESTINATIONS.slice(0, 6);
    const q = destination.toLowerCase();
    return POPULAR_DESTINATIONS.filter(
      (d) => d.city.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [destination]);

  const nights =
    startDate && endDate ? Math.max(0, differenceInCalendarDays(endDate, startDate)) : 0;
  const tripLength = nights + 1;

  const canSubmit = !!selectedDest && !!startDate && !!endDate && nights > 0;

  const toggle = (arr: string[], v: string, setter: (a: string[]) => void) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-itinerary", {
        body: {
          destination: selectedDest!.city,
          country: selectedDest!.country,
          start_date: format(startDate!, "yyyy-MM-dd"),
          end_date: format(endDate!, "yyyy-MM-dd"),
          trip_length: tripLength,
          group_size: groupSize,
          budget,
          travel_style: style,
          interests: [style, ...groupTags],
          food_prefs: foods,
        },
      });

      if (error) throw error;
      if (!data?.itinerary) throw new Error("No itinerary returned");

      const it = data.itinerary;

      // Create trip
      const { data: trip, error: tripErr } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          title: it.trip_title || `Trip to ${selectedDest!.city}`,
          destination: it.destination || selectedDest!.city,
          start_date: format(startDate!, "yyyy-MM-dd"),
          end_date: format(endDate!, "yyyy-MM-dd"),
          travelers: groupSize,
          budget,
          status: "planning",
          interests: [style, ...groupTags],
          ai_generated: true,
        })
        .select()
        .single();
      if (tripErr) throw tripErr;

      // Owner membership
      await supabase
        .from("trip_members")
        .insert({ trip_id: trip.id, user_id: user.id, role: "owner" });

      // Itinerary items (bulk)
      const items =
        (it.days as any[])?.flatMap((day) =>
          (day.items as any[])?.map((i) => ({
            trip_id: trip.id,
            user_id: user.id,
            day_number: day.day_number,
            activity: i.title,
            description: i.description,
            location: i.location_name,
            time: typeof i.time === "string" && /^\d{1,2}:\d{2}/.test(i.time) ? i.time : null,
            time_block: i.time,
            type: ["food", "activity", "transport", "lodging", "landmark", "other"].includes(i.item_type)
              ? i.item_type
              : "activity",
            estimated_cost: parseFloat(String(i.estimated_cost).replace(/[^0-9.]/g, "")) || null,
            notes: i.tips,
            tips: i.tips,
            latitude: i.latitude,
            longitude: i.longitude,
          })) ?? []
        ) ?? [];

      if (items.length > 0) {
        const { error: itemsErr } = await supabase.from("itinerary_items").insert(items);
        if (itemsErr) console.error("items insert failed", itemsErr);
      }

      // Packing → checklists
      if (Array.isArray(it.packing_suggestions)) {
        await supabase.from("checklists").insert(
          it.packing_suggestions.map((s: string) => ({
            user_id: user.id,
            trip_id: trip.id,
            item_name: s,
            category: "packing",
          }))
        );
      }

      navigate(`/trips/${trip.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to generate itinerary");
      setGenerating(false);
    }
  };

  // === GENERATION LOADER ===
  if (generating) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
        style={{ background: "#0D0F1C" }}
      >
        <motion.img
          src={roavrPin}
          alt=""
          className="h-10 w-10"
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ filter: `drop-shadow(0 0 18px ${ACCENT})` }}
        />
        <div className="mt-6 h-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="font-display text-[15px] text-white/80"
            >
              {LOADING_MESSAGES[loadingIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // === FORM MODAL ===
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="fixed inset-0 z-[90] flex flex-col"
      style={{ background: BG }}
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-10 flex h-14 items-center justify-between px-4"
        style={{ background: BG, borderBottom: `0.5px solid ${BORDER}` }}
      >
        <div className="w-10" />
        <h1 className="font-display text-[17px] font-semibold text-white">Plan a trip</h1>
        <button
          onClick={() => navigate(-1)}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/5"
        >
          <X size={22} strokeWidth={1.75} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-4">
        {/* 1. Destination */}
        <Section label="Where are you going?">
          <Popover open={destOpen} onOpenChange={setDestOpen}>
            <PopoverTrigger asChild>
              <input
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  setDestOpen(true);
                  setSelectedDest(null);
                }}
                onFocus={() => setDestOpen(true)}
                placeholder="Search a city..."
                className="w-full rounded-2xl px-4 text-[15px] text-white outline-none placeholder:text-white/40"
                style={{ background: SURFACE, height: 52, border: `1px solid ${BORDER}` }}
              />
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[calc(100vw-40px)] max-w-[460px] border-none p-0"
              style={{ background: ELEVATED, border: `1px solid ${BORDER}` }}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="py-1">
                {filteredDest.map((d) => (
                  <button
                    key={d.city + d.country}
                    onClick={() => {
                      setSelectedDest(d);
                      setDestination(`${d.city}, ${d.country}`);
                      setDestOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-white hover:bg-white/5"
                  >
                    <span className="text-lg">{d.flag}</span>
                    <span className="text-sm">
                      <span className="font-medium">{d.city}</span>
                      <span className="ml-1 text-white/50">{d.country}</span>
                    </span>
                  </button>
                ))}
                {filteredDest.length === 0 && (
                  <p className="px-4 py-3 text-sm text-white/50">No matches</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </Section>

        {/* 2. Dates */}
        <Section label="When?">
          <div className="grid grid-cols-2 gap-3">
            <DateField label="Departs" value={startDate} onChange={setStartDate} min={new Date()} />
            <DateField
              label="Returns"
              value={endDate}
              onChange={setEndDate}
              min={startDate ?? new Date()}
            />
          </div>
          {nights > 0 && (
            <p className="mt-2 text-[13px] font-medium" style={{ color: ACCENT }}>
              {nights} night{nights === 1 ? "" : "s"}
            </p>
          )}
        </Section>

        {/* 3. Budget */}
        <Section label="What is your budget?">
          <div
            className="rounded-2xl p-4"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-baseline justify-between">
              <p className="text-[22px] font-semibold text-white">
                ${budget.toLocaleString()}
              </p>
              <div className="flex gap-1 rounded-full p-1" style={{ background: ELEVATED }}>
                {[
                  { id: "total", label: "Total" },
                  { id: "pp", label: "Per person" },
                ].map((o) => {
                  const active = (o.id === "pp") === perPerson;
                  return (
                    <button
                      key={o.id}
                      onClick={() => setPerPerson(o.id === "pp")}
                      className="rounded-full px-3 py-1 text-[11px] font-semibold transition-colors"
                      style={{
                        background: active ? ACCENT : "transparent",
                        color: active ? "#fff" : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-1 text-[12px] text-white/50">
              {perPerson
                ? `$${Math.round(budget / Math.max(1, groupSize)).toLocaleString()} per person`
                : `$${budget.toLocaleString()} total`}
            </p>
            <div className="mt-4">
              <Slider
                value={[budget]}
                min={200}
                max={25000}
                step={100}
                onValueChange={(v) => setBudget(v[0])}
              />
            </div>
          </div>
        </Section>

        {/* 4. Group size */}
        <Section label="Traveling with?">
          <div
            className="flex items-center justify-between rounded-2xl px-4 py-3"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <button
              onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white"
              style={{ background: ELEVATED }}
            >
              <Minus size={16} strokeWidth={1.75} />
            </button>
            <span className="font-display text-[22px] font-semibold text-white">{groupSize}</span>
            <button
              onClick={() => setGroupSize(Math.min(12, groupSize + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white"
              style={{ background: ACCENT }}
            >
              <Plus size={16} strokeWidth={1.75} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {GROUP_CHIPS.map((g) => {
              const active = groupTags.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => toggle(groupTags, g, setGroupTags)}
                  className="rounded-full px-3 py-1.5 text-[12px]"
                  style={{
                    background: active ? ACCENT : SURFACE,
                    color: active ? "#fff" : "rgba(255,255,255,0.7)",
                    border: `1px solid ${active ? ACCENT : BORDER}`,
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </Section>

        {/* 5. Style */}
        <Section label="Your vibe for this trip">
          <div className="grid grid-cols-4 gap-2">
            {STYLES.map((s) => {
              const active = style === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className="flex flex-col items-center gap-1 rounded-2xl py-3 transition-transform active:scale-95"
                  style={{
                    background: active ? `${ACCENT}26` : SURFACE,
                    border: `1px solid ${active ? ACCENT : BORDER}`,
                  }}
                >
                  <span className="text-xl">{s.emoji}</span>
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: active ? "#fff" : "rgba(255,255,255,0.7)" }}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* 6. Food prefs */}
        <Section label="Any food needs?" optional>
          <div className="flex flex-wrap gap-2">
            {FOOD_PREFS.map((f) => {
              const active = foods.includes(f);
              return (
                <button
                  key={f}
                  onClick={() => toggle(foods, f, setFoods)}
                  className="rounded-full px-3 py-1.5 text-[12px]"
                  style={{
                    background: active ? ACCENT : SURFACE,
                    color: active ? "#fff" : "rgba(255,255,255,0.7)",
                    border: `1px solid ${active ? ACCENT : BORDER}`,
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Sticky CTA */}
      <div
        className="sticky bottom-0 z-10 px-5 pb-6 pt-3"
        style={{
          background: `linear-gradient(to top, ${BG} 60%, rgba(8,13,26,0))`,
        }}
      >
        <button
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={cn(
            "flex h-[52px] w-full items-center justify-center gap-2 rounded-full font-display text-[16px] font-semibold text-white transition-opacity",
            !canSubmit && "opacity-50"
          )}
          style={{ background: ACCENT }}
        >
          <Sparkles size={18} strokeWidth={1.75} />
          Build my itinerary
        </button>
      </div>
    </motion.div>
  );
}

function Section({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <label className="mb-2 flex items-center gap-2 font-display text-[14px] font-semibold text-white">
        {label}
        {optional && <span className="text-[11px] font-normal text-white/40">optional</span>}
      </label>
      {children}
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value?: Date;
  onChange: (d?: Date) => void;
  min: Date;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex h-[52px] w-full flex-col items-start justify-center rounded-2xl px-4 text-left text-white"
          style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        >
          <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
          <div className="flex w-full items-center justify-between">
            <span className="text-[14px]" style={{ color: value ? ACCENT : "rgba(255,255,255,0.4)" }}>
              {value ? format(value, "EEE, MMM d") : "Pick a date"}
            </span>
            <CalendarIcon size={16} className="text-white/50" strokeWidth={1.75} />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" style={{ background: ELEVATED }}>
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={(d) => d < new Date(min.setHours(0, 0, 0, 0))}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
