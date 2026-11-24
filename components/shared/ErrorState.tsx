"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  retry?: () => void;
}

export function ErrorState({
  title = "Terjadi Kesalahan",
  message = "Gagal memuat data. Coba lagi beberapa saat.",
  retry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="mb-4 rounded-full bg-red-50 p-4 text-red-500">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-base font-semibold text-gray-900">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500">{message}</p>
      {retry && (
        <Button onClick={retry} variant="outline" size="sm">
          Coba Lagi
        </Button>
      )}
    </div>
  );
}

// Next.js error.tsx boundary wrapper
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Halaman tidak dapat dimuat"
      message={
        process.env.NODE_ENV === "development"
          ? error.message
          : "Terjadi kesalahan tidak terduga. Tim teknis kami sudah diberitahu."
      }
      retry={reset}
    />
  );
}
