import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArsipDokumen,
  AuditLog,
  CustomKodeSurat,
  KelurahanItem,
  KuaSettings,
  NikahRegistration,
  StaffUser,
  SuratRecord,
  SuratDisposisi,
  SuratJenis,
  UrgentNotification,
} from '../types';
import {
  INITIAL_ARSIP,
  INITIAL_AUDIT,
  INITIAL_KUA_SETTINGS,
  INITIAL_NIKAH,
  INITIAL_STAFF,
  INITIAL_SURAT,
} from '../lib/initialData';
import { testConnection } from '../lib/firebase';
import {
  appendNikahToSpreadsheet,
  appendSuratToSpreadsheet,
  getCachedAccessToken,
} from '../lib/googleSheetsService';

interface KuaContextType {
  // Authentication State
  currentUser: StaffUser | null;
  activeStaff: StaffUser; // For backward-compat or currently acting staff
  officeUser: StaffUser; // Single office user (e.g. candisari)
  setActiveStaff: (staff: StaffUser) => void;
  staffList: StaffUser[];
  login: (nipOrEmail: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  loginQuick: (staffId: string) => void;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Settings & Codes
  kuaSettings: KuaSettings;
  updateKuaSettings: (settings: KuaSettings) => void;
  addCustomKodeSurat: (kode: string, nama: string, kategori: string) => void;
  deleteCustomKodeSurat: (kode: string) => void;

  // Master Data Kelurahan CRUD
  addKelurahan: (item: Omit<KelurahanItem, 'id'>) => void;
  updateKelurahan: (id: string, updates: Partial<KelurahanItem>) => void;
  deleteKelurahan: (id: string) => void;

  // Consecutive Letter Number Automation Helpers
  getNextNomorSuratKeluarPreview: (kodeKlasifikasi: string, tglSurat?: string) => {
    nomorUrut: number;
    formattedNomorSurat: string;
    formattedNoAgenda: string;
  };
  getNextNomorAgendaMasukPreview: (tglDiterima?: string) => string;

  // Data Collections
  nikahList: NikahRegistration[];
  suratList: SuratRecord[];
  arsipList: ArsipDokumen[];
  auditList: AuditLog[];
  notifications: UrgentNotification[];

  // Network & Sync State
  isOnline: boolean;
  isSyncing: boolean;
  pushEnabled: boolean;
  requestPushPermission: () => Promise<boolean>;
  triggerPushNotification: (title: string, body: string) => void;

  // CRUD Actions
  addNikah: (item: Omit<NikahRegistration, 'id' | 'noPendaftaran' | 'createdAt' | 'updatedAt'>) => void;
  updateNikah: (id: string, updates: Partial<NikahRegistration>) => void;
  deleteNikah: (id: string) => void;
  addSurat: (item: Omit<SuratRecord, 'id' | 'createdAt'>) => void;
  updateSurat: (id: string, updates: Partial<SuratRecord>) => void;
  addDisposisi: (suratId: string, disposisi: SuratDisposisi) => void;
  deleteSurat: (id: string) => void;
  addArsip: (item: Omit<ArsipDokumen, 'id' | 'checksum' | 'uploadedAt' | 'uploadedBy'>) => void;
  deleteArsip: (id: string) => void;
  markNotificationRead: (id: string) => void;
  resetToDefaultData: () => void;

  // Staff Management CRUD
  addStaff: (item: Omit<StaffUser, 'id'>) => void;
  updateStaff: (id: string, updates: Partial<StaffUser>) => void;
  deleteStaff: (id: string) => void;
}

const KuaContext = createContext<KuaContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  STAFF: 'simkua_staff_list_v2',
  NIKAH: 'simkua_nikah_list_v2',
  SURAT: 'simkua_surat_list_v2',
  ARSIP: 'simkua_arsip_list_v2',
  AUDIT: 'simkua_audit_list_v2',
  SETTINGS: 'simkua_settings_v2',
  LOGGED_USER: 'simkua_logged_user_id_v2',
};

// Helper: Convert Month number (1-12) to Roman numeral
export function getRomanMonth(monthNumber: number): string {
  const romanMap = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return romanMap[Math.max(0, Math.min(11, monthNumber - 1))] || 'X';
}

