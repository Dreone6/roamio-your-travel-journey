import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Mountain, Sparkles, Wallet, Landmark, Utensils, Users,
  Laptop, PersonStanding, Compass, Camera, Loader2, ArrowRight, Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import roavrPin from "@/assets/roavr-pin.png";

const CITIES = [
  "New York","Los Angeles","Chicago","San Francisco","Miami","Toronto","Vancouver",
  "Mexico City","London","Paris","Berlin","Amsterdam","Madrid","Barcelona","Rome",
  "Milan","Lisbon","Prague","Vienna","Copenhagen","Stockholm","Oslo","Dublin",
  "Edinburgh","Reykjavik","Istanbul","Athens","Dubai","Cairo","Cape Town",
  "Marrakech","Lagos","Nairobi","Mumbai","Delhi","Bangkok","Singapore","Hong Kong",
  "Tokyo","Kyoto","Osaka","Seoul","Shanghai","Beijing","Bali","Sydney","Melbourne",
  "Auckland","Rio de Janeiro","Buenos Aires",
];

const TRAVEL_STYLES = [
  { id: "adventure", label: "Adventure seeker", Icon: Mountain },
  { id: "luxury", label: "Luxury traveler", Icon: Sparkles },
  { id: "budget", label: "Budget explorer", Icon: Wallet },
  { id: "culture", label: "Culture lover", Icon: Landmark },
  { id: "foodie", label: "Foodie first", Icon: Utensils },
  { id: "family", label: "Family trips", Icon: Users },
  { id: "nomad", label: "Digital nomad", Icon: Laptop },
  { id: "solo", label: "Solo wanderer", Icon: PersonStanding },
];

const INTERESTS = [
  "Food and drink","Nature and outdoors","Architecture","Nightlife","Museums",
  "Local markets","Beach and ocean","Mountains","History","Street art",
  "Wellness and spa","Sports and adventure",
];

const COLORS = {
  bg: "#080D1A",
  surface: "#111827",
  elevated: "#1A2236",
  border: "#1E2A3F",
  text: "#FFFFFF",
  textMuted: "#94A3B8",
  textDim: "#4B5563",
  accent: "#3B82F6",
  accentHover: "#2563EB",
  amber: "#F4A261",
};

