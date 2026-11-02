import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Plus,
  AlertCircle,
  X,
  Database,
  Cloud,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Check,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';
import {
  connectGoogleAccount,
  createKuaSpreadsheet,
  syncFullDatabaseToSpreadsheet,
  getCachedAccessToken,
  getCachedGoogleUser,
  disconnectGoogleAccount,
} from '../lib/googleSheetsService';
import { GoogleSheetsConfig } from '../types';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({ isOpen, onClose }) => {
  const { kuaSettings, updateKuaSettings, nikahList, suratList } = useKua();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [customSheetId, setCustomSheetId] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const config = kuaSettings.googleSheetsConfig;
  const cachedUser = getCachedGoogleUser();
  const cachedToken = getCachedAccessToken();
  const isConnected = !!cachedToken || (!!config?.spreadsheetId && !!config?.userEmail);

  if (!isOpen) return null;

  // 1. Connect Google Account
  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { user, accessToken } = await connectGoogleAccount();
      setSuccessMessage(`Berhasil terhubung dengan Google Account: ${user.email}`);

      // If already had config, update user email
      if (config) {
        updateKuaSettings({
          ...kuaSettings,
          googleSheetsConfig: {
            ...config,
            userEmail: user.email || undefined,
          },
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal menyambungkan akun Google. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Create New KUA Spreadsheet
  const handleCreateNewSpreadsheet = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let token = getCachedAccessToken();
      if (!token) {
        const authResult = await connectGoogleAccount();
        token = authResult.accessToken;
      }

      const newConfig = await createKuaSpreadsheet(kuaSettings, token);

      // Perform initial full sync right after creation
      await syncFullDatabaseToSpreadsheet(newConfig.spreadsheetId, token, {
        nikahList,
        suratList,
        kelurahanList: kuaSettings.daftarKelurahan || [],
      });

      newConfig.lastSyncedAt = new Date().toLocaleString('id-ID');

      updateKuaSettings({
        ...kuaSettings,
        googleSheetsConfig: newConfig,
      });

      setSuccessMessage(
        `Spreadsheet KUA berhasil dibuat di Google Drive Anda dan data awal telah terisi!`
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal membuat Google Spreadsheet baru.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Link Existing Spreadsheet
  const handleLinkExistingSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSheetId.trim()) return;

    // Extract ID if user pasted full URL
    let sheetId = customSheetId.trim();
    const match = sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      sheetId = match[1];
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      let token = getCachedAccessToken();
      if (!token) {
        const authResult = await connectGoogleAccount();
        token = authResult.accessToken;
      }

      // Verify access by fetching spreadsheet details
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Spreadsheet tidak ditemukan atau Anda tidak memiliki izin edit file ini.');
      }

      const meta = await response.json();
      const updatedConfig: GoogleSheetsConfig = {
        spreadsheetId: sheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
        spreadsheetTitle: meta.properties?.title || 'Google Spreadsheet KUA',
        autoSyncEnabled: true,
        userEmail: cachedUser?.email || config?.userEmail,
        lastSyncedAt: config?.lastSyncedAt,
      };

      updateKuaSettings({
        ...kuaSettings,
        googleSheetsConfig: updatedConfig,
      });

      setShowCustomInput(false);
      setSuccessMessage(`Berhasil menautkan spreadsheet: ${updatedConfig.spreadsheetTitle}`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal menautkan Google Spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Trigger Full Sync Manual
  const handleManualFullSync = async () => {
    if (!config?.spreadsheetId) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let token = getCachedAccessToken();
      if (!token) {
        const authResult = await connectGoogleAccount();
        token = authResult.accessToken;
      }

      const res = await syncFullDatabaseToSpreadsheet(config.spreadsheetId, token, {
        nikahList,
        suratList,
        kelurahanList: kuaSettings.daftarKelurahan || [],
      });

      if (res.success) {
        const syncTime = new Date().toLocaleString('id-ID');
        updateKuaSettings({
          ...kuaSettings,
          googleSheetsConfig: {
            ...config,
            lastSyncedAt: syncTime,
          },
        });
        setSuccessMessage(`Sinkronisasi berhasil! ${res.updatedCells} sel diperbarui.`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal menyinkronkan data ke Spreadsheet.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Toggle Auto Sync
  const handleToggleAutoSync = () => {
    if (!config) return;
    updateKuaSettings({
      ...kuaSettings,
      googleSheetsConfig: {
        ...config,
        autoSyncEnabled: !config.autoSyncEnabled,
      },
    });
  };

  // 6. Unlink Spreadsheet
  const handleUnlink = () => {
    if (confirm('Yakin ingin memutuskan tautan Google Spreadsheet dari aplikasi SIMKUA?')) {
      disconnectGoogleAccount();
      updateKuaSettings({
        ...kuaSettings,
        googleSheetsConfig: undefined,
      });
      setSuccessMessage('Tautan Google Spreadsheet berhasil dinonaktifkan.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Integrasi Google Spreadsheet (Sheets)
                </h3>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Model Hibrida
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sinkronisasi otomatis basis data KUA {kuaSettings.kecamatan} ke Google Spreadsheet kantor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-xs text-slate-700">
          {/* Status alerts */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Terjadi Kendala:</span>
                <span className="text-[11px]">{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Berhasil:</span>
                <span className="text-[11px]">{successMessage}</span>
              </div>
            </div>
          )}

          {/* Explanation Architecture Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cara Kerja Sinkronisasi Hibrida:</span>
            </span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Database utama aplikasi tetap berjalan secepat kilat dengan penomoran otomatis yang aman di cloud, dan salinan resmi pendaftaran nikah &amp; surat dinas otomatis terkirim rapi ke Google Spreadsheet Anda di Google Drive.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-medium text-[11px]">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tab Register_Nikah</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Tab Register_Surat</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Tab Master_Kelurahan</span>
              </div>
            </div>
          </div>

          {/* STEP 1: Connect Google Account (If not connected) */}
          {!isConnected && (
            <div className="p-5 border border-slate-200 rounded-xl bg-white shadow-2xs space-y-4 text-center">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Langkah 1: Hubungkan Akun Google Kantor KUA
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Berikan izin aplikasi untuk membuat dan memperbarui spreadsheet KUA di Google Drive Anda.
                </p>
              </div>

              {/* Official Google Material Sign-in Button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isLoading}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isLoading ? 'Menghubungkan...' : 'Sambungkan dengan Akun Google'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Spreadsheet Management (When connected) */}
          {isConnected && (
            <div className="space-y-4">
              {/* Connected Account Pill */}
              <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-emerald-950">
                    Akun Google Terhubung: {cachedUser?.email || config?.userEmail || 'Akun KUA'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  Ganti Akun
                </button>
              </div>

              {/* Has Linked Spreadsheet */}
              {config?.spreadsheetId ? (
                <div className="p-5 border border-slate-200 rounded-2xl bg-white space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Spreadsheet Aktif
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                        {config.spreadsheetTitle}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ID: {config.spreadsheetId}
                      </p>
                    </div>

                    <a
                      href={config.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka di Google Sheets</span>
                    </a>
                  </div>

                  {/* Auto-Sync Toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800 block">
                        Sinkronisasi Otomatis Real-Time (Auto-Sync)
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Setiap pendaftaran nikah dan surat dinas baru langsung ditambahkan ke spreadsheet
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleAutoSync}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        config.autoSyncEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          config.autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Last Synced Info & Full Sync Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="text-[11px] text-slate-500">
                      <span>Status Terakhir: </span>
                      <strong className="text-slate-700">
                        {config.lastSyncedAt ? `${config.lastSyncedAt}` : 'Belum pernah disinkronkan'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleManualFullSync}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>{isLoading ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleUnlink}
                        className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                        title="Putuskan tautan spreadsheet"
                      >
                        Putus Tautan
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* No linked spreadsheet yet: Offer Create or Link Existing */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Create New */}
                  <div className="p-5 border border-emerald-200 rounded-2xl bg-emerald-50/30 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2">
                        <Plus className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Buat Spreadsheet KUA Otomatis (Rekomendasi)
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Sistem akan membuat file baru di Google Drive Anda lengkap dengan tab Register_Nikah, Register_Surat_Dinas, dan Master_Kelurahan yang siap pakai.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateNewSpreadsheet}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isLoading ? 'Membuat File...' : 'Buat Spreadsheet Baru'}</span>
                    </button>
                  </div>

                  {/* Option B: Link Existing */}
                  <div className="p-5 border border-slate-200 rounded-2xl bg-white flex flex-col justify-between space-y-4">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-2">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Tautkan Spreadsheet yang Sudah Ada
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Jika kantor KUA sudah memiliki Google Sheet yang ingin digunakan, Anda cukup memasukkan link atau ID filenya di sini.
                      </p>
                    </div>

                    {!showCustomInput ? (
                      <button
                        type="button"
                        onClick={() => setShowCustomInput(true)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Tautkan File yang Ada</span>
                      </button>
                    ) : (
                      <form onSubmit={handleLinkExistingSpreadsheet} className="space-y-2">
                        <input
                          type="text"
                          required
                          value={customSheetId}
                          onChange={(e) => setCustomSheetId(e.target.value)}
                          placeholder="Tempel Link / ID Google Sheet..."
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-1.5 text-xs font-bold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
                          >
                            Hubungkan
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCustomInput(false)}
                            className="px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                          >
                            Batal
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
          <span>Kementerian Agama RI · Layanan Integrasi Cloud &amp; Google Drive</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
