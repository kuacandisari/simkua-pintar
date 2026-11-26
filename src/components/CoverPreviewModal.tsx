import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookMarked,
  CheckCircle2,
  Download,
  ExternalLink,
  Printer,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import { KuaSettings, NikahRegistration } from '../types';
import {
  CoverExtraData,
  DEFAULT_SYARAT_NIKAH,
  SyaratCoverItem,
  generateCoverPendaftaranPdf,
  getCoverPendaftaranPdfBlobUrl,
} from '../lib/pdfGenerator';

interface CoverPreviewModalProps {
  nikah: NikahRegistration;
  kuaSettings: KuaSettings;
  onClose: () => void;
  onSaveExtraToNikah?: (id: string, patch: Partial<NikahRegistration>) => void;
}

export const CoverPreviewModal: React.FC<CoverPreviewModalProps> = ({
  nikah,
  kuaSettings,
  onClose,
  onSaveExtraToNikah,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [extra, setExtra] = useState<CoverExtraData>(() => ({
    suamiNik: nikah.suami.nik || '',
    suamiTtl: '',
    suamiStatus: 'Jejaka / Belum Kawin',
    suamiPekerjaan: '',
    suamiKelurahan: nikah.suami.kelurahan || nikah.kelurahanAkad || '',
    suamiAlamat: nikah.suami.alamat || '',
    istriNik: nikah.istri.nik || '',
    istriTtl: '',
    istriStatus: 'Perawan / Belum Kawin',
    istriPekerjaan: '',
    istriKelurahan: nikah.istri.kelurahan || nikah.kelurahanAkad || '',
    istriAlamat: nikah.istri.alamat || '',
    waliStatus: nikah.wali?.statusWali || 'Wali Nasab',
    waliNama: nikah.wali?.nama || '',
    waliHubungan: nikah.wali?.hubungan || 'Ayah Kandung',
    saksi1Nama: nikah.saksi?.saksi1Nama || '',
    saksi2Nama: nikah.saksi?.saksi2Nama || '',
    mahar: nikah.saksi?.mahar || '',
    catatanPemeriksaan: nikah.catatan || '',
    syaratList: DEFAULT_SYARAT_NIKAH.map((item) => ({
      ...item,
      status:
        item.kode === 'REKOM' && nikah.lokasiAkad === 'Di KUA'
          ? 'Tidak Perlu'
          : item.kode === 'PNBP' && nikah.biayaNikah === 0
          ? 'Tidak Perlu'
          : item.status,
      keterangan:
        item.kode === 'PNBP'
          ? nikah.kodeBillingPnbp
            ? `Billing: ${nikah.kodeBillingPnbp}`
            : nikah.biayaNikah === 0
            ? 'Gratis (Di KUA)'
            : 'Rp 600.000 (Bedol)'
          : item.keterangan,
    })),
  }));

  const [savedNotice, setSavedNotice] = useState(false);

  const pdfBlobUrl = useMemo(() => {
    return getCoverPendaftaranPdfBlobUrl(kuaSettings, nikah, extra);
  }, [kuaSettings, nikah, extra]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  const handleSyaratStatusChange = (
    idx: number,
    status: SyaratCoverItem['status']
  ) => {
    setExtra((prev) => {
      const nextList = [...(prev.syaratList || DEFAULT_SYARAT_NIKAH)];
      nextList[idx] = { ...nextList[idx], status };
      return { ...prev, syaratList: nextList };
    });
  };

  const handleSyaratKetChange = (idx: number, keterangan: string) => {
    setExtra((prev) => {
      const nextList = [...(prev.syaratList || DEFAULT_SYARAT_NIKAH)];
      nextList[idx] = { ...nextList[idx], keterangan };
      return { ...prev, syaratList: nextList };
    });
  };

  const handleSaveToRegister = () => {
    if (!onSaveExtraToNikah) return;
    onSaveExtraToNikah(nikah.id, {
      suami: {
        ...nikah.suami,
        nik: extra.suamiNik?.trim() || undefined,
        kelurahan: extra.suamiKelurahan?.trim() || undefined,
        alamat: extra.suamiAlamat?.trim() || undefined,
      },
      istri: {
        ...nikah.istri,
        nik: extra.istriNik?.trim() || undefined,
        kelurahan: extra.istriKelurahan?.trim() || undefined,
        alamat: extra.istriAlamat?.trim() || undefined,
      },
      wali: extra.waliNama?.trim()
        ? {
            nama: extra.waliNama.trim(),
            statusWali: extra.waliStatus,
            hubungan: extra.waliHubungan?.trim() || undefined,
          }
        : nikah.wali,
      saksi: {
        saksi1Nama: extra.saksi1Nama?.trim() || undefined,
        saksi2Nama: extra.saksi2Nama?.trim() || undefined,
        mahar: extra.mahar?.trim() || undefined,
      },
      catatan: extra.catatanPemeriksaan?.trim() || nikah.catatan,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  const handlePrintPreview = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      }
    } catch {
      generateCoverPendaftaranPdf(kuaSettings, nikah, extra);
    }
  };

  const syaratList = extra.syaratList || DEFAULT_SYARAT_NIKAH;
  const adaCount = syaratList.filter((s) => s.status === 'Ada').length;
  const kurangCount = syaratList.filter((s) => s.status === 'Kurang').length;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-100">
      <div className="bg-white rounded-2xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden">
        {/* Top Toolbar */}
        <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <BookMarked className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold truncate">
                Preview &amp; Kelengkapan Cover Pendaftaran Nikah — {nikah.suami.nama} &amp; {nikah.istri.nama}
              </h3>
              <p className="text-[10px] text-slate-300 font-mono truncate">
                No. Register: {nikah.noPendaftaran} · Akad: {nikah.tanggalAkad} ({nikah.jamAkad} WIB)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSaveExtraToNikah && (
              <button
                type="button"
                onClick={handleSaveToRegister}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-300 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                title="Simpan data NIK, Alamat, Wali & Saksi ke Register Nikah"
              >
                {savedNotice ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{savedNotice ? 'Tersimpan!' : 'Simpan Data ke Register'}</span>
              </button>
            )}

            <a
              href={pdfBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg border border-blue-400/50 transition-colors"
              title="Buka preview PDF Cover di tab browser baru sebelum download/print"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Preview di Tab Baru</span>
            </a>

            <button
              type="button"
              onClick={handlePrintPreview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-300 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={() => generateCoverPendaftaranPdf(kuaSettings, nikah, extra)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Tutup Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Split Body: Left Form & Checklist | Right Live PDF Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left Panel: Editable Complete Data & 16 Syarat Checklist */}
          <div className="lg:col-span-5 border-r border-slate-200 overflow-y-auto p-4 space-y-4 bg-slate-50 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-emerald-950 text-[11px]">
                  Ringkasan Syarat Pendaftaran (16 Poin PMA 20/2019)
                </p>
                <p className="text-[10px] text-emerald-800">
                  Ada: <strong>{adaCount}</strong> · Kurang: <strong className="text-rose-700">{kurangCount}</strong> · Preview PDF di kanan update otomatis.
                </p>
              </div>
              <RefreshCw className="w-4 h-4 text-emerald-700 shrink-0" />
            </div>

            {/* Biodata Lengkap Catin */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1.5">
                1. Lengkapi Biodata Suami &amp; Istri (Opsional)
              </h4>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">NIK Suami</label>
                  <input
                    type="text"
                    value={extra.suamiNik || ''}
                    onChange={(e) => setExtra({ ...extra, suamiNik: e.target.value })}
                    placeholder="16 digit NIK"
                    className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">NIK Istri</label>
                  <input
                    type="text"
                    value={extra.istriNik || ''}
                    onChange={(e) => setExtra({ ...extra, istriNik: e.target.value })}
                    placeholder="16 digit NIK"
                    className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">TTL Suami</label>
                  <input
                    type="text"
                    value={extra.suamiTtl || ''}
                    onChange={(e) => setExtra({ ...extra, suamiTtl: e.target.value })}
                    placeholder="Semarang, 12-05-1998"
                    className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">TTL Istri</label>
                  <input
                    type="text"
                    value={extra.istriTtl || ''}
                    onChange={(e) => setExtra({ ...extra, istriTtl: e.target.value })}
                    placeholder="Semarang, 20-08-1999"
                    className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Status Suami</label>
                  <input
                    type="text"
                    value={extra.suamiStatus || ''}
                    onChange={(e) => setExtra({ ...extra, suamiStatus: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Status Istri</label>
                  <input
                    type="text"
                    value={extra.istriStatus || ''}
                    onChange={(e) => setExtra({ ...extra, istriStatus: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Alamat Suami</label>
                  <input
                    type="text"
                    value={extra.suamiAlamat || ''}
                    onChange={(e) => setExtra({ ...extra, suamiAlamat: e.target.value })}
                    placeholder="Jl. / RT RW..."
                    className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Alamat Istri</label>
                  <input
                    type="text"
                    value={extra.istriAlamat || ''}
                    onChange={(e) => setExtra({ ...extra, istriAlamat: e.target.value })}
                    placeholder="Jl. / RT RW..."
                    className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Wali, Saksi & Mahar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1.5">
                2. Wali Nikah, Saksi &amp; Mahar
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Nama Wali</label>
                  <input
                    type="text"
                    value={extra.waliNama || ''}
                    onChange={(e) => setExtra({ ...extra, waliNama: e.target.value })}
                    placeholder="Nama lengkap wali"
                    className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Status &amp; Hubungan</label>
                  <select
                    value={extra.waliStatus || 'Wali Nasab'}
                    onChange={(e) => setExtra({ ...extra, waliStatus: e.target.value as 'Wali Nasab' | 'Wali Hakim' })}
                    className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
                  >
                    <option value="Wali Nasab">Wali Nasab</option>
                    <option value="Wali Hakim">Wali Hakim</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Saksi 1</label>
                  <input
                    type="text"
                    value={extra.saksi1Nama || ''}
                    onChange={(e) => setExtra({ ...extra, saksi1Nama: e.target.value })}
                    placeholder="Nama saksi 1"
                    className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Saksi 2</label>
                  <input
                    type="text"
                    value={extra.saksi2Nama || ''}
                    onChange={(e) => setExtra({ ...extra, saksi2Nama: e.target.value })}
                    placeholder="Nama saksi 2"
                    className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Mas Kawin / Mahar</label>
                <input
                  type="text"
                  value={extra.mahar || ''}
                  onChange={(e) => setExtra({ ...extra, mahar: e.target.value })}
                  placeholder="Contoh: Seperangkat alat sholat & uang tunai Rp 500.000"
                  className="w-full px-2.5 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* 16 Syarat Pendaftaran Checklist */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1.5">
                3. Checklist Syarat Pendaftaran Nikah (Halaman 2)
              </h4>
              <div className="space-y-2">
                {syaratList.map((item, idx) => (
                  <div
                    key={item.kode}
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[11px] font-semibold text-slate-800 leading-snug">
                        <span className="font-mono text-emerald-800 font-bold mr-1">
                          {idx + 1}. [{item.kode}]
                        </span>
                        {item.nama}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="inline-flex rounded-md border border-slate-200 bg-white overflow-hidden">
                        {(['Ada', 'Kurang', 'Tidak Perlu'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleSyaratStatusChange(idx, st)}
                            className={`px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                              item.status === st
                                ? st === 'Ada'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'Kurang'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={item.keterangan}
                        onChange={(e) => handleSyaratKetChange(idx, e.target.value)}
                        placeholder="Catatan..."
                        className="flex-1 min-w-[110px] px-2 py-0.5 text-[10px] bg-white border border-slate-200 rounded focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Live Embedded PDF Preview + Open in New Tab Bar */}
          <div className="lg:col-span-7 bg-slate-800 flex flex-col min-h-[420px]">
            <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-[11px] text-slate-300 flex items-center justify-between gap-2">
              <span>Pratinjau Dokumen PDF (2 Halaman A4)</span>
              <a
                href={pdfBlobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 underline underline-offset-2 inline-flex items-center gap-1 font-semibold"
              >
                <span>Klik jika preview tidak muncul — Buka di Tab Baru</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <iframe
              ref={iframeRef}
              src={pdfBlobUrl}
              title={`Preview Cover Pendaftaran ${nikah.noPendaftaran}`}
              className="w-full flex-1 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
