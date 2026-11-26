import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  ClipboardList,
  Plus,
  Search,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Download,
  Calendar,
  Save,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';
import { FormulirRegisterItem, MutasiBukuJenis } from '../types';
import { exportDataToCsv } from '../lib/googleSheetsService';
import {
  getCurrentMonthNumber,
  getCurrentYear,
  getTodayIsoDate,
} from '../lib/dateUtils';

const NAMA_BULAN_LIST = [
  { val: '01', label: 'Januari' },
  { val: '02', label: 'Februari' },
  { val: '03', label: 'Maret' },
  { val: '04', label: 'April' },
  { val: '05', label: 'Mei' },
  { val: '06', label: 'Juni' },
  { val: '07', label: 'Juli' },
  { val: '08', label: 'Agustus' },
  { val: '09', label: 'September' },
  { val: '10', label: 'Oktober' },
  { val: '11', label: 'November' },
  { val: '12', label: 'Desember' },
];

export const BukuNikahView: React.FC = () => {
  const {
    kuaSettings,
    nikahList,
    bukuBatchList,
    bukuMutasiList,
    formulirList,
    addBukuBatch,
    deleteBukuBatch,
    addBukuMutasi,
    deleteBukuMutasi,
    upsertFormulirRecord,
  } = useKua();

  const [activeTab, setActiveTab] = useState<'stokBuku' | 'formulir'>('stokBuku');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchMutasi, setSearchMutasi] = useState('');
  const [filterJenisMutasi, setFilterJenisMutasi] = useState<'Semua' | MutasiBukuJenis>('Semua');

  // Inline confirm states (no window.confirm)
  const [confirmDeleteBatchId, setConfirmDeleteBatchId] = useState<string | null>(null);
  const [confirmDeleteMutasiId, setConfirmDeleteMutasiId] = useState<string | null>(null);

  // Modal Terima Stok Baru
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({
    tanggalDiterima: getTodayIsoDate(),
    kodePerforasi: 'JT-26',
    nomorAwal: '',
    nomorAkhir: '',
    jumlahPasang: 50,
    sumberPenerimaan: `Kantor Kemenag ${kuaSettings.kabupatenKota || 'Kota Semarang'}`,
    catatan: '',
  });

  // Modal Catat Mutasi Keluar / Rusak / Hilang
  const [isAddMutasiModalOpen, setIsAddMutasiModalOpen] = useState(false);
  const [mutasiForm, setMutasiForm] = useState({
    tanggal: getTodayIsoDate(),
    jenis: 'Keluar Nikah' as MutasiBukuJenis,
    kodePerforasi: bukuBatchList[0]?.kodePerforasi || 'JT-26',
    nomorSeri: '',
    jumlahPasang: 1,
    nikahId: '',
    keterangan: '',
  });

  // Auto calculate jumlahPasang from nomorAwal..nomorAkhir when numeric
  useEffect(() => {
    const startNum = parseInt(batchForm.nomorAwal.replace(/\D/g, ''), 10);
    const endNum = parseInt(batchForm.nomorAkhir.replace(/\D/g, ''), 10);
    if (!isNaN(startNum) && !isNaN(endNum) && endNum >= startNum && endNum - startNum < 10000) {
      setBatchForm((prev) => ({ ...prev, jumlahPasang: endNum - startNum + 1 }));
    }
  }, [batchForm.nomorAwal, batchForm.nomorAkhir]);

  // Stock calculations
  const stockSummary = useMemo(() => {
    const totalMasuk = bukuMutasiList
      .filter((m) => m.jenis === 'Masuk')
      .reduce((acc, m) => acc + (m.jumlahPasang || 0), 0);
    const totalKeluarNikah = bukuMutasiList
      .filter((m) => m.jenis === 'Keluar Nikah')
      .reduce((acc, m) => acc + (m.jumlahPasang || 0), 0);
    const totalRusakHilang = bukuMutasiList
      .filter((m) => m.jenis === 'Rusak' || m.jenis === 'Hilang')
      .reduce((acc, m) => acc + (m.jumlahPasang || 0), 0);
    const sisaStok = totalMasuk - totalKeluarNikah - totalRusakHilang;
    return { totalMasuk, totalKeluarNikah, totalRusakHilang, sisaStok };
  }, [bukuMutasiList]);

  const filteredMutasi = useMemo(() => {
    return bukuMutasiList.filter((m) => {
      const q = searchMutasi.toLowerCase();
      const matchSearch =
        !q ||
        m.kodePerforasi.toLowerCase().includes(q) ||
        m.nomorSeri.toLowerCase().includes(q) ||
        (m.nikahLabel && m.nikahLabel.toLowerCase().includes(q)) ||
        (m.keterangan && m.keterangan.toLowerCase().includes(q));
      const matchJenis = filterJenisMutasi === 'Semua' || m.jenis === filterJenisMutasi;
      return matchSearch && matchJenis;
    });
  }, [bukuMutasiList, searchMutasi, filterJenisMutasi]);

  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.kodePerforasi.trim() || !batchForm.nomorAwal.trim() || !batchForm.nomorAkhir.trim()) {
      setFeedback({ type: 'error', text: 'Harap isi kode perforasi serta nomor awal dan nomor akhir buku nikah.' });
      return;
    }
    addBukuBatch({
      tanggalDiterima: batchForm.tanggalDiterima,
      kodePerforasi: batchForm.kodePerforasi.trim().toUpperCase(),
      nomorAwal: batchForm.nomorAwal.trim(),
      nomorAkhir: batchForm.nomorAkhir.trim(),
      jumlahPasang: Math.max(1, Number(batchForm.jumlahPasang) || 1),
      sumberPenerimaan: batchForm.sumberPenerimaan.trim() || 'Kemenag Kab/Kota',
      catatan: batchForm.catatan.trim() || undefined,
    });
    setIsAddBatchModalOpen(false);
    setBatchForm({
      tanggalDiterima: getTodayIsoDate(),
      kodePerforasi: 'JT-26',
      nomorAwal: '',
      nomorAkhir: '',
      jumlahPasang: 50,
      sumberPenerimaan: `Kantor Kemenag ${kuaSettings.kabupatenKota || 'Kota Semarang'}`,
      catatan: '',
    });
    setFeedback({ type: 'success', text: 'Penerimaan stok buku nikah berhasil dicatat ke kartu stok & mutasi masuk.' });
  };

  const handleSubmitMutasi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutasiForm.kodePerforasi.trim() || !mutasiForm.nomorSeri.trim()) {
      setFeedback({ type: 'error', text: 'Harap lengkapi kode perforasi dan nomor seri buku nikah.' });
      return;
    }
    const linkedNikah = nikahList.find((n) => n.id === mutasiForm.nikahId);
    addBukuMutasi({
      tanggal: mutasiForm.tanggal,
      jenis: mutasiForm.jenis,
      kodePerforasi: mutasiForm.kodePerforasi.trim().toUpperCase(),
      nomorSeri: mutasiForm.nomorSeri.trim(),
      jumlahPasang: Math.max(1, Number(mutasiForm.jumlahPasang) || 1),
      nikahId: linkedNikah?.id,
      nikahLabel: linkedNikah ? `${linkedNikah.suami.nama} & ${linkedNikah.istri.nama}` : undefined,
      keterangan: mutasiForm.keterangan.trim() || undefined,
    });
    setIsAddMutasiModalOpen(false);
    setMutasiForm({
      tanggal: getTodayIsoDate(),
      jenis: 'Keluar Nikah',
      kodePerforasi: bukuBatchList[0]?.kodePerforasi || 'JT-26',
      nomorSeri: '',
      jumlahPasang: 1,
      nikahId: '',
      keterangan: '',
    });
    setFeedback({ type: 'success', text: 'Catatan keluar/masuk buku nikah berhasil ditambahkan.' });
  };

  // =========================================================================
  // TAB 2: REGISTER FORMULIR (NA, NB, N6) SINKRON JUMLAH NIKAH BULAN BERJALAN
  // =========================================================================
  const realYearNum = getCurrentYear();
  const [selectedYear, setSelectedYear] = useState<string>(() => String(getCurrentYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    String(getCurrentMonthNumber()).padStart(2, '0')
  );
  const yearOptions = [realYearNum - 1, realYearNum, realYearNum + 1, realYearNum + 2].map(String);
  const activePeriode = `${selectedYear}-${selectedMonth}`;

  // Count actual Nikah events in the selected YYYY-MM period
  const jumlahNikahBulanBerjalan = useMemo(() => {
    return nikahList.filter(
      (n) => n.tanggalAkad && n.tanggalAkad.startsWith(activePeriode) && n.status !== 'Ditolak'
    ).length;
  }, [nikahList, activePeriode]);

  const FORMULIR_TYPES: {
    jenisFormulir: FormulirRegisterItem['jenisFormulir'];
    namaFormulir: string;
  }[] = [
    { jenisFormulir: 'Model NA', namaFormulir: 'Formulir Pemeriksaan Nikah & Akta (Model NA)' },
    { jenisFormulir: 'Model NB', namaFormulir: 'Register Pencatatan Perkawinan (Model NB)' },
    { jenisFormulir: 'Model N6', namaFormulir: 'Formulir Pengumuman / Keterangan Tambahan (Model N6/N5)' },
  ];

  // Local editable drafts per period
  const [drafts, setDrafts] = useState<
    Record<string, { stokAwal: number; diterima: number; rusak: number; catatan: string }>
  >({});

  useEffect(() => {
    const nextDrafts: Record<
      string,
      { stokAwal: number; diterima: number; rusak: number; catatan: string }
    > = {};
    FORMULIR_TYPES.forEach((ft) => {
      const existing = formulirList.find(
        (f) => f.periode === activePeriode && f.jenisFormulir === ft.jenisFormulir
      );
      nextDrafts[ft.jenisFormulir] = {
        stokAwal: existing?.stokAwal ?? 25,
        diterima: existing?.diterima ?? 0,
        rusak: existing?.rusak ?? 0,
        catatan: existing?.catatan ?? '',
      };
    });
    setDrafts(nextDrafts);
  }, [activePeriode, formulirList]);

  const handleSaveFormulirRow = (jenisFormulir: FormulirRegisterItem['jenisFormulir'], namaFormulir: string) => {
    const d = drafts[jenisFormulir];
    if (!d) return;
    upsertFormulirRecord({
      periode: activePeriode,
      jenisFormulir,
      namaFormulir,
      stokAwal: Math.max(0, Number(d.stokAwal) || 0),
      diterima: Math.max(0, Number(d.diterima) || 0),
      rusak: Math.max(0, Number(d.rusak) || 0),
      sinkronJumlahNikah: true,
      catatan: d.catatan,
    });
    setFeedback({
      type: 'success',
      text: `Register ${jenisFormulir} bulan ${NAMA_BULAN_LIST.find((m) => m.val === selectedMonth)?.label} ${selectedYear} tersimpan.`,
    });
  };

  const handleExportMutasiCsv = () => {
    exportDataToCsv(
      `Stok_Mutasi_Buku_Nikah_${kuaSettings.kecamatan || 'KUA'}`,
      ['Tanggal', 'Jenis Mutasi', 'Kode Perforasi', 'Nomor Seri', 'Jumlah (Pasang)', 'Pasangan / Nikah', 'Keterangan', 'Petugas'],
      bukuMutasiList.map((m) => [
        m.tanggal,
        m.jenis,
        m.kodePerforasi,
        m.nomorSeri,
        m.jumlahPasang,
        m.nikahLabel || '-',
        m.keterangan || '-',
        m.petugas,
      ])
    );
  };

  const handleExportFormulirCsv = () => {
    exportDataToCsv(
      `Register_Formulir_${activePeriode}_${kuaSettings.kecamatan || 'KUA'}`,
      ['Periode', 'Jenis Formulir', 'Nama Formulir', 'Stok Awal', 'Diterima', 'Terpakai (Nikah Bulan Ini)', 'Formulir Rusak', 'Sisa Akhir'],
      FORMULIR_TYPES.map((ft) => {
        const d = drafts[ft.jenisFormulir] || { stokAwal: 0, diterima: 0, rusak: 0 };
        const sisa = d.stokAwal + d.diterima - jumlahNikahBulanBerjalan - d.rusak;
        return [
          activePeriode,
          ft.jenisFormulir,
          ft.namaFormulir,
          d.stokAwal,
          d.diterima,
          jumlahNikahBulanBerjalan,
          d.rusak,
          sisa,
        ];
      })
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Sub-tab Switcher */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
            <span>Inventaris Dokumen Negara — KUA {kuaSettings.kecamatan || 'Candisari'}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Manajemen Stok Buku Nikah &amp; Register Formulir
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Pencatatan penerimaan stok buku nikah (tanggal terima, kode &amp; nomor perforasi), mutasi keluar/rusak, serta register formulir NA &amp; NB yang otomatis mengikuti jumlah nikah bulan berjalan.
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold shrink-0 gap-1 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('stokBuku')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'stokBuku'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
            <span>Stok &amp; Mutasi Buku Nikah</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('formulir')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'formulir'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-emerald-700" />
            <span>Register Formulir (NA, NB)</span>
          </button>
        </div>
      </div>

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
            className="opacity-60 hover:opacity-100 font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {activeTab === 'stokBuku' ? (
        <div className="space-y-6">
          {/* 4 Stock KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Diterima (Masuk)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {stockSummary.totalMasuk}
                </span>
                <span className="text-xs text-slate-500">Pasang</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-blue-200 bg-blue-50/30 shadow-2xs">
              <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">
                Keluar (Dipakai Nikah)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-blue-800 font-mono">
                  {stockSummary.totalKeluarNikah}
                </span>
                <span className="text-xs text-blue-600">Pasang</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs">
              <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
                Rusak / Hilang
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-rose-700 font-mono">
                  {stockSummary.totalRusakHilang}
                </span>
                <span className="text-xs text-rose-600">Pasang</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border-2 border-emerald-300 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                Sisa Stok Buku Nikah
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-emerald-800 font-mono">
                  {stockSummary.sisaStok}
                </span>
                <span className="text-xs text-emerald-700 font-semibold">Pasang Tersedia</span>
              </div>
            </div>
          </div>

          {/* Batch Stock Received Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Daftar Penerimaan Stok Buku Nikah (Perforasi &amp; Seri)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Catatan batch penerimaan buku nikah dari Kemenag Kabupaten/Kota beserta kode &amp; rentang nomor perforasi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBatchModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Terima Stok Buku Nikah</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                    <th className="py-2 px-2.5 text-left whitespace-nowrap">Aksi</th>
                    <th className="py-2 px-2 text-center w-9">No</th>
                    <th className="py-2 px-2.5">Tanggal Diterima</th>
                    <th className="py-2 px-2.5">Kode Perforasi</th>
                    <th className="py-2 px-2.5">Nomor Perforasi (Awal - Akhir)</th>
                    <th className="py-2 px-2.5 text-center">Jumlah</th>
                    <th className="py-2 px-2.5">Sumber / Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bukuBatchList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Belum ada batch penerimaan stok buku nikah tercatat.
                      </td>
                    </tr>
                  ) : (
                    bukuBatchList.map((b, idx) => (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {confirmDeleteBatchId === b.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteBatchId(null)}
                                className="px-1.5 py-0.5 text-[10px] border border-slate-200 rounded bg-white text-slate-600 cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteBukuBatch(b.id);
                                  setConfirmDeleteBatchId(null);
                                  setFeedback({ type: 'success', text: `Batch ${b.kodePerforasi} dihapus.` });
                                }}
                                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-600 text-white cursor-pointer"
                              >
                                Hapus
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteBatchId(b.id)}
                              className="p-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded transition-colors cursor-pointer"
                              title="Hapus Batch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-500 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {b.tanggalDiterima}
                        </td>
                        <td className="py-2 px-2.5">
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {b.kodePerforasi}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {b.nomorAwal} s/d {b.nomorAkhir}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-extrabold text-slate-900 whitespace-nowrap">
                          {b.jumlahPasang} Pasang
                        </td>
                        <td className="py-2 px-2.5 text-slate-600">
                          <span className="font-medium text-slate-800 block leading-tight">{b.sumberPenerimaan}</span>
                          {b.catatan && <span className="text-[10px] text-slate-400">{b.catatan}</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Buku Nikah In/Out Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Buku Catatan Keluar / Masuk Buku Nikah
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Log historis setiap buku nikah yang masuk, diserahkan ke pasangan nikah, rusak, atau hilang.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchMutasi}
                    onChange={(e) => setSearchMutasi(e.target.value)}
                    placeholder="Cari nomor seri / pasangan..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 w-48"
                  />
                </div>

                <select
                  value={filterJenisMutasi}
                  onChange={(e) => setFilterJenisMutasi(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  <option value="Semua">Semua Mutasi</option>
                  <option value="Masuk">Masuk (Terima Stok)</option>
                  <option value="Keluar Nikah">Keluar (Nikah)</option>
                  <option value="Rusak">Rusak / Salah Cetak</option>
                  <option value="Hilang">Hilang</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportMutasiCsv}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddMutasiModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+ Catat Keluar / Rusak</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                    <th className="py-2 px-2.5 text-left whitespace-nowrap">Aksi</th>
                    <th className="py-2 px-2 text-center w-9">No</th>
                    <th className="py-2 px-2.5">Tanggal</th>
                    <th className="py-2 px-2.5">Jenis Mutasi</th>
                    <th className="py-2 px-2.5">Kode &amp; No. Perforasi</th>
                    <th className="py-2 px-2.5 text-center">Qty</th>
                    <th className="py-2 px-2.5">Terkait Peristiwa Nikah / Keterangan</th>
                    <th className="py-2 px-2.5">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMutasi.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Belum ada catatan mutasi buku nikah yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredMutasi.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {confirmDeleteMutasiId === m.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteMutasiId(null)}
                                className="px-1.5 py-0.5 text-[10px] border border-slate-200 rounded bg-white text-slate-600 cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteBukuMutasi(m.id);
                                  setConfirmDeleteMutasiId(null);
                                }}
                                className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-600 text-white cursor-pointer"
                              >
                                Hapus
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteMutasiId(m.id)}
                              className="p-1 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded transition-colors cursor-pointer"
                              title="Hapus Log Mutasi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-500 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-slate-800 whitespace-nowrap">
                          {m.tanggal}
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              m.jenis === 'Masuk'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : m.jenis === 'Keluar Nikah'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {m.jenis === 'Masuk' ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : m.jenis === 'Keluar Nikah' ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            <span>{m.jenis}</span>
                          </span>
                        </td>
                        <td className="py-2 px-2.5 font-mono whitespace-nowrap">
                          <span className="font-bold text-slate-900">{m.kodePerforasi}</span>{' '}
                          <span className="text-slate-600">No. {m.nomorSeri}</span>
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold">
                          <span className={m.jenis === 'Masuk' ? 'text-emerald-700' : 'text-rose-700'}>
                            {m.jenis === 'Masuk' ? '+' : '-'}
                            {m.jumlahPasang}
                          </span>
                        </td>
                        <td className="py-2 px-2.5">
                          {m.nikahLabel && (
                            <span className="font-bold text-slate-900 block leading-tight">{m.nikahLabel}</span>
                          )}
                          <span className="text-[10px] text-slate-600">{m.keterangan || '-'}</span>
                        </td>
                        <td className="py-2 px-2.5 text-[10px] text-slate-500 whitespace-nowrap">
                          {m.petugas.split(',')[0]}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: REGISTER FORMULIR (NA, NB, N6) */
        <div className="space-y-6">
          {/* Period Filter & Live Nikah Counter Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>Periode Register Formulir:</span>
              </div>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
              >
                {NAMA_BULAN_LIST.map((m) => (
                  <option key={m.val} value={m.val}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 font-mono cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs">
                <PackageCheck className="w-4 h-4 text-emerald-700" />
                <span className="text-emerald-900">
                  Jumlah Nikah Bulan Berjalan (<strong>{activePeriode}</strong>):
                </span>
                <span className="font-mono font-extrabold text-sm text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                  {jumlahNikahBulanBerjalan} Pasang
                </span>
              </div>

              <button
                type="button"
                onClick={handleExportFormulirCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          {/* Formulir Table (NA, NB, N6) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/80">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Perhitungan Pemakaian Formulir NA, NB &amp; N6 (Otomatis Mengikuti Jumlah Nikah + Formulir Rusak)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Rumus: <strong className="text-slate-700">Sisa Akhir = (Stok Awal + Diterima) - (Jumlah Nikah Bulan Berjalan + Formulir Rusak)</strong>.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                    <th className="py-2 px-2.5 text-left whitespace-nowrap">Aksi</th>
                    <th className="py-2 px-2 text-center w-9">No</th>
                    <th className="py-2 px-2.5">Kode &amp; Nama Formulir</th>
                    <th className="py-2 px-2.5 w-24 text-center">Stok Awal</th>
                    <th className="py-2 px-2.5 w-24 text-center">Diterima</th>
                    <th className="py-2 px-2.5 text-center">Terpakai (Nikah)</th>
                    <th className="py-2 px-2.5 w-24 text-center">Rusak</th>
                    <th className="py-2 px-2.5 text-center">Total Keluar</th>
                    <th className="py-2 px-2.5 text-center">Sisa Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {FORMULIR_TYPES.map((ft, idx) => {
                    const d = drafts[ft.jenisFormulir] || {
                      stokAwal: 25,
                      diterima: 0,
                      rusak: 0,
                      catatan: '',
                    };
                    const totalKeluar = jumlahNikahBulanBerjalan + (Number(d.rusak) || 0);
                    const sisaAkhir = (Number(d.stokAwal) || 0) + (Number(d.diterima) || 0) - totalKeluar;

                    return (
                      <tr key={ft.jenisFormulir} className="hover:bg-slate-50/70">
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSaveFormulirRow(ft.jenisFormulir, ft.namaFormulir)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-2xs cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            <span>Simpan</span>
                          </button>
                        </td>

                        <td className="py-2 px-2 text-center font-mono text-slate-500 font-semibold">
                          {idx + 1}
                        </td>

                        <td className="py-2 px-2.5">
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mr-1.5">
                            {ft.jenisFormulir}
                          </span>
                          <span className="font-semibold text-slate-900">{ft.namaFormulir}</span>
                        </td>

                        <td className="py-2 px-2.5 text-center">
                          <input
                            type="number"
                            min={0}
                            value={d.stokAwal}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [ft.jenisFormulir]: {
                                  ...d,
                                  stokAwal: parseInt(e.target.value, 10) || 0,
                                },
                              }))
                            }
                            className="w-16 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-800 text-center focus:bg-white focus:border-emerald-600 focus:outline-none"
                          />
                        </td>

                        <td className="py-2 px-2.5 text-center">
                          <input
                            type="number"
                            min={0}
                            value={d.diterima}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [ft.jenisFormulir]: {
                                  ...d,
                                  diterima: parseInt(e.target.value, 10) || 0,
                                },
                              }))
                            }
                            className="w-16 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-blue-800 text-center focus:bg-white focus:border-emerald-600 focus:outline-none"
                          />
                        </td>

                        <td className="py-2 px-2.5 text-center">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-mono font-extrabold text-emerald-800"
                            title="Otomatis disamakan dengan jumlah pernikahan bulan berjalan"
                          >
                            {jumlahNikahBulanBerjalan}
                          </span>
                        </td>

                        <td className="py-2 px-2.5 text-center">
                          <input
                            type="number"
                            min={0}
                            value={d.rusak}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [ft.jenisFormulir]: {
                                  ...d,
                                  rusak: parseInt(e.target.value, 10) || 0,
                                },
                              }))
                            }
                            className="w-16 bg-rose-50 border border-rose-300 rounded px-2 py-1 font-mono font-bold text-rose-800 text-center focus:bg-white focus:border-rose-600 focus:outline-none"
                          />
                        </td>

                        <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-700">
                          {totalKeluar}
                        </td>

                        <td className="py-2 px-2.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded font-mono font-extrabold ${
                              sisaAkhir < 0
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : sisaAkhir <= 5
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-900 border border-slate-300'
                            }`}
                          >
                            {sisaAkhir}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Terima Stok Baru */}
      {isAddBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                  Penerimaan Dokumen Negara
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Terima Stok Buku Nikah Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitBatch} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Tanggal Diterima *</label>
                  <input
                    type="date"
                    required
                    value={batchForm.tanggalDiterima}
                    onChange={(e) => setBatchForm({ ...batchForm, tanggalDiterima: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Kode Perforasi *</label>
                  <input
                    type="text"
                    required
                    value={batchForm.kodePerforasi}
                    onChange={(e) => setBatchForm({ ...batchForm, kodePerforasi: e.target.value.toUpperCase() })}
                    placeholder="Contoh: JT-26 / SA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-emerald-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">No. Perforasi Awal *</label>
                  <input
                    type="text"
                    required
                    value={batchForm.nomorAwal}
                    onChange={(e) => setBatchForm({ ...batchForm, nomorAwal: e.target.value })}
                    placeholder="045201"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">No. Perforasi Akhir *</label>
                  <input
                    type="text"
                    required
                    value={batchForm.nomorAkhir}
                    onChange={(e) => setBatchForm({ ...batchForm, nomorAkhir: e.target.value })}
                    placeholder="045250"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Jumlah (Pasang)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={batchForm.jumlahPasang}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, jumlahPasang: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full bg-emerald-50 border border-emerald-300 rounded-lg px-3 py-2 font-mono font-bold text-emerald-900 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Sumber Penerimaan</label>
                <input
                  type="text"
                  value={batchForm.sumberPenerimaan}
                  onChange={(e) => setBatchForm({ ...batchForm, sumberPenerimaan: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Catatan Tambahan</label>
                <input
                  type="text"
                  value={batchForm.catatan}
                  onChange={(e) => setBatchForm({ ...batchForm, catatan: e.target.value })}
                  placeholder="Keterangan berita acara serah terima..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBatchModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Stok Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Catat Mutasi Keluar / Rusak / Hilang */}
      {isAddMutasiModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                  Mutasi Keluar / Rusak
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Catat Pengeluaran atau Kerusakan Buku Nikah
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMutasiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitMutasi} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={mutasiForm.tanggal}
                    onChange={(e) => setMutasiForm({ ...mutasiForm, tanggal: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Jenis Mutasi *</label>
                  <select
                    value={mutasiForm.jenis}
                    onChange={(e) => setMutasiForm({ ...mutasiForm, jenis: e.target.value as MutasiBukuJenis })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
                  >
                    <option value="Keluar Nikah">Keluar (Dipakai Peristiwa Nikah)</option>
                    <option value="Rusak">Rusak / Salah Cetak</option>
                    <option value="Hilang">Hilang</option>
                    <option value="Masuk">Masuk / Retur Kembali</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Kode Perforasi *</label>
                  <input
                    type="text"
                    required
                    value={mutasiForm.kodePerforasi}
                    onChange={(e) => setMutasiForm({ ...mutasiForm, kodePerforasi: e.target.value.toUpperCase() })}
                    placeholder="JT-26"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nomor Seri *</label>
                  <input
                    type="text"
                    required
                    value={mutasiForm.nomorSeri}
                    onChange={(e) => setMutasiForm({ ...mutasiForm, nomorSeri: e.target.value })}
                    placeholder="045103"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Jumlah (Pasang)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={mutasiForm.jumlahPasang}
                    onChange={(e) =>
                      setMutasiForm({ ...mutasiForm, jumlahPasang: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              {mutasiForm.jenis === 'Keluar Nikah' && (
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Kaitkan dengan Register Nikah (Opsional)
                  </label>
                  <select
                    value={mutasiForm.nikahId}
                    onChange={(e) => setMutasiForm({ ...mutasiForm, nikahId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs cursor-pointer"
                  >
                    <option value="">-- Pilih Pasangan dari Register Nikah --</option>
                    {nikahList.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.noPendaftaran} — {n.suami.nama} &amp; {n.istri.nama} ({n.tanggalAkad})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Keterangan</label>
                <input
                  type="text"
                  value={mutasiForm.keterangan}
                  onChange={(e) => setMutasiForm({ ...mutasiForm, keterangan: e.target.value })}
                  placeholder="Contoh: Penyerahan buku nikah setelah akad / keterangan kerusakan..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMutasiModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs cursor-pointer"
                >
                  Catat Mutasi Buku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
