import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Inbox,
  Send,
  BookOpen,
  Landmark,
  HardDrive,
  FileSpreadsheet,
  Building2,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  hasDot?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const {
    kuaSettings,
    officeUser,
    logout,
    nikahList,
    suratList,
    wakafList,
    muallafList,
    bukuBatchList,
    bukuMutasiList,
    notifications,
  } = useKua();

  const pendingNikahCount = nikahList.filter(
    (n) => n.status !== 'Selesai' && n.status !== 'Ditolak'
  ).length;

  const pendingSuratMasukCount = suratList.filter(
    (s) => s.jenis === 'Surat Masuk' && (s.status === 'Baru' || (s.disposisi && s.disposisi.statusTindakLanjut === 'Belum'))
  ).length;

  const suratKeluarCount = suratList.filter((s) => s.jenis === 'Surat Keluar').length;

  const totalBukuMasuk = bukuBatchList.reduce((sum, b) => sum + (b.jumlahPasang || 0), 0);
  const totalBukuKeluar = bukuMutasiList
    .filter((m) => m.jenis !== 'Masuk')
    .reduce((sum, m) => sum + (m.jumlahPasang || 0), 0);
  const sisaBukuNikah = Math.max(0, totalBukuMasuk - totalBukuKeluar);

  const urgentCount = notifications.filter((n) => !n.isDibaca && n.prioritas === 'Mendesak').length;

  const primaryItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dasbor & Analitik',
      icon: LayoutDashboard,
      badge: urgentCount > 0 ? `${urgentCount} Mendesak` : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-200 border border-amber-500/40',
      hasDot: urgentCount > 0,
    },
    {
      id: 'nikah',
      label: 'Register Pendaftaran Nikah',
      icon: ClipboardList,
      badge: nikahList.length > 0 ? `${nikahList.length}` : undefined,
      badgeColor: 'bg-emerald-950 text-emerald-300 border border-emerald-700',
    },
    {
      id: 'kalender',
      label: 'Kalender Jadwal Akad',
      icon: CalendarDays,
      badge: pendingNikahCount > 0 ? `${pendingNikahCount} Akad` : undefined,
      badgeColor: 'bg-emerald-950 text-emerald-300 border border-emerald-700',
    },
    {
      id: 'surat-masuk',
      label: 'Surat Masuk',
      icon: Inbox,
      badge: pendingSuratMasukCount > 0 ? `${pendingSuratMasukCount}` : undefined,
      badgeColor: 'bg-blue-600/30 text-blue-200 border border-blue-500/50',
      hasDot: pendingSuratMasukCount > 0,
    },
    {
      id: 'surat-keluar',
      label: 'Surat Keluar',
      icon: Send,
      badge: suratKeluarCount > 0 ? `${suratKeluarCount}` : undefined,
      badgeColor: 'bg-emerald-800/60 text-emerald-200 border border-emerald-600/50',
    },
  ];

  const adminItems: NavItem[] = [
    {
      id: 'buku-nikah',
      label: 'Buku Nikah & Formulir',
      icon: BookOpen,
      badge: `${sisaBukuNikah} Stok`,
      badgeColor: 'bg-amber-950/70 text-amber-200 border border-amber-700/60',
    },
    {
      id: 'wakaf-muallaf',
      label: 'Wakaf & Muallaf',
      icon: Landmark,
      badge: `${wakafList.length + muallafList.length}`,
      badgeColor: 'bg-teal-950 text-teal-200 border border-teal-700',
    },
    {
      id: 'arsip',
      label: 'Arsip & Google Drive',
      icon: HardDrive,
      badge: kuaSettings.googleDriveConfig?.folderId ? 'Drive' : undefined,
      badgeColor: 'bg-blue-950 text-blue-200 border border-blue-700',
    },
    {
      id: 'laporan',
      label: 'Laporan Bulanan PDF',
      icon: FileSpreadsheet,
      badge: 'LNR',
      badgeColor: 'bg-slate-800 text-emerald-300 border border-slate-700',
    },
  ];

  const isPengaturanActive = ['pengaturan', 'master', 'audit', 'sheets', 'drive'].includes(currentTab);

  const renderNavButton = (item: NavItem, activeOverride?: boolean) => {
    const Icon = item.icon;
    const isActive = activeOverride ?? currentTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setCurrentTab(item.id)}
        title={isCollapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
        className={`relative w-full flex items-center ${
          isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
        } rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
          isActive
            ? 'bg-emerald-600 text-white shadow-sm font-bold'
            : 'text-slate-200 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 truncate'}`}>
          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
          {!isCollapsed && <span className="truncate">{item.label}</span>}
        </div>
        {isCollapsed && item.hasDot && (
          <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-amber-400" />
        )}
        {!isCollapsed && item.badge && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold whitespace-nowrap ${
              isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-800 text-slate-200'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (compact: boolean) => (
    <aside
      className={`${
        compact ? 'w-[68px]' : 'w-64'
      } bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 h-screen sticky top-0 select-none transition-all duration-200`}
    >
      {/* Brand Header */}
      <div
        className={`${
          compact ? 'p-3 justify-center' : 'p-4 gap-3'
        } border-b border-slate-800 flex items-center`}
      >
        <div
          className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shrink-0"
          title={compact ? `SIMKUA Pintar · ${kuaSettings.namaKua || 'KUA Candisari'}` : undefined}
        >
          <Building2 className="w-6 h-6 text-emerald-50" />
        </div>
        {!compact && (
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold text-white tracking-tight block truncate">
              SIMKUA Pintar
            </span>
            <p className="text-[11px] text-emerald-300 font-semibold truncate" title={kuaSettings.namaKua}>
              {kuaSettings.namaKua || 'KUA Candisari'}
            </p>
          </div>
        )}
        {isMobileOpen && onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1 text-slate-400 hover:text-white rounded-lg"
            aria-label="Tutup Menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Organized 3-Group Navigation */}
      <nav className={`flex-1 ${compact ? 'px-2 py-3 space-y-3' : 'px-3 py-4 space-y-5'} overflow-y-auto`}>
        <div className="space-y-1">
          {!compact && (
            <div className="px-3 pb-1 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
              Layanan Utama
            </div>
          )}
          {primaryItems.map((item) => renderNavButton(item))}
        </div>

        <div className={`space-y-1 ${compact ? 'pt-2 border-t border-slate-800/80' : ''}`}>
          {!compact && (
            <div className="px-3 pb-1 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
              Administrasi &amp; Arsip
            </div>
          )}
          {adminItems.map((item) => renderNavButton(item))}
        </div>

        <div className="space-y-1 pt-2 border-t border-slate-800/80">
          {!compact && (
            <div className="px-3 pb-1 text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
              Konfigurasi
            </div>
          )}
          {renderNavButton(
            {
              id: 'pengaturan',
              label: 'Pengaturan',
              icon: Settings,
              badge: kuaSettings.googleSheetsConfig?.spreadsheetId ? 'Sync' : undefined,
              badgeColor: 'bg-emerald-950 text-emerald-300 border border-emerald-700',
              hasDot: Boolean(kuaSettings.googleSheetsConfig?.spreadsheetId),
            },
            isPengaturanActive
          )}
        </div>
      </nav>

      {/* Bottom Account Strip & Logout Button */}
      <div className={`${compact ? 'p-2' : 'p-3'} border-t border-slate-800 bg-slate-950/90 space-y-2.5`}>
        {!compact && (
          <div className="flex items-center justify-between text-[11px] px-1">
            <span className="text-slate-300 font-semibold truncate">
              @{officeUser.nip || 'kuacandisari'}
            </span>
            <span className="text-slate-500 font-mono">Kemenag RI</span>
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          title={compact ? `Keluar (Logout) · @${officeUser.nip || 'kuacandisari'}` : undefined}
          className={`w-full flex items-center justify-center ${
            compact ? 'p-2.5' : 'gap-2 px-3 py-2'
          } text-xs font-bold text-rose-100 bg-rose-700/90 hover:bg-rose-600 border border-rose-500/60 rounded-lg shadow-xs transition-colors cursor-pointer`}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!compact && <span>Keluar (Logout)</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <div className="hidden md:block shrink-0">{sidebarContent(isCollapsed)}</div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10">{sidebarContent(false)}</div>
        </div>
      )}
    </>
  );
};
