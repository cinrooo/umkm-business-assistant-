# Panduan Deployment — UMKM Business Assistant

Dokumen ini berisi panduan langkah demi langkah untuk menjalankan aplikasi UMKM Business Assistant pada lingkungan lokal (development/staging) maupun server produksi (production).

---

## 1. Persyaratan Sistem

- **Node.js**: Versi 20 LTS atau lebih baru (direkomendasikan v20 / v22 / v24).
- **Package Manager**: npm v10+ (atau pnpm / yarn).
- **Database**: PostgreSQL versi 15 atau 16.

---

## 2. Variabel Lingkungan (.env)

Buat file `.env.local` pada root proyek (salin dari `.env.example`):

```bash
cp .env.example .env.local
```

Daftar variabel yang diperlukan:

| Variabel | Deskripsi | Contoh Nilai |
|---|---|---|
| `DATABASE_URL` | URL koneksi ke PostgreSQL | `postgresql://umkm_user:password@localhost:5432/umkm_assistant?schema=public` |
| `AUTH_SECRET` | Kunci enkripsi token JWT NextAuth (32+ karakter) | `openssl rand -base64 32` |
| `AUTH_URL` | Base URL aplikasi | `http://localhost:3000` (atau domain production Anda) |
| `NEXT_PUBLIC_APP_URL` | URL publik untuk link invite dan email | `http://localhost:3000` (atau `https://app.bisnisanda.com`) |
| `NODE_ENV` | Mode lingkungan aplikasi | `development` atau `production` |

---

## 3. Deployment Lingkungan Lokal (Docker Compose)

Jika Anda ingin menjalankan database PostgreSQL lokal dengan cepat menggunakan Docker:

1. **Jalankan Database PostgreSQL**:
   ```bash
   docker compose up -d
   ```
   Layanan PostgreSQL akan berjalan pada port `5432` dengan database `umkm_assistant`.

2. **Jalankan Migrasi Database Prisma**:
   ```bash
   npx prisma migrate dev --name init
   ```

3. **(Opsional) Isi Data Demo Lokal**:
   ```bash
   npx prisma db seed
   ```
   Akun demo yang dibuat:
   - **Email**: `demo@umkm-assistant.local`
   - **Password**: `Demo1234!`

4. **Jalankan Server Development**:
   ```bash
   npm run dev
   ```
   Aplikasi dapat diakses melalui peramban di `http://localhost:3000`.

---

## 4. Production Build & Deployment

### Langkah Build Standar

Pada server production (VPS, Docker, atau PaaS):

```bash
# 1. Install dependencies production
npm ci --legacy-peer-deps

# 2. Generate Prisma Client
npx prisma generate

# 3. Jalankan migrasi schema ke database production
npx prisma migrate deploy

# 4. Compile dan build Next.js
npm run build

# 5. Jalankan aplikasi production
npm start
```

### Opsi Cloud Hosting

#### A. Vercel + Supabase Database (Serverless)
1. Buat project baru di [Supabase](https://supabase.com) dan dapatkan `DATABASE_URL` (pilih mode Transaction Pooler / port 6543 untuk koneksi serverless).
2. Push repository proyek ke GitHub.
3. Import repository di [Vercel](https://vercel.com).
4. Tambahkan Environment Variables di Vercel Dashboard:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL`
   - `NEXT_PUBLIC_APP_URL`
5. Vercel akan otomatis melakukan build dan deploy setiap kali ada commit baru di branch `main`.

#### B. VPS / Self-Hosted (Ubuntu + Docker)
1. Buat file `Dockerfile` Next.js standalone.
2. Atur reverse proxy menggunakan Nginx atau Caddy dengan sertifikat SSL otomatis (Let's Encrypt).
3. Gunakan process manager seperti `pm2` atau `docker compose` untuk memastikan server auto-restart saat terjadi kegagalan.

---

## 5. Prosedur Backup & Pemeliharaan Database

Untuk mencadangkan data bisnis UMKM secara berkala:

```bash
# Backup database PostgreSQL
pg_dump -U umkm_user -h localhost -d umkm_assistant -F c -b -v -f backup_$(date +%Y%m%d).dump

# Restore database dari file cadangan
pg_restore -U umkm_user -h localhost -d umkm_assistant -v backup_file.dump
```

Disarankan membuat cron job harian untuk otomatisasi pencadangan database.
