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
