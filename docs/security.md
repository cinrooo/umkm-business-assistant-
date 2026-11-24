# Model Keamanan (Security) — UMKM Business Assistant

Dokumen ini mendefinisikan arsitektur keamanan, threat model, dan checklist verifikasi perlindungan data pada aplikasi multi-tenant UMKM Business Assistant.

---

## 1. Prinsip Utama Keamanan

1. **Defense in Depth**: Keamanan tidak pernah hanya bersandar pada satu lapisan (misalnya filter frontend). Keamanan ditegakkan pada lapisan Middleware, Server Actions, dan Database Constraints.
2. **Strict Tenant Isolation**: Data satu organisasi/bisnis tidak boleh dapat diakses, dilihat, atau dimodifikasi oleh pengguna dari organisasi lain dalam kondisi apa pun.
3. **Least Privilege**: Pengguna hanya memiliki hak akses minimum sesuai dengan peran (role) yang diberikan dalam organisasi.
4. **Data Integrity & Immutability**: Perhitungan uang presisi (Decimal), transaksi mutasi stok bersifat atomik, dan riwayat mutasi stok bersifat permanen (immutable).

---

## 2. Threat Modeling & Mitigasi

| Ancaman (Threat) | Dampak | Mekanisme Mitigasi |
|---|---|---|
| **Cross-Tenant Data Leakage (BOLA/IDOR)** | Penjual A bisa melihat transaksi, produk, atau laporan Penjual B dengan menebak ID | Sesi pengguna selalu divalidasi ke tabel `Membership`. `organizationId` diambil dari membership server, bukan dari input client. Semua query Prisma memiliki klausa `where: { organizationId: membership.organizationId }`. |
| **Privilege Escalation** | Staf kasir mengubah harga produk, melihat laba kotor, atau menghapus anggota tim | Server action memeriksa izin menggunakan fungsi `requireMembership(permission)` dan matriks RBAC `hasPermission()`. Jika role tidak berhak, eksekusi dihentikan dengan status `Forbidden`. |
| **SQL Injection** | Penyerang menyuntikkan perintah SQL lewat input pencarian atau form | Seluruh query menggunakan parameterized queries via Prisma ORM. Raw query menggunakan tagged template literal Prisma (`db.$queryRaw\`...\``) yang otomatis memparameterkan variabel. |
| **Double Submission / Race Condition** | Kasir menekan tombol bayar 2x atau jaringan tidak stabil menghasilkan transaksi ganda | Form transaksi menyertakan `idempotencyKey` unik. Tabel `Sale` memiliki constraint unik `idempotencyKey @unique`. Transaksi kedua otomatis mengembalikan transaksi yang sudah ada tanpa mengurangi stok ulang. |
| **Inaccurate Financial / Floating Point Error** | Pembulatan desimal JavaScript (`0.1 + 0.2 != 0.3`) menyebabkan selisih kas | Semua kolom moneter menggunakan tipe database PostgreSQL `Decimal(15, 2)`. Library Decimal menjamin ketepatan nilai rupiah hingga digit terkecil. |
| **Overselling / Stock Discrepancy** | Dua kasir menjual barang yang sama secara bersamaan hingga stok minus | Mutasi stok dan pembuatan transaksi penjualan dijalankan dalam satu transaksi database (`db.$transaction`). Baris produk dikunci dan divalidasi ketersediaan stoknya sebelum dikurangi. |
| **Tampering with Audit Logs** | Pengguna nakal menghapus riwayat manipulasi stok atau pembatalan penjualan | Tabel `InventoryMovement` tidak memiliki kolom `updatedAt` maupun `deletedAt`. Data mutasi bersifat immutable. Semua aksi pembatalan dicatat di `AuditLog`. |
| **Credential Theft** | Password pengguna bocor jika database terkompromi | Password di-hash menggunakan `bcryptjs` dengan cost factor 12 dan unique salt. Plaintext password tidak pernah disimpan di database maupun log. |
| **Cross-Site Scripting (XSS)** | Penyerang menyisipkan tag script ke nama produk atau catatan pelanggan | Next.js dan React secara default melakukan sanitasi dan escaping konten sebelum di-render ke DOM. |
| **CSRF & Session Hijacking** | Penyerang memicu mutasi dari situs pihak ketiga | Next.js Server Actions memiliki proteksi origin check bawaan. Cookie sesi NextAuth dikonfigurasi dengan flag `HttpOnly`, `SameSite=Lax`, dan `Secure` pada mode HTTPS/Production. |

---

## 3. Matriks Role-Based Access Control (RBAC)

| Modul & Aksi | OWNER | ADMIN | MANAGER | STAFF |
|---|:---:|:---:|:---:|:---:|
| Baca Katalog Produk (`product:read`) | ✓ | ✓ | ✓ | ✓ |
| Tambah & Edit Produk (`product:create`, `product:update`) | ✓ | ✓ | ✓ | - |
| Hapus Produk (`product:delete`) | ✓ | ✓ | - | - |
| Lihat Stok & Riwayat Mutasi (`inventory:read`) | ✓ | ✓ | ✓ | ✓ |
| Catat Mutasi / Opname Stok (`inventory:adjust`) | ✓ | ✓ | ✓ | ✓ |
| Buat Transaksi Kasir (`sale:create`) | ✓ | ✓ | ✓ | ✓ |
| Batalkan / Refund Transaksi (`sale:cancel`) | ✓ | ✓ | ✓ | - |
| Kelola Pelanggan (`customer:create`, `customer:update`, `customer:delete`) | ✓ | ✓ | ✓ | - |
| Kelola Pemasok (`supplier:create`, `supplier:update`, `supplier:delete`) | ✓ | ✓ | ✓ | - |
| Catat Pengeluaran (`expense:create`, `expense:update`, `expense:delete`) | ✓ | ✓ | ✓ | - |
| Lihat Laporan Laba Kotor & Analitik (`report:view`, `report:export`) | ✓ | ✓ | ✓ | - |
| Kelola Anggota & Peran Tim (`member:manage`) | ✓ | ✓ | - | - |
| Ubah Pengaturan Toko (`org:settings`) | ✓ | ✓ | - | - |
| Hapus Organisasi (`org:delete`) | ✓ | - | - | - |

---

## 4. Security Checklist untuk Production

- [x] Password di-hash dengan bcrypt (cost 12).
- [x] Input divalidasi di server menggunakan Zod schema sebelum business logic dijalankan.
- [x] Tenant isolation diuji pada integration test (`__tests__/integration/tenant-isolation.test.ts`).
- [x] `organizationId` tidak pernah dipercayai dari kiriman request body client tanpa verifikasi membership session.
- [x] Transaksi penjualan dan mutasi stok diisolasi dalam satu `db.$transaction`.
- [x] Nilai uang menggunakan `Decimal(15, 2)`, tidak ada pembulatan floating point liar.
- [x] Tidak ada API token, password, atau credential yang di-hardcode ke repositori git.
- [x] File `.env.example` disediakan tanpa nilai secret aktual.
- [x] Audit log mencatat pengguna, aksi, resource, dan timestamp.
