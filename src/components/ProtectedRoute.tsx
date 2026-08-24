import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { saveReturnTo } from "@/lib/auth/returnTo";

const cacheKey = (id: string) => `roavr_onboarded_${id}`;

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Initialize synchronously from sessionStorage so we don't flash a spinner
  // every time a protected route remounts.
  const cached = user ? sessionStorage.getItem(cacheKey(user.id)) : null;
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(
    cached === "true" ? true : cached === "false" ? false : null
  );
  const [checkingOnboarding, setCheckingOnboarding] = useState(
    !!user && cached === null
  );

  useEffect(() => {
    if (!user) {
      setCheckingOnboarding(false);
      return;
    }
    const c = sessionStorage.getItem(cacheKey(user.id));
    if (c !== null) {
      setOnboardingCompleted(c === "true");
      setCheckingOnboarding(false);
      return;
    }
    setCheckingOnboarding(true);
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const done = !!data?.onboarding_completed;
        sessionStorage.setItem(cacheKey(user.id), done ? "true" : "false");
        setOnboardingCompleted(done);
        setCheckingOnboarding(false);
      });
  }, [user]);

  if (loading || (user && checkingOnboarding && onboardingCompleted === null)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Compass className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Preserve where they were headed so sign-in returns them there.
    saveReturnTo(`${location.pathname}${location.search}${location.hash}`);
    return <Navigate to="/" replace />;
  }
  if (onboardingCompleted === false) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
