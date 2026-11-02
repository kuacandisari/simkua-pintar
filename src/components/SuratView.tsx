import React, { useState, useMemo, useEffect } from 'react';
import {
  Mail,
  Search,
  Plus,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Send,
  Inbox,
  User,
  Trash2,
  FileCheck,
  ShieldAlert,
  Hash,
  SlidersHorizontal,
  Settings2,
  Tag,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';
import { SuratRecord, SuratJenis, SuratStatus, SuratDisposisi } from '../types';
import { generateDisposisiPdf } from '../lib/pdfGenerator';

interface SuratViewProps {
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  onOpenGoogleSheets?: () => void;
}

export const SuratView: React.FC<SuratViewProps> = ({
  isAddModalOpen,
  setIsAddModalOpen,
  onOpenGoogleSheets,
}) => {
  const {
    suratList,
    addSurat,
    updateSurat,
    addDisposisi,
    deleteSurat,
    activeStaff,
    kuaSettings,
    staffList,
    getNextNomorSuratKeluarPreview,
    getNextNomorAgendaMasukPreview,
    addCustomKodeSurat,
    deleteCustomKodeSurat,
  } = useKua();

  const [activeTab, setActiveTab] = useState<SuratJenis>('Surat Masuk');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');

  // Custom Codes Management Modal State
  const [isKodeModalOpen, setIsKodeModalOpen] = useState(false);
  const [newKodeInput, setNewKodeInput] = useState('');
  const [newNamaInput, setNewNamaInput] = useState('');
  const [newKategoriInput, setNewKategoriInput] = useState('Kepenghuluan');

  // Disposisi Modal
  const [selectedSuratForDisposisi, setSelectedSuratForDisposisi] = useState<SuratRecord | null>(null);
  const [disposisiForm, setDisposisiForm] = useState({
    ditujukanKe: staffList[2]?.nama || 'Siti Rahmawati, S.Kom. (Staf TU)',
    batasWaktu: '2026-10-20',
    catatan: '',
    instruksi: ['Tindak lanjuti', 'Laporkan hasilnya'] as string[],
  });

  // Add Surat Form with Automatic Consecutive Numbering State
  const [formData, setFormData] = useState({
    jenis: 'Surat Masuk' as SuratJenis,
    noSurat: '',
    noAgenda: '',
    tglSurat: '2026-10-15',
    tglDiterima: '2026-10-15',
    pengirim: '',
    tujuan: 'Kepala KUA Kecamatan Serpong',
    perihal: '',
    kodeKlasifikasi: 'PW.01',
    klasifikasiNama: 'PW.01 - Kepenghuluan, Legalisasi & Rekomendasi Nikah',
    isCustomKodeManual: false,
    manualCustomKode: '',
    sifat: 'Biasa' as const,
    lampiranNama: '',
    nomorUrutManual: 0,
    isManualNumberOverride: false,
  });

  // Calculate automated numbers whenever tab, date, or classification code changes
  useEffect(() => {
    if (formData.jenis === 'Surat Keluar') {
      const activeKode = formData.isCustomKodeManual
        ? formData.manualCustomKode || 'PW.01'
        : formData.kodeKlasifikasi;

      const preview = getNextNomorSuratKeluarPreview(activeKode, formData.tglSurat);

      if (!formData.isManualNumberOverride) {
        setFormData((prev) => ({
          ...prev,
          noSurat: preview.formattedNomorSurat,
          noAgenda: preview.formattedNoAgenda,
          nomorUrutManual: preview.nomorUrut,
          pengirim: kuaSettings.namaKua,
        }));
      }
    } else {
      const autoAgenda = getNextNomorAgendaMasukPreview(formData.tglDiterima);
      setFormData((prev) => ({
        ...prev,
        noAgenda: autoAgenda,
        tujuan: `Kepala ${kuaSettings.namaKua}`,
      }));
    }
  }, [
    formData.jenis,
    formData.kodeKlasifikasi,
    formData.isCustomKodeManual,
    formData.manualCustomKode,
    formData.tglSurat,
    formData.tglDiterima,
    formData.isManualNumberOverride,
    getNextNomorSuratKeluarPreview,
    getNextNomorAgendaMasukPreview,
    kuaSettings.namaKua,
  ]);

  const filteredSurat = useMemo(() => {
    return suratList.filter((item) => {
      if (item.jenis !== activeTab) return false;

      const matchSearch =
        item.noAgenda.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.noSurat.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pengirim.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.perihal.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = filterStatus === 'Semua' || item.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [suratList, activeTab, searchQuery, filterStatus]);

  const handleSubmitNewSurat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.noSurat.trim() || !formData.pengirim.trim() || !formData.perihal.trim()) {
      alert('Harap lengkapi nomor surat, pengirim, dan perihal.');
      return;
    }

    const activeKode = formData.isCustomKodeManual
      ? formData.manualCustomKode || 'PW.01'
      : formData.kodeKlasifikasi;

    addSurat({
      jenis: formData.jenis,
      noSurat: formData.noSurat.trim(),
      noAgenda: formData.noAgenda.trim(),
      nomorUrut: formData.jenis === 'Surat Keluar' ? formData.nomorUrutManual : undefined,
      tglSurat: formData.tglSurat,
      tglDiterima: formData.tglDiterima,
      pengirim: formData.pengirim.trim(),
      tujuan: formData.tujuan.trim(),
      perihal: formData.perihal.trim(),
      klasifikasi: `${activeKode} - ${formData.klasifikasiNama}`,
      kodeKlasifikasi: activeKode,
      sifat: formData.sifat,
      status: formData.jenis === 'Surat Masuk' ? 'Baru' : 'Selesai',
      lampiranNama: formData.lampiranNama.trim() || undefined,
      lampiranUkuran: formData.lampiranNama.trim() ? '1.2 MB' : undefined,
    });

    setIsAddModalOpen(false);
  };

  const handleSaveDisposisi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSuratForDisposisi) return;

    if (!disposisiForm.catatan) {
      alert('Harap isi catatan atau arahan disposisi dari Kepala KUA.');
      return;
    }

    const disposisiObj: SuratDisposisi = {
      catatan: disposisiForm.catatan,
      instruksi: disposisiForm.instruksi,
      ditujukanKe: disposisiForm.ditujukanKe,
      batasWaktu: disposisiForm.batasWaktu,
      tanggalDisposisi: new Date().toISOString().split('T')[0],
      disposisiOleh: activeStaff.nama,
      statusTindakLanjut: 'Belum',
    };

    addDisposisi(selectedSuratForDisposisi.id, disposisiObj);
    setSelectedSuratForDisposisi(null);
  };

  const handleAddNewCustomKode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKodeInput.trim() || !newNamaInput.trim()) {
      alert('Harap isi kode surat dan nama klasifikasi.');
      return;
    }
    addCustomKodeSurat(newKodeInput, newNamaInput, newKategoriInput);
    setNewKodeInput('');
    setNewNamaInput('');
  };

  const toggleInstruksi = (val: string) => {
    setDisposisiForm((prev) => {
      const exists = prev.instruksi.includes(val);
      return {
        ...prev,
        instruksi: exists ? prev.instruksi.filter((i) => i !== val) : [...prev.instruksi, val],
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Automation & Custom Letter Code Notice */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('Surat Masuk')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'Surat Masuk'
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-4 h-4 text-emerald-700" />
            <span>Surat Masuk Dinas</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
              {suratList.filter((s) => s.jenis === 'Surat Masuk').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('Surat Keluar')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'Surat Keluar'
                ? 'bg-white text-emerald-800 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4 text-emerald-700" />
            <span>Surat Keluar Dinas (Auto-Number)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
              {suratList.filter((s) => s.jenis === 'Surat Keluar').length}
            </span>
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor agenda, nomor surat..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white w-52"
            />
          </div>

          <button
            onClick={() => setIsKodeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
            title="Kelola Kode Klasifikasi Surat Kemenag"
          >
            <Tag className="w-3.5 h-3.5 text-emerald-700" />
            <span>Kode Surat Custom</span>
          </button>

          {onOpenGoogleSheets && (
            <button
              type="button"
              onClick={onOpenGoogleSheets}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                kuaSettings.googleSheetsConfig?.spreadsheetId
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title="Sinkronisasi dengan Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">
                {kuaSettings.googleSheetsConfig?.spreadsheetId ? 'Google Sheets' : 'Sync Sheets'}
              </span>
            </button>
          )}

          <button
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                jenis: activeTab,
                isManualNumberOverride: false,
              }));
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Catat {activeTab}</span>
          </button>
        </div>
      </div>

      {/* Surat Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-4">No. Agenda</th>
                <th className="py-3 px-4">Nomor & Tgl Surat</th>
                <th className="py-3 px-4">{activeTab === 'Surat Masuk' ? 'Pengirim' : 'Tujuan'}</th>
                <th className="py-3 px-4">Perihal & Kode Klasifikasi</th>
                <th className="py-3 px-4">Sifat</th>
                <th className="py-3 px-4">Status & Disposisi</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredSurat.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada catatan {activeTab.toLowerCase()} yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredSurat.map((surat) => (
                  <tr key={surat.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* No Agenda */}
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800 whitespace-nowrap">
                      {surat.noAgenda}
                      <span className="block text-[10px] text-slate-400 font-mono">
                        Diterima: {surat.tglDiterima}
                      </span>
                    </td>

                    {/* No Surat & Tgl */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block font-mono">{surat.noSurat}</span>
                      <span className="text-[11px] text-slate-500 font-mono">Tgl: {surat.tglSurat}</span>
                    </td>

                    {/* Pengirim / Tujuan */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">
                        {activeTab === 'Surat Masuk' ? surat.pengirim : surat.tujuan}
                      </span>
                    </td>

                    {/* Perihal */}
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-medium text-slate-900 block line-clamp-2">
                        {surat.perihal}
                      </span>
                      <span className="text-[10px] text-emerald-800 font-mono mt-0.5 inline-block bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {surat.klasifikasi}
                      </span>
                    </td>

                    {/* Sifat */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          surat.sifat === 'Segera' || surat.sifat === 'Penting'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {surat.sifat}
                      </span>
                    </td>

                    {/* Status & Disposisi */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                          surat.status === 'Selesai'
                            ? 'bg-emerald-100 text-emerald-800'
                            : surat.status === 'Didisposisi'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {surat.status}
                      </span>
                      {surat.disposisi && (
                        <span className="block text-[10px] text-slate-500 truncate max-w-[140px] mt-0.5" title={surat.disposisi.catatan}>
                          &rarr; {surat.disposisi.ditujukanKe.split(' ')[0]}
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {surat.jenis === 'Surat Masuk' && (
                          <button
                            onClick={() => {
                              setSelectedSuratForDisposisi(surat);
                              if (surat.disposisi) {
                                setDisposisiForm({
                                  ditujukanKe: surat.disposisi.ditujukanKe,
                                  batasWaktu: surat.disposisi.batasWaktu,
                                  catatan: surat.disposisi.catatan,
                                  instruksi: surat.disposisi.instruksi,
                                });
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                          >
                            {surat.disposisi ? 'Lihat Disposisi' : '+ Disposisi'}
                          </button>
                        )}

                        <button
                          onClick={() => generateDisposisiPdf(kuaSettings, surat)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                          title="Cetak Lembar Disposisi Resmi PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {activeStaff.role === 'Kepala KUA' && (
                          <button
                            onClick={() => {
                              if (confirm(`Hapus agenda surat ${surat.noAgenda}?`)) {
                                deleteSurat(surat.id);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                            title="Hapus Surat (Kepala KUA)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Menampilkan <strong className="text-slate-800">{filteredSurat.length}</strong> agenda {activeTab.toLowerCase()}</span>
          <span className="font-mono text-[11px]">Buku Register Surat Berkelanjutan Kemenag</span>
        </div>
      </div>

      {/* Add Surat Modal with Automatic Consecutive Numbering */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {formData.jenis} · Penomoran Otomatis
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Pencatatan Buku Agenda Surat Dinas
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitNewSurat}>
              <div className="p-6 space-y-4 text-xs">
                {/* Switcher Jenis Surat */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Jenis Agenda Surat *</label>
                    <select
                      value={formData.jenis}
                      onChange={(e) => setFormData({ ...formData, jenis: e.target.value as SuratJenis, isManualNumberOverride: false })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-semibold"
                    >
                      <option value="Surat Masuk">Surat Masuk (Dari Instansi Luar)</option>
                      <option value="Surat Keluar">Surat Keluar (Diterbitkan KUA)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Sifat Urgensi</label>
                    <select
                      value={formData.sifat}
                      onChange={(e) => setFormData({ ...formData, sifat: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs"
                    >
                      <option value="Biasa">Biasa</option>
                      <option value="Penting">Penting</option>
                      <option value="Segera">Segera</option>
                      <option value="Rahasia">Rahasia</option>
                    </select>
                  </div>
                </div>

                {/* Surat Keluar: Automatic Numbering & Custom Code */}
                {formData.jenis === 'Surat Keluar' ? (
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-xs">
                        <Sparkles className="w-4 h-4 text-emerald-700" />
                        <span>Automatisasi Nomor Surat Berlanjut</span>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded font-bold">
                        Urut #{formData.nomorUrutManual}
                      </span>
                    </div>

                    {/* Classification Code Dropdown / Custom input */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-slate-700 mb-1 font-medium">Pilih Kode Klasifikasi Kemenag:</label>
                        <select
                          value={formData.isCustomKodeManual ? 'CUSTOM' : formData.kodeKlasifikasi}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setFormData({ ...formData, isCustomKodeManual: true, isManualNumberOverride: false });
                            } else {
                              const found = kuaSettings.kodeSuratCustomList.find((k) => k.kode === e.target.value);
                              setFormData({
                                ...formData,
                                isCustomKodeManual: false,
                                kodeKlasifikasi: e.target.value,
                                klasifikasiNama: found?.nama || e.target.value,
                                isManualNumberOverride: false,
                              });
                            }
                          }}
                          className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-medium"
                        >
                          {kuaSettings.kodeSuratCustomList.map((k) => (
                            <option key={k.kode} value={k.kode}>
                              {k.kode} - {k.nama.slice(0, 32)}...
                            </option>
                          ))}
                          <option value="CUSTOM">+ Ketik Kode Surat Custom...</option>
                        </select>
                      </div>

                      {formData.isCustomKodeManual ? (
                        <div>
                          <label className="block text-slate-700 mb-1 font-medium">Ketik Kode Custom Sendiri:</label>
                          <input
                            type="text"
                            value={formData.manualCustomKode}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                manualCustomKode: e.target.value.toUpperCase(),
                                isManualNumberOverride: false,
                              })
                            }
                            placeholder="Contoh: PW.01.1 / SP.02"
                            className="w-full bg-white border border-emerald-400 rounded px-2.5 py-1.5 text-xs font-mono font-bold"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-slate-700 mb-1 font-medium">Nama Urusan Dinas:</label>
                          <input
                            type="text"
                            readOnly
                            value={formData.klasifikasiNama}
                            className="w-full bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-600 truncate"
                          />
                        </div>
                      )}
                    </div>

                    {/* Real-time Generated Number Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-800">
                          Nomor Surat Keluar Resmi Tergenerasi:
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, isManualNumberOverride: !formData.isManualNumberOverride })}
                          className="text-[10px] text-emerald-800 underline hover:text-emerald-950 font-medium"
                        >
                          {formData.isManualNumberOverride ? 'Kembalikan ke Auto-Number' : 'Edit Nomor Manual'}
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        readOnly={!formData.isManualNumberOverride}
                        value={formData.noSurat}
                        onChange={(e) => setFormData({ ...formData, noSurat: e.target.value })}
                        className={`w-full rounded px-3 py-2 text-xs font-mono font-bold border ${
                          formData.isManualNumberOverride
                            ? 'bg-white border-amber-400 text-slate-900'
                            : 'bg-white/90 border-emerald-300 text-emerald-900 select-all'
                        }`}
                      />
                      <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                        Agenda otomatis: {formData.noAgenda}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Surat Masuk: External letter input */
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">Nomor Agenda Masuk (Otomatis) *</label>
                      <input
                        type="text"
                        readOnly
                        value={formData.noAgenda}
                        className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-2 font-mono text-xs font-bold text-emerald-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">Nomor Fisik Surat Masuk *</label>
                      <input
                        type="text"
                        required
                        value={formData.noSurat}
                        onChange={(e) => setFormData({ ...formData, noSurat: e.target.value })}
                        placeholder="Contoh: B-1420/Kk.28.74/PW.01/10/2026"
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono text-xs focus:bg-white focus:border-emerald-600"
                      />
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Tanggal Surat</label>
                    <input
                      type="date"
                      value={formData.tglSurat}
                      onChange={(e) => setFormData({ ...formData, tglSurat: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">
                      {formData.jenis === 'Surat Masuk' ? 'Tanggal Diterima di KUA' : 'Tanggal Pengiriman'}
                    </label>
                    <input
                      type="date"
                      value={formData.tglDiterima}
                      onChange={(e) => setFormData({ ...formData, tglDiterima: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Pengirim & Tujuan */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">
                      {formData.jenis === 'Surat Masuk' ? 'Instansi Pengirim *' : 'Pengirim (KUA) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.pengirim}
                      onChange={(e) => setFormData({ ...formData, pengirim: e.target.value })}
                      placeholder="Contoh: Kantor Kemenag Kota Tangerang Selatan"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">
                      {formData.jenis === 'Surat Masuk' ? 'Tujuan Surat *' : 'Instansi Tujuan *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.tujuan}
                      onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
                      placeholder="Contoh: Camat Kecamatan Serpong"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                {/* Perihal */}
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Perihal Surat *</label>
                  <textarea
                    rows={2}
                    required
                    value={formData.perihal}
                    onChange={(e) => setFormData({ ...formData, perihal: e.target.value })}
                    placeholder="Ringkasan perihal surat kedinasan..."
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                {/* Lampiran */}
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nama Berkas Lampiran (Opsional)</label>
                  <input
                    type="text"
                    value={formData.lampiranNama}
                    onChange={(e) => setFormData({ ...formData, lampiranNama: e.target.value })}
                    placeholder="Contoh: Surat_Rekomendasi_Nikah.pdf"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs"
                  />
                </div>
              </div>

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
                  Simpan & Terbitkan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Codes Management Modal */}
      {isKodeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Klasifikasi Persuratan Kemenag
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Pengaturan Kode Surat Custom
                </h3>
              </div>
              <button
                onClick={() => setIsKodeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Add New Custom Code Form */}
              <form onSubmit={handleAddNewCustomKode} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-900 text-xs">Tambah Kode Klasifikasi Baru:</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Kode Surat *</label>
                    <input
                      type="text"
                      required
                      value={newKodeInput}
                      onChange={(e) => setNewKodeInput(e.target.value.toUpperCase())}
                      placeholder="Contoh: PW.02"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Kategori</label>
                    <input
                      type="text"
                      value={newKategoriInput}
                      onChange={(e) => setNewKategoriInput(e.target.value)}
                      placeholder="Kepenghuluan / Syariah / Umum"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Nama Urusan / Uraian Klasifikasi *</label>
                  <input
                    type="text"
                    required
                    value={newNamaInput}
                    onChange={(e) => setNewNamaInput(e.target.value)}
                    placeholder="Contoh: Bimbingan Perkawinan Calon Pengantin (Bimwin)"
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded shadow-xs text-xs"
                >
                  + Tambahkan ke Daftar Kode Surat
                </button>
              </form>

              {/* Existing Codes List */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2">
                  Daftar Kode Klasifikasi Tersimpan ({kuaSettings.kodeSuratCustomList.length}):
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-60 overflow-y-auto">
                  {kuaSettings.kodeSuratCustomList.map((item) => (
                    <div key={item.kode} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {item.kode}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">[{item.kategori}]</span>
                        </div>
                        <p className="text-[11px] text-slate-700 mt-1">{item.nama}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteCustomKodeSurat(item.kode)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Hapus Kode"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsKodeModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disposisi Modal */}
      {selectedSuratForDisposisi && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  {selectedSuratForDisposisi.noAgenda}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Lembar Disposisi Kepala KUA
                </h3>
              </div>
              <button
                onClick={() => setSelectedSuratForDisposisi(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveDisposisi}>
              <div className="p-6 space-y-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <p><span className="text-slate-500">Pengirim:</span> <strong className="text-slate-800">{selectedSuratForDisposisi.pengirim}</strong></p>
                  <p><span className="text-slate-500">No. Surat:</span> <span className="font-mono">{selectedSuratForDisposisi.noSurat}</span> (Tgl: {selectedSuratForDisposisi.tglSurat})</p>
                  <p><span className="text-slate-500">Perihal:</span> {selectedSuratForDisposisi.perihal}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Diteruskan Kepada *</label>
                    <select
                      value={disposisiForm.ditujukanKe}
                      onChange={(e) => setDisposisiForm({ ...disposisiForm, ditujukanKe: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-medium"
                    >
                      {staffList.map((st) => (
                        <option key={st.id} value={`${st.nama} (${st.role})`}>
                          {st.nama} ({st.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Batas Waktu *</label>
                    <input
                      type="date"
                      required
                      value={disposisiForm.batasWaktu}
                      onChange={(e) => setDisposisiForm({ ...disposisiForm, batasWaktu: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1.5 font-semibold">Petunjuk / Instruksi Disposisi:</label>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    {[
                      'Tindak lanjuti',
                      'Hadiri / Wakili',
                      'Koordinasikan',
                      'Pelajari & Laporkan',
                      'Siapkan Surat Balasan',
                      'Simpan sebagai Arsip',
                    ].map((item) => {
                      const checked = disposisiForm.instruksi.includes(item);
                      return (
                        <label
                          key={item}
                          onClick={() => toggleInstruksi(item)}
                          className={`flex items-center gap-2 p-2 rounded border cursor-pointer select-none transition-colors ${
                            checked ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium' : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <input type="checkbox" checked={checked} readOnly className="accent-emerald-600" />
                          <span>{item}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Catatan Arahan Kepala Kantor *</label>
                  <textarea
                    rows={3}
                    required
                    value={disposisiForm.catatan}
                    onChange={(e) => setDisposisiForm({ ...disposisiForm, catatan: e.target.value })}
                    placeholder="Contoh: Harap dipersiapkan data pendukung..."
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                {selectedSuratForDisposisi.disposisi && (
                  <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-200">
                    <span className="font-semibold text-slate-800">Status Tindak Lanjut:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newStatus =
                          selectedSuratForDisposisi.disposisi?.statusTindakLanjut === 'Selesai'
                            ? 'Belum'
                            : 'Selesai';
                        updateSurat(selectedSuratForDisposisi.id, {
                          status: newStatus === 'Selesai' ? 'Selesai' : 'Sedang Diproses',
                          disposisi: {
                            ...selectedSuratForDisposisi.disposisi!,
                            statusTindakLanjut: newStatus,
                          },
                        });
                        setSelectedSuratForDisposisi({
                          ...selectedSuratForDisposisi,
                          status: newStatus === 'Selesai' ? 'Selesai' : 'Sedang Diproses',
                          disposisi: {
                            ...selectedSuratForDisposisi.disposisi!,
                            statusTindakLanjut: newStatus,
                          },
                        });
                      }}
                      className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                        selectedSuratForDisposisi.disposisi.statusTindakLanjut === 'Selesai'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {selectedSuratForDisposisi.disposisi.statusTindakLanjut === 'Selesai'
                        ? 'Telah Selesai Ditindaklanjuti'
                        : 'Belum Selesai (Klik jika Selesai)'}
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => generateDisposisiPdf(kuaSettings, selectedSuratForDisposisi)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Cetak Lembar Disposisi PDF</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSuratForDisposisi(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-xs"
                  >
                    Simpan Disposisi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
