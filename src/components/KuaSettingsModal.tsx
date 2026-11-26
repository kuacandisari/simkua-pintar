import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Save,
  ShieldCheck,
  Info,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';

interface KuaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_PRESETS = [
  {
    label: 'Pria Peci Hitam Resmi (Kepala KUA)',
    url: '/src/assets/images/avatar_kepala_kua_1792047097557.jpg',
  },
  {
    label: 'Pria Batik Hijau Kemenag',
    url: '/src/assets/images/avatar_penghulu_1792047116967.jpg',
  },
  {
    label: 'Penghulu Formal',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AhmadSubari&backgroundColor=d1d4f9',
  },
  {
    label: 'Pejabat Formal Muslim',
    url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DianPratama&backgroundColor=c0aede',
  },
];

export const KuaSettingsModal: React.FC<KuaSettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    kuaSettings,
    updateKuaSettings,
    updateOfficeCredentials,
    resetOfficePassword,
    staffList,
    updateStaff,
  } = useKua();

  const headStaff = staffList.find((s) => s.role === 'Kepala KUA') || staffList[0];

  const [nama, setNama] = useState(kuaSettings.kepalaKuaNama || (headStaff ? headStaff.nama : ''));
  const [nip, setNip] = useState(kuaSettings.kepalaKuaNip || (headStaff ? headStaff.nip : ''));
  const [jabatan, setJabatan] = useState(headStaff?.jabatan || 'Kepala KUA & Penghulu Madya');
  const [noHp, setNoHp] = useState(headStaff?.noHp || '0812-9876-5432');
  const [email, setEmail] = useState(headStaff?.email || 'kepala.kua@kemenag.go.id');
  const [avatarUrl, setAvatarUrl] = useState(headStaff?.avatarUrl || AVATAR_PRESETS[0].url);

  // Username & Password Login Kantor
  const [officeUsername, setOfficeUsername] = useState(kuaSettings.officeUsername || 'kuacandisari');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmResetPwd, setConfirmResetPwd] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const head = staffList.find((s) => s.role === 'Kepala KUA') || staffList[0];
      setNama(kuaSettings.kepalaKuaNama || head?.nama || '');
      setNip(kuaSettings.kepalaKuaNip || head?.nip || '');
      setJabatan(head?.jabatan || 'Kepala KUA & Penghulu Madya');
      setNoHp(head?.noHp || '');
      setEmail(head?.email || '');
      setAvatarUrl(head?.avatarUrl || AVATAR_PRESETS[0].url);
      setOfficeUsername(kuaSettings.officeUsername || 'kuacandisari');
      setNewPassword('');
      setConfirmPassword('');
      setConfirmResetPwd(false);
      setFeedback(null);
    }
  }, [isOpen, kuaSettings, staffList]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!officeUsername.trim()) {
      setFeedback({ type: 'error', text: 'Username login tidak boleh kosong.' });
      return;
    }

    if (newPassword.trim() || confirmPassword.trim()) {
      if (newPassword.trim().length < 4) {
        setFeedback({ type: 'error', text: 'Password baru minimal 4 karakter.' });
        return;
      }
      if (newPassword.trim() !== confirmPassword.trim()) {
        setFeedback({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
        return;
      }
    }

    // 1. Update legalitas Kepala KUA + kredensial login kantor sekaligus
    updateKuaSettings({
      ...kuaSettings,
      kepalaKuaNama: nama.trim(),
      kepalaKuaNip: nip.trim(),
      officeUsername: officeUsername.trim(),
      officePassword: newPassword.trim()
        ? newPassword.trim()
        : kuaSettings.officePassword || '123456',
    });

    // 2. Sync kredensial & staff Kepala KUA
    updateOfficeCredentials(officeUsername.trim(), newPassword.trim() || undefined);

    if (headStaff) {
      updateStaff(headStaff.id, {
        nama: nama.trim(),
        nip: nip.trim(),
        jabatan: jabatan.trim(),
        noHp: noHp.trim(),
        email: email.trim(),
        avatarUrl,
      });
    }

    setNewPassword('');
    setConfirmPassword('');
    setFeedback({
      type: 'success',
      text: newPassword.trim()
        ? 'Profil Kepala KUA, Username, dan Password baru berhasil disimpan.'
        : 'Profil Kepala KUA & Username login berhasil disimpan.',
    });
  };

  const handleConfirmResetPassword = () => {
    resetOfficePassword();
    setNewPassword('');
    setConfirmPassword('');
    setConfirmResetPwd(false);
    setFeedback({
      type: 'success',
      text: 'Password login berhasil direset kembali ke default: 123456',
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pengaturan Profil Kepala KUA &amp; Password Login
              </h3>
              <p className="text-[11px] text-slate-500">
                Identitas pejabat, ganti username/password, dan reset password default
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 text-xs">
            {feedback && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                  feedback.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {feedback.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span className="font-medium">{feedback.text}</span>
              </div>
            )}

            {/* Pengaturan Akun Login & Reset Password */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                  <h4 className="font-bold text-emerald-950 text-xs">
                    Akun Login Singkat &amp; Keamanan Password
                  </h4>
                </div>
                <span className="text-[10px] font-mono bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                  Lokal per KUA
                </span>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  Username Login KUA *
                </label>
                <input
                  type="text"
                  required
                  value={officeUsername}
                  onChange={(e) => setOfficeUsername(e.target.value)}
                  placeholder="kuacandisari"
                  className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-900 focus:outline-none focus:border-emerald-600"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Default: <strong>kuacandisari</strong>. Bisa disesuaikan dengan nama KUA Anda.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Ganti Password Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Kosongkan jika tidak diubah"
                      className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-xs font-mono focus:outline-none focus:border-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Ulangi Password Baru
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Konfirmasi password baru"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Reset Password Inline Confirmation */}
              <div className="pt-2 border-t border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] text-slate-600">
                  Password saat ini:{' '}
                  <strong className="font-mono text-emerald-900">
                    {kuaSettings.officePassword === '123456' || !kuaSettings.officePassword
                      ? 'Default (123456)'
                      : 'Custom (Tersimpan Lokal)'}
                  </strong>
                </span>

                {!confirmResetPwd ? (
                  <button
                    type="button"
                    onClick={() => setConfirmResetPwd(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Password ke Default (123456)</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1">
                    <span className="text-[10px] font-bold text-amber-900">Reset ke 123456?</span>
                    <button
                      type="button"
                      onClick={() => setConfirmResetPwd(false)}
                      className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-600 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmResetPassword}
                      className="px-2 py-0.5 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded cursor-pointer"
                    >
                      Ya, Reset
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notice regarding Master Data separation */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                Profil KUA (Nama KUA, Kode KUA, Format Nomor Surat, Kode Surat, Kelurahan &amp; Connect Sheet) diatur di menu <strong>Master Data KUA</strong>.
              </div>
            </div>

            {/* Nama & Gelar */}
            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Nama Lengkap &amp; Gelar Pejabat Kepala KUA *
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Drs. H. Ahmad Fauzi, M.Sy."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            {/* NIP Kepala KUA */}
            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Nomor Induk Pegawai (NIP) Kepala KUA *
              </label>
              <input
                type="text"
                required
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Contoh: 19750814 200112 1 002"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            {/* Jabatan Struktural / Fungsional */}
            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Jabatan Kedinasan
              </label>
              <input
                type="text"
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                placeholder="Contoh: Kepala KUA & Penghulu Madya"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
            </div>

            {/* Kontak & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  Nomor WhatsApp / HP Pejabat
                </label>
                <input
                  type="text"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  placeholder="0812-..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">
                  Email Kedinasan Pejabat
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ahmad.fauzi@kemenag.go.id"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Foto Profil / Avatar */}
            <div>
              <label className="block text-slate-700 mb-1.5 font-semibold">
                Pilih Foto Profil / Avatar Resmi Kepala KUA:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {AVATAR_PRESETS.map((p, idx) => {
                  const isSelected = avatarUrl === p.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(p.url)}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/30'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                    >
                      <img
                        src={p.url}
                        alt={p.label}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 bg-white"
                      />
                      <span className="text-[10px] text-slate-600 font-medium text-center line-clamp-1">
                        {p.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Profil &amp; Akses KUA</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800 cursor-pointer font-medium"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Profil &amp; Password</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
