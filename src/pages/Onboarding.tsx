import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft } from "lucide-react";
import roavrIcon from "@/assets/roavr-icon.jpeg";

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
  const [step, setStep] = useState(1);
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? "w-12 gradient-accent" : s < step ? "w-12 bg-primary" : "w-12 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="text-center">
          <img src={roavrIcon} alt="Roavr" className="mx-auto h-12 w-12 rounded-2xl mb-5 shadow-soft" />
          <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">
            {step === 1 && "How do you love to travel?"}
            {step === 2 && "Where is home?"}
            {step === 3 && "What excites you?"}
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
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
                className={`rounded-xl border-2 px-5 py-4 text-left text-sm font-semibold transition-all duration-200 ${
                  travelStyle === style
                    ? "border-accent bg-accent/8 text-foreground shadow-soft"
                    : "border-border/60 bg-card text-foreground hover:border-accent/40 hover:shadow-soft"
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
                className={`rounded-xl border-2 px-4 py-4 text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 ${
                  selectedInterests.includes(interest.id)
                    ? "border-accent bg-accent/8 text-foreground shadow-soft"
                    : "border-border/60 bg-card text-foreground hover:border-accent/40"
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
              className="flex-1 h-12 rounded-xl gradient-accent border-0 font-semibold"
              disabled={step === 1 && !travelStyle || step === 2 && !homeCity}
            >
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              className="flex-1 h-12 rounded-xl gradient-accent border-0 font-semibold"
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
