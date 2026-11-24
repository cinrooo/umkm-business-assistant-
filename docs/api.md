# Dokumentasi API & Server Actions — UMKM Business Assistant

Semua mutasi dan query bisnis dilayani melalui **Next.js Server Actions** yang memiliki autentikasi otomatis, proteksi session, validasi input Zod, authorization berbasis RBAC, dan audit log.

Format response standar:
```typescript
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
```

---

## 1. Authentication & Onboarding

### `registerUser(formData)`
- **Akses**: Publik
- **Input**: `{ name, email, password, confirmPassword }`
- **Output**: `{ success: true, data: { userId } }`
- **Catatan**: Password di-hash menggunakan `bcryptjs` dengan cost factor 12. Email dinormalisasi ke lowercase.

### `createOrganization(formData)`
- **Akses**: Authenticated User (tanpa organisasi)
- **Input**: `{ name, businessType, currency, timezone, phone, address }`
- **Output**: `{ success: true, data: { organizationId, slug } }`
- **Side Effect**:
  - Membuat membership sebagai `OWNER`.
  - Menginisialisasi kategori pengeluaran default (Operasional, Gaji, Sewa, Utilitas, Pemasaran, Lain-lain).
  - Mencatat audit log `organization.create`.

---

## 2. Manajemen Produk (`lib/actions/products.ts`)

### `getProducts(params)`
- **Izin**: `product:read`
- **Params**: `{ page, pageSize, search, categoryId, isActive }`
- **Output**: `{ items, total, page, pageSize, totalPages }`
- **Tenant Isolation**: Query selalu menyertakan `organizationId` dari session terverifikasi dan `deletedAt: null`.

### `createProduct(formData)`
- **Izin**: `product:create` (OWNER, ADMIN, MANAGER)
- **Input**: `{ name, sku, categoryId, costPrice, sellingPrice, currentStock, minStock, unit, barcode, isActive, description }`
- **Validasi**:
  - SKU harus unik dalam satu organisasi.
  - Harga modal dan harga jual >= 0.
- **Side Effect**:
  - Jika `currentStock > 0`, otomatis membuat entri `InventoryMovement` bertipe `INITIAL`.
  - Mencatat audit log `product.create`.

### `updateProduct(id, formData)`
- **Izin**: `product:update` (OWNER, ADMIN, MANAGER)
- **Input**: Parsial data produk.
- **Catatan**: Stok tidak dapat diedit langsung lewat form produk untuk menjaga integritas audit trail; harus melalui modul inventaris.

### `deleteProduct(id)`
- **Izin**: `product:delete` (OWNER, ADMIN)
- **Mekanisme**: Soft delete dengan mengisi `deletedAt`. Data penjualan lampau tetap mempertahankan snapshot produk.

---

## 3. Inventaris & Mutasi Stok (`lib/actions/products.ts`)

### `adjustStock(formData)`
- **Izin**: `inventory:adjust`
- **Input**: `{ productId, type: "PURCHASE" | "ADJUSTMENT" | "LOSS", quantity, reason, notes }`
- **Transaksi Database**:
  - Mengunci baris produk.
  - Memeriksa flag `allowNegativeStock` organisasi. Jika `false` dan stok menjadi < 0, transaksi dibatalkan dengan error.
  - Mengubah `currentStock` secara atomik.
  - Menyimpan record `InventoryMovement` permanen (immutable).
  - Jika stok turun ke bawah batas threshold, memicu notifikasi `LOW_STOCK`.

---

## 4. Penjualan & Kasir POS (`lib/actions/sales.ts`)

### `createSale(formData)`
- **Izin**: `sale:create` (OWNER, ADMIN, MANAGER, STAFF)
- **Input**:
  ```typescript
  {
    customerId?: string;
    paymentMethod: "CASH" | "TRANSFER" | "QRIS";
    paymentStatus: "PAID";
    discountAmount: number;
    notes?: string;
    idempotencyKey: string;
    items: Array<{ productId: string; quantity: number; discountAmount: number }>;
  }
  ```
- **Idempotency Strategy**: Jika `idempotencyKey` sudah tercatat di database, transaksi duplikat tidak akan diproses ulang.
- **Transaksi Database Atomik**:
  1. Validasi keberadaan produk dan ketersediaan stok.
  2. Perhitungan subtotal, diskon per item, diskon transaksi, dan pajak PPN.
  3. Pembuatan nomor transaksi unik: `TRX-YYYYMMDD-XXXX`.
  4. Penyimpanan snapshot harga modal (`costPriceSnapshot`) dan harga jual (`unitPriceSnapshot`) ke `SaleItem`.
  5. Pengurangan stok produk secara atomik.
  6. Pembuatan entri `InventoryMovement` bertipe `SALE` untuk tiap item.
  7. Pencatatan audit log `sale.create`.

### `cancelSale(formData)`
- **Izin**: `sale:cancel` (OWNER, ADMIN, MANAGER)
- **Input**: `{ saleId, reason }`
- **Mekanisme Reversal**:
  - Transaksi tidak dihapus (tetap tersimpan untuk audit).
  - Status diubah menjadi `CANCELLED`.
  - Seluruh kuantitas produk dikembalikan ke stok fisik melalui `InventoryMovement` bertipe `RETURN`.
  - Reversal tercatat di audit log dengan alasan pembatalan.

---

## 5. Pengeluaran (`lib/actions/expenses.ts`)

### `getExpenses(params)`
- **Izin**: `expense:read`
- **Output**: `{ items, total, totalPages, totalAmount }`

### `createExpense(formData)`
- **Izin**: `expense:create`
- **Input**: `{ description, amount, categoryId, paymentMethod, expenseDate, notes }`
- **Validasi**: Nominal > 0, tanggal valid.

---

## 6. Laporan & Analitik (`lib/actions/reports.ts`)

### `getFinancialReport(params)`
- **Izin**: `report:view`
- **Output**:
  - `omzet`: Total penjualan selesai.
  - `totalHPP`: Jumlah `costPriceSnapshot * quantity` dari seluruh item terjual.
  - `labaKotor`: `Omzet Bersih - Total HPP`.
  - `marginLabaKotor`: Persentase keuntungan kotor.
  - `totalPengeluaran`: Total biaya operasional yang dicatat.
  - `estimasiLabaBersih`: `Laba Kotor - Total Pengeluaran`.
