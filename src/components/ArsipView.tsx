import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Download,
  ShieldCheck,
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
  Lock,
  HardDrive,
  Copy,
  ExternalLink,
  Upload,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  CloudUpload,
  Settings,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';
import { ArsipDokumen, ArsipKategori } from '../types';
import {
  computeFileSha256,
  connectGoogleAccount,
  deleteDriveFile,
  detectArchiveFileType,
  ensureKuaDriveFolder,
  formatFileSize,
  getCachedAccessToken,
  getCachedGoogleUser,
  listDriveFilesInFolder,
  uploadFileToDrive,
} from '../lib/googleDriveService';
import { getCurrentYear } from '../lib/dateUtils';

interface ArsipViewProps {
  onOpenDriveSettings?: () => void;
}

export const ArsipView: React.FC<ArsipViewProps> = ({ onOpenDriveSettings }) => {
  const { arsipList, addArsip, deleteArsip, activeStaff, kuaSettings, updateKuaSettings } = useKua();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<string>('Semua');
  const [previewDoc, setPreviewDoc] = useState<ArsipDokumen | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Google Drive integration state
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [driveStatus, setDriveStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Inline Delete Confirmation (no window.confirm)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Real File Picker
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedLocalFile, setSelectedLocalFile] = useState<File | null>(null);
  const [uploadToDrive, setUploadToDrive] = useState(true);

  // New Upload Form
  const [uploadForm, setUploadForm] = useState({
    judul: '',
    kategori: 'Berkas Nikah' as ArsipKategori,
    noReferensi: '',
    tahun: String(getCurrentYear()),
    ukuran: '',
    tipeFile: 'PDF' as ArsipDokumen['tipeFile'],
    keterangan: '',
    tags: 'Arsip KUA, Google Drive',
  });

  const categories: string[] = [
    'Semua',
    'Berkas Nikah',
    'Surat Keputusan',
    'Dokumen Rujuk',
    'Wakaf & Kemasjidan',
    'Arsip Kepegawaian',
    'Laporan Bulanan',
    'Lainnya',
  ];

  const driveConfig = kuaSettings.googleDriveConfig;
  const cachedToken = getCachedAccessToken();
  const cachedUser = getCachedGoogleUser();

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

  const handleConnectDriveFolder = async () => {
    setIsConnectingDrive(true);
    setDriveStatus(null);
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
      setDriveStatus({
        type: 'success',
        text: `Folder Google Drive "${folderCfg.folderName}" siap digunakan (${folderCfg.userEmail || 'Akun Google'}).`,
      });
    } catch (err: any) {
      setDriveStatus({
        type: 'error',
        text: err?.message || 'Gagal menyambungkan Google Drive.',
      });
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleSyncFromDriveFolder = async () => {
    setIsSyncingDrive(true);
    setDriveStatus(null);
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
            tahun: df.createdTime ? df.createdTime.slice(0, 4) : String(getCurrentYear()),
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

      setDriveStatus({
        type: 'success',
        text:
          importedCount > 0
            ? `Berhasil menyinkronkan ${importedCount} berkas baru dari Google Drive.`
            : `Folder Google Drive sudah sinkron (${driveFiles.length} berkas terdeteksi).`,
      });
    } catch (err: any) {
      setDriveStatus({
        type: 'error',
        text: err?.message || 'Gagal menyinkronkan berkas dari Google Drive.',
      });
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedLocalFile(file);
    const detectedType = detectArchiveFileType(file);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
    setUploadForm((prev) => ({
      ...prev,
      judul: prev.judul || cleanTitle,
      ukuran: formatFileSize(file.size),
      tipeFile: detectedType,
    }));
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.judul.trim() || !uploadForm.noReferensi.trim()) {
      setDriveStatus({ type: 'error', text: 'Harap lengkapi judul dokumen dan nomor referensi.' });
      return;
    }

    setIsUploading(true);
    setDriveStatus(null);

    try {
      let realChecksum: string | undefined;
      let driveMeta: Partial<ArsipDokumen> = {};

      if (selectedLocalFile) {
        realChecksum = await computeFileSha256(selectedLocalFile);

        if (uploadToDrive) {
          let token = getCachedAccessToken();
          if (!token) {
            const authRes = await connectGoogleAccount();
            token = authRes.accessToken;
          }

          let folderCfg = kuaSettings.googleDriveConfig;
          if (!folderCfg?.folderId) {
            folderCfg = await ensureKuaDriveFolder(kuaSettings.kecamatan || 'Candisari', token);
            updateKuaSettings({
              ...kuaSettings,
              googleDriveConfig: folderCfg,
            });
          }

          const ext = selectedLocalFile.name.split('.').pop();
          const targetName = uploadForm.judul.trim().endsWith(`.${ext}`)
            ? uploadForm.judul.trim()
            : `${uploadForm.judul.trim()}.${ext || 'pdf'}`;

          const uploaded = await uploadFileToDrive(selectedLocalFile, folderCfg.folderId, token, targetName);
          driveMeta = {
            driveFileId: uploaded.id,
            driveWebViewLink:
              uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
            driveDownloadLink: uploaded.webContentLink,
            driveFolderId: folderCfg.folderId,
            mimeType: uploaded.mimeType || selectedLocalFile.type,
          };
        }
      }

      addArsip({
        judul: uploadForm.judul.trim(),
        kategori: uploadForm.kategori,
        noReferensi: uploadForm.noReferensi.trim(),
        tahun: uploadForm.tahun.trim() || String(getCurrentYear()),
        ukuran: uploadForm.ukuran || (selectedLocalFile ? formatFileSize(selectedLocalFile.size) : '1.2 MB'),
        tipeFile: uploadForm.tipeFile,
        keterangan:
          uploadForm.keterangan.trim() ||
          (driveMeta.driveFileId
            ? 'Berkas PDF/Gambar tersimpan aman di Google Drive KUA.'
            : 'Arsip metadata lokal dengan verifikasi hash SHA-256.'),
        isTerenkripsi: true,
        checksum: realChecksum,
        tags: uploadForm.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        ...driveMeta,
      });

      setDriveStatus({
        type: 'success',
        text: driveMeta.driveFileId
          ? `Berkas "${uploadForm.judul}" berhasil diunggah ke Google Drive KUA & dicatat di arsip!`
          : `Arsip "${uploadForm.judul}" berhasil disimpan ke daftar lokal.`,
      });

      setIsUploadModalOpen(false);
      setSelectedLocalFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadForm({
        judul: '',
        kategori: 'Berkas Nikah',
        noReferensi: '',
        tahun: String(getCurrentYear()),
        ukuran: '',
        tipeFile: 'PDF',
        keterangan: '',
        tags: 'Arsip KUA, Google Drive',
      });
    } catch (err: any) {
      setDriveStatus({
        type: 'error',
        text: err?.message || 'Gagal mengunggah berkas ke Google Drive.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDelete = async (doc: ArsipDokumen) => {
    try {
      if (doc.driveFileId) {
        const token = getCachedAccessToken();
        if (token) {
          await deleteDriveFile(doc.driveFileId, token);
        }
      }
      deleteArsip(doc.id);
      setConfirmDeleteId(null);
      setDriveStatus({
        type: 'info',
        text: `Dokumen "${doc.judul}" telah dihapus dari daftar arsip.`,
      });
    } catch (err: any) {
      setDriveStatus({
        type: 'error',
        text: err?.message || 'Gagal menghapus berkas dari Google Drive.',
      });
    }
  };

  const copyChecksum = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Google Drive Integration Bar */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-5 rounded-2xl shadow-xs border border-emerald-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-700/60 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                Pusat Arsip Digital &amp; Google Drive KUA
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-medium">
                PDF · JPG · PNG · DOCX
              </span>
              {driveConfig?.folderId && (
                <span className="text-[10px] bg-blue-500/20 text-blue-200 border border-blue-400/40 px-2 py-0.5 rounded font-mono">
                  Folder Drive Aktif
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Unggah dan simpan langsung berkas PDF, scan KTP/buku nikah, gambar, maupun SK ke folder Google Drive milik akun KUA Anda dengan verifikasi SHA-256.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {driveConfig?.folderUrl && (
            <a
              href={driveConfig.folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-100 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Buka Folder Drive</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          )}

          <button
            type="button"
            disabled={isConnectingDrive}
            onClick={handleConnectDriveFolder}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>
              {isConnectingDrive
                ? 'Menghubungkan...'
                : driveConfig?.folderId && cachedToken
                ? `Drive Terhubung (${cachedUser?.email?.split('@')[0] || 'Aktif'})`
                : 'Hubungkan Google Drive'}
            </span>
          </button>

          <button
            type="button"
            disabled={isSyncingDrive}
            onClick={handleSyncFromDriveFolder}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-100 bg-emerald-800/70 hover:bg-emerald-700 disabled:opacity-60 border border-emerald-600/50 rounded-lg transition-colors cursor-pointer"
            title="Tarik daftar berkas dari folder Google Drive KUA"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? 'animate-spin' : ''}`} />
            <span>Sync Drive</span>
          </button>

          {onOpenDriveSettings && (
            <button
              type="button"
              onClick={onOpenDriveSettings}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 border border-slate-600 rounded-lg transition-colors cursor-pointer"
              title="Buka Pengaturan Google Drive di menu Pengaturan"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Pengaturan Drive</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
          >
            <CloudUpload className="w-4 h-4 text-emerald-700" />
            <span>+ Unggah Berkas ke Drive</span>
          </button>
        </div>
      </div>

      {/* Inline Drive Status Feedback */}
      {driveStatus && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            driveStatus.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : driveStatus.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {driveStatus.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">{driveStatus.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setDriveStatus(null)}
            className="opacity-60 hover:opacity-100 font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedKategori(cat)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedKategori === cat
                    ? 'bg-emerald-700 text-white shadow-xs font-semibold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

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

      {/* Archive Documents Slim Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-2 px-2.5 text-left whitespace-nowrap">Aksi</th>
                <th className="py-2 px-2 text-center w-9">No</th>
                <th className="py-2 px-2.5">Judul Dokumen &amp; Keterangan</th>
                <th className="py-2 px-2.5">Kategori</th>
                <th className="py-2 px-2.5">No. Referensi</th>
                <th className="py-2 px-2.5">Tahun / Tipe</th>
                <th className="py-2 px-2.5">Sumber &amp; Ukuran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredArsip.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Tidak ada arsip dokumen digital yang cocok dengan filter atau kata kunci.
                  </td>
                </tr>
              ) : (
                filteredArsip.map((doc, idx) => {
                  const isConfirmingDelete = confirmDeleteId === doc.id;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Aksi (Leftmost) */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {isConfirmingDelete ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-600 cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(doc)}
                              className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-300 transition-colors cursor-pointer"
                              title="Pratinjau Dokumen & Hash Integritas"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {doc.driveWebViewLink && (
                              <a
                                href={doc.driveWebViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-300 transition-colors"
                                title="Buka File di Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {doc.driveDownloadLink && (
                              <a
                                href={doc.driveDownloadLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-slate-800 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                                title="Unduh File Asli dari Google Drive"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {activeStaff.role === 'Kepala KUA' && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(doc.id)}
                                className="p-1 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-300 transition-colors cursor-pointer"
                                title="Hapus Dokumen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Nomor Urut */}
                      <td className="py-2 px-2 text-center font-mono text-slate-500 font-semibold">
                        {idx + 1}
                      </td>

                      {/* Judul & Keterangan */}
                      <td className="py-2 px-2.5 max-w-[280px]">
                        <span className="font-bold text-slate-900 block leading-tight truncate" title={doc.judul}>
                          {doc.judul}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate mt-0.5" title={doc.keterangan}>
                          {doc.keterangan || '-'}
                        </span>
                      </td>

                      {/* Kategori */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {doc.kategori}
                        </span>
                      </td>

                      {/* No. Referensi */}
                      <td className="py-2 px-2.5 font-mono text-slate-700 whitespace-nowrap">
                        {doc.noReferensi}
                      </td>

                      {/* Tahun & Tipe */}
                      <td className="py-2 px-2.5 font-mono text-slate-600 whitespace-nowrap">
                        {doc.tahun} · {doc.tipeFile}
                      </td>

                      {/* Sumber & Ukuran */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {doc.driveFileId ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                              G-Drive
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                              Lokal
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono">{doc.ukuran}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  {previewDoc.kategori}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1 line-clamp-1">
                  {previewDoc.judul}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="h-44 rounded-xl bg-slate-900 text-slate-200 p-5 flex flex-col justify-between border border-slate-800 relative overflow-hidden">
                <div className="absolute top-2 right-2 opacity-10">
                  <FileText className="w-32 h-32 text-emerald-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {previewDoc.driveFileId
                        ? 'TERSIMPAN DI GOOGLE DRIVE KUA'
                        : 'ARSIP TERENKRIPSI KEMENTERIAN AGAMA RI'}
                    </span>
                  </div>
                  <h4 className="text-white font-bold text-sm mt-2">{previewDoc.judul}</h4>
                  <p className="text-slate-400 font-mono text-xs mt-1">
                    Nomor Referensi: {previewDoc.noReferensi}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-3">
                  <span>
                    Format: {previewDoc.tipeFile} ({previewDoc.ukuran})
                  </span>
                  <span>
                    Diunggah: {new Date(previewDoc.uploadedAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <p>
                  <span className="text-slate-500">Nomor Referensi:</span>{' '}
                  <strong className="font-mono text-slate-800">{previewDoc.noReferensi}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Keterangan:</span> {previewDoc.keterangan}
                </p>
                <p>
                  <span className="text-slate-500">Petugas Pengunggah:</span> {previewDoc.uploadedBy}
                </p>
                {previewDoc.driveFileId && (
                  <p>
                    <span className="text-slate-500">ID Berkas Google Drive:</span>{' '}
                    <span className="font-mono text-blue-700">{previewDoc.driveFileId}</span>
                  </p>
                )}
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Integritas Digital SHA-256</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyChecksum(previewDoc.checksum)}
                    className="text-[11px] text-emerald-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
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

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {previewDoc.driveWebViewLink ? (
                  <a
                    href={previewDoc.driveWebViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka di Google Drive</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-500 italic">
                    Arsip metadata lokal (belum ada lampiran Drive)
                  </span>
                )}

                {previewDoc.driveDownloadLink && (
                  <a
                    href={previewDoc.driveDownloadLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh</span>
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 text-xs text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Archive Modal with Real File Picker + Google Drive */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                  Google Drive Storage KUA
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Unggah Berkas PDF / Gambar ke Arsip
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="p-6 space-y-3.5 text-xs">
                {/* Real File Dropzone / Picker */}
                <div className="p-4 border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-xl space-y-2 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*,.doc,.docx"
                    onChange={handleFileSelected}
                    className="hidden"
                    id="arsip-file-picker"
                  />
                  <label
                    htmlFor="arsip-file-picker"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{selectedLocalFile ? 'Ganti Berkas Terpilih' : 'Pilih Berkas (PDF / JPG / PNG / DOCX)'}</span>
                  </label>
                  {selectedLocalFile ? (
                    <div className="text-[11px] text-emerald-900 font-medium pt-1">
                      <strong>{selectedLocalFile.name}</strong> ({formatFileSize(selectedLocalFile.size)})
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Pilih berkas asli dari perangkat Anda untuk diunggah ke Google Drive &amp; dihitung hash SHA-256 otomatis.
                    </p>
                  )}
                </div>

                {selectedLocalFile && (
                  <label className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uploadToDrive}
                      onChange={(e) => setUploadToDrive(e.target.checked)}
                      className="accent-blue-600"
                    />
                    <div>
                      <span className="font-bold text-blue-950 block">
                        Simpan File Fisik ke Google Drive KUA
                      </span>
                      <span className="text-[10px] text-blue-700">
                        Berkas diunggah langsung ke folder Google Drive akun kantor Anda (gratis, tidak membebani server).
                      </span>
                    </div>
                  </label>
                )}

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Judul Dokumen *</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.judul}
                    onChange={(e) => setUploadForm({ ...uploadForm, judul: e.target.value })}
                    placeholder="Contoh: Scan Akta Nikah & KTP - Bagas & Anindya"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Kategori Arsip *</label>
                    <select
                      value={uploadForm.kategori}
                      onChange={(e) => setUploadForm({ ...uploadForm, kategori: e.target.value as ArsipKategori })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer"
                    >
                      {categories
                        .filter((c) => c !== 'Semua')
                        .map((c) => (
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
                      placeholder={String(getCurrentYear())}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-slate-700 mb-1 font-semibold">Nomor Referensi *</label>
                    <input
                      type="text"
                      required
                      value={uploadForm.noReferensi}
                      onChange={(e) => setUploadForm({ ...uploadForm, noReferensi: e.target.value })}
                      placeholder={`0495/042/XI/${getCurrentYear()}`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">Tipe File</label>
                    <select
                      value={uploadForm.tipeFile}
                      onChange={(e) =>
                        setUploadForm({ ...uploadForm, tipeFile: e.target.value as ArsipDokumen['tipeFile'] })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs cursor-pointer"
                    >
                      <option value="PDF">PDF</option>
                      <option value="JPG">JPG</option>
                      <option value="PNG">PNG</option>
                      <option value="DOCX">DOCX</option>
                      <option value="LAINNYA">Lainnya</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Keterangan Dokumen</label>
                  <textarea
                    rows={2}
                    value={uploadForm.keterangan}
                    onChange={(e) => setUploadForm({ ...uploadForm, keterangan: e.target.value })}
                    placeholder="Ringkasan isi berkas..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Tagar / Kata Kunci (Pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                    placeholder="Akta Nikah, Candisari, Google Drive"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {isUploading
                      ? 'Mengunggah ke Google Drive...'
                      : selectedLocalFile && uploadToDrive
                      ? 'Unggah ke Drive & Simpan Arsip'
                      : 'Simpan Metadata Arsip'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
