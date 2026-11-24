import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UMKM Business Assistant",
  description:
    "Kelola bisnis UMKM Anda dengan mudah: produk, inventaris, penjualan, laporan, dan lebih banyak lagi.",
};

export default function LandingPage() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-green-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Langsung ke konten utama
      </a>

      <div className="min-h-screen bg-white">
        {/* Nav */}
        <header className="border-b border-gray-100">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-sm font-bold text-white"
                aria-hidden="true"
              >
                U
              </div>
              <span className="font-semibold text-gray-900">UMKM Assistant</span>
            </div>
            <nav aria-label="Navigasi halaman">
              <ul className="flex items-center gap-6" role="list">
                <li>
                  <Link
                    href="/login"
                    className="text-sm text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 rounded"
                  >
                    Masuk
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                  >
                    Daftar Gratis
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <main id="main-content">
          <section
            className="mx-auto max-w-5xl px-6 py-20 text-center"
            aria-labelledby="hero-heading"
          >
            <h1
              id="hero-heading"
              className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl"
            >
              Kelola bisnis UMKM
              <br />
              <span className="text-green-600">lebih teratur dan efisien</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-gray-600">
              Catat produk, pantau stok, buat transaksi penjualan, dan lihat laporan
              bisnis, semua dalam satu aplikasi yang dirancang khusus untuk UMKM Indonesia.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
              >
                Mulai Kelola Bisnis
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
              >
                Sudah punya akun? Masuk
              </Link>
            </div>
          </section>

          {/* Feature section */}
          <section
            className="border-t border-gray-100 bg-gray-50 py-16"
            aria-labelledby="features-heading"
          >
            <div className="mx-auto max-w-5xl px-6">
              <h2
                id="features-heading"
                className="mb-10 text-center text-lg font-semibold text-gray-900"
              >
                Fitur yang dibutuhkan operasional bisnis harian
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f) => (
                  <FeatureCard key={f.title} {...f} />
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-100 py-8">
          <div className="mx-auto max-w-5xl px-6 text-center text-sm text-gray-500">
            <p>UMKM Business Assistant &copy; {new Date().getFullYear()}</p>
            <p className="mt-1">
              Dibuat untuk membantu usaha kecil dan menengah berkembang.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

const FEATURES = [
  {
    title: "Manajemen Produk",
    description:
      "Kelola katalog produk dengan SKU unik, kategori, harga modal dan harga jual. Cari dan filter dengan cepat.",
  },
  {
    title: "Kontrol Inventaris",
    description:
      "Pantau stok real-time. Catat stok masuk, keluar, dan penyesuaian dengan audit trail yang lengkap.",
  },
  {
    title: "Transaksi Penjualan",
    description:
      "Buat transaksi dengan banyak produk, diskon, dan pajak. Stok otomatis berkurang saat transaksi berhasil.",
  },
  {
    title: "Laporan Bisnis",
    description:
      "Lihat omzet, laba kotor, dan pengeluaran berdasarkan periode. Ekspor data ke CSV kapan saja.",
  },
  {
    title: "Manajemen Pelanggan",
    description:
      "Simpan data pelanggan dan lihat riwayat pembelian mereka untuk membangun hubungan bisnis yang lebih baik.",
  },
  {
    title: "Catatan Pengeluaran",
    description:
      "Catat pengeluaran operasional per kategori dan periode. Ketahui ke mana uang bisnis Anda mengalir.",
  },
];

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}
