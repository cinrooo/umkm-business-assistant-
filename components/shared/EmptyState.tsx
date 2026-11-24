import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, PackageSearch, TrendingDown } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-base font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-gray-500">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

// Varian siap pakai
export function EmptyProducts({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={<PackageSearch className="h-8 w-8" aria-hidden="true" />}
      title="Belum ada produk"
      description="Tambahkan produk pertama Anda untuk mulai mengelola inventaris dan membuat transaksi penjualan."
      action={action}
    />
  );
}

export function EmptySales({ action }: { action?: ReactNode }) {
  return (
    <EmptyState
      icon={<TrendingDown className="h-8 w-8" aria-hidden="true" />}
      title="Belum ada transaksi"
      description="Belum ada transaksi penjualan yang tercatat pada periode ini."
      action={action}
    />
  );
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-8 w-8" aria-hidden="true" />}
      title="Tidak ada hasil"
      description={`Tidak ada data yang cocok dengan pencarian "${query}".`}
    />
  );
}
