/**
 * Google Sheets Service for SIMKUA Pintar
 * Handles Google OAuth, in-memory token caching, spreadsheet creation,
 * and full 2-way online cloud sync across all KUA modules + Jadwal_Publik + Drive Archive Index.
 */

import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import {
  ArsipDokumen,
  BukuNikahBatch,
  BukuNikahMutasi,
  FormulirRegisterItem,
  GoogleSheetsConfig,
  KelurahanItem,
  KuaSettings,
  MuallafRecord,
  NikahRegistration,
  StaffUser,
  SuratRecord,
  WakafRecord,
} from '../types';

export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

// In-memory token caching (NEVER stored in localStorage or sessionStorage per security guidelines)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

// Listen to auth changes to invalidate token when logged out
onAuthStateChanged(auth, (user) => {
  cachedGoogleUser = user;
  if (!user) {
    cachedAccessToken = null;
  }
});

export const getCachedAccessToken = (): string | null => cachedAccessToken;
export const getCachedGoogleUser = (): User | null => cachedGoogleUser;

/**
 * Connect to Google Account and acquire OAuth token for Sheets & Drive
 */
export const connectGoogleAccount = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    const provider = new GoogleAuthProvider();
    GOOGLE_SHEETS_SCOPES.forEach((scope) => provider.addScope(scope));
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Gagal memperoleh akses token Google dari Firebase Auth.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Auth Error:', error);
    throw error;
  }
};

export const disconnectGoogleAccount = async () => {
  cachedAccessToken = null;
  cachedGoogleUser = null;
};

const ALL_KUA_SHEET_TABS: { title: string; rowCount: number; columnCount: number }[] = [
  { title: 'Register_Nikah', rowCount: 1000, columnCount: 20 },
  { title: 'Jadwal_Publik', rowCount: 1000, columnCount: 8 },
  { title: 'Register_Surat_Dinas', rowCount: 1000, columnCount: 15 },
  { title: 'Master_Kelurahan', rowCount: 200, columnCount: 10 },
  { title: 'Profil_KUA', rowCount: 50, columnCount: 4 },
  { title: 'Pejabat_Penghulu', rowCount: 100, columnCount: 8 },
  { title: 'Database_Wakaf', rowCount: 500, columnCount: 11 },
  { title: 'Database_Muallaf', rowCount: 500, columnCount: 12 },
  { title: 'Stok_Buku_Nikah', rowCount: 300, columnCount: 8 },
  { title: 'Mutasi_Buku_Nikah', rowCount: 1000, columnCount: 9 },
  { title: 'Register_Formulir', rowCount: 300, columnCount: 8 },
  { title: 'Indeks_Arsip_Drive', rowCount: 1000, columnCount: 15 },
];

/**
 * Creates a brand new Google Spreadsheet in the user's Google Drive formatted for full KUA online DB
 */
export const createKuaSpreadsheet = async (
  kuaSettings: KuaSettings,
  token: string
): Promise<GoogleSheetsConfig> => {
  const currentYear = new Date().getFullYear();
  const title = `SIMKUA Pintar - Database & Register KUA ${kuaSettings.kecamatan || 'Candisari'} (${currentYear})`;

  const payload = {
    properties: {
      title,
      locale: 'id_ID',
      timeZone: 'Asia/Jakarta',
    },
    sheets: ALL_KUA_SHEET_TABS.map((tab) => ({
      properties: {
        title: tab.title,
        gridProperties: {
          rowCount: tab.rowCount,
          columnCount: tab.columnCount,
          frozenRowCount: 1,
        },
      },
    })),
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal membuat spreadsheet baru: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl =
    data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetTitle: title,
    autoSyncEnabled: true,
    userEmail: cachedGoogleUser?.email || undefined,
  };
};

/**
 * Headers for all KUA spreadsheet tabs
 */
export const NIKAH_SHEET_HEADERS = [
  'No.',
  'No. Register',
  'No. Ref SIMKAH',
  'Nama Calon Suami',
  'No. HP Suami',
  'Nama Calon Istri',
  'No. HP Istri',
  'Nama Wali Nikah',
  'Hubungan Wali',
  'Tanggal Akad',
  'Jam Akad (WIB)',
  'Lokasi Akad',
  'Kelurahan Akad',
  'Alamat Lengkap Akad',
  'Penghulu Bertugas',
  'Status Alur',
  'Biaya Nikah (Rp)',
  'Status PNBP',
  'Kode Billing PNBP',
  'Catatan Tambahan',
];

export const JADWAL_PUBLIK_HEADERS = [
  'Tanggal Akad',
  'Jam (WIB)',
  'Mempelai Pria',
  'Mempelai Wanita',
  'Lokasi Akad',
  'Kelurahan / Wilayah',
  'Penghulu Bertugas',
  'Status',
];

export const SURAT_SHEET_HEADERS = [
  'No.',
  'No. Agenda',
  'Jenis Surat',
  'Nomor Surat Resmi',
  'Tanggal Surat',
  'Tanggal Masuk/Keluar',
  'Pengirim / Asal Surat',
  'Tujuan / Kepada',
  'Perihal / Isi Ringkas',
  'Kode Klasifikasi',
  'Status Disposisi',
  'Instruksi / Tindak Lanjut',
  'Petugas Pengelola',
];

