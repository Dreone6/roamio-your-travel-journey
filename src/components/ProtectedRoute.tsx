import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Compass } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    if (!user) {
      setCheckingOnboarding(false);
      return;
    }

    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setOnboardingCompleted(data?.onboarding_completed ?? false);
        setCheckingOnboarding(false);
      });
  }, [user]);

  if (loading || checkingOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Compass className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!onboardingCompleted) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
