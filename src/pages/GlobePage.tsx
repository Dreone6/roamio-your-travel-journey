import { Globe } from "lucide-react";

export default function GlobePage() {
  return (
    <div className="px-5 pt-12 pb-4 space-y-6">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Globe</h1>
      <div className="rounded-2xl bg-card border border-border p-6 text-center space-y-3">
        <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Your travel map will appear here.</p>
      </div>
    </div>
  );
}
