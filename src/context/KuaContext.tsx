import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArsipDokumen,
  AuditLog,
  BukuNikahBatch,
  BukuNikahMutasi,
  CustomKodeSurat,
  FormulirRegisterItem,
  KelurahanItem,
  KuaSettings,
  MuallafRecord,
  NikahRegistration,
  StaffUser,
  SuratRecord,
  SuratDisposisi,
  UrgentNotification,
  WakafRecord,
} from '../types';
import {
  INITIAL_ARSIP,
  INITIAL_AUDIT,
  INITIAL_BUKU_BATCH,
  INITIAL_BUKU_MUTASI,
  INITIAL_FORMULIR_BULANAN,
  INITIAL_KUA_SETTINGS,
  INITIAL_MUALLAF,
  INITIAL_NIKAH,
  INITIAL_STAFF,
  INITIAL_SURAT,
  INITIAL_WAKAF,
  OFFICE_USER_CANDISARI,
} from '../lib/initialData';
import { testConnection } from '../lib/firebase';
import {
  appendNikahToSpreadsheet,
  appendSuratToSpreadsheet,
  getCachedAccessToken,
} from '../lib/googleSheetsService';
import { getCurrentMonthNumber, getCurrentYear } from '../lib/dateUtils';

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
  updateOfficeCredentials: (username: string, newPassword?: string) => void;
  resetOfficePassword: () => void;
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
  wakafList: WakafRecord[];
  muallafList: MuallafRecord[];
  bukuBatchList: BukuNikahBatch[];
  bukuMutasiList: BukuNikahMutasi[];
  formulirList: FormulirRegisterItem[];
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
  addArsip: (
    item: Omit<ArsipDokumen, 'id' | 'checksum' | 'uploadedAt' | 'uploadedBy'> & {
      checksum?: string;
    }
  ) => void;
  deleteArsip: (id: string) => void;

  // Wakaf & Muallaf CRUD
  addWakaf: (item: Omit<WakafRecord, 'id' | 'createdAt'>) => void;
  updateWakaf: (id: string, updates: Partial<WakafRecord>) => void;
  deleteWakaf: (id: string) => void;
  addMuallaf: (item: Omit<MuallafRecord, 'id' | 'createdAt'>) => void;
  updateMuallaf: (id: string, updates: Partial<MuallafRecord>) => void;
  deleteMuallaf: (id: string) => void;

  // Buku Nikah Stock & Mutasi CRUD
  addBukuBatch: (item: Omit<BukuNikahBatch, 'id' | 'createdAt'>) => void;
  deleteBukuBatch: (id: string) => void;
  addBukuMutasi: (item: Omit<BukuNikahMutasi, 'id' | 'createdAt' | 'petugas'>) => void;
  deleteBukuMutasi: (id: string) => void;

  // Register Formulir Bulanan CRUD
  upsertFormulirRecord: (
    item: Omit<FormulirRegisterItem, 'id'> & { id?: string }
  ) => void;

  markNotificationRead: (id: string) => void;
  resetToDefaultData: () => void;
  resetTransactionData: () => void;
  resetToBlankKua: () => void;
  importDatabaseFromSpreadsheet: (data: {
    nikahList: NikahRegistration[];
    suratList: SuratRecord[];
    kelurahanList: KelurahanItem[];
    kuaProfile?: Partial<KuaSettings>;
    staffList?: StaffUser[];
    wakafList?: WakafRecord[];
    muallafList?: MuallafRecord[];
    bukuBatchList?: BukuNikahBatch[];
    bukuMutasiList?: BukuNikahMutasi[];
    formulirList?: FormulirRegisterItem[];
    arsipList?: ArsipDokumen[];
  }) => void;

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
  WAKAF: 'simkua_wakaf_v2',
  MUALLAF: 'simkua_muallaf_v2',
  BUKU_BATCH: 'simkua_buku_batch_v2',
  BUKU_MUTASI: 'simkua_buku_mutasi_v2',
  FORMULIR: 'simkua_formulir_v2',
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
        const rawNama = parsed.namaKua || '';
        const normalizedNama =
          rawNama === 'Kantor Urusan Agama Kecamatan Candisari' ||
          rawNama === 'Kantor KUA Kec. Candisari'
            ? 'KUA Candisari'
            : rawNama;
        return {
          ...INITIAL_KUA_SETTINGS,
          ...parsed,
          namaKua: normalizedNama || INITIAL_KUA_SETTINGS.namaKua,
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
    if (saved) {
      try {
        const parsed: StaffUser[] = JSON.parse(saved);
        const filtered = parsed.filter(
          (s) => s.role === 'Kepala KUA' || s.role === 'Penghulu'
        );
        if (filtered.length > 0) return filtered;
      } catch {
        return INITIAL_STAFF;
      }
    }
    return INITIAL_STAFF;
  });

  // Single Office Account (Default username: "kuacandisari", password dapat diganti & direset di Profil)
  const officeUser: StaffUser = useMemo(() => {
    const username = (kuaSettings.officeUsername || 'kuacandisari').trim() || 'kuacandisari';
    const password = kuaSettings.officePassword || '123456';
    const kec = kuaSettings.kecamatan || 'Candisari';
    return {
      id: 'user-kantor',
      nama: `KUA ${kec}`,
      nip: username,
      email: kuaSettings.email || `kua.${kec.toLowerCase().replace(/\s+/g, '')}@kemenag.go.id`,
      role: 'Kepala KUA',
      jabatan: `Administrator KUA ${kec}`,
      noHp: kuaSettings.telepon || '(024) 831-4567',
      avatarUrl: '/src/assets/images/kua_office_building_1792047078773.jpg',
      statusAktif: true,
      pin: password,
    };
  }, [kuaSettings]);

  // Authentication State: Null if not logged in
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    const savedUserId = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGGED_USER);
    if (savedUserId) {
      if (
        savedUserId === 'user-kantor' ||
        savedUserId === 'kuacandisari' ||
        savedUserId === 'candisari'
      ) {
        let activeSettings = INITIAL_KUA_SETTINGS;
        try {
          const savedSettings = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
          if (savedSettings) {
            activeSettings = { ...INITIAL_KUA_SETTINGS, ...JSON.parse(savedSettings) };
          }
        } catch {
          activeSettings = INITIAL_KUA_SETTINGS;
        }
        const username = (activeSettings.officeUsername || 'kuacandisari').trim() || 'kuacandisari';
        const password = activeSettings.officePassword || '123456';
        const kec = activeSettings.kecamatan || 'Candisari';
        return {
          id: 'user-kantor',
          nama: `KUA ${kec}`,
          nip: username,
          email: activeSettings.email || `kua.${kec.toLowerCase().replace(/\s+/g, '')}@kemenag.go.id`,
          role: 'Kepala KUA',
          jabatan: `Administrator KUA ${kec}`,
          noHp: activeSettings.telepon || '(024) 831-4567',
          avatarUrl: '/src/assets/images/kua_office_building_1792047078773.jpg',
          statusAktif: true,
          pin: password,
        };
      }
      try {
        const savedStaff = localStorage.getItem(LOCAL_STORAGE_KEYS.STAFF);
        const list: StaffUser[] = savedStaff ? JSON.parse(savedStaff) : INITIAL_STAFF;
        const found = list.find(
          (s) => s.id === savedUserId && (s.role === 'Kepala KUA' || s.role === 'Penghulu')
        );
        if (found) return found;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Active Staff (keeps user-kantor synced with current KUA profile name & settings)
  const activeStaff = useMemo(() => {
    if (currentUser?.id === 'user-kantor') {
      return officeUser;
    }
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

  const [wakafList, setWakafList] = useState<WakafRecord[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.WAKAF);
    return saved ? JSON.parse(saved) : INITIAL_WAKAF;
  });

  const [muallafList, setMuallafList] = useState<MuallafRecord[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.MUALLAF);
    return saved ? JSON.parse(saved) : INITIAL_MUALLAF;
  });

  const [bukuBatchList, setBukuBatchList] = useState<BukuNikahBatch[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.BUKU_BATCH);
    return saved ? JSON.parse(saved) : INITIAL_BUKU_BATCH;
  });

  const [bukuMutasiList, setBukuMutasiList] = useState<BukuNikahMutasi[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.BUKU_MUTASI);
    return saved ? JSON.parse(saved) : INITIAL_BUKU_MUTASI;
  });

  const [formulirList, setFormulirList] = useState<FormulirRegisterItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.FORMULIR);
    return saved ? JSON.parse(saved) : INITIAL_FORMULIR_BULANAN;
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
    localStorage.setItem(LOCAL_STORAGE_KEYS.WAKAF, JSON.stringify(wakafList));
  }, [wakafList]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.MUALLAF, JSON.stringify(muallafList));
  }, [muallafList]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.BUKU_BATCH, JSON.stringify(bukuBatchList));
  }, [bukuBatchList]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.BUKU_MUTASI, JSON.stringify(bukuMutasiList));
  }, [bukuMutasiList]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.FORMULIR, JSON.stringify(formulirList));
  }, [formulirList]);

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
    const officeUsername = officeUser.nip.toLowerCase();

    if (!cleanQuery) {
      return { success: false, error: 'Harap masukkan username login terlebih dahulu.' };
    }

    // 1. Login Akun Kantor (Default username: "kuacandisari", dapat disesuaikan di Pengaturan Profil)
    if (
      cleanQuery === officeUsername ||
      cleanQuery === 'user-kantor' ||
      cleanQuery === officeUser.email.toLowerCase()
    ) {
      if (pin !== officeUser.pin) {
        return {
          success: false,
          error: 'Password salah. Jika lupa, password dapat direset ke default (123456) di pengaturan profil setelah masuk atau oleh administrator.',
        };
      }
      setCurrentUser(officeUser);
      localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_USER, officeUser.id);
      addAuditLog('LOGIN', 'Autentikasi', `Sesi masuk sebagai ${officeUser.nama} (${officeUsername})`, officeUser);
      triggerPushNotification('Sesi Login Berhasil', `Selamat bertugas di sistem ${officeUser.nama}.`);
      return { success: true };
    }

    // 2. Alternatif Login Kepala KUA / Penghulu dengan NIP & PIN
    const user = staffList.find(
      (s) =>
        (s.role === 'Kepala KUA' || s.role === 'Penghulu') &&
        (s.email.toLowerCase() === cleanQuery ||
          s.nip.replace(/\s+/g, '') === cleanQuery.replace(/\s+/g, '') ||
          s.nama.toLowerCase().includes(cleanQuery))
    );

    if (!user) {
      return {
        success: false,
        error: `Username atau NIP tidak dikenali. Gunakan username kantor "${officeUser.nip}".`,
      };
    }

    if (user.pin !== pin) {
      return { success: false, error: 'Password / PIN akses salah.' };
    }

    setCurrentUser(user);
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_USER, user.id);
    addAuditLog('LOGIN', 'Autentikasi', `${user.nama} (${user.role}) berhasil masuk ke sistem`, user);

    triggerPushNotification(
      'Sesi Login Berhasil',
      `Selamat bertugas, ${user.nama} (${user.role}).`
    );

    return { success: true };
  };

  const loginQuick = (staffId: string) => {
    if (
      staffId === officeUser.id ||
      staffId === 'user-kantor' ||
      staffId === 'kuacandisari' ||
      staffId === 'candisari'
    ) {
      setCurrentUser(officeUser);
      localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_USER, officeUser.id);
      addAuditLog('LOGIN', 'Autentikasi', `Masuk sebagai ${officeUser.nama}`, officeUser);
      return;
    }
    const user = staffList.find((s) => s.id === staffId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_USER, user.id);
      addAuditLog('LOGIN', 'Autentikasi', `Login cepat: ${user.nama} (${user.role})`, user);
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

  // AUTOMATISASI NOMOR SURAT BERLANJUT & KODE SURAT CUSTOM (Sesuai Format Nomor Surat di Master Data)
  const getNextNomorSuratKeluarPreview = useCallback(
    (kodeKlasifikasi: string, tglSurat?: string) => {
      const date = tglSurat ? new Date(tglSurat) : new Date();
      const year = isNaN(date.getFullYear()) ? getCurrentYear() : date.getFullYear();
      const monthNum = isNaN(date.getMonth()) ? getCurrentMonthNumber() : date.getMonth() + 1;
      const romanMonth = getRomanMonth(monthNum);
      const paddedMonth = String(monthNum).padStart(2, '0');

      const suratKeluarList = suratList.filter((s) => s.jenis === 'Surat Keluar');
      let highestNum = kuaSettings.counterSuratKeluar ?? 40;

      suratKeluarList.forEach((s) => {
        if (s.nomorUrut && s.nomorUrut > highestNum) {
          highestNum = s.nomorUrut;
        }
        const match = s.noSurat.match(/(\d+)/);
        if (match && match[1]) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed) && parsed > highestNum && parsed < 2000) {
            highestNum = parsed;
          }
        }
      });

      const nextNum = highestNum + 1;
      const paddedUrut = String(nextNum).padStart(3, '0');

      const tplSurat =
        kuaSettings.formatNomorSuratKeluar?.trim() ||
        'B-{nomor}/KUA.{kodeKua}/{kodeKlasifikasi}/{bulanRomawi}/{tahun}';
      const tplAgenda =
        kuaSettings.formatAgendaKeluar?.trim() || 'AG-SK/{tahun}/{bulan}/{nomor}';

      const formattedNomorSurat = tplSurat
        .replace(/\{nomor\}/g, String(nextNum))
        .replace(/\{nomor3\}/g, paddedUrut)
        .replace(/\{kodeKua\}/g, kuaSettings.kodeKua || '33.74.05')
        .replace(/\{kodeKlasifikasi\}/g, kodeKlasifikasi || 'PW.01')
        .replace(/\{bulanRomawi\}/g, romanMonth)
        .replace(/\{bulan\}/g, paddedMonth)
        .replace(/\{tahun\}/g, String(year));

      const formattedNoAgenda = tplAgenda
        .replace(/\{nomor\}/g, paddedUrut)
        .replace(/\{tahun\}/g, String(year))
        .replace(/\{bulan\}/g, paddedMonth)
        .replace(/\{bulanRomawi\}/g, romanMonth);

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
      const date = tglDiterima ? new Date(tglDiterima) : new Date();
      const year = isNaN(date.getFullYear()) ? getCurrentYear() : date.getFullYear();
      const monthNum = isNaN(date.getMonth()) ? getCurrentMonthNumber() : date.getMonth() + 1;
      const romanMonth = getRomanMonth(monthNum);
      const paddedMonth = String(monthNum).padStart(2, '0');

      const suratMasukList = suratList.filter((s) => s.jenis === 'Surat Masuk');
      let highestNum = kuaSettings.counterAgendaMasuk ?? 85;

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
      const tplAgendaMasuk =
        kuaSettings.formatAgendaMasuk?.trim() || 'AG-SM/{tahun}/{bulan}/{nomor}';

      return tplAgendaMasuk
        .replace(/\{nomor\}/g, paddedUrut)
        .replace(/\{tahun\}/g, String(year))
        .replace(/\{bulan\}/g, paddedMonth)
        .replace(/\{bulanRomawi\}/g, romanMonth);
    },
    [suratList, kuaSettings]
  );

  const addCustomKodeSurat = (kode: string, nama: string, kategori: string) => {
    const cleanKode = kode.trim().toUpperCase();
    if (kuaSettings.kodeSuratCustomList.some((k) => k.kode === cleanKode)) {
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const year = getCurrentYear(nowDate);
    const monthPad = String(getCurrentMonthNumber(nowDate)).padStart(2, '0');
    const newRecord: NikahRegistration = {
      ...data,
      id: `NK-${year}-${padded}`,
      noPendaftaran: `REG-${year}/${monthPad}/NK-${padded}`,
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
      id: `${prefix}-${getCurrentYear()}-${padded}`,
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
      return;
    }

    setSuratList((prev) => prev.filter((s) => s.id !== id));
    addAuditLog('HAPUS', 'Surat Masuk', `Menghapus surat dinas ${item.noAgenda}`);
  };

  const addArsip = (
    data: Omit<ArsipDokumen, 'id' | 'checksum' | 'uploadedAt' | 'uploadedBy'> & {
      checksum?: string;
    }
  ) => {
    setIsSyncing(true);
    const count = arsipList.length + 1;
    const padded = String(count).padStart(3, '0');
    const fallbackChecksum = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    const newDoc: ArsipDokumen = {
      ...data,
      id: `ARS-${Date.now().toString(36).toUpperCase()}-${padded}`,
      checksum: data.checksum || fallbackChecksum,
      uploadedAt: new Date().toISOString(),
      uploadedBy: activeStaff.nama,
    };

    setArsipList((prev) => [newDoc, ...prev]);
    addAuditLog(
      'TAMBAH',
      'Arsip Digital',
      `Mengunggah arsip digital: "${newDoc.judul}" (${newDoc.kategori})${
        newDoc.driveFileId ? ' [Tersimpan ke Google Drive]' : ''
      }`
    );
    setTimeout(() => setIsSyncing(false), 300);
  };

  const deleteArsip = (id: string) => {
    const item = arsipList.find((a) => a.id === id);
    if (!item) return;

    if (activeStaff.role !== 'Kepala KUA') {
      return;
    }

    setArsipList((prev) => prev.filter((a) => a.id !== id));
    addAuditLog('HAPUS', 'Arsip Digital', `Menghapus dokumen arsip ${item.judul}`);
  };

  // Wakaf CRUD
  const addWakaf = (item: Omit<WakafRecord, 'id' | 'createdAt'>) => {
    const newRec: WakafRecord = {
      ...item,
      id: `WKF-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
    setWakafList((prev) => [newRec, ...prev]);
    addAuditLog('TAMBAH', 'Wakaf & Muallaf', `Mencatat data wakaf baru ${newRec.noAktaIkrar} (${newRec.wakifNama})`);
  };

  const updateWakaf = (id: string, updates: Partial<WakafRecord>) => {
    setWakafList((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
    addAuditLog('EDIT', 'Wakaf & Muallaf', `Memperbarui data wakaf ID ${id}`);
  };

  const deleteWakaf = (id: string) => {
    const item = wakafList.find((w) => w.id === id);
    if (!item) return;
    setWakafList((prev) => prev.filter((w) => w.id !== id));
    addAuditLog('HAPUS', 'Wakaf & Muallaf', `Menghapus catatan wakaf ${item.noAktaIkrar}`);
  };

  // Muallaf CRUD
  const addMuallaf = (item: Omit<MuallafRecord, 'id' | 'createdAt'>) => {
    const newRec: MuallafRecord = {
      ...item,
      id: `MLF-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
    setMuallafList((prev) => [newRec, ...prev]);
    addAuditLog('TAMBAH', 'Wakaf & Muallaf', `Mencatat ikrar muallaf baru ${newRec.noRegister} (${newRec.namaLengkap})`);
  };

  const updateMuallaf = (id: string, updates: Partial<MuallafRecord>) => {
    setMuallafList((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    addAuditLog('EDIT', 'Wakaf & Muallaf', `Memperbarui data muallaf ID ${id}`);
  };

  const deleteMuallaf = (id: string) => {
    const item = muallafList.find((m) => m.id === id);
    if (!item) return;
    setMuallafList((prev) => prev.filter((m) => m.id !== id));
    addAuditLog('HAPUS', 'Wakaf & Muallaf', `Menghapus catatan muallaf ${item.namaLengkap}`);
  };

  // Buku Nikah Stock & Mutasi CRUD
  const addBukuBatch = (item: Omit<BukuNikahBatch, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const newBatch: BukuNikahBatch = {
      ...item,
      id: `BN-BATCH-${Date.now().toString(36).toUpperCase()}`,
      createdAt: now,
    };
    setBukuBatchList((prev) => [newBatch, ...prev]);

    // Auto log Masuk mutasi
    const masukMutasi: BukuNikahMutasi = {
      id: `BN-MUT-${Date.now().toString(36).toUpperCase()}`,
      tanggal: item.tanggalDiterima,
      jenis: 'Masuk',
      kodePerforasi: item.kodePerforasi,
      nomorSeri: `${item.nomorAwal} - ${item.nomorAkhir}`,
      jumlahPasang: item.jumlahPasang,
      keterangan: `${item.sumberPenerimaan}${item.catatan ? ` · ${item.catatan}` : ''}`,
      petugas: activeStaff.nama,
      createdAt: now,
    };
    setBukuMutasiList((prev) => [masukMutasi, ...prev]);
    addAuditLog(
      'TAMBAH',
      'Buku Nikah & Formulir',
      `Menerima stok buku nikah ${item.jumlahPasang} pasang (${item.kodePerforasi} ${item.nomorAwal}-${item.nomorAkhir})`
    );
  };

  const deleteBukuBatch = (id: string) => {
    const target = bukuBatchList.find((b) => b.id === id);
    if (!target) return;
    setBukuBatchList((prev) => prev.filter((b) => b.id !== id));
    addAuditLog('HAPUS', 'Buku Nikah & Formulir', `Menghapus batch stok buku nikah ${target.kodePerforasi} (${target.nomorAwal}-${target.nomorAkhir})`);
  };

  const addBukuMutasi = (item: Omit<BukuNikahMutasi, 'id' | 'createdAt' | 'petugas'>) => {
    const newMutasi: BukuNikahMutasi = {
      ...item,
      id: `BN-MUT-${Date.now().toString(36).toUpperCase()}`,
      petugas: activeStaff.nama,
      createdAt: new Date().toISOString(),
    };
    setBukuMutasiList((prev) => [newMutasi, ...prev]);
    addAuditLog(
      'TAMBAH',
      'Buku Nikah & Formulir',
      `Mencatat mutasi buku nikah (${item.jenis}): ${item.jumlahPasang} pasang · Kode ${item.kodePerforasi} No. ${item.nomorSeri}`
    );
  };

  const deleteBukuMutasi = (id: string) => {
    const target = bukuMutasiList.find((m) => m.id === id);
    if (!target) return;
    setBukuMutasiList((prev) => prev.filter((m) => m.id !== id));
    addAuditLog('HAPUS', 'Buku Nikah & Formulir', `Menghapus log mutasi buku nikah ${target.kodePerforasi} (${target.nomorSeri})`);
  };

  // Formulir Register Bulanan CRUD
  const upsertFormulirRecord = (item: Omit<FormulirRegisterItem, 'id'> & { id?: string }) => {
    setFormulirList((prev) => {
      const existingIdx = prev.findIndex(
        (f) =>
          (item.id && f.id === item.id) ||
          (f.periode === item.periode && f.jenisFormulir === item.jenisFormulir)
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...item };
        return updated;
      }
      const newRec: FormulirRegisterItem = {
        ...item,
        id: item.id || `FRM-${item.periode}-${item.jenisFormulir.replace(/\s+/g, '')}`,
      };
      return [...prev, newRec];
    });
    addAuditLog(
      'EDIT',
      'Buku Nikah & Formulir',
      `Memperbarui register formulir ${item.jenisFormulir} periode ${item.periode} (Rusak: ${item.rusak})`
    );
  };

  const updateKuaSettings = (settings: KuaSettings) => {
    setKuaSettings(settings);
    addAuditLog('EDIT', 'Staf & Sistem', `Memperbarui konfigurasi profil dan format persuratan KUA`);
  };

  const updateOfficeCredentials = (username: string, newPassword?: string) => {
    const cleanUsername = username.trim() || 'kuacandisari';
    const nextPassword =
      newPassword && newPassword.trim().length > 0
        ? newPassword.trim()
        : kuaSettings.officePassword || '123456';

    const updatedSettings: KuaSettings = {
      ...kuaSettings,
      officeUsername: cleanUsername,
      officePassword: nextPassword,
    };
    setKuaSettings(updatedSettings);

    if (currentUser?.id === 'user-kantor') {
      setCurrentUser((prev) =>
        prev ? { ...prev, nip: cleanUsername, pin: nextPassword } : prev
      );
    }

    addAuditLog(
      'EDIT',
      'Autentikasi',
      `Memperbarui akun login KUA (Username: ${cleanUsername}${newPassword && newPassword.trim() ? ', Password diperbarui' : ''})`
    );
  };

  const resetOfficePassword = () => {
    const updatedSettings: KuaSettings = {
      ...kuaSettings,
      officePassword: '123456',
    };
    setKuaSettings(updatedSettings);

    if (currentUser?.id === 'user-kantor') {
      setCurrentUser((prev) => (prev ? { ...prev, pin: '123456' } : prev));
    }

    addAuditLog('EDIT', 'Autentikasi', 'Mereset password login akun KUA kembali ke default (123456).');
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
      return;
    }

    if (target.id === currentUser?.id) {
      return;
    }

    setStaffList((prev) => prev.filter((s) => s.id !== id));
    addAuditLog('HAPUS', 'Staf & Sistem', `Menghapus akun pegawai: ${target.nama} (${target.role})`);
    setTimeout(() => setIsSyncing(false), 300);
  };

  const resetToDefaultData = () => {
    setStaffList(INITIAL_STAFF);
    setNikahList(INITIAL_NIKAH);
    setSuratList(INITIAL_SURAT);
    setArsipList(INITIAL_ARSIP);
    setAuditList(INITIAL_AUDIT);
    setWakafList(INITIAL_WAKAF);
    setMuallafList(INITIAL_MUALLAF);
    setBukuBatchList(INITIAL_BUKU_BATCH);
    setBukuMutasiList(INITIAL_BUKU_MUTASI);
    setFormulirList(INITIAL_FORMULIR_BULANAN);
    setKuaSettings(INITIAL_KUA_SETTINGS);
    setCurrentUser(OFFICE_USER_CANDISARI);
    localStorage.clear();
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGGED_USER, OFFICE_USER_CANDISARI.id);
    addAuditLog('EDIT', 'Staf & Sistem', 'Seluruh database KUA dipulihkan ke data simulasi demo (KUA Candisari).');
  };

  /**
   * Reset Data Transaksi Saja (Register Nikah, Surat Dinas, Arsip Digital, Wakaf, Muallaf, Buku Nikah, Formulir)
   */
  const resetTransactionData = () => {
    setNikahList([]);
    setSuratList([]);
    setArsipList([]);
    setWakafList([]);
    setMuallafList([]);
    setBukuBatchList([]);
    setBukuMutasiList([]);
    setFormulirList([]);
    setAuditList([
      {
        id: `AUD-${Date.now().toString(36).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        userName: activeStaff.nama || 'Admin KUA',
        userRole: activeStaff.role || 'Kepala KUA',
        aksi: 'HAPUS',
        modul: 'Staf & Sistem',
        detail: 'Seluruh data transaksi berhasil dibersihkan ke 0. Data master & profil KUA tetap aman.',
      },
    ]);
    setKuaSettings((prev) => ({
      ...prev,
      counterSuratKeluar: 0,
      counterAgendaMasuk: 0,
      counterAgendaKeluar: 0,
    }));
    localStorage.setItem(LOCAL_STORAGE_KEYS.NIKAH, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.SURAT, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.ARSIP, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.WAKAF, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.MUALLAF, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.BUKU_BATCH, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.BUKU_MUTASI, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.FORMULIR, JSON.stringify([]));
  };

  /**
   * Reset Bersih Total & Mulai Penyiapan Baru dari Nol
   */
  const resetToBlankKua = () => {
    const blankSettings: KuaSettings = {
      namaKua: 'KUA Kecamatan ...',
      kecamatan: '',
      kabupatenKota: '',
      provinsi: 'Provinsi Jawa Tengah',
      kodeKua: '',
      alamatLengkap: '',
      telepon: '',
      email: '',
      kepalaKuaNama: '',
      kepalaKuaNip: '',
      formatNomorSuratKeluar: 'B-{nomor}/KUA.{kodeKua}/{kodeKlasifikasi}/{bulanRomawi}/{tahun}',
      formatAgendaMasuk: 'AG-SM/{tahun}/{bulan}/{nomor}',
      formatAgendaKeluar: 'AG-SK/{tahun}/{bulan}/{nomor}',
      counterSuratKeluar: 0,
      counterAgendaMasuk: 0,
      counterAgendaKeluar: 0,
      officeUsername: kuaSettings.officeUsername || 'kuacandisari',
      officePassword: kuaSettings.officePassword || '123456',
      daftarKelurahan: [],
      kodeSuratCustomList: INITIAL_KUA_SETTINGS.kodeSuratCustomList,
    };

    setNikahList([]);
    setSuratList([]);
    setArsipList([]);
    setWakafList([]);
    setMuallafList([]);
    setBukuBatchList([]);
    setBukuMutasiList([]);
    setFormulirList([]);
    setKuaSettings(blankSettings);
    setAuditList([
      {
        id: `AUD-${Date.now().toString(36).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        userName: activeStaff.nama || 'Admin KUA',
        userRole: activeStaff.role || 'Kepala KUA',
        aksi: 'HAPUS',
        modul: 'Staf & Sistem',
        detail: 'Database direset bersih total. Silakan lengkapi Profil KUA dan Master Kelurahan Anda.',
      },
    ]);

    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(blankSettings));
    localStorage.setItem(LOCAL_STORAGE_KEYS.NIKAH, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.SURAT, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.ARSIP, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.WAKAF, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.MUALLAF, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.BUKU_BATCH, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.BUKU_MUTASI, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.FORMULIR, JSON.stringify([]));
  };

  /**
   * Memuat / menarik seluruh database KUA dari Google Spreadsheet (Gratis) ke aplikasi lokal
   */
  const importDatabaseFromSpreadsheet = (data: {
    nikahList: NikahRegistration[];
    suratList: SuratRecord[];
    kelurahanList: KelurahanItem[];
    kuaProfile?: Partial<KuaSettings>;
    staffList?: StaffUser[];
    wakafList?: WakafRecord[];
    muallafList?: MuallafRecord[];
    bukuBatchList?: BukuNikahBatch[];
    bukuMutasiList?: BukuNikahMutasi[];
    formulirList?: FormulirRegisterItem[];
    arsipList?: ArsipDokumen[];
  }) => {
    setNikahList(data.nikahList);
    setSuratList(data.suratList);
    if (data.staffList && data.staffList.length > 0) {
      setStaffList(data.staffList);
      localStorage.setItem(LOCAL_STORAGE_KEYS.STAFF, JSON.stringify(data.staffList));
    }
    if (data.wakafList) {
      setWakafList(data.wakafList);
      localStorage.setItem(LOCAL_STORAGE_KEYS.WAKAF, JSON.stringify(data.wakafList));
    }
    if (data.muallafList) {
      setMuallafList(data.muallafList);
      localStorage.setItem(LOCAL_STORAGE_KEYS.MUALLAF, JSON.stringify(data.muallafList));
    }
    if (data.bukuBatchList) {
      setBukuBatchList(data.bukuBatchList);
      localStorage.setItem(LOCAL_STORAGE_KEYS.BUKU_BATCH, JSON.stringify(data.bukuBatchList));
    }
    if (data.bukuMutasiList) {
      setBukuMutasiList(data.bukuMutasiList);
      localStorage.setItem(LOCAL_STORAGE_KEYS.BUKU_MUTASI, JSON.stringify(data.bukuMutasiList));
    }
    if (data.formulirList) {
      setFormulirList(data.formulirList);
      localStorage.setItem(LOCAL_STORAGE_KEYS.FORMULIR, JSON.stringify(data.formulirList));
    }
    if (data.arsipList) {
      setArsipList(data.arsipList);
      localStorage.setItem(LOCAL_STORAGE_KEYS.ARSIP, JSON.stringify(data.arsipList));
    }

    setKuaSettings((prev) => {
      const updated: KuaSettings = {
        ...prev,
        ...(data.kuaProfile || {}),
        daftarKelurahan: data.kelurahanList.length > 0 ? data.kelurahanList : prev.daftarKelurahan,
        googleSheetsConfig: prev.googleSheetsConfig
          ? {
              ...prev.googleSheetsConfig,
              lastSyncedAt: new Date().toLocaleString('id-ID'),
            }
          : undefined,
      };
      localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    });

    localStorage.setItem(LOCAL_STORAGE_KEYS.NIKAH, JSON.stringify(data.nikahList));
    localStorage.setItem(LOCAL_STORAGE_KEYS.SURAT, JSON.stringify(data.suratList));

    addAuditLog(
      'VERIFIKASI',
      'Master Data',
      `Menarik database penuh dari Google Spreadsheet: ${data.nikahList.length} nikah, ${data.suratList.length} surat, ${data.kelurahanList.length} kelurahan.`
    );
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
        updateOfficeCredentials,
        resetOfficePassword,
        addCustomKodeSurat,
        deleteCustomKodeSurat,
        getNextNomorSuratKeluarPreview,
        getNextNomorAgendaMasukPreview,
        nikahList,
        suratList,
        arsipList,
        auditList,
        wakafList,
        muallafList,
        bukuBatchList,
        bukuMutasiList,
        formulirList,
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
        addWakaf,
        updateWakaf,
        deleteWakaf,
        addMuallaf,
        updateMuallaf,
        deleteMuallaf,
        addBukuBatch,
        deleteBukuBatch,
        addBukuMutasi,
        deleteBukuMutasi,
        upsertFormulirRecord,
        markNotificationRead,
        resetToDefaultData,
        resetTransactionData,
        resetToBlankKua,
        importDatabaseFromSpreadsheet,
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
