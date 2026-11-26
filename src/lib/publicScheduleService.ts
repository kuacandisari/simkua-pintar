import { KuaSettings, NikahRegistration, NikahStatus, LokasiAkad } from '../types';

export interface PublicNikahScheduleItem {
  id: string;
  tanggalAkad: string; // YYYY-MM-DD
  jamAkad: string; // HH:mm
  suamiNama: string;
  istriNama: string;
  lokasiAkad: LokasiAkad;
  kelurahanAkad: string;
  penghuluNama: string;
  status: NikahStatus;
}

export interface PublicKuaProfile {
  namaKua: string;
  kecamatan: string;
  kabupatenKota: string;
  provinsi: string;
  alamatLengkap: string;
  telepon: string;
  email: string;
}

export interface PublicScheduleFetchResult {
  schedules: PublicNikahScheduleItem[];
  profile: Partial<PublicKuaProfile>;
  source: 'google-sheet' | 'local';
  fetchedAt: string;
}

/**
 * Checks if the browser is currently visiting the standalone public schedule route.
 * Supports /jadwal-nikah, /jadwal, ?mode=jadwal, ?jadwal=publik, or #/jadwal-nikah
 */
export const isPublicScheduleRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash.toLowerCase();

  return (
    path === '/jadwal-nikah' ||
    path === '/jadwal' ||
    search.get('mode') === 'jadwal' ||
    search.get('jadwal') === 'publik' ||
    hash.startsWith('#/jadwal-nikah') ||
    hash.startsWith('#/jadwal')
  );
};

/**
 * Reads optional public Spreadsheet ID & KUA Name from URL query params or Vite env vars
 */
export const getPublicScheduleParams = (): {
  sheetId: string | null;
  kuaName: string | null;
} => {
  if (typeof window === 'undefined') {
    return {
      sheetId: (import.meta as any).env?.VITE_PUBLIC_SHEET_ID || null,
      kuaName: (import.meta as any).env?.VITE_PUBLIC_KUA_NAME || null,
    };
  }
  const search = new URLSearchParams(window.location.search);
  const envSheetId = (import.meta as any).env?.VITE_PUBLIC_SHEET_ID || '';
  const envKuaName = (import.meta as any).env?.VITE_PUBLIC_KUA_NAME || '';

  return {
    sheetId: search.get('sheet')?.trim() || (envSheetId ? String(envSheetId).trim() : null),
    kuaName: search.get('kua')?.trim() || (envKuaName ? String(envKuaName).trim() : null),
  };
};

/**
 * Generates the shareable public link for citizens (masyarakat)
 */
export const buildPublicScheduleUrl = (
  spreadsheetId?: string,
  namaKua?: string
): string => {
  if (typeof window === 'undefined') return '/jadwal-nikah';
  const url = new URL('/jadwal-nikah', window.location.origin);
  if (spreadsheetId && spreadsheetId.trim()) {
    url.searchParams.set('sheet', spreadsheetId.trim());
  }
  if (namaKua && namaKua.trim()) {
    url.searchParams.set('kua', namaKua.trim());
  }
  return url.toString();
};

/**
 * Sanitizes internal NikahRegistration records so zero sensitive data (NIK, HP, PNBP, notes)
 * is ever passed to the public view.
 */
export const sanitizeNikahForPublic = (
  nikahList: NikahRegistration[]
): PublicNikahScheduleItem[] => {
  return nikahList
    .filter((n) => n.status !== 'Ditolak')
    .map((n) => ({
      id: n.id,
      tanggalAkad: n.tanggalAkad,
      jamAkad: n.jamAkad,
      suamiNama: n.suami.nama,
      istriNama: n.istri.nama,
      lokasiAkad: n.lokasiAkad,
      kelurahanAkad:
        n.kelurahanAkad ||
        (n.lokasiAkad === 'Di KUA' ? 'Balai Nikah KUA' : 'Wilayah Kecamatan'),
      penghuluNama: n.penghuluNama,
      status: n.status,
    }));
};