export const KELURAHAN_SHEET_HEADERS = [
  'No.',
  'Nama Kelurahan / Desa',
  'Kode Pos',
  'Nama Kepala Kelurahan / Lurah',
  'Kontak Telepon Lurah',
  'Alamat Kantor Kelurahan',
];

export const PROFIL_KUA_HEADERS = ['Kunci', 'Label Parameter', 'Nilai'];

export const PEJABAT_SHEET_HEADERS = [
  'ID',
  'Nama & Gelar',
  'NIP',
  'Email',
  'Jabatan / Role',
  'Keterangan Jabatan',
  'No. HP',
  'Status Aktif',
];

export const WAKAF_SHEET_HEADERS = [
  'ID',
  'No. Akta Ikrar Wakaf',
  'Tanggal Ikrar',
  'Nama Wakif',
  'Nama Nadzir',
  'Kelurahan',
  'Alamat Tanah Wakaf',
  'Luas (m2)',
  'Peruntukan',
  'Status Sertifikat',
  'Keterangan',
];

export const MUALLAF_SHEET_HEADERS = [
  'ID',
  'No. Register',
  'Tanggal Ikrar',
  'Nama Lengkap',
  'Tempat / Tgl Lahir',
  'Jenis Kelamin',
  'Alamat',
  'Kelurahan',
  'Agama Sebelumnya',
  'Pembimbing',
  'Saksi 1 & 2',
  'Keterangan',
];

export const BUKU_BATCH_SHEET_HEADERS = [
  'ID',
  'Tanggal Diterima',
  'Kode Perforasi',
  'Nomor Awal',
  'Nomor Akhir',
  'Jumlah Pasang',
  'Sumber Penerimaan',
  'Catatan',
];

export const BUKU_MUTASI_SHEET_HEADERS = [
  'ID',
  'Tanggal',
  'Jenis Mutasi',
  'Kode Perforasi',
  'Nomor Seri',
  'Jumlah Pasang',
  'Pasangan Nikah',
  'Keterangan',
  'Petugas',
];

export const FORMULIR_SHEET_HEADERS = [
  'ID',
  'Periode (YYYY-MM)',
  'Jenis Formulir',
  'Nama Formulir',
  'Stok Awal',
  'Diterima',
  'Rusak',
  'Sinkron Jumlah Nikah',
];

export const ARSIP_DRIVE_SHEET_HEADERS = [
  'ID',
  'Judul Dokumen',
  'Kategori',
  'No. Referensi',
  'Tahun',
  'Ukuran',
  'Tipe File',
  'Keterangan',
  'Diunggah Oleh',
  'Tanggal Unggah',
  'Tagar',
  'Checksum SHA-256',
  'Drive File ID',
  'Link Google Drive',
  'Link Unduh Drive',
];

/**
 * Row formatters
 */
export const formatNikahRow = (item: NikahRegistration, index: number): (string | number)[] => [
  index + 1,
  item.noPendaftaran || '',
  item.noSimkah || '-',
  item.suami.nama || '',
  item.suami.noHp || '-',
  item.istri.nama || '',
  item.istri.noHp || '-',
  item.wali?.nama || '-',
  item.wali?.hubungan || '-',
  item.tanggalAkad || '',
  item.jamAkad ? `${item.jamAkad} WIB` : '',
  item.lokasiAkad || '',
  item.kelurahanAkad || '',
  item.alamatAkad || '',
  item.penghuluNama || '',
  item.status || '',
  item.biayaNikah ?? 0,
  item.pnbpStatus || '-',
  item.kodeBillingPnbp || '-',
  item.catatan || '',
];

export const formatJadwalPublikRow = (item: NikahRegistration): (string | number)[] => [
  item.tanggalAkad || '',
  item.jamAkad || '08:00',
  item.suami.nama || '',
  item.istri.nama || '',
  item.lokasiAkad || 'Di KUA',
  item.kelurahanAkad || (item.lokasiAkad === 'Di KUA' ? 'Balai Nikah KUA' : '-'),
  item.penghuluNama || 'Penghulu KUA',
  item.status || 'Siap Akad',
];

export const formatSuratRow = (item: SuratRecord, index: number): (string | number)[] => [
  index + 1,
  item.noAgenda || '',
  item.jenis || '',
  item.noSurat || '',
  item.tglSurat || '',
  item.tglDiterima || '',
  item.pengirim || '-',
  item.tujuan || '-',
  item.perihal || '',
  item.kodeKlasifikasi || item.klasifikasi || '',
  item.disposisi?.statusTindakLanjut || item.status || '-',
  item.disposisi?.instruksi ? item.disposisi.instruksi.join(', ') : item.disposisi?.catatan || '-',
  item.disposisi?.ditujukanKe || '-',
];

export const formatKelurahanRow = (item: KelurahanItem, index: number): (string | number)[] => [
  index + 1,
  item.nama || '',
  item.kodePos || '-',
  item.namaLurah || '-',
  item.kontakLurah || '-',
  item.alamatKantor || '-',
];

