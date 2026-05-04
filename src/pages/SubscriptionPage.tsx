import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Crown, Zap, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
    features: ["3 trips planned", "Basic checklist", "Globe view", "5 check ins per month", "See offers"],
    color: "border-border",
  },
  {
    id: "plus",
    name: "Roamio Plus",
    price: "$9.99",
    period: "/month",
    icon: Zap,
    features: ["Unlimited trips", "Unlimited check ins", "Premium AI itineraries", "Exclusive offers", "Badge customization", "Priority support"],
    color: "border-accent",
    popular: true,
  },
  {
    id: "pro",
    name: "Roamio Pro",
    price: "$19.99",
    period: "/month",
    icon: Crown,
    features: ["Everything in Plus", "Group trip planning", "Offline maps", "Advanced analytics", "Early access to new features"],
    color: "border-primary",
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
    // Load subscription
    const { data: sub } = await supabase.from("subscriptions").select("*").eq("user_id", user!.id).single();
    if (sub) {
      setSubscription(sub as Subscription);
    } else {
      // Create free tier if not exists
      await supabase.from("subscriptions").insert({ user_id: user!.id, tier: "free" as any, status: "active" });
      setSubscription({ tier: "free", status: "active", current_period_end: null });
    }

    // Load usage
    const { count: tripCount } = await supabase.from("trips").select("id", { count: "exact", head: true }).eq("user_id", user!.id);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count: checkInCount } = await supabase
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .gte("timestamp", startOfMonth.toISOString());

    setUsage({ tripsUsed: tripCount || 0, checkInsThisMonth: checkInCount || 0 });
    setLoading(false);
  };

  const handleUpgrade = (tierId: string) => {
    toast({
      title: "Coming soon!",
      description: `Upgrade to ${tierId === "plus" ? "Roamio Plus" : "Roamio Pro"} will be available when payment processing is configured.`,
    });
  };

  const currentTier = subscription?.tier || "free";

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Sparkles className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-4 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/profile")} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-heading text-xl font-semibold text-foreground">Subscription</h1>
        </div>

        {/* Current Plan */}
        <div className="rounded-xl border-2 border-accent bg-accent/5 p-4 space-y-2">
          <p className="text-xs font-medium text-accent uppercase tracking-wide">Current Plan</p>
          <h2 className="font-heading text-xl font-semibold text-foreground capitalize">{currentTier === "free" ? "Free" : `Roamio ${currentTier === "plus" ? "Plus" : "Pro"}`}</h2>
          {subscription?.current_period_end && (
            <p className="text-xs text-muted-foreground">Renews {new Date(subscription.current_period_end).toLocaleDateString()}</p>
          )}
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="font-heading text-lg font-semibold text-foreground">{usage.tripsUsed}{currentTier === "free" ? "/3" : ""}</p>
            <p className="text-xs text-muted-foreground">Trips planned</p>
            {currentTier === "free" && (
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (usage.tripsUsed / 3) * 100)}%` }} />
              </div>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="font-heading text-lg font-semibold text-foreground">{usage.checkInsThisMonth}{currentTier === "free" ? "/5" : ""}</p>
            <p className="text-xs text-muted-foreground">Check ins this month</p>
            {currentTier === "free" && (
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (usage.checkInsThisMonth / 5) * 100)}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Tier Cards */}
        <div className="space-y-3">
          {TIERS.map((tier) => {
            const isCurrent = currentTier === tier.id;
            const Icon = tier.icon;
            return (
              <div key={tier.id} className={`rounded-xl border-2 ${isCurrent ? "border-accent bg-accent/5" : tier.color} bg-card p-4 space-y-3 relative`}>
                {tier.popular && (
                  <span className="absolute -top-2.5 left-4 text-[10px] font-bold bg-accent text-accent-foreground px-2.5 py-0.5 rounded-full">Most Popular</span>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-accent" />
                    <h3 className="font-heading font-semibold text-foreground">{tier.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="font-heading text-lg font-bold text-foreground">{tier.price}</span>
                    <span className="text-xs text-muted-foreground">{tier.period}</span>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                      <Check className="h-3 w-3 text-accent shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="text-center text-xs font-medium text-accent">Current Plan</div>
                ) : tier.id !== "free" ? (
                  <Button onClick={() => handleUpgrade(tier.id)} className="w-full" size="sm">
                    Upgrade to {tier.name}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
