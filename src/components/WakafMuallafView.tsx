import React, { useState, useMemo } from 'react';
import {
  Landmark,
  HeartHandshake,
  Plus,
  Search,
  Edit3,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  MapPin,
  UserCheck,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';
import {
  MuallafRecord,
  WakafPeruntukan,
  WakafRecord,
  WakafStatusSertifikat,
} from '../types';
import { exportDataToCsv } from '../lib/googleSheetsService';
import {
  getCurrentMonthNumber,
  getCurrentYear,
  getTodayIsoDate,
} from '../lib/dateUtils';

export const WakafMuallafView: React.FC = () => {
  const {
    kuaSettings,
    staffList,
    wakafList,
    muallafList,
    addWakaf,
    updateWakaf,
    deleteWakaf,
    addMuallaf,
    updateMuallaf,
    deleteMuallaf,
  } = useKua();

  const [activeTab, setActiveTab] = useState<'wakaf' | 'muallaf'>('wakaf');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Inline Delete Confirmations
  const [confirmDeleteWakafId, setConfirmDeleteWakafId] = useState<string | null>(null);
  const [confirmDeleteMuallafId, setConfirmDeleteMuallafId] = useState<string | null>(null);

  // Wakaf Modal State
  const [isWakafModalOpen, setIsWakafModalOpen] = useState(false);
  const [editingWakaf, setEditingWakaf] = useState<WakafRecord | null>(null);
  const [wakafForm, setWakafForm] = useState({
    noAktaIkrar: '',
    tglIkrar: getTodayIsoDate(),
    wakifNama: '',
    nadzirNama: '',
    kelurahan: kuaSettings.daftarKelurahan?.[0]?.nama || 'Candi',
    alamatTanah: '',
    luasM2: 200,
    peruntukan: 'Masjid' as WakafPeruntukan,
    statusSertifikat: 'Proses AIW' as WakafStatusSertifikat,
    keterangan: '',
  });

  // Muallaf Modal State
  const [isMuallafModalOpen, setIsMuallafModalOpen] = useState(false);
  const [editingMuallaf, setEditingMuallaf] = useState<MuallafRecord | null>(null);
  const [muallafForm, setMuallafForm] = useState({
    noRegister: '',
    tglIkrar: getTodayIsoDate(),
    namaLengkap: '',
    tempatTglLahir: '',
    jenisKelamin: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    alamat: '',
    kelurahan: kuaSettings.daftarKelurahan?.[0]?.nama || 'Candi',
    agamaSebelumnya: 'Kristen',
    pembimbingNama: staffList[0]?.nama || 'Kepala KUA',
    saksi1: staffList[1]?.nama || '',
    saksi2: '',
    keterangan: '',
  });

  // Filtered Lists
  const filteredWakaf = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return wakafList.filter(
      (w) =>
        !q ||
        w.noAktaIkrar.toLowerCase().includes(q) ||
        w.wakifNama.toLowerCase().includes(q) ||
        w.nadzirNama.toLowerCase().includes(q) ||
        w.kelurahan.toLowerCase().includes(q) ||
        w.peruntukan.toLowerCase().includes(q)
    );
  }, [wakafList, searchQuery]);

  const filteredMuallaf = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return muallafList.filter(
      (m) =>
        !q ||
        m.noRegister.toLowerCase().includes(q) ||
        m.namaLengkap.toLowerCase().includes(q) ||
        m.kelurahan.toLowerCase().includes(q) ||
        m.agamaSebelumnya.toLowerCase().includes(q)
    );
  }, [muallafList, searchQuery]);

  const totalLuasWakaf = useMemo(
    () => wakafList.reduce((acc, w) => acc + (Number(w.luasM2) || 0), 0),
    [wakafList]
  );

  // Wakaf Handlers
  const openAddWakaf = () => {
    setEditingWakaf(null);
    setWakafForm({
      noAktaIkrar: `W.3/${String(wakafList.length + 20).padStart(3, '0')}/KUA.${kuaSettings.kodeKua || '33.74.05'}/${getCurrentYear()}`,
      tglIkrar: getTodayIsoDate(),
      wakifNama: '',
      nadzirNama: '',
      kelurahan: kuaSettings.daftarKelurahan?.[0]?.nama || 'Candi',
      alamatTanah: '',
      luasM2: 200,
      peruntukan: 'Masjid',
      statusSertifikat: 'Proses AIW',
      keterangan: '',
    });
    setIsWakafModalOpen(true);
  };

  const openEditWakaf = (w: WakafRecord) => {
    setEditingWakaf(w);
    setWakafForm({
      noAktaIkrar: w.noAktaIkrar,
      tglIkrar: w.tglIkrar,
      wakifNama: w.wakifNama,
      nadzirNama: w.nadzirNama,
      kelurahan: w.kelurahan,
      alamatTanah: w.alamatTanah,
      luasM2: w.luasM2,
      peruntukan: w.peruntukan,
      statusSertifikat: w.statusSertifikat,
      keterangan: w.keterangan || '',
    });
    setIsWakafModalOpen(true);
  };

  const handleSubmitWakaf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wakafForm.noAktaIkrar.trim() || !wakafForm.wakifNama.trim() || !wakafForm.nadzirNama.trim()) {
      setFeedback({ type: 'error', text: 'Harap isi No. Akta Ikrar Wakaf, Nama Wakif, dan Nama Nadzir.' });
      return;
    }

    if (editingWakaf) {
      updateWakaf(editingWakaf.id, {
        ...wakafForm,
        noAktaIkrar: wakafForm.noAktaIkrar.trim(),
        wakifNama: wakafForm.wakifNama.trim(),
        nadzirNama: wakafForm.nadzirNama.trim(),
        luasM2: Number(wakafForm.luasM2) || 0,
      });
      setFeedback({ type: 'success', text: `Data wakaf ${wakafForm.noAktaIkrar} berhasil diperbarui.` });
    } else {
      addWakaf({
        ...wakafForm,
        noAktaIkrar: wakafForm.noAktaIkrar.trim(),
        wakifNama: wakafForm.wakifNama.trim(),
        nadzirNama: wakafForm.nadzirNama.trim(),
        luasM2: Number(wakafForm.luasM2) || 0,
      });
      setFeedback({ type: 'success', text: `Data wakaf ${wakafForm.noAktaIkrar} ditambahkan ke database.` });
    }
    setIsWakafModalOpen(false);
  };

  // Muallaf Handlers
  const openAddMuallaf = () => {
    const year = getCurrentYear();
    const monthPad = String(getCurrentMonthNumber()).padStart(2, '0');
    setEditingMuallaf(null);
    setMuallafForm({
      noRegister: `MLF-${year}/${monthPad}/${String(muallafList.length + 10).padStart(3, '0')}`,
      tglIkrar: getTodayIsoDate(),
      namaLengkap: '',
      tempatTglLahir: '',
      jenisKelamin: 'Laki-laki',
      alamat: '',
      kelurahan: kuaSettings.daftarKelurahan?.[0]?.nama || 'Candi',
      agamaSebelumnya: 'Kristen',
      pembimbingNama: staffList[0]?.nama || 'Kepala KUA',
      saksi1: staffList[1]?.nama || '',
      saksi2: '',
      keterangan: '',
    });
    setIsMuallafModalOpen(true);
  };

  const openEditMuallaf = (m: MuallafRecord) => {
    setEditingMuallaf(m);
    setMuallafForm({
      noRegister: m.noRegister,
      tglIkrar: m.tglIkrar,
      namaLengkap: m.namaLengkap,
      tempatTglLahir: m.tempatTglLahir,
      jenisKelamin: m.jenisKelamin,
      alamat: m.alamat,
      kelurahan: m.kelurahan,
      agamaSebelumnya: m.agamaSebelumnya,
      pembimbingNama: m.pembimbingNama,
      saksi1: m.saksi1 || '',
      saksi2: m.saksi2 || '',
      keterangan: m.keterangan || '',
    });
    setIsMuallafModalOpen(true);
  };

  const handleSubmitMuallaf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!muallafForm.noRegister.trim() || !muallafForm.namaLengkap.trim()) {
      setFeedback({ type: 'error', text: 'Harap lengkapi Nomor Register dan Nama Lengkap Muallaf.' });
      return;
    }

    if (editingMuallaf) {
      updateMuallaf(editingMuallaf.id, {
        ...muallafForm,
        noRegister: muallafForm.noRegister.trim(),
        namaLengkap: muallafForm.namaLengkap.trim(),
      });
      setFeedback({ type: 'success', text: `Data muallaf a.n. ${muallafForm.namaLengkap} diperbarui.` });
    } else {
      addMuallaf({
        ...muallafForm,
        noRegister: muallafForm.noRegister.trim(),
        namaLengkap: muallafForm.namaLengkap.trim(),
      });
      setFeedback({ type: 'success', text: `Ikrar muallaf a.n. ${muallafForm.namaLengkap} tersimpan.` });
    }
    setIsMuallafModalOpen(false);
  };

  const handleExportCsv = () => {
    if (activeTab === 'wakaf') {
      exportDataToCsv(
        `Database_Wakaf_${kuaSettings.kecamatan || 'KUA'}`,
        ['No. AIW', 'Tgl Ikrar', 'Wakif', 'Nadzir', 'Kelurahan', 'Alamat Tanah', 'Luas (m2)', 'Peruntukan', 'Status Sertifikat', 'Keterangan'],
        wakafList.map((w) => [
          w.noAktaIkrar,
          w.tglIkrar,
          w.wakifNama,
          w.nadzirNama,
          w.kelurahan,
          w.alamatTanah,
          w.luasM2,
          w.peruntukan,
          w.statusSertifikat,
          w.keterangan || '-',
        ])
      );
    } else {
      exportDataToCsv(
        `Database_Muallaf_${kuaSettings.kecamatan || 'KUA'}`,
        ['No. Register', 'Tgl Ikrar', 'Nama Lengkap', 'TTL', 'JK', 'Kelurahan', 'Alamat', 'Agama Sebelumnya', 'Pembimbing', 'Saksi'],
        muallafList.map((m) => [
          m.noRegister,
          m.tglIkrar,
          m.namaLengkap,
          m.tempatTglLahir,
          m.jenisKelamin,
          m.kelurahan,
          m.alamat,
          m.agamaSebelumnya,
          m.pembimbingNama,
          [m.saksi1, m.saksi2].filter(Boolean).join(', ') || '-',
        ])
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Switcher */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <Landmark className="w-3.5 h-3.5 text-emerald-700" />
            <span>Layanan Zakat, Wakaf &amp; Bimbingan Umat — KUA {kuaSettings.kecamatan || 'Candisari'}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Database Wakaf &amp; Pembinaan Muallaf
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Basis data terstruktur Akta Ikrar Wakaf (AIW) tanah/bangunan ibadah serta register ikrar syahadat &amp; bimbingan muallaf di wilayah kerja KUA.
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold shrink-0 gap-1 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('wakaf')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'wakaf'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-emerald-700" />
            <span>Database Wakaf ({wakafList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('muallaf')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'muallaf'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-700" />
            <span>Database Muallaf ({muallafList.length})</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
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
            className="opacity-60 hover:opacity-100 font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Bidang Tanah Wakaf
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{wakafList.length}</span>
            <span className="text-xs text-slate-500">Lokasi / AIW</span>
          </div>
        </div>

        <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
            Total Luas Aset Wakaf
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-emerald-800 font-mono">
              {totalLuasWakaf.toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-emerald-700 font-medium">m²</span>
          </div>
        </div>

        <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">
            Register Ikrar Muallaf
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-blue-800 font-mono">{muallafList.length}</span>
            <span className="text-xs text-blue-600 font-medium">Orang Terbina</span>
          </div>
        </div>
      </div>

      {/* Action & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'wakaf'
                ? 'Cari No. AIW, nama wakif, nadzir, atau kelurahan...'
                : 'Cari No. Register, nama muallaf, atau kelurahan...'
            }
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={activeTab === 'wakaf' ? openAddWakaf : openAddMuallaf}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{activeTab === 'wakaf' ? '+ Tambah Data Wakaf' : '+ Catat Muallaf Baru'}</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      {activeTab === 'wakaf' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                  <th className="py-2 px-2.5 text-left whitespace-nowrap">Aksi</th>
                  <th className="py-2 px-2 text-center w-9">No</th>
                  <th className="py-2 px-2.5">No. AIW &amp; Tgl Ikrar</th>
                  <th className="py-2 px-2.5">Wakif &amp; Nadzir</th>
                  <th className="py-2 px-2.5">Lokasi &amp; Luas Tanah</th>
                  <th className="py-2 px-2.5">Peruntukan</th>
                  <th className="py-2 px-2.5">Status Sertifikat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWakaf.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Belum ada data tanah wakaf yang sesuai kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredWakaf.map((w, idx) => (
                    <tr key={w.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {confirmDeleteWakafId === w.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteWakafId(null)}
                              className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-600 cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                deleteWakaf(w.id);
                                setConfirmDeleteWakafId(null);
                                setFeedback({ type: 'success', text: `Catatan wakaf ${w.noAktaIkrar} dihapus.` });
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
                              onClick={() => openEditWakaf(w)}
                              className="p-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors cursor-pointer"
                              title="Edit Data Wakaf"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteWakafId(w.id)}
                              className="p-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded transition-colors cursor-pointer"
                              title="Hapus Data Wakaf"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-500 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-emerald-800 block leading-tight">{w.noAktaIkrar}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{w.tglIkrar}</span>
                      </td>
                      <td className="py-2 px-2.5">
                        <span className="font-bold text-slate-900 block leading-tight">Wakif: {w.wakifNama}</span>
                        <span className="text-[10px] text-slate-600 block">Nadzir: {w.nadzirNama}</span>
                      </td>
                      <td className="py-2 px-2.5 max-w-[200px]">
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Kel. {w.kelurahan}</span>
                          <span className="text-slate-300">·</span>
                          <span className="font-mono text-emerald-800">{w.luasM2} m²</span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate block">{w.alamatTanah}</span>
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-800 rounded border border-slate-200">
                          {w.peruntukan}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${
                            w.statusSertifikat === 'Sertifikat BPN'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : w.statusSertifikat === 'AIW Terbit'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {w.statusSertifikat}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                  <th className="py-2 px-2.5 text-left whitespace-nowrap">Aksi</th>
                  <th className="py-2 px-2 text-center w-9">No</th>
                  <th className="py-2 px-2.5">No. Register &amp; Tgl</th>
                  <th className="py-2 px-2.5">Nama Lengkap Muallaf</th>
                  <th className="py-2 px-2.5">Domisili / Kelurahan</th>
                  <th className="py-2 px-2.5">Agama Sebelumnya</th>
                  <th className="py-2 px-2.5">Pembimbing &amp; Saksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMuallaf.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Belum ada data ikrar muallaf yang sesuai kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredMuallaf.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {confirmDeleteMuallafId === m.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteMuallafId(null)}
                              className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-600 cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                deleteMuallaf(m.id);
                                setConfirmDeleteMuallafId(null);
                                setFeedback({ type: 'success', text: `Data muallaf ${m.namaLengkap} dihapus.` });
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
                              onClick={() => openEditMuallaf(m)}
                              className="p-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors cursor-pointer"
                              title="Edit Data Muallaf"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteMuallafId(m.id)}
                              className="p-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded transition-colors cursor-pointer"
                              title="Hapus Data Muallaf"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-500 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-emerald-800 block leading-tight">{m.noRegister}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{m.tglIkrar}</span>
                      </td>
                      <td className="py-2 px-2.5">
                        <span className="font-bold text-slate-900 block leading-tight">{m.namaLengkap}</span>
                        <span className="text-[10px] text-slate-500">
                          {m.jenisKelamin} · {m.tempatTglLahir || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 max-w-[180px]">
                        <span className="font-semibold text-slate-800 block leading-tight">Kel. {m.kelurahan}</span>
                        <span className="text-[10px] text-slate-500 truncate block">{m.alamat}</span>
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-800 rounded border border-blue-200">
                          {m.agamaSebelumnya}
                        </span>
                      </td>
                      <td className="py-2 px-2.5">
                        <span className="font-medium text-slate-800 flex items-center gap-1 leading-tight">
                          <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{m.pembimbingNama}</span>
                        </span>
                        {(m.saksi1 || m.saksi2) && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Saksi: {[m.saksi1, m.saksi2].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wakaf Add/Edit Modal */}
      {isWakafModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-base font-bold text-slate-900">
                {editingWakaf ? 'Edit Data Akta Ikrar Wakaf' : 'Tambah Data Wakaf Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsWakafModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitWakaf} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">No. Akta Ikrar Wakaf (AIW) *</label>
                  <input
                    type="text"
                    required
                    value={wakafForm.noAktaIkrar}
                    onChange={(e) => setWakafForm({ ...wakafForm, noAktaIkrar: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Tanggal Ikrar *</label>
                  <input
                    type="date"
                    required
                    value={wakafForm.tglIkrar}
                    onChange={(e) => setWakafForm({ ...wakafForm, tglIkrar: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nama Wakif (Pemberi Wakaf) *</label>
                  <input
                    type="text"
                    required
                    value={wakafForm.wakifNama}
                    onChange={(e) => setWakafForm({ ...wakafForm, wakifNama: e.target.value })}
                    placeholder="Contoh: H. Sudarmono"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nama Nadzir (Pengelola) *</label>
                  <input
                    type="text"
                    required
                    value={wakafForm.nadzirNama}
                    onChange={(e) => setWakafForm({ ...wakafForm, nadzirNama: e.target.value })}
                    placeholder="Contoh: Yayasan Takmir Masjid"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Kelurahan</label>
                  <select
                    value={wakafForm.kelurahan}
                    onChange={(e) => setWakafForm({ ...wakafForm, kelurahan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs cursor-pointer"
                  >
                    {kuaSettings.daftarKelurahan?.map((k) => (
                      <option key={k.id} value={k.nama}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Luas Tanah (m²)</label>
                  <input
                    type="number"
                    min={1}
                    value={wakafForm.luasM2}
                    onChange={(e) => setWakafForm({ ...wakafForm, luasM2: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Peruntukan</label>
                  <select
                    value={wakafForm.peruntukan}
                    onChange={(e) => setWakafForm({ ...wakafForm, peruntukan: e.target.value as WakafPeruntukan })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs cursor-pointer"
                  >
                    <option value="Masjid">Masjid</option>
                    <option value="Musholla">Musholla</option>
                    <option value="Madrasah / Pendidikan">Madrasah / Pendidikan</option>
                    <option value="Makam">Makam</option>
                    <option value="Sosial Lainnya">Sosial Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Alamat Lokasi Tanah</label>
                  <input
                    type="text"
                    value={wakafForm.alamatTanah}
                    onChange={(e) => setWakafForm({ ...wakafForm, alamatTanah: e.target.value })}
                    placeholder="Jl. / RT / RW lokasi objek wakaf"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Status Sertifikasi</label>
                  <select
                    value={wakafForm.statusSertifikat}
                    onChange={(e) =>
                      setWakafForm({ ...wakafForm, statusSertifikat: e.target.value as WakafStatusSertifikat })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs cursor-pointer"
                  >
                    <option value="Proses AIW">Proses AIW</option>
                    <option value="AIW Terbit">AIW Terbit</option>
                    <option value="Sertifikat BPN">Sertifikat BPN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Keterangan</label>
                <input
                  type="text"
                  value={wakafForm.keterangan}
                  onChange={(e) => setWakafForm({ ...wakafForm, keterangan: e.target.value })}
                  placeholder="Catatan tambahan aset wakaf..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWakafModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingWakaf ? 'Simpan Perubahan' : 'Simpan Data Wakaf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Muallaf Add/Edit Modal */}
      {isMuallafModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-base font-bold text-slate-900">
                {editingMuallaf ? 'Edit Data Register Muallaf' : 'Catat Register Ikrar Muallaf Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsMuallafModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitMuallaf} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nomor Register *</label>
                  <input
                    type="text"
                    required
                    value={muallafForm.noRegister}
                    onChange={(e) => setMuallafForm({ ...muallafForm, noRegister: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Tanggal Ikrar Syahadat *</label>
                  <input
                    type="date"
                    required
                    value={muallafForm.tglIkrar}
                    onChange={(e) => setMuallafForm({ ...muallafForm, tglIkrar: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={muallafForm.namaLengkap}
                    onChange={(e) => setMuallafForm({ ...muallafForm, namaLengkap: e.target.value })}
                    placeholder="Nama lengkap muallaf"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Tempat &amp; Tanggal Lahir</label>
                  <input
                    type="text"
                    value={muallafForm.tempatTglLahir}
                    onChange={(e) => setMuallafForm({ ...muallafForm, tempatTglLahir: e.target.value })}
                    placeholder="Semarang, 12 Mei 1998"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Jenis Kelamin</label>
                  <select
                    value={muallafForm.jenisKelamin}
                    onChange={(e) =>
                      setMuallafForm({ ...muallafForm, jenisKelamin: e.target.value as 'Laki-laki' | 'Perempuan' })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs cursor-pointer"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Agama Sebelumnya</label>
                  <input
                    type="text"
                    value={muallafForm.agamaSebelumnya}
                    onChange={(e) => setMuallafForm({ ...muallafForm, agamaSebelumnya: e.target.value })}
                    placeholder="Kristen / Katolik / Hindu / Buddha"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Kelurahan</label>
                  <select
                    value={muallafForm.kelurahan}
                    onChange={(e) => setMuallafForm({ ...muallafForm, kelurahan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs cursor-pointer"
                  >
                    {kuaSettings.daftarKelurahan?.map((k) => (
                      <option key={k.id} value={k.nama}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Alamat Domisili</label>
                <input
                  type="text"
                  value={muallafForm.alamat}
                  onChange={(e) => setMuallafForm({ ...muallafForm, alamat: e.target.value })}
                  placeholder="Alamat tempat tinggal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Pembimbing Syahadat</label>
                  <input
                    type="text"
                    value={muallafForm.pembimbingNama}
                    onChange={(e) => setMuallafForm({ ...muallafForm, pembimbingNama: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Saksi 1</label>
                  <input
                    type="text"
                    value={muallafForm.saksi1}
                    onChange={(e) => setMuallafForm({ ...muallafForm, saksi1: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Saksi 2</label>
                  <input
                    type="text"
                    value={muallafForm.saksi2}
                    onChange={(e) => setMuallafForm({ ...muallafForm, saksi2: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Keterangan Bimbingan</label>
                <input
                  type="text"
                  value={muallafForm.keterangan}
                  onChange={(e) => setMuallafForm({ ...muallafForm, keterangan: e.target.value })}
                  placeholder="Catatan pembinaan / piagam..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMuallafModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingMuallaf ? 'Simpan Perubahan' : 'Simpan Data Muallaf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
