import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Sparkles, MapPin, Calendar, Wallet, Users,
  Heart, Zap, Shield, Loader2, Shuffle, ChevronRight,
} from "lucide-react";

// ─── Step Data ─────────────────────────────────────────────

const TRIP_GOALS = [
  { id: "relaxation", emoji: "🧘", label: "Relaxation" },
  { id: "adventure", emoji: "🏔️", label: "Adventure" },
  { id: "foodie", emoji: "🍜", label: "Food & Drink" },
  { id: "luxury", emoji: "💎", label: "Luxury" },
  { id: "budget", emoji: "💰", label: "Budget" },
  { id: "romantic", emoji: "💕", label: "Romantic" },
  { id: "family", emoji: "👨‍👩‍👧‍👦", label: "Family" },
  { id: "business", emoji: "💼", label: "Business" },
  { id: "nightlife", emoji: "🌃", label: "Nightlife" },
  { id: "cultural", emoji: "🏛️", label: "Culture" },
  { id: "surprise", emoji: "✨", label: "Surprise Me" },
];

const TRAVELER_TYPES = [
  { id: "solo", emoji: "🧳", label: "Solo" },
  { id: "couple", emoji: "💑", label: "Couple" },
  { id: "family", emoji: "👨‍👩‍👧", label: "Family" },
  { id: "friends", emoji: "👯", label: "Friends" },
  { id: "business", emoji: "🤝", label: "Business" },
  { id: "group", emoji: "👥", label: "Group" },
];

const INTERESTS = [
  { id: "food", emoji: "🍽️", label: "Food" },
  { id: "beaches", emoji: "🏖️", label: "Beaches" },
  { id: "museums", emoji: "🖼️", label: "Museums" },
  { id: "shopping", emoji: "🛍️", label: "Shopping" },
  { id: "nature", emoji: "🌿", label: "Nature" },
  { id: "nightlife", emoji: "🌙", label: "Nightlife" },
  { id: "culture", emoji: "🎭", label: "Local Culture" },
  { id: "hidden", emoji: "🗝️", label: "Hidden Gems" },
  { id: "events", emoji: "🎉", label: "Events" },
  { id: "wellness", emoji: "🧖", label: "Wellness" },
  { id: "luxury", emoji: "⭐", label: "Luxury" },
  { id: "photography", emoji: "📸", label: "Photography" },
];

const PACE_OPTIONS = [
  { id: "relaxed", emoji: "🐢", label: "Relaxed", desc: "Fewer activities, more downtime" },
  { id: "balanced", emoji: "⚖️", label: "Balanced", desc: "Mix of activities and free time" },
  { id: "packed", emoji: "🚀", label: "Packed", desc: "Maximum activities per day" },
];

const BUDGET_PRESETS = [
  { id: "budget", label: "$500 – $1,500", range: [500, 1500] },
  { id: "mid", label: "$1,500 – $3,000", range: [1500, 3000] },
  { id: "comfort", label: "$3,000 – $6,000", range: [3000, 6000] },
  { id: "luxury", label: "$6,000+", range: [6000, 15000] },
];

// ─── Types ─────────────────────────────────────────────────

interface TripPlan {
  goal: string;
  destination: string;
  surpriseMe: boolean;
  startDate: string;
  endDate: string;
  flexibleDates: boolean;
  budgetPreset: string;
  customBudget: string;
  travelerType: string;
  travelerCount: string;
  interests: string[];
  pace: string;
  dietary: string;
  mobility: string;
  safetyNotes: string;
}

interface NewTripFormProps {
  onBack: () => void;
  onTripCreated: (tripId: string, itinerary: any) => void;
}

type Step = "goal" | "destination" | "dates" | "budget" | "travelers" | "interests" | "pace" | "safety" | "generating";

const STEPS: Step[] = ["goal", "destination", "dates", "budget", "travelers", "interests", "pace", "safety", "generating"];

