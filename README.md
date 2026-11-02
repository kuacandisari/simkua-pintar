# SIMKUA Pintar - Kantor Urusan Agama (KUA)

Sistem Informasi Manajemen Pelayanan Kantor Urusan Agama (KUA) terpadu:
- 📅 **Jadwal & Kalender Akad Nikah**: Kalender visual akad Balai Nikah (KUA) dan Bedol (Luar KUA), alokasi penghulu, dan status berkas.
- 📋 **Buku Register Nikah**: Pencatatan cepat, pencarian catin, cetak Formulir Model N resmi, dan cetak Buku Register Agenda PDF.
- ✉️ **Register Surat Masuk & Keluar**: Penomoran surat berlanjut otomatis format Kemenag, cetak Lembar Disposisi resmi Kepala KUA.
- 🏛️ **Master Data KUA**: Profil satker KUA, manajemen kelurahan wilayah kerja, dan kode klasifikasi surat dinas.
- 📊 **Integrasi Google Spreadsheet (Model Hibrida)**: Sinkronisasi data register nikah, agenda surat, dan kelurahan ke Google Drive secara otomatis & aman.

---

## 🚀 Panduan Deploy ke Vercel

### Cara 1: Menggunakan GitHub + Vercel Dashboard (Paling Mudah & Otomatis)
1. **Buat Repository Baru di GitHub**:
   - Buka [github.com/new](https://github.com/new) dan buat repository baru (misal: `simkua-candisari`).
2. **Push Source Code ke GitHub**:
   ```bash
   git remote add origin https://github.com/USERNAME_ANDA/simkua-candisari.git
   git branch -M main
   git push -u origin main
   ```
3. **Deploy di Vercel**:
   - Buka [vercel.com/new](https://vercel.com/new).
   - Hubungkan akun GitHub Anda dan pilih repository `simkua-candisari`.
   - Vercel akan otomatis mendeteksi konfigurasi:
     - **Framework Preset**: `Vite`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - Klik **Deploy**. Website akan langsung online dalam waktu ~1 menit dengan URL gratis `https://simkua-candisari.vercel.app`.

---

### Cara 2: Menggunakan Vercel CLI (Langsung dari Terminal)
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Login dan Deploy:
   ```bash
   vercel login
   vercel --prod
   ```

---

## 💻 Menjalankan di Lokal (Development)

```bash
# 1. Install dependencies
npm install

# 2. Jalankan server lokal
npm run dev

# 3. Build untuk produksi
npm run build
```
