import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { KuaSettings, NikahRegistration, SuratRecord } from '../types';

/**
 * Generates official Indonesian Ministry of Religious Affairs (Kemenag)
 * letterhead (Kop Surat Resmi KUA)
 */
function drawKemenagHeader(doc: jsPDF, settings: KuaSettings, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top header text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', pageWidth / 2, 14, { align: 'center' });
  doc.text(`KANTOR KEMENTERIAN AGAMA ${settings.kabupatenKota.toUpperCase()}`, pageWidth / 2, 19, {
    align: 'center',
  });
  doc.setFontSize(13);
  doc.text(settings.namaKua.toUpperCase(), pageWidth / 2, 25, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `${settings.alamatLengkap} | Telp: ${settings.telepon} | Email: ${settings.email}`,
    pageWidth / 2,
    30,
    { align: 'center' }
  );

  // Double horizontal divider line
  doc.setLineWidth(0.8);
  doc.line(14, 33, pageWidth - 14, 33);
  doc.setLineWidth(0.3);
  doc.line(14, 34.2, pageWidth - 14, 34.2);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title.toUpperCase(), pageWidth / 2, 42, { align: 'center' });

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(subtitle, pageWidth / 2, 47, { align: 'center' });
  }
}

/**
 * 1. Unduh Laporan Bulanan Rekapitulasi Pelayanan Nikah Kantor KUA (Model LNR)
 */
export function generateLaporanLnrPdf(
  settings: KuaSettings,
  monthName: string,
  year: number,
  registrations: NikahRegistration[]
) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  drawKemenagHeader(
    doc,
    settings,
    `LAPORAN BULANAN REGISTER AGENDA NIKAH KUA`,
    `Bulan: ${monthName} ${year} | Wilayah Kecamatan: ${settings.kecamatan} (Register Internal Kantor)`
  );

  const totalNikah = registrations.length;
  const nikahKua = registrations.filter((r) => r.lokasiAkad === 'Di KUA').length;
  const nikahBedol = registrations.filter((r) => r.lokasiAkad === 'Luar KUA (Bedol)').length;
  const totalPnbp = nikahBedol * 600000;
  const nikahSelesai = registrations.filter((r) => r.status === 'Selesai').length;

  // Ringkasan Eksekutif Rekapitulasi
  autoTable(doc, {
    startY: 52,
    head: [['No', 'Uraian Statistik Pelayanan Nikah', 'Jumlah', 'Satuan', 'Keterangan']],
    body: [
      ['1', 'Peristiwa Nikah di Balai Nikah KUA', nikahKua.toString(), 'Pasang', 'Bebas Biaya / Rp 0'],
      ['2', 'Peristiwa Nikah di Luar KUA (Bedol)', nikahBedol.toString(), 'Pasang', 'Tarif PNBP Rp 600.000 / pasang'],
      ['3', 'Total Agenda Nikah Terdaftar Bulan Ini', totalNikah.toString(), 'Pasang', 'KUA + Bedol'],
      ['4', 'Estimasi Setoran PNBP Nikah Bedol', `Rp ${totalPnbp.toLocaleString('id-ID')}`, 'Rupiah', 'Kas Negara via SIMPONI'],
      ['5', 'Pernikahan Telah Akad Selesai', nikahSelesai.toString(), 'Pasang', 'Pelaksanaan selesai'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 81, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 25, halign: 'center' },
    },
  });

  const lastTableY = (doc as any).lastAutoTable.finalY + 8;

  // Daftar Rincian Pasangan Nikah (Clean Names, No NIK)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DAFTAR AGENDA PERISTIWA NIKAH KANTOR KUA', 14, lastTableY);

  const nikahRows = registrations.map((r, idx) => [
    (idx + 1).toString(),
    r.noPendaftaran,
    r.noSimkah || '-',
    `${r.suami.nama} &\n${r.istri.nama}`,
    `${r.tanggalAkad}\n${r.jamAkad} WIB`,
    r.lokasiAkad,
    r.penghuluNama.replace('Drs. ', '').replace('Ust. ', ''),
    r.status,
  ]);

  autoTable(doc, {
    startY: lastTableY + 3,
    head: [['No', 'No. Register', 'Ref. SIMKAH', 'Nama Pasangan Catin', 'Jadwal Akad', 'Lokasi', 'Penghulu', 'Status']],
    body: nikahRows,
    theme: 'striped',
    headStyles: { fillColor: [40, 116, 75], textColor: [255, 255, 255] },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 24, fontStyle: 'bold' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 20 },
      7: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
    },
  });

  const signatureY = (doc as any).lastAutoTable.finalY + 12;

  if (signatureY > 240) {
    doc.addPage();
  }

  const signX = pageWidth - 70;
  const curY = signatureY > 240 ? 30 : signatureY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${settings.kecamatan}, 31 ${monthName} ${year}`, signX, curY);
  doc.text('Kepala Kantor Urusan Agama,', signX, curY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text(settings.kepalaKuaNama, signX, curY + 28);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${settings.kepalaKuaNip}`, signX, curY + 33);

  // Security Validation stamp
  doc.setDrawColor(15, 81, 50);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, curY + 2, 70, 28, 2, 2);
  doc.setFontSize(7.5);
  doc.setTextColor(15, 81, 50);
  doc.text('REGISTER INTERNAL KANTOR KUA', 17, curY + 8);
  doc.setTextColor(80, 80, 80);
  doc.text('SIMKUA PINTAR - KEMENAG RI', 17, curY + 13);
  doc.text(`ID Dokumen: LNR-${year}${monthName.slice(0, 3).toUpperCase()}`, 17, curY + 18);
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 17, curY + 23);

  doc.save(`Laporan_Agenda_Nikah_${settings.kecamatan}_${monthName}_${year}.pdf`);
}