const GENERATION_PHASES = [
  { label: "Finding destinations", icon: MapPin, duration: 1500 },
  { label: "Mapping routes", icon: Zap, duration: 1200 },
  { label: "Balancing budget", icon: Wallet, duration: 1000 },
  { label: "Checking safety notes", icon: Shield, duration: 800 },
  { label: "Finding local offers", icon: Heart, duration: 1000 },
  { label: "Creating itinerary", icon: Sparkles, duration: 2000 },
];

export default function NewTripForm({ onBack, onTripCreated }: NewTripFormProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("goal");
  const [genPhase, setGenPhase] = useState(0);
  const [plan, setPlan] = useState<TripPlan>({
    goal: "", destination: "", surpriseMe: false,
    startDate: "", endDate: "", flexibleDates: false,
    budgetPreset: "mid", customBudget: "",
    travelerType: "solo", travelerCount: "1",
    interests: [], pace: "balanced",
    dietary: "", mobility: "", safetyNotes: "",
  });

  const update = (partial: Partial<TripPlan>) => setPlan((p) => ({ ...p, ...partial }));
  const toggleInterest = (id: string) =>
    update({ interests: plan.interests.includes(id) ? plan.interests.filter((i) => i !== id) : [...plan.interests, id] });

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canProceed = (): boolean => {
    switch (step) {
      case "goal": return !!plan.goal;
      case "destination": return !!plan.destination || plan.surpriseMe;
      case "dates": return plan.flexibleDates || (!!plan.startDate && !!plan.endDate);
      case "budget": return true;
      case "travelers": return !!plan.travelerType;
      case "interests": return plan.interests.length > 0;
      case "pace": return !!plan.pace;
      case "safety": return true;
      default: return false;
    }
  };

  const next = () => {
    if (step === "safety") {
      setStep("generating");
      generateTrip();
    } else {
      const idx = STEPS.indexOf(step);
      if (idx < STEPS.length - 2) setStep(STEPS[idx + 1]);
    }
  };

  const back = () => {
    if (step === "goal") { onBack(); return; }
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const generateTrip = async () => {
    if (!user) return;

    // Animate phases
    for (let i = 0; i < GENERATION_PHASES.length; i++) {
      setGenPhase(i);
      await new Promise((r) => setTimeout(r, GENERATION_PHASES[i].duration));
    }

    try {
      const budgetRange = BUDGET_PRESETS.find((b) => b.id === plan.budgetPreset);
      const budgetVal = plan.customBudget || String(budgetRange?.range[1] || 3000);
      const dest = plan.surpriseMe ? "Surprise me with a destination" : plan.destination;

      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          title: plan.surpriseMe ? "Mystery Trip ✨" : `Trip to ${plan.destination}`,
          destination: plan.surpriseMe ? "TBD" : plan.destination,
          start_date: plan.flexibleDates ? new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] : plan.startDate,
          end_date: plan.flexibleDates ? new Date(Date.now() + 37 * 86400000).toISOString().split("T")[0] : plan.endDate,
          budget: parseFloat(budgetVal) || null,
          trip_style: plan.goal as any,
          travelers: parseInt(plan.travelerCount) || 1,
          pace: plan.pace,
          dietary: plan.dietary || null,
          interests: plan.interests,
          status: "planning" as const,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      const { data: aiData, error: fnError } = await supabase.functions.invoke("generate-itinerary", {
        body: {
          destination: dest,
          start_date: plan.flexibleDates ? "flexible" : plan.startDate,
          end_date: plan.flexibleDates ? "flexible (7 days)" : plan.endDate,
          budget: budgetVal,
          travelers: plan.travelerCount,
          trip_style: plan.goal,
          traveler_type: plan.travelerType,
          pace: plan.pace,
          interests: plan.interests.join(", "),
          dietary: plan.dietary,
          mobility: plan.mobility,
          safety_notes: plan.safetyNotes,
          surprise_me: plan.surpriseMe,
        },
      });

      if (fnError) throw fnError;
      if (aiData?.error) throw new Error(aiData.error);

      // Update destination if surprise
      if (plan.surpriseMe && aiData?.destination) {
        await supabase.from("trips").update({
          destination: aiData.destination,
          title: `Trip to ${aiData.destination}`,
        }).eq("id", trip.id);
      }

      // Save itinerary items
      const items: any[] = [];
      for (const day of aiData.days || []) {
        for (const block of ["morning", "afternoon", "evening"] as const) {
          const act = day[block];
          if (act) {
            items.push({
              trip_id: trip.id,
              user_id: user.id,
              day_number: day.day,
              time: act.time || null,
              activity: act.activity || "Activity",
              location: act.location || null,
              notes: null,
              type: "activity" as const,
              estimated_cost: act.estimated_cost || null,
              description: act.description || null,
              time_block: block,
            });
          }
        }
      }

      if (items.length > 0) {
        await supabase.from("itinerary_items").insert(items);
      }

      toast.success("Your itinerary is ready! ✨");
      onTripCreated(trip.id, aiData);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create trip");
      setStep("safety");
    }
  };

  // ─── Generation Screen ────────────────────────────────

  if (step === "generating") {
    return (
      <div className="dark-immersive min-h-screen flex flex-col items-center justify-center px-8">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative z-10 text-center space-y-8 max-w-xs">
          {/* Animated globe */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="absolute inset-2 rounded-full bg-emerald-500/5 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
            <div className="relative h-full w-full rounded-full gradient-glow flex items-center justify-center glow-accent-strong">
              <Sparkles className="h-10 w-10 text-white animate-pulse" />
            </div>
          </div>

          <div>
            <h2 className="font-heading text-xl font-bold text-white">Building your trip</h2>
            <p className="text-dark-muted text-[13px] mt-1">
              {plan.surpriseMe ? "Finding the perfect surprise destination..." : `Planning ${plan.destination}...`}
            </p>
          </div>

          {/* Progress steps */}
          <div className="space-y-3 text-left">
            {GENERATION_PHASES.map((phase, i) => {
              const Icon = phase.icon;
              const done = i < genPhase;
              const active = i === genPhase;
              return (
                <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${active ? "opacity-100" : done ? "opacity-50" : "opacity-20"}`}>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${active ? "gradient-glow glow-accent" : done ? "bg-emerald-500/20" : "dark-card"}`}>
                    {active ? (
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    ) : done ? (
                      <Icon className="h-4 w-4 text-glow" />
                    ) : (
                      <Icon className="h-4 w-4 text-dark-muted" />
                    )}
                  </div>
                  <span className={`text-[12px] font-medium ${active ? "text-white" : done ? "text-dark-muted" : "text-dark-muted"}`}>
                    {phase.label} {done && "✓"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── Wizard Steps ─────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="dark-immersive relative overflow-hidden shrink-0">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-5 pt-12 pb-4">
          <button onClick={back} className="text-dark-muted flex items-center gap-1 text-[12px] mb-3">
            <ArrowLeft className="h-4 w-4" /> {step === "goal" ? "Trips" : "Back"}
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-glow" />
            <h1 className="font-heading text-[20px] font-bold text-white tracking-tight">AI Trip Planner</h1>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-dark-muted mt-1.5 uppercase tracking-wider">
            Step {stepIndex + 1} of {STEPS.length - 1}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-6 pb-8 space-y-5 overflow-y-auto">

        {/* ── GOAL ──────────────── */}
        {step === "goal" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">What kind of trip?</h2>
              <p className="text-[12px] text-muted-foreground mt-1">Pick the vibe for your next adventure</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {TRIP_GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => update({ goal: g.id })}
                  className={`rounded-2xl p-4 text-left transition-all active:scale-[0.97] border ${
                    plan.goal === g.id
                      ? "border-accent bg-accent/8 shadow-md"
                      : "border-border/40 bg-card hover:border-accent/30"
                  }`}
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <p className={`text-[12px] font-semibold mt-2 ${plan.goal === g.id ? "text-accent" : "text-foreground"}`}>{g.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── DESTINATION ──────── */}
        {step === "destination" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Where to?</h2>
              <p className="text-[12px] text-muted-foreground mt-1">Enter a destination or let AI decide</p>
            </div>

            <button
              onClick={() => update({ surpriseMe: !plan.surpriseMe, destination: "" })}
              className={`w-full rounded-2xl p-4 flex items-center gap-3 transition-all border ${
                plan.surpriseMe ? "border-accent bg-accent/8" : "border-border/40 bg-card"
              }`}
            >
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${plan.surpriseMe ? "gradient-accent" : "bg-secondary"}`}>
                <Shuffle className="h-5 w-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className={`text-[13px] font-semibold ${plan.surpriseMe ? "text-accent" : "text-foreground"}`}>Surprise Me ✨</p>
                <p className="text-[11px] text-muted-foreground">Let AI pick the perfect destination</p>
              </div>
            </button>

            {!plan.surpriseMe && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={plan.destination}
                  onChange={(e) => update({ destination: e.target.value })}
                  placeholder="Paris, Tokyo, Bali..."
                  className="w-full h-12 rounded-xl border border-border/40 bg-card px-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                {/* Popular suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {["Tokyo", "Bali", "Barcelona", "Marrakech", "Lisbon", "Reykjavik"].map((d) => (
                    <button
                      key={d}
                      onClick={() => update({ destination: d })}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all ${
                        plan.destination === d ? "border-accent bg-accent/10 text-accent" : "border-border/40 bg-card text-muted-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DATES ────────────── */}
        {step === "dates" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">When?</h2>
              <p className="text-[12px] text-muted-foreground mt-1">Set your travel dates or keep it flexible</p>
            </div>

            <button
              onClick={() => update({ flexibleDates: !plan.flexibleDates })}
              className={`w-full rounded-2xl p-4 flex items-center gap-3 transition-all border ${
                plan.flexibleDates ? "border-accent bg-accent/8" : "border-border/40 bg-card"
              }`}
            >
              <Calendar className={`h-5 w-5 ${plan.flexibleDates ? "text-accent" : "text-muted-foreground"}`} />
              <div className="text-left">
                <p className={`text-[13px] font-semibold ${plan.flexibleDates ? "text-accent" : "text-foreground"}`}>I'm flexible</p>
                <p className="text-[11px] text-muted-foreground">AI will suggest the best time to go</p>
              </div>
            </button>

            {!plan.flexibleDates && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Start</label>
                  <input
                    type="date"
                    value={plan.startDate}
                    onChange={(e) => update({ startDate: e.target.value })}
                    className="w-full h-11 rounded-xl border border-border/40 bg-card px-3 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">End</label>
                  <input
                    type="date"
                    value={plan.endDate}
                    onChange={(e) => update({ endDate: e.target.value })}
                    className="w-full h-11 rounded-xl border border-border/40 bg-card px-3 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BUDGET ───────────── */}
        {step === "budget" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Budget</h2>
              <p className="text-[12px] text-muted-foreground mt-1">Per person, total trip</p>
            </div>
            <div className="space-y-2.5">
              {BUDGET_PRESETS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => update({ budgetPreset: b.id, customBudget: "" })}
                  className={`w-full rounded-2xl p-4 text-left transition-all border ${
                    plan.budgetPreset === b.id && !plan.customBudget
                      ? "border-accent bg-accent/8"
                      : "border-border/40 bg-card hover:border-accent/30"
                  }`}
                >
                  <p className={`text-[13px] font-semibold ${plan.budgetPreset === b.id && !plan.customBudget ? "text-accent" : "text-foreground"}`}>{b.label}</p>
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Or enter custom amount (USD)</label>
              <input
                type="number"
                value={plan.customBudget}
                onChange={(e) => update({ customBudget: e.target.value })}
                placeholder="5000"
                className="w-full h-11 rounded-xl border border-border/40 bg-card px-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
        )}

        {/* ── TRAVELERS ────────── */}
        {step === "travelers" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Who's going?</h2>
              <p className="text-[12px] text-muted-foreground mt-1">Travel companions shape the itinerary</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {TRAVELER_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => update({ travelerType: t.id })}
                  className={`rounded-2xl p-3.5 text-center transition-all active:scale-[0.97] border ${
                    plan.travelerType === t.id ? "border-accent bg-accent/8" : "border-border/40 bg-card"
                  }`}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <p className={`text-[11px] font-semibold mt-1.5 ${plan.travelerType === t.id ? "text-accent" : "text-foreground"}`}>{t.label}</p>
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Number of travelers</label>
              <input
                type="number"
                min="1"
                max="20"
                value={plan.travelerCount}
                onChange={(e) => update({ travelerCount: e.target.value })}
                className="w-full h-11 rounded-xl border border-border/40 bg-card px-4 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          </div>
        )}

        {/* ── INTERESTS ────────── */}
        {step === "interests" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">What excites you?</h2>
              <p className="text-[12px] text-muted-foreground mt-1">Pick at least one — AI uses these to personalize</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {INTERESTS.map((i) => (
                <button
                  key={i.id}
                  onClick={() => toggleInterest(i.id)}
                  className={`rounded-2xl p-3 text-center transition-all active:scale-[0.97] border ${
                    plan.interests.includes(i.id) ? "border-accent bg-accent/8" : "border-border/40 bg-card"
                  }`}
                >
                  <span className="text-xl">{i.emoji}</span>
                  <p className={`text-[10px] font-semibold mt-1 ${plan.interests.includes(i.id) ? "text-accent" : "text-foreground"}`}>{i.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── PACE ─────────────── */}
        {step === "pace" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Travel pace</h2>
              <p className="text-[12px] text-muted-foreground mt-1">How full do you want each day?</p>
            </div>
            <div className="space-y-2.5">
              {PACE_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => update({ pace: p.id })}
                  className={`w-full rounded-2xl p-4 flex items-center gap-3.5 text-left transition-all border ${
                    plan.pace === p.id ? "border-accent bg-accent/8" : "border-border/40 bg-card hover:border-accent/30"
                  }`}
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <div>
                    <p className={`text-[13px] font-semibold ${plan.pace === p.id ? "text-accent" : "text-foreground"}`}>{p.label}</p>
                    <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── SAFETY ───────────── */}
        {step === "safety" && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Safety & accessibility</h2>
              <p className="text-[12px] text-muted-foreground mt-1">Optional — helps AI plan better</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dietary needs</label>
                <input
                  value={plan.dietary}
                  onChange={(e) => update({ dietary: e.target.value })}
                  placeholder="Vegetarian, gluten-free, halal..."
                  className="w-full h-11 rounded-xl border border-border/40 bg-card px-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mobility & accessibility</label>
                <input
                  value={plan.mobility}
                  onChange={(e) => update({ mobility: e.target.value })}
                  placeholder="Wheelchair accessible, limited walking..."
                  className="w-full h-11 rounded-xl border border-border/40 bg-card px-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Safety notes</label>
                <textarea
                  value={plan.safetyNotes}
                  onChange={(e) => update({ safetyNotes: e.target.value })}
                  placeholder="Allergies, medical conditions, travel with children..."
                  rows={3}
                  className="w-full rounded-xl border border-border/40 bg-card px-4 py-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {(step as string) !== "generating" && (
        <div className="shrink-0 px-5 pb-6 pt-3 border-t border-border/20 bg-background">
          <button
            onClick={next}
            disabled={!canProceed()}
            className={`w-full h-12 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all ${
              canProceed()
                ? step === "safety"
                  ? "gradient-glow text-white glow-accent"
                  : "gradient-accent text-white"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {step === "safety" ? (
              <>
                <Sparkles className="h-4 w-4" /> Generate Itinerary
              </>
            ) : (
              <>
                Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
