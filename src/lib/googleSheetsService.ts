/**
 * Google Sheets Service for SIMKUA Pintar
 * Handles Google OAuth, in-memory token caching, spreadsheet creation,
 * and two-way automatic & manual sync for KUA register data.
 */

import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { NikahRegistration, SuratRecord, KelurahanItem, KuaSettings, GoogleSheetsConfig } from '../types';

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

/**
 * Creates a brand new Google Spreadsheet in the user's Google Drive formatted for KUA
 */
export const createKuaSpreadsheet = async (
  kuaSettings: KuaSettings,
  token: string
): Promise<GoogleSheetsConfig> => {
  const currentYear = new Date().getFullYear();
  const title = `SIMKUA Pintar - Database & Register KUA ${kuaSettings.kecamatan} (${currentYear})`;

  const payload = {
    properties: {
      title,
      locale: 'id_ID',
      timeZone: 'Asia/Jakarta',
    },
    sheets: [
      {
        properties: {
          title: 'Register_Nikah',
          gridProperties: { rowCount: 1000, columnCount: 20, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Register_Surat_Dinas',
          gridProperties: { rowCount: 1000, columnCount: 15, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Master_Kelurahan',
          gridProperties: { rowCount: 100, columnCount: 10, frozenRowCount: 1 },
        },
      },
    ],
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
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetTitle: title,
    autoSyncEnabled: true,
    userEmail: cachedGoogleUser?.email || undefined,
  };
};

/**
 * Headers for the 3 tabs
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

/**
 * Formats a NikahRegistration item into an array of cell values
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

/**
 * Formats a SuratRecord item into an array of cell values
 */
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

/**
 * Formats a KelurahanItem into an array of cell values
 */
export const formatKelurahanRow = (item: KelurahanItem, index: number): (string | number)[] => [
  index + 1,
  item.nama || '',
  item.kodePos || '-',
  item.namaLurah || '-',
  item.kontakLurah || '-',
  item.alamatKantor || '-',
];

/**
 * Overwrites / synchronizes full database tables to the target spreadsheet
 * Required user confirmation dialog before updating data as per Workspace guidelines.
 */
export const syncFullDatabaseToSpreadsheet = async (
  spreadsheetId: string,
  token: string,
  data: {
    nikahList: NikahRegistration[];
    suratList: SuratRecord[];
    kelurahanList: KelurahanItem[];
  }
): Promise<{ success: boolean; updatedCells: number }> => {
  // Explicit confirmation dialog for bulk update
  const confirmed = window.confirm(
    `Apakah Anda yakin ingin menyinkronkan seluruh database SIMKUA ke Google Spreadsheet?\n\n` +
      `Data yang akan dikirim:\n` +
      `• ${data.nikahList.length} data pendaftaran nikah\n` +
      `• ${data.suratList.length} berkas surat dinas\n` +
      `• ${data.kelurahanList.length} data kelurahan KUA\n\n` +
      `Tindakan ini akan memperbarui isi lembar Register_Nikah, Register_Surat_Dinas, dan Master_Kelurahan.`
  );

  if (!confirmed) {
    return { success: false, updatedCells: 0 };
  }

  // 1. Prepare Nikah Sheet values
  const nikahValues = [
    NIKAH_SHEET_HEADERS,
    ...data.nikahList.map((n, i) => formatNikahRow(n, i)),
  ];

  // 2. Prepare Surat Sheet values
  const suratValues = [
    SURAT_SHEET_HEADERS,
    ...data.suratList.map((s, i) => formatSuratRow(s, i)),
  ];

  // 3. Prepare Kelurahan Sheet values
  const kelurahanValues = [
    KELURAHAN_SHEET_HEADERS,
    ...data.kelurahanList.map((k, i) => formatKelurahanRow(k, i)),
  ];

  // Batch update payload
  const batchData = [
    {
      range: 'Register_Nikah!A1:T' + (nikahValues.length + 10),
      values: nikahValues,
    },
    {
      range: 'Register_Surat_Dinas!A1:M' + (suratValues.length + 10),
      values: suratValues,
    },
    {
      range: 'Master_Kelurahan!A1:F' + (kelurahanValues.length + 10),
      values: kelurahanValues,
    },
  ];

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

/**
 * Appends a single newly registered nikah record to the spreadsheet in real-time
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
