import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Compass } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function PartnerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isPartner, setIsPartner] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsPartner(false);
      return;
    }
    supabase
      .from("partners")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsPartner(!!data));
  }, [user]);

  if (loading || (user && isPartner === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Compass className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isPartner) return <Navigate to="/partners" replace />;

  return <>{children}</>;
}
