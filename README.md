# SIMKUA Pintar — Aplikasi Manajemen Administrasi KUA Mandiri

Aplikasi web administrasi dan pelayanan **Kantor Urusan Agama (KUA)** yang dirancang mandiri per kantor KUA (desentralisasi dengan penyimpanan lokal browser serta sinkronisasi gratis ke **Google Spreadsheet** & **Google Drive** masing-masing KUA).

---

## ✨ Fitur Utama

1. **Register Pendaftaran Nikah & Cover Pendaftaran**
   - Pencatatan pendaftaran nikah lengkap (Calon Suami, Calon Istri, Wali, Lokasi Akad KUA/Bedol, Penghulu, status berkas).
   - Generate & cetak **Cover Pendaftaran Nikah** serta Formulir Model N & Buku Register Agenda PDF.
2. **Kalender Jadwal Akad & Halaman Publik Masyarakat**
   - Kalender interaktif untuk petugas KUA.
   - Halaman khusus masyarakat tanpa perlu login (`/jadwal-nikah` atau `?mode=jadwal`) yang hanya menampilkan jadwal akad nikah resmi tanpa menampilkan fitur/data internal kantor.
3. **Surat Masuk & Surat Keluar Terpisah**
   - Menu sidebar terpisah untuk **Surat Masuk** dan **Surat Keluar** agar mudah dipantau.
   - Penomoran surat otomatis sesuai format Kementerian Agama & kode klasifikasi surat custom, serta cetak Lembar Disposisi Kepala KUA.
4. **Manajemen Stok Buku Nikah & Register Formulir**
   - Pencatatan stok masuk buku nikah (tanggal terima, kode porforasi, nomor seri/porforasi), mutasi keluar, serta register formulir (NA, NB, dll.) yang terhitung otomatis dari jumlah nikah bulan berjalan + catatan formulir rusak.
5. **Database Wakaf & Muallaf**
   - Pencatatan data tanah/ikrar wakaf serta register pembinaan & ikrar muallaf.
6. **Pusat Arsip & Integrasi Google Drive**
   - Upload berkas PDF, gambar/foto, dan dokumen pendukung langsung ke folder Google Drive KUA Anda.
7. **Database Gratis Google Spreadsheet (2 Arah)**
   - Sinkronisasi 2 arah (Simpan ke Sheet & Tarik dari Sheet) mencakup 12 tab data:
     - `Register_Nikah`, `Jadwal_Publik`, `Register_Surat_Dinas`, `Master_Kelurahan`, `Profil_KUA`, `Pejabat_Penghulu`, `Database_Wakaf`, `Database_Muallaf`, `Stok_Buku_Nikah`, `Mutasi_Buku_Nikah`, `Register_Formulir`, dan `Indeks_Arsip_Drive`.
8. **Pengaturan Terpadu**
   - Master Data KUA (Nama KUA, Kecamatan, Kode KUA, Format & Kode Surat, Data Kelurahan wilayah kerja), Data Kepala KUA & Penghulu, Reset Database, Pengaturan Akun/Password, Google Sheet, dan Google Drive terpusat dalam tab **Pengaturan**.

---

## 💻 Prasyarat Instalasi

