import { MapPin } from "lucide-react";

export default function CheckInPage() {
  return (
    <div className="px-5 pt-12 pb-4 space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Check In</h1>
      <div className="rounded-2xl bg-card border border-border p-6 text-center space-y-3">
        <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Check in at destinations you visit.</p>
      </div>
    </div>
  );
}
