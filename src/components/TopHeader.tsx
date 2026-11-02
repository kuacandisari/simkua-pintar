import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Plus,
  ShieldCheck,
  LogOut,
  CheckCircle2,
  HeartHandshake,
  Mail,
  ChevronDown,
  UserCheck,
  UsersRound,
  Database,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';

interface TopHeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenNewNikah: () => void;
  onOpenNewSurat: () => void;
  onOpenSettings: () => void;
  onOpenGoogleSheets: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenNewNikah,
  onOpenNewSurat,
  onOpenSettings,
  onOpenGoogleSheets,
}) => {
  const {
    activeStaff,
    kuaSettings,
    notifications,
    pushEnabled,
    requestPushPermission,
    markNotificationRead,
    logout,
  } = useKua();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isDibaca).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
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
      case 'kalender':
        return 'Jadwal & Kalender Nikah';
      case 'surat':
        return 'Agenda Surat Dinas';
      case 'arsip':
        return 'Pusat Arsip Digital';
      case 'laporan':
        return 'Laporan Bulanan LNR';
      case 'audit':
        return 'Manajemen Pegawai & Hak Akses';
      case 'master':
        return 'Master Data KUA';
      default:
        return 'SIMKUA Pintar';
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200/90 px-5 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Clean Breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/80">
          KUA {kuaSettings.kecamatan}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
        <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate tracking-tight">
          {getBreadcrumbTitle()}
        </h1>
      </div>

      {/* Right: Minimalist Controls */}
      <div className="flex items-center gap-3">
        {/* Subtle Date (Hidden on small mobile) */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-emerald-700" />
          <span>Rabu, 14 Okt 2026</span>
          <span className="text-slate-300">·</span>
          <span className="text-emerald-800 font-semibold text-[11px]">3 Rabi'ul Akhir 1448 H</span>
        </div>

        {/* Google Sheets Sync Pill / Button */}
        <button
          type="button"
          onClick={onOpenGoogleSheets}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
            kuaSettings.googleSheetsConfig?.spreadsheetId
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
          title="Sinkronisasi Basis Data ke Google Spreadsheet"
        >
          <FileSpreadsheet
            className={`w-3.5 h-3.5 ${
              kuaSettings.googleSheetsConfig?.spreadsheetId ? 'text-emerald-600' : 'text-slate-500'
            }`}
          />
          <span className="hidden md:inline">
            {kuaSettings.googleSheetsConfig?.spreadsheetId ? 'Sheets Sync' : '+ Google Sheets'}
          </span>
          {kuaSettings.googleSheetsConfig?.autoSyncEnabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse hidden md:inline" />
          )}
        </button>

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
                              setCurrentTab('surat');
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

        {/* User Profile Popover Menu (Replaces redundant sidebar card) */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            title="Menu Akun & Profil Pengguna"
          >
            <img
              src={activeStaff.avatarUrl}
              alt={activeStaff.nama}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover border-2 border-emerald-500 shadow-2xs"
            />
            <div className="hidden sm:block text-left">
              <span className="text-xs font-bold text-slate-800 block leading-tight truncate max-w-[120px]">
                {activeStaff.nama.split(',')[0]}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block leading-tight">
                {activeStaff.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-30 animate-in fade-in zoom-in-95 duration-100">
              {/* User Identity Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <img
                  src={activeStaff.avatarUrl}
                  alt={activeStaff.nama}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shrink-0 shadow-2xs"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {activeStaff.nama}
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block mt-0.5">
                    {activeStaff.role}
                  </span>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>NIP: {activeStaff.nip ? activeStaff.nip.slice(0, 10) + '...' : '-'}</span>
                  </div>
                </div>
              </div>

              {/* Action Links */}
              <div className="py-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block font-semibold">Profil Pejabat Kepala KUA</span>
                    <span className="text-[10px] text-slate-400">Legalitas & penandatangan berkas</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    setCurrentTab('audit');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <UsersRound className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block font-semibold">Data Pegawai & Hak Akses</span>
                    <span className="text-[10px] text-slate-400">Kelola staf KUA & audit log</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    setCurrentTab('master');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block font-semibold">Master Data KUA</span>
                    <span className="text-[10px] text-slate-400">Profil satker, kelurahan & kode surat</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenGoogleSheets();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="block font-semibold">Integrasi Google Spreadsheet</span>
                    <span className="text-[10px] text-slate-400">
                      {kuaSettings.googleSheetsConfig?.spreadsheetId
                        ? 'Spreadsheet terhubung (Auto-Sync Aktif)'
                        : 'Hubungkan basis data ke Google Drive'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Red Divider & Logout Button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Sesi (Logout)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
