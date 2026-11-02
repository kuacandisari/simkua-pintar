import React, { useState, useMemo } from 'react';
import {
  FileArchive,
  Search,
  Plus,
  Filter,
  Download,
  ShieldCheck,
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
  Lock,
  Tag,
  Calendar,
  HardDrive,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';
import { ArsipDokumen, ArsipKategori } from '../types';

export const ArsipView: React.FC = () => {
  const { arsipList, addArsip, deleteArsip, activeStaff } = useKua();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<string>('Semua');
  const [previewDoc, setPreviewDoc] = useState<ArsipDokumen | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // New Upload Form
  const [uploadForm, setUploadForm] = useState({
    judul: '',
    kategori: 'Berkas Nikah' as ArsipKategori,
    noReferensi: '',
    tahun: '2026',
    ukuran: '2.4 MB',
    tipeFile: 'PDF' as const,
    keterangan: '',
    tags: 'Akta Nikah, Kemenag',
  });

  const categories: string[] = [
    'Semua',
    'Berkas Nikah',
    'Surat Keputusan',
    'Dokumen Rujuk',
    'Wakaf & Kemasjidan',
    'Arsip Kepegawaian',
    'Laporan Bulanan',
  ];

  const filteredArsip = useMemo(() => {
    return arsipList.filter((item) => {
      const matchSearch =
        item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.noReferensi.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat = selectedKategori === 'Semua' || item.kategori === selectedKategori;
      return matchSearch && matchCat;
    });
  }, [arsipList, searchQuery, selectedKategori]);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.judul || !uploadForm.noReferensi) {
      alert('Harap lengkapi judul dokumen dan nomor referensi.');
      return;
    }

    addArsip({
      judul: uploadForm.judul,
      kategori: uploadForm.kategori,
      noReferensi: uploadForm.noReferensi,
      tahun: uploadForm.tahun,
      ukuran: uploadForm.ukuran || '1.8 MB',
      tipeFile: uploadForm.tipeFile,
      keterangan: uploadForm.keterangan || 'Arsip tersimpan dengan verifikasi hash integritas digital Kemenag.',
      isTerenkripsi: true,
      tags: uploadForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });

    setIsUploadModalOpen(false);
    setUploadForm({
      judul: '',
      kategori: 'Berkas Nikah',
      noReferensi: '',
      tahun: '2026',
      ukuran: '2.4 MB',
      tipeFile: 'PDF',
      keterangan: '',
      tags: 'Akta Nikah, Kemenag',
    });
  };

  const copyChecksum = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Security Highlight */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-5 rounded-2xl shadow-xs border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700/60 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                Penyimpanan Arsip Digital Terenkripsi KUA
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-medium">
                SHA-256 Integritas
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Repositori digital tersentralisasi untuk menjaga dokumen fisik perkawinan, surat keputusan, dan wakaf dari risiko kerusakan fisik serta pemalsuan data.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-emerald-700" />
          <span>Unggah Arsip Digital Baru</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedKategori(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  selectedKategori === cat
                    ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul arsip, nomor referensi, tag..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Archive Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredArsip.length === 0 ? (
          <div className="col-span-full py-16 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            Tidak ada arsip dokumen digital yang cocok dengan filter atau kata kunci.
          </div>
        ) : (
          filteredArsip.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {doc.kategori}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Tahun {doc.tahun} · {doc.tipeFile}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xs font-bold text-slate-900 mt-2 line-clamp-2 leading-snug">
                  {doc.judul}
                </h3>

                {/* Reference */}
                <p className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                  Ref: <strong className="text-slate-700">{doc.noReferensi}</strong>
                </p>

                {/* Description */}
                <p className="text-[11px] text-slate-600 mt-2 line-clamp-2">
                  {doc.keterangan}
                </p>

                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {doc.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400 font-mono">
                  Ukuran: {doc.ukuran}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors"
                    title="Pratinjau Dokumen & Hash Integritas"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      alert(`Memulai pengunduhan terenkripsi: "${doc.judul}".`);
                    }}
                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                    title="Unduh Berkas"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {activeStaff.role === 'Kepala KUA' && (
                    <button
                      onClick={() => {
                        if (confirm(`Yakin ingin menghapus dokumen arsip "${doc.judul}"?`)) {
                          deleteArsip(doc.id);
                        }
                      }}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                      title="Hapus Dokumen (Kepala KUA)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  {previewDoc.kategori}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">
                  {previewDoc.judul}
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Document Mock Viewer Box */}
              <div className="h-48 rounded-xl bg-slate-900 text-slate-200 p-5 flex flex-col justify-between border border-slate-800 relative overflow-hidden">
                <div className="absolute top-2 right-2 opacity-10">
                  <FileText className="w-32 h-32 text-emerald-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>DOKUMEN RESMI KEMENTERIAN AGAMA RI</span>
                  </div>
                  <h4 className="text-white font-bold text-sm mt-2">{previewDoc.judul}</h4>
                  <p className="text-slate-400 font-mono text-xs mt-1">Nomor: {previewDoc.noReferensi}</p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-3">
                  <span>Format: {previewDoc.tipeFile} ({previewDoc.ukuran})</span>
                  <span>Diunggah: {new Date(previewDoc.uploadedAt).toLocaleDateString('id-ID')}</span>
                </div>
              </div>

              {/* Metadata Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <p><span className="text-slate-500">Nomor Referensi:</span> <strong className="font-mono text-slate-800">{previewDoc.noReferensi}</strong></p>
                <p><span className="text-slate-500">Keterangan:</span> {previewDoc.keterangan}</p>
                <p><span className="text-slate-500">Petugas Pengunggah:</span> {previewDoc.uploadedBy}</p>
              </div>

              {/* End-to-End Checksum Integrity */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Integritas Digital SHA-256 (Anti-Manipulasi)</span>
                  </div>
                  <button
                    onClick={() => copyChecksum(previewDoc.checksum)}
                    className="text-[11px] text-emerald-800 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedHash ? 'Tersalin!' : 'Salin Hash'}</span>
                  </button>
                </div>
                <p className="font-mono text-[10px] text-emerald-950 bg-white p-2 rounded border border-emerald-200 break-all select-all">
                  {previewDoc.checksum}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  alert(`Mengunduh berkas arsip "${previewDoc.judul}"...`);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Berkas Asli</span>
              </button>

              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 text-xs text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Archive Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-base font-bold text-slate-900">
                Unggah Dokumen Arsip Digital KUA
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="p-6 space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Judul Dokumen *</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.judul}
                    onChange={(e) => setUploadForm({ ...uploadForm, judul: e.target.value })}
                    placeholder="Contoh: Akta Nikah No. 0495/042/X/2026 - Ilham & Annisa"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Kategori Arsip *</label>
                    <select
                      value={uploadForm.kategori}
                      onChange={(e) => setUploadForm({ ...uploadForm, kategori: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-medium"
                    >
                      {categories.filter((c) => c !== 'Semua').map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Tahun Arsip</label>
                    <input
                      type="text"
                      value={uploadForm.tahun}
                      onChange={(e) => setUploadForm({ ...uploadForm, tahun: e.target.value })}
                      placeholder="2026"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Nomor Referensi *</label>
                    <input
                      type="text"
                      required
                      value={uploadForm.noReferensi}
                      onChange={(e) => setUploadForm({ ...uploadForm, noReferensi: e.target.value })}
                      placeholder="0495/042/X/2026"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Ukuran File</label>
                    <input
                      type="text"
                      value={uploadForm.ukuran}
                      onChange={(e) => setUploadForm({ ...uploadForm, ukuran: e.target.value })}
                      placeholder="Contoh: 3.2 MB"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Keterangan Dokumen</label>
                  <textarea
                    rows={2}
                    value={uploadForm.keterangan}
                    onChange={(e) => setUploadForm({ ...uploadForm, keterangan: e.target.value })}
                    placeholder="Ringkasan isi berkas..."
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Tagar / Kata Kunci (Pisahkan dengan koma)</label>
                  <input
                    type="text"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                    placeholder="Akta Nikah, Serpong, Model N"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-xs"
                >
                  Simpan & Enkripsi Arsip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
