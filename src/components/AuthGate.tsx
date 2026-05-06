import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import roavrIcon from "@/assets/roavr-icon.jpeg";

export default function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <img src={roavrIcon} alt="Roavr" className="h-10 w-10 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (user) return <Navigate to="/home" replace />;

  return <LandingPage />;
}
