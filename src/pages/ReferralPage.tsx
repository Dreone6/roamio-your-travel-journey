import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Gift, Users, Copy, Check, Share2, ArrowRight, Sparkles } from "lucide-react";

export default function ReferralPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [profileRes, referralsRes] = await Promise.all([
      supabase.from("profiles").select("referral_code").eq("id", user!.id).single(),
      supabase.from("referrals").select("*").eq("referrer_id", user!.id).order("created_at", { ascending: false }),
    ]);
    setReferralCode(profileRes.data?.referral_code || "");
    setReferrals(referralsRes.data || []);
    setLoading(false);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = async () => {
    const text = `Join me on Roavr — the AI travel companion! Use my code ${referralCode} when you sign up. https://roavr.app`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Share link copied!");
    }
  };

  const completedCount = referrals.filter((r) => r.status === "completed").length;
  const progress = Math.min(3, completedCount);
  const rewardUnlocked = progress >= 3;

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-8">
      {/* Dark Header */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute top-10 right-0 w-48 h-48 rounded-full bg-accent/5 blur-3xl" />

        <div className="relative px-5 pt-12 pb-6">
          <button onClick={() => navigate("/profile")} className="text-dark-muted mb-3 flex items-center gap-1 text-[13px]">
            <ArrowLeft className="h-4 w-4" /> Profile
          </button>

          <div className="text-center space-y-3 pt-2">
            <div className="mx-auto h-14 w-14 rounded-2xl gradient-accent flex items-center justify-center glow-coral">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <h1 className="font-heading text-[22px] font-bold text-white tracking-tight">Get 1 Month Free</h1>
            <p className="text-dark-muted text-[13px] max-w-[260px] mx-auto leading-relaxed">
              Refer 3 friends who sign up and unlock 1 month of Roavr Plus.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Referral Code */}
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3 shadow-soft">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Your Referral Code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl bg-secondary px-4 py-3 font-mono text-lg font-bold text-foreground text-center tracking-[0.25em]">
              {referralCode}
            </div>
            <button onClick={copyCode} className="h-11 w-11 rounded-xl border border-border/40 bg-card flex items-center justify-center hover:shadow-soft transition-all">
              {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
          <Button onClick={shareCode} className="w-full h-10 rounded-xl gradient-accent border-0 font-bold text-[13px] gap-2">
            <Share2 className="h-4 w-4" /> Share with Friends
          </Button>
        </div>

        {/* Progress */}
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" /> Progress
            </p>
            <span className="text-[11px] font-bold text-muted-foreground">{progress}/3</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`flex-1 h-2 rounded-full transition-all ${i < progress ? "gradient-accent" : "bg-muted"}`} />
            ))}
          </div>
          {rewardUnlocked ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <p className="text-[12px] text-emerald-700 font-semibold">Reward unlocked! Free month applied.</p>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground text-center">
              {3 - progress} more referral{3 - progress !== 1 ? "s" : ""} to unlock your reward
            </p>
          )}
        </div>

        {/* Referral List */}
        {referrals.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-1">Your Referrals</p>
            <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30 overflow-hidden shadow-soft">
              {referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-3.5 py-3">
                  <p className="text-[13px] text-foreground font-medium">{r.referred_email || "Invited"}</p>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    r.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"
                  }`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
