import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Compass } from "lucide-react";
import LandingPage from "@/pages/LandingPage";

export default function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Compass className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/home" replace />;

  return <LandingPage />;
}
