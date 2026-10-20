/* data.js — TiketServis: katalog karcis bengkel.
 * Harga = contoh/estimasi komunitas, BUKAN harga resmi bengkel mana pun.
 * Format harga: Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits: 0 })
 */

export const fmtRp = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
    .format(Number(n) || 0);

export const KARCIS = [
  {
    slug: 'tune-up',
    nama: 'Tune-Up',
    nomorSeri: 'TS-11-001',
    ikon: 'busi',
    items: [
      { nama: 'Tune-up ringan', harga: 85000, waktu: 60, ket: 'contoh' },
      { nama: 'Tune-up besar', harga: 250000, waktu: 150, ket: 'contoh' },
      { nama: 'Ganti busi', harga: 40000, waktu: 20, ket: 'contoh' },
      { nama: 'Servis injeksi', harga: 120000, waktu: 90, ket: 'contoh' },
    ],
  },
  {
    slug: 'oli-cairan',
    nama: 'Oli & Cairan',
    nomorSeri: 'TS-11-002',
    ikon: 'oli',
    items: [
      { nama: 'Ganti oli mesin', harga: 65000, waktu: 30, ket: 'contoh' },
      { nama: 'Oli gardan', harga: 45000, waktu: 20, ket: 'contoh' },
      { nama: 'Minyak rem', harga: 50000, waktu: 25, ket: 'contoh' },
      { nama: 'Air radiator', harga: 55000, waktu: 25, ket: 'contoh' },
    ],
  },
  {
    slug: 'rem',
    nama: 'Rem',
    nomorSeri: 'TS-11-003',
    ikon: 'kampas-rem',
    items: [
      { nama: 'Kampas rem depan', harga: 95000, waktu: 40, ket: 'contoh' },
      { nama: 'Kampas rem belakang', harga: 85000, waktu: 40, ket: 'contoh' },
      { nama: 'Minyak rem + bleeding', harga: 70000, waktu: 45, ket: 'contoh' },
    ],
  },
  {
    slug: 'ban-kaki',
    nama: 'Ban & Kaki-Kaki',
    nomorSeri: 'TS-11-004',
    ikon: 'ban',
    items: [
      { nama: 'Tambal tubeless', harga: 35000, waktu: 20, ket: 'contoh' },
      { nama: 'Ganti ban depan', harga: 180000, waktu: 50, ket: 'contoh' },
      { nama: 'Spooring', harga: 150000, waktu: 60, ket: 'contoh' },
      { nama: 'Ganti rantai + gear', harga: 210000, waktu: 75, ket: 'contoh' },
    ],
  },
  {
    slug: 'kelistrikan',
    nama: 'Kelistrikan',
    nomorSeri: 'TS-11-005',
    ikon: 'aki',
    items: [
      { nama: 'Ganti aki', harga: 320000, waktu: 30, ket: 'contoh' },
      { nama: 'Servis lampu', harga: 75000, waktu: 45, ket: 'contoh' },
      { nama: 'Klakson', harga: 60000, waktu: 25, ket: 'contoh' },
      { nama: 'Spul', harga: 275000, waktu: 120, ket: 'contoh' },
    ],
  },
  {
    slug: 'bodi-cuci',
    nama: 'Bodi & Cuci',
    nomorSeri: 'TS-11-006',
    ikon: 'cuci',
    items: [
      { nama: 'Cuci steam', harga: 50000, waktu: 40, ket: 'contoh' },
      { nama: 'Wax', harga: 80000, waktu: 60, ket: 'contoh' },
      { nama: 'Repaint panel', harga: 350000, waktu: 480, ket: 'contoh' },
      { nama: 'Ganti spion', harga: 65000, waktu: 20, ket: 'contoh' },
    ],
  },
];

/* Karcis rahasia — easter egg */
export const EASTER_EGG = {
  slug: 'paket-balap',
  nama: 'Paket Balap',
  nomorSeri: 'TS-11-007-X',
  ikon: 'knalpot',
  rahasia: true,
  items: [
    { nama: 'Porting harian', harga: 900000, waktu: 600, ket: 'contoh' },
    { nama: 'Knalpot racing', harga: 750000, waktu: 90, ket: 'contoh' },
    { nama: 'Bore-up', harga: 1200000, waktu: 900, ket: 'contoh' },
  ],
};