/**
 * 2. Unduh Lembar Bukti Register Agenda Nikah Kantor KUA
 */
export function generateModelNPdf(settings: KuaSettings, nikah: NikahRegistration) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  drawKemenagHeader(
    doc,
    settings,
    'LEMBAR REGISTER AGENDA NIKAH KANTOR KUA',
    `Nomor Agenda: ${nikah.noPendaftaran} ${nikah.noSimkah ? `| Ref SIMKAH: ${nikah.noSimkah}` : ''}`
  );

  let y = 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('I. DATA PASANGAN CALON PENGANTIN (CATIN)', 14, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 5 }, 2: { cellWidth: 125 } },
    body: [
      ['Nama Calon Suami', ':', nikah.suami.nama],
      ['Nama Calon Istri', ':', nikah.istri.nama],
      ['No. Telepon / WhatsApp', ':', nikah.suami.noHp || nikah.istri.noHp || '-'],
      ['No. Referensi SIMKAH4', ':', nikah.noSimkah || 'Pendaftaran Langsung di KUA'],
      ['Nama Wali Nikah', ':', nikah.wali?.nama ? `${nikah.wali.nama} (${nikah.wali.hubungan || 'Wali'})` : '-'],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('II. JADWAL & PELAKSANAAN AKAD NIKAH', 14, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 5 }, 2: { cellWidth: 125 } },
    body: [
      ['Rencana Hari & Tanggal Akad', ':', `${nikah.tanggalAkad} pukul ${nikah.jamAkad} WIB`],
      ['Lokasi Pelaksanaan', ':', `${nikah.lokasiAkad}`],
      ['Alamat Lengkap / Gedung', ':', nikah.alamatAkad],
      ['Penghulu Bertugas', ':', nikah.penghuluNama],
      ['Biaya PNBP Nikah', ':', nikah.biayaNikah === 0 ? 'Rp 0 (Gratis di Balai Nikah KUA)' : 'Rp 600.000 (Luar Balai Nikah / Bedol)'],
      ['Status PNBP', ':', nikah.pnbpStatus],
      ['Status Alur Kantor', ':', nikah.status],
      ['Catatan Kantor', ':', nikah.catatan || '-'],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 14;

  const signX = pageWidth - 70;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${settings.kecamatan}, ${nikah.tanggalAkad}`, signX, y);
  doc.text('Petugas KUA / Penghulu,', signX, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.text(nikah.penghuluNama, signX, y + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${settings.kepalaKuaNip}`, signX, y + 30);

  doc.save(`Register_Agenda_${nikah.suami.nama.replace(/\s+/g, '_')}.pdf`);
}

