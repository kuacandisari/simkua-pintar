/**
 * SIMKUA Pintar - Data Types & Models
 * Register Kantor Urusan Agama (KUA) Lokal / Pendamping SIMKAH
 */

export type UserRole = 'Kepala KUA' | 'Penghulu';

export interface StaffUser {
  id: string;
  nama: string;
  nip: string;
  email: string;
  role: UserRole;
  jabatan: string;
  noHp: string;
  avatarUrl: string;
  statusAktif: boolean;
  pin: string; // PIN akses staf untuk login cepat (default: 123456)
}

export type NikahStatus =
  | 'Pendaftaran'
  | 'Pemeriksaan'
  | 'Pengumuman'
  | 'Siap Akad'
  | 'Selesai'
  | 'Ditolak';

export type LokasiAkad = 'Di KUA' | 'Luar KUA (Bedol)';

export interface KelurahanItem {
  id: string;
  nama: string;
  kodePos?: string;
  namaLurah?: string;
  kontakLurah?: string;
  alamatKantor?: string;
}

export interface CalonMempelai {
  nama: string;
  noHp?: string;
  alamat?: string;
  nik?: string; // Opsional jika dibutuhkan catatan internal
  kelurahan?: string; // Kelurahan domisili catin
}

export interface WaliNikah {
  nama: string;
  hubungan?: string;
  statusWali?: 'Wali Nasab' | 'Wali Hakim';
}

export interface SaksiNikah {
  saksi1Nama?: string;
  saksi2Nama?: string;
  mahar?: string;
}

