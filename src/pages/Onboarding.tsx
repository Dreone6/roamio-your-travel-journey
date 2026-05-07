import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, Globe, Sparkles } from "lucide-react";

const TRAVEL_STYLES = ["Solo Explorer", "Couple Getaway", "Family Trip", "Friends Adventure", "Business Travel"];

const INTERESTS = [
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "adventure", label: "Adventure", emoji: "🧗" },
  { id: "culture", label: "Culture", emoji: "🏛️" },
  { id: "nightlife", label: "Nightlife", emoji: "🌃" },
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "luxury", label: "Luxury", emoji: "💎" },
  { id: "budget", label: "Budget", emoji: "🎒" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧‍👦" },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [travelStyle, setTravelStyle] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        travel_style: travelStyle,
        home_city: homeCity,
        interests: selectedInterests,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Something went wrong", description: error.message, variant: "destructive" });
    } else {
      navigate("/home", { replace: true });
    }
    setSaving(false);
  };

  // Step 0: Splash / welcome
  if (step === 0) {
    return (
      <div className="dark-immersive min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-emerald-500/15 to-teal-400/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-40 h-40 rounded-full bg-emerald-500/8 blur-2xl" />
        
        <div className="relative z-10 flex flex-col items-center text-center px-8 space-y-8">
          {/* Globe icon with glow */}
          <div className="relative">
            <div className="h-32 w-32 rounded-full flex items-center justify-center glow-accent-strong">
              <Globe className="h-20 w-20 text-glow animate-pulse" style={{ animationDuration: '3s' }} />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 rounded-full gradient-glow opacity-60 blur-sm" />
          </div>
          
          <div className="space-y-3">
            <h1 className="font-heading text-4xl font-bold text-white tracking-tight leading-tight">
              Your world,<br />
              <span className="text-glow italic">one trip</span> at a time.
            </h1>
            <p className="text-dark-muted text-sm max-w-xs mx-auto leading-relaxed">
              AI-powered travel planning, immersive discovery, and a personal globe that grows with every journey.
            </p>
          </div>

          <Button
            onClick={() => setStep(1)}
            className="gradient-glow border-0 text-white font-semibold text-base px-10 py-6 rounded-2xl gap-2 glow-accent"
          >
            <Sparkles className="h-5 w-5" /> Get Started
          </Button>

          <p className="text-dark-muted text-[10px] tracking-widest uppercase">Roavr</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
      <div className="w-full max-w-md space-y-8">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? "w-12 gradient-glow" : s < step ? "w-12 bg-primary" : "w-12 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="text-center space-y-2">
          <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">
            {step === 1 && "How do you love to travel?"}
            {step === 2 && "Where is home?"}
            {step === 3 && "What excites you?"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {step === 1 && "Pick your favorite travel style"}
            {step === 2 && "We'll personalize your recommendations"}
            {step === 3 && "Select all that spark your curiosity"}
          </p>
        </div>

        {/* Step 1: Travel Style */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-3">
            {TRAVEL_STYLES.map((style) => (
              <button
                key={style}
                onClick={() => setTravelStyle(style)}
                className={`rounded-2xl border-2 px-5 py-4 text-left text-sm font-semibold transition-all duration-200 ${
                  travelStyle === style
                    ? "border-emerald-500 bg-emerald-50 text-foreground shadow-soft"
                    : "border-border/60 bg-card text-foreground hover:border-emerald-300 hover:shadow-soft"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Home City */}
        {step === 2 && (
          <div className="space-y-4">
            <Input
              placeholder="e.g. New York, London, Tokyo"
              value={homeCity}
              onChange={(e) => setHomeCity(e.target.value)}
              className="text-center text-lg h-14 rounded-xl"
            />
          </div>
        )}

        {/* Step 3: Interests */}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-3">
            {INTERESTS.map((interest) => (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={`rounded-2xl border-2 px-4 py-4 text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 ${
                  selectedInterests.includes(interest.id)
                    ? "border-emerald-500 bg-emerald-50 text-foreground shadow-soft"
                    : "border-border/60 bg-card text-foreground hover:border-emerald-300"
                }`}
              >
                <span className="text-xl">{interest.emoji}</span>
                {interest.label}
              </button>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 h-12 rounded-xl">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="flex-1 h-12 rounded-xl gradient-glow border-0 font-semibold text-white"
              disabled={(step === 1 && !travelStyle) || (step === 2 && !homeCity)}
            >
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              className="flex-1 h-12 rounded-xl gradient-glow border-0 font-semibold text-white"
              disabled={selectedInterests.length === 0 || saving}
            >
              {saving ? "Saving..." : "Start Exploring"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
