import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAuditLogs } from "@/lib/actions/settings";
import { PageHeader } from "@/components/shared/PageHeader";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { formatDate } from "@/lib/utils/format";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

interface AuditLogPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AuditLogPage({ searchParams }: AuditLogPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const { items, total, totalPages } = await getAuditLogs({
    page,
    pageSize: 30,
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Audit Log Aktivitas"
        description="Rekam jejak setiap tindakan sensitif di dalam organisasi untuk keamanan & akuntabilitas"
      />

      <SettingsNav />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-400">
            <ShieldAlert className="h-8 w-8" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Belum ada riwayat audit log</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Aktivitas perubahan inventaris, transaksi, dan peran tim akan tercatat secara otomatis di sini.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm" aria-label="Daftar audit log">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Waktu (WIB)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Aksi
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Entitas (Resource)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Detail / Metadata
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(log.createdAt, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs">
                      <span className="rounded bg-gray-100 px-2 py-0.5 font-bold text-gray-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-700">
                      {log.resourceType}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500 font-mono max-w-md truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
              <p className="text-xs text-gray-500">
                Halaman {page} dari {totalPages} ({total} log)
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/settings/audit-log?page=${page - 1}`}
                    className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Sebelumnya
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/settings/audit-log?page=${page + 1}`}
                    className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Berikutnya
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
