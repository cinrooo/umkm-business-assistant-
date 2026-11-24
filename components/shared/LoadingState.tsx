import { cn } from "@/lib/utils";

interface LoadingStateProps {
  className?: string;
  rows?: number;
}

export function TableSkeleton({ rows = 5, className }: LoadingStateProps) {
  return (
    <div className={cn("w-full", className)} role="status" aria-label="Memuat data...">
      {/* Header */}
      <div className="mb-4 flex gap-4">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="ml-auto h-9 w-32 animate-pulse rounded-lg bg-gray-200" />
      </div>
      {/* Rows */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex gap-6">
            <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            <div className="ml-auto h-4 w-24 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-6 border-b border-gray-100 px-4 py-4 last:border-0"
          >
            <div className="h-4 w-4 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
            <div className="ml-auto h-4 w-28 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <span className="sr-only">Memuat data...</span>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-lg border border-gray-200 bg-white p-6", className)}
      role="status"
      aria-label="Memuat..."
    >
      <div className="mb-3 h-4 w-24 animate-pulse rounded bg-gray-200" />
      <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
      <div className="mt-2 h-3 w-20 animate-pulse rounded bg-gray-100" />
      <span className="sr-only">Memuat...</span>
    </div>
  );
}

export function PageLoader() {
  return (
    <div
      className="flex h-64 items-center justify-center"
      role="status"
      aria-label="Memuat halaman..."
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
      <span className="sr-only">Memuat halaman...</span>
    </div>
  );
}
