import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Calendar,
  AlertTriangle,
  Plus,
  CheckCircle2,
  HeartHandshake,
  Mail,
  ChevronDown,
  Menu,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';
import { formatHijriDateIndonesian, formatIndonesianDateShort } from '../lib/dateUtils';

interface TopHeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenNewNikah: () => void;
  onOpenNewSurat: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  setCurrentTab,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenNewNikah,
  onOpenNewSurat,
}) => {
  const {
    notifications,
    pushEnabled,
    requestPushPermission,
    markNotificationRead,
  } = useKua();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [currentNow, setCurrentNow] = useState<Date>(() => new Date());

  const notifRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isDibaca).length;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentNow(new Date());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumbTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Dasbor & Analitik';
      case 'nikah':
        return 'Register Pendaftaran Nikah';
      case 'kalender':
        return 'Kalender Jadwal Akad';
      case 'surat':
      case 'surat-masuk':
        return 'Surat Masuk Dinas';
      case 'surat-keluar':
        return 'Surat Keluar Dinas';
      case 'buku-nikah':
        return 'Stok Buku Nikah & Register Formulir';
      case 'wakaf-muallaf':
        return 'Database Wakaf & Muallaf';
      case 'arsip':
        return 'Pusat Arsip & Google Drive';
      case 'laporan':
        return 'Laporan Bulanan LNR';
      case 'pengaturan':
      case 'audit':
      case 'master':
      case 'sheets':
      case 'drive':
        return 'Pengaturan KUA & Integrasi';
      default:
        return 'SIMKUA Pintar';
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200/90 px-5 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Hamburger Toggle & Page Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-700 hover:text-emerald-800 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer shrink-0"
            title={isSidebarCollapsed ? 'Perluas Sidebar Menu' : 'Kecilkan Sidebar (Mode Luas)'}
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate tracking-tight">
          {getBreadcrumbTitle()}
        </h1>
      </div>

      {/* Right: Real-time Date & Primary Controls */}
      <div className="flex items-center gap-3">
        {/* Live Masehi & Hijri Date */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 font-medium whitespace-nowrap">
          <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span>{formatIndonesianDateShort(currentNow)}</span>
          <span className="text-slate-300">·</span>
          <span className="text-emerald-800 font-semibold text-[11px]">
            {formatHijriDateIndonesian(currentNow)}
          </span>
        </div>

        {/* Minimalist Single "+ Tambah" Dropdown Button */}
        <div className="relative" ref={addMenuRef}>
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tambah</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {showAddMenu && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 p-1 z-30 animate-in fade-in duration-100">
              <button
                type="button"
                onClick={() => {
                  setShowAddMenu(false);
                  onOpenNewNikah();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer text-left"
              >
                <HeartHandshake className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>+ Register Nikah Baru</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddMenu(false);
                  onOpenNewSurat();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-left"
              >
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <span>+ Catat Surat Dinas</span>
              </button>
            </div>
          )}
        </div>

        {/* Minimalist Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none"
            aria-label="Notifikasi Peringatan Mendesak"
            title="Pemberitahuan Tugas Mendesak"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold tracking-tight">
                    Peringatan Tugas Mendesak KUA
                  </span>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {notifications.length} Catatan
                </span>
              </div>

              {/* Push notification toggle inside the bell menu */}
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-600 font-medium">Notifikasi Browser:</span>
                <button
                  type="button"
                  onClick={requestPushPermission}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                    pushEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {pushEnabled ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Push Aktif</span>
                    </>
                  ) : (
                    <>
                      <BellRing className="w-3 h-3 text-slate-400" />
                      <span>Aktifkan</span>
                    </>
                  )}
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Tidak ada tugas atau peringatan mendesak saat ini.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 text-xs transition-colors ${
                        notif.isDibaca ? 'bg-slate-50/60' : 'bg-amber-50/40 hover:bg-amber-50/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              notif.prioritas === 'Mendesak' ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                          />
                          <span className="line-clamp-1">{notif.judul}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {notif.tenggat}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">{notif.pesan}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          onClick={() => {
                            markNotificationRead(notif.id);
                            if (notif.tipe.startsWith('nikah')) {
                              setCurrentTab('nikah');
                            } else {
                              setCurrentTab('surat-masuk');
                            }
                            setShowNotifMenu(false);
                          }}
                          className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 cursor-pointer"
                        >
                          Tinjau Berkas &rarr;
                        </button>
                        {!notif.isDibaca && (
                          <button
                            onClick={() => markNotificationRead(notif.id)}
                            className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            Tandai selesai
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
