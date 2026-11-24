# Architecture — UMKM Business Assistant

## 1. Stack Teknologi

| Layer | Teknologi | Alasan Pemilihan |
|-------|-----------|-----------------|
| Framework | Next.js 15 (App Router) | SSR, RSC, file-based routing, server actions |
| Language | TypeScript 5 (strict) | Type safety, maintainability |
| Styling | Tailwind CSS v4 | Utility-first, design token support |
| Component library | shadcn/ui | Composable, accessible, owns the code |
| Database | PostgreSQL 16 | ACID, Decimal support, mature |
| ORM | Prisma 6 | Type-safe queries, migrations |
| Validation | Zod | Runtime + compile-time validation |
| Forms | React Hook Form | Minimal re-render, integrasi Zod via zodResolver |
| Charts | Recharts | React-native, composable |
| Auth | NextAuth.js v5 (Auth.js) | Terawat, App Router support, session management |
| Package manager | npm | Sudah tersedia di environment |

## 2. Arsitektur Multi-Tenancy

```
┌──────────────────────────────────────────────────────────────┐
│                     Next.js App Router                        │
│                                                              │
│  ┌────────────────────┐    ┌──────────────────────────────┐  │
│  │   Public Routes    │    │   Protected Routes (auth)    │  │
│  │  /login, /register │    │  /dashboard, /products, ...  │  │
│  │  /onboarding       │    │                              │  │
│  └────────────────────┘    └──────────────────────────────┘  │
│                                           │                  │
│                              ┌────────────▼─────────────┐   │
│                              │   Middleware (auth check) │   │
│                              │   + Tenant Resolution     │   │
│                              └────────────┬─────────────┘   │
│                                           │                  │
│  ┌────────────────────────────────────────▼──────────────┐  │
│  │                Server Actions / API Routes              │  │
│  │  1. Verify session (NextAuth)                          │  │
│  │  2. Verify membership in organization                  │  │
│  │  3. Check role/permission                              │  │
│  │  4. Validate input (Zod)                              │  │
│  │  5. Execute business logic                            │  │
│  │  6. Return typed response                             │  │
│  └────────────────────────────────────────┬──────────────┘  │
│                                           │                  │
│  ┌────────────────────────────────────────▼──────────────┐  │
│  │                  Prisma ORM                            │  │
│  │  - All queries include organizationId filter           │  │
│  │  - Transactions for stock + sales mutations           │  │
│  └────────────────────────────────────────┬──────────────┘  │
│                                           │                  │
│  ┌────────────────────────────────────────▼──────────────┐  │
│  │                 PostgreSQL                             │  │
│  │  - Row-level organizationId on all business tables    │  │
│  │  - Decimal columns for all money values               │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## 3. Struktur Folder

```
umkm-business-assistant/
├── app/
│   ├── (auth)/                    # Route group: auth pages
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (onboarding)/              # Route group: onboarding
│   │   └── onboarding/
│   ├── (dashboard)/               # Route group: authenticated dashboard
│   │   ├── layout.tsx             # Sidebar + header layout
│   │   ├── dashboard/
│   │   ├── products/
│   │   │   ├── page.tsx           # Product list
│   │   │   ├── [id]/page.tsx      # Product detail
│   │   │   └── new/page.tsx       # Create product
│   │   ├── categories/
│   │   ├── inventory/
│   │   ├── sales/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx      # Transaction detail + receipt
│   │   ├── customers/
│   │   ├── suppliers/
│   │   ├── expenses/
│   │   ├── reports/
│   │   ├── notifications/
│   │   ├── settings/
│   │   │   ├── organization/
│   │   │   ├── members/
│   │   │   └── audit-log/
│   │   └── profile/
│   ├── api/
│   │   └── auth/[...nextauth]/    # NextAuth handler
│   ├── not-found.tsx
│   ├── error.tsx
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Landing page
├── components/
│   ├── ui/                        # shadcn/ui primitives (owned)
│   ├── layout/                    # Sidebar, header, mobile nav
│   ├── dashboard/                 # Dashboard-specific components
│   ├── products/                  # Product form, product card
│   ├── inventory/                 # Stock movement form
│   ├── sales/                     # Sale form, receipt
│   ├── reports/                   # Chart wrappers
│   └── shared/                    # DataTable, EmptyState, LoadingState, etc.
├── lib/
│   ├── auth.ts                    # NextAuth config
│   ├── db.ts                      # Prisma client singleton
│   ├── validations/               # Zod schemas per domain
│   ├── actions/                   # Server actions per domain
│   ├── queries/                   # Read-only DB queries
│   ├── utils/                     # formatCurrency, formatDate, etc.
│   └── permissions.ts             # RBAC permission matrix
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── types/
│   └── index.ts                   # Shared types (tidak ada 'any')
├── middleware.ts                   # Auth + tenant middleware
├── docs/
│   ├── requirements.md
│   ├── architecture.md
│   ├── database-schema.md
│   ├── implementation-plan.md
│   ├── api.md
│   ├── security.md
│   ├── testing.md
│   └── deployment.md
├── __tests__/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .env.local                     # Tidak di-commit
├── README.md
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 4. Pola Server Action