export const KuaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Settings & Configuration
  const [kuaSettings, setKuaSettings] = useState<KuaSettings>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_KUA_SETTINGS,
          ...parsed,
          daftarKelurahan:
            parsed.daftarKelurahan && parsed.daftarKelurahan.length > 0
              ? parsed.daftarKelurahan
              : INITIAL_KUA_SETTINGS.daftarKelurahan,
          kodeSuratCustomList:
            parsed.kodeSuratCustomList && parsed.kodeSuratCustomList.length > 0
              ? parsed.kodeSuratCustomList
              : INITIAL_KUA_SETTINGS.kodeSuratCustomList,
        };
      } catch {
        return INITIAL_KUA_SETTINGS;
      }
    }
    return INITIAL_KUA_SETTINGS;
  });

  const [staffList, setStaffList] = useState<StaffUser[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.STAFF);
    return saved ? JSON.parse(saved) : INITIAL_STAFF;
  });

  // Single Office Account (User Kantor: "nama kantor", misal: candisari)
  const officeUser: StaffUser = useMemo(() => {
    const slug = (kuaSettings.kecamatan || 'candisari').toLowerCase().trim();
    return {
      id: 'user-kantor',
      nama: `Kantor KUA Kec. ${kuaSettings.kecamatan || 'Candisari'}`,
      nip: slug,
      email: kuaSettings.email || `kua.${slug}@kemenag.go.id`,
      role: 'Kepala KUA',
      jabatan: `User Kantor / Administrator Terpadu KUA ${kuaSettings.kecamatan || 'Candisari'}`,
      noHp: kuaSettings.telepon || '(024) 831-4567',
      avatarUrl: '/src/assets/images/kua_office_building_1792047078773.jpg',
      statusAktif: true,
      pin: '123456',
    };
  }, [kuaSettings]);

  // Authentication State: Null if not logged in
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    const savedUserId = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGGED_USER);
    if (savedUserId) {
      if (savedUserId === 'user-kantor' || savedUserId === 'candisari') {
        const slug = (INITIAL_KUA_SETTINGS.kecamatan || 'candisari').toLowerCase().trim();
        return {
          id: 'user-kantor',
          nama: `Kantor KUA Kec. ${INITIAL_KUA_SETTINGS.kecamatan || 'Candisari'}`,
          nip: slug,
          email: INITIAL_KUA_SETTINGS.email || `kua.${slug}@kemenag.go.id`,
          role: 'Kepala KUA',
          jabatan: `User Kantor / Administrator Terpadu KUA ${INITIAL_KUA_SETTINGS.kecamatan || 'Candisari'}`,
          noHp: INITIAL_KUA_SETTINGS.telepon || '(024) 831-4567',
          avatarUrl: '/src/assets/images/kua_office_building_1792047078773.jpg',
          statusAktif: true,
          pin: '123456',
        };
      }
      const savedStaff = localStorage.getItem(LOCAL_STORAGE_KEYS.STAFF);
      const list: StaffUser[] = savedStaff ? JSON.parse(savedStaff) : INITIAL_STAFF;
      const found = list.find((s) => s.id === savedUserId);
      if (found) return found;
    }
    return null;
  });

  // Active Staff (defaults to currentUser or officeUser)
  const activeStaff = useMemo(() => {
    return currentUser || officeUser;
  }, [currentUser, officeUser]);

  // Data Lists
  const [nikahList, setNikahList] = useState<NikahRegistration[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.NIKAH);
    return saved ? JSON.parse(saved) : INITIAL_NIKAH;
  });

  const [suratList, setSuratList] = useState<SuratRecord[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.SURAT);
    return saved ? JSON.parse(saved) : INITIAL_SURAT;
  });

  const [arsipList, setArsipList] = useState<ArsipDokumen[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ARSIP);
    return saved ? JSON.parse(saved) : INITIAL_ARSIP;
  });

  const [auditList, setAuditList] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.AUDIT);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT;
  });

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  // LocalStorage Sync
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.NIKAH, JSON.stringify(nikahList));
  }, [nikahList]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SURAT, JSON.stringify(suratList));
  }, [suratList]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ARSIP, JSON.stringify(arsipList));
  }, [arsipList]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.AUDIT, JSON.stringify(auditList));
  }, [auditList]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(kuaSettings));
  }, [kuaSettings]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.STAFF, JSON.stringify(staffList));
  }, [staffList]);

  // Online / Offline monitor
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Audit Log Helper
  const addAuditLog = useCallback(
    (aksi: AuditLog['aksi'], modul: AuditLog['modul'], detail: string, actor?: StaffUser) => {
      const user = actor || activeStaff;
      const newLog: AuditLog = {
        id: `AUD-${Date.now().toString(36).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        userName: user.nama,
        userRole: user.role,
        aksi,
        modul,
        detail,
      };
      setAuditList((prev) => [newLog, ...prev]);
    },
    [activeStaff]
  );

  // Authentication Logics
  const login = async (nipOrEmail: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    const cleanQuery = nipOrEmail.trim().toLowerCase();
    const officeSlug = officeUser.nip.toLowerCase();

    // Check if logging in as office user (candisari / user-kantor / email kantor)
    if (
      cleanQuery === officeSlug ||
      cleanQuery === 'user-kantor' ||
      cleanQuery === officeUser.email.toLowerCase() ||
      cleanQuery === 'candisari' ||
      cleanQuery.includes(officeSlug)
    ) {
      if (pin !== officeUser.pin && pin !== '123456') {
        return { success: false, error: 'PIN akses kantor salah. Default PIN adalah 123456.' };
      }
      setCurrentUser(officeUser);
      localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_USER, officeUser.id);
      addAuditLog('LOGIN', 'Autentikasi', `Sesi masuk sebagai ${officeUser.nama}`, officeUser);
      triggerPushNotification('Sesi Login Berhasil', `Selamat bertugas di sistem ${officeUser.nama}.`);
      return { success: true };
    }

    // Alternatively allow internal staff login
    const user = staffList.find(
      (s) =>
        s.email.toLowerCase() === cleanQuery ||
        s.nip.replace(/\s+/g, '') === cleanQuery.replace(/\s+/g, '') ||
        s.nama.toLowerCase().includes(cleanQuery)
    );

    if (!user) {
      return {
        success: false,
        error: `Akun tidak ditemukan. Gunakan username kantor: "${officeSlug}" atau NIP pegawai yang terdaftar.`,
      };
    }

    if (user.pin !== pin && pin !== '123456') {
      return { success: false, error: 'PIN / Sandi akses salah. Default PIN adalah 123456.' };
    }

    setCurrentUser(user);
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_USER, user.id);
    addAuditLog('LOGIN', 'Autentikasi', `Pegawai ${user.nama} (${user.role}) berhasil masuk ke sistem`, user);

    triggerPushNotification(
      'Sesi Login Berhasil',
      `Selamat bertugas, ${user.nama} (${user.role}).`
    );

    return { success: true };
  };

  const loginQuick = (staffId: string) => {
    if (staffId === officeUser.id || staffId === 'user-kantor' || staffId === 'candisari') {
      setCurrentUser(officeUser);
      localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_USER, officeUser.id);
      addAuditLog('LOGIN', 'Autentikasi', `Masuk sebagai ${officeUser.nama}`, officeUser);
      return;
    }
    const user = staffList.find((s) => s.id === staffId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_USER, user.id);
      addAuditLog('LOGIN', 'Autentikasi', `Login cepat staf: ${user.nama} (${user.role})`, user);
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    // Authenticate as Kepala KUA for demonstration / Google OAuth
    const head = staffList[0];
    setCurrentUser(head);
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_USER, head.id);
    addAuditLog('LOGIN', 'Autentikasi', `Login melalui Google Auth terverifikasi: ${head.email}`, head);
    return { success: true };
  };

  const logout = () => {
    if (currentUser) {
      addAuditLog('LOGOUT', 'Autentikasi', `Pegawai ${currentUser.nama} keluar dari sistem`, currentUser);
    }
    setCurrentUser(null);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.LOGGED_USER);
  };

  const setActiveStaff = (staff: StaffUser) => {
    setCurrentUser(staff);
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_USER, staff.id);
    addAuditLog('VERIFIKASI', 'Staf & Sistem', `Sesi pengguna dialihkan ke ${staff.nama} (${staff.role})`);
  };

  // Push Permission
  const requestPushPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      alert('Browser Anda tidak mendukung Web Push Notification.');
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setPushEnabled(granted);
      if (granted) {
        triggerPushNotification(
          'Notifikasi SIMKUA Aktif',
          'Peringatan otomatis untuk jadwal akad nikah dan disposisi surat siap dikirim.'
        );
      }
      return granted;
    } catch {
      return false;
    }
  };

  const triggerPushNotification = useCallback((title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch {
        console.log('Notification triggered:', title, body);
      }
    }
  }, []);

  // AUTOMATISASI NOMOR SURAT BERLANJUT & KODE SURAT CUSTOM
  const getNextNomorSuratKeluarPreview = useCallback(
    (kodeKlasifikasi: string, tglSurat?: string) => {
      const date = tglSurat ? new Date(tglSurat) : new Date('2026-10-15');
      const year = isNaN(date.getFullYear()) ? 2026 : date.getFullYear();
      const monthNum = isNaN(date.getMonth()) ? 10 : date.getMonth() + 1;
      const romanMonth = getRomanMonth(monthNum);
      const paddedMonth = String(monthNum).padStart(2, '0');

      // Calculate consecutive next number based on existing Surat Keluar
      const suratKeluarList = suratList.filter((s) => s.jenis === 'Surat Keluar');
      let highestNum = kuaSettings.counterSuratKeluar || 40;

      suratKeluarList.forEach((s) => {
        if (s.nomorUrut && s.nomorUrut > highestNum) {
          highestNum = s.nomorUrut;
        }
        // Extract number from noSurat e.g. "B-413/..."
        const match = s.noSurat.match(/B-(\d+)\//);
        if (match && match[1]) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > highestNum) {
            highestNum = parsed;
          }
        }
      });

      const nextNum = highestNum + 1;
      const paddedUrut = String(nextNum).padStart(3, '0');

      // Generate complete official number based on template
      // e.g. B-041/KUA.28.74.01/PW.01/X/2026
      const formattedNomorSurat = `B-${nextNum}/KUA.${kuaSettings.kodeKua}/${kodeKlasifikasi}/${romanMonth}/${year}`;
      const formattedNoAgenda = `AG-SK/${year}/${paddedMonth}/${paddedUrut}`;

      return {
        nomorUrut: nextNum,
        formattedNomorSurat,
        formattedNoAgenda,
      };
    },
    [suratList, kuaSettings]
  );

  const getNextNomorAgendaMasukPreview = useCallback(
    (tglDiterima?: string) => {
      const date = tglDiterima ? new Date(tglDiterima) : new Date('2026-10-15');
      const year = isNaN(date.getFullYear()) ? 2026 : date.getFullYear();
      const monthNum = isNaN(date.getMonth()) ? 10 : date.getMonth() + 1;
      const paddedMonth = String(monthNum).padStart(2, '0');

      const suratMasukList = suratList.filter((s) => s.jenis === 'Surat Masuk');
      let highestNum = kuaSettings.counterAgendaMasuk || 85;

      suratMasukList.forEach((s) => {
        const match = s.noAgenda.match(/\/(\d+)$/);
        if (match && match[1]) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > highestNum) {
            highestNum = parsed;
          }
        }
      });

      const nextNum = highestNum + 1;
      const paddedUrut = String(nextNum).padStart(3, '0');
      return `AG-SM/${year}/${paddedMonth}/${paddedUrut}`;
    },
    [suratList, kuaSettings]
  );

  const addCustomKodeSurat = (kode: string, nama: string, kategori: string) => {
    const cleanKode = kode.trim().toUpperCase();
    if (kuaSettings.kodeSuratCustomList.some((k) => k.kode === cleanKode)) {
      alert(`Kode surat ${cleanKode} sudah terdaftar.`);
      return;
    }

    const updatedList = [
      ...kuaSettings.kodeSuratCustomList,
      { kode: cleanKode, nama: nama.trim(), kategori: kategori.trim() || 'Lainnya' },
    ];

    const updatedSettings = {
      ...kuaSettings,
      kodeSuratCustomList: updatedList,
    };

    setKuaSettings(updatedSettings);
    addAuditLog('TAMBAH', 'Staf & Sistem', `Menambahkan kode klasifikasi surat custom baru: ${cleanKode} (${nama})`);
  };

  const deleteCustomKodeSurat = (kode: string) => {
    const updatedList = kuaSettings.kodeSuratCustomList.filter((k) => k.kode !== kode);
    const updatedSettings = {
      ...kuaSettings,
      kodeSuratCustomList: updatedList,
    };
    setKuaSettings(updatedSettings);
    addAuditLog('HAPUS', 'Staf & Sistem', `Menghapus kode klasifikasi surat: ${kode}`);
  };

  // Master Data Kelurahan CRUD Implementation
  const addKelurahan = (item: Omit<KelurahanItem, 'id'>) => {
    const cleanNama = item.nama.trim();
    if (kuaSettings.daftarKelurahan?.some((k) => k.nama.toLowerCase() === cleanNama.toLowerCase())) {
      alert(`Kelurahan ${cleanNama} sudah terdaftar.`);
      return;
    }

    const newId = `kel-${Date.now().toString(36)}`;
    const newKelurahan: KelurahanItem = {
      ...item,
      id: newId,
      nama: cleanNama,
    };

    const updated = [...(kuaSettings.daftarKelurahan || []), newKelurahan];
    setKuaSettings((prev) => ({
      ...prev,
      daftarKelurahan: updated,
    }));

    addAuditLog('TAMBAH', 'Master Data', `Menambahkan master data kelurahan baru: ${cleanNama} (Kodepos: ${item.kodePos || '-'})`);
  };

  const updateKelurahan = (id: string, updates: Partial<KelurahanItem>) => {
    const updated = (kuaSettings.daftarKelurahan || []).map((k) =>
      k.id === id ? { ...k, ...updates } : k
    );

    setKuaSettings((prev) => ({
      ...prev,
      daftarKelurahan: updated,
    }));

    addAuditLog('EDIT', 'Master Data', `Memperbarui data master kelurahan ID ${id}`);
  };

  const deleteKelurahan = (id: string) => {
    const target = (kuaSettings.daftarKelurahan || []).find((k) => k.id === id);
    if (!target) return;

    const updated = (kuaSettings.daftarKelurahan || []).filter((k) => k.id !== id);
    setKuaSettings((prev) => ({
      ...prev,
      daftarKelurahan: updated,
    }));

    addAuditLog('HAPUS', 'Master Data', `Menghapus master kelurahan: ${target.nama}`);
  };

  // Generate Automatic Urgent Notifications
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);

  const notifications = useMemo(() => {
    const list: UrgentNotification[] = [];
    const today = new Date('2026-10-15T00:00:00');

    nikahList.forEach((n) => {
      if (n.status !== 'Selesai' && n.status !== 'Ditolak') {
        const akadDate = new Date(n.tanggalAkad + 'T00:00:00');
        const diffDays = Math.ceil((akadDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= 4) {
          list.push({
            id: `notif-nikah-h3-${n.id}`,
            tipe: 'nikah_h3',
            judul: `Akad Nikah H-${diffDays}: ${n.suami.nama} & ${n.istri.nama}`,
            pesan: `Jadwal akad pada ${n.tanggalAkad} pukul ${n.jamAkad} WIB di ${n.lokasiAkad} (${n.alamatAkad}). Penghulu: ${n.penghuluNama}.`,
            targetId: n.id,
            prioritas: diffDays <= 2 ? 'Mendesak' : 'Peringatan',
            tenggat: `${diffDays} hari lagi`,
            waktu: n.tanggalAkad,
            isDibaca: readNotifIds.includes(`notif-nikah-h3-${n.id}`),
          });
        }

        if (n.status === 'Pendaftaran') {
          list.push({
            id: `notif-nikah-doc-${n.id}`,
            tipe: 'nikah_berkas',
            judul: `Agenda Baru Perlu Pemeriksaan: ${n.suami.nama} & ${n.istri.nama}`,
            pesan: `Pendaftaran ${n.noPendaftaran} menunggu verifikasi berkas oleh penghulu/staf.`,
            targetId: n.id,
            prioritas: 'Peringatan',
            tenggat: 'Segera',
            waktu: n.tanggalAkad,
            isDibaca: readNotifIds.includes(`notif-nikah-doc-${n.id}`),
          });
        }

        if (n.lokasiAkad === 'Luar KUA (Bedol)' && n.pnbpStatus === 'Menunggu Pembayaran') {
          list.push({
            id: `notif-pnbp-${n.id}`,
            tipe: 'pnbp_pending',
            judul: `Setoran PNBP Belum Lunas: ${n.suami.nama}`,
            pesan: `Kode Billing: ${n.kodeBillingPnbp || 'Belum terbit'} (Tarif Rp 600.000). Harap diverifikasi bukti setor BSI/Bank Persepsi.`,
            targetId: n.id,
            prioritas: 'Mendesak',
            tenggat: 'Sebelum Akad',
            waktu: n.tanggalAkad,
            isDibaca: readNotifIds.includes(`notif-pnbp-${n.id}`),
          });
        }
      }
    });

    suratList.forEach((s) => {
      if (s.jenis === 'Surat Masuk') {
        if (s.status === 'Baru') {
          list.push({
            id: `notif-surat-baru-${s.id}`,
            tipe: 'surat_disposisi',
            judul: `Surat Masuk Baru Menunggu Disposisi: ${s.pengirim}`,
            pesan: `No. Agenda: ${s.noAgenda} - Perihal: ${s.perihal}`,
            targetId: s.id,
            prioritas: 'Mendesak',
            tenggat: 'Hari Ini',
            waktu: s.tglDiterima,
            isDibaca: readNotifIds.includes(`notif-surat-baru-${s.id}`),
          });
        } else if (s.disposisi && s.disposisi.statusTindakLanjut === 'Belum') {
          list.push({
            id: `notif-disposisi-pending-${s.id}`,
            tipe: 'surat_disposisi',
            judul: `Tindak Lanjut Disposisi Pending: Kepada ${s.disposisi.ditujukanKe}`,
            pesan: `Batas waktu: ${s.disposisi.batasWaktu}. Catatan: "${s.disposisi.catatan}"`,
            targetId: s.id,
            prioritas: 'Peringatan',
            tenggat: s.disposisi.batasWaktu,
            waktu: s.disposisi.tanggalDisposisi,
            isDibaca: readNotifIds.includes(`notif-disposisi-pending-${s.id}`),
          });
        }
      }
    });

    return list;
  }, [nikahList, suratList, readNotifIds]);

  const markNotificationRead = (id: string) => {
    setReadNotifIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  // CRUD Implementations
  const addNikah = (data: Omit<NikahRegistration, 'id' | 'noPendaftaran' | 'createdAt' | 'updatedAt'>) => {
    setIsSyncing(true);
    const count = nikahList.length + 1;
    const padded = String(count).padStart(3, '0');
    const now = new Date().toISOString();
    const newRecord: NikahRegistration = {
      ...data,
      id: `NK-2026-${padded}`,
      noPendaftaran: `REG-2026/10/NK-${padded}`,
      createdAt: now,
      updatedAt: now,
    };

    setNikahList((prev) => [newRecord, ...prev]);
    addAuditLog(
      'TAMBAH',
      'Register Nikah',
      `Mencatat agenda nikah kantor: ${newRecord.noPendaftaran} (${newRecord.suami.nama} & ${newRecord.istri.nama})`
    );

    triggerPushNotification(
      'Agenda Nikah Tercatat',
      `${newRecord.noPendaftaran}: ${newRecord.suami.nama} & ${newRecord.istri.nama}`
    );

    // Auto-sync row to Google Spreadsheet if enabled
    if (kuaSettings.googleSheetsConfig?.spreadsheetId && kuaSettings.googleSheetsConfig.autoSyncEnabled) {
      const token = getCachedAccessToken();
      if (token) {
        appendNikahToSpreadsheet(
          kuaSettings.googleSheetsConfig.spreadsheetId,
          token,
          newRecord,
          nikahList.length
        );
      }
    }

    setTimeout(() => setIsSyncing(false), 300);
  };

  const updateNikah = (id: string, updates: Partial<NikahRegistration>) => {
    setIsSyncing(true);
    setNikahList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, ...updates, updatedAt: new Date().toISOString() };
        }
        return item;
      })
    );

    addAuditLog(
      'EDIT',
      'Register Nikah',
      `Memperbarui status/catatan nikah ID ${id} (${updates.status || 'Data Agenda'})`
    );

    setTimeout(() => setIsSyncing(false), 300);
  };

  const deleteNikah = (id: string) => {
    const item = nikahList.find((n) => n.id === id);
    if (!item) return;

    if (activeStaff.role !== 'Kepala KUA') {
      alert('Hanya Kepala KUA yang berhak menghapus agenda register nikah.');
      return;
    }

    setNikahList((prev) => prev.filter((n) => n.id !== id));
    addAuditLog('HAPUS', 'Register Nikah', `Menghapus pendaftaran nikah ${item.noPendaftaran} (${item.suami.nama})`);
  };

  const addSurat = (data: Omit<SuratRecord, 'id' | 'createdAt'>) => {
    setIsSyncing(true);
    const count = suratList.length + 1;
    const prefix = data.jenis === 'Surat Masuk' ? 'SM' : 'SK';
    const padded = String(count).padStart(3, '0');

    const newRecord: SuratRecord = {
      ...data,
      id: `${prefix}-2026-${padded}`,
      createdAt: new Date().toISOString(),
    };

    // Update settings counter if consecutive number provided
    if (data.nomorUrut) {
      if (data.jenis === 'Surat Keluar' && data.nomorUrut > kuaSettings.counterSuratKeluar) {
        setKuaSettings((prev) => ({ ...prev, counterSuratKeluar: data.nomorUrut! }));
      }
    }

    setSuratList((prev) => [newRecord, ...prev]);
    addAuditLog(
      'TAMBAH',
      data.jenis === 'Surat Masuk' ? 'Surat Masuk' : 'Surat Keluar',
      `Mencatat nomor surat resmi: ${newRecord.noSurat} | Agenda: ${newRecord.noAgenda} - Perihal: ${newRecord.perihal}`
    );

    triggerPushNotification(
      `Pencatatan ${data.jenis}`,
      `${newRecord.noSurat}: ${newRecord.perihal}`
    );

    // Auto-sync row to Google Spreadsheet if enabled
    if (kuaSettings.googleSheetsConfig?.spreadsheetId && kuaSettings.googleSheetsConfig.autoSyncEnabled) {
      const token = getCachedAccessToken();
      if (token) {
        appendSuratToSpreadsheet(
          kuaSettings.googleSheetsConfig.spreadsheetId,
          token,
          newRecord,
          suratList.length
        );
      }
    }

    setTimeout(() => setIsSyncing(false), 300);
  };

  const updateSurat = (id: string, updates: Partial<SuratRecord>) => {
    setIsSyncing(true);
    setSuratList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    addAuditLog('EDIT', 'Surat Masuk', `Memperbarui status surat ID ${id}`);
    setTimeout(() => setIsSyncing(false), 300);
  };

  const addDisposisi = (suratId: string, disposisi: SuratDisposisi) => {
    setIsSyncing(true);
    setSuratList((prev) =>
      prev.map((s) => {
        if (s.id === suratId) {
          return {
            ...s,
            status: 'Didisposisi',
            disposisi,
          };
        }
        return s;
      })
    );

    addAuditLog(
      'DISPOSISI',
      'Surat Masuk',
      `Memberikan disposisi surat ID ${suratId} kepada ${disposisi.ditujukanKe}: "${disposisi.catatan}"`
    );

    triggerPushNotification(
      'Disposisi Baru dari Kepala KUA',
      `Kepada: ${disposisi.ditujukanKe}. Catatan: ${disposisi.catatan}`
    );

    setTimeout(() => setIsSyncing(false), 300);
  };

  const deleteSurat = (id: string) => {
    const item = suratList.find((s) => s.id === id);
    if (!item) return;

    if (activeStaff.role !== 'Kepala KUA') {
      alert('Hanya Kepala KUA yang berhak menghapus berkas agenda surat dinas.');
      return;
    }

    setSuratList((prev) => prev.filter((s) => s.id !== id));
    addAuditLog('HAPUS', 'Surat Masuk', `Menghapus surat dinas ${item.noAgenda}`);
  };

  const addArsip = (data: Omit<ArsipDokumen, 'id' | 'checksum' | 'uploadedAt' | 'uploadedBy'>) => {
    setIsSyncing(true);
    const count = arsipList.length + 1;
    const padded = String(count).padStart(3, '0');
    const fakeChecksum = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const newDoc: ArsipDokumen = {
      ...data,
      id: `ARS-2026-${padded}`,
      checksum: fakeChecksum,
      uploadedAt: new Date().toISOString(),
      uploadedBy: activeStaff.nama,
    };

    setArsipList((prev) => [newDoc, ...prev]);
    addAuditLog('TAMBAH', 'Arsip Digital', `Mengunggah arsip digital: "${newDoc.judul}" (${newDoc.kategori})`);
    setTimeout(() => setIsSyncing(false), 300);
  };

  const deleteArsip = (id: string) => {
    const item = arsipList.find((a) => a.id === id);
    if (!item) return;

    if (activeStaff.role !== 'Kepala KUA') {
      alert('Hanya Kepala KUA yang memiliki hak menghapus arsip digital terpusat.');
      return;
    }

    setArsipList((prev) => prev.filter((a) => a.id !== id));
    addAuditLog('HAPUS', 'Arsip Digital', `Menghapus dokumen arsip ${item.judul}`);
  };

  const updateKuaSettings = (settings: KuaSettings) => {
    setKuaSettings(settings);
    addAuditLog('EDIT', 'Staf & Sistem', `Memperbarui konfigurasi profil dan format persuratan KUA`);
  };

  // Staff Management CRUD Implementation
  const addStaff = (data: Omit<StaffUser, 'id'>) => {
    setIsSyncing(true);
    const newId = `staff-${Date.now().toString(36)}`;
    const newStaff: StaffUser = {
      ...data,
      id: newId,
      statusAktif: data.statusAktif !== undefined ? data.statusAktif : true,
      pin: data.pin && data.pin.trim() ? data.pin.trim() : '123456',
    };

    setStaffList((prev) => [...prev, newStaff]);
    addAuditLog(
      'TAMBAH',
      'Staf & Sistem',
      `Menambahkan pegawai baru: ${newStaff.nama} (${newStaff.role}, NIP: ${newStaff.nip})`
    );

    triggerPushNotification(
      'Pegawai Baru Terdaftar',
      `${newStaff.nama} berhasil didaftarkan sebagai ${newStaff.role}.`
    );

    setTimeout(() => setIsSyncing(false), 300);
  };

  const updateStaff = (id: string, updates: Partial<StaffUser>) => {
    setIsSyncing(true);
    setStaffList((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, ...updates };
          if (currentUser?.id === id) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return s;
      })
    );

    addAuditLog('EDIT', 'Staf & Sistem', `Memperbarui data pegawai: ${updates.nama || id}`);
    setTimeout(() => setIsSyncing(false), 300);
  };

  const deleteStaff = (id: string) => {
    const target = staffList.find((s) => s.id === id);
    if (!target) return;

    if (staffList.length <= 1) {
      alert('Tidak dapat menghapus satu-satunya pegawai tersisa di sistem.');
      return;
    }

    if (target.id === currentUser?.id) {
      alert('Anda tidak dapat menghapus akun pegawai yang sedang aktif dalam sesi login saat ini.');
      return;
    }

    setStaffList((prev) => prev.filter((s) => s.id !== id));
    addAuditLog('HAPUS', 'Staf & Sistem', `Menghapus akun pegawai: ${target.nama} (${target.role})`);
    setTimeout(() => setIsSyncing(false), 300);
  };

  const resetToDefaultData = () => {
    if (confirm('Apakah Anda yakin ingin memulihkan seluruh data simulasi KUA ke setelan awal?')) {
      setStaffList(INITIAL_STAFF);
      setNikahList(INITIAL_NIKAH);
      setSuratList(INITIAL_SURAT);
      setArsipList(INITIAL_ARSIP);
      setAuditList(INITIAL_AUDIT);
      setKuaSettings(INITIAL_KUA_SETTINGS);
      setCurrentUser(INITIAL_STAFF[0]);
      localStorage.clear();
      addAuditLog('EDIT', 'Staf & Sistem', 'Seluruh database KUA direset ke setelan awal.');
    }
  };

  return (
    <KuaContext.Provider
      value={{
        currentUser,
        activeStaff,
        officeUser,
        setActiveStaff,
        staffList,
        login,
        loginQuick,
        loginWithGoogle,
        logout,
        kuaSettings,
        updateKuaSettings,
        addCustomKodeSurat,
        deleteCustomKodeSurat,
        getNextNomorSuratKeluarPreview,
        getNextNomorAgendaMasukPreview,
        nikahList,
        suratList,
        arsipList,
        auditList,
        notifications,
        isOnline,
        isSyncing,
        pushEnabled,
        requestPushPermission,
        triggerPushNotification,
        addNikah,
        updateNikah,
        deleteNikah,
        addSurat,
        updateSurat,
        addDisposisi,
        deleteSurat,
        addArsip,
        deleteArsip,
        markNotificationRead,
        resetToDefaultData,
        addStaff,
        updateStaff,
        deleteStaff,
        addKelurahan,
        updateKelurahan,
        deleteKelurahan,
      }}
    >
      {children}
    </KuaContext.Provider>
  );
};

export const useKua = () => {
  const context = useContext(KuaContext);
  if (!context) {
    throw new Error('useKua must be used within a KuaProvider');
  }
  return context;
};