/**
 * 3. Unduh Lembar Disposisi Surat Dinas KUA
 */
export function generateDisposisiPdf(settings: KuaSettings, surat: SuratRecord) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  drawKemenagHeader(doc, settings, 'LEMBAR DISPOSISI KEPALA KUA', `Nomor Agenda: ${surat.noAgenda}`);

  let y = 53;

  autoTable(doc, {
    startY: y,
    head: [['INFORMASI SURAT DINAS', '']],
    body: [
      ['Surat Dari / Pengirim', surat.pengirim],
      ['Nomor Surat', surat.noSurat],
      ['Tanggal Surat', surat.tglSurat],
      ['Tanggal Diterima', surat.tglDiterima],
      ['Klasifikasi & Sifat', `${surat.klasifikasi} | Sifat: ${surat.sifat.toUpperCase()}`],
      ['Perihal Surat', surat.perihal],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 81, 50], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 135 },
    },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INSTRUKSI & CATATAN DISPOSISI KEPALA KANTOR:', 14, y);

  y += 4;
  const disposisi = surat.disposisi || {
    catatan: 'Segera pelajari dan koordinasikan tindak lanjut sesuai tupoksi dinas.',
    instruksi: ['Tindak lanjuti segera', 'Laporkan hasilnya'],
    ditujukanKe: 'Seluruh Staf Terkait',
    batasWaktu: '3 hari kerja',
    tanggalDisposisi: new Date().toISOString().split('T')[0],
    disposisiOleh: settings.kepalaKuaNama,
    statusTindakLanjut: 'Belum',
  };

  autoTable(doc, {
    startY: y,
    body: [
      ['Diteruskan Kepada', `: ${disposisi.ditujukanKe}`],
      ['Tenggat Waktu', `: ${disposisi.batasWaktu}`],
      ['Instruksi Disposisi', `: ${disposisi.instruksi.join(', ')}`],
      ['Catatan Arahan Kepala KUA', `: "${disposisi.catatan}"`],
      ['Status Tindak Lanjut', `: ${disposisi.statusTindakLanjut === 'Selesai' ? 'Sudah Selesai Ditindaklanjuti' : 'Sedang Dalam Proses'}`],
    ],
    theme: 'plain',
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 130 } },
    styles: { fontSize: 9, cellPadding: 2 },
  });

  const signY = (doc as any).lastAutoTable.finalY + 14;
  const signX = pageWidth - 70;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${settings.kecamatan}, ${disposisi.tanggalDisposisi}`, signX, signY);
  doc.text('Kepala KUA,', signX, signY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text(settings.kepalaKuaNama, signX, signY + 28);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${settings.kepalaKuaNip}`, signX, signY + 33);

  doc.save(`Disposisi_${surat.noAgenda.replace(/[\/\\]/g, '_')}.pdf`);
}

/**
 * 4. Unduh Buku Register Agenda Nikah Kantor Lengkap
 */
