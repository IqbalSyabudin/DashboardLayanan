# Layanan Informasi Publik — Frontend + Backend

Frontend React/Vite dan backend Go/Gin berada dalam satu folder proyek. Keduanya tetap berjalan sebagai dua proses terpisah saat development: frontend di port 5173 dan API di port 8080.

## Fitur yang disesuaikan

- Fitur register di frontend dan backend telah dihapus.
- Login hanya menerima username yang disetel lewat `ADMIN_USERNAME`.
- Semua endpoint CRUD pengguna (`/api/users...`) dihilangkan dari router; halaman **Pengguna** tetap ada di navigasi tetapi kontennya dikosongkan.
- Endpoint data layanan, wilayah, instansi, kategori, status, dan kata kunci tetap dipertahankan.
- Endpoint perubahan data tetap dilindungi JWT dan middleware hanya menerima token akun admin yang sesuai dengan konfigurasi serta record database.

## 1. Konfigurasi backend

Masuk ke folder `backend/`, lalu salin `.env.example` menjadi `.env`.

Isi variabel berikut dengan nilai milik Anda:

- `DATABASE_URL`: connection string PostgreSQL/Supabase.
- `JWT_SECRET`: secret acak panjang yang disimpan secara privat.
- `ADMIN_USERNAME`: username admin (contoh `admin`).
- `ADMIN_PASSWORD`: password admin yang kuat, minimal 12 karakter dan maksimal 72 byte untuk bcrypt.
- `PORT`: gunakan `8080` untuk konfigurasi frontend bawaan.

Jika Anda sudah memiliki `.env` pada proyek endpoint API sebelumnya, salin nilai `DATABASE_URL`, `PORT`, dan `JWT_SECRET` dari file tersebut ke `backend/.env`, kemudian tambahkan `ADMIN_USERNAME` dan `ADMIN_PASSWORD`. Jangan commit atau membagikan file `.env`.

Jalankan backend dari folder `backend/`:

```bash
go mod download
go run .
```

`SeedAdmin()` akan membuat akun yang dikonfigurasi jika belum ada, atau menyinkronkan hash password akun tersebut dengan `ADMIN_PASSWORD`. Data akun lama selain admin tidak otomatis dihapus dari database, tetapi tidak bisa login dan endpoint manajemen pengguna sudah tidak tersedia.

## 2. Konfigurasi dan jalankan frontend

Pada root proyek, pastikan `.env` berisi:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

Kemudian jalankan:

```bash
npm install
npm run dev
```

Buka URL Vite yang ditampilkan terminal (biasanya `http://localhost:5173`). API harus sudah berjalan di terminal lain.

## 3. Build frontend

```bash
npm run build
```

## Struktur utama

```text
LayananInformasiPublik/
├── src/                 # React frontend
├── public/
├── package.json
├── .env                 # URL API frontend lokal
├── backend/             # Go API
│   ├── main.go
│   ├── auth.go
│   ├── seed_user.go
│   ├── handlers/
│   ├── models/
│   ├── data/
│   └── .env.example
└── README.md
```
