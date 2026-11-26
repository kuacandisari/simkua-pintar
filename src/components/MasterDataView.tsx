import React, { useState, useMemo, useEffect } from 'react';
import {
  Database,
  MapPin,
  Tag,
  Building2,
  Plus,
  Search,
  Edit3,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Hash,
  RotateCcw,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Check,
  FileText,
  KeyRound,
} from 'lucide-react';
import { useKua, getRomanMonth } from '../context/KuaContext';
import { KelurahanItem } from '../types';
import { getCurrentMonthNumber, getCurrentYear } from '../lib/dateUtils';

interface MasterDataViewProps {
  onOpenGoogleSheets?: () => void;
  onOpenSettings?: () => void;
  embeddedInPengaturan?: boolean;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  onOpenGoogleSheets,
  onOpenSettings,
  embeddedInPengaturan = false,
}) => {
  const {
    kuaSettings,
    updateKuaSettings,
    addKelurahan,
    updateKelurahan,
    deleteKelurahan,
    addCustomKodeSurat,
    deleteCustomKodeSurat,
    getNextNomorSuratKeluarPreview,
    getNextNomorAgendaMasukPreview,
    nikahList,
    suratList,
    arsipList,
    resetTransactionData,
    resetToBlankKua,
    resetToDefaultData,
  } = useKua();

  const [activeTab, setActiveTab] = useState<'formatSurat' | 'kodeSurat' | 'kelurahan' | 'googleSheets'>('formatSurat');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Database Reset Modal State
  const [resetModalType, setResetModalType] = useState<'transaksi' | 'total' | 'demo' | null>(null);

  // Kelurahan Search, Inline Delete & Modal States (Ringkas untuk penomoran & wilayah kerja)
  const [searchKelurahan, setSearchKelurahan] = useState('');
  const [isKelurahanModalOpen, setIsKelurahanModalOpen] = useState(false);
  const [editingKelurahan, setEditingKelurahan] = useState<KelurahanItem | null>(null);
  const [confirmDeleteKelId, setConfirmDeleteKelId] = useState<string | null>(null);
  const [kelurahanForm, setKelurahanForm] = useState({
    nama: '',
    kodePos: '',
    namaLurah: '',
  });

  // Custom Kode Surat States
  const [newKode, setNewKode] = useState('');
  const [newNamaKode, setNewNamaKode] = useState('');
  const [newKategoriKode, setNewKategoriKode] = useState('Kepenghuluan');
  const [searchKode, setSearchKode] = useState('');

  // Profil & Format Nomor Surat Form
  const [profilForm, setProfilForm] = useState({ ...kuaSettings });

  useEffect(() => {
    setProfilForm({ ...kuaSettings });
  }, [kuaSettings]);

  // Live preview based on current profilForm edits (menggunakan bulan & tahun riil)
  const livePreviewSurat = useMemo(() => {
    const sampleKode = kuaSettings.kodeSuratCustomList?.[0]?.kode || 'PW.01';
    const nextNo = (Number(profilForm.counterSuratKeluar) || 0) + 1;
    const padded = String(nextNo).padStart(3, '0');
    const currentYear = String(getCurrentYear());
    const currentMonthNum = getCurrentMonthNumber();
    const currentMonthPad = String(currentMonthNum).padStart(2, '0');
    const currentRoman = getRomanMonth(currentMonthNum);
    const tpl =
      profilForm.formatNomorSuratKeluar?.trim() ||
      'B-{nomor}/KUA.{kodeKua}/{kodeKlasifikasi}/{bulanRomawi}/{tahun}';
    return tpl
      .replace(/\{nomor\}/g, String(nextNo))
      .replace(/\{nomor3\}/g, padded)
      .replace(/\{kodeKua\}/g, profilForm.kodeKua || '33.74.05')
      .replace(/\{kodeKlasifikasi\}/g, sampleKode)
      .replace(/\{bulanRomawi\}/g, currentRoman)
      .replace(/\{bulan\}/g, currentMonthPad)
      .replace(/\{tahun\}/g, currentYear);
  }, [profilForm, kuaSettings.kodeSuratCustomList]);

  const livePreviewAgendaMasuk = useMemo(() => {
    const nextNo = (Number(profilForm.counterAgendaMasuk) || 0) + 1;
    const padded = String(nextNo).padStart(3, '0');
    const currentYear = String(getCurrentYear());
    const currentMonthNum = getCurrentMonthNumber();
    const currentMonthPad = String(currentMonthNum).padStart(2, '0');
    const currentRoman = getRomanMonth(currentMonthNum);
    const tpl = profilForm.formatAgendaMasuk?.trim() || 'AG-SM/{tahun}/{bulan}/{nomor}';
    return tpl
      .replace(/\{nomor\}/g, padded)
      .replace(/\{tahun\}/g, currentYear)
      .replace(/\{bulan\}/g, currentMonthPad)
      .replace(/\{bulanRomawi\}/g, currentRoman);
  }, [profilForm]);

  // Filtered Kelurahan List
  const filteredKelurahan = useMemo(() => {
    return (kuaSettings.daftarKelurahan || []).filter(
      (k) =>
        k.nama.toLowerCase().includes(searchKelurahan.toLowerCase()) ||
        (k.kodePos && k.kodePos.includes(searchKelurahan)) ||
        (k.namaLurah && k.namaLurah.toLowerCase().includes(searchKelurahan.toLowerCase()))
    );
  }, [kuaSettings.daftarKelurahan, searchKelurahan]);

  // Filtered Kode Surat List
  const filteredKodeSurat = useMemo(() => {
    return (kuaSettings.kodeSuratCustomList || []).filter(
      (k) =>
        k.kode.toLowerCase().includes(searchKode.toLowerCase()) ||
        k.nama.toLowerCase().includes(searchKode.toLowerCase()) ||
        k.kategori.toLowerCase().includes(searchKode.toLowerCase())
    );
  }, [kuaSettings.kodeSuratCustomList, searchKode]);

  // Kelurahan Form Handlers
  const handleOpenAddKelurahan = () => {
    setEditingKelurahan(null);
    setKelurahanForm({
      nama: '',
      kodePos: '',
      namaLurah: '',
    });
    setIsKelurahanModalOpen(true);
  };

  const handleOpenEditKelurahan = (item: KelurahanItem) => {
    setEditingKelurahan(item);
    setKelurahanForm({
      nama: item.nama,
      kodePos: item.kodePos || '',
      namaLurah: item.namaLurah || '',
    });
    setIsKelurahanModalOpen(true);
  };

  const handleSubmitKelurahan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kelurahanForm.nama.trim()) {
      setFeedback({ type: 'error', text: 'Nama kelurahan wajib diisi.' });
      return;
    }

    if (editingKelurahan) {
      updateKelurahan(editingKelurahan.id, {
        nama: kelurahanForm.nama.trim(),
        kodePos: kelurahanForm.kodePos.trim(),
        namaLurah: kelurahanForm.namaLurah.trim(),
      });
      setFeedback({ type: 'success', text: `Data Kelurahan ${kelurahanForm.nama.trim()} berhasil diperbarui.` });
    } else {
      addKelurahan({
        nama: kelurahanForm.nama.trim(),
        kodePos: kelurahanForm.kodePos.trim(),
        namaLurah: kelurahanForm.namaLurah.trim(),
      });
      setFeedback({ type: 'success', text: `Kelurahan ${kelurahanForm.nama.trim()} ditambahkan ke wilayah kerja.` });
    }
    setIsKelurahanModalOpen(false);
  };

  // Add Custom Kode Surat
  const handleAddKodeSurat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKode.trim() || !newNamaKode.trim()) {
      setFeedback({ type: 'error', text: 'Harap isi kode surat dan nama klasifikasi.' });
      return;
    }
    const clean = newKode.trim().toUpperCase();
    if (kuaSettings.kodeSuratCustomList.some((k) => k.kode === clean)) {
      setFeedback({ type: 'error', text: `Kode surat ${clean} sudah ada dalam daftar.` });
      return;
    }
    addCustomKodeSurat(clean, newNamaKode, newKategoriKode);
    setNewKode('');
    setNewNamaKode('');
    setFeedback({ type: 'success', text: `Kode surat ${clean} berhasil ditambahkan.` });
  };

  // Save Profil & Format Nomor Surat KUA
  const handleSaveProfil = (e: React.FormEvent) => {
    e.preventDefault();
    updateKuaSettings({
      ...kuaSettings,
      ...profilForm,
    });
    setFeedback({
      type: 'success',
      text: `Format nomor surat & profil ${profilForm.namaKua || 'KUA'} berhasil disimpan secara lokal.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner (standalone) OR Compact Master Sub-tabs (embedded inside Pengaturan) */}
      {!embeddedInPengaturan ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span>Master Data Lokal &amp; Sheet Masing-Masing (Tidak Terpusat)</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Master Data KUA — {kuaSettings.kecamatan || 'Candisari'}
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Kelola format nomor surat, kode surat dinas, data kelurahan singkat untuk penomoran &amp; wilayah kerja, serta koneksi Google Sheet mandiri untuk KUA Anda.
            </p>
          </div>

          <div className="flex flex-wrap p-1 bg-slate-100 rounded-xl text-xs font-semibold shrink-0 gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setProfilForm({ ...kuaSettings });
                setActiveTab('formatSurat');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'formatSurat'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Format Nomor Surat</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kodeSurat')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'kodeSurat'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Kode Surat ({kuaSettings.kodeSuratCustomList?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kelurahan')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'kelurahan'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Data Kelurahan ({kuaSettings.daftarKelurahan?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('googleSheets')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'googleSheets'
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Connect Sheet</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setProfilForm({ ...kuaSettings });
                setActiveTab('formatSurat');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer border ${
                activeTab === 'formatSurat'
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Profil &amp; Format Nomor Surat</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kodeSurat')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer border ${
                activeTab === 'kodeSurat'
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Kode Surat ({kuaSettings.kodeSuratCustomList?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kelurahan')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all cursor-pointer border ${
                activeTab === 'kelurahan'
                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Data Kelurahan ({kuaSettings.daftarKelurahan?.length || 0})</span>
            </button>
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Akun Login &amp; Ganti Password</span>
            </button>
          )}
        </div>
      )}

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-current opacity-60 hover:opacity-100 font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* TAB 1: FORMAT NOMOR SURAT & PROFIL KUA */}
      {activeTab === 'formatSurat' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveProfil} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Format Nomor Surat & Counter */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 text-xs">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>Pengaturan Format Nomor Surat &amp; Agenda</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Template ini dipakai otomatis saat membuat Surat Keluar &amp; Surat Masuk baru.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  Format Nomor Surat Keluar *
                </label>
                <input
                  type="text"
                  required
                  value={profilForm.formatNomorSuratKeluar}
                  onChange={(e) =>
                    setProfilForm({ ...profilForm, formatNomorSuratKeluar: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-xs font-bold text-emerald-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
                <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                  {['{nomor}', '{kodeKua}', '{kodeKlasifikasi}', '{bulanRomawi}', '{tahun}'].map((tok) => (
                    <span
                      key={tok}
                      className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono border border-slate-200"
                    >
                      {tok}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Pratinjau Nomor Surat Keluar Berikutnya:
                </span>
                <code className="text-xs font-mono font-extrabold text-emerald-950 block break-all">
                  {livePreviewSurat}
                </code>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Format Agenda Surat Keluar
                  </label>
                  <input
                    type="text"
                    value={profilForm.formatAgendaKeluar}
                    onChange={(e) =>
                      setProfilForm({ ...profilForm, formatAgendaKeluar: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Format Agenda Surat Masuk
                  </label>
                  <input
                    type="text"
                    value={profilForm.formatAgendaMasuk}
                    onChange={(e) =>
                      setProfilForm({ ...profilForm, formatAgendaMasuk: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    Contoh: {livePreviewAgendaMasuk}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Counter Terakhir Surat Keluar
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={profilForm.counterSuratKeluar ?? 0}
                    onChange={(e) =>
                      setProfilForm({
                        ...profilForm,
                        counterSuratKeluar: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Counter Terakhir Agenda Masuk
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={profilForm.counterAgendaMasuk ?? 0}
                    onChange={(e) =>
                      setProfilForm({
                        ...profilForm,
                        counterAgendaMasuk: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-blue-800"
                  />
                </div>
              </div>
            </div>

            {/* Right: Profil Satker KUA (Prioritas KUA Candisari, bisa disesuaikan semua KUA) */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 text-xs">
              <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span>Profil KUA (Default: KUA Candisari)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Bisa digunakan oleh KUA mana saja dengan data lokal &amp; sheet masing-masing.
                  </p>
                </div>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                    <span>Akun Login &amp; Ganti Password</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Nama Resmi KUA *</label>
                <input
                  type="text"
                  required
                  value={profilForm.namaKua}
                  onChange={(e) => setProfilForm({ ...profilForm, namaKua: e.target.value })}
                  placeholder="KUA Candisari"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Kecamatan *</label>
                  <input
                    type="text"
                    required
                    value={profilForm.kecamatan}
                    onChange={(e) => setProfilForm({ ...profilForm, kecamatan: e.target.value })}
                    placeholder="Candisari"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Kabupaten / Kota *</label>
                  <input
                    type="text"
                    required
                    value={profilForm.kabupatenKota}
                    onChange={(e) => setProfilForm({ ...profilForm, kabupatenKota: e.target.value })}
                    placeholder="Kota Semarang"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Kode KUA *</label>
                  <input
                    type="text"
                    required
                    value={profilForm.kodeKua}
                    onChange={(e) => setProfilForm({ ...profilForm, kodeKua: e.target.value })}
                    placeholder="33.74.05"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Provinsi *</label>
                  <input
                    type="text"
                    required
                    value={profilForm.provinsi}
                    onChange={(e) => setProfilForm({ ...profilForm, provinsi: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Telepon &amp; Email KUA</label>
                  <input
                    type="text"
                    value={profilForm.telepon}
                    onChange={(e) => setProfilForm({ ...profilForm, telepon: e.target.value })}
                    placeholder="(024) 831-4567"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Alamat Lengkap KUA</label>
                <input
                  type="text"
                  value={profilForm.alamatLengkap}
                  onChange={(e) => setProfilForm({ ...profilForm, alamatLengkap: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nama Kepala KUA *</label>
                  <input
                    type="text"
                    required
                    value={profilForm.kepalaKuaNama}
                    onChange={(e) => setProfilForm({ ...profilForm, kepalaKuaNama: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">NIP Kepala KUA *</label>
                  <input
                    type="text"
                    required
                    value={profilForm.kepalaKuaNip}
                    onChange={(e) => setProfilForm({ ...profilForm, kepalaKuaNip: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Format &amp; Profil KUA</span>
                </button>
              </div>
            </div>
          </form>

          {/* Compact Database Reset Controls (untuk memulai KUA baru atau kosongkan transaksi) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>Reset &amp; Pengelolaan Database Lokal KUA</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Saat ini tersimpan lokal: <strong>{nikahList.length}</strong> nikah · <strong>{suratList.length}</strong> surat · <strong>{arsipList.length}</strong> arsip.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900">1. Kosongkan Data Transaksi</h4>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Hapus contoh nikah, surat, dan arsip ke 0 tanpa menghapus profil KUA, kelurahan, &amp; kode surat.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalType('transaksi')}
                  className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                >
                  Kosongkan Transaksi
                </button>
              </div>

              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900">2. Reset Bersih Total (KUA Baru)</h4>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Kosongkan transaksi, profil KUA, dan daftar kelurahan untuk memulai setup KUA baru dari nol.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalType('total')}
                  className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                >
                  Reset Bersih Total
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900">3. Pulihkan Data KUA Candisari</h4>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Kembalikan profil &amp; data awal KUA Kecamatan Candisari (Kepala KUA &amp; Penghulu).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalType('demo')}
                  className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                >
                  Pulihkan Data Candisari
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KODE SURAT */}
      {activeTab === 'kodeSurat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Form */}
          <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-xs h-fit space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>Tambah Kode Klasifikasi Surat</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Digunakan untuk pilihan kode surat dinas otomatis.
              </p>
            </div>

            <form onSubmit={handleAddKodeSurat} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Kode Surat *</label>
                <input
                  type="text"
                  required
                  value={newKode}
                  onChange={(e) => setNewKode(e.target.value.toUpperCase())}
                  placeholder="Contoh: PW.03 atau HM.01"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Nama Klasifikasi *</label>
                <input
                  type="text"
                  required
                  value={newNamaKode}
                  onChange={(e) => setNewNamaKode(e.target.value)}
                  placeholder="Contoh: Rekomendasi Nikah Luar Wilayah"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Kategori</label>
                <select
                  value={newKategoriKode}
                  onChange={(e) => setNewKategoriKode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white cursor-pointer"
                >
                  <option value="Kepenghuluan">Kepenghuluan</option>
                  <option value="Syariah">Syariah &amp; Kemasjidan</option>
                  <option value="Zawa">Zakat &amp; Wakaf</option>
                  <option value="Kepegawaian">Kepegawaian</option>
                  <option value="Keuangan">Keuangan / PNBP</option>
                  <option value="Humas">Humas &amp; Umum</option>
                  <option value="Hukum">Hukum &amp; Advokasi</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simpan Kode Surat</span>
              </button>
            </form>
          </div>

          {/* List of Custom Codes */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKode}
                  onChange={(e) => setSearchKode(e.target.value)}
                  placeholder="Cari kode atau nama..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>

              <span className="text-xs text-slate-500 font-mono">
                Total: <strong>{filteredKodeSurat.length}</strong> Kode
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
              {filteredKodeSurat.map((k) => (
                <div key={k.kode} className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                      {k.kode}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{k.nama}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Kategori: {k.kategori}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      deleteCustomKodeSurat(k.kode);
                      setFeedback({ type: 'success', text: `Kode surat ${k.kode} dihapus.` });
                    }}
                    className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Kode Klasifikasi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATA KELURAHAN SINGKAT (UNTUK PENOMORAN & WILAYAH KERJA) */}
      {activeTab === 'kelurahan' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Data Kelurahan Singkat — Wilayah Kerja &amp; Penomoran KUA {kuaSettings.kecamatan || 'Candisari'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Daftar ringkas kelurahan/desa beserta kode wilayah/pos untuk pilihan domisili &amp; lokasi akad nikah.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKelurahan}
                  onChange={(e) => setSearchKelurahan(e.target.value)}
                  placeholder="Cari kelurahan / kodepos..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white w-48"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenAddKelurahan}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Kelurahan</span>
              </button>
            </div>
          </div>

          {/* Concise Kelurahan Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="py-2 px-2.5 text-left whitespace-nowrap w-24">Aksi</th>
                    <th className="py-2 px-2 text-center w-10">No</th>
                    <th className="py-2 px-3">Nama Kelurahan / Desa</th>
                    <th className="py-2 px-3 w-36">Kode Pos / Wilayah</th>
                    <th className="py-2 px-3">Nama Lurah / Kades (Opsional)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKelurahan.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Belum ada data kelurahan yang terdaftar. Klik "+ Tambah Kelurahan" untuk menambahkan.
                      </td>
                    </tr>
                  ) : (
                    filteredKelurahan.map((item, idx) => {
                      const isConfirming = confirmDeleteKelId === item.id;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2 px-2.5 whitespace-nowrap">
                            {isConfirming ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteKelId(null)}
                                  className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-600 cursor-pointer"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteKelurahan(item.id);
                                    setConfirmDeleteKelId(null);
                                    setFeedback({ type: 'success', text: `Kelurahan ${item.nama} dihapus.` });
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
                                  onClick={() => handleOpenEditKelurahan(item)}
                                  className="p-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors cursor-pointer"
                                  title="Edit Kelurahan"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteKelId(item.id)}
                                  className="p-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded transition-colors cursor-pointer"
                                  title="Hapus Kelurahan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-500 font-semibold">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            Kel. {item.nama}
                          </td>
                          <td className="py-2 px-3 font-mono text-emerald-800 font-semibold">
                            {item.kodePos || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {item.namaLurah || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONNECT SHEET (DATA LOKAL DI SHEET MASING-MASING KUA) */}
      {activeTab === 'googleSheets' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Database Lokal di Google Sheet Masing-Masing (Tidak Terpusat)</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Connect Sheet — KUA {kuaSettings.kecamatan || 'Candisari'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Setiap KUA menyimpan datanya secara lokal di browser dan menyinkronkannya langsung ke file Google Spreadsheet milik akun Google KUA masing-masing (gratis, aman, tidak terpusat).
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenGoogleSheets}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer self-start md:self-auto"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {kuaSettings.googleSheetsConfig?.spreadsheetId
                  ? 'Kelola & Sinkronisasi Sheet'
                  : 'Connect Google Sheet'}
              </span>
            </button>
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Register Nikah
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {nikahList.length}
                </span>
                <span className="text-xs text-slate-500">Berkas Lokal</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Register Surat Dinas
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {suratList.length}
                </span>
                <span className="text-xs text-slate-500">Surat Masuk &amp; Keluar</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Wilayah Kelurahan
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {kuaSettings.daftarKelurahan?.length || 0}
                </span>
                <span className="text-xs text-slate-500">Kelurahan</span>
              </div>
            </div>
          </div>

          {/* Detail Spreadsheet Card */}
          {kuaSettings.googleSheetsConfig?.spreadsheetId ? (
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {kuaSettings.googleSheetsConfig.spreadsheetTitle}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Akun: {kuaSettings.googleSheetsConfig.userEmail || 'Terhubung'} · ID:{' '}
                      {kuaSettings.googleSheetsConfig.spreadsheetId}
                    </p>
                  </div>
                </div>

                <a
                  href={kuaSettings.googleSheetsConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Google Drive</span>
                </a>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        kuaSettings.googleSheetsConfig.autoSyncEnabled
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-slate-300'
                      }`}
                    />
                    <span>
                      Auto-Sync:{' '}
                      <strong className="text-slate-800">
                        {kuaSettings.googleSheetsConfig.autoSyncEnabled ? 'Aktif' : 'Non-aktif'}
                      </strong>
                    </span>
                  </span>
                  <span>·</span>
                  <span>
                    Terakhir sinkron:{' '}
                    <strong className="text-slate-800">
                      {kuaSettings.googleSheetsConfig.lastSyncedAt || 'Belum ada'}
                    </strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onOpenGoogleSheets}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Buka Panel Connect Sheet &rarr;</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 border border-dashed border-slate-300 rounded-2xl text-center bg-slate-50/50 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Belum Terhubung ke Google Sheet KUA Anda
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hubungkan akun Google KUA Anda untuk membuat atau menautkan Google Sheet pribadi milik KUA Anda sendiri.
              </p>
              <button
                type="button"
                onClick={onOpenGoogleSheets}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Connect Google Sheet Sekarang</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL UNTUK RESET */}
      {resetModalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                    resetModalType === 'demo' ? 'bg-blue-600' : 'bg-rose-600'
                  }`}
                >
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {resetModalType === 'transaksi' && 'Konfirmasi Kosongkan Data Transaksi'}
                    {resetModalType === 'total' && 'Konfirmasi Reset Bersih Total'}
                    {resetModalType === 'demo' && 'Konfirmasi Pulihkan Data KUA Candisari'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Memperbarui penyimpanan lokal browser Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalType(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs text-slate-700">
              {resetModalType === 'transaksi' && (
                <p className="leading-relaxed">
                  Seluruh {nikahList.length} Register Nikah, {suratList.length} Surat Dinas, dan {arsipList.length} Arsip Digital akan dihapus. Profil KUA, kode surat, dan kelurahan tetap aman.
                </p>
              )}
              {resetModalType === 'total' && (
                <p className="leading-relaxed text-rose-900 font-medium">
                  Semua transaksi, profil KUA, dan daftar kelurahan akan dikosongkan agar Anda bisa mengisi profil KUA baru dari awal.
                </p>
              )}
              {resetModalType === 'demo' && (
                <p className="leading-relaxed">
                  Sistem akan memulihkan data awal KUA Candisari Kota Semarang beserta data Kepala KUA &amp; Penghulu.
                </p>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setResetModalType(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (resetModalType === 'transaksi') {
                    resetTransactionData();
                    setFeedback({ type: 'success', text: 'Data transaksi dikosongkan ke 0. Profil & kelurahan tetap aman.' });
                  } else if (resetModalType === 'total') {
                    resetToBlankKua();
                    setActiveTab('formatSurat');
                    setFeedback({ type: 'success', text: 'Database direset bersih total. Silakan isi Profil KUA Anda.' });
                  } else if (resetModalType === 'demo') {
                    resetToDefaultData();
                    setFeedback({ type: 'success', text: 'Data awal KUA Candisari berhasil dipulihkan.' });
                  }
                  setResetModalType(null);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer ${
                  resetModalType === 'demo'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Ya, Lanjutkan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tambah / Edit Kelurahan Singkat */}
      {isKelurahanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingKelurahan ? 'Edit Data Kelurahan' : 'Tambah Kelurahan Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsKelurahanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitKelurahan}>
              <div className="p-5 space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nama Kelurahan / Desa *</label>
                  <input
                    type="text"
                    required
                    value={kelurahanForm.nama}
                    onChange={(e) => setKelurahanForm({ ...kelurahanForm, nama: e.target.value })}
                    placeholder="Contoh: Candi, Jatingaleh, Jomblang..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Kode Pos / Kode Wilayah</label>
                  <input
                    type="text"
                    value={kelurahanForm.kodePos}
                    onChange={(e) => setKelurahanForm({ ...kelurahanForm, kodePos: e.target.value })}
                    placeholder="50257"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nama Lurah / Kepala Desa (Opsional)</label>
                  <input
                    type="text"
                    value={kelurahanForm.namaLurah}
                    onChange={(e) => setKelurahanForm({ ...kelurahanForm, namaLurah: e.target.value })}
                    placeholder="Opsional"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsKelurahanModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingKelurahan ? 'Simpan Perubahan' : 'Tambahkan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