export const formatProfilKuaRows = (settings: KuaSettings): (string | number)[][] => [
  ['namaKua', 'Nama KUA', settings.namaKua || ''],
  ['kecamatan', 'Kecamatan', settings.kecamatan || ''],
  ['kabupatenKota', 'Kabupaten / Kota', settings.kabupatenKota || ''],
  ['provinsi', 'Provinsi', settings.provinsi || ''],
  ['kodeKua', 'Kode Satker KUA', settings.kodeKua || ''],
  ['alamatLengkap', 'Alamat Lengkap KUA', settings.alamatLengkap || ''],
  ['telepon', 'Nomor Telepon KUA', settings.telepon || ''],
  ['email', 'Email Resmi KUA', settings.email || ''],
  ['kepalaKuaNama', 'Nama & Gelar Kepala KUA', settings.kepalaKuaNama || ''],
  ['kepalaKuaNip', 'NIP Kepala KUA', settings.kepalaKuaNip || ''],
  ['formatNomorSuratKeluar', 'Format Nomor Surat Keluar', settings.formatNomorSuratKeluar || ''],
  ['formatAgendaMasuk', 'Format Agenda Surat Masuk', settings.formatAgendaMasuk || ''],
  ['formatAgendaKeluar', 'Format Agenda Surat Keluar', settings.formatAgendaKeluar || ''],
  ['counterSuratKeluar', 'Counter Terakhir Surat Keluar', settings.counterSuratKeluar ?? 0],
  ['counterAgendaMasuk', 'Counter Terakhir Agenda Masuk', settings.counterAgendaMasuk ?? 0],
  ['counterAgendaKeluar', 'Counter Terakhir Agenda Keluar', settings.counterAgendaKeluar ?? 0],
];

const formatPejabatRow = (s: StaffUser): (string | number)[] => [
  s.id,
  s.nama,
  s.nip,
  s.email,
  s.role,
  s.jabatan,
  s.noHp,
  s.statusAktif ? 'Aktif' : 'Nonaktif',
];

const formatWakafRow = (w: WakafRecord): (string | number)[] => [
  w.id,
  w.noAktaIkrar,
  w.tglIkrar,
  w.wakifNama,
  w.nadzirNama,
  w.kelurahan,
  w.alamatTanah,
  w.luasM2,
  w.peruntukan,
  w.statusSertifikat,
  w.keterangan || '',
];

const formatMuallafRow = (m: MuallafRecord): (string | number)[] => [
  m.id,
  m.noRegister,
  m.tglIkrar,
  m.namaLengkap,
  m.tempatTglLahir,
  m.jenisKelamin,
  m.alamat,
  m.kelurahan,
  m.agamaSebelumnya,
  m.pembimbingNama,
  [m.saksi1, m.saksi2].filter(Boolean).join(' | '),
  m.keterangan || '',
];

const formatBukuBatchRow = (b: BukuNikahBatch): (string | number)[] => [
  b.id,
  b.tanggalDiterima,
  b.kodePerforasi,
  b.nomorAwal,
  b.nomorAkhir,
  b.jumlahPasang,
  b.sumberPenerimaan,
  b.catatan || '',
];

const formatBukuMutasiRow = (m: BukuNikahMutasi): (string | number)[] => [
  m.id,
  m.tanggal,
  m.jenis,
  m.kodePerforasi,
  m.nomorSeri,
  m.jumlahPasang,
  m.nikahLabel || m.nikahId || '-',
  m.keterangan || '',
  m.petugas,
];

const formatFormulirRow = (f: FormulirRegisterItem): (string | number)[] => [
  f.id,
  f.periode,
  f.jenisFormulir,
  f.namaFormulir,
  f.stokAwal,
  f.diterima,
  f.rusak,
  f.sinkronJumlahNikah ? 'Ya' : 'Tidak',
];

const formatArsipDriveRow = (a: ArsipDokumen): (string | number)[] => [
  a.id,
  a.judul,
  a.kategori,
  a.noReferensi,
  a.tahun,
  a.ukuran,
  a.tipeFile,
  a.keterangan,
  a.uploadedBy,
  a.uploadedAt,
  a.tags.join(', '),
  a.checksum,
  a.driveFileId || '',
  a.driveWebViewLink || '',
  a.driveDownloadLink || '',
];

/**
 * Inspects spreadsheet metadata first and creates any missing SIMKUA tabs
 */
