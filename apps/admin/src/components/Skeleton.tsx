interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <span aria-hidden="true" className={`block animate-pulse bg-slate-200 ${className}`} />;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-slate-100 px-3 py-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3 rounded-full" />
            <Skeleton className="h-2.5 w-1/2 rounded-full" />
          </div>
          <Skeleton className="h-2.5 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-5 p-4 sm:p-8" aria-label="Loading details">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full max-w-xs space-y-2">
          <Skeleton className="h-2.5 w-20 rounded-full" />
          <Skeleton className="h-6 w-3/4 rounded-md" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-2.5 w-20 rounded-full" />
            <Skeleton className="h-4 w-4/5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