export interface NikahRegistration {
  id: string;
  noPendaftaran: string;
  noSimkah?: string; // No. Referensi Pendaftaran SIMKAH (opsional)
  suami: CalonMempelai;
  istri: CalonMempelai;
  wali?: WaliNikah;
  saksi?: SaksiNikah;
  tanggalAkad: string; // YYYY-MM-DD
  jamAkad: string; // HH:mm
  lokasiAkad: LokasiAkad;
  alamatAkad: string;
  kelurahanAkad?: string; // Kelurahan tempat pelaksanaan akad
  penghuluId: string;
  penghuluNama: string;
  status: NikahStatus;
  noAktaNikah?: string;
  noBukuNikah?: string;
  biayaNikah: number; // 0 for KUA, 600000 for Bedol
  pnbpStatus: 'Gratis (KUA)' | 'Menunggu Pembayaran' | 'Lunas';
  kodeBillingPnbp?: string;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

export type SuratJenis = 'Surat Masuk' | 'Surat Keluar';

export type SuratStatus = 'Baru' | 'Didisposisi' | 'Sedang Diproses' | 'Selesai';

export interface SuratDisposisi {
  catatan: string;
  instruksi: string[];
  ditujukanKe: string;
  batasWaktu: string;
  tanggalDisposisi: string;
  disposisiOleh: string;
  statusTindakLanjut: 'Belum' | 'Selesai';
}

export interface SuratRecord {
  id: string;
  jenis: SuratJenis;
  noAgenda: string;
  noSurat: string;
  nomorUrut?: number; // Angka urut berlanjut otomatis
  tglSurat: string;
  tglDiterima: string;
  pengirim: string;
  tujuan: string;
  perihal: string;
  klasifikasi: string; // e.g. "PW.01 - Kepenghuluan"
  kodeKlasifikasi?: string; // e.g. "PW.01"
  sifat: 'Biasa' | 'Penting' | 'Rahasia' | 'Segera';
  status: SuratStatus;
  disposisi?: SuratDisposisi;
  lampiranNama?: string;
  lampiranUkuran?: string;
  createdAt: string;
}

export interface CustomKodeSurat {
  kode: string; // e.g. "PW.01"
  nama: string; // e.g. "Kepenghuluan & Legalisasi Buku Nikah"
  kategori: string; // e.g. "Kepenghuluan", "Keuangan", "Kepegawaian"
}

export type ArsipKategori =
  | 'Berkas Nikah'
  | 'Surat Keputusan'
  | 'Dokumen Rujuk'
  | 'Wakaf & Kemasjidan'
  | 'Arsip Kepegawaian'
  | 'Laporan Bulanan'
  | 'Lainnya';

export interface ArsipDokumen {
  id: string;
  judul: string;
  kategori: ArsipKategori;
  noReferensi: string;
  tahun: string;
  ukuran: string;
  tipeFile: 'PDF' | 'JPG' | 'PNG' | 'DOCX' | 'LAINNYA';
  keterangan: string;
  isTerenkripsi: boolean;
  checksum: string;
  uploadedBy: string;
  uploadedAt: string;
  tags: string[];
  // Google Drive integration metadata
  driveFileId?: string;
  driveWebViewLink?: string;
  driveDownloadLink?: string;
  driveFolderId?: string;
  mimeType?: string;
}

export type WakafPeruntukan =
  | 'Masjid'
  | 'Musholla'
  | 'Madrasah / Pendidikan'
  | 'Makam'
  | 'Sosial Lainnya';

export type WakafStatusSertifikat = 'Proses AIW' | 'AIW Terbit' | 'Sertifikat BPN';

export interface WakafRecord {
  id: string;
  noAktaIkrar: string;
  tglIkrar: string; // YYYY-MM-DD
  wakifNama: string;
  nadzirNama: string;
  kelurahan: string;
  alamatTanah: string;
  luasM2: number;
  peruntukan: WakafPeruntukan;
  statusSertifikat: WakafStatusSertifikat;
  keterangan?: string;
  createdAt: string;
}

export interface MuallafRecord {
  id: string;
  noRegister: string;
  tglIkrar: string; // YYYY-MM-DD
  namaLengkap: string;
  tempatTglLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  alamat: string;
  kelurahan: string;
  agamaSebelumnya: string;
  pembimbingNama: string;
  saksi1?: string;
  saksi2?: string;
  keterangan?: string;
  createdAt: string;
}

export interface BukuNikahBatch {
  id: string;
  tanggalDiterima: string; // YYYY-MM-DD
  kodePerforasi: string; // e.g. 'JT', 'SA/SB'
  nomorAwal: string; // e.g. '001201'
  nomorAkhir: string; // e.g. '001250'
  jumlahPasang: number;
  sumberPenerimaan: string;
  catatan?: string;
  createdAt: string;
}

export type MutasiBukuJenis = 'Masuk' | 'Keluar Nikah' | 'Rusak' | 'Hilang';

export interface BukuNikahMutasi {
  id: string;
  tanggal: string; // YYYY-MM-DD
  jenis: MutasiBukuJenis;
  kodePerforasi: string;
  nomorSeri: string; // single serial or range
  jumlahPasang: number;
  nikahId?: string;
  nikahLabel?: string;
  keterangan?: string;
  petugas: string;
  createdAt: string;
}

export interface FormulirRegisterItem {
  id: string;
  periode: string; // YYYY-MM
  jenisFormulir: 'Model NA' | 'Model NB' | 'Model N6';
  namaFormulir: string;
  stokAwal: number;
  diterima: number;
  rusak: number;
  sinkronJumlahNikah: boolean; // Jika true, terpakai otomatis disamakan dengan jumlah nikah bulan berjalan
  catatan?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  aksi: 'TAMBAH' | 'EDIT' | 'DISPOSISI' | 'VERIFIKASI' | 'CETAK' | 'HAPUS' | 'LOGIN' | 'LOGOUT';
  modul:
    | 'Register Nikah'
    | 'Surat Masuk'
    | 'Surat Keluar'
    | 'Arsip Digital'
    | 'Laporan'
    | 'Staf & Sistem'
    | 'Autentikasi'
    | 'Master Data'
    | 'Buku Nikah & Formulir'
    | 'Wakaf & Muallaf';
  detail: string;
}

export interface UrgentNotification {
  id: string;
  tipe: 'nikah_h3' | 'nikah_berkas' | 'surat_disposisi' | 'pnbp_pending';
  judul: string;
  pesan: string;
  targetId: string;
  prioritas: 'Mendesak' | 'Peringatan' | 'Info';
  tenggat: string;
  waktu: string;
  isDibaca: boolean;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  lastSyncedAt?: string;
  autoSyncEnabled: boolean;
  userEmail?: string;
}

export interface GoogleDriveConfig {
  folderId: string;
  folderName: string;
  folderUrl: string;
  userEmail?: string;
  lastSyncedAt?: string;
}

export interface KuaSettings {
  namaKua: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  kodeKua: string;
  alamatLengkap: string;
  telepon: string;
  email: string;
  kepalaKuaNama: string;
  kepalaKuaNip: string;
  // Master Data Kelurahan / Desa di Wilayah Kerja KUA
  daftarKelurahan: KelurahanItem[];
  // Custom Letter Numbering & Classification Codes
  kodeSuratCustomList: CustomKodeSurat[];
  formatNomorSuratKeluar: string; // Template: "B-{nomor}/KUA.{kodeKua}/{kodeKlasifikasi}/{bulanRomawi}/{tahun}"
  formatAgendaMasuk: string; // Template: "AG-SM/{tahun}/{bulan}/{nomor}"
  formatAgendaKeluar: string; // Template: "AG-SK/{tahun}/{bulan}/{nomor}"
  counterSuratKeluar: number; // Urutan berlanjut terakhir
  counterAgendaMasuk: number;
  counterAgendaKeluar: number;
  // Akun Login Singkat Kantor (Lokal per KUA)
  officeUsername?: string;
  officePassword?: string;
  // Google Sheets & Drive Integration
  googleSheetsConfig?: GoogleSheetsConfig;
  googleDriveConfig?: GoogleDriveConfig;
}
