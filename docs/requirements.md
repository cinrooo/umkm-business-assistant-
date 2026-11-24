# Requirements — UMKM Business Assistant

## 1. Deskripsi Produk

Aplikasi SaaS multi-tenant berbasis web untuk membantu pemilik UMKM (Usaha Mikro, Kecil, dan Menengah) di Indonesia mengelola operasi bisnis sehari-hari: produk, inventaris, penjualan, pelanggan, pemasok, pengeluaran, dan laporan keuangan.

## 2. Pengguna Target

- **Owner**: pemilik bisnis, akses penuh ke semua fitur dan pengaturan.
- **Admin**: setara owner kecuali tidak bisa menghapus organisasi.
- **Manager**: akses ke semua modul operasional; tidak bisa mengelola anggota/role.
- **Staff**: hanya akses ke penjualan dan inventaris dasar; tidak bisa melihat laporan keuangan penuh.

## 3. Fitur Utama

### A. Authentication & Onboarding
- Register dengan email + password (bcrypt hashing).
- Login, logout, session management via NextAuth.js v5.
- Forgot/reset password via email token (hanya jika SMTP dikonfigurasi).
- Onboarding: buat organisasi (nama, jenis bisnis, mata uang IDR, zona waktu Asia/Jakarta).
- Invite anggota via email link dengan role yang ditentukan.
- RBAC: Owner > Admin > Manager > Staff.
- Server-side validation semua aksi sensitif.

### B. Dashboard
- Ringkasan: omzet hari ini/minggu/bulan, jumlah transaksi, rata-rata nilai transaksi.
- Produk terlaris (berdasarkan kuantitas dan nilai), stok menipis, pengeluaran periode.
- Grafik penjualan harian/mingguan/bulanan (Recharts).
- Filter rentang tanggal.
- Empty state untuk bisnis baru.
- Semua angka dari database aktual.

### C. Product Management
- CRUD produk dan kategori produk.
- SKU unik per tenant (bukan global).
- Field: nama, deskripsi, kategori, harga modal, harga jual, unit, barcode (opsional), status aktif/nonaktif.
- Pencarian, filter kategori/status, sorting, pagination.
- Upload gambar produk (hanya jika storage dikonfigurasi; placeholder jika tidak).
- Validasi: harga modal ≥ 0, harga jual ≥ 0, SKU tidak boleh duplikat dalam tenant.

### D. Inventory
- Stok awal saat produk dibuat.
- Stok masuk (purchase), stok keluar (manual adjustment), penyesuaian stok (opname).
- Setiap perubahan stok: alasan, catatan, dan audit trail wajib.
- Riwayat pergerakan stok per produk.
- Minimum stock threshold per produk; notifikasi jika stok ≤ threshold.
- Stok tidak boleh negatif kecuali ada flag `allow_negative_stock` di pengaturan organisasi.
- Semua perubahan stok harus atomik (database transaction).
- Riwayat pergerakan stok bersifat immutable (tidak bisa diedit/dihapus).

### E. Sales & Transactions
- Buat transaksi penjualan dengan banyak item.
- Hitung subtotal, diskon per item atau per transaksi, pajak (opsional, % dikonfigurasi), dan total.
- Metode pembayaran: tunai, transfer, atau custom.
- Status pembayaran: lunas, belum lunas.
- Nomor transaksi unik per tenant (format: TRX-{YYYYMMDD}-{SEQUENCE}).
- Stok dikurangi atomik bersamaan dengan transaksi.
- Snapshot nama produk dan harga disimpan di SaleItem (tidak terpengaruh perubahan produk kemudian).
- Cetak/unduh receipt (PDF atau print dialog).
- Pembatalan/refund: gunakan proses reversal yang dicatat (bukan delete). Stok dikembalikan.
- Idempotency: cegah double submission dengan idempotency key.

### F. Customer Management
- CRUD pelanggan: nama, nomor kontak, email (opsional), alamat (opsional), catatan.
- Riwayat transaksi per pelanggan.
- Total pembelian pelanggan.
- Pencarian dan filter.

### G. Supplier Management
- CRUD pemasok: nama, kontak, alamat, catatan.
- Riwayat pembelian barang jika modul pembelian diimplementasikan.
- Modul procurement (purchase order, penerimaan barang) dinyatakan in-progress jika belum lengkap.

### H. Expense Management
- Pencatatan pengeluaran: tanggal, jumlah, kategori, metode pembayaran, catatan.
- Kategori pengeluaran dapat dikustomisasi per organisasi.
- Laporan pengeluaran per periode dan kategori.
- Validasi: jumlah > 0, tanggal valid.

### I. Reports & Analytics
- Laporan penjualan: omzet per periode, jumlah transaksi, rata-rata nilai.
- Laporan laba kotor: omzet - harga modal snapshot (bukan laba bersih).
- Laporan pengeluaran per periode dan kategori.
- Produk terlaris berdasarkan kuantitas dan nilai.
- Laporan pergerakan stok.
- Filter tanggal.
- Export CSV untuk semua laporan.
- **Definisi eksplisit:**
  - Omzet = jumlah total penjualan (harga jual × kuantitas, sudah dikurangi diskon).
  - Laba Kotor = Omzet - (harga modal snapshot × kuantitas terjual).
  - Laba Bersih = Laba Kotor - Total Pengeluaran (ditampilkan sebagai estimasi, bukan akuntansi formal).

### J. Settings
- Profil organisasi: nama, logo, alamat, jenis bisnis.
- Mata uang (IDR default) dan zona waktu.
- Pengaturan pajak (PPN %) dan diskon default.
- Minimum stock threshold global.
- Manajemen anggota: invite, ubah role, hapus anggota.
- Audit log: tampilkan aksi sensitif.

### K. Notifications
- Notifikasi stok menipis (in-app).
- Notifikasi transaksi baru (in-app).
- Pusat notifikasi (notification center).
- Email/WhatsApp: hanya jika provider dikonfigurasi. Tidak mengklaim aktif jika masih simulasi.

## 4. Non-Functional Requirements

- **Multi-tenancy**: tenant isolation ketat di server. Tidak mengandalkan filter frontend.
- **Keamanan**: RBAC server-side, Zod validation, parameterized queries via Prisma, secure cookies, rate limiting endpoint sensitif, audit log aksi sensitif.
- **Performa**: pagination semua daftar, lazy loading komponen berat, indexed queries di database.
- **Aksesibilitas**: WCAG AA, semantic HTML, keyboard navigation, label form, kontras memadai.
- **Responsif**: mobile-first, sidebar collapsible di mobile.
- **Bahasa**: Indonesia.
- **Format uang**: IDR (Rupiah), locale id-ID.
- **Tipe uang di DB**: Decimal (bukan float).

## 5. Batasan & Asumsi

- Tidak ada payment gateway terintegrasi (pencatatan manual).
- Email SMTP opsional; fitur reset password dan invite via email hanya aktif jika dikonfigurasi.
- Upload gambar opsional; local disk atau S3-compatible storage jika dikonfigurasi.
- Tidak ada mobile app (web responsive saja).
- Demo account hanya untuk environment lokal/demo, tidak untuk production.