export const ensureRequiredSheets = async (
  spreadsheetId: string,
  token: string
): Promise<string[]> => {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Tidak dapat membaca struktur Google Spreadsheet: ${metaRes.status} - ${errText}`);
  }

  const meta = await metaRes.json();
  const existingTitles: string[] = (meta.sheets || [])
    .map((s: any) => s.properties?.title)
    .filter(Boolean);

  const missingTabs = ALL_KUA_SHEET_TABS.filter((tab) => !existingTitles.includes(tab.title));

  if (missingTabs.length > 0) {
    const addRequests = missingTabs.map((tab) => ({
      addSheet: {
        properties: {
          title: tab.title,
          gridProperties: {
            rowCount: tab.rowCount,
            columnCount: tab.columnCount,
            frozenRowCount: 1,
          },
        },
      },
    }));

    const batchRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: addRequests }),
      }
    );

    if (!batchRes.ok) {
      const errText = await batchRes.text();
      throw new Error(`Gagal menyiapkan tab pada Spreadsheet: ${batchRes.status} - ${errText}`);
    }

    return [...existingTitles, ...missingTabs.map((t) => t.title)];
  }

  return existingTitles;
};

export interface FullKuaDatabasePayload {
  nikahList: NikahRegistration[];
  suratList: SuratRecord[];
  kelurahanList: KelurahanItem[];
  kuaSettings?: KuaSettings;
  staffList?: StaffUser[];
  wakafList?: WakafRecord[];
  muallafList?: MuallafRecord[];
  bukuBatchList?: BukuNikahBatch[];
  bukuMutasiList?: BukuNikahMutasi[];
  formulirList?: FormulirRegisterItem[];
  arsipList?: ArsipDokumen[];
}

/**
 * Overwrites / synchronizes full database tables to the target spreadsheet.
 * Confirmation must be gathered in the custom React UI modal before calling.
 */
export const syncFullDatabaseToSpreadsheet = async (
  spreadsheetId: string,
  token: string,
  data: FullKuaDatabasePayload,
  _skipConfirm = true
): Promise<{ success: boolean; updatedCells: number }> => {
  await ensureRequiredSheets(spreadsheetId, token);

  const clearRanges = [
    'Register_Nikah!A1:T1000',
    'Jadwal_Publik!A1:H1000',
    'Register_Surat_Dinas!A1:M1000',
    'Master_Kelurahan!A1:F500',
    'Profil_KUA!A1:C50',
    'Pejabat_Penghulu!A1:H100',
    'Database_Wakaf!A1:K500',
    'Database_Muallaf!A1:L500',
    'Stok_Buku_Nikah!A1:H300',
    'Mutasi_Buku_Nikah!A1:I1000',
    'Register_Formulir!A1:H300',
    'Indeks_Arsip_Drive!A1:O1000',
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ranges: clearRanges }),
  });

  const nikahValues = [NIKAH_SHEET_HEADERS, ...data.nikahList.map((n, i) => formatNikahRow(n, i))];
  const jadwalPublikValues = [
    JADWAL_PUBLIK_HEADERS,
    ...data.nikahList.filter((n) => n.status !== 'Ditolak').map((n) => formatJadwalPublikRow(n)),
  ];
  const suratValues = [SURAT_SHEET_HEADERS, ...data.suratList.map((s, i) => formatSuratRow(s, i))];
  const kelurahanValues = [
    KELURAHAN_SHEET_HEADERS,
    ...data.kelurahanList.map((k, i) => formatKelurahanRow(k, i)),
  ];

  const batchData: { range: string; values: (string | number)[][] }[] = [
    { range: 'Register_Nikah!A1:T' + nikahValues.length, values: nikahValues },
    { range: 'Jadwal_Publik!A1:H' + jadwalPublikValues.length, values: jadwalPublikValues },
    { range: 'Register_Surat_Dinas!A1:M' + suratValues.length, values: suratValues },
    { range: 'Master_Kelurahan!A1:F' + kelurahanValues.length, values: kelurahanValues },
  ];

  if (data.kuaSettings) {
    const profilValues = [PROFIL_KUA_HEADERS, ...formatProfilKuaRows(data.kuaSettings)];
    batchData.push({ range: 'Profil_KUA!A1:C' + profilValues.length, values: profilValues });
  }

  if (data.staffList) {
    const rows = [PEJABAT_SHEET_HEADERS, ...data.staffList.map(formatPejabatRow)];
    batchData.push({ range: 'Pejabat_Penghulu!A1:H' + rows.length, values: rows });
  }

  if (data.wakafList) {
    const rows = [WAKAF_SHEET_HEADERS, ...data.wakafList.map(formatWakafRow)];
    batchData.push({ range: 'Database_Wakaf!A1:K' + rows.length, values: rows });
  }

  if (data.muallafList) {
    const rows = [MUALLAF_SHEET_HEADERS, ...data.muallafList.map(formatMuallafRow)];
    batchData.push({ range: 'Database_Muallaf!A1:L' + rows.length, values: rows });
  }

  if (data.bukuBatchList) {
    const rows = [BUKU_BATCH_SHEET_HEADERS, ...data.bukuBatchList.map(formatBukuBatchRow)];
    batchData.push({ range: 'Stok_Buku_Nikah!A1:H' + rows.length, values: rows });
  }

  if (data.bukuMutasiList) {
    const rows = [BUKU_MUTASI_SHEET_HEADERS, ...data.bukuMutasiList.map(formatBukuMutasiRow)];
    batchData.push({ range: 'Mutasi_Buku_Nikah!A1:I' + rows.length, values: rows });
  }

  if (data.formulirList) {
    const rows = [FORMULIR_SHEET_HEADERS, ...data.formulirList.map(formatFormulirRow)];
    batchData.push({ range: 'Register_Formulir!A1:H' + rows.length, values: rows });
  }

  if (data.arsipList) {
    const rows = [ARSIP_DRIVE_SHEET_HEADERS, ...data.arsipList.map(formatArsipDriveRow)];
    batchData.push({ range: 'Indeks_Arsip_Drive!A1:O' + rows.length, values: rows });
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal menyinkronkan ke Spreadsheet: ${response.status} - ${errText}`);
  }

  const result = await response.json();
  return {
    success: true,
    updatedCells: result.totalUpdatedCells || 0,
  };
};

