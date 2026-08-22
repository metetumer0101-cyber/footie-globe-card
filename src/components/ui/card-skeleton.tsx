import { cn } from "@/lib/utils";

/** Shimmer placeholder matching PlayerFrontCard proportions (3:4-ish). */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "card-surface animate-pulse rounded-3xl p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="h-6 w-10 rounded-lg bg-secondary" />
        <div className="h-6 w-6 rounded-full bg-secondary" />
      </div>
      <div className="mx-auto mt-3 h-24 w-24 rounded-full bg-secondary" />
      <div className="mx-auto mt-3 h-4 w-3/4 rounded bg-secondary" />
      <div className="mx-auto mt-1.5 h-3 w-1/2 rounded bg-secondary" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 rounded-lg bg-secondary" />
        ))}
      </div>
    </div>
  );
}

/** Row placeholder matching a live fixture list item. */
export function FixtureRowSkeleton() {
  return (
    <div className="flex animate-pulse items-center justify-between rounded-xl bg-secondary/40 px-3 py-2.5">
      <div className="h-3 w-24 rounded bg-secondary" />
      <div className="h-3 w-10 rounded bg-secondary" />
      <div className="h-3 w-24 rounded bg-secondary" />
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
