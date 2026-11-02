import React, { useState, useMemo } from 'react';
import {
  UsersRound,
  ShieldCheck,
  Search,
  Filter,
  Clock,
  UserCheck,
  KeyRound,
  CheckCircle2,
  FileText,
  Building,
  Lock,
  UserPlus,
  Edit3,
  Trash2,
  Phone,
  Mail,
  X,
  Save,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';
import { AuditLog, StaffUser, UserRole } from '../types';

const AVATAR_PRESETS = [
  {
    label: 'Pria Peci Hitam Resmi',
    url: '/src/assets/images/avatar_kepala_kua_1792047097557.jpg',
  },
  {
    label: 'Pria Batik Hijau Kemenag',
    url: '/src/assets/images/avatar_penghulu_1792047116967.jpg',
  },
  {
    label: 'Staf Wanita Hijab Kemenag',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SitiRahma&backgroundColor=b6e3f4',
  },
  {
    label: 'Staf Pria Analis Kemenag',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DianPratama&backgroundColor=c0aede',
  },
  {
    label: 'Penghulu Muda',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AhmadSubari&backgroundColor=d1d4f9',
  },
  {
    label: 'Pegawai Administrasi Muslimah',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NurHasanah&backgroundColor=ffd5dc',
  },
];

export const StaffAuditView: React.FC = () => {
  const { staffList, activeStaff, setActiveStaff, auditList, addStaff, updateStaff, deleteStaff } = useKua();

  const [searchAudit, setSearchAudit] = useState('');
  const [filterModul, setFilterModul] = useState<string>('Semua');
  const [filterAksi, setFilterAksi] = useState<string>('Semua');

  // Add / Edit Staff Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  const [staffForm, setStaffForm] = useState({
    nama: '',
    nip: '',
    email: '',
    role: 'Penghulu' as UserRole,
    jabatan: '',
    noHp: '',
    avatarUrl: AVATAR_PRESETS[1].url,
    pin: '123456',
    statusAktif: true,
  });

  const handleOpenAddModal = () => {
    setStaffForm({
      nama: '',
      nip: '',
      email: '',
      role: 'Penghulu',
      jabatan: 'Penghulu Muda / Pemeriksa Berkas',
      noHp: '0812-',
      avatarUrl: AVATAR_PRESETS[1].url,
      pin: '123456',
      statusAktif: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (st: StaffUser) => {
    setEditingStaff(st);
    setStaffForm({
      nama: st.nama,
      nip: st.nip,
      email: st.email,
      role: st.role,
      jabatan: st.jabatan,
      noHp: st.noHp,
      avatarUrl: st.avatarUrl,
      pin: st.pin || '123456',
      statusAktif: st.statusAktif,
    });
  };

  const handleRoleChangeInForm = (role: UserRole) => {
    let defaultJabatan = staffForm.jabatan;
    if (role === 'Penghulu') defaultJabatan = 'Penghulu Muda / Pemeriksa Berkas';
    if (role === 'Staf Tata Usaha') defaultJabatan = 'Pengadministrasi Persuratan & SIMKAH';
    if (role === 'Verifikator') defaultJabatan = 'Verifikator Berkas & Dokumen Nikah';
    if (role === 'Kepala KUA') defaultJabatan = 'Kepala Kantor & Pejabat Pembuat Akta';

    setStaffForm((prev) => ({
      ...prev,
      role,
      jabatan: defaultJabatan,
    }));
  };

  const handleSubmitStaffForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.nama.trim() || !staffForm.nip.trim() || !staffForm.email.trim()) {
      alert('Harap lengkapi nama lengkap, NIP, dan email dinas pegawai.');
      return;
    }

    if (editingStaff) {
      // Update existing staff
      updateStaff(editingStaff.id, {
        nama: staffForm.nama.trim(),
        nip: staffForm.nip.trim(),
        email: staffForm.email.trim(),
        role: staffForm.role,
        jabatan: staffForm.jabatan.trim(),
        noHp: staffForm.noHp.trim(),
        avatarUrl: staffForm.avatarUrl,
        pin: staffForm.pin.trim() || '123456',
        statusAktif: staffForm.statusAktif,
      });
      setEditingStaff(null);
    } else {
      // Add new staff
      addStaff({
        nama: staffForm.nama.trim(),
        nip: staffForm.nip.trim(),
        email: staffForm.email.trim(),
        role: staffForm.role,
        jabatan: staffForm.jabatan.trim() || `${staffForm.role} KUA`,
        noHp: staffForm.noHp.trim() || '0812-0000-0000',
        avatarUrl: staffForm.avatarUrl || AVATAR_PRESETS[0].url,
        statusAktif: staffForm.statusAktif,
        pin: staffForm.pin.trim() || '123456',
      });
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteStaff = (st: StaffUser) => {
    if (st.id === activeStaff.id) {
      alert('Anda tidak dapat menghapus akun pegawai yang sedang Anda gunakan dalam sesi saat ini.');
      return;
    }
    if (confirm(`Yakin ingin menghapus pegawai "${st.nama}" (${st.role}) dari sistem kantor KUA?`)) {
      deleteStaff(st.id);
    }
  };

  const filteredLogs = useMemo(() => {
    return auditList.filter((log) => {
      const matchSearch =
        log.userName.toLowerCase().includes(searchAudit.toLowerCase()) ||
        log.detail.toLowerCase().includes(searchAudit.toLowerCase()) ||
        log.modul.toLowerCase().includes(searchAudit.toLowerCase());

      const matchModul = filterModul === 'Semua' || log.modul === filterModul;
      const matchAksi = filterAksi === 'Semua' || log.aksi === filterAksi;

      return matchSearch && matchModul && matchAksi;
    });
  }, [auditList, searchAudit, filterModul, filterAksi]);

  const getActionBadgeColor = (aksi: AuditLog['aksi']) => {
    switch (aksi) {
      case 'TAMBAH':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'EDIT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DISPOSISI':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'VERIFIKASI':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'CETAK':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'HAPUS':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const rolePermissions: { role: UserRole; desc: string; permissions: string[] }[] = [
    {
      role: 'Kepala KUA',
      desc: 'Pejabat penanggung jawab tertinggi di tingkat kecamatan',
      permissions: [
        'Otorisasi lembar disposisi surat dinas',
        'Persetujuan akhir berkas pendaftaran nikah',
        'Legalisasi & unduh laporan bulanan resmi (LNR)',
        'Hak penambahan/pengelolaan data staf & pemantauan audit log',
      ],
    },
    {
      role: 'Penghulu',
      desc: 'Pejabat fungsional kepenghuluan dan pelayanan akad',
      permissions: [
        'Pemeriksaan nikah fisik & penasihatan pranikah (Model N2)',
        'Pelaksanaan akad nikah di KUA maupun Bedol',
        'Pencatatan nomor akta nikah & nomor seri buku nikah',
        'Pengumuman kehendak nikah (Model N5)',
      ],
    },
    {
      role: 'Staf Tata Usaha',
      desc: 'Pengelola administrasi umum, persuratan & register kantor',
      permissions: [
        'Pendaftaran agenda nikah lokal baru di sistem',
        'Pencatatan buku agenda surat masuk & keluar dinas berlanjut',
        'Unggah & kategorisasi arsip dokumen digital',
        'Pencetakan register nikah & formulir kedinasan',
      ],
    },
    {
      role: 'Verifikator',
      desc: 'Pemeriksa keabsahan berkas kependudukan & keaslian syarat',
      permissions: [
        'Verifikasi keabsahan data pasangan calon pengantin',
        'Pemeriksaan kelengkapan sertifikat imunisasi Elsimil & wali',
        'Pemeriksaan izin atasan bagi anggota TNI/Polri',
        'Audit kepatuhan syarat administrasi perkawinan',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: RBAC & Transparency */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Tata Kelola Transparan & Hak Akses Bertingkat (RBAC)</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Manajemen Staf & Rekam Jejak Aktivitas Kantor KUA
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Sistem pengawasan terintegrasi untuk mengelola pejabat, penghulu, dan staf tata usaha KUA. Setiap tindakan penambahan pegawai, perubahan data, disposisi, dan pembuatan berkas tercatat permanen di audit log.
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs shrink-0 flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block">Sesi Login Anda:</span>
            <strong className="text-slate-800 block">{activeStaff.nama}</strong>
            <span className="text-[10px] text-emerald-700 font-bold font-mono">
              Role: {activeStaff.role}
            </span>
          </div>
          <img
            src={activeStaff.avatarUrl}
            alt={activeStaff.nama}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-full border border-emerald-500 object-cover bg-white"
          />
        </div>
      </div>

      {/* Staff Directory Cards with "+ Tambah Pegawai" Action Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daftar Pejabat & Pegawai Kantor Urusan Agama ({staffList.length} Orang)
            </h3>
            <p className="text-[11px] text-slate-500">
              Pegawai yang terdaftar dapat melakukan login dengan NIP & PIN atau dipilih pada penugasan nikah & disposisi surat.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Pegawai Baru</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {staffList.map((st) => {
            const isCurrent = activeStaff.id === st.id;
            return (
              <div
                key={st.id}
                className={`bg-white rounded-xl border p-4 shadow-xs transition-all flex flex-col justify-between ${
                  isCurrent ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={st.avatarUrl}
                        alt={st.nama}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 bg-slate-50 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                          {st.role}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1" title={st.nama}>
                          {st.nama}
                        </h4>
                      </div>
                    </div>

                    {/* Quick Edit & Delete Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(st)}
                        title="Edit Data Pegawai"
                        className="p-1 text-slate-400 hover:text-emerald-700 rounded transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(st)}
                        title="Hapus Pegawai"
                        disabled={isCurrent}
                        className={`p-1 rounded transition-colors ${
                          isCurrent
                            ? 'text-slate-200 cursor-not-allowed'
                            : 'text-slate-400 hover:text-rose-600'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <p>
                      <span className="text-slate-400">NIP:</span> <span className="font-mono">{st.nip}</span>
                    </p>
                    <p className="line-clamp-1" title={st.jabatan}>
                      <span className="text-slate-400">Jabatan:</span> {st.jabatan}
                    </p>
                    <p className="line-clamp-1" title={st.email}>
                      <span className="text-slate-400">Email:</span> {st.email}
                    </p>
                    <p>
                      <span className="text-slate-400">Kontak:</span> {st.noHp}
                    </p>
                    <p>
                      <span className="text-slate-400">PIN Login:</span>{' '}
                      <span className="font-mono text-emerald-700 font-semibold">{st.pin || '123456'}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {isCurrent ? (
                    <span className="w-full py-1.5 px-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Sesi Akun Anda Sedang Aktif</span>
                    </span>
                  ) : (
                    <span className="w-full py-1.5 px-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-medium flex items-center justify-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Hak Akses Terkunci (Gunakan Sesi Login)</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Permission Matrix Details */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          Matriks Wewenang & Hak Akses Bertingkat (RBAC):
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {rolePermissions.map((rp) => (
            <div key={rp.role} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="font-bold text-emerald-900 block">{rp.role}</span>
              <p className="text-[11px] text-slate-500">{rp.desc}</p>
              <ul className="space-y-1 text-[11px] text-slate-700 pt-1 border-t border-slate-200">
                {rp.permissions.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Immutable Activity Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span>Buku Log Audit Aktivitas Staf Transparan</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Setiap transaksi dicatat dengan stempel waktu permanen dan identitas aktor
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchAudit}
                onChange={(e) => setSearchAudit(e.target.value)}
                placeholder="Cari nama staf, aktivitas..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 w-52"
              />
            </div>

            <select
              value={filterModul}
              onChange={(e) => setFilterModul(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer"
            >
              <option value="Semua">Semua Modul</option>
              <option value="Register Nikah">Register Nikah</option>
              <option value="Surat Masuk">Surat Masuk</option>
              <option value="Surat Keluar">Surat Keluar</option>
              <option value="Arsip Digital">Arsip Digital</option>
              <option value="Laporan">Laporan</option>
              <option value="Staf & Sistem">Staf & Sistem</option>
            </select>

            <select
              value={filterAksi}
              onChange={(e) => setFilterAksi(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer"
            >
              <option value="Semua">Semua Aksi</option>
              <option value="TAMBAH">TAMBAH</option>
              <option value="EDIT">EDIT</option>
              <option value="DISPOSISI">DISPOSISI</option>
              <option value="VERIFIKASI">VERIFIKASI</option>
              <option value="CETAK">CETAK</option>
              <option value="HAPUS">HAPUS</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-2.5 px-4 w-36">Waktu Transaksi</th>
                <th className="py-2.5 px-4 w-48">Aktor / Pegawai</th>
                <th className="py-2.5 px-4 w-28 text-center">Tindakan</th>
                <th className="py-2.5 px-4 w-36">Modul Sistem</th>
                <th className="py-2.5 px-4">Rincian Perubahan Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Tidak ada catatan audit yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString('id-ID')}
                      <span className="block text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{log.userName}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{log.userRole}</span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getActionBadgeColor(log.aksi)}`}>
                        {log.aksi}
                      </span>
                    </td>

                    {/* Modul */}
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {log.modul}
                    </td>

                    {/* Detail */}
                    <td className="py-3 px-4 text-slate-700">
                      {log.detail}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Menampilkan <strong className="text-slate-800">{filteredLogs.length}</strong> catatan aktivitas rekam jejak</span>
          <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Immutable Audit Log · Anti-Tamper
          </span>
        </div>
      </div>

      {/* MODAL: Tambah Pegawai Baru / Edit Pegawai */}
      {(isAddModalOpen || editingStaff) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingStaff ? 'Edit Data Pegawai KUA' : 'Tambah Pegawai KUA Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pendaftaran profil staf, penugasan hak akses, dan PIN login
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingStaff(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitStaffForm}>
              <div className="p-6 space-y-4 text-xs">
                {/* Nama Pegawai */}
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    value={staffForm.nama}
                    onChange={(e) => setStaffForm({ ...staffForm, nama: e.target.value })}
                    placeholder="Contoh: Drs. H. Mulyadi, M.Ag. atau Fatimah, S.Sos."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                {/* NIP & Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">
                      Nomor Induk Pegawai (NIP) *
                    </label>
                    <input
                      type="text"
                      required
                      value={staffForm.nip}
                      onChange={(e) => setStaffForm({ ...staffForm, nip: e.target.value })}
                      placeholder="19850615 201101 1 003"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">
                      Peran / Hak Akses (RBAC) *
                    </label>
                    <select
                      value={staffForm.role}
                      onChange={(e) => handleRoleChangeInForm(e.target.value as UserRole)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white cursor-pointer"
                    >
                      <option value="Penghulu">Penghulu</option>
                      <option value="Staf Tata Usaha">Staf Tata Usaha</option>
                      <option value="Verifikator">Verifikator</option>
                      <option value="Kepala KUA">Kepala KUA</option>
                    </select>
                  </div>
                </div>

                {/* Jabatan & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">
                      Jabatan Struktural / Fungsional
                    </label>
                    <input
                      type="text"
                      value={staffForm.jabatan}
                      onChange={(e) => setStaffForm({ ...staffForm, jabatan: e.target.value })}
                      placeholder="Contoh: Penghulu Pertama"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">
                      Email Kedinasan *
                    </label>
                    <input
                      type="email"
                      required
                      value={staffForm.email}
                      onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                      placeholder="nama@kemenag.go.id"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* No HP & PIN Akses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">
                      Nomor WhatsApp / HP
                    </label>
                    <input
                      type="text"
                      value={staffForm.noHp}
                      onChange={(e) => setStaffForm({ ...staffForm, noHp: e.target.value })}
                      placeholder="0812-3456-7890"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1 font-semibold">
                      PIN Akses Login (6 Digit)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={staffForm.pin}
                      onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value })}
                      placeholder="123456"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono tracking-wider focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Digunakan untuk login cepat dengan NIP & PIN.
                    </span>
                  </div>
                </div>

                {/* Avatar Selection */}
                <div>
                  <label className="block text-slate-700 mb-1.5 font-semibold">
                    Pilih Foto Profil / Avatar Resmi
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {AVATAR_PRESETS.map((p, idx) => {
                      const isSelected = staffForm.avatarUrl === p.url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setStaffForm({ ...staffForm, avatarUrl: p.url })}
                          className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/30'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                          }`}
                          title={p.label}
                        >
                          <img
                            src={p.url}
                            alt={p.label}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-white"
                          />
                          <span className="text-[9px] text-slate-600 font-medium text-center line-clamp-1 leading-tight">
                            {p.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingStaff(null);
                  }}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingStaff ? 'Simpan Perubahan' : 'Daftarkan Pegawai'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