const VALID_NIKAH_STATUSES = [
  'Pendaftaran',
  'Pemeriksaan',
  'Pengumuman',
  'Siap Akad',
  'Selesai',
  'Ditolak',
] as const;

const VALID_PNBP_STATUSES = ['Gratis (KUA)', 'Menunggu Pembayaran', 'Lunas'] as const;

/**
 * Loads / pulls all KUA tables from a linked Google Spreadsheet (Full 2-way online DB)
 */
export const loadDatabaseFromSpreadsheet = async (
  spreadsheetId: string,
  token: string
): Promise<{
  nikahList: NikahRegistration[];
  suratList: SuratRecord[];
  kelurahanList: KelurahanItem[];
  kuaProfile: Partial<KuaSettings>;
  staffList?: StaffUser[];
  wakafList?: WakafRecord[];
  muallafList?: MuallafRecord[];
  bukuBatchList?: BukuNikahBatch[];
  bukuMutasiList?: BukuNikahMutasi[];
  formulirList?: FormulirRegisterItem[];
  arsipList?: ArsipDokumen[];
  foundTabs: string[];
}> => {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Gagal mengakses Google Spreadsheet: ${metaRes.status} - ${errText}`);
  }

  const meta = await metaRes.json();
  const existingTitles: string[] = (meta.sheets || [])
    .map((s: any) => s.properties?.title)
    .filter(Boolean);

  const rangesToFetch: string[] = [];
  if (existingTitles.includes('Register_Nikah')) rangesToFetch.push('Register_Nikah!A2:T1000');
  if (existingTitles.includes('Register_Surat_Dinas')) rangesToFetch.push('Register_Surat_Dinas!A2:M1000');
  if (existingTitles.includes('Master_Kelurahan')) rangesToFetch.push('Master_Kelurahan!A2:F500');
  if (existingTitles.includes('Profil_KUA')) rangesToFetch.push('Profil_KUA!A2:C50');
  if (existingTitles.includes('Pejabat_Penghulu')) rangesToFetch.push('Pejabat_Penghulu!A2:H100');
  if (existingTitles.includes('Database_Wakaf')) rangesToFetch.push('Database_Wakaf!A2:K500');
  if (existingTitles.includes('Database_Muallaf')) rangesToFetch.push('Database_Muallaf!A2:L500');
  if (existingTitles.includes('Stok_Buku_Nikah')) rangesToFetch.push('Stok_Buku_Nikah!A2:H300');
  if (existingTitles.includes('Mutasi_Buku_Nikah')) rangesToFetch.push('Mutasi_Buku_Nikah!A2:I1000');
  if (existingTitles.includes('Register_Formulir')) rangesToFetch.push('Register_Formulir!A2:H300');
  if (existingTitles.includes('Indeks_Arsip_Drive')) rangesToFetch.push('Indeks_Arsip_Drive!A2:O1000');

  if (rangesToFetch.length === 0) {
    return {
      nikahList: [],
      suratList: [],
      kelurahanList: [],
      kuaProfile: {},
      foundTabs: existingTitles,
    };
  }

  const queryParams = rangesToFetch.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryParams}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!valuesRes.ok) {
    const errText = await valuesRes.text();
    throw new Error(`Gagal membaca isi Google Spreadsheet: ${valuesRes.status} - ${errText}`);
  }

  const valuesJson = await valuesRes.json();
  const valueRanges: { range: string; values?: string[][] }[] = valuesJson.valueRanges || [];

  const getRowsForTab = (tabName: string): string[][] => {
    const matched = valueRanges.find((vr) => vr.range.startsWith(tabName) || vr.range.includes(`'${tabName}'`));
    return matched?.values || [];
  };

  const nowIso = new Date().toISOString();

  // 1. Parse Register_Nikah
  const nikahRows = getRowsForTab('Register_Nikah');
  const nikahList: NikahRegistration[] = nikahRows
    .filter((row) => row && (row[1] || row[3] || row[5]))
    .map((row, idx) => {
      const lokasiRaw = String(row[11] || '').trim();
      const lokasiAkad: NikahRegistration['lokasiAkad'] =
        lokasiRaw.toLowerCase().includes('luar') || lokasiRaw.toLowerCase().includes('bedol')
          ? 'Luar KUA (Bedol)'
          : 'Di KUA';

      const statusRaw = String(row[15] || '').trim();
      const status = (VALID_NIKAH_STATUSES as readonly string[]).includes(statusRaw)
        ? (statusRaw as NikahRegistration['status'])
        : 'Pendaftaran';

      const pnbpRaw = String(row[17] || '').trim();
      const pnbpStatus = (VALID_PNBP_STATUSES as readonly string[]).includes(pnbpRaw)
        ? (pnbpRaw as NikahRegistration['pnbpStatus'])
        : lokasiAkad === 'Di KUA'
        ? 'Gratis (KUA)'
        : 'Menunggu Pembayaran';

      const biayaParsed = Number(String(row[16] || '0').replace(/[^0-9]/g, ''));
      const biayaNikah = !isNaN(biayaParsed) && biayaParsed > 0 ? biayaParsed : lokasiAkad === 'Di KUA' ? 0 : 600000;

      const noPendaftaran = String(row[1] || `REG-SHEET-${String(idx + 1).padStart(3, '0')}`).trim();
      const jamAkad = String(row[10] || '').replace(/\s*WIB$/i, '').trim();

      return {
        id: `NK-GS-${idx + 1}-${noPendaftaran.replace(/[^a-zA-Z0-9]/g, '')}`,
        noPendaftaran,
        noSimkah: row[2] && row[2] !== '-' ? String(row[2]).trim() : undefined,
        suami: {
          nama: String(row[3] || '').trim(),
          noHp: row[4] && row[4] !== '-' ? String(row[4]).trim() : undefined,
        },
        istri: {
          nama: String(row[5] || '').trim(),
          noHp: row[6] && row[6] !== '-' ? String(row[6]).trim() : undefined,
        },
        wali: {
          nama: row[7] && row[7] !== '-' ? String(row[7]).trim() : '-',
          hubungan: row[8] && row[8] !== '-' ? String(row[8]).trim() : 'Ayah Kandung',
        },
        tanggalAkad: String(row[9] || '').trim(),
        jamAkad: jamAkad || '08:00',
        lokasiAkad,
        kelurahanAkad: row[12] ? String(row[12]).trim() : undefined,
        alamatAkad: String(row[13] || '').trim(),
        penghuluId: 'staff-01',
        penghuluNama: String(row[14] || 'Penghulu KUA').trim(),
        status,
        biayaNikah,
        pnbpStatus,
        kodeBillingPnbp: row[18] && row[18] !== '-' ? String(row[18]).trim() : undefined,
        catatan: row[19] ? String(row[19]).trim() : undefined,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });

  // 2. Parse Register_Surat_Dinas
  const suratRows = getRowsForTab('Register_Surat_Dinas');
  const suratList: SuratRecord[] = suratRows
    .filter((row) => row && (row[1] || row[3] || row[8]))
    .map((row, idx) => {
      const jenisRaw = String(row[2] || '').trim();
      const jenis: SuratRecord['jenis'] = jenisRaw === 'Surat Keluar' ? 'Surat Keluar' : 'Surat Masuk';

      const statusRaw = String(row[10] || '').trim();
      let status: SuratRecord['status'] = 'Baru';
      if (statusRaw === 'Selesai') status = 'Selesai';
      else if (statusRaw === 'Sedang Diproses') status = 'Sedang Diproses';
      else if (statusRaw === 'Didisposisi' || statusRaw === 'Belum') status = 'Didisposisi';

      const klasifikasiRaw = String(row[9] || 'PW.01').trim();
      const noAgenda = String(row[1] || `AG-${idx + 1}`).trim();

      const hasDisposisiInfo = (row[11] && row[11] !== '-') || (row[12] && row[12] !== '-');

      return {
        id: `SRT-GS-${idx + 1}-${noAgenda.replace(/[^a-zA-Z0-9]/g, '')}`,
        jenis,
        noAgenda,
        noSurat: String(row[3] || '').trim(),
        tglSurat: String(row[4] || '').trim(),
        tglDiterima: String(row[5] || row[4] || '').trim(),
        pengirim: row[6] && row[6] !== '-' ? String(row[6]).trim() : '-',
        tujuan: row[7] && row[7] !== '-' ? String(row[7]).trim() : '-',
        perihal: String(row[8] || '').trim(),
        klasifikasi: klasifikasiRaw,
        kodeKlasifikasi: klasifikasiRaw.split(' ')[0] || klasifikasiRaw,
        sifat: 'Biasa',
        status,
        disposisi: hasDisposisiInfo
          ? {
              catatan: row[11] && row[11] !== '-' ? String(row[11]).trim() : '',
              instruksi:
                row[11] && row[11] !== '-'
                  ? String(row[11])
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : [],
              ditujukanKe: row[12] && row[12] !== '-' ? String(row[12]).trim() : 'Staf KUA',
              batasWaktu: String(row[5] || '').trim(),
              tanggalDisposisi: String(row[5] || '').trim(),
              disposisiOleh: 'Kepala KUA',
              statusTindakLanjut: status === 'Selesai' ? 'Selesai' : 'Belum',
            }
          : undefined,
        createdAt: nowIso,
      };
    });

  // 3. Parse Master_Kelurahan
  const kelurahanRows = getRowsForTab('Master_Kelurahan');
  const kelurahanList: KelurahanItem[] = kelurahanRows
    .filter((row) => row && row[1])
    .map((row, idx) => ({
      id: `kel-gs-${idx + 1}`,
      nama: String(row[1] || '').trim(),
      kodePos: row[2] && row[2] !== '-' ? String(row[2]).trim() : '',
      namaLurah: row[3] && row[3] !== '-' ? String(row[3]).trim() : '',
      kontakLurah: row[4] && row[4] !== '-' ? String(row[4]).trim() : '',
      alamatKantor: row[5] && row[5] !== '-' ? String(row[5]).trim() : '',
    }));

  // 4. Parse Profil_KUA
  const profilRows = getRowsForTab('Profil_KUA');
  const kuaProfile: Partial<KuaSettings> = {};
  profilRows.forEach((row) => {
    const key = String(row[0] || '').trim();
    const val = row[2] !== undefined ? String(row[2]).trim() : '';
    if (!key) return;
    if (
      key === 'counterSuratKeluar' ||
      key === 'counterAgendaMasuk' ||
      key === 'counterAgendaKeluar'
    ) {
      const num = parseInt(val, 10);
      if (!isNaN(num)) (kuaProfile as any)[key] = num;
    } else if (
      key === 'namaKua' ||
      key === 'kecamatan' ||
      key === 'kabupatenKota' ||
      key === 'provinsi' ||
      key === 'kodeKua' ||
      key === 'alamatLengkap' ||
      key === 'telepon' ||
      key === 'email' ||
      key === 'kepalaKuaNama' ||
      key === 'kepalaKuaNip' ||
      key === 'formatNomorSuratKeluar' ||
      key === 'formatAgendaMasuk' ||
      key === 'formatAgendaKeluar'
    ) {
      (kuaProfile as any)[key] = val;
    }
  });

  // 5. Parse Pejabat_Penghulu
  let staffList: StaffUser[] | undefined;
  if (existingTitles.includes('Pejabat_Penghulu')) {
    const rows = getRowsForTab('Pejabat_Penghulu');
    if (rows.length > 0) {
      staffList = rows
        .filter((r) => r[1])
        .map((r, idx) => ({
          id: String(r[0] || `staff-gs-${idx + 1}`),
          nama: String(r[1] || ''),
          nip: String(r[2] || ''),
          email: String(r[3] || ''),
          role: r[4] === 'Kepala KUA' ? 'Kepala KUA' : 'Penghulu',
          jabatan: String(r[5] || r[4] || 'Penghulu'),
          noHp: String(r[6] || ''),
          avatarUrl:
            r[4] === 'Kepala KUA'
              ? '/src/assets/images/avatar_kepala_kua_1792047097557.jpg'
              : '/src/assets/images/avatar_penghulu_1792047116967.jpg',
          statusAktif: String(r[7] || 'Aktif').toLowerCase() !== 'nonaktif',
          pin: '123456',
        }));
    }
  }

  // 6. Parse Database_Wakaf
  let wakafList: WakafRecord[] | undefined;
  if (existingTitles.includes('Database_Wakaf')) {
    const rows = getRowsForTab('Database_Wakaf');
    wakafList = rows
      .filter((r) => r[1] || r[3])
      .map((r, idx) => ({
        id: String(r[0] || `WKF-GS-${idx + 1}`),
        noAktaIkrar: String(r[1] || ''),
        tglIkrar: String(r[2] || ''),
        wakifNama: String(r[3] || ''),
        nadzirNama: String(r[4] || ''),
        kelurahan: String(r[5] || ''),
        alamatTanah: String(r[6] || ''),
        luasM2: Number(r[7] || 0),
        peruntukan: (r[8] as WakafRecord['peruntukan']) || 'Masjid',
        statusSertifikat: (r[9] as WakafRecord['statusSertifikat']) || 'Proses AIW',
        keterangan: r[10] ? String(r[10]) : undefined,
        createdAt: nowIso,
      }));
  }

  // 7. Parse Database_Muallaf
  let muallafList: MuallafRecord[] | undefined;
  if (existingTitles.includes('Database_Muallaf')) {
    const rows = getRowsForTab('Database_Muallaf');
    muallafList = rows
      .filter((r) => r[1] || r[3])
      .map((r, idx) => {
        const saksiParts = String(r[10] || '').split('|').map((s) => s.trim());
        return {
          id: String(r[0] || `MLF-GS-${idx + 1}`),
          noRegister: String(r[1] || ''),
          tglIkrar: String(r[2] || ''),
          namaLengkap: String(r[3] || ''),
          tempatTglLahir: String(r[4] || ''),
          jenisKelamin: r[5] === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
          alamat: String(r[6] || ''),
          kelurahan: String(r[7] || ''),
          agamaSebelumnya: String(r[8] || ''),
          pembimbingNama: String(r[9] || ''),
          saksi1: saksiParts[0] || undefined,
          saksi2: saksiParts[1] || undefined,
          keterangan: r[11] ? String(r[11]) : undefined,
          createdAt: nowIso,
        };
      });
  }

  // 8. Parse Stok_Buku_Nikah
  let bukuBatchList: BukuNikahBatch[] | undefined;
  if (existingTitles.includes('Stok_Buku_Nikah')) {
    const rows = getRowsForTab('Stok_Buku_Nikah');
    bukuBatchList = rows
      .filter((r) => r[2] || r[3])
      .map((r, idx) => ({
        id: String(r[0] || `BN-BATCH-GS-${idx + 1}`),
        tanggalDiterima: String(r[1] || ''),
        kodePerforasi: String(r[2] || ''),
        nomorAwal: String(r[3] || ''),
        nomorAkhir: String(r[4] || ''),
        jumlahPasang: Number(r[5] || 0),
        sumberPenerimaan: String(r[6] || 'Kemenag Kota'),
        catatan: r[7] ? String(r[7]) : undefined,
        createdAt: nowIso,
      }));
  }

  // 9. Parse Mutasi_Buku_Nikah
  let bukuMutasiList: BukuNikahMutasi[] | undefined;
  if (existingTitles.includes('Mutasi_Buku_Nikah')) {
    const rows = getRowsForTab('Mutasi_Buku_Nikah');
    bukuMutasiList = rows
      .filter((r) => r[2] || r[3])
      .map((r, idx) => ({
        id: String(r[0] || `BN-MUT-GS-${idx + 1}`),
        tanggal: String(r[1] || ''),
        jenis: (r[2] as BukuNikahMutasi['jenis']) || 'Keluar Nikah',
        kodePerforasi: String(r[3] || ''),
        nomorSeri: String(r[4] || ''),
        jumlahPasang: Number(r[5] || 1),
        nikahLabel: r[6] && r[6] !== '-' ? String(r[6]) : undefined,
        keterangan: r[7] ? String(r[7]) : undefined,
        petugas: String(r[8] || 'Petugas KUA'),
        createdAt: nowIso,
      }));
  }

  // 10. Parse Register_Formulir
  let formulirList: FormulirRegisterItem[] | undefined;
  if (existingTitles.includes('Register_Formulir')) {
    const rows = getRowsForTab('Register_Formulir');
    formulirList = rows
      .filter((r) => r[1] && r[2])
      .map((r, idx) => ({
        id: String(r[0] || `FRM-GS-${idx + 1}`),
        periode: String(r[1] || ''),
        jenisFormulir: (r[2] as FormulirRegisterItem['jenisFormulir']) || 'Model NA',
        namaFormulir: String(r[3] || ''),
        stokAwal: Number(r[4] || 0),
        diterima: Number(r[5] || 0),
        rusak: Number(r[6] || 0),
        sinkronJumlahNikah: String(r[7] || 'Ya').toLowerCase() !== 'tidak',
      }));
  }

  // 11. Parse Indeks_Arsip_Drive
  let arsipList: ArsipDokumen[] | undefined;
  if (existingTitles.includes('Indeks_Arsip_Drive')) {
    const rows = getRowsForTab('Indeks_Arsip_Drive');
    arsipList = rows
      .filter((r) => r[1])
      .map((r, idx) => ({
        id: String(r[0] || `ARS-GS-${idx + 1}`),
        judul: String(r[1] || ''),
        kategori: (r[2] as ArsipDokumen['kategori']) || 'Lainnya',
        noReferensi: String(r[3] || '-'),
        tahun: String(r[4] || String(new Date().getFullYear())),
        ukuran: String(r[5] || '-'),
        tipeFile: (r[6] as ArsipDokumen['tipeFile']) || 'PDF',
        keterangan: String(r[7] || ''),
        uploadedBy: String(r[8] || 'Petugas KUA'),
        uploadedAt: String(r[9] || nowIso),
        tags: String(r[10] || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        checksum: String(r[11] || ''),
        isTerenkripsi: true,
        driveFileId: r[12] ? String(r[12]) : undefined,
        driveWebViewLink: r[13] ? String(r[13]) : undefined,
        driveDownloadLink: r[14] ? String(r[14]) : undefined,
      }));
  }

  return {
    nikahList,
    suratList,
    kelurahanList,
    kuaProfile,
    staffList,
    wakafList,
    muallafList,
    bukuBatchList,
    bukuMutasiList,
    formulirList,
    arsipList,
    foundTabs: existingTitles,
  };
};

/**
 * Appends a single newly registered nikah record to Register_Nikah AND Jadwal_Publik
 */
export const appendNikahToSpreadsheet = async (
  spreadsheetId: string,
  token: string,
  nikah: NikahRegistration,
  totalCurrentCount: number
): Promise<boolean> => {
  try {
    const row = formatNikahRow(nikah, totalCurrentCount);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Register_Nikah!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );

    if (nikah.status !== 'Ditolak') {
      const publicRow = formatJadwalPublikRow(nikah);
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Jadwal_Publik!A1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [publicRow],
          }),
        }
      ).catch(() => {});
    }

    return response.ok;
  } catch (error) {
    console.warn('Auto-sync Nikah to Spreadsheet failed silently:', error);
    return false;
  }
};

/**
 * Appends a single newly registered surat record to the spreadsheet in real-time
 */
export const appendSuratToSpreadsheet = async (
  spreadsheetId: string,
  token: string,
  surat: SuratRecord,
  totalCurrentCount: number
): Promise<boolean> => {
  try {
    const row = formatSuratRow(surat, totalCurrentCount);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Register_Surat_Dinas!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.warn('Auto-sync Surat to Spreadsheet failed silently:', error);
    return false;
  }
};

/**
 * Direct CSV Export helper for Excel / Google Sheets without requiring Google OAuth login
 */
export const exportDataToCsv = (
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) => {
  const processCell = (val: string | number) => {
    let str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Microsoft Excel compatibility
    [headers.map(processCell).join(','), ...rows.map((row) => row.map(processCell).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
