# UMKM Business Assistant

Aplikasi SaaS multi-tenant untuk membantu pemilik UMKM Indonesia mengelola bisnis mereka secara digital.

## Fitur

- **Manajemen Produk**: Katalog produk dengan SKU unik, kategori, harga modal & jual
- **Kontrol Inventaris**: Stok real-time, riwayat pergerakan stok, audit trail immutable
- **Transaksi Penjualan**: Multi-item, diskon, pajak, stok otomatis berkurang atomik
- **Manajemen Pelanggan & Pemasok**: Data kontak dan riwayat transaksi
- **Catatan Pengeluaran**: Per kategori dan periode
- **Dashboard & Laporan**: Omzet, laba kotor, pengeluaran, produk terlaris; export CSV
- **Multi-tenant**: Isolasi data antar bisnis, RBAC (Owner/Admin/Manager/Staff)
- **Audit Log**: Riwayat aksi sensitif tersimpan

## Stack Teknologi

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: PostgreSQL 16 + Prisma ORM
- **Auth**: NextAuth.js v5 (Auth.js)
- **Validation**: Zod + React Hook Form
- **Charts**: Recharts

## Prasyarat

- Node.js >= 20
- npm >= 10
- PostgreSQL 16 (atau Docker)

## Instalasi

```bash
# 1. Clone repository
git clone <repository-url>
cd umkm-business-assistant

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local dengan nilai yang sesuai

# 4. Jalankan PostgreSQL (jika menggunakan Docker)
docker compose up -d

# 5. Jalankan migrasi database
npx prisma migrate dev

# 6. (Opsional) Isi data demo
npx prisma db seed

# 7. Jalankan dev server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Akun Demo (lokal saja)

Setelah menjalankan `npx prisma db seed`:

```
Email    : demo@umkm-assistant.local
Password : Demo1234!
```

> Akun demo hanya untuk environment lokal. JANGAN gunakan di production.

## Perintah Berguna

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint check
npx tsc --noEmit    # TypeScript check
npx prisma studio   # Database GUI
npx prisma migrate dev --name <name>  # Buat migrasi baru
```

## Struktur Folder

```
app/
  (auth)/            # Login, register, forgot password
  (onboarding)/      # Setup organisasi pertama
  (dashboard)/       # Halaman utama (dilindungi auth)
  api/auth/          # NextAuth handler
components/
  layout/            # Sidebar, mobile nav
  dashboard/         # Komponen chart
  shared/            # EmptyState, LoadingState, ErrorState, PageHeader
lib/
  actions/           # Server actions (auth, products, sales, dll)
  validations/       # Zod schemas
  permissions.ts     # RBAC permission matrix
  db.ts              # Prisma client singleton
  auth.ts            # NextAuth config
  utils/format.ts    # formatCurrency, formatDate, dll
prisma/
  schema.prisma      # Database schema
  seed.ts            # Data demo
docs/                # Dokumentasi teknis
```

## Keamanan

- Tenant isolation diverifikasi di server pada setiap request
- Password di-hash dengan bcrypt (cost 12)
- Server-side validation dengan Zod pada semua input
- RBAC diimplementasikan di server action, bukan hanya UI
- Stok dan transaksi selalu atomik (database transaction)
- InventoryMovement bersifat immutable
- Tidak ada secret di source code

Lihat [docs/security.md](docs/security.md) untuk detail lengkap.

## Deployment

Lihat [docs/deployment.md](docs/deployment.md).

## Lisensi

[MIT](LICENSE)
