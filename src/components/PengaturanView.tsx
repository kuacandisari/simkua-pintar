import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  UsersRound,
  FileSpreadsheet,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  Cloud,
  Sparkles,
  Archive,
  Globe,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';
import { MasterDataView } from './MasterDataView';
import { StaffAuditView } from './StaffAuditView';
import {
  connectGoogleAccount,
  ensureKuaDriveFolder,
  formatFileSize,
  getCachedAccessToken,
  getCachedGoogleUser,
  listDriveFilesInFolder,
} from '../lib/googleDriveService';
import { buildPublicScheduleUrl } from '../lib/publicScheduleService';
import { ArsipDokumen } from '../types';

export type PengaturanSection = 'master' | 'pejabat' | 'sheets' | 'drive';

interface PengaturanViewProps {
  initialSection?: PengaturanSection;
  onOpenGoogleSheets: () => void;
  onOpenSettings: () => void;
  onNavigateArsip?: () => void;
  onOpenPublicJadwal?: () => void;
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({
  initialSection = 'master',
  onOpenGoogleSheets,
  onOpenSettings,
  onNavigateArsip,
  onOpenPublicJadwal,
}) => {
  const {
    kuaSettings,
    updateKuaSettings,
    nikahList,
    suratList,
    arsipList,
    staffList,
    addArsip,
  } = useKua();

  const [activeSection, setActiveSection] = useState<PengaturanSection>(initialSection);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [driveFeedback, setDriveFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const publicScheduleUrl = buildPublicScheduleUrl(
    kuaSettings.googleSheetsConfig?.spreadsheetId,
    kuaSettings.namaKua
  );

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const sheetsCfg = kuaSettings.googleSheetsConfig;
  const driveCfg = kuaSettings.googleDriveConfig;
  const cachedToken = getCachedAccessToken();
  const cachedGoogleUser = getCachedGoogleUser();

  const handleConnectDrive = async () => {
    setDriveBusy(true);
    setDriveFeedback(null);
    try {
      let token = getCachedAccessToken();
      if (!token) {
        const res = await connectGoogleAccount();
        token = res.accessToken;
      }
      const folderCfg = await ensureKuaDriveFolder(kuaSettings.kecamatan || 'Candisari', token);
      updateKuaSettings({
        ...kuaSettings,
        googleDriveConfig: folderCfg,
      });
      setDriveFeedback({
        type: 'success',
        text: `Folder Google Drive "${folderCfg.folderName}" berhasil terhubung (${folderCfg.userEmail || 'Akun Google'}).`,
      });
    } catch (err: any) {
      setDriveFeedback({
        type: 'error',
        text: err?.message || 'Gagal menghubungkan folder Google Drive KUA.',
      });
    } finally {
      setDriveBusy(false);
    }
  };

  const handleSyncDriveFiles = async () => {
    setDriveSyncing(true);
    setDriveFeedback(null);
    try {
      let token = getCachedAccessToken();
      if (!token) {
        const res = await connectGoogleAccount();
        token = res.accessToken;
      }

      let folderCfg = kuaSettings.googleDriveConfig;
      if (!folderCfg?.folderId) {
        folderCfg = await ensureKuaDriveFolder(kuaSettings.kecamatan || 'Candisari', token);
        updateKuaSettings({
          ...kuaSettings,
          googleDriveConfig: folderCfg,
        });
      }

      const driveFiles = await listDriveFilesInFolder(folderCfg.folderId, token);
      let importedCount = 0;

      driveFiles.forEach((df) => {
        const alreadyExists = arsipList.some((a) => a.driveFileId === df.id);
        if (!alreadyExists) {
          importedCount++;
          const mime = (df.mimeType || '').toLowerCase();
          let tipe: ArsipDokumen['tipeFile'] = 'LAINNYA';
          if (mime.includes('pdf') || df.name.toLowerCase().endsWith('.pdf')) tipe = 'PDF';
          else if (mime.includes('jpeg') || mime.includes('jpg')) tipe = 'JPG';
          else if (mime.includes('png')) tipe = 'PNG';
          else if (mime.includes('word')) tipe = 'DOCX';

          addArsip({
            judul: df.name,
            kategori: 'Lainnya',
            noReferensi: `GDRIVE-${df.id.slice(0, 8).toUpperCase()}`,
            tahun: df.createdTime ? df.createdTime.slice(0, 4) : String(new Date().getFullYear()),
            ukuran: df.size ? formatFileSize(Number(df.size)) : 'Google Drive',
            tipeFile: tipe,
            keterangan: `Berkas disinkronkan dari folder Google Drive (${folderCfg?.folderName}).`,
            isTerenkripsi: true,
            tags: ['Google Drive', 'Sinkronisasi'],
            driveFileId: df.id,
            driveWebViewLink: df.webViewLink,
            driveDownloadLink: df.webContentLink,
            driveFolderId: folderCfg?.folderId,
            mimeType: df.mimeType,
          });
        }
      });

      setDriveFeedback({
        type: 'success',
        text:
          importedCount > 0
            ? `Berhasil mengimpor ${importedCount} berkas baru dari Google Drive ke Pusat Arsip.`
            : `Folder Google Drive sudah sinkron (${driveFiles.length} berkas ditemukan).`,
      });
    } catch (err: any) {
      setDriveFeedback({
        type: 'error',
        text: err?.message || 'Gagal menyinkronkan berkas dari Google Drive.',
      });
    } finally {
      setDriveSyncing(false);
    }
  };

  const tabs: {
    id: PengaturanSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    activeClass: string;
  }[] = [
    {
      id: 'master',
      label: 'Master Data KUA',
      icon: Database,
      badge: `${kuaSettings.daftarKelurahan?.length || 0} Kel`,
      activeClass: 'bg-emerald-700 text-white shadow-xs',
    },
    {
      id: 'pejabat',
      label: 'Kepala KUA & Penghulu',
      icon: UsersRound,
      badge: `${staffList.length} Pejabat`,
      activeClass: 'bg-emerald-700 text-white shadow-xs',
    },
    {
      id: 'sheets',
      label: 'Google Sheet',
      icon: FileSpreadsheet,
      badge: sheetsCfg?.spreadsheetId ? 'Terhubung' : 'Belum',
      activeClass: 'bg-emerald-700 text-white shadow-xs',
    },
    {
      id: 'drive',
      label: 'Google Drive',
      icon: HardDrive,
      badge: driveCfg?.folderId ? 'Aktif' : 'Belum',
      activeClass: 'bg-blue-700 text-white shadow-xs',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Unified Pengaturan Header & Navigation Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mb-1">
            <Settings className="w-3.5 h-3.5 text-emerald-700" />
            <span>Konfigurasi Sistem · {kuaSettings.namaKua || 'KUA Candisari'}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Pengaturan KUA, Pejabat &amp; Integrasi Cloud
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Pusat pengaturan Master Data KUA, data Kepala KUA &amp; Penghulu, koneksi Google Sheet, dan penyimpanan Google Drive.
          </p>
        </div>

        {/* 4 High-Contrast Consolidated Tabs */}
        <div className="flex flex-wrap p-1.5 bg-slate-100 border border-slate-200 rounded-xl gap-1.5 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? tab.activeClass
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 1: Master Data KUA */}
      {activeSection === 'master' && (
        <MasterDataView
          embeddedInPengaturan={true}
          onOpenGoogleSheets={onOpenGoogleSheets}
          onOpenSettings={onOpenSettings}
        />
      )}

      {/* Section 2: Kepala KUA & Penghulu */}
      {activeSection === 'pejabat' && <StaffAuditView />}

      {/* Section 3: Pengaturan Google Sheet */}
      {activeSection === 'sheets' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                Sinkronisasi Basis Data Mandiri (Tidak Terpusat)
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Pengaturan Google Sheet — {kuaSettings.namaKua || 'KUA Candisari'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                Setiap KUA menyimpan dan menyinkronkan data Register Nikah, Surat Dinas, Kelurahan, serta Profil KUA ke file Google Spreadsheet milik akun Google masing-masing secara gratis.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenGoogleSheets}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-colors cursor-pointer shrink-0 self-start md:self-auto"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {sheetsCfg?.spreadsheetId
                  ? 'Kelola & Sinkronisasi Sheet'
                  : 'Hubungkan Google Sheet'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Register Nikah
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {nikahList.length}
                </span>
                <span className="text-xs text-slate-500">Data Siap Sync</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Surat Masuk &amp; Keluar
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {suratList.length}
                </span>
                <span className="text-xs text-slate-500">Agenda Surat</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Status Koneksi Sheet
              </span>
              <div className="mt-1.5">
                {sheetsCfg?.spreadsheetId ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Terhubung ({sheetsCfg.autoSyncEnabled ? 'Auto-Sync Aktif' : 'Manual'})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Belum Dihubungkan</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {sheetsCfg?.spreadsheetId ? (
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {sheetsCfg.spreadsheetTitle}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Akun: {sheetsCfg.userEmail || 'Terhubung'} · ID: {sheetsCfg.spreadsheetId}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={sheetsCfg.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Spreadsheet</span>
                  </a>
                  <button
                    type="button"
                    onClick={onOpenGoogleSheets}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sinkronisasi Sekarang</span>
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4">
                <span>
                  Terakhir sinkron: <strong className="text-slate-800">{sheetsCfg.lastSyncedAt || 'Belum pernah'}</strong>
                </span>
                <span>·</span>
                <span>
                  Mode Sinkronisasi:{' '}
                  <strong className="text-slate-800">
                    {sheetsCfg.autoSyncEnabled ? 'Otomatis (Auto-Sync)' : 'Manual'}
                  </strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 border border-dashed border-slate-300 rounded-2xl text-center bg-white space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Belum Terhubung ke Google Sheet KUA Anda
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Hubungkan akun Google KUA Anda untuk membuat Spreadsheet baru otomatis atau menautkan file Spreadsheet yang sudah ada.
              </p>
              <button
                type="button"
                onClick={onOpenGoogleSheets}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Hubungkan Google Sheet Sekarang</span>
              </button>
            </div>
          )}

          {/* Public Schedule & Online Deployment Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card 1: Public Jadwal Nikah Link */}
            <div className="bg-white p-5 rounded-2xl border border-blue-200 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-blue-800 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Halaman Mandiri Jadwal Nikah Masyarakat</span>
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    Bagikan Link Khusus Jadwal Nikah ({publicScheduleUrl.includes('sheet=') ? 'Sinkron Sheet' : 'Pratinjau'})
                  </h4>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Masyarakat atau layar TV ruang tunggu KUA dapat membuka halaman ini tanpa login dan tanpa melihat surat dinas, arsip, maupun data pribadi.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={publicScheduleUrl}
                  className="flex-1 px-2.5 py-2 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700 select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(publicScheduleUrl);
                    setCopiedPublicLink(true);
                    setTimeout(() => setCopiedPublicLink(false), 2500);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg cursor-pointer shrink-0"
                >
                  {copiedPublicLink ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPublicLink ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {onOpenPublicJadwal && (
                  <button
                    type="button"
                    onClick={onOpenPublicJadwal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Pratinjau Halaman Masyarakat</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenGoogleSheets}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Publikasikan Tab Jadwal</span>
                </button>
              </div>
            </div>

            {/* Card 2: Online Deployment & Authorized Domain Check */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Kesiapan Akses Online (Vercel / Domain KUA)</span>
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                12 Tab Cloud Aktif &amp; Otorisasi Domain Login Google
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pastikan domain online Anda terdaftar di <strong>Firebase Authorized Domains</strong> agar login Google Sheet &amp; Google Drive langsung berjalan di Vercel tanpa kendala.
              </p>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] font-mono font-bold text-slate-800 flex-1 truncate">
                  {currentHost || 'localhost'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!currentHost) return;
                    navigator.clipboard.writeText(currentHost);
                    setCopiedDomain(true);
                    setTimeout(() => setCopiedDomain(false), 2500);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded cursor-pointer"
                >
                  {copiedDomain ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDomain ? 'Tersalin' : 'Salin Domain'}</span>
                </button>
                <a
                  href="https://console.firebase.google.com/project/quick-pixel-rds98/authentication/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded"
                >
                  <span>Buka Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Pengaturan Google Drive */}
      {activeSection === 'drive' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
                Penyimpanan Berkas PDF, Gambar &amp; Dokumen Digital
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Pengaturan Google Drive — {kuaSettings.namaKua || 'KUA Candisari'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                Atur folder khusus di Google Drive akun Google KUA Anda untuk menyimpan berkas PDF akta nikah, scan KTP, SK, dokumen wakaf, dan foto secara aman tanpa membebani server.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
              <button
                type="button"
                disabled={driveBusy}
                onClick={handleConnectDrive}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
                <span>
                  {driveBusy
                    ? 'Menghubungkan...'
                    : driveCfg?.folderId && cachedToken
                    ? 'Perbarui Koneksi Drive'
                    : 'Hubungkan Google Drive'}
                </span>
              </button>

              <button
                type="button"
                disabled={driveSyncing}
                onClick={handleSyncDriveFiles}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${driveSyncing ? 'animate-spin' : ''}`} />
                <span>Sinkronkan Berkas Drive</span>
              </button>
            </div>
          </div>

          {driveFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                driveFeedback.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : driveFeedback.type === 'info'
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {driveFeedback.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span className="font-medium">{driveFeedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setDriveFeedback(null)}
                className="font-bold opacity-70 hover:opacity-100 cursor-pointer"
              >
                &times;
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Berkas Tersimpan di Drive
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-blue-800 font-mono tabular-nums">
                  {arsipList.filter((a) => Boolean(a.driveFileId)).length}
                </span>
                <span className="text-xs text-slate-500">dari {arsipList.length} arsip</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Sesi Login Google
              </span>
              <div className="mt-1.5 text-xs font-bold text-slate-800 truncate">
                {cachedToken
                  ? cachedGoogleUser?.email || driveCfg?.userEmail || 'Sesi OAuth Aktif'
                  : driveCfg?.userEmail
                  ? `${driveCfg.userEmail} (Perlu Re-auth saat Upload)`
                  : 'Belum Login Google'}
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Status Folder Drive
              </span>
              <div className="mt-1.5">
                {driveCfg?.folderId ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Folder Siap Digunakan</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Folder Belum Dibuat</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {driveCfg?.folderId ? (
            <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{driveCfg.folderName}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Akun: {driveCfg.userEmail || '-'} · Folder ID: {driveCfg.folderId}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={driveCfg.folderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-900 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Folder di Google Drive</span>
                  </a>
                  {onNavigateArsip && (
                    <button
                      type="button"
                      onClick={onNavigateArsip}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Buka Menu Arsip &amp; Upload</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4">
                <span>
                  Terakhir sinkron: <strong className="text-slate-800">{driveCfg.lastSyncedAt || 'Baru dibuat'}</strong>
                </span>
                <span>·</span>
                <span>Format didukung: PDF, JPG, PNG, DOCX</span>
              </div>
            </div>
          ) : (
            <div className="p-8 border border-dashed border-slate-300 rounded-2xl text-center bg-white space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center mx-auto">
                <Cloud className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Folder Google Drive Arsip KUA Belum Terhubung
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Klik tombol di bawah untuk login dengan akun Google KUA dan membuat folder arsip otomatis di Google Drive Anda.
              </p>
              <button
                type="button"
                disabled={driveBusy}
                onClick={handleConnectDrive}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
                <span>{driveBusy ? 'Menghubungkan...' : 'Buat & Hubungkan Folder Drive'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
