import React, { useState, useMemo, useEffect } from 'react';
import {
  HeartHandshake,
  Search,
  Plus,
  Filter,
  Download,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Trash2,
  Eye,
  Phone,
  Bookmark,
  Building,
  Info,
  CalendarDays,
  Grid3X3,
  List,
  FileSpreadsheet,
  BookMarked,
} from 'lucide-react';
import { useKua, getRomanMonth } from '../context/KuaContext';
import { NikahRegistration, NikahStatus, LokasiAkad } from '../types';
import {
  generateBukuRegisterNikahPdf,
  generateModelNPdf,
} from '../lib/pdfGenerator';
import { CoverPreviewModal } from './CoverPreviewModal';
import { JadwalNikahCalendarView } from './JadwalNikahCalendarView';
import {
  getCurrentMonthNumber,
  getCurrentYear,
  getOffsetIsoDate,
} from '../lib/dateUtils';

interface NikahViewProps {
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  onOpenGoogleSheets?: () => void;
  defaultViewMode?: 'kalender' | 'tabel';
}

export const NikahView: React.FC<NikahViewProps> = ({
  isAddModalOpen,
  setIsAddModalOpen,
  onOpenGoogleSheets,
  defaultViewMode = 'tabel',
}) => {
  const {
    nikahList,
    addNikah,
    updateNikah,
    deleteNikah,
    kuaSettings,
    staffList,
    activeStaff,
  } = useKua();

  const [viewMode, setViewMode] = useState<'kalender' | 'tabel'>(defaultViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterLokasi, setFilterLokasi] = useState<string>('Semua');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setViewMode(defaultViewMode);
  }, [defaultViewMode]);

  // Detail & Cover Preview Modals
  const [selectedNikah, setSelectedNikah] = useState<NikahRegistration | null>(null);
  const [coverPreviewNikah, setCoverPreviewNikah] = useState<NikahRegistration | null>(null);

  // Simplified Quick Add Form State
  const [formData, setFormData] = useState({
    suamiNama: '',
    istriNama: '',
    noSimkah: '',
    noHpCatin: '',
    waliNama: '',
    waliHubungan: 'Ayah Kandung',
    tanggalAkad: getOffsetIsoDate(7),
    jamAkad: '09:00',
    lokasiAkad: 'Di KUA' as LokasiAkad,
    kelurahanAkad: kuaSettings.daftarKelurahan?.[0]?.nama || 'Candi',
    alamatAkad: `Balai Nikah KUA Kec. ${kuaSettings.kecamatan || 'Candisari'}`,
    penghuluId: staffList[0]?.id || 'staff-01',
    catatan: '',
  });

  // Filtered List
  const filteredList = useMemo(() => {
    return nikahList.filter((item) => {
      const matchSearch =
        item.suami.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.istri.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.noPendaftaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.noSimkah && item.noSimkah.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.suami.noHp && item.suami.noHp.includes(searchQuery));

      const matchStatus = filterStatus === 'Semua' || item.status === filterStatus;
      const matchLokasi = filterLokasi === 'Semua' || item.lokasiAkad === filterLokasi;

      return matchSearch && matchStatus && matchLokasi;
    });
  }, [nikahList, searchQuery, filterStatus, filterLokasi]);

  const handleSubmitNewNikah = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.suamiNama.trim() || !formData.istriNama.trim()) {
      setFormError('Harap masukkan nama calon suami dan calon istri.');
      return;
    }
    setFormError(null);

    const assignedPenghulu = staffList.find((s) => s.id === formData.penghuluId) || staffList[0];
    const isBedol = formData.lokasiAkad === 'Luar KUA (Bedol)';

    addNikah({
      noSimkah: formData.noSimkah.trim() || undefined,
      suami: {
        nama: formData.suamiNama.trim(),
        noHp: formData.noHpCatin.trim() || undefined,
      },
      istri: {
        nama: formData.istriNama.trim(),
        noHp: formData.noHpCatin.trim() || undefined,
      },
      wali: formData.waliNama.trim()
        ? {
            nama: formData.waliNama.trim(),
            hubungan: formData.waliHubungan,
          }
        : undefined,
      tanggalAkad: formData.tanggalAkad,
      jamAkad: formData.jamAkad,
      lokasiAkad: formData.lokasiAkad,
      kelurahanAkad: formData.kelurahanAkad || undefined,
      alamatAkad: formData.alamatAkad || (isBedol ? 'Luar KUA' : 'Balai Nikah KUA'),
      penghuluId: assignedPenghulu.id,
      penghuluNama: assignedPenghulu.nama,
      status: 'Pendaftaran',
      biayaNikah: isBedol ? 600000 : 0,
      pnbpStatus: isBedol ? 'Menunggu Pembayaran' : 'Gratis (KUA)',
      kodeBillingPnbp: isBedol ? `8${getCurrentYear()}` + Math.floor(10000000 + Math.random() * 90000000) : undefined,
      catatan: formData.catatan.trim() || undefined,
    });

    setIsAddModalOpen(false);
    // Reset form
    setFormData({
      suamiNama: '',
      istriNama: '',
      noSimkah: '',
      noHpCatin: '',
      waliNama: '',
      waliHubungan: 'Ayah Kandung',
      tanggalAkad: getOffsetIsoDate(7),
      jamAkad: '09:00',
      lokasiAkad: 'Di KUA',
      kelurahanAkad: kuaSettings.daftarKelurahan?.[0]?.nama || 'Candi',
      alamatAkad: `Balai Nikah KUA Kec. ${kuaSettings.kecamatan || 'Candisari'}`,
      penghuluId: staffList[0]?.id || 'staff-01',
      catatan: '',
    });
  };

  const getStatusBadge = (status: NikahStatus) => {
    switch (status) {
      case 'Pendaftaran':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pemeriksaan':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Pengumuman':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Siap Akad':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'Selesai':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'Ditolak':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & View Switcher (Kalender Aktivitas vs Buku Register) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-emerald-700" />
            <span>Layanan Kepenghuluan & Akad Nikah KUA {kuaSettings.kecamatan}</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {viewMode === 'tabel'
              ? 'Register Pendaftaran Nikah KUA'
              : 'Kalender & Jadwal Akad Nikah Terpadu'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {viewMode === 'tabel'
              ? 'Daftar lengkap register pendaftaran calon pengantin, cetak cover sampul berkas pendaftaran, dan pembaruan status akta.'
              : 'Pemantauan visual jadwal akad di Balai Nikah (KUA) & Bedol serta alokasi tugas penghulu.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('kalender')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'kalender'
                  ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Kalender Aktivitas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tabel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'tabel'
                  ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Buku Register (Tabel)</span>
            </button>
          </div>

          {/* New Register Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Agenda Nikah</span>
          </button>
        </div>
      </div>

      {/* VIEW CONTENT: Kalender vs Tabel Register */}
      {viewMode === 'kalender' ? (
        <JadwalNikahCalendarView
          hideHeader={true}
          onOpenNewNikah={() => setIsAddModalOpen(true)}
          onSelectNikah={(nikah) => setSelectedNikah(nikah)}
        />
      ) : (
        <div className="space-y-6">
          {/* Information Notice: Local Office Register Context */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950">
              <p className="font-bold">
                Buku Register & Agenda Pelayanan KUA (Pendamping SIMKAH)
              </p>
              <p className="text-emerald-800 mt-0.5">
                Sistem ini berfungsi khusus sebagai pencatatan agenda internal, penjadwalan akad nikah, dan pengawasan tugas penghulu di kantor KUA. Data pengantin dirancang ringkas (tanpa mewajibkan NIK lengkap) untuk mempercepat alur kerja staf kantor.
              </p>
            </div>
          </div>

          {/* Top Action & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama calon pengantin, No. Register, atau Ref SIMKAH..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="Semua">Semua Alur</option>
              <option value="Pendaftaran">Pendaftaran</option>
              <option value="Pemeriksaan">Pemeriksaan</option>
              <option value="Pengumuman">Pengumuman (N5)</option>
              <option value="Siap Akad">Siap Akad</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          {/* Lokasi Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <span>Lokasi:</span>
            <select
              value={filterLokasi}
              onChange={(e) => setFilterLokasi(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="Semua">Semua Lokasi</option>
              <option value="Di KUA">Di Balai Nikah KUA</option>
              <option value="Luar KUA (Bedol)">Luar KUA (Bedol)</option>
            </select>
          </div>

          {/* Export Book Button */}
          <button
            type="button"
            onClick={() => generateBukuRegisterNikahPdf(kuaSettings, filteredList)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            title="Cetak Buku Register Agenda Kantor"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Cetak Register PDF</span>
          </button>

          {/* Google Sheets Sync Button */}
          {onOpenGoogleSheets && (
            <button
              type="button"
              onClick={onOpenGoogleSheets}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                kuaSettings.googleSheetsConfig?.spreadsheetId
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
              title="Kelola sinkronisasi Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{kuaSettings.googleSheetsConfig?.spreadsheetId ? 'Google Sheets (Aktif)' : 'Sync ke Sheets'}</span>
            </button>
          )}

          {/* New Register Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Catat Agenda Nikah</span>
          </button>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-2 px-2.5 text-left whitespace-nowrap">Aksi</th>
                <th className="py-2 px-2 text-center w-9">No</th>
                <th className="py-2 px-2.5">No. Register / SIMKAH</th>
                <th className="py-2 px-2.5">Pasangan Catin</th>
                <th className="py-2 px-2.5">Jadwal Akad</th>
                <th className="py-2 px-2.5">Lokasi &amp; Alamat</th>
                <th className="py-2 px-2.5">Penghulu</th>
                <th className="py-2 px-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Tidak ditemukan agenda pendaftaran nikah yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Aksi (Leftmost) */}
                    <td className="py-2 px-2.5 whitespace-nowrap">
                      {confirmDeleteId === item.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-600 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              deleteNikah(item.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedNikah(item)}
                            className="p-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-300 transition-colors cursor-pointer"
                            title="Detail & Perbarui Status"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCoverPreviewNikah(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-300 transition-colors cursor-pointer"
                            title="Preview & Cetak Cover Pendaftaran Lengkap"
                          >
                            <BookMarked className="w-3 h-3" />
                            <span>Cover</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => generateModelNPdf(kuaSettings, item)}
                            className="p-1 text-slate-800 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer"
                            title="Cetak Bukti Register Agenda PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          {activeStaff.role === 'Kepala KUA' && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="p-1 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-300 transition-colors cursor-pointer"
                              title="Hapus Agenda"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Nomor Urut */}
                    <td className="py-2 px-2 text-center font-mono text-slate-500 font-semibold">
                      {idx + 1}
                    </td>

                    {/* No Pendaftaran & SIMKAH */}
                    <td className="py-2 px-2.5 font-mono whitespace-nowrap">
                      <span className="font-bold text-emerald-800 block leading-tight">{item.noPendaftaran}</span>
                      {item.noSimkah ? (
                        <span className="text-[10px] text-slate-500 flex items-center gap-0.5 leading-tight mt-0.5">
                          <Bookmark className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{item.noSimkah}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic leading-tight">Lokal Kantor</span>
                      )}
                    </td>

                    {/* Pasangan Catin */}
                    <td className="py-2 px-2.5 min-w-[180px]">
                      <div className="font-bold text-slate-900 leading-tight">
                        {item.suami.nama} &amp; {item.istri.nama}
                      </div>
                      {(item.suami.noHp || item.istri.noHp) && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          <span>{item.suami.noHp || item.istri.noHp}</span>
                        </div>
                      )}
                    </td>

                    {/* Jadwal Akad */}
                    <td className="py-2 px-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-mono font-semibold text-slate-800">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>{item.tanggalAkad}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono block pl-4">
                        {item.jamAkad} WIB
                      </span>
                    </td>

                    {/* Lokasi */}
                    <td className="py-2 px-2.5 max-w-[200px]">
                      <span
                        className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          item.lokasiAkad === 'Di KUA'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.lokasiAkad}
                      </span>
                      <span className="block text-[10px] text-slate-600 truncate mt-0.5" title={item.alamatAkad}>
                        {item.alamatAkad}
                      </span>
                    </td>

                    {/* Penghulu */}
                    <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap">
                      <span className="font-medium text-slate-800">
                        {item.penghuluNama.split(',')[0]}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2 px-2.5 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>
            Menampilkan <strong className="text-slate-800">{filteredList.length}</strong> agenda pernikahan kantor
          </span>
          <span className="font-mono text-[11px]">Buku Register KUA · Sinkronisasi Real-Time</span>
        </div>
      </div>
    </div>
  )}

      {/* Quick Add Agenda Modal (Single Screen - Fast & Clean) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Register Agenda KUA
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Catat Agenda Pendaftaran Nikah
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitNewNikah}>
              <div className="p-6 space-y-4 text-xs">
                {formError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-medium">
                    {formError}
                  </div>
                )}
                {/* Nama Pasangan Catin */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Nama Calon Suami *</label>
                    <input
                      type="text"
                      required
                      value={formData.suamiNama}
                      onChange={(e) => setFormData({ ...formData, suamiNama: e.target.value })}
                      placeholder="Contoh: Bagas Aditya Nugraha"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Nama Calon Istri *</label>
                    <input
                      type="text"
                      required
                      value={formData.istriNama}
                      onChange={(e) => setFormData({ ...formData, istriNama: e.target.value })}
                      placeholder="Contoh: Anindya Larasati"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Referensi SIMKAH & Kontak HP */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-medium">
                      No. Referensi SIMKAH (Opsional)
                    </label>
                    <input
                      type="text"
                      value={formData.noSimkah}
                      onChange={(e) => setFormData({ ...formData, noSimkah: e.target.value })}
                      placeholder={`Contoh: SMK-${getCurrentYear()}/${String(getCurrentMonthNumber()).padStart(2, '0')}/0189`}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Masukkan jika catin sudah daftar online di SIMKAH4
                    </span>
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-medium">No. Telepon / WhatsApp Catin</label>
                    <input
                      type="text"
                      value={formData.noHpCatin}
                      onChange={(e) => setFormData({ ...formData, noHpCatin: e.target.value })}
                      placeholder="Contoh: 0812-3456-7890"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Jadwal Pelaksanaan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Tanggal Akad *</label>
                    <input
                      type="date"
                      required
                      value={formData.tanggalAkad}
                      onChange={(e) => setFormData({ ...formData, tanggalAkad: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Jam Akad *</label>
                    <input
                      type="time"
                      required
                      value={formData.jamAkad}
                      onChange={(e) => setFormData({ ...formData, jamAkad: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono font-medium"
                    />
                  </div>
                </div>

                {/* Lokasi & Penghulu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Lokasi Pelaksanaan</label>
                    <select
                      value={formData.lokasiAkad}
                      onChange={(e) => {
                        const val = e.target.value as LokasiAkad;
                        setFormData({
                          ...formData,
                          lokasiAkad: val,
                          alamatAkad: val === 'Di KUA' ? `Balai Nikah KUA Kec. ${kuaSettings.kecamatan || 'Candisari'}` : '',
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-medium"
                    >
                      <option value="Di KUA">Di Balai Nikah KUA (Tarif Rp 0 / Gratis)</option>
                      <option value="Luar KUA (Bedol)">Luar Kantor / Bedol (PNBP Rp 600.000)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Penghulu Ditugaskan</label>
                    <select
                      value={formData.penghuluId}
                      onChange={(e) => setFormData({ ...formData, penghuluId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-medium"
                    >
                      {staffList.filter((s) => s.role === 'Penghulu' || s.role === 'Kepala KUA').map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} ({p.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Kelurahan Wilayah Akad *</label>
                    <select
                      value={formData.kelurahanAkad}
                      onChange={(e) => setFormData({ ...formData, kelurahanAkad: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-medium cursor-pointer"
                    >
                      <option value="">-- Pilih Kelurahan KUA --</option>
                      {kuaSettings.daftarKelurahan?.map((kel) => (
                        <option key={kel.id} value={kel.nama}>
                          Kel. {kel.nama} (Kodepos: {kel.kodePos || '-'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Tempat / Alamat Lengkap Akad</label>
                    <input
                      type="text"
                      value={formData.alamatAkad}
                      onChange={(e) => setFormData({ ...formData, alamatAkad: e.target.value })}
                      placeholder="Contoh: Balai Nikah / Gedung / Masjid / Rumah"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                {/* Wali & Catatan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-medium">Nama Wali (Opsional)</label>
                    <input
                      type="text"
                      value={formData.waliNama}
                      onChange={(e) => setFormData({ ...formData, waliNama: e.target.value })}
                      placeholder="Nama Wali Nikah"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-medium">Catatan Petugas KUA</label>
                    <input
                      type="text"
                      value={formData.catatan}
                      onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                      placeholder="Catatan berkas / briefing pra-nikah..."
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-xs"
                >
                  Simpan Agenda Nikah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail & Status Modal */}
      {selectedNikah && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedNikah.noPendaftaran}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedNikah.suami.nama} &amp; {selectedNikah.istri.nama}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNikah(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-xs">
              {/* Status Update Buttons */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Perbarui Status Alur Kantor:
                </h4>
                <div className="grid grid-cols-5 gap-1 text-center font-medium">
                  {(['Pendaftaran', 'Pemeriksaan', 'Pengumuman', 'Siap Akad', 'Selesai'] as NikahStatus[]).map(
                    (st) => {
                      const isCurrent = selectedNikah.status === st;
                      return (
                        <button
                          key={st}
                          onClick={() => {
                            updateNikah(selectedNikah.id, { status: st });
                            setSelectedNikah({ ...selectedNikah, status: st });
                          }}
                          className={`p-2 rounded text-[11px] border transition-all ${
                            isCurrent
                              ? 'bg-emerald-700 text-white border-emerald-800 font-bold shadow-xs'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          <span className="truncate block">{st}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Overview Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <p><span className="text-slate-500">Pasangan Catin:</span> <strong className="text-slate-900 text-sm">{selectedNikah.suami.nama} &amp; {selectedNikah.istri.nama}</strong></p>
                {selectedNikah.noSimkah && (
                  <p><span className="text-slate-500">Referensi SIMKAH:</span> <strong className="font-mono text-emerald-800">{selectedNikah.noSimkah}</strong></p>
                )}
                {(selectedNikah.suami.noHp || selectedNikah.istri.noHp) && (
                  <p><span className="text-slate-500">Kontak:</span> <span className="font-mono">{selectedNikah.suami.noHp || selectedNikah.istri.noHp}</span></p>
                )}
                {selectedNikah.wali?.nama && (
                  <p><span className="text-slate-500">Wali Nikah:</span> {selectedNikah.wali.nama} ({selectedNikah.wali.hubungan || 'Wali'})</p>
                )}
              </div>

              {/* Akad Schedule */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                <h5 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-1.5">
                  Informasi Akad Nikah
                </h5>
                <p><span className="text-slate-500">Waktu:</span> <strong className="font-mono">{selectedNikah.tanggalAkad} pukul {selectedNikah.jamAkad} WIB</strong></p>
                <p><span className="text-slate-500">Lokasi:</span> <span className="font-bold text-emerald-800">{selectedNikah.lokasiAkad}</span> - {selectedNikah.alamatAkad}</p>
                <p><span className="text-slate-500">Penghulu:</span> {selectedNikah.penghuluNama}</p>
                <p><span className="text-slate-500">Tarif PNBP:</span> Rp {selectedNikah.biayaNikah.toLocaleString('id-ID')} ({selectedNikah.pnbpStatus})</p>
                {selectedNikah.catatan && (
                  <p><span className="text-slate-500">Catatan:</span> {selectedNikah.catatan}</p>
                )}
              </div>

              {/* Akta Nikah numbers if finished */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <h5 className="font-bold text-emerald-900 text-xs">
                  Nomor Akta / Perforasi Buku Nikah
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">No. Akta Nikah:</label>
                    <input
                      type="text"
                      defaultValue={selectedNikah.noAktaNikah || ''}
                      placeholder={`0490/045/${getRomanMonth(getCurrentMonthNumber())}/${getCurrentYear()}`}
                      onBlur={(e) => {
                        updateNikah(selectedNikah.id, { noAktaNikah: e.target.value });
                        setSelectedNikah({ ...selectedNikah, noAktaNikah: e.target.value });
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 block mb-1">No. Perforasi Buku:</label>
                    <input
                      type="text"
                      defaultValue={selectedNikah.noBukuNikah || ''}
                      placeholder="SA-8910291 & SB-..."
                      onBlur={(e) => {
                        updateNikah(selectedNikah.id, { noBukuNikah: e.target.value });
                        setSelectedNikah({ ...selectedNikah, noBukuNikah: e.target.value });
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedNikah;
                    setSelectedNikah(null);
                    setCoverPreviewNikah(target);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-800 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-lg cursor-pointer"
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  <span>Preview &amp; Cetak Cover</span>
                </button>
                <button
                  type="button"
                  onClick={() => generateModelNPdf(kuaSettings, selectedNikah)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Cetak Lembar Agenda</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNikah(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cover Pendaftaran Preview & Checklist Modal */}
      {coverPreviewNikah && (
        <CoverPreviewModal
          nikah={coverPreviewNikah}
          kuaSettings={kuaSettings}
          onClose={() => setCoverPreviewNikah(null)}
          onSaveExtraToNikah={(id, patch) => {
            updateNikah(id, patch);
            setCoverPreviewNikah((prev) => (prev ? { ...prev, ...patch } : null));
          }}
        />
      )}
    </div>
  );
};
