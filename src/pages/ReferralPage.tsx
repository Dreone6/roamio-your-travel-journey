import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Gift, Users, Copy, Check, Share2 } from "lucide-react";

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-5 pt-6 pb-4 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/profile")} className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="font-heading text-xl font-bold text-foreground">Refer Friends</h1>
        </div>

        {/* Hero */}
        <div className="rounded-2xl gradient-navy p-7 text-center space-y-3 shadow-elevated">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-heading text-xl font-bold text-white">Get 1 Month Free</h2>
          <p className="text-sm text-white/70">Refer 3 friends who sign up and you'll unlock 1 month of Roavr Plus for free.</p>
        </div>

        {/* Referral Code */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Your Referral Code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl bg-secondary px-4 py-3.5 font-mono text-lg font-bold text-foreground text-center tracking-[0.3em]">
              {referralCode}
            </div>
            <Button variant="outline" size="icon" onClick={copyCode} className="h-12 w-12 rounded-xl">
              {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button onClick={shareCode} className="w-full h-11 rounded-xl gradient-accent border-0 font-semibold gap-2">
            <Share2 className="h-4 w-4" /> Share with Friends
          </Button>
        </div>

        {/* Progress */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" /> Referral Progress
            </p>
            <span className="text-xs font-semibold text-muted-foreground">{progress}/3</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full gradient-accent transition-all duration-500"
              style={{ width: `${(progress / 3) * 100}%` }}
            />
          </div>
          {rewardUnlocked ? (
            <p className="text-xs text-accent font-semibold text-center">🎉 Reward unlocked! Your free month has been applied.</p>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              {3 - progress} more referral{3 - progress !== 1 ? "s" : ""} to unlock your reward
            </p>
          )}
        </div>

        {/* Referral List */}
        {referrals.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">Your Referrals</p>
            <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/50 overflow-hidden shadow-soft">
              {referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3.5">
                  <p className="text-sm text-foreground font-medium">{r.referred_email || "Invited"}</p>
                  <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                    r.status === "completed" ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"
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
