import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Compass, ArrowRight, ArrowLeft } from "lucide-react";

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
              className={`h-2 rounded-full transition-all ${
                s === step ? "w-10 bg-accent" : s < step ? "w-10 bg-primary" : "w-10 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="text-center">
          <Compass className="mx-auto h-8 w-8 text-accent mb-4" />
          <h2 className="font-heading text-2xl font-semibold text-foreground">
            {step === 1 && "How do you love to travel?"}
            {step === 2 && "Where is home?"}
            {step === 3 && "What excites you?"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {step === 1 && "Pick your favorite travel style"}
            {step === 2 && "We will personalize your recommendations"}
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
                className={`rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                  travelStyle === style
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border bg-card text-foreground hover:border-accent/50"
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
              className="text-center text-lg"
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
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedInterests.includes(interest.id)
                    ? "border-accent bg-accent/10 text-foreground"
                    : "border-border bg-card text-foreground hover:border-accent/50"
                }`}
              >
                <span className="text-lg">{interest.emoji}</span>
                {interest.label}
              </button>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="flex-1"
              disabled={step === 1 && !travelStyle || step === 2 && !homeCity}
            >
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              className="flex-1"
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
