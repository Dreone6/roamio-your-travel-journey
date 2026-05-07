import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Check, Crown, Zap, Sparkles, Star, ArrowRight, X,
  Globe, Shield, Camera, Users, MessageCircle, Map, Trophy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PLANS, FREE_LIMITS } from "@/services/subscriptions";

interface Subscription {
  tier: string;
  status: string;
  current_period_end: string | null;
}

interface UsageStats {
  tripsUsed: number;
  checkInsThisMonth: number;
  aiPlansThisMonth: number;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageStats>({ tripsUsed: 0, checkInsThisMonth: 0, aiPlansThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");

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
    setUsage({ tripsUsed: tripCount || 0, checkInsThisMonth: checkInCount || 0, aiPlansThisMonth: 1 });
    setLoading(false);
  };

  const handleUpgrade = (tierId: string) => {
    toast({
      title: "Coming soon!",
      description: `Upgrade to ${tierId === "plus" ? "Roavr Plus" : "Roavr Pro"} will be available when payment processing is configured.`,
    });
  };

  const currentTier = subscription?.tier || "free";

  const TIER_CARDS = [
    {
      id: "free",
      name: "Free",
      tagline: "Start exploring",
      priceMonthly: 0,
      priceYearly: 0,
      icon: Sparkles,
      iconColor: "text-white/60",
      iconBg: "bg-white/5",
      features: PLANS.free.features,
      cardBg: "dark-card",
      borderClass: "border-white/[0.06]",
    },
    {
      id: "plus",
      name: "Roavr Plus",
      tagline: "For serious travelers",
      priceMonthly: PLANS.plus.priceMonthly,
      priceYearly: PLANS.plus.priceYearly,
      icon: Zap,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/15",
      features: PLANS.plus.features,
      popular: true,
      cardBg: "bg-gradient-to-b from-emerald-500/[0.06] to-transparent dark-card",
      borderClass: "border-emerald-500/30",
      savings: Math.round((1 - PLANS.plus.priceYearly / (PLANS.plus.priceMonthly * 12)) * 100),
    },
    {
      id: "pro",
      name: "Roavr Pro",
      tagline: "The ultimate travel companion",
      priceMonthly: PLANS.pro.priceMonthly,
      priceYearly: PLANS.pro.priceYearly,
      icon: Crown,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/15",
      features: PLANS.pro.features,
      cardBg: "dark-card",
      borderClass: "border-white/[0.06]",
      savings: Math.round((1 - PLANS.pro.priceYearly / (PLANS.pro.priceMonthly * 12)) * 100),
    },
  ];

  if (loading) {
    return (
      <div className="dark-immersive min-h-screen flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-emerald-500/40 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="dark-immersive min-h-screen pb-10">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-emerald-500/6 blur-3xl" />

        <div className="relative px-5 pt-14 pb-6 space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl dark-card-elevated flex items-center justify-center">
              <ArrowLeft className="h-4 w-4 text-white" />
            </button>
            <div className="flex-1">
              <p className="text-dark-muted text-[10px] font-bold tracking-[0.2em] uppercase">Subscription</p>
              <h1 className="font-heading text-[22px] font-bold text-white tracking-tight mt-0.5">Choose Your Plan</h1>
            </div>
          </div>

          <p className="text-[12px] text-dark-muted leading-relaxed max-w-[300px]">
            Unlock the full Roavr experience. Every plan starts with a free trial — no commitment required.
          </p>

          {/* Current plan badge */}
          <div className="dark-card rounded-xl p-3.5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg gradient-glow flex items-center justify-center glow-accent">
              <Star className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white text-[13px] font-semibold capitalize">
                {currentTier === "free" ? "Free Plan" : `Roavr ${currentTier === "plus" ? "Plus" : "Pro"}`}
              </p>
              {subscription?.current_period_end ? (
                <p className="text-dark-muted text-[10px]">Renews {new Date(subscription.current_period_end).toLocaleDateString()}</p>
              ) : (
                <p className="text-dark-muted text-[10px]">Upgrade anytime</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* Usage meters (free only) */}
        {currentTier === "free" && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-dark-muted uppercase tracking-wider">Your Usage</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Active Trips", value: usage.tripsUsed, max: FREE_LIMITS.maxActiveTrips, emoji: "✈️" },
                { label: "AI Plans", value: usage.aiPlansThisMonth, max: FREE_LIMITS.aiPlansPerMonth, emoji: "🧠" },
                { label: "Check-ins", value: usage.checkInsThisMonth, max: FREE_LIMITS.checkInsPerMonth, emoji: "📍" },
              ].map((u) => (
                <div key={u.label} className="dark-card rounded-xl p-3 text-center">
                  <p className="text-sm mb-1">{u.emoji}</p>
                  <p className="font-heading text-sm font-bold text-white leading-none">
                    {u.value}<span className="text-dark-muted">/{u.max}</span>
                  </p>
                  <p className="text-[9px] text-dark-muted mt-1">{u.label}</p>
                  <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        u.value >= u.max ? "bg-rose-400" : "gradient-glow"
                      }`}
                      style={{ width: `${Math.min(100, (u.value / u.max) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-1 rounded-xl dark-card p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={`flex-1 rounded-lg py-2 text-[11px] font-bold transition-all text-center ${
              billing === "monthly" ? "gradient-glow text-white" : "text-dark-muted"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`flex-1 rounded-lg py-2 text-[11px] font-bold transition-all text-center relative ${
              billing === "yearly" ? "gradient-glow text-white" : "text-dark-muted"
            }`}
          >
            Yearly
            {billing !== "yearly" && (
              <span className="absolute -top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Save 37%
              </span>
            )}
          </button>
        </div>

        {/* Plan Cards */}
        <div className="space-y-3">
          {TIER_CARDS.map((tier) => {
            const isCurrent = currentTier === tier.id;
            const Icon = tier.icon;
            const price = billing === "yearly" && tier.priceYearly > 0
              ? (tier.priceYearly / 12).toFixed(2)
              : tier.priceMonthly.toFixed(2);
            const isUpgrade = !isCurrent && tier.id !== "free";

            return (
              <div
                key={tier.id}
                className={`rounded-2xl border ${tier.borderClass} ${tier.cardBg} p-5 space-y-4 relative transition-all ${
                  isCurrent ? "ring-1 ring-emerald-500/30" : ""
                }`}
              >
                {/* Popular badge */}
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[9px] font-bold uppercase tracking-wider gradient-glow text-white px-4 py-1 rounded-full glow-accent whitespace-nowrap">
                      ✨ Most Popular
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-xl ${tier.iconBg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${tier.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-white text-[16px]">{tier.name}</h3>
                      <p className="text-[10px] text-dark-muted mt-0.5">{tier.tagline}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {tier.priceMonthly === 0 ? (
                      <p className="font-heading text-2xl font-bold text-white">$0</p>
                    ) : (
                      <>
                        <p className="font-heading text-2xl font-bold text-white">${price}</p>
                        <p className="text-[10px] text-dark-muted">/month</p>
                        {billing === "yearly" && tier.savings && (
                          <p className="text-[9px] font-bold text-emerald-400 mt-0.5">Save {tier.savings}%</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[11px] text-white/80">
                      <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        tier.popular ? "bg-emerald-500/15" : "bg-white/[0.06]"
                      }`}>
                        <Check className={`h-2.5 w-2.5 ${tier.popular ? "text-emerald-400" : "text-white/40"}`} />
                      </div>
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="text-center py-2">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <Check className="h-3.5 w-3.5" /> Current Plan
                    </span>
                  </div>
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(tier.id)}
                    className={`w-full rounded-xl py-3 text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${
                      tier.popular
                        ? "gradient-glow text-white glow-accent"
                        : "dark-card-elevated text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    Upgrade to {tier.name} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <div className="space-y-3 pt-2">
          <h3 className="text-[13px] font-bold text-white text-center">Compare Plans</h3>

          {[
            { feature: "Active Trips", free: "1", plus: "Unlimited", pro: "Unlimited", icon: "✈️" },
            { feature: "AI Trip Plans", free: "3/mo", plus: "Unlimited", pro: "Priority", icon: "🧠" },
            { feature: "Check-ins", free: "10/mo", plus: "Unlimited", pro: "Unlimited", icon: "📍" },
            { feature: "Stories", free: "3/day", plus: "Unlimited", pro: "Unlimited", icon: "📸" },
            { feature: "Globe", free: "Basic", plus: "Advanced", pro: "Full Custom", icon: "🌍" },
            { feature: "Safety Tools", free: "Basic", plus: "Enhanced", pro: "Advanced", icon: "🛡️" },
            { feature: "Messaging", free: "Standard", plus: "Standard", pro: "Private E2E", icon: "💬" },
            { feature: "Group Planning", free: "—", plus: "—", pro: "✓", icon: "👥" },
            { feature: "Creator Tools", free: "—", plus: "—", pro: "✓", icon: "⭐" },
            { feature: "Offline Access", free: "—", plus: "✓", pro: "✓", icon: "📱" },
            { feature: "Local Offers", free: "View only", plus: "Exclusive", pro: "Exclusive+", icon: "🎁" },
          ].map((row, i) => (
            <div
              key={row.feature}
              className={`dark-card rounded-xl p-3 grid grid-cols-4 gap-2 items-center ${
                i % 2 === 0 ? "" : "bg-white/[0.01]"
              }`}
            >
              <div className="flex items-center gap-1.5 col-span-1">
                <span className="text-xs">{row.icon}</span>
                <span className="text-[10px] font-semibold text-white truncate">{row.feature}</span>
              </div>
              <span className="text-[10px] text-dark-muted text-center">{row.free}</span>
              <span className="text-[10px] text-emerald-400 text-center font-semibold">{row.plus}</span>
              <span className="text-[10px] text-amber-400 text-center font-semibold">{row.pro}</span>
            </div>
          ))}

          {/* Column headers */}
          <div className="grid grid-cols-4 gap-2 px-3 -mt-1 order-first">
            <div />
            <p className="text-[9px] text-dark-muted text-center uppercase tracking-wider">Free</p>
            <p className="text-[9px] text-emerald-400 text-center uppercase tracking-wider font-bold">Plus</p>
            <p className="text-[9px] text-amber-400 text-center uppercase tracking-wider font-bold">Pro</p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="dark-card rounded-2xl p-4 space-y-3 mt-2">
          <div className="flex items-center justify-center gap-6">
            {[
              { icon: Shield, label: "Secure" },
              { icon: X, label: "No lock-in" },
              { icon: Star, label: "Cancel anytime" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="h-3 w-3 text-dark-muted" />
                <span className="text-[10px] text-dark-muted font-medium">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-dark-muted text-center leading-relaxed">
            All plans include a 7-day free trial. Upgrade, downgrade, or cancel at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