export const extractPublicProfileFromSettings = (
  settings: KuaSettings
): PublicKuaProfile => ({
  namaKua: settings.namaKua || 'KUA Candisari',
  kecamatan: settings.kecamatan || 'Candisari',
  kabupatenKota: settings.kabupatenKota || 'Kota Semarang',
  provinsi: settings.provinsi || 'Provinsi Jawa Tengah',
  alamatLengkap: settings.alamatLengkap || '',
  telepon: settings.telepon || '',
  email: settings.email || '',
});

/**
 * Parses Google Visualization API (gviz/tq?tqx=out:json) response safely
 */
function parseGvizResponse(rawText: string): string[][] {
  const startIdx = rawText.indexOf('(');
  const endIdx = rawText.lastIndexOf(')');
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error('Format respon Google Sheet tidak dapat dibaca (pastikan akses publik aktif).');
  }

  const jsonStr = rawText.slice(startIdx + 1, endIdx);
  const parsed = JSON.parse(jsonStr);

  if (parsed.status === 'error') {
    const msg = parsed.errors?.[0]?.detailed_message || parsed.errors?.[0]?.message || 'Sheet error';
    throw new Error(msg);
  }

  const rows = parsed?.table?.rows || [];
  return rows.map((row: { c?: Array<{ v?: unknown; f?: string } | null> }) =>
    (row.c || []).map((cell) => {
      if (!cell) return '';
      if (cell.f !== undefined && cell.f !== null) return String(cell.f);
      if (cell.v !== undefined && cell.v !== null) return String(cell.v);
      return '';
    })
  );
}

const VALID_STATUSES: readonly NikahStatus[] = [
  'Pendaftaran',
  'Pemeriksaan',
  'Pengumuman',
  'Siap Akad',
  'Selesai',
  'Ditolak',
];

