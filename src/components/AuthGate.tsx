import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import miloMascot from "@/assets/milo-mascot.png";

export default function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <img src={miloMascot} alt="Milo" className="h-14 w-14 animate-pulse" />
      </div>
    );
  }

  if (user) return <Navigate to="/home" replace />;

  return <LandingPage />;
}
