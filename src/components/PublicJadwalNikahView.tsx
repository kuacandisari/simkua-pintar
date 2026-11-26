import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Search,
  RefreshCw,
  Monitor,
  ArrowLeft,
  Building2,
  Home,
  AlertCircle,
  Phone,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';
import {
  PublicNikahScheduleItem,
  PublicKuaProfile,
  extractPublicProfileFromSettings,
  fetchPublicScheduleFromSpreadsheet,
  getPublicScheduleParams,
  sanitizeNikahForPublic,
} from '../lib/publicScheduleService';
import {
  INDONESIAN_MONTHS,
  formatHijriDateIndonesian,
  formatIndonesianDateShort,
  getTodayIsoDate,
} from '../lib/dateUtils';
import { LokasiAkad } from '../types';

interface PublicJadwalNikahViewProps {
  onExitPreview?: () => void;
}

const NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const PublicJadwalNikahView: React.FC<PublicJadwalNikahViewProps> = ({
  onExitPreview,
}) => {
  const { nikahList, kuaSettings } = useKua();
  const urlParams = useMemo(() => getPublicScheduleParams(), []);
  const activeSheetId = urlParams.sheetId || kuaSettings.googleSheetsConfig?.spreadsheetId || '';

  const [viewMode, setViewMode] = useState<'agenda' | 'kalender' | 'tv'>('agenda');
  const [schedules, setSchedules] = useState<PublicNikahScheduleItem[]>(() =>
    urlParams.sheetId ? [] : sanitizeNikahForPublic(nikahList)
  );
  const [kuaProfile, setKuaProfile] = useState<PublicKuaProfile>(() => {
    const base = extractPublicProfileFromSettings(kuaSettings);
    if (urlParams.kuaName) {
      base.namaKua = urlParams.kuaName;
    }
    return base;
  });

  const [dataSource, setDataSource] = useState<'google-sheet' | 'local'>(
    urlParams.sheetId ? 'google-sheet' : 'local'
  );
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(urlParams.sheetId));
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters & calendar state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLokasi, setFilterLokasi] = useState<'Semua' | LokasiAkad>('Semua');
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getTodayIsoDate());
  const [nowClock, setNowClock] = useState<Date>(() => new Date());

  const loadScheduleData = useCallback(async () => {
    if (!activeSheetId) {
      setSchedules(sanitizeNikahForPublic(nikahList));
      setKuaProfile((prev) => ({
        ...extractPublicProfileFromSettings(kuaSettings),
        ...(urlParams.kuaName ? { namaKua: urlParams.kuaName } : {}),
      }));
      setDataSource('local');
      setLastUpdated(
        new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      );
      setIsLoading(false);
      setFetchError(null);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      const result = await fetchPublicScheduleFromSpreadsheet(activeSheetId);
      setSchedules(result.schedules);
      setKuaProfile((prev) => ({
        ...prev,
        ...result.profile,
        ...(urlParams.kuaName && !result.profile.namaKua ? { namaKua: urlParams.kuaName } : {}),
      }));
      setDataSource('google-sheet');
      setLastUpdated(result.fetchedAt);
    } catch (err: any) {
      // If opened locally without ?sheet= query string and Sheet isn't public yet, fallback gracefully to local sanitized data
      if (!urlParams.sheetId && nikahList.length > 0) {
        setSchedules(sanitizeNikahForPublic(nikahList));
        setDataSource('local');
        setLastUpdated(
          new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        );
      } else {
        setFetchError(
          err?.message ||
            'Jadwal nikah publik belum dapat dimuat dari Google Sheet. Pastikan akses berbagi Google Sheet disetel publik (Siapa saja yang memiliki link dapat melihat).'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeSheetId, nikahList, kuaSettings, urlParams.sheetId, urlParams.kuaName]);

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  // Live clock & 5-minute background refresh for TV/kiosk display
  useEffect(() => {
    const clockTimer = window.setInterval(() => {
      setNowClock(new Date());
    }, 30000);
    const refreshTimer = window.setInterval(() => {
      if (activeSheetId) {
        loadScheduleData();
      }
    }, 300000);

    return () => {
      window.clearInterval(clockTimer);
      window.clearInterval(refreshTimer);
    };
  }, [activeSheetId, loadScheduleData]);

  const todayStr = getTodayIsoDate(nowClock);
  const currentMonthPrefix = todayStr.slice(0, 7);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return schedules
      .filter((item) => {
        const matchSearch =
          !q ||
          item.suamiNama.toLowerCase().includes(q) ||
          item.istriNama.toLowerCase().includes(q) ||
          item.kelurahanAkad.toLowerCase().includes(q) ||
          item.penghuluNama.toLowerCase().includes(q);
        const matchLokasi = filterLokasi === 'Semua' || item.lokasiAkad === filterLokasi;
        return matchSearch && matchLokasi;
      })
      .sort((a, b) => {
        const dateCmp = a.tanggalAkad.localeCompare(b.tanggalAkad);
        if (dateCmp !== 0) return dateCmp;
        return a.jamAkad.localeCompare(b.jamAkad);
      });
  }, [schedules, searchQuery, filterLokasi]);

  const todaySchedules = useMemo(
    () => filteredSchedules.filter((s) => s.tanggalAkad === todayStr),
    [filteredSchedules, todayStr]
  );

  const upcomingSchedules = useMemo(
    () => filteredSchedules.filter((s) => s.tanggalAkad > todayStr),
    [filteredSchedules, todayStr]
  );

  const monthTotalCount = useMemo(
    () => schedules.filter((s) => s.tanggalAkad.startsWith(currentMonthPrefix)).length,
    [schedules, currentMonthPrefix]
  );

  // Calendar grid helpers
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();

  const eventsByDate = useMemo(() => {
    const map = new Map<string, PublicNikahScheduleItem[]>();
    filteredSchedules.forEach((item) => {
      const existing = map.get(item.tanggalAkad) || [];
      existing.push(item);
      map.set(item.tanggalAkad, existing);
    });
    return map;
  }, [filteredSchedules]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const numDays = lastDay.getDate();

    let startDow = firstDay.getDay() - 1;
    if (startDow === -1) startDow = 6;

    const days: {
      dayNum: number;
      dateStr: string;
      isCurrentMonth: boolean;
      events: PublicNikahScheduleItem[];
    }[] = [];

    const prevLastDay = new Date(calYear, calMonth, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevLastDay - i;
      const dt = new Date(calYear, calMonth - 1, d);
      const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: false,
        events: eventsByDate.get(dateStr) || [],
      });
    }

    for (let i = 1; i <= numDays; i++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: true,
        events: eventsByDate.get(dateStr) || [],
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const dt = new Date(calYear, calMonth + 1, i);
      const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: false,
        events: eventsByDate.get(dateStr) || [],
      });
    }

    return days;
  }, [calYear, calMonth, eventsByDate]);

  const formatIndoDate = (dateStr: string) => {
    const parts = (dateStr || '').split('-');
    if (parts.length !== 3) return dateStr;
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const d = Number(parts[2]);
    if (isNaN(y) || isNaN(m) || isNaN(d) || !INDONESIAN_MONTHS[m]) return dateStr;
    return `${d} ${INDONESIAN_MONTHS[m]} ${y}`;
  };

  const getPublicStatusLabel = (status: PublicNikahScheduleItem['status']) => {
    switch (status) {
      case 'Selesai':
        return 'Terlaksana';
      case 'Siap Akad':
        return 'Terjadwal · Siap Akad';
      case 'Pengumuman':
        return 'Masa Pengumuman (N4)';
      default:
        return 'Terdaftar';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Clean 3-Zone Public Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single Clean Brand Wordmark */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
              {kuaProfile.namaKua || 'KUA Candisari'}
            </span>
          </div>

          {/* Zone 2: Clean Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                viewMode === 'agenda'
                  ? 'text-emerald-800 border-emerald-700 font-bold'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              Agenda Terdekat
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kalender')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                viewMode === 'kalender'
                  ? 'text-emerald-800 border-emerald-700 font-bold'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              Kalender Bulanan
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tv')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                viewMode === 'tv'
                  ? 'text-emerald-800 border-emerald-700 font-bold'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              Mode Layar KUA
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            {onExitPreview ? (
              <button
                type="button"
                onClick={onExitPreview}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Sistem</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={loadScheduleData}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Perbarui Jadwal</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero / Institutional Schedule Banner */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-medium">
              <span className="font-bold text-emerald-800">Papan Pengumuman Resmi</span>
              <span aria-hidden="true">·</span>
              <span>{formatIndonesianDateShort(nowClock)}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-800 font-semibold">
                {formatHijriDateIndonesian(nowClock)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-balance">
              Jadwal Pelaksanaan Akad Nikah {kuaProfile.namaKua}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Informasi resmi jadwal akad nikah untuk masyarakat di wilayah Kecamatan{' '}
              {kuaProfile.kecamatan || 'Candisari'}, {kuaProfile.kabupatenKota || 'Kota Semarang'}.
              {kuaProfile.alamatLengkap ? ` Bertempat di ${kuaProfile.alamatLengkap}.` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
              <span>
                Sumber:{' '}
                <strong className="text-slate-800">
                  {dataSource === 'google-sheet'
                    ? 'Langsung dari Google Sheet KUA'
                    : 'Pratinjau Perangkat Lokal'}
                </strong>
              </span>
              {lastUpdated && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">Diperbarui {lastUpdated} WIB</span>
                </>
              )}
              {kuaProfile.telepon && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-700" />
                    <span>{kuaProfile.telepon}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 3 Clean Tabular Counters */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center min-w-[96px]">
              <span className="text-[11px] font-semibold text-emerald-800 block">Hari Ini</span>
              <span className="text-2xl font-extrabold text-emerald-900 font-mono tabular-nums mt-1 block">
                {todaySchedules.length}
              </span>
              <span className="text-[11px] text-emerald-700">Akad</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[96px]">
              <span className="text-[11px] font-semibold text-slate-600 block">Akan Datang</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1 block">
                {upcomingSchedules.length}
              </span>
              <span className="text-[11px] text-slate-500">Terjadwal</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center min-w-[96px]">
              <span className="text-[11px] font-semibold text-slate-600 block">Bulan Ini</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums mt-1 block">
                {monthTotalCount}
              </span>
              <span className="text-[11px] text-slate-500">Peristiwa</span>
            </div>
          </div>
        </section>

        {/* Mobile View Switcher */}
        <div className="flex md:hidden items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'agenda' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Agenda
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kalender')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'kalender' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Kalender
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tv')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              viewMode === 'tv' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Layar TV
          </button>
        </div>

        {/* Fetch Error Notice (if Google Sheet is not public yet) */}
        {fetchError && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Jadwal Online Belum Terbuka untuk Umum</strong>
                <p className="text-amber-900 mt-0.5">{fetchError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadScheduleData}
              className="px-3.5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shrink-0 cursor-pointer"
            >
              Coba Muat Ulang
            </button>
          </div>
        )}

        {/* Filter & Search Toolbar (Hidden in TV Kiosk mode for maximum clarity) */}
        {viewMode !== 'tv' && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama calon pengantin, kelurahan, atau penghulu..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3.5 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
              {(['Semua', 'Di KUA', 'Luar KUA (Bedol)'] as const).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setFilterLokasi(loc)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    filterLokasi === loc
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {loc === 'Di KUA' ? 'Balai Nikah KUA' : loc === 'Luar KUA (Bedol)' ? 'Luar KUA' : 'Semua Lokasi'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 animate-pulse"
              >
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-5 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : viewMode === 'agenda' ? (
          /* AGENDA VIEW: Today + Upcoming + All */
          <div className="space-y-8">
            {/* Section: Hari Ini */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-base font-bold text-slate-900">
                  Jadwal Akad Nikah Hari Ini ({formatIndoDate(todayStr)})
                </h2>
                <span className="text-xs font-mono font-bold text-emerald-800">
                  {todaySchedules.length} Acara
                </span>
              </div>

              {todaySchedules.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                  Tidak ada jadwal akad nikah pada hari ini ({formatIndoDate(todayStr)}).
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todaySchedules.map((item) => (
                    <article
                      key={item.id}
                      className="bg-white rounded-xl border border-emerald-200 p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-bold text-emerald-800 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pukul {item.jamAkad} WIB</span>
                        </span>
                        <span className="text-slate-500 font-medium">
                          {item.lokasiAkad === 'Di KUA' ? 'Balai Nikah KUA' : 'Luar KUA'} ·{' '}
                          {item.kelurahanAkad}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {item.suamiNama} &amp; {item.istriNama}
                        </h3>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Penghulu: {item.penghuluNama}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{getPublicStatusLabel(item.status)}</span>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Section: Akan Datang / Semua Agenda Terjadwal */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h2 className="text-base font-bold text-slate-900">
                  Daftar Jadwal Akad Nikah Mendatang
                </h2>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {upcomingSchedules.length} Terjadwal
                </span>
              </div>

              {upcomingSchedules.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                  {filteredSchedules.length > 0
                    ? 'Seluruh jadwal yang cocok telah terlaksana atau berlangsung hari ini.'
                    : 'Belum ada jadwal akad nikah mendatang yang dipublikasikan.'}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="px-4 py-3">Tanggal &amp; Jam</th>
                          <th className="px-4 py-3">Calon Mempelai</th>
                          <th className="px-4 py-3">Tempat / Wilayah</th>
                          <th className="px-4 py-3">Penghulu Bertugas</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {upcomingSchedules.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="font-bold text-slate-900 block font-mono tabular-nums">
                                {formatIndoDate(item.tanggalAkad)}
                              </span>
                              <span className="text-emerald-800 font-mono font-semibold text-[11px]">
                                {item.jamAkad} WIB
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="font-bold text-slate-900 block">
                                {item.suamiNama}
                              </span>
                              <span className="text-slate-600">dengan {item.istriNama}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="font-semibold text-slate-800 block">
                                {item.lokasiAkad === 'Di KUA'
                                  ? 'Balai Nikah KUA'
                                  : 'Luar KUA (Bedol)'}
                              </span>
                              <span className="text-slate-500 text-[11px]">
                                Kel. {item.kelurahanAkad}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-medium text-slate-700">
                              {item.penghuluNama}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-emerald-800 font-semibold">
                              {getPublicStatusLabel(item.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : viewMode === 'kalender' ? (
          /* PUBLIC MONTHLY CALENDAR VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCalendarDate(new Date(calYear, calMonth - 1, 1))}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Bulan Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold text-slate-900 min-w-[150px] text-center font-mono">
                    {INDONESIAN_MONTHS[calMonth]} {calYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalendarDate(new Date(calYear, calMonth + 1, 1))}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Bulan Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCalendarDate(now);
                    setSelectedDateStr(getTodayIsoDate(now));
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                >
                  Hari Ini
                </button>
              </div>

              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2 text-[11px] font-bold text-slate-600">
                {NAMA_HARI.map((h) => (
                  <div key={h}>{h}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
                {calendarDays.map((cell, idx) => {
                  const isSelected = cell.dateStr === selectedDateStr;
                  const isToday = cell.dateStr === todayStr;
                  return (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setSelectedDateStr(cell.dateStr)}
                      className={`min-h-[84px] p-1.5 text-left flex flex-col justify-between transition-colors cursor-pointer ${
                        !cell.isCurrentMonth
                          ? 'bg-slate-50/50 text-slate-400'
                          : isSelected
                          ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-600'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                            isToday
                              ? 'bg-emerald-700 text-white'
                              : cell.isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {cell.dayNum}
                        </span>
                        {cell.events.length > 0 && (
                          <span className="text-[10px] font-mono font-bold text-emerald-800">
                            {cell.events.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5 w-full mt-1">
                        {cell.events.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className="text-[10px] truncate px-1 py-0.5 rounded bg-emerald-100/80 text-emerald-900 font-medium"
                          >
                            {ev.jamAkad} · {ev.suamiNama.split(' ')[0]}
                          </div>
                        ))}
                        {cell.events.length > 2 && (
                          <span className="text-[9px] text-slate-500 px-1 block">
                            +{cell.events.length - 2} lainnya
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800">Agenda Tanggal</span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {formatIndoDate(selectedDateStr)}
                  </h3>
                </div>
                <CalendarDays className="w-5 h-5 text-emerald-700" />
              </div>

              {(eventsByDate.get(selectedDateStr) || []).length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  Tidak ada jadwal akad pada tanggal ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {(eventsByDate.get(selectedDateStr) || []).map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-800">
                          {ev.jamAkad} WIB
                        </span>
                        <span className="text-slate-600 font-medium">
                          {ev.lokasiAkad === 'Di KUA' ? 'Balai Nikah KUA' : 'Luar KUA'}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900">
                        {ev.suamiNama} &amp; {ev.istriNama}
                      </p>
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Kel. {ev.kelurahanAkad}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>{ev.penghuluNama}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MODE LAYAR TV / RUANG TUNGGU KUA */
          <section className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <Monitor className="w-4 h-4" />
                  <span>Layar Informasi Jadwal Akad · {kuaProfile.namaKua}</span>
                </div>
                <h2 className="text-2xl font-extrabold mt-1">
                  Agenda Akad Nikah Hari Ini &amp; Terdekat
                </h2>
              </div>
              <div className="text-left sm:text-right font-mono">
                <div className="text-2xl font-extrabold text-emerald-400 tabular-nums">
                  {nowClock.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </div>
                <div className="text-xs text-slate-400">
                  {formatIndonesianDateShort(nowClock)} · {formatHijriDateIndonesian(nowClock)}
                </div>
              </div>
            </div>

            {todaySchedules.length === 0 && upcomingSchedules.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Belum ada agenda akad nikah terdekat yang terjadwal.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...todaySchedules, ...upcomingSchedules.slice(0, 6)].map((item) => {
                  const isTodayItem = item.tanggalAkad === todayStr;
                  return (
                    <div
                      key={item.id}
                      className={`p-5 rounded-xl border space-y-3 ${
                        isTodayItem
                          ? 'bg-emerald-950/70 border-emerald-600/60'
                          : 'bg-slate-800/70 border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-emerald-300">
                          {isTodayItem ? 'HARI INI' : formatIndoDate(item.tanggalAkad)} ·{' '}
                          {item.jamAkad} WIB
                        </span>
                        <span className="text-slate-300 flex items-center gap-1">
                          {item.lokasiAkad === 'Di KUA' ? (
                            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Home className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span>
                            {item.lokasiAkad === 'Di KUA' ? 'Balai Nikah KUA' : 'Luar KUA'}
                          </span>
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white">
                        {item.suamiNama} &amp; {item.istriNama}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-white/10">
                        <span>Kel. {item.kelurahanAkad}</span>
                        <span>Penghulu: {item.penghuluNama}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Quiet Institutional Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            {kuaProfile.namaKua} · Kementerian Agama Republik Indonesia
          </span>
          <span>
            Data pribadi seperti NIK, nomor telepon, dan rincian PNBP tidak ditampilkan demi privasi.
          </span>
        </div>
      </footer>
    </div>
  );
};