Pastikan perangkat Anda sudah terpasang:
- **Node.js** versi **18 atau lebih baru** ([nodejs.org](https://nodejs.org/))
- **npm** (otomatis terpasang bersama Node.js) atau **bun**
- **Git** (opsional, untuk clone & push ke GitHub)
- Akun **Google** (Gmail pribadi atau akun kantor KUA) untuk penyimpanan Google Spreadsheet & Google Drive

---

## 🛠️ Petunjuk Instalasi & Menjalankan di Lokal

1. **Clone Repository atau Ekstrak Folder Proyek**
   ```bash
   git clone https://github.com/USERNAME_ANDA/NAMA_REPO.git
   cd NAMA_REPO
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Siapkan File Environment (`.env`)**
   Salin file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
   Isi variabel opsional di `.env` (khususnya jika ingin langsung menautkan halaman jadwal publik ke Google Sheet KUA Anda):
   ```env
   VITE_PUBLIC_SHEET_ID="ID_GOOGLE_SPREADSHEET_KUA_ANDA"
   VITE_PUBLIC_KUA_NAME="KUA Candisari"
   ```
   > **Keterangan:**
   > - `VITE_PUBLIC_SHEET_ID`: ID Google Spreadsheet (diambil dari URL Sheet di antara `/d/` dan `/edit`). Digunakan agar halaman publik `/jadwal-nikah` otomatis memuat jadwal tanpa perlu menambahkan `?sheet=...` di URL.
   > - `VITE_PUBLIC_KUA_NAME`: Nama KUA yang tampil sebagai identitas pada halaman jadwal publik.

4. **Jalankan Server Development**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di **`http://localhost:3000`**.

5. **Build & Cek Tipe (Produksi)**
   ```bash
   npm run lint
   npm run build
   ```
   Hasil build siap produksi berada di folder `dist/`.

---

## 🔐 Login Default & Pengaturan Awal KUA

1. **Login Pertama Kali**
   - **Username default**: `kuacandisari`
   - **Password default**: `123456`
2. **Sesuaikan Profil KUA Anda**
   - Buka menu **Pengaturan → Master Data KUA**.
   - Ubah **Nama Resmi KUA**, **Kecamatan**, **Kabupaten/Kota**, **Kode KUA**, **Kepala KUA & NIP**, **Format Nomor Surat**, dan **Daftar Kelurahan** sesuai wilayah kerja Anda.
   - Jika ingin memulai dari data kosong (tanpa data contoh), gunakan panel **Reset & Pengelolaan Database Lokal KUA → Kosongkan Data Transaksi** atau **Reset Bersih Total (KUA Baru)**.
3. **Ganti Username & Password**
   - Klik tombol **Akun Login & Ganti Password** di menu **Pengaturan → Master Data KUA** untuk mengubah username dan password demi keamanan kantor Anda.
4. **Keluar Sesi (Logout)**
   - Gunakan tombol **Keluar (Logout)** yang tersedia di bagian paling bawah sidebar kiri.

---

## ☁️ Menghubungkan Google Spreadsheet & Google Drive

1. Buka menu **Pengaturan → Google Sheet** (atau klik tombol sinkronisasi Sheet).
2. Klik **Sambungkan dengan Akun Google** dan login menggunakan akun Google kantor/pribadi Anda.
3. Pilih salah satu:
   - **Buat Spreadsheet KUA Otomatis**: Membuat file Google Spreadsheet baru lengkap dengan 12 tab data di Google Drive Anda.
   - **Tautkan Spreadsheet yang Ada**: Masukkan URL/ID Google Spreadsheet KUA yang sudah dimiliki, lalu klik **Tarik Data dari Sheet** untuk memulihkan data ke perangkat baru.
4. Untuk penyimpanan berkas PDF/foto, buka **Pengaturan → Google Drive**, lalu masukkan **Folder ID Google Drive** tujuan arsip kantor Anda.

---

## 📅 Halaman Jadwal Nikah Publik (Untuk Masyarakat)

- Aplikasi menyediakan rute khusus masyarakat yang **tidak menampilkan fitur admin** dan **tidak memerlukan login**:
  - `https://domain-anda.vercel.app/jadwal-nikah`
  - atau `https://domain-anda.vercel.app/?mode=jadwal`
- Agar jadwal selalu tampil otomatis di perangkat masyarakat:
  1. Pastikan tab `Jadwal_Publik` pada Google Spreadsheet Anda sudah terisi (otomatis terbarui saat sinkronisasi).
  2. Atur berbagi (Share) Google Spreadsheet ke **"Anyone with the link / Siapa saja yang memiliki link → Viewer (Pengakses Lihat Saja)"**.
  3. Isi `VITE_PUBLIC_SHEET_ID` dan `VITE_PUBLIC_KUA_NAME` pada pengaturan Environment Variables saat deploy.

---

## 🌐 Panduan Deploy Online Gratis (GitHub + Vercel)

1. **Push Kode ke Repository GitHub Baru**
   ```bash
   git init
   git add .
   git commit -m "Initial commit aplikasi administrasi KUA"
   git branch -M main
   git remote add origin https://github.com/USERNAME_ANDA/kua-online.git
   git push -u origin main
   ```

2. **Deploy ke Vercel**
   - Buka [vercel.com/new](https://vercel.com/new) dan login menggunakan GitHub.
   - Pilih repository Anda (file `vercel.json` sudah dikonfigurasi untuk SPA routing `/jadwal-nikah`).
   - Pastikan pengaturan build:
     - **Framework Preset**: `Vite`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - Pada bagian **Environment Variables**, tambahkan (opsional untuk halaman jadwal publik):
     - `VITE_PUBLIC_SHEET_ID` = *(ID Google Spreadsheet KUA Anda)*
     - `VITE_PUBLIC_KUA_NAME` = *(Nama KUA Anda, misalnya `KUA Candisari`)*
   - Klik **Deploy**.

3. **Daftarkan Domain Baru untuk Login Google (Penting agar Sync Sheets/Drive Berfungsi)**
   - Setelah Vercel selesai deploy dan memberi domain (misal `kua-candisari.vercel.app`):
   - Buka **Firebase Console** (project `quick-pixel-rds98`) → **Authentication → Settings → Authorized domains**.
   - Klik **Add domain**, lalu masukkan domain Vercel Anda (tanpa `https://`).
   - *(Jika Anda memakai project Firebase/OAuth milik sendiri, sesuaikan konfigurasi di `firebase-applet-config.json` dan aktifkan Google Sheets API + Google Drive API di Google Cloud Console).*
