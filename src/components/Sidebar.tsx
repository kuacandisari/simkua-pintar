import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Mail,
  FileArchive,
  FileSpreadsheet,
  UsersRound,
  Building2,
  Database,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const {
    kuaSettings,
    nikahList,
    suratList,
    notifications,
    isOnline,
    isSyncing,
  } = useKua();

  // Badge counts
  const pendingNikahCount = nikahList.filter(
    (n) => n.status !== 'Selesai' && n.status !== 'Ditolak'
  ).length;

  const pendingSuratCount = suratList.filter(
    (s) => s.jenis === 'Surat Masuk' && (s.status === 'Baru' || (s.disposisi && s.disposisi.statusTindakLanjut === 'Belum'))
  ).length;

  const urgentCount = notifications.filter((n) => !n.isDibaca && n.prioritas === 'Mendesak').length;

  // Unified Clean NavItems: Staf/Pengguna moved to TopBar profile icon; Single 'Jadwal & Kalender Nikah' menu
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dasbor & Analitik',
      icon: LayoutDashboard,
      badge: urgentCount > 0 ? `${urgentCount} Mendesak` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'nikah',
      label: 'Jadwal & Kalender Nikah',
      icon: CalendarDays,
      badge: pendingNikahCount > 0 ? `${pendingNikahCount} Akad` : undefined,
      badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
    },
    {
      id: 'surat',
      label: 'Register Surat Dinas',
      icon: Mail,
      badge: pendingSuratCount > 0 ? `${pendingSuratCount}` : undefined,
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'arsip',
      label: 'Pusat Arsip Digital',
      icon: FileArchive,
    },
    {
      id: 'laporan',
      label: 'Laporan Bulanan PDF',
      icon: FileSpreadsheet,
      badge: 'LNR Resmi',
      badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    },
    {
      id: 'master',
      label: 'Master Data KUA',
      icon: Database,
      badge: `${kuaSettings.daftarKelurahan?.length || 0} Kel`,
      badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shrink-0">
          <Building2 className="w-6 h-6 text-emerald-100" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white tracking-tight truncate">
              SIMKUA Pintar
            </span>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 font-medium px-1.5 py-0.5 rounded border border-emerald-800">
              v2.6
            </span>
          </div>
          <p className="text-[11px] text-slate-400 truncate" title={kuaSettings.namaKua}>
            {kuaSettings.kecamatan} · {kuaSettings.kabupatenKota}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
          Menu Layanan Kantor
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium whitespace-nowrap ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Institutional Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between font-mono">
        <span className="text-slate-300 font-semibold">KUA {kuaSettings.kecamatan}</span>
        <span className="text-slate-500">Kemenag RI</span>
      </div>
    </aside>
  );
};
