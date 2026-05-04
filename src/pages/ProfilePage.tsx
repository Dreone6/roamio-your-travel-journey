import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const displayName = user?.user_metadata?.full_name || "Traveler";

  return (
    <div className="px-5 pt-12 pb-4 space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Profile</h1>
      <div className="rounded-2xl bg-card border border-border p-6 text-center space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
          <User className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-medium text-foreground">{displayName}</h2>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
        </div>
        <Button variant="outline" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
