import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Sparkles, MapPin, DollarSign, Calendar, Shield, Plane, Hotel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import MiloLoading from "@/components/states/MiloLoading";


interface Suggestion {
  destination: string;
  country: string;
  flight_cost: string;
  hotel_cost: string;
  best_time: string;
  safety: string;
  vibe_match: string;
  sample_itinerary: string[];
}

const STYLES = ["Chill", "Adventure", "Cultural", "Foodie", "Romantic", "Family"];
const CLIMATES = ["Warm", "Cool", "Tropical", "Snowy", "Any"];
const SAFETY = ["High", "Medium", "Any"];

export default function SurpriseMePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    starting_city: "", budget: "", dates: "Flexible",
    style: "Chill", safety: "High", length: "5", climate: "Warm", interests: "",
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("surprise-destinations", { body: form });
      if (error) throw error;
      setResults(data?.suggestions || []);
      setStep(2);
    } catch (e: any) {
      toast.error(e.message || "Could not generate suggestions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark-immersive min-h-dvh pb-12">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-5 pt-12 pb-5">
          <button onClick={() => navigate(-1)} className="text-dark-muted flex items-center gap-1 text-[12px] mb-3">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <p className="text-dark-muted text-[10px] font-bold tracking-[0.2em] uppercase">Anywhere</p>
          <h1 className="font-heading text-[24px] font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            Surprise me <Sparkles className="h-5 w-5 text-glow" />
          </h1>
          <p className="text-dark-muted text-[12px] mt-1">Tell Milo what you're after — get 3 dream destinations.</p>
        </div>
      </div>

      <div className="px-5 mt-2 space-y-4">
        {step === 0 && (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">Starting from</p>
              <Input placeholder="City you're flying from" value={form.starting_city} onChange={(e) => setForm({ ...form, starting_city: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">Budget (USD)</p>
                <Input type="number" placeholder="1500" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">Trip length (days)</p>
                <Input type="number" value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })} />
              </div>
            </div>
            <Button onClick={() => setStep(1)} disabled={!form.starting_city} className="w-full gradient-glow text-white border-0 rounded-xl glow-accent">
              Continue
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {[
              { label: "Travel style", key: "style", opts: STYLES },
              { label: "Climate", key: "climate", opts: CLIMATES },
              { label: "Safety preference", key: "safety", opts: SAFETY },
            ].map((row) => (
              <div key={row.key}>
                <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">{row.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {row.opts.map((o) => (
                    <button
                      key={o}
                      onClick={() => setForm({ ...form, [row.key]: o } as any)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                        (form as any)[row.key] === o ? "gradient-glow text-white" : "dark-card text-dark-muted"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">Interests</p>
              <Input placeholder="e.g. food markets, hiking, museums" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} />
            </div>
            {loading && <MiloLoading className="pt-2" context="your kind of place" />}
            <Button onClick={generate} disabled={loading} className="w-full gradient-glow text-white border-0 rounded-xl glow-accent">
              {loading ? "Milo is on the trail…" : <><Sparkles className="h-4 w-4 mr-2" /> Get my destinations</>}
            </Button>

          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {results.length === 0 && <p className="text-dark-muted text-center text-[12px]">No suggestions returned. Try again.</p>}
            {results.map((r, i) => (
              <div key={i} className="dark-card rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-heading text-[16px] font-bold text-white">{r.destination}</p>
                    <p className="text-[11px] text-dark-muted flex items-center gap-1"><MapPin className="h-3 w-3" />{r.country}</p>
                  </div>
                  <span className="text-[10px] font-bold text-glow bg-emerald-500/10 px-2 py-0.5 rounded-full">{r.vibe_match}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5 text-dark-muted"><Plane className="h-3 w-3" />Flight {r.flight_cost}</div>
                  <div className="flex items-center gap-1.5 text-dark-muted"><Hotel className="h-3 w-3" />Hotel {r.hotel_cost}</div>
                  <div className="flex items-center gap-1.5 text-dark-muted"><Calendar className="h-3 w-3" />{r.best_time}</div>
                  <div className="flex items-center gap-1.5 text-dark-muted"><Shield className="h-3 w-3" />{r.safety}</div>
                </div>
                {r.sample_itinerary?.length > 0 && (
                  <div className="border-t border-white/5 pt-2 space-y-1">
                    <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">Sample itinerary</p>
                    {r.sample_itinerary.map((d, j) => (
                      <p key={j} className="text-[11px] text-white/70">• {d}</p>
                    ))}
                  </div>
                )}
                <Button onClick={() => navigate("/trips")} className="w-full gradient-glow text-white border-0 rounded-xl text-[11px]">
                  Save & generate trip
                </Button>
              </div>
            ))}
            <Button onClick={() => setStep(0)} variant="ghost" className="w-full text-dark-muted">Try again</Button>
          </div>
        )}
      </div>
    </div>
  );
}
