import React, { useState } from 'react';
import {
  Building2,
  Lock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  LogIn,
  HeartHandshake,
  Mail,
  FileSpreadsheet,
  UsersRound,
  Eye,
  EyeOff,
  User,
  CalendarDays,
  ExternalLink,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';

interface LoginScreenProps {
  onOpenPublicJadwal?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onOpenPublicJadwal }) => {
  const { login, kuaSettings, officeUser } = useKua();

  const [usernameInput, setUsernameInput] = useState(officeUser.nip || 'kuacandisari');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const res = await login(usernameInput, passwordInput);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Login gagal. Periksa kembali Username dan Password Anda.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Background Graphic Texture */}
      <div className="absolute inset-0 z-0">
        <img
          src="/src/assets/images/kua_office_building_1792047078773.jpg"
          alt="Gedung KUA"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-15 filter blur-xs"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-emerald-950/80" />
      </div>

      <div className="relative z-10 w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-700/50 flex flex-col lg:flex-row">
        {/* Left Side: Institutional Identity (Prioritas KUA Candisari, Desentralisasi untuk Semua KUA) */}
        <div className="lg:w-5/12 bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 p-8 text-white flex flex-col justify-between relative">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg border border-emerald-400/40">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight">SIMKUA Pintar</h1>
                <p className="text-[11px] text-emerald-300 font-mono">
                  KUA {kuaSettings.kecamatan || 'Candisari'}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800 uppercase inline-block">
                Data Lokal &amp; Sheet Masing-Masing KUA
              </span>
              <h2 className="text-lg font-bold text-white leading-snug">
                {kuaSettings.namaKua || 'KUA Candisari'}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aplikasi administrasi KUA mandiri (tidak terpusat). Diutamakan untuk <strong>KUA Candisari</strong> dan dapat disesuaikan bebas oleh seluruh KUA dengan penyimpanan Google Spreadsheet masing-masing.
              </p>
            </div>

            <div className="pt-2 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fitur Utama:
              </span>
              <div className="space-y-2 text-xs text-slate-200">
                <div className="flex items-start gap-2.5 bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/50">
                  <HeartHandshake className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-semibold">Register Nikah &amp; Penghulu</strong>
                    <span className="text-[11px] text-slate-300">Jadwal akad &amp; penugasan Kepala KUA / Penghulu.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/50">
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-semibold">Format &amp; Kode Surat Custom</strong>
                    <span className="text-[11px] text-slate-300">Format penomoran surat, kode surat &amp; kelurahan wilayah kerja.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/50">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-semibold">Connect Sheet Masing-Masing</strong>
                    <span className="text-[11px] text-slate-300">Database lokal &amp; sinkronisasi Google Sheet pribadi KUA.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-emerald-800/40 space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Kementerian Agama RI</span>
              </span>
              <span className="font-mono text-slate-400">Kode: {kuaSettings.kodeKua || '-'}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Singkat Username & Password */}
        <div className="lg:w-7/12 p-6 sm:p-8 bg-slate-50 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                  <span>Login Singkat SIMKUA</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Masuk dengan username dan password KUA Anda
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                @{officeUser.nip}
              </span>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 mb-1.5 font-semibold">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="kuacandisari"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Username default: <strong className="font-mono text-emerald-800">{officeUser.nip}</strong> (atau NIP Kepala KUA / Penghulu)
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-700 font-semibold">Password</label>
                  <button
                    type="button"
                    onClick={() => setPasswordInput('123456')}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-mono underline underline-offset-2 cursor-pointer"
                  >
                    Isi password default (123456)
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan password (default: 123456)"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Sembunyikan Password' : 'Lihat Password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Password dapat diganti dan direset kapan saja melalui menu <strong>Pengaturan Profil</strong> setelah login.
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Memverifikasi...' : `Masuk ke ${kuaSettings.namaKua || 'SIMKUA'}`}</span>
              </button>
            </form>

            {/* Info Card */}
            <div className="mt-5 p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-950 flex items-start gap-2.5">
              <UsersRound className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p>
                  <strong>Data Kepala KUA &amp; Penghulu:</strong> Dikelola di dalam menu <em>Pegawai &amp; Role</em> khusus untuk keperluan data nikah ({kuaSettings.kepalaKuaNama || 'Kepala KUA'}).
                </p>
                <p className="text-emerald-800">
                  <strong>Penyimpanan Lokal Mandiri:</strong> Setiap KUA dapat mengubah profil KUA dan menghubungkan Google Sheet masing-masing secara terpisah.
                </p>
              </div>
            </div>
            {/* Public Citizen Wedding Schedule Access */}
            {onOpenPublicJadwal && (
              <div className="mt-4 p-3.5 bg-blue-50/90 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-[11px] text-blue-950">
                  <strong className="block font-bold">Layanan Informasi Masyarakat</strong>
                  <span className="text-blue-800">
                    Lihat jadwal akad nikah {kuaSettings.namaKua || 'KUA'} tanpa perlu login petugas.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenPublicJadwal}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shrink-0 cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Buka Jadwal Nikah Publik</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-200 text-center flex items-center justify-between text-[11px] text-slate-400">
            <span>Kementerian Agama RI · Dirjen Bimas Islam</span>
            <span className="font-mono text-emerald-700">Lokal &amp; Per-KUA Sheet</span>
          </div>
        </div>
      </div>
    </div>
  );
};
