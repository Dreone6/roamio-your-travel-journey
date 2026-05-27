import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

export default function PartnerPortal() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-heading text-3xl font-bold">Roavr for Partners</h1>
        <p className="text-muted-foreground">
          Reach travelers exactly when they're nearby. Publish offers, track claims, and grow foot traffic.
        </p>
        <div className="flex flex-col gap-3">
          <Button asChild className="h-12 rounded-xl">
            <Link to="/auth">Sign in to partner account</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-xl">
            <Link to="/auth">Become a partner</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
