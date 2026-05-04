export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden animate-pulse ${className}`}>
      <div className="h-28 bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`h-4 bg-muted rounded animate-pulse ${className}`} />;
}

export function SkeletonStatGrid() {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg bg-card border border-border p-2 text-center animate-pulse">
          <div className="h-6 w-6 bg-muted rounded-full mx-auto mb-1" />
          <div className="h-4 bg-muted rounded w-8 mx-auto mb-1" />
          <div className="h-2 bg-muted rounded w-12 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTripCard() {
  return (
    <div className="w-full rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded w-40" />
          <div className="h-3 bg-muted rounded w-56" />
        </div>
        <div className="h-5 w-14 bg-muted rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonProfileHero() {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 text-center animate-pulse">
      <div className="mx-auto h-20 w-20 rounded-full bg-muted mb-3" />
      <div className="h-5 bg-muted rounded w-32 mx-auto mb-2" />
      <div className="h-3 bg-muted rounded w-24 mx-auto mb-1" />
      <div className="h-2 bg-muted rounded w-20 mx-auto" />
    </div>
  );
}
