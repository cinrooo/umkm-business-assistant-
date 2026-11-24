# Strategi Pengujian (Testing) — UMKM Business Assistant

Pengujian mencakup pengujian unit (unit test), pengujian integrasi (integration test), dan panduan verifikasi fungsional end-to-end.

## 1. Menjalankan Test Suite

Untuk menjalankan seluruh test suite otomatis:

```bash
npm test
```

Perintah di atas mengeksekusi test runner dengan TypeScript native (`tsx --test`), menjalankan unit tests dan integration tests secara terisolasi dan cepat (< 1 detik).

---

## 2. Cakupan Pengujian

### A. Unit Tests (`__tests__/unit/`)

1. **`format.test.ts`**:
   - `formatCurrency`: Memastikan format rupiah (IDR) standar Indonesia (`Rp 150.000`) dan format ringkas jutaan (`Rp 2,5jt`).
   - `formatNumber`: Memastikan pemisah ribuan dengan titik sesuai locale Indonesia (`1.500`, `2.500.000`).
   - `slugify`: Memastikan nama bisnis dapat dikonversi menjadi URL slug yang aman dan unik.
   - `calcItemSubtotal`: Memastikan kalkulasi per item `(unitPrice - discount) * qty` akurat dan tidak menghasilkan nilai negatif.
   - `calcSaleTotal`: Memastikan potongan diskon transaksi dan pengenaan pajak PPN dihitung secara matematis presisi tanpa rounding error.
   - `calcPercentChange`: Memastikan kalkulasi persentase pertumbuhan omzet menangani angka nol dengan aman.

2. **`permissions.test.ts`**:
   - Memastikan matriks RBAC (`OWNER`, `ADMIN`, `MANAGER`, `STAFF`) ditegakkan.
   - Memastikan role `STAFF` tidak dapat mengakses fungsi sensitif seperti pembuatan/penghapusan produk, laporan keuangan, pengaturan organisasi, dan manajemen anggota tim.
   - Memastikan `requirePermission` melempar `Forbidden` error saat izin tidak mencukupi.

3. **`calculations.test.ts`**:
   - Menguji pemisahan eksplisit antara konsep **Omzet**, **Laba Kotor (Gross Profit)**, dan **Estimasi Laba Bersih**.
   - Memastikan HPP dihitung dari harga modal snapshot saat transaksi dibuat.
   - Menguji logika validasi non-negative stock (mencegah overselling jika tidak diizinkan organisasi).
   - Menguji bahwa pembatalan transaksi (reversal) mengembalikan kuantitas stok produk ke nilai semula secara akurat.

### B. Integration Tests (`__tests__/integration/`)

1. **`tenant-isolation.test.ts`**:
   - Memverifikasi bahwa setiap query dan mutasi data mengisolasi data per `organizationId`.
   - Menguji bahwa produk dari Tenant B tidak dapat dibaca oleh Tenant A.
   - Memverifikasi bahwa keunikan SKU dibatasi per organisasi (Tenant A dan Tenant B diperbolehkan memiliki produk dengan SKU yang sama).
   - Memverifikasi bahwa proses pembatalan transaksi Tenant A tidak dapat menyentuh transaksi milik Tenant B.

---

## 3. Checklist Verifikasi Manual & E2E

| Alur Kerja | Prosedur Verifikasi | Ekspektasi Hasil |
|---|---|---|
| Register & Auth | Buka `/register`, isi nama, email, password. | Akun terdaftar, otomatis login dan dialihkan ke `/onboarding`. |
| Onboarding | Isi nama bisnis, jenis bisnis, telepon. | Organisasi dibuat, role user menjadi `OWNER`, dialihkan ke dashboard. |
| Tambah Produk | Buka `/products/new`, isi nama, SKU, harga modal & jual, stok awal 20. | Produk tersimpan, riwayat stok awal bertipe `INITIAL` tercatat di inventaris. |
| Kasir POS | Buka `/sales/new`, pilih produk, tambah ke keranjang, klik bayar. | Transaksi tersimpan, stok produk berkurang, diarahkan ke receipt/struk. |
| Cetak Struk | Di halaman `/sales/[id]`, klik "Cetak Struk". | Dialog cetak browser terbuka dengan format struk belanja rapi. |
| Batal Transaksi | Di halaman `/sales/[id]`, klik "Batalkan Transaksi", isi alasan. | Status menjadi `CANCELLED`, kuantitas stok produk kembali bertambah di inventaris. |
| Laba Rugi | Buka `/reports`. | Omzet, HPP snapshot, Laba Kotor, dan Pengeluaran ditampilkan dengan benar. |
