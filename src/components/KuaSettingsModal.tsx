import React, { useState } from 'react';
import {
  UserCheck,
  Save,
  ShieldCheck,
  Database,
  ExternalLink,
  Phone,
  Mail,
  User,
  Info,
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
  const { kuaSettings, updateKuaSettings, staffList, updateStaff } = useKua();

  // Find head of KUA in staff list if exists
  const headStaff = staffList.find((s) => s.role === 'Kepala KUA') || staffList[0];

  const [nama, setNama] = useState(kuaSettings.kepalaKuaNama || (headStaff ? headStaff.nama : ''));
  const [nip, setNip] = useState(kuaSettings.kepalaKuaNip || (headStaff ? headStaff.nip : ''));
  const [jabatan, setJabatan] = useState(headStaff?.jabatan || 'Kepala Kantor & Penghulu Madya');
  const [noHp, setNoHp] = useState(headStaff?.noHp || '0812-9876-5432');
  const [email, setEmail] = useState(headStaff?.email || 'kepala.kua@kemenag.go.id');
  const [avatarUrl, setAvatarUrl] = useState(headStaff?.avatarUrl || AVATAR_PRESETS[0].url);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Update legalitas Kepala KUA di kuaSettings (digunakan pada penandatangan berkas & laporan)
    updateKuaSettings({
      ...kuaSettings,
      kepalaKuaNama: nama.trim(),
      kepalaKuaNip: nip.trim(),
    });

    // 2. Sync ke data staff Kepala KUA jika ada
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

    onClose();
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
                Profil Pejabat Kepala KUA
              </h3>
              <p className="text-[11px] text-slate-500">
                Data identitas & legalitas penandatangan dokumen dinas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 text-xs">
            {/* Notice regarding KUA Office Profile separation */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="block text-blue-950 font-semibold mb-0.5">
                  Profil Kantor KUA Dikelola Terpusat di Master Data:
                </strong>
                Field institusi kantor (Nama Kantor, Kecamatan, Kode KUA, Alamat Lengkap, Telepon Kantor & Penomoran Surat) tidak digabungkan di sini, melainkan dikelola terpusat di menu <strong>Master Data KUA &gt; Profil Kantor KUA</strong> agar data kantor terpadu dan rapi.
              </div>
            </div>

            {/* Nama & Gelar */}
            <div>
              <label className="block text-slate-700 mb-1 font-semibold">
                Nama Lengkap & Gelar Pejabat Kepala KUA *
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Drs. H. Ahmad Fauzi, M.Sy."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Dicantumkan pada lembar disposisi surat dinas, formulir nikah, dan laporan bulanan LNR.
              </span>
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
                placeholder="Contoh: Kepala Kantor & Penghulu Madya"
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
              <span>Legalitas Resmi Kemenag</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs text-slate-600 hover:text-slate-800 cursor-pointer font-medium"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Profil Kepala KUA</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
