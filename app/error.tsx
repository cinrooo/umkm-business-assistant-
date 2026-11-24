"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-4 rounded-full bg-red-50 p-4 text-red-500">
        <AlertCircle className="h-10 w-10" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">Terjadi Kesalahan Sistem</h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Mohon maaf, sistem mengalami gangguan saat memproses permintaan Anda.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 cursor-pointer"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
