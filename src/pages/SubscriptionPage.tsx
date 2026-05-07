import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Crown, Zap, Sparkles, Star, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Subscription {
  tier: string;
  status: string;
  current_period_end: string | null;
}

interface UsageStats {
  tripsUsed: number;
  checkInsThisMonth: number;
}

const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "",
    icon: Sparkles,
    features: ["3 trips planned", "Basic checklist", "Globe view", "5 check-ins / month", "See offers"],
    gradient: "from-secondary to-muted",
  },
  {
    id: "plus",
    name: "Roavr Plus",
    price: "$9.99",
    period: "/mo",
    icon: Zap,
    features: ["Unlimited trips", "Unlimited check-ins", "Premium AI itineraries", "Exclusive offers", "Badge customization", "Priority support"],
    gradient: "from-accent/10 to-accent/5",
    popular: true,
  },
  {
    id: "pro",
    name: "Roavr Pro",
    price: "$19.99",
    period: "/mo",
    icon: Crown,
    features: ["Everything in Plus", "Group trip planning", "Offline maps", "Advanced analytics", "Early access features"],
    gradient: "from-primary/10 to-primary/5",
  },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageStats>({ tripsUsed: 0, checkInsThisMonth: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const { data: sub } = await supabase.from("subscriptions").select("*").eq("user_id", user!.id).single();
    if (sub) {
      setSubscription(sub as Subscription);
    } else {
      await supabase.from("subscriptions").insert({ user_id: user!.id, tier: "free" as any, status: "active" });
      setSubscription({ tier: "free", status: "active", current_period_end: null });
    }
    const { count: tripCount } = await supabase.from("trips").select("id", { count: "exact", head: true }).eq("user_id", user!.id);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count: checkInCount } = await supabase.from("check_ins").select("id", { count: "exact", head: true }).eq("user_id", user!.id).gte("timestamp", startOfMonth.toISOString());
    setUsage({ tripsUsed: tripCount || 0, checkInsThisMonth: checkInCount || 0 });
    setLoading(false);
  };

  const handleUpgrade = (tierId: string) => {
    toast({
      title: "Coming soon!",
      description: `Upgrade to ${tierId === "plus" ? "Roavr Plus" : "Roavr Pro"} will be available when payment processing is configured.`,
    });
  };

  const currentTier = subscription?.tier || "free";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Dark Header */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-5 pt-12 pb-6">
          <button onClick={() => navigate("/profile")} className="text-dark-muted mb-3 flex items-center gap-1 text-[13px]">
            <ArrowLeft className="h-4 w-4" /> Profile
          </button>
          <h1 className="font-heading text-[22px] font-bold text-white tracking-tight">Choose Your Plan</h1>
          <p className="text-dark-muted text-[13px] mt-1">Unlock the full Roavr experience</p>

          {/* Current Plan Badge */}
          <div className="mt-4 rounded-xl dark-card p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg gradient-glow flex items-center justify-center glow-accent">
              <Star className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white text-[13px] font-semibold capitalize">{currentTier === "free" ? "Free Plan" : `Roavr ${currentTier === "plus" ? "Plus" : "Pro"}`}</p>
              {subscription?.current_period_end && (
                <p className="text-dark-muted text-[11px]">Renews {new Date(subscription.current_period_end).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Usage */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Trips planned", value: usage.tripsUsed, max: currentTier === "free" ? 3 : null },
            { label: "Check-ins", value: usage.checkInsThisMonth, max: currentTier === "free" ? 5 : null },
          ].map((u) => (
            <div key={u.label} className="rounded-xl border border-border/40 bg-card p-3.5 shadow-soft">
              <p className="font-heading text-lg font-bold text-foreground leading-none">{u.value}{u.max ? `/${u.max}` : ""}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{u.label}</p>
              {u.max && (
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full gradient-accent transition-all" style={{ width: `${Math.min(100, (u.value / u.max) * 100)}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tier Cards */}
        {TIERS.map((tier) => {
          const isCurrent = currentTier === tier.id;
          const Icon = tier.icon;
          return (
            <div
              key={tier.id}
              className={`rounded-2xl border-2 bg-card p-4 space-y-3.5 relative shadow-soft transition-all ${
                isCurrent ? "border-accent bg-accent/3" : tier.popular ? "border-accent/40" : "border-border/40"
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-2.5 left-4 text-[9px] font-bold uppercase tracking-wider gradient-accent text-white px-2.5 py-0.5 rounded-full">Most Popular</span>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isCurrent ? "gradient-accent" : "bg-accent/8"}`}>
                    <Icon className={`h-4 w-4 ${isCurrent ? "text-white" : "text-accent"}`} />
                  </div>
                  <h3 className="font-heading font-bold text-foreground text-[15px]">{tier.name}</h3>
                </div>
                <div className="text-right">
                  <span className="font-heading text-lg font-bold text-foreground">{tier.price}</span>
                  <span className="text-[11px] text-muted-foreground">{tier.period}</span>
                </div>
              </div>
              <ul className="space-y-1.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[12px] text-foreground">
                    <div className="h-4 w-4 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 text-accent" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="text-center text-[11px] font-bold text-accent uppercase tracking-wider">Current Plan</div>
              ) : tier.id !== "free" ? (
                <Button onClick={() => handleUpgrade(tier.id)} className="w-full h-10 rounded-xl gradient-accent border-0 font-bold text-[13px]" size="sm">
                  Upgrade to {tier.name} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
