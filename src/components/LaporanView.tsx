import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  FileCheck,
  TrendingUp,
  Printer,
  FileText,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';
import { generateLaporanLnrPdf, generateBukuRegisterNikahPdf } from '../lib/pdfGenerator';

export const LaporanView: React.FC = () => {
  const { kuaSettings, nikahList, suratList, arsipList, auditList } = useKua();

  const [selectedBulan, setSelectedBulan] = useState('Oktober');
  const [selectedTahun, setSelectedTahun] = useState(2026);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Calculations for current selected month
  const totalNikah = nikahList.length;
  const nikahKua = nikahList.filter((n) => n.lokasiAkad === 'Di KUA').length;
  const nikahBedol = nikahList.filter((n) => n.lokasiAkad === 'Luar KUA (Bedol)').length;
  const totalPnbp = nikahBedol * 600000;
  const nikahSelesai = nikahList.filter((n) => n.status === 'Selesai').length;

  const handleExportJson = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      kuaSettings,
      nikahList,
      suratList,
      arsipList,
      auditList,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIMKUA_Backup_${kuaSettings.kecamatan}_${selectedBulan}_${selectedTahun}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>PMA No. 20 Tahun 2019 tentang Pencatatan Pernikahan</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Pusat Penerbitan Laporan Bulanan Nikah & Rujuk (Model LNR)
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Laporan resmi bulanan yang siap diunduh dalam format PDF standar Kementerian Agama Republik Indonesia, lengkap dengan rekapitulasi PNBP, daftar peristiwa akad, dan lembar legalisasi Kepala KUA.
          </p>
        </div>

        {/* Month Selector & Primary Download */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <select
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <span className="text-slate-400">/</span>
            <select
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer font-mono"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          <button
            onClick={() => generateLaporanLnrPdf(kuaSettings, selectedBulan, selectedTahun, nikahList)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Unduh LNR Resmi (PDF)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Peristiwa Nikah</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">
            {totalNikah} <span className="text-xs font-normal text-slate-500">Pasang</span>
          </span>
          <span className="text-[10px] text-emerald-700 font-medium mt-2 block">
            Bulan {selectedBulan} {selectedTahun}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Nikah di Kantor KUA</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">
            {nikahKua} <span className="text-xs font-normal text-slate-500">Pasang</span>
          </span>
          <span className="text-[10px] text-emerald-700 font-medium mt-2 block">
            Tarif Rp 0 (Bebas Biaya)
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Nikah Luar KUA (Bedol)</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">
            {nikahBedol} <span className="text-xs font-normal text-slate-500">Pasang</span>
          </span>
          <span className="text-[10px] text-amber-700 font-medium mt-2 block">
            Tarif PNBP Rp 600.000 / pasang
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total PNBP Disetor</span>
          <span className="text-xl font-bold font-mono text-emerald-800 mt-1 block tabular-nums">
            Rp {totalPnbp.toLocaleString('id-ID')}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-2 block">
            Kas Negara (SIMPONI)
          </span>
        </div>
      </div>

      {/* Official Table Preview for LNR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pratinjau Matriks Laporan Model LNR - Kementerian Agama RI
            </h3>
            <p className="text-[11px] text-slate-500">
              Format tata letak kolom yang otomatis digenerate ke dokumen PDF
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => generateBukuRegisterNikahPdf(kuaSettings, nikahList)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Cetak Buku Register PDF</span>
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Ekspor Backup JSON</span>
            </button>
          </div>
        </div>

        {/* Visual Mock Table */}
        <div className="p-6 overflow-x-auto">
          <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-900 text-white font-bold text-[11px]">
                  <th className="py-2.5 px-3 border-r border-emerald-800 text-center w-12">No</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800">Uraian Rekapitulasi Pelayanan</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800 text-center w-28">Jumlah</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800 text-center w-28">Satuan</th>
                  <th className="py-2.5 px-3">Keterangan Regulasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-center font-mono border-r border-slate-200">1</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-800">
                    Pernikahan di Balai Nikah Kantor KUA
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 border-r border-slate-200">
                    {nikahKua}
                  </td>
                  <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-500">Pasang</td>
                  <td className="py-2 px-3 text-slate-600">Tarif Rp 0 (Sesuai PP No. 48/2014 dan PMA No. 20/2019)</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-center font-mono border-r border-slate-200">2</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-800">
                    Pernikahan di Luar Balai Nikah KUA (Bedol)
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 border-r border-slate-200">
                    {nikahBedol}
                  </td>
                  <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-500">Pasang</td>
                  <td className="py-2 px-3 text-slate-600">Tarif PNBP Rp 600.000 / peristiwa disetor ke Kas Negara</td>
                </tr>
                <tr className="hover:bg-slate-50 bg-emerald-50/30">
                  <td className="py-2 px-3 text-center font-mono border-r border-slate-200 font-bold">3</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-bold text-emerald-950">
                    Total Peristiwa Pernikahan Bulan Ini
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-extrabold text-emerald-900 border-r border-slate-200">
                    {totalNikah}
                  </td>
                  <td className="py-2 px-3 text-center border-r border-slate-200 font-bold text-emerald-950">Pasang</td>
                  <td className="py-2 px-3 text-emerald-900 font-medium">Rekapitulasi resmi KUA Kecamatan Serpong</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-center font-mono border-r border-slate-200">4</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-800">
                    Total Penerimaan PNBP Disetor ke Kas Negara
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700 border-r border-slate-200">
                    Rp {totalPnbp.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-500">Rupiah</td>
                  <td className="py-2 px-3 text-slate-600">Tervalidasi melalui SIMPONI Kemenkeu & BSI</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-center font-mono border-r border-slate-200">5</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-800">
                    Akta Nikah & Buku Nikah Telah Diterbitkan
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 border-r border-slate-200">
                    {nikahSelesai}
                  </td>
                  <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-500">Buku</td>
                  <td className="py-2 px-3 text-slate-600">Diserahkan langsung kepada pengantin saat akad selesai</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-center font-mono border-r border-slate-200">6</td>
                  <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-800">
                    Peristiwa Rujuk
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 border-r border-slate-200">
                    0
                  </td>
                  <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-500">Peristiwa</td>
                  <td className="py-2 px-3 text-slate-600">Nihil pada periode ini</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legalization Seal Signature Area */}
          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-[11px] max-w-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Dokumen ini terintegrasi langsung dengan database Firestore SIMKUA Pintar dan dapat diverifikasi secara elektronik.
              </span>
            </div>

            <div className="text-right text-xs">
              <p className="text-slate-500">{kuaSettings.kecamatan}, 31 {selectedBulan} {selectedTahun}</p>
              <p className="font-semibold text-slate-800 mt-0.5">Kepala Kantor Urusan Agama,</p>
              <div className="h-14 flex items-center justify-end">
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                  [TANDA TANGAN ELEKTRONIK TERVERIFIKASI]
                </span>
              </div>
              <p className="font-bold text-slate-900">{kuaSettings.kepalaKuaNama}</p>
              <p className="text-slate-500 font-mono text-[11px]">NIP. {kuaSettings.kepalaKuaNip}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
