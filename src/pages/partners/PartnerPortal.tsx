import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PartnerThemeWrapper, PARTNER } from "@/components/partners/PartnerThemeWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function PartnerPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already signed in and is a partner, jump straight to dashboard
  useEffect(() => {
    if (!user) return;
    supabase
      .from("partners")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) navigate("/partners/dashboard", { replace: true });
      });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      toast.error(error?.message ?? "Sign in failed");
      setSubmitting(false);
      return;
    }
    const { data: partner } = await supabase
      .from("partners")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!partner) {
      await supabase.auth.signOut();
      toast.error("This account is not a partner account. Apply below.");
      setSubmitting(false);
      return;
    }
    toast.success("Welcome back");
    navigate("/partners/dashboard");
  };

  return (
    <PartnerThemeWrapper>
      <div className="min-h-screen flex flex-col">
        <header className="px-6 py-5 flex items-center justify-between">
          <Link to="/" className="font-fraunces text-[20px]" style={{ color: PARTNER.ink }}>
            Roavr
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-[420px]">
            <h1
              className="font-fraunces text-[28px] leading-[1.1]"
              style={{ color: PARTNER.ink }}
            >
              Partner portal
            </h1>
            <p
              className="font-dm text-[14px] mt-3 mb-8"
              style={{ color: PARTNER.ink2 }}
            >
              Manage your Roavr listing, track performance, and grow your business.
            </p>

            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="font-dm text-[12px]" style={{ color: PARTNER.ink2 }}>
                  Email
                </label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 mt-1 rounded-lg font-dm bg-white"
                  style={{ borderColor: PARTNER.border, color: PARTNER.ink }}
                />
              </div>
              <div>
                <label className="font-dm text-[12px]" style={{ color: PARTNER.ink2 }}>
                  Password
                </label>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 mt-1 rounded-lg font-dm bg-white"
                  style={{ borderColor: PARTNER.border, color: PARTNER.ink }}
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-lg font-dm text-[14px] font-medium"
                style={{ background: PARTNER.navy, color: "#FFF" }}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div
              className="mt-10 pt-6 border-t flex flex-col items-center gap-3"
              style={{ borderColor: PARTNER.border }}
            >
              <p className="font-dm text-[13px]" style={{ color: PARTNER.ink2 }}>
                Not a partner yet?
              </p>
              <Link to="/#partner-apply">
                <Button
                  className="h-10 px-5 rounded-full font-dm text-[13px] font-medium"
                  style={{ background: PARTNER.amber, color: "#FFF" }}
                >
                  Apply for early access
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PartnerThemeWrapper>
  );
}
