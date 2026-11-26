/**
 * Utilitas tanggal & kalender Masehi / Hijriah berbasis waktu lokal riil perangkat.
 */

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const HIJRI_MONTHS_ID: Record<number, string> = {
  1: 'Muharram',
  2: 'Safar',
  3: 'Rabiul Awal',
  4: 'Rabiul Akhir',
  5: 'Jumadil Awal',
  6: 'Jumadil Akhir',
  7: 'Rajab',
  8: 'Syaban',
  9: 'Ramadan',
  10: 'Syawal',
  11: 'Zulkaidah',
  12: 'Zulhijah',
};

/**
 * Mengembalikan tanggal lokal hari ini dalam format YYYY-MM-DD.
 */
export function getTodayIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Mengembalikan tanggal lokal bergeser N hari dari hari ini (YYYY-MM-DD).
 */
export function getOffsetIsoDate(daysOffset: number, baseDate: Date = new Date()): string {
  const d = new Date(baseDate.getTime());
  d.setDate(d.getDate() + daysOffset);
  return getTodayIsoDate(d);
}

export function getCurrentYear(date: Date = new Date()): number {
  return date.getFullYear();
}

export function getCurrentMonthNumber(date: Date = new Date()): number {
  return date.getMonth() + 1;
}

export function getCurrentYearMonth(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getCurrentIndonesianMonthName(date: Date = new Date()): string {
  return INDONESIAN_MONTHS[date.getMonth()] || 'Januari';
}

/**
 * Contoh hasil: "Kamis, 26 Nov 2026"
 */
export function formatIndonesianDateShort(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return getTodayIsoDate(date);
  }
}

/**
 * Mengonversi tanggal Masehi riil ke tanggal Hijriah berbahasa Indonesia
 * menggunakan kalender Umm al-Qura bawaan Intl browser.
 */
export function formatHijriDateIndonesian(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(date);
    const day = parts.find((p) => p.type === 'day')?.value;
    const monthNum = Number(parts.find((p) => p.type === 'month')?.value);
    const year = parts.find((p) => p.type === 'year')?.value;

    if (day && monthNum && year) {
      const monthName = HIJRI_MONTHS_ID[monthNum] || `Bulan ${monthNum}`;
      return `${day} ${monthName} ${year} H`;
    }
  } catch {
    // Fallback to standard islamic calendar if umalqura unsupported
  }

  try {
    const fallback = new Intl.DateTimeFormat('id-ID-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
    return fallback.includes('H') ? fallback : `${fallback} H`;
  } catch {
    return '';
  }
}