export function generateBukuRegisterNikahPdf(settings: KuaSettings, registrations: NikahRegistration[]) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('BUKU REGISTER AGENDA NIKAH KANTOR KUA (PENDAMPING SIMKAH)', pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${settings.namaKua.toUpperCase()} - ${settings.kabupatenKota.toUpperCase()}`, pageWidth / 2, 20, {
    align: 'center',
  });

  const tableData = registrations.map((r, i) => [
    (i + 1).toString(),
    r.noPendaftaran,
    r.noSimkah || '-',
    r.suami.nama,
    r.istri.nama,
    r.suami.noHp || r.istri.noHp || '-',
    `${r.tanggalAkad} ${r.jamAkad}`,
    r.lokasiAkad,
    r.alamatAkad,
    r.penghuluNama,
    r.status,
  ]);

  autoTable(doc, {
    startY: 26,
    head: [
      [
        'No',
        'No. Register',
        'Ref. SIMKAH',
        'Calon Suami',
        'Calon Istri',
        'Kontak',
        'Waktu Akad',
        'Lokasi',
        'Tempat / Alamat',
        'Penghulu',
        'Status',
      ],
    ],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [15, 81, 50], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 24, fontStyle: 'bold' },
      6: { cellWidth: 24 },
      7: { cellWidth: 20 },
      10: { cellWidth: 18, fontStyle: 'bold' },
    },
  });

  doc.save(`Buku_Register_Agenda_Nikah_${settings.kecamatan}.pdf`);
}

export interface SyaratCoverItem {
  kode: string;
  nama: string;
  status: 'Ada' | 'Kurang' | 'Tidak Perlu';
  keterangan: string;
}

export interface CoverExtraData {
  suamiNik?: string;
  suamiTtl?: string;
  suamiStatus?: string;
  suamiPekerjaan?: string;
  suamiKelurahan?: string;
  suamiAlamat?: string;
  istriNik?: string;
  istriTtl?: string;
  istriStatus?: string;
  istriPekerjaan?: string;
  istriKelurahan?: string;
  istriAlamat?: string;
  waliStatus?: 'Wali Nasab' | 'Wali Hakim';
  waliNama?: string;
  waliHubungan?: string;
  saksi1Nama?: string;
  saksi2Nama?: string;
  mahar?: string;
  catatanPemeriksaan?: string;
  syaratList?: SyaratCoverItem[];
}

export const DEFAULT_SYARAT_NIKAH: SyaratCoverItem[] = [
  { kode: 'N1', nama: 'Surat Pengantar Nikah dari Kelurahan / Desa (Model N1)', status: 'Ada', keterangan: '' },
  { kode: 'N2', nama: 'Permohonan Kehendak Nikah (Model N2)', status: 'Ada', keterangan: '' },
  { kode: 'N4', nama: 'Surat Persetujuan Mempelai (Model N4)', status: 'Ada', keterangan: '' },
  { kode: 'N5', nama: 'Surat Izin Orang Tua bagi Catin Usia < 21 Tahun (Model N5)', status: 'Tidak Perlu', keterangan: 'Jika < 21 th' },
  { kode: 'N6/AC', nama: 'Akta Cerai Asli (PA) / Surat Kematian Model N6 (Duda/Janda)', status: 'Tidak Perlu', keterangan: 'Jika pernah nikah' },
  { kode: 'KTP/KK', nama: 'Fotokopi KTP-el & Kartu Keluarga (KK) Suami dan Istri', status: 'Ada', keterangan: '' },
  { kode: 'AKTA', nama: 'Fotokopi Akta Kelahiran & Ijazah Terakhir Catin', status: 'Ada', keterangan: '' },
  { kode: 'FOTO', nama: 'Pas Foto Latar Biru 2x3 (4 lbr) & 4x6 (2 lbr) per Catin', status: 'Ada', keterangan: '' },
  { kode: 'WALI/SAKSI', nama: 'Fotokopi KTP Wali Nikah & 2 (Dua) Orang Saksi Nikah', status: 'Ada', keterangan: '' },
  { kode: 'REKOM', nama: 'Surat Rekomendasi / Numpang Nikah dari KUA Asal', status: 'Tidak Perlu', keterangan: 'Jika luar kecamatan' },
  { kode: 'SEHAT/ELSIMIL', nama: 'Surat Sehat / Imunisasi TT Puskesmas & Sertifikat ELSIMIL', status: 'Ada', keterangan: '' },
  { kode: 'IZIN-TNI', nama: 'Surat Izin Atasan / Komandan (Khusus Anggota TNI / POLRI)', status: 'Tidak Perlu', keterangan: 'Khusus TNI/POLRI' },
  { kode: 'DISPENSASI', nama: 'Dispensasi Pengadilan Agama (<19 th) / Camat (<10 hari kerja)', status: 'Tidak Perlu', keterangan: 'Jika berlaku' },
  { kode: 'TAU-WALI', nama: 'Penetapan Wali Hakim / Taukil Wali / Surat Wali Adhal', status: 'Tidak Perlu', keterangan: 'Jika berlaku' },
  { kode: 'PNBP', nama: 'Bukti Setor PNBP Bank / Kode Billing SIMPONI (Bedol)', status: 'Ada', keterangan: '' },
  { kode: 'BIMWIN', nama: 'Daftar Hadir / Sertifikat Bimbingan Perkawinan (Bimwin)', status: 'Ada', keterangan: '' },
];

function drawCoverFrame(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(15, 81, 50);
  doc.setLineWidth(1.0);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.3);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
}

/**
 * 5. Build Cover / Sampul Berkas Pendaftaran Nikah Resmi KUA (2 Halaman Lengkap)
 */
export function buildCoverPendaftaranPdfDoc(
  settings: KuaSettings,
  nikah: NikahRegistration,
  extra?: CoverExtraData
): jsPDF {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // ================= HALAMAN 1: SAMPUL & IDENTITAS LENGKAP =================
  drawCoverFrame(doc);

  // Kop Instansi di dalam cover
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`KANTOR KEMENTERIAN AGAMA ${(settings.kabupatenKota || '').toUpperCase()}`, pageWidth / 2, 25, {
    align: 'center',
  });
  doc.setFontSize(12.5);
  doc.text((settings.namaKua || 'KANTOR URUSAN AGAMA').toUpperCase(), pageWidth / 2, 31, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.text(
    `${settings.alamatLengkap || '-'} | Telp: ${settings.telepon || '-'} | Email: ${settings.email || '-'}`,
    pageWidth / 2,
    35.5,
    { align: 'center' }
  );

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.7);
  doc.line(18, 38.5, pageWidth - 18, 38.5);
  doc.setLineWidth(0.25);
  doc.line(18, 39.7, pageWidth - 18, 39.7);

  // Title Banner Box
  doc.setFillColor(15, 81, 50);
  doc.roundedRect(18, 43, pageWidth - 36, 15, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SAMPUL BERKAS PENDAFTARAN & PEMERIKSAAN NIKAH', pageWidth / 2, 49.5, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `WILAYAH KERJA KECAMATAN ${(settings.kecamatan || '-').toUpperCase()} · KODE KUA: ${settings.kodeKua || '-'}`,
    pageWidth / 2,
    54.8,
    { align: 'center' }
  );

  doc.setTextColor(15, 23, 42);

  // Registration & SIMKAH Identity Box
  const tglDaftar = nikah.createdAt ? nikah.createdAt.slice(0, 10) : '-';
  autoTable(doc, {
    startY: 62,
    margin: { left: 18, right: 18 },
    theme: 'grid',
    styles: { fontSize: 8.2, cellPadding: 2.3 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [['NO. REGISTER', 'NO. REFERENSI SIMKAH', 'TGL DAFTAR', 'STATUS BERKAS', 'TARIF / PNBP']],
    body: [
      [
        nikah.noPendaftaran,
        nikah.noSimkah || 'Daftar Langsung',
        tglDaftar,
        nikah.status.toUpperCase(),
        nikah.biayaNikah === 0
          ? 'Rp 0 (Di KUA)'
          : `Rp ${nikah.biayaNikah.toLocaleString('id-ID')}${nikah.kodeBillingPnbp ? `\nBilling: ${nikah.kodeBillingPnbp}` : ''}`,
      ],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center' },
      1: { fontStyle: 'bold', halign: 'center' },
      2: { halign: 'center' },
      3: { fontStyle: 'bold', halign: 'center' },
      4: { fontStyle: 'bold', halign: 'center' },
    },
  });

  let y = (doc as any).lastAutoTable.finalY + 6;

  // Section I: Identitas Calon Suami & Calon Istri Lengkap
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('I. IDENTITAS CALON MEMPELAI PRIA & WANITA', 18, y);

  const suamiAlamat = extra?.suamiAlamat || nikah.suami.alamat || '-';
  const istriAlamat = extra?.istriAlamat || nikah.istri.alamat || '-';
  const suamiNik = extra?.suamiNik || nikah.suami.nik || '-';
  const istriNik = extra?.istriNik || nikah.istri.nik || '-';
  const suamiKel = extra?.suamiKelurahan || nikah.suami.kelurahan || '-';
  const istriKel = extra?.istriKelurahan || nikah.istri.kelurahan || '-';

  autoTable(doc, {
    startY: y + 2.5,
    margin: { left: 18, right: 18 },
    theme: 'grid',
    styles: { fontSize: 8.2, cellPadding: 2.2 },
    headStyles: { fillColor: [15, 81, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.2 },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 68 },
      2: { cellWidth: 68 },
    },
    head: [['Keterangan', 'Calon Mempelai Pria (Suami)', 'Calon Mempelai Wanita (Istri)']],
    body: [
      ['Nama Lengkap', nikah.suami.nama, nikah.istri.nama],
      ['NIK / No. KTP', suamiNik, istriNik],
      ['Tempat, Tgl Lahir', extra?.suamiTtl || '-', extra?.istriTtl || '-'],
      ['Status Perkawinan', extra?.suamiStatus || 'Jejaka / Belum Kawin', extra?.istriStatus || 'Perawan / Belum Kawin'],
      ['Pekerjaan', extra?.suamiPekerjaan || '-', extra?.istriPekerjaan || '-'],
      ['No. Telepon / WA', nikah.suami.noHp || '-', nikah.istri.noHp || '-'],
      ['Kelurahan Domisili', suamiKel, istriKel],
      ['Alamat Lengkap', suamiAlamat, istriAlamat],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Section II: Wali, Saksi, Mahar & Pelaksanaan Akad
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('II. WALI NIKAH, SAKSI, MAHAR & JADWAL AKAD NIKAH', 18, y);

  const waliNama = extra?.waliNama || nikah.wali?.nama || '-';
  const waliStatus = extra?.waliStatus || nikah.wali?.statusWali || 'Wali Nasab';
  const waliHub = extra?.waliHubungan || nikah.wali?.hubungan || '-';
  const saksi1 = extra?.saksi1Nama || nikah.saksi?.saksi1Nama || '-';
  const saksi2 = extra?.saksi2Nama || nikah.saksi?.saksi2Nama || '-';
  const mahar = extra?.mahar || nikah.saksi?.mahar || '-';

  autoTable(doc, {
    startY: y + 2.5,
    margin: { left: 18, right: 18 },
    theme: 'grid',
    styles: { fontSize: 8.2, cellPadding: 2.2 },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold', fillColor: [248, 250, 252] },
      1: { cellWidth: 126 },
    },
    body: [
      ['Wali Nikah & Status', `${waliNama} (${waliStatus}${waliHub !== '-' ? ` — ${waliHub}` : ''})`],
      ['Saksi Nikah 1 & 2', `Saksi 1: ${saksi1}   |   Saksi 2: ${saksi2}`],
      ['Mas Kawin / Mahar', mahar],
      ['Hari, Tanggal & Jam Akad', `${nikah.tanggalAkad} · Pukul ${nikah.jamAkad} WIB`],
      [
        'Tempat & Kelurahan Akad',
        `${nikah.lokasiAkad} — ${nikah.alamatAkad}${nikah.kelurahanAkad ? ` (Kel. ${nikah.kelurahanAkad})` : ''}`,
      ],
      ['Penghulu / PPN Bertugas', nikah.penghuluNama],
      [
        'No. Akta & Perforasi Buku',
        `Akta: ${nikah.noAktaNikah || '..............................'}  |  Seri Buku: ${nikah.noBukuNikah || '..............................'}`,
      ],
      ['Catatan Pendaftaran', extra?.catatanPemeriksaan || nikah.catatan || '-'],
    ],
  });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Halaman 1/2 — Sampul Identitas & Jadwal Akad (Lihat Halaman 2 untuk Checklist Syarat Pendaftaran)', pageWidth / 2, 282, {
    align: 'center',
  });

  // ================= HALAMAN 2: CHECKLIST LENGKAP SYARAT PENDAFTARAN =================
  doc.addPage();
  drawCoverFrame(doc);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CHECKLIST KELENGKAPAN PERSYARATAN PENDAFTARAN NIKAH', pageWidth / 2, 21, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Sesuai PMA No. 20 Tahun 2019 · No. Register: ${nikah.noPendaftaran} · Catin: ${nikah.suami.nama} & ${nikah.istri.nama}`,
    pageWidth / 2,
    26,
    { align: 'center' }
  );

  doc.setDrawColor(15, 81, 50);
  doc.setLineWidth(0.5);
  doc.line(18, 29, pageWidth - 18, 29);

  const syaratItems = extra?.syaratList && extra.syaratList.length > 0 ? extra.syaratList : DEFAULT_SYARAT_NIKAH;

  autoTable(doc, {
    startY: 33,
    margin: { left: 18, right: 18 },
    theme: 'grid',
    headStyles: { fillColor: [15, 81, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.9, cellPadding: 2.1 },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
      2: { cellWidth: 85 },
      3: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 34 },
    },
    head: [['No', 'Kode', 'Nama Dokumen / Syarat Pendaftaran Nikah', 'Status', 'Keterangan']],
    body: syaratItems.map((item, idx) => {
      const statusLabel =
        item.status === 'Ada'
          ? '[ v ] ADA'
          : item.status === 'Kurang'
          ? '[ ! ] KURANG'
          : '[ - ] TDK PERLU';
      const ket =
        item.kode === 'PNBP' && !item.keterangan
          ? nikah.kodeBillingPnbp
            ? `Billing: ${nikah.kodeBillingPnbp}`
            : nikah.biayaNikah === 0
            ? 'Gratis di KUA'
            : 'Wajib Setor Bank'
          : item.keterangan || '';
      return [String(idx + 1), item.kode, item.nama, statusLabel, ket];
    }),
  });

  const y2 = (doc as any).lastAutoTable.finalY + 8;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('KESIMPULAN PEMERIKSAAN BERKAS (MODEL NB):', 18, y2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(
    '[   ] Berkas Lengkap & Memenuhi Syarat (Lanjut Pengumuman N5 / Akad)     [   ] Masih Ada Kekurangan Berkas',
    18,
    y2 + 5
  );

  const ySig = y2 + 15;
  doc.setFontSize(8.5);
  doc.text('Petugas Pemeriksa Berkas,', 22, ySig);
  doc.text(`${settings.kecamatan || 'Candisari'}, ${tglDaftar !== '-' ? tglDaftar : nikah.tanggalAkad}`, pageWidth - 78, ySig);
  doc.text('Kepala KUA / Penghulu,', pageWidth - 78, ySig + 4.5);

  doc.text('( ........................................... )', 22, ySig + 22);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.kepalaKuaNama || nikah.penghuluNama, pageWidth - 78, ySig + 21);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${settings.kepalaKuaNip || '-'}`, pageWidth - 78, ySig + 25.5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Halaman 2/2 — Checklist Persyaratan Pendaftaran · ${settings.namaKua || 'KUA'}`, pageWidth / 2, 282, {
    align: 'center',
  });

  return doc;
}

export function getCoverPendaftaranPdfBlobUrl(
  settings: KuaSettings,
  nikah: NikahRegistration,
  extra?: CoverExtraData
): string {
  const doc = buildCoverPendaftaranPdfDoc(settings, nikah, extra);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

export function generateCoverPendaftaranPdf(
  settings: KuaSettings,
  nikah: NikahRegistration,
  extra?: CoverExtraData
) {
  const doc = buildCoverPendaftaranPdfDoc(settings, nikah, extra);
  doc.save(`Cover_Pendaftaran_${nikah.suami.nama.replace(/\s+/g, '_')}_${nikah.istri.nama.replace(/\s+/g, '_')}.pdf`);
}

