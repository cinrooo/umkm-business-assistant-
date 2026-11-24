# Implementation Plan — UMKM Business Assistant

## Fase 0: Inspeksi Repository dan Perencanaan ✅ DONE
- [x] Periksa environment (Node 24, npm 11, tidak ada pnpm)
- [x] Tidak ada repository yang sudah ada; buat baru
- [x] requirements.md, architecture.md, database-schema.md, implementation-plan.md dibuat

## Fase 1: Setup Project, Design System, Database, Authentication

### 1.1 Project Init
- [ ] `npx create-next-app@latest` dengan TypeScript, Tailwind, App Router
- [ ] Setup tsconfig strict
- [ ] Install dependencies: prisma, @prisma/client, next-auth, zod, react-hook-form, recharts, bcryptjs
- [ ] Install shadcn/ui
- [ ] Setup `.env.example` dan `.env.local`

### 1.2 Database & Prisma
- [ ] Tulis schema.prisma lengkap sesuai database-schema.md
- [ ] `npx prisma migrate dev --name init`
- [ ] Verifikasi migrasi berhasil

### 1.3 Authentication (NextAuth.js v5)
- [ ] `lib/auth.ts`: konfigurasi credentials provider + Prisma adapter
- [ ] `app/api/auth/[...nextauth]/route.ts`
- [ ] `middleware.ts`: proteksi route dashboard
- [ ] Halaman login (form, validasi Zod, error state, loading state)
- [ ] Halaman register (form, validasi, password confirmation)
- [ ] Server action: register user (hash password dengan bcrypt)
- [ ] Server action: login (via signIn)

### 1.4 Design System
- [ ] Setup shadcn/ui components: Button, Input, Label, Card, Badge, Dialog, etc.
- [ ] `lib/utils/format.ts`: formatCurrency (IDR), formatDate, formatNumber
- [ ] `components/shared/EmptyState.tsx`
- [ ] `components/shared/LoadingState.tsx`
- [ ] `components/shared/ErrorState.tsx`
- [ ] `components/shared/DataTable.tsx`

### 1.5 Onboarding
- [ ] Halaman onboarding: buat organisasi pertama
- [ ] Server action: createOrganization + createMembership (role: OWNER)
- [ ] Redirect ke dashboard setelah onboarding selesai
- [ ] Middleware: redirect ke onboarding jika user belum punya organisasi

### Kriteria selesai Fase 1:
- User bisa register, login, dan logout
- User bisa membuat organisasi (onboarding)
- Route dashboard terlindungi
- `npx prisma migrate dev` berhasil
- `npm run lint` dan `npx tsc --noEmit` berhasil

## Fase 2: Multi-tenancy, Organization, Membership, RBAC

### 2.1 Tenant Resolution
- [ ] `lib/auth.ts`: extend session dengan organizationId aktif
- [ ] `lib/queries/membership.ts`: getActiveMembership(userId)
- [ ] Semua server action verifikasi membership sebelum query

### 2.2 RBAC
- [ ] `lib/permissions.ts`: permission matrix dan hasPermission()
- [ ] Wrapper `requirePermission()` untuk server actions

### 2.3 Invite Member
- [ ] Server action: inviteMember (buat MemberInvite, kirim link)
- [ ] Halaman accept invite
- [ ] Halaman team members: list, ubah role, hapus

### Kriteria selesai Fase 2:
- User dari tenant A tidak bisa akses data tenant B (diuji)
- RBAC bekerja di server action
- Invite flow dapat diuji secara manual

## Fase 3: Product & Category Management

- [ ] CRUD kategori
- [ ] CRUD produk (dengan validasi SKU unik per org)
- [ ] Halaman product list: search, filter, sort, pagination
- [ ] Halaman product detail
- [ ] Halaman product form (create + edit)
- [ ] Server actions: createProduct, updateProduct, deleteProduct (soft)
- [ ] Unit test: validasi SKU unik

## Fase 4: Inventory & Stock Movement

- [ ] Server action: adjustStock (dengan InventoryMovement atomik)
- [ ] Server action: addStock (purchase)
- [ ] Halaman inventory list dengan current stock per produk
- [ ] Halaman stock movement history per produk
- [ ] Notifikasi low stock (create Notification saat stok ≤ threshold)
- [ ] Unit test: stok tidak boleh negatif, atomicity

## Fase 5: Sales & Transactional Stock Update

- [ ] Halaman new sale: pilih customer, tambah items, hitung total
- [ ] Server action: createSale (transaction: buat Sale + SaleItems + kurangi stok + buat InventoryMovement)
- [ ] Idempotency key di form
- [ ] Halaman sale list dengan filter status, tanggal, search
- [ ] Halaman sale detail dengan receipt view
- [ ] Server action: cancelSale (reversal stok, ubah status)
- [ ] Print/download receipt
- [ ] Integration test: sale + stock reduction dalam satu transaksi

## Fase 6: Customer & Expense Management

- [ ] CRUD customer
- [ ] Halaman customer detail dengan riwayat transaksi
- [ ] CRUD pengeluaran + kategori pengeluaran
- [ ] Laporan pengeluaran sederhana

## Fase 7: Dashboard & Reports

- [ ] Dashboard: query omzet, jumlah transaksi, rata-rata, produk terlaris, stok menipis
- [ ] Grafik penjualan (Recharts): harian/mingguan/bulanan
- [ ] Filter tanggal dashboard
- [ ] Halaman laporan: penjualan, laba kotor, pengeluaran, pergerakan stok
- [ ] Export CSV semua laporan

## Fase 8: Settings, Notifications, Audit Log

- [ ] Halaman settings organisasi
- [ ] Halaman team members
- [ ] Pusat notifikasi (read/unread)
- [ ] Audit log view dengan filter

## Fase 9: Testing, Security Review, Performance, Accessibility

- [ ] Unit test: kalkulasi transaksi, stok, permission matrix
- [ ] Integration test: sale flow, cancel flow, tenant isolation
- [ ] E2E test (Playwright): login, onboarding, buat produk, buat transaksi
- [ ] Security checklist: tenant isolation, RBAC, injection, XSS, CSRF
- [ ] Performance: query indexes, pagination, React Suspense
- [ ] Aksesibilitas: label, kontras, keyboard nav

## Fase 10: Documentation & Deployment

- [ ] README.md lengkap
- [ ] API documentation
- [ ] security.md, testing.md, deployment.md
- [ ] Seed script (data demo berlabel)
- [ ] Docker Compose untuk PostgreSQL lokal
- [ ] `npm run build` berhasil tanpa error

## Status Sekarang

**Fase aktif: 1**
Dimulai: 2026-11-23
