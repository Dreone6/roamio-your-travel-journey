import { useAuth } from "@/contexts/AuthContext";
import { Compass } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || "Traveler";

  return (
    <div className="px-5 pt-12 pb-4 space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">Welcome back,</p>
        <h1 className="font-heading text-2xl font-semibold text-foreground">{displayName}</h1>
      </div>
      <div className="rounded-2xl bg-card border border-border p-6 text-center space-y-3">
        <Compass className="mx-auto h-12 w-12 text-accent" />
        <h2 className="font-heading text-lg font-medium text-foreground">Your journey starts here</h2>
        <p className="text-muted-foreground text-sm">Plan trips, check in at destinations, and collect badges along the way.</p>
      </div>
    </div>
  );
}
