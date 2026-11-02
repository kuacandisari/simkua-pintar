import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  HeartHandshake,
  Plus,
  Filter,
  Search,
  Building,
  Home,
  CheckCircle2,
  AlertCircle,
  FileText,
  Phone,
  CalendarDays,
  List,
  Grid3X3,
  Sparkles,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';
import { NikahRegistration, LokasiAkad, NikahStatus } from '../types';

interface JadwalNikahCalendarViewProps {
  onOpenNewNikah: () => void;
  onSelectNikah?: (nikah: NikahRegistration) => void;
  hideHeader?: boolean;
}

const NAMA_BULAN = [
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
];

const NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const JadwalNikahCalendarView: React.FC<JadwalNikahCalendarViewProps> = ({
  onOpenNewNikah,
  onSelectNikah,
  hideHeader = false,
}) => {
  const { nikahList, staffList, kuaSettings } = useKua();

  // Active viewing month & year (Default: Oktober 2026 to match application demo data)
  const [currentDate, setCurrentDate] = useState(() => {
    // If demo data has dates in 2026-10, default to that month for great instant UX
    return new Date(2026, 9, 14); // 14 Oktober 2026
  });

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-10-18');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLokasi, setFilterLokasi] = useState<'Semua' | LokasiAkad>('Semua');
  const [filterPenghulu, setFilterPenghulu] = useState<string>('Semua');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 9, 14));
    setSelectedDateStr('2026-10-14');
  };

  // Filtered nikah records
  const filteredNikahList = useMemo(() => {
    return nikahList.filter((n) => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        n.suami.nama.toLowerCase().includes(q) ||
        n.istri.nama.toLowerCase().includes(q) ||
        n.penghuluNama.toLowerCase().includes(q) ||
        n.alamatAkad.toLowerCase().includes(q) ||
        (n.noSimkah && n.noSimkah.toLowerCase().includes(q)) ||
        (n.kelurahanAkad && n.kelurahanAkad.toLowerCase().includes(q));

      // Filter Lokasi
      const matchLokasi = filterLokasi === 'Semua' || n.lokasiAkad === filterLokasi;

      // Filter Penghulu
      const matchPenghulu = filterPenghulu === 'Semua' || n.penghuluNama === filterPenghulu;

      return matchSearch && matchLokasi && matchPenghulu;
    });
  }, [nikahList, searchQuery, filterLokasi, filterPenghulu]);

  // Group events by date string (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, NikahRegistration[]>();
    filteredNikahList.forEach((n) => {
      const list = map.get(n.tanggalAkad) || [];
      list.push(n);
      map.set(n.tanggalAkad, list);
    });
    return map;
  }, [filteredNikahList]);

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const thisMonthNikah = nikahList.filter((n) => n.tanggalAkad.startsWith(monthPrefix));

    const diKua = thisMonthNikah.filter((n) => n.lokasiAkad === 'Di KUA').length;
    const bedol = thisMonthNikah.filter((n) => n.lokasiAkad === 'Luar KUA (Bedol)').length;
    const selesai = thisMonthNikah.filter((n) => n.status === 'Selesai').length;

    return {
      total: thisMonthNikah.length,
      diKua,
      bedol,
      selesai,
    };
  }, [nikahList, currentYear, currentMonth]);

  // Calendar Grid Days Calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const numDays = lastDayOfMonth.getDate();

    // In JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday.
    // We want Monday as index 0, Sunday as index 6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: {
      dayNum: number;
      dateStr: string;
      isCurrentMonth: boolean;
      events: NikahRegistration[];
    }[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, day);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        dayNum: day,
        dateStr,
        isCurrentMonth: false,
        events: eventsByDate.get(dateStr) || [],
      });
    }

    // Current month days
    for (let i = 1; i <= numDays; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: true,
        events: eventsByDate.get(dateStr) || [],
      });
    }

    // Next month padding days to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(currentYear, currentMonth + 1, i);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNum: i,
        dateStr,
        isCurrentMonth: false,
        events: eventsByDate.get(dateStr) || [],
      });
    }

    return days;
  }, [currentYear, currentMonth, eventsByDate]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    return eventsByDate.get(selectedDateStr) || [];
  }, [eventsByDate, selectedDateStr]);

  // Format date helper
  const formatIndoDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return `${d} ${NAMA_BULAN[m]} ${y}`;
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  // Distinct penghulu list for filter
  const penghuluOptions = useMemo(() => {
    const set = new Set<string>();
    staffList.forEach((s) => {
      if (s.role === 'Penghulu' || s.role === 'Kepala KUA') {
        set.add(s.nama);
      }
    });
    nikahList.forEach((n) => {
      if (n.penghuluNama) set.add(n.penghuluNama);
    });
    return Array.from(set);
  }, [staffList, nikahList]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner / Hero (Optional if embedded) */}
      {!hideHeader && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
              <CalendarDays className="w-3.5 h-3.5 text-emerald-700" />
              <span>Agenda Pelayanan Akad Nikah KUA {kuaSettings.kecamatan}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Kalender & Jadwal Akad Nikah Terpadu
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Pemantauan visual jadwal akad nikah di Balai Nikah KUA maupun di luar kantor (Bedol), penugasan penghulu bertugas, dan status persiapan dokumen.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={onOpenNewNikah}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Jadwalkan Akad Baru</span>
            </button>
          </div>
        </div>
      )}

      {/* Monthly Statistics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Akad {NAMA_BULAN[currentMonth]}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {monthlyStats.total}
            </span>
            <span className="text-xs text-slate-500">Peristiwa</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Di Balai Nikah (KUA)
            </span>
            <Building className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-emerald-800 font-mono">
              {monthlyStats.diKua}
            </span>
            <span className="text-xs text-emerald-700 font-medium">Gratis (Rp 0)</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
              Luar Balai Nikah (Bedol)
            </span>
            <Home className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-amber-800 font-mono">
              {monthlyStats.bedol}
            </span>
            <span className="text-xs text-amber-700 font-medium">PNBP Rp 600rb</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-blue-200 bg-blue-50/30 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">
            Akad Telah Terlaksana
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-blue-800 font-mono">
              {monthlyStats.selesai}
            </span>
            <span className="text-xs text-blue-600">Selesai Dicatat</span>
          </div>
        </div>
      </div>

      {/* Calendar Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Bulan Sebelumnya"
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 min-w-[140px] text-center font-mono">
              {NAMA_BULAN[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              title="Bulan Berikutnya"
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
          >
            Hari Ini
          </button>
        </div>

        {/* Filters & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search box */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari catin / lokasi..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>

          {/* Filter Lokasi */}
          <select
            value={filterLokasi}
            onChange={(e) => setFilterLokasi(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            <option value="Semua">Semua Lokasi</option>
            <option value="Di KUA">Di KUA (Balai Nikah)</option>
            <option value="Luar KUA (Bedol)">Bedol (Luar KUA)</option>
          </select>

          {/* Filter Penghulu */}
          <select
            value={filterPenghulu}
            onChange={(e) => setFilterPenghulu(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer max-w-[160px] truncate"
          >
            <option value="Semua">Semua Penghulu</option>
            {penghuluOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* View Toggle (Grid vs List) */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'calendar' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-slate-500'
              }`}
              title="Tampilan Kalender Bulanan"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kalender</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === 'list' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-slate-500'
              }`}
              title="Tampilan Daftar Agenda"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Daftar</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN VIEW: Calendar Grid or Agenda List */}
      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: 7-Column Calendar Grid (2 Cols Wide) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
              {NAMA_HARI.map((h, i) => (
                <div key={h} className={i >= 5 ? 'text-amber-700 font-extrabold' : ''}>
                  {h}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 flex-1">
              {calendarDays.map((cell, idx) => {
                const isSelected = cell.dateStr === selectedDateStr;
                const isToday = cell.dateStr === '2026-10-14';
                const hasEvents = cell.events.length > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={`min-h-[92px] sm:min-h-[105px] p-1.5 sm:p-2 transition-all cursor-pointer flex flex-col justify-between group ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-50/40 text-slate-400'
                        : isSelected
                        ? 'bg-emerald-50/50 ring-2 ring-emerald-600/40 z-10'
                        : 'bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Day number header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          isToday
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : isSelected
                            ? 'bg-emerald-100 text-emerald-900 font-extrabold'
                            : cell.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-300'
                        }`}
                      >
                        {cell.dayNum}
                      </span>

                      {hasEvents && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                          {cell.events.length}
                        </span>
                      )}
                    </div>

                    {/* Events preview chips */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {cell.events.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded leading-tight truncate font-medium flex items-center gap-1 border ${
                            ev.lokasiAkad === 'Di KUA'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}
                          title={`${ev.jamAkad} - ${ev.suami.nama} & ${ev.istri.nama} (${ev.lokasiAkad})`}
                        >
                          <span className="font-mono font-bold shrink-0">{ev.jamAkad}</span>
                          <span className="truncate">
                            {ev.suami.nama.split(' ')[0]} & {ev.istri.nama.split(' ')[0]}
                          </span>
                        </div>
                      ))}

                      {cell.events.length > 2 && (
                        <span className="text-[9px] text-slate-500 font-semibold block px-1">
                          +{cell.events.length - 2} akad lainnya
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Date Itinerary & Details (1 Col Wide) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                    Agenda Terpilih
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    {formatIndoDate(selectedDateStr)}
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {selectedDateEvents.length} Jadwal
                </span>
              </div>

              {/* Event Cards List for Selected Date */}
              <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-10 px-4 text-slate-400">
                    <CalendarIcon className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                    <p className="text-xs font-semibold text-slate-600">
                      Tidak ada jadwal akad nikah
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Belum ada pasangan yang terjadwal pada tanggal {formatIndoDate(selectedDateStr)}.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenNewNikah}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Jadwalkan Akad</span>
                    </button>
                  </div>
                ) : (
                  selectedDateEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onSelectNikah?.(ev)}
                      className="p-3.5 bg-slate-50/70 hover:bg-emerald-50/70 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all text-xs space-y-2 group cursor-pointer shadow-2xs"
                      title="Klik untuk melihat berkas & status pendaftaran"
                    >
                      {/* Jam & Lokasi Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-extrabold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-700" />
                          <span>{ev.jamAkad} WIB</span>
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            ev.lokasiAkad === 'Di KUA'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          {ev.lokasiAkad}
                        </span>
                      </div>

                      {/* Nama Pasangan */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-emerald-900">
                          {ev.suami.nama}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">dengan</span>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-emerald-900">
                          {ev.istri.nama}
                        </h4>
                      </div>

                      {/* Lokasi / Alamat */}
                      <div className="text-[11px] text-slate-600 flex items-start gap-1.5 pt-1 border-t border-slate-200/60">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {ev.alamatAkad}
                          {ev.kelurahanAkad ? ` (${ev.kelurahanAkad})` : ''}
                        </span>
                      </div>

                      {/* Penghulu */}
                      <div className="text-[11px] text-slate-700 flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-700" />
                          <span className="font-medium truncate max-w-[160px]">
                            {ev.penghuluNama}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                          {ev.status}
                        </span>
                      </div>

                      {/* Quick click hint */}
                      <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-emerald-700 font-semibold group-hover:text-emerald-800">
                        <span>Buka Detail &amp; Model N &rarr;</span>
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Legend at footer */}
            <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 block">Keterangan Lokasi:</span>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Di Balai Nikah (KUA)</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Bedol (Luar KUA)</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW / TIMELINE AGENDA */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Daftar Seluruh Jadwal Akad Nikah ({filteredNikahList.length} Peristiwa)
              </h3>
              <p className="text-[11px] text-slate-500">
                Urutan kronologis pelaksanaan pernikahan berdasar tanggal dan waktu
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Waktu & Tanggal</th>
                  <th className="px-4 py-3">Calon Pengantin (Suami & Istri)</th>
                  <th className="px-4 py-3">Lokasi Akad</th>
                  <th className="px-4 py-3">Penghulu Petugas</th>
                  <th className="px-4 py-3">Status Berkas</th>
                  <th className="px-4 py-3">Biaya / PNBP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNikahList.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectNikah?.(item)}
                    className="hover:bg-emerald-50/60 transition-colors cursor-pointer group"
                    title="Klik untuk membuka detail pendaftaran & cetak Model N"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 block">
                        {formatIndoDate(item.tanggalAkad)}
                      </span>
                      <span className="text-[11px] text-emerald-800 font-mono font-semibold flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {item.jamAkad} WIB
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <strong className="text-slate-900 block">{item.suami.nama}</strong>
                      <span className="text-slate-600 block text-[11px]">
                        dengan {item.istri.nama}
                      </span>
                      {item.noSimkah && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          SIMKAH: {item.noSimkah}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mb-1 ${
                          item.lokasiAkad === 'Di KUA'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}
                      >
                        {item.lokasiAkad}
                      </span>
                      <span className="block text-[11px] text-slate-600 line-clamp-1">
                        {item.alamatAkad}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 block">
                        {item.penghuluNama}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        NIP / ID: {item.penghuluId}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.biayaNikah === 0 ? (
                        <span className="text-xs font-bold text-emerald-700">Rp 0 (Gratis)</span>
                      ) : (
                        <div>
                          <span className="text-xs font-bold text-amber-800 font-mono block">
                            Rp 600.000
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.pnbpStatus}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