function normalizeSheetDate(raw: string): string {
  const trimmed = (raw || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // Handle Google gviz Date(YYYY,M,D) string
  const gvizDate = trimmed.match(/Date\((\d{4}),(\d{1,2}),(\d{1,2})\)/);
  if (gvizDate) {
    const y = gvizDate[1];
    const m = String(Number(gvizDate[2]) + 1).padStart(2, '0');
    const d = String(Number(gvizDate[3])).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return trimmed;
}

/**
 * Fetches live wedding schedule directly from a publicly-shared Google Spreadsheet
 * without requiring visitors/citizens to sign in with Google.
 */
export const fetchPublicScheduleFromSpreadsheet = async (
  spreadsheetId: string
): Promise<PublicScheduleFetchResult> => {
  const cleanId = spreadsheetId.trim();
  if (!cleanId) {
    throw new Error('ID Google Spreadsheet publik belum tersedia.');
  }

  const baseGviz = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(cleanId)}/gviz/tq`;

  // 1. Fetch Jadwal_Publik (primary) or Register_Nikah (fallback)
  let schedules: PublicNikahScheduleItem[] = [];
  let loadedFromPublicTab = false;

  try {
    const resPublik = await fetch(
      `${baseGviz}?tqx=out:json&sheet=${encodeURIComponent('Jadwal_Publik')}&headers=1`
    );
    if (resPublik.ok) {
      const text = await resPublik.text();
      if (!text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html')) {
        const rows = parseGvizResponse(text);
        if (rows.length > 0 && rows[0].length >= 6) {
          loadedFromPublicTab = true;
          schedules = rows
            .filter((r) => r[0] && (r[2] || r[3]))
            .map((r, idx) => {
              const lokasiRaw = (r[4] || '').toLowerCase();
              const lokasiAkad: LokasiAkad =
                lokasiRaw.includes('luar') || lokasiRaw.includes('bedol')
                  ? 'Luar KUA (Bedol)'
                  : 'Di KUA';
              const statusRaw = (r[7] || '').trim() as NikahStatus;
              const status = VALID_STATUSES.includes(statusRaw) ? statusRaw : 'Siap Akad';

              return {
                id: `PUB-${idx + 1}`,
                tanggalAkad: normalizeSheetDate(r[0]),
                jamAkad: (r[1] || '08:00').replace(/\s*WIB$/i, '').trim(),
                suamiNama: (r[2] || '').trim(),
                istriNama: (r[3] || '').trim(),
                lokasiAkad,
                kelurahanAkad: (r[5] || '-').trim(),
                penghuluNama: (r[6] || 'Penghulu KUA').trim(),
                status,
              };
            })
            .filter((item) => item.status !== 'Ditolak');
        }
      }
    }
  } catch {
    // Fallback to Register_Nikah below
  }

  // Fallback to Register_Nikah if Jadwal_Publik doesn't exist yet (strictly picking only safe public columns)
  if (!loadedFromPublicTab) {
    const resNikah = await fetch(
      `${baseGviz}?tqx=out:json&sheet=${encodeURIComponent('Register_Nikah')}&headers=1`
    );

    if (!resNikah.ok) {
      throw new Error(
        'Tidak dapat mengakses jadwal Google Sheet. Pastikan izin berbagi disetel ke "Siapa saja yang memiliki link dapat melihat".'
      );
    }

    const textNikah = await resNikah.text();
    if (textNikah.trim().startsWith('<!DOCTYPE') || textNikah.trim().startsWith('<html')) {
      throw new Error(
        'Google Sheet belum dibuka untuk akses publik. Di Google Sheets klik Bagikan -> Siapa saja yang memiliki link (Pelihat).'
      );
    }

    const rowsNikah = parseGvizResponse(textNikah);
    schedules = rowsNikah
      .filter((r) => r[9] && (r[3] || r[5]))
      .map((r, idx) => {
        const lokasiRaw = (r[11] || '').toLowerCase();
        const lokasiAkad: LokasiAkad =
          lokasiRaw.includes('luar') || lokasiRaw.includes('bedol')
            ? 'Luar KUA (Bedol)'
            : 'Di KUA';
        const statusRaw = (r[15] || '').trim() as NikahStatus;
        const status = VALID_STATUSES.includes(statusRaw) ? statusRaw : 'Siap Akad';

        return {
          id: `PUB-REG-${idx + 1}`,
          tanggalAkad: normalizeSheetDate(r[9]),
          jamAkad: (r[10] || '08:00').replace(/\s*WIB$/i, '').trim(),
          suamiNama: (r[3] || '').trim(),
          istriNama: (r[5] || '').trim(),
          lokasiAkad,
          kelurahanAkad: (r[12] || (lokasiAkad === 'Di KUA' ? 'Balai Nikah KUA' : '-')).trim(),
          penghuluNama: (r[14] || 'Penghulu KUA').trim(),
          status,
        };
      })
      .filter((item) => item.status !== 'Ditolak');
  }

  // 2. Optionally fetch Profil_KUA
  const profile: Partial<PublicKuaProfile> = {};
  try {
    const resProfil = await fetch(
      `${baseGviz}?tqx=out:json&sheet=${encodeURIComponent('Profil_KUA')}&headers=1`
    );
    if (resProfil.ok) {
      const profilText = await resProfil.text();
      if (!profilText.trim().startsWith('<!DOCTYPE') && !profilText.trim().startsWith('<html')) {
        const profilRows = parseGvizResponse(profilText);
        profilRows.forEach((row) => {
          const key = (row[0] || '').trim();
          const val = (row[2] || '').trim();
          if (
            key === 'namaKua' ||
            key === 'kecamatan' ||
            key === 'kabupatenKota' ||
            key === 'provinsi' ||
            key === 'alamatLengkap' ||
            key === 'telepon' ||
            key === 'email'
          ) {
            profile[key] = val;
          }
        });
      }
    }
  } catch {
    // Non-fatal
  }

  return {
    schedules,
    profile,
    source: 'google-sheet',
    fetchedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
};

/**
 * Sets "Anyone with the link can view" permission on an app-created Spreadsheet
 * using the Drive API v3 permissions endpoint (works with drive.file scope).
 */
export const enablePublicReadForSpreadsheet = async (
  spreadsheetId: string,
  token: string
): Promise<void> => {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(spreadsheetId)}/permissions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Tidak dapat mengaktifkan akses baca publik otomatis (${res.status}). Silakan buka Google Spreadsheet Anda -> klik "Bagikan" -> ubah Akses Umum menjadi "Siapa saja yang memiliki link: Pelihat". Detail: ${errText}`
    );
  }
};
