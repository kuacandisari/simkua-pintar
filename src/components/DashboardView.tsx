import React, { useState } from 'react';
import {
  HeartHandshake,
  Mail,
  FileArchive,
  TrendingUp,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Building,
  UserCheck,
  ChevronRight,
  Shield,
  Download,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';
import { generateLaporanLnrPdf } from '../lib/pdfGenerator';

interface DashboardViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenNewNikah: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab, onOpenNewNikah }) => {
  const {
    kuaSettings,
    nikahList,
    suratList,
    arsipList,
    auditList,
    notifications,
  } = useKua();

  const [selectedChartPeriod, setSelectedChartPeriod] = useState<'bulanan' | 'triwulan'>('bulanan');

  // KPI Calculations
  const totalNikahBulanIni = nikahList.length;
  const nikahDiKua = nikahList.filter((n) => n.lokasiAkad === 'Di KUA').length;
  const nikahBedol = nikahList.filter((n) => n.lokasiAkad === 'Luar KUA (Bedol)').length;
  const rasioBedolPersen = totalNikahBulanIni > 0 ? Math.round((nikahBedol / totalNikahBulanIni) * 100) : 0;
  const totalPnbpSetor = nikahBedol * 600000;

  const suratPendingDisposisi = suratList.filter(
    (s) => s.jenis === 'Surat Masuk' && (s.status === 'Baru' || (s.disposisi && s.disposisi.statusTindakLanjut === 'Belum'))
  ).length;

  const urgentNikah = nikahList
    .filter((n) => n.status !== 'Selesai' && n.status !== 'Ditolak')
    .sort((a, b) => new Date(a.tanggalAkad).getTime() - new Date(b.tanggalAkad).getTime())
    .slice(0, 4);

  // Monthly trend data (Sample Jan - Okt 2026)
  const monthlyData = [
    { bulan: 'Jan', kua: 14, bedol: 18, total: 32 },
    { bulan: 'Feb', kua: 16, bedol: 20, total: 36 },
    { bulan: 'Mar', kua: 8, bedol: 12, total: 20 }, // Ramadan dip
    { bulan: 'Apr', kua: 25, bedol: 35, total: 60 }, // Syawal peak
    { bulan: 'Mei', kua: 20, bedol: 28, total: 48 },
    { bulan: 'Jun', kua: 22, bedol: 30, total: 52 },
    { bulan: 'Jul', kua: 18, bedol: 24, total: 42 },
    { bulan: 'Agt', kua: 24, bedol: 32, total: 56 },
    { bulan: 'Sep', kua: 21, bedol: 29, total: 50 },
    { bulan: 'Okt', kua: nikahDiKua + 15, bedol: nikahBedol + 18, total: totalNikahBulanIni + 33 },
  ];

  const maxMonthly = Math.max(...monthlyData.map((d) => d.total));

  // Day distribution
  const dayDistribution = [
    { hari: 'Ahad / Minggu', count: 42, pct: 38 },
    { hari: 'Sabtu', count: 35, pct: 32 },
    { hari: 'Jumat', count: 18, pct: 16 },
    { hari: 'Senin - Kamis', count: 15, pct: 14 },
  ];