export default function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [travelStyle, setTravelStyle] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    supabase
      .from("profiles")
      .select("onboarding_completed, name, home_city")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.onboarding_completed) {
          navigate("/home", { replace: true });
          return;
        }
        if (data?.name) setFullName(data.name);
        if (data?.home_city) setHomeCity(data.home_city);
        setChecking(false);
      });
  }, [user, loading, navigate]);

  const goNext = () => { setDirection(1); setStep((s) => Math.min(4, s + 1)); };
  const goBack = () => { setDirection(-1); setStep((s) => Math.max(1, s - 1)); };

  const canAdvance = useMemo(() => {
    if (step === 1) return fullName.trim().length >= 2 && homeCity.trim().length > 0;
    if (step === 2) return !!travelStyle;
    if (step === 3) return interests.length > 0;
    return true;
  }, [step, fullName, homeCity, travelStyle, interests]);

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatarUrl: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          name: fullName.trim(),
          home_city: homeCity.trim(),
          travel_style: travelStyle,
          interests,
          ...(avatarUrl ? { profile_photo: avatarUrl } : {}),
          onboarding_completed: true,
        })
        .eq("id", user.id);
      if (error) throw error;

      sessionStorage.setItem(`roavr_onboarded_${user.id}`, "true");
      setShowCelebrate(true);
      setTimeout(() => navigate("/home", { replace: true }), 1500);
    } catch (err: any) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: COLORS.bg }}>
        <Compass className="h-8 w-8 animate-spin" style={{ color: COLORS.accent }} strokeWidth={1.5} />
      </div>
    );
  }

  if (showCelebrate) return <CelebrationScreen fullName={fullName} />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.bg }}>
      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 pt-10 pb-2">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: n === step ? 28 : 8,
              background:
                n === step ? COLORS.accent : n < step ? `${COLORS.accent}80` : COLORS.border,
            }}
          />
        ))}
      </div>

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 flex flex-col px-6 pt-6 pb-6 overflow-y-auto"
          >
            {step === 1 && (
              <Step1
                fullName={fullName} setFullName={setFullName}
                homeCity={homeCity} setHomeCity={setHomeCity}
              />
            )}
            {step === 2 && <Step2 selected={travelStyle} setSelected={setTravelStyle} />}
            {step === 3 && <Step3 selected={interests} setSelected={setInterests} />}
            {step === 4 && (
              <Step4
                fullName={fullName}
                avatarPreview={avatarPreview}
                onPick={(f) => {
                  setAvatarFile(f);
                  setAvatarPreview(f ? URL.createObjectURL(f) : null);
                }}
                onSkip={() => { setAvatarFile(null); setAvatarPreview(null); }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div className="px-6 pb-10 pt-3 flex items-center gap-3" style={{ background: COLORS.bg }}>
        {step > 1 && (
          <button
            onClick={goBack}
            disabled={saving}
            className="h-13 px-5 rounded-full text-[14px] font-medium transition-colors disabled:opacity-50"
            style={{ color: COLORS.textMuted, height: 52 }}
          >
            Back
          </button>
        )}
        <button
          onClick={step === 4 ? handleFinish : goNext}
          disabled={!canAdvance || saving}
          className="flex-1 rounded-full flex items-center justify-center gap-2 font-semibold text-[14px] transition-all"
          style={{
            background: canAdvance ? COLORS.accent : COLORS.elevated,
            color: canAdvance ? "#FFFFFF" : COLORS.textDim,
            height: 52,
            boxShadow: canAdvance ? "0 2px 8px rgba(59,130,246,0.3)" : "none",
          }}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          ) : step === 4 ? (
            "Let's go"
          ) : (
            <>Continue <ArrowRight className="h-4 w-4" strokeWidth={1.5} /></>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Step 1: Name + Home ───────────────────────── */
function Step1({
  fullName, setFullName, homeCity, setHomeCity,
}: {
  fullName: string; setFullName: (v: string) => void;
  homeCity: string; setHomeCity: (v: string) => void;
}) {
  const [focused, setFocused] = useState<string | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);

  const matches = useMemo(() => {
    if (!homeCity.trim()) return [];
    const q = homeCity.toLowerCase();
    return CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 6);
  }, [homeCity]);

  return (
    <div className="flex-1 flex flex-col">
      <h1 className="font-heading text-[28px] font-bold text-white tracking-tight leading-tight">
        Where do you call home?
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: COLORS.textMuted }}>
        We'll use this to personalize your experience.
      </p>

      <div className="mt-8 space-y-5">
        <Field label="Your name">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onFocus={() => setFocused("name")}
            onBlur={() => setFocused(null)}
            placeholder="e.g. Alex Rivera"
            className="w-full bg-transparent outline-none text-white placeholder:text-[#4B5563] text-[15px]"
            style={{ padding: "14px 18px" }}
            maxLength={80}
            autoFocus
          />
        </Field>

        <div className="relative">
          <Field label="Home city" focused={focused === "city"}>
            <input
              value={homeCity}
              onChange={(e) => { setHomeCity(e.target.value); setShowSuggest(true); }}
              onFocus={() => { setFocused("city"); setShowSuggest(true); }}
              onBlur={() => { setFocused(null); setTimeout(() => setShowSuggest(false), 120); }}
              placeholder="Start typing your city"
              className="w-full bg-transparent outline-none text-white placeholder:text-[#4B5563] text-[15px]"
              style={{ padding: "14px 18px" }}
              maxLength={80}
            />
          </Field>

          {showSuggest && matches.length > 0 && (
            <div
              className="absolute left-0 right-0 mt-2 rounded-2xl overflow-hidden z-10 animate-fade-in"
              style={{
                background: COLORS.elevated,
                border: `1px solid ${COLORS.border}`,
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}
            >
              {matches.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setHomeCity(c); setShowSuggest(false); }}
                  className="w-full text-left px-4 py-3 text-[14px] text-white transition-colors hover:bg-white/5"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label, children, focused,
}: { label: string; children: React.ReactNode; focused?: boolean }) {
  return (
    <div>
      <label className="block text-[12px] font-medium mb-2 uppercase tracking-wide" style={{ color: COLORS.textMuted }}>
        {label}
      </label>
      <div
        className="rounded-xl transition-all duration-250"
        style={{
          background: COLORS.surface,
          border: `1px solid ${focused ? COLORS.accent : COLORS.border}`,
          boxShadow: focused ? `0 0 0 4px ${COLORS.accent}22` : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Step 2: Travel style ──────────────────────── */
function Step2({ selected, setSelected }: { selected: string | null; setSelected: (id: string) => void }) {
  return (
    <div className="flex-1 flex flex-col">
      <h1 className="font-heading text-[28px] font-bold text-white tracking-tight leading-tight">
        How do you travel?
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: COLORS.textMuted }}>
        Pick the one that fits you best.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {TRAVEL_STYLES.map(({ id, label, Icon }) => {
          const active = selected === id;
          return (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className="rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all duration-250"
              style={{
                background: active ? `${COLORS.accent}1F` : COLORS.surface,
                border: `1.5px solid ${active ? COLORS.accent : COLORS.border}`,
                padding: "18px 12px",
                minHeight: 104,
              }}
            >
              <Icon
                size={28}
                strokeWidth={1.5}
                color={active ? COLORS.accent : COLORS.textMuted}
              />
              <span
                className="text-[13px] font-medium text-center leading-tight"
                style={{ color: active ? "#FFFFFF" : COLORS.textMuted }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 3: Interests ─────────────────────────── */
function Step3({ selected, setSelected }: { selected: string[]; setSelected: (v: string[]) => void }) {
  const max = 5;
  const atMax = selected.length >= max;
  const toggle = (i: string) => {
    if (selected.includes(i)) setSelected(selected.filter((x) => x !== i));
    else if (!atMax) setSelected([...selected, i]);
  };
  return (
    <div className="flex-1 flex flex-col">
      <h1 className="font-heading text-[28px] font-bold text-white tracking-tight leading-tight">
        What do you love discovering?
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: COLORS.textMuted }}>
        Pick up to {max}. We'll use these to personalize your AI trip plans and partner offers.
      </p>
      <div className="mt-2 text-[12px]" style={{ color: COLORS.accent }}>
        {selected.length}/{max} selected
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        {INTERESTS.map((i) => {
          const active = selected.includes(i);
          const dim = atMax && !active;
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              disabled={dim}
              className="rounded-full text-[13px] font-medium transition-all duration-250"
              style={{
                padding: "10px 18px",
                background: active ? COLORS.accent : COLORS.surface,
                color: active ? "#FFFFFF" : COLORS.textMuted,
                border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
                opacity: dim ? 0.5 : 1,
              }}
            >
              {i}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 4: Avatar ────────────────────────────── */
function Step4({
  fullName, avatarPreview, onPick, onSkip,
}: {
  fullName: string;
  avatarPreview: string | null;
  onPick: (f: File | null) => void;
  onSkip: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initials = useMemo(() => {
    const parts = fullName.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase() || "R";
  }, [fullName]);

  return (
    <div className="flex-1 flex flex-col">
      <h1 className="font-heading text-[28px] font-bold text-white tracking-tight leading-tight">
        Put a face to your passport.
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: COLORS.textMuted }}>
        Optional. You can always change this later.
      </p>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-10">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative flex items-center justify-center overflow-hidden transition-transform hover:scale-105"
          style={{
            width: 120, height: 120, borderRadius: "50%",
            background: avatarPreview ? "transparent" : COLORS.accent,
            border: avatarPreview ? "none" : `2px dashed ${COLORS.accent}`,
          }}
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Your avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="font-heading text-[42px] font-bold text-white">{initials}</span>
          )}
          {!avatarPreview && (
            <div
              className="absolute bottom-1 right-1 rounded-full flex items-center justify-center"
              style={{ width: 32, height: 32, background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
            >
              <Camera size={16} strokeWidth={1.5} color={COLORS.text} />
            </div>
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 5 * 1024 * 1024) {
              toast.error("Image must be under 5MB.");
              return;
            }
            onPick(f);
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-full text-[14px] font-medium transition-colors"
          style={{
            padding: "12px 24px",
            border: `1px solid ${COLORS.border}`,
            color: COLORS.text,
            background: "transparent",
          }}
        >
          {avatarPreview ? "Change photo" : "Choose a photo"}
        </button>

        {avatarPreview && (
          <button
            type="button"
            onClick={onSkip}
            className="text-[13px] underline-offset-4 hover:underline"
            style={{ color: COLORS.textMuted }}
          >
            Remove
          </button>
        )}

        {!avatarPreview && (
          <button
            type="button"
            onClick={onSkip}
            className="text-[13px]"
            style={{ color: COLORS.textDim }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Celebration ──────────────────────────────── */
function CelebrationScreen({ fullName }: { fullName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: COLORS.bg }}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [0.6, 1.15, 1], opacity: 1 }}
        transition={{ duration: 0.8, times: [0, 0.6, 1], ease: "easeOut" }}
        className="flex flex-col items-center gap-4"
      >
        <img src={roavrPin} alt="Roavr" className="h-20 w-20" />
        <div className="font-heading text-[28px] font-bold text-white tracking-tight">Roavr</div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="mt-4 text-[15px]"
        style={{ color: COLORS.textMuted }}
      >
        {fullName ? `Your world is waiting, ${fullName.split(" ")[0]}.` : "Your world is waiting."}
      </motion.p>
    </motion.div>
  );
}
