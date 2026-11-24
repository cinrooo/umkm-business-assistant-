import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-500">
        <FileQuestion className="h-10 w-10" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">404 - Halaman Tidak Ditemukan</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