  return (
    <div className="space-y-6">
      {/* KUA Office Welcome Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm text-white">
        <div className="absolute inset-0">
          <img
            src="/src/assets/images/kua_office_building_1792047078773.jpg"
            alt="Gedung KUA Serpong"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/95 via-slate-900/90 to-slate-900/75" />
        </div>

        <div className="relative p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Building className="w-3.5 h-3.5" />
              <span>Sistem Informasi Manajemen Kantor Urusan Agama</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {kuaSettings.namaKua}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Selamat datang di pusat komando layanan kepenghuluan, tata usaha persuratan, dan arsip digital. Terintegrasi penuh dengan pelaporan resmi Kementerian Agama RI.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span>Kode KUA: <strong className="text-white font-mono">{kuaSettings.kodeKua}</strong></span>
              <span>·</span>
              <span>Kepala KUA: <strong className="text-white">{kuaSettings.kepalaKuaNama}</strong></span>
              <span>·</span>
              <span>NIP: <strong className="text-white font-mono">{kuaSettings.kepalaKuaNip}</strong></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => generateLaporanLnrPdf(kuaSettings, 'Oktober', 2026, nikahList)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Laporan LNR PDF</span>
            </button>
            <button
              onClick={onOpenNewNikah}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
            >
              <HeartHandshake className="w-4 h-4" />
              <span>Daftar Nikah Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Key KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Pendaftaran Nikah (Bulan Ini)</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono tabular-nums">
                {totalNikahBulanIni} <span className="text-xs font-normal text-slate-500">Pasang</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Di KUA (Gratis): <strong className="text-slate-800 font-mono">{nikahDiKua}</strong></span>
            <span>·</span>
            <span>Bedol: <strong className="text-slate-800 font-mono">{nikahBedol}</strong></span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Setoran PNBP Nikah Bedol</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono tabular-nums">
                Rp {totalPnbpSetor.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Rasio Bedol: <strong className="text-slate-800 font-mono">{rasioBedolPersen}%</strong></span>
            <span className="text-emerald-700 font-medium">SIMPONI Kemenag</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Surat Menunggu Disposisi</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono tabular-nums">
                {suratPendingDisposisi} <span className="text-xs font-normal text-slate-500">Berkas</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <Mail className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Total Agenda: <strong className="text-slate-800 font-mono">{suratList.length}</strong></span>
            <button
              onClick={() => onNavigateTab('surat')}
              className="text-amber-700 font-medium hover:underline text-[11px]"
            >
              Buka Agenda &rarr;
            </button>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Arsip Digital Terenkripsi</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono tabular-nums">
                {arsipList.length} <span className="text-xs font-normal text-slate-500">Dokumen</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Integritas SHA-256</span>
            <span className="text-teal-700 font-medium">Aman & Terpusat</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Monthly Trends (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tren Peristiwa Nikah Bulanan Tahun 2026
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan pendaftaran nikah di Balai Nikah KUA vs Luar KUA (Bedol)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-emerald-600 inline-block" />
                Di KUA
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
                Bedol
              </span>
            </div>
          </div>

          {/* Custom Responsive SVG Chart */}
          <div className="mt-6">
            <div className="h-56 flex items-end gap-2 sm:gap-4 pt-6 px-2 border-b border-slate-200">
              {monthlyData.map((item, idx) => {
                const heightPct = Math.round((item.total / maxMonthly) * 100);
                const kuaPct = Math.round((item.kua / item.total) * 100);
                const bedolPct = 100 - kuaPct;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 font-mono">
                      {item.bulan}: Total {item.total} (KUA {item.kua}, Bedol {item.bedol})
                    </div>

                    {/* Stacked Bar */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[32px] rounded-t flex flex-col overflow-hidden transition-all duration-300 hover:brightness-110"
                    >
                      <div
                        style={{ height: `${bedolPct}%` }}
                        className="bg-amber-500 w-full"
                        title={`Bedol: ${item.bedol}`}
                      />
                      <div
                        style={{ height: `${kuaPct}%` }}
                        className="bg-emerald-600 w-full"
                        title={`Di KUA: ${item.kua}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="flex items-center gap-2 sm:gap-4 px-2 pt-2 text-[11px] text-slate-500 font-mono">
              {monthlyData.map((item, idx) => (
                <div key={idx} className="flex-1 text-center font-medium">
                  {item.bulan}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 flex items-center justify-between">
            <span>Rata-rata pernikahan: <strong className="text-slate-800 font-mono">45 peristiwa/bulan</strong></span>
            <span>Bulan puncak: <strong className="text-emerald-700">Syawal / April (60 peristiwa)</strong></span>
          </div>
        </div>

        {/* Donut & Day Distribution (1 Column) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Distribusi Hari Favorit Akad
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kecenderungan hari akad nikah masyarakat
            </p>

            <div className="mt-5 space-y-3.5">
              {dayDistribution.map((d, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{d.hari}</span>
                    <span className="font-mono text-slate-500 font-medium">
                      {d.count} pasang ({d.pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${d.pct}%` }}
                      className={`h-full rounded-full ${
                        i === 0
                          ? 'bg-emerald-600'
                          : i === 1
                          ? 'bg-emerald-500'
                          : i === 2
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Penugasan Penghulu Aktif:</h4>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Drs. H. Ahmad Fauzi (Penghulu Madya)</span>
                <span className="font-mono font-bold text-emerald-700">18 Akad</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ust. M. Ridwan (Penghulu Muda)</span>
                <span className="font-mono font-bold text-emerald-700">24 Akad</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Urgent Akad Nikah Schedule & Recent Staff Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Akad Schedule */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Jadwal Akad Nikah Terdekat (H-3 Peringatan)
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('kalender')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Buka Kalender Akad</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {urgentNikah.map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {item.noPendaftaran}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      item.status === 'Siap Akad'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 mt-1.5 truncate">
                    {item.suami.nama} & {item.istri.nama}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{item.tanggalAkad} · {item.jamAkad} WIB</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{item.lokasiAkad}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-medium text-slate-600 block">
                    Penghulu:
                  </span>
                  <span className="text-xs font-semibold text-slate-800 truncate block max-w-[130px]">
                    {item.penghuluNama.split(',')[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Transparent Staff Activity Log Snapshot */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Rekam Jejak Transparan Staf KUA (Audit Trail)
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>Audit Penuh</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {auditList.slice(0, 5).map((log) => (
              <div key={log.id} className="p-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{log.userName}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                      {log.userRole}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                  <strong className="text-emerald-700 font-mono">[{log.aksi}]</strong> {log.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
