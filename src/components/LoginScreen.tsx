import React, { useState } from 'react';
import {
  Building2,
  Lock,
  UserCheck,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  LogIn,
  ChevronDown,
  HeartHandshake,
  Mail,
  Database,
  CheckCircle2,
  UsersRound,
} from 'lucide-react';
import { useKua } from '../context/KuaContext';

export const LoginScreen: React.FC = () => {
  const { login, loginQuick, kuaSettings, officeUser } = useKua();

  // Active Tab: 'dropdown' (User Kantor Terpadu) or 'nip' (Login NIP & PIN Alternatif)
  const [activeTab, setActiveTab] = useState<'dropdown' | 'nip'>('dropdown');
  const [nipInput, setNipInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const res = await login(nipInput, pinInput);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Login gagal. Periksa kembali Username/NIP dan PIN Anda.');
    }
  };

  const handleOfficeLogin = () => {
    loginQuick(officeUser.id);
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
        {/* Left Side: Institutional Identity */}
        <div className="lg:w-5/12 bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 p-8 text-white flex flex-col justify-between relative">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg border border-emerald-400/40">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight">SIMKUA Pintar</h1>
                <p className="text-[11px] text-emerald-300 font-mono">Kantor Urusan Agama</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800 uppercase inline-block">
                Sistem Register Kantor Terpadu
              </span>
              <h2 className="text-lg font-bold text-white leading-snug">
                {kuaSettings.namaKua}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Platform digitalisasi tata kelola administrasi nikah lokal, penomoran surat dinas otomatis berkesinambungan, dan repositori arsip berkeamanan tinggi.
              </p>
            </div>

            {/* Quick Points on Left Panel */}
            <div className="pt-2 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fasilitas Utama:
              </span>
              <div className="space-y-2 text-xs text-slate-200">
                <div className="flex items-start gap-2.5 bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/50">
                  <HeartHandshake className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-semibold">Register Nikah Ringkas</strong>
                    <span className="text-[11px] text-slate-300">Pencatatan cepat catin lokal pendamping SIMKAH.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/50">
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-semibold">Nomor Surat Berlanjut</strong>
                    <span className="text-[11px] text-slate-300">Nomor surat keluar & agenda masuk urut otomatis.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/50">
                  <Database className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-semibold">Master Data Wilayah</strong>
                    <span className="text-[11px] text-slate-300">Data kelurahan, kodepos, & kode klasifikasi surat custom.</span>
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
              <span className="font-mono text-slate-400">Kode: {kuaSettings.kodeKua}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form with 1 User (User Kantor) & NIP/PIN Alternative */}
        <div className="lg:w-7/12 p-6 sm:p-8 bg-slate-50 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Portal Layanan Internal KUA</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Masuk dengan User Kantor ({officeUser.nip})
                </p>
              </div>

              {/* Tab Switcher: Dropdown (User Kantor) & NIP/PIN Alternatif */}
              <div className="flex p-1 bg-slate-200 rounded-lg text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dropdown');
                    setErrorMessage('');
                  }}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'dropdown' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>User Kantor</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('nip');
                    setErrorMessage('');
                  }}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'nip' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>NIP & PIN</span>
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: PILIH AKUN USER KANTOR (HANYA 1 USER: KANTOR KUA) */}
            {activeTab === 'dropdown' && (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-slate-700 text-xs font-semibold mb-1.5">
                    Pilih Akun Kantor:
                  </label>
                  <div className="relative">
                    <select
                      value={officeUser.id}
                      disabled
                      className="w-full appearance-none bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs"
                    >
                      <option value={officeUser.id}>
                        {officeUser.nama} — [User Kantor: {officeUser.nip}]
                      </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Akun terpusat untuk operasional administrasi kantor KUA. Profil Kepala KUA dan Staf dikelola di dalam sistem.
                  </p>
                </div>

                {/* Selected Office Profile Card Preview */}
                <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-600 shrink-0 bg-emerald-900 flex items-center justify-center text-white shadow-2xs">
                    <Building2 className="w-6 h-6 text-emerald-200" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                        Akun Kantor Terpadu
                      </span>
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Akun Utama Aktif
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 truncate mt-1">
                      {officeUser.nama}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Username: <strong>{officeUser.nip}</strong> · {kuaSettings.kabupatenKota}
                    </p>
                  </div>
                </div>

                {/* Login Button for Office User */}
                <button
                  type="button"
                  onClick={handleOfficeLogin}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    Masuk ke Sistem {kuaSettings.namaKua}
                  </span>
                </button>

                {/* Internal Staff Reminder */}
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/70 text-[11px] text-emerald-900 flex items-start gap-2">
                  <UsersRound className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Profil Pejabat & Pegawai Ada di Dalam:</strong> Profil Kepala KUA ({kuaSettings.kepalaKuaNama}), Penghulu, Staf TU, dan Verifikator dapat dilihat, ditugaskan pada register nikah, serta diatur di dalam menu <em>Staf & Log Aktivitas</em> dan <em>Master Data KUA</em>.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: LOGIN NIP & PIN SEBAGAI ALTERNATIF */}
            {activeTab === 'nip' && (
              <form onSubmit={handleManualLogin} className="mt-5 space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">
                    Username Kantor atau NIP Pegawai
                  </label>
                  <input
                    type="text"
                    required
                    value={nipInput}
                    onChange={(e) => setNipInput(e.target.value)}
                    placeholder={`Masukkan username kantor (${officeUser.nip}) atau NIP pegawai`}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs focus:outline-none focus:border-emerald-600 font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Gunakan username kantor: <strong>{officeUser.nip}</strong>
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">PIN Akses (6 Digit)</label>
                    <span className="text-[10px] text-emerald-700 font-mono">
                      Default PIN: 123456
                    </span>
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Masukkan 6 digit PIN (123456)"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-mono tracking-widest focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Memverifikasi...' : 'Masuk ke Sistem (NIP & PIN)'}</span>
                </button>
              </form>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-slate-200 text-center flex items-center justify-between text-[11px] text-slate-400">
            <span>Kementerian Agama RI · Dirjen Bimas Islam</span>
            <span className="font-mono text-emerald-700">Internal Office Portal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