Semua mutasi menggunakan Server Actions dengan pola:

```typescript
// lib/actions/products.ts
export async function createProduct(formData: CreateProductInput) {
  // 1. Ambil session
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };

  // 2. Ambil tenant aktif dari session (tidak percaya client)
  const membership = await getActiveMembership(session.user.id);
  if (!membership) return { error: 'No active organization' };

  // 3. Cek permission
  if (!hasPermission(membership.role, 'product:create')) {
    return { error: 'Forbidden' };
  }

  // 4. Validasi input
  const validated = CreateProductSchema.safeParse(formData);
  if (!validated.success) return { error: validated.error.flatten() };

  // 5. Business logic
  const product = await db.product.create({
    data: { ...validated.data, organizationId: membership.organizationId },
  });

  // 6. Audit log
  await createAuditLog({ ... });

  return { data: product };
}
```

## 5. Pola Transaksi Database

Penjualan + stok dikurangi dalam satu transaksi:

```typescript
const [sale, ...stockMovements] = await db.$transaction(async (tx) => {
  // 1. Cek stok tersedia
  // 2. Buat Sale
  // 3. Buat SaleItems (dengan snapshot harga)
  // 4. Kurangi stok tiap produk (atomic)
  // 5. Buat InventoryMovement records
  // 6. Return semua hasil
});
```

## 6. RBAC Permission Matrix

| Permission | Owner | Admin | Manager | Staff |
|------------|-------|-------|---------|-------|
| product:read | ✓ | ✓ | ✓ | ✓ |
| product:create | ✓ | ✓ | ✓ | - |
| product:update | ✓ | ✓ | ✓ | - |
| product:delete | ✓ | ✓ | - | - |
| inventory:read | ✓ | ✓ | ✓ | ✓ |
| inventory:adjust | ✓ | ✓ | ✓ | ✓ |
| sale:create | ✓ | ✓ | ✓ | ✓ |
| sale:cancel | ✓ | ✓ | ✓ | - |
| expense:read | ✓ | ✓ | ✓ | - |
| expense:create | ✓ | ✓ | ✓ | - |
| report:view | ✓ | ✓ | ✓ | - |
| member:manage | ✓ | ✓ | - | - |
| org:settings | ✓ | ✓ | - | - |
| org:delete | ✓ | - | - | - |

## 7. Desain UI

**Dials (antislop)**:
- ENERGY: 2 (Balanced) — profesional, informatif, tidak terlalu formal.
- RHYTHM: 2 (Consistent dengan variasi di dashboard) — layout konsisten tapi tidak monoton.
- MOTION: 1 (Hover states + loading transitions saja) — UMKM butuh kecepatan, bukan animasi.

**Alasan desain**:
- Warna primer: hijau tua (#16a34a, green-600) — diasosiasikan dengan pertumbuhan bisnis dan uang, cocok untuk konteks UMKM Indonesia. Bukan biru-ungu AI default.
- Typography: Inter — readable di berbagai ukuran layar, bukan untuk estetika; alasan: UMKM sering pakai layar kecil atau resolusi rendah.
- Sidebar fixed di desktop, bottom sheet di mobile — navigasi cepat untuk penggunaan harian intensif.
- Radius: `rounded-lg` (8px) — konsisten, tidak pill-shaped, terasa solid dan terpercaya.
