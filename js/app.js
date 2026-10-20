/* app.js — TiketServis: logika loket karcis.
 * type=module. Import data.js + motion.js.
 * render: #tumpukan dari <template id="tpl-karcis">; drag/flick; detail;
 * cari+saring; dompet (localStorage 'tiketservis.v1'); deep-link; WA; JSON;
 * easter egg "ngebut". Data DOM ditulis via textContent/DOM API — tanpa innerHTML.
 */

import { KARCIS, EASTER_EGG, fmtRp } from './data.js';
import { Motion } from './motion.js';

/* ---------- util DOM aman (tanpa innerHTML untuk data) ---------- */
function el(tag, cls, teks) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (teks !== undefined) n.textContent = teks;
  return n;
}
function esc(str) { return String(str == null ? '' : str); }
// Slug URL-aman untuk nama item (dipakai di slugItem dompet + param ?dompet=).
function slugify(s) {
  const t = String(s == null ? '' : s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return t || 'item';
}

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

/* ---------- state ---------- */
const state = {
  semua: KARCIS.slice(),
  easterTerbuka: false,
  idxAktif: 0,
  filterCari: '',
  filterKategori: 'semua',
  dompet: [],
  sedangDrag: false,
  geserX: 0,
  velX: 0,
};

/* ---------- toast ---------- */
function toast(pesan, gagal) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = esc(pesan);
  t.classList.toggle('gagal', !!gagal);
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.textContent = ''; t.classList.remove('gagal'); }, 2800);
}

/* ---------- dompet: load/save validasi ---------- */
const DOMPET_KEY = 'tiketservis.v1';
function itemValid(slug) {
  return typeof slug === 'string' && /^[a-z0-9-]{1,40}:[a-z0-9-]{1,40}$/.test(slug) &&
    semuaItem().some((it) => it.slugItem === slug);
}
function semuaItem() {
  const out = [];
  state.semua.forEach((k) => {
    (k.items || []).forEach((it) => {
      out.push({ ...it, kategori: k.nama, slug: k.slug, slugItem: k.slug + ':' + slugify(it.nama) });
    });
  });
  return out;
}
function muatDompet() {
  try {
    const mentah = localStorage.getItem(DOMPET_KEY);
    if (!mentah) return [];
    const obj = JSON.parse(mentah);
    if (!obj || obj.v !== 1 || !Array.isArray(obj.items)) return [];
    return obj.items.filter((s) => typeof s === 'string').filter(itemValid);
  } catch { return []; }
}
function simpanDompet() {
  try {
    localStorage.setItem(DOMPET_KEY, JSON.stringify({ v: 1, items: state.dompet }));
  } catch { /* penyimpanan penuh/ditolak — abaikan diam */ }
}
function tambahDompet(slugItem) {
  if (!itemValid(slugItem)) { toast('Nomor serinya ngaco, Bos — cek lagi.', true); return; }
  if (!state.dompet.includes(slugItem)) {
    state.dompet.push(slugItem);
    simpanDompet();
    renderDompet();
    toast('Karcis masuk dompet.');
  } else {
    toast('Item ini udah ada di dompet, Bos.');
  }
}

/* ---------- format waktu ---------- */
function fmtWaktu(menit) {
  const m = Math.round(Number(menit) || 0);
  const j = Math.floor(m / 60), s = m % 60;
  if (j <= 0) return '±' + s + ' mnt';
  return '±' + j + ' jam ' + s + ' mnt';
}

/* ---------- render tumpukan karcis ---------- */
function hargaTermurah(k) {
  return Math.min(...(k.items || []).map((it) => Number(it.harga) || 0));
}

function bangunKarcis(k, idx) {
  const tpl = document.getElementById('tpl-karcis');
  let node;
  if (tpl && tpl.content) {
    node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.slug = esc(k.slug);
    node.dataset.idx = String(idx);
    const stub = node.querySelector('.karcis-stub');
    const seri = node.querySelector('.nomor-seri');
    const h3 = node.querySelector('h3');
    const rincian = node.querySelector('ul.rincian');
    const harga = node.querySelector('.harga [data-scramble], .harga');
    const ambil = node.querySelector('button.ambil');
    if (stub) stub.textContent = '';
    if (seri) seri.textContent = esc(k.nomorSeri);
    if (h3) h3.textContent = esc(k.nama);
    if (rincian) {
      rincian.replaceChildren();
      (k.items || []).slice(0, 3).forEach((it) => {
        const li = el('li');
        li.appendChild(el('span', 'rincian-nama', esc(it.nama)));
        li.appendChild(el('span', 'rincian-harga', fmtRp(it.harga)));
        rincian.appendChild(li);
      });
    }
    if (harga) {
      const teks = 'mulai ' + fmtRp(hargaTermurah(k));
      harga.textContent = teks;
      harga.setAttribute('data-nilai', teks);
    }
    if (ambil) {
      ambil.dataset.slug = esc(k.slug);
      ambil.addEventListener('click', (ev) => {
        ev.stopPropagation();
        bukaDetail(k);
      });
    }
  } else {
    // fallback: bangun DOM penuh tanpa template
    node = el('article', 'karcis');
    node.dataset.slug = esc(k.slug);
    node.dataset.idx = String(idx);
    node.appendChild(el('div', 'karcis-stub'));
    const badan = el('div', 'karcis-badan');
    badan.appendChild(el('span', 'nomor-seri', esc(k.nomorSeri)));
    badan.appendChild(el('h3', null, esc(k.nama)));
    const ul = el('ul', 'rincian');
    (k.items || []).slice(0, 3).forEach((it) => {
      const li = el('li');
      li.appendChild(el('span', 'rincian-nama', esc(it.nama)));
      li.appendChild(el('span', 'rincian-harga', fmtRp(it.harga)));
      ul.appendChild(li);
    });
    badan.appendChild(ul);
    const hargaDiv = el('div', 'harga');
    const teks = 'mulai ' + fmtRp(hargaTermurah(k));
    const scr = el('span', null, teks);
    scr.setAttribute('data-scramble', '');
    scr.setAttribute('data-nilai', teks);
    hargaDiv.appendChild(scr);
    badan.appendChild(hargaDiv);
    const btn = el('button', 'ambil magnetic', 'Ambil karcis');
    btn.dataset.slug = esc(k.slug);
    btn.type = 'button';
    btn.addEventListener('click', (ev) => { ev.stopPropagation(); bukaDetail(k); });
    badan.appendChild(btn);
    node.appendChild(badan);
  }
  node.setAttribute('role', 'group');
  node.setAttribute('aria-label', 'Karcis ' + k.nama);
  return node;
}

function renderTumpukan() {
  const wadah = $('#tumpukan');
  if (!wadah) return;
  wadah.replaceChildren();
  state.semua.forEach((k, i) => {
    const node = bangunKarcis(k, i);
    node.classList.toggle('aktif', i === state.idxAktif);
    wadah.appendChild(node);
  });
  umumkanKarcis();
}

function karcisTerfilter() {
  const q = state.filterCari.trim().toLowerCase();
  return state.semua.filter((k) => {
    const cocokKat = state.filterKategori === 'semua' || k.slug === state.filterKategori;
    const cocokCari = !q || (k.items || []).some((it) =>
      String(it.nama).toLowerCase().includes(q));
    return cocokKat && cocokCari;
  });
}

function umumkanKarcis() {
  const live = $('#karcis-live');
  const k = state.semua[state.idxAktif];
  if (live && k) live.textContent = 'Karcis aktif: ' + k.nama + ' (' + (state.idxAktif + 1) + ' dari ' + state.semua.length + ')';
}

/* ---------- navigasi karcis ---------- */
function keKarcis(idx, umumkan) {
  const n = state.semua.length;
  if (!n) return;
  state.idxAktif = ((idx % n) + n) % n;
  $$('#tumpukan .karcis').forEach((node, i) => {
    node.classList.toggle('aktif', i === state.idxAktif);
  });
  const k = state.semua[state.idxAktif];
  // scramble harga karcis aktif
  const nodeAktif = $('#tumpukan .karcis.aktif');
  const scr = nodeAktif && nodeAktif.querySelector('[data-scramble]');
  if (scr) Motion.scramble(scr, scr.getAttribute('data-nilai') || scr.textContent);
  if (umumkan !== false) umumkanKarcis();
}

/* ---------- drag/flick (pointer events + inertia manual) ---------- */
function pasangDrag() {
  const panggung = $('#panggung');
  const wadah = $('#tumpukan');
  if (!panggung || !wadah) return;
  let mulaiX = 0, mulaiY = 0, terakhirX = 0, terakhirT = 0, xSaatIni = 0;
  let digerakkan = false, pointerId = null;

  panggung.addEventListener('pointerdown', (ev) => {
    pointerId = ev.pointerId;
    mulaiX = terakhirX = ev.clientX;
    mulaiY = ev.clientY;
    terakhirT = performance.now();
    xSaatIni = state.geserX;
    digerakkan = false;
    state.sedangDrag = true;
    try { panggung.setPointerCapture(pointerId); } catch { /* abaikan */ }
  });

  panggung.addEventListener('pointermove', (ev) => {
    if (!state.sedangDrag || ev.pointerId !== pointerId) return;
    const dx = ev.clientX - mulaiX;
    const dy = ev.clientY - mulaiY;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) digerakkan = true;
    if (!digerakkan) return;
    const t = performance.now();
    const dt = Math.max(t - terakhirT, 1);
    state.velX = (ev.clientX - terakhirX) / dt;
    terakhirX = ev.clientX;
    terakhirT = t;
    state.geserX = xSaatIni + dx;
  });

  const selesai = (ev) => {
    if (!state.sedangDrag || (ev && ev.pointerId !== pointerId)) return;
    state.sedangDrag = false;
    if (digerakkan) {
      const v = state.velX; // px/ms
      const dx = state.geserX - xSaatIni;
      const AMBANG_FLICK = 0.45;
      const AMBANG_GESER = 70;
      if (v < -AMBANG_FLICK || dx < -AMBANG_GESER) keKarcis(state.idxAktif + 1);
      else if (v > AMBANG_FLICK || dx > AMBANG_GESER) keKarcis(state.idxAktif - 1);
      else keKarcis(state.idxAktif);
      state.geserX = 0;
      state.velX = 0;
      // inertia visual sederhana via transform lalu reset
    } else {
      // klik (bukan drag) → buka detail karcis aktif
      const k = state.semua[state.idxAktif];
      if (k) bukaDetail(k);
    }
  };
  panggung.addEventListener('pointerup', selesai);
  panggung.addEventListener('pointercancel', selesai);

  // keyboard
  addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight') { keKarcis(state.idxAktif + 1); ev.preventDefault(); }
    else if (ev.key === 'ArrowLeft') { keKarcis(state.idxAktif - 1); ev.preventDefault(); }
  });
  const prev = $('#karcis-prev'), next = $('#karcis-next');
  if (prev) prev.addEventListener('click', () => keKarcis(state.idxAktif - 1));
  if (next) next.addEventListener('click', () => keKarcis(state.idxAktif + 1));
}

/* ---------- detail ---------- */
let detailTerbuka = false;
function bukaDetail(k) {
  const isi = $('#detail-isi');
  const dlg = $('#detail');
  if (!isi || !dlg) return;
  isi.replaceChildren();
  isi.appendChild(el('span', 'nomor-seri', esc(k.nomorSeri)));
  isi.appendChild(el('h2', null, esc(k.nama)));
  const ul = el('ul', 'rincian-penuh');
  (k.items || []).forEach((it) => {
    const li = el('li');
    const info = el('div', 'item-info');
    info.appendChild(el('span', 'item-nama', esc(it.nama)));
    info.appendChild(el('span', 'item-meta',
      fmtRp(it.harga) + ' · ' + fmtWaktu(it.waktu) + ' · ' + esc(it.ket)));
    li.appendChild(info);
    const btn = el('button', 'ambil-kecil', 'Ambil');
    btn.type = 'button';
    btn.dataset.slugItem = esc(k.slug + ':' + slugify(it.nama));
    btn.addEventListener('click', () => tambahDompet(btn.dataset.slugItem));
    li.appendChild(btn);
    ul.appendChild(li);
  });
  isi.appendChild(ul);
  if ('showModal' in dlg) dlg.showModal();
  else { dlg.setAttribute('open', ''); dlg.classList.add('terbuka'); }
  // WAJIB: lepas [hidden] — styles.css memaksa [hidden]{display:none!important}
  // (spesifisitas + !important mengalahkan #detail{display:flex}).
  dlg.removeAttribute('hidden');
  detailTerbuka = true;
  Motion.bukaDetail();
  perbaruiURL();
}
function tutupDetail() {
  if (!detailTerbuka) return;
  const dlg = $('#detail');
  Motion.tutupDetail();
  setTimeout(() => {
    if (dlg) {
      if ('close' in dlg) { try { dlg.close(); } catch { /* abaikan */ } }
      dlg.removeAttribute('open');
      dlg.classList.remove('terbuka');
      dlg.setAttribute('hidden', ''); // kembalikan agar [hidden] menyembunyikan lagi
    }
  }, 260);
  detailTerbuka = false;
  perbaruiURL();
}

/* ---------- cari + saring ---------- */
function pasangCariSaring() {
  const cari = $('#cari');
  if (cari) {
    cari.maxLength = 60;
    let t = null;
    cari.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        state.filterCari = cari.value.slice(0, 60);
        terapkanFilter();
      }, 150);
    });
  }
  const saring = $('#saring');
  if (saring) {
    saring.replaceChildren();
    const semua = el('button', 'chip aktif', 'Semua');
    semua.type = 'button';
    semua.dataset.kat = 'semua';
    saring.appendChild(semua);
    KARCIS.forEach((k) => {
      const c = el('button', 'chip', esc(k.nama));
      c.type = 'button';
      c.dataset.kat = esc(k.slug);
      saring.appendChild(c);
    });
    saring.addEventListener('click', (ev) => {
      const b = ev.target.closest('button.chip');
      if (!b) return;
      $$('button.chip', saring).forEach((x) => x.classList.remove('aktif'));
      b.classList.add('aktif');
      state.filterKategori = b.dataset.kat;
      terapkanFilter();
    });
  }
}

function terapkanFilter() {
  const hasil = karcisTerfilter();
  const wadah = $('#tumpukan');
  if (!wadah) return;
  wadah.replaceChildren();
  if (!hasil.length) {
    const kosong = el('div', 'kosong', 'Wah, jasa itu belum ada di loket ini. Coba kata lain, Bos.');
    kosong.setAttribute('role', 'status');
    wadah.appendChild(kosong);
    return;
  }
  hasil.forEach((k, i) => {
    const node = bangunKarcis(k, state.semua.indexOf(k));
    node.classList.toggle('aktif', i === 0);
    wadah.appendChild(node);
  });
  state.idxAktif = state.semua.indexOf(hasil[0]);
  umumkanKarcis();
}

/* ---------- render dompet ---------- */
function renderDompet() {
  const list = $('#dompet-list');
  const totalHarga = $('#total-harga');
  const totalWaktu = $('#total-waktu');
  if (!list) return;
  list.replaceChildren();
  const items = state.dompet
    .map((s) => semuaItem().find((it) => it.slugItem === s))
    .filter(Boolean);
  if (!items.length) {
    const p = el('p', 'dompet-kosong-pesan', 'Dompetnya masih kosong — seret karcis dulu, Bos.');
    list.appendChild(p);
  } else {
    items.forEach((it) => {
      const li = el('li', 'dompet-item');
      li.appendChild(el('span', 'dompet-nama', esc(it.nama)));
      li.appendChild(el('span', 'dompet-harga', fmtRp(it.harga)));
      const hapus = el('button', 'dompet-hapus', 'Hapus');
      hapus.type = 'button';
      hapus.setAttribute('aria-label', 'Hapus ' + it.nama + ' dari dompet');
      hapus.addEventListener('click', () => {
        state.dompet = state.dompet.filter((s) => s !== it.slugItem);
        simpanDompet();
        renderDompet();
      });
      li.appendChild(hapus);
      list.appendChild(li);
    });
  }
  const total = items.reduce((a, it) => a + (Number(it.harga) || 0), 0);
  const menit = items.reduce((a, it) => a + (Number(it.waktu) || 0), 0);
  if (totalHarga) {
    const teks = fmtRp(total);
    Motion.scramble(totalHarga, teks);
    totalHarga.setAttribute('data-nilai', teks);
  }
  if (totalWaktu) totalWaktu.textContent = items.length ? fmtWaktu(menit) : '—';
}

/* kosongkan dompet: konfirmasi inline 2 langkah */
function pasangKosongkan() {
  const btn = $('#dompet-kosongkan');
  if (!btn) return;
  let uzur = false;
  btn.addEventListener('click', () => {
    if (!state.dompet.length) { toast('Dompetnya emang udah kosong, Bos.'); return; }
    if (!uzur) {
      uzur = true;
      btn.textContent = 'Yakin? Klik lagi buat kosongkan';
      btn.dataset.uzur = '1';
      setTimeout(() => {
        uzur = false;
        btn.textContent = 'Kosongkan dompet';
        delete btn.dataset.uzur;
      }, 4000);
      return;
    }
    state.dompet = [];
    simpanDompet();
    renderDompet();
    uzur = false;
    btn.textContent = 'Kosongkan dompet';
    delete btn.dataset.uzur;
    toast('Dompet dikosongkan, Bos.');
  });
}

/* ---------- salin WA / unduh JSON ---------- */
function teksWA() {
  const items = state.dompet
    .map((s) => semuaItem().find((it) => it.slugItem === s))
    .filter(Boolean);
  const baris = items.map((it) => '- ' + it.nama + ' (' + fmtRp(it.harga) + ')').join('\n');
  const total = items.reduce((a, it) => a + (Number(it.harga) || 0), 0);
  return 'Halo, saya mau servis:\n' + baris + '\nEstimasi total: ' + fmtRp(total) +
    '\n(harga contoh/estimasi komunitas — konfirmasi ulang di bengkel ya, Bos)';
}

function salinClipboard(teks, ok) {
  const selesai = (berhasil) => {
    if (berhasil) { ok(); }
    else toast('Gagal nyalin, Bos — salin manual aja.', true);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(teks).then(() => selesai(true), () => fallbackSalin(teks, selesai));
  } else {
    fallbackSalin(teks, selesai);
  }
}
function fallbackSalin(teks, cb) {
  try {
    const ta = document.createElement('textarea');
    ta.value = teks;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    cb(!!ok);
  } catch { cb(false); }
}

function pasangAksi() {
  const wa = $('#salin-wa');
  if (wa) wa.addEventListener('click', () => {
    if (!state.dompet.length) { toast('Dompetnya masih kosong — ambil karcis dulu, Bos.', true); return; }
    salinClipboard(teksWA(), () => toast('Ringkasan tersalin — tinggal tempel ke WA, Bos.'));
  });
  const json = $('#unduh-json');
  if (json) json.addEventListener('click', () => {
    try {
      const items = state.dompet
        .map((s) => semuaItem().find((it) => it.slugItem === s))
        .filter(Boolean);
      const blob = new Blob([JSON.stringify({ v: 1, items }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'tiketservis-dompet.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast('File dompet terunduh, Bos.');
    } catch { toast('Gagal bikin file, Bos.', true); }
  });
}

/* ---------- deep-link ---------- */
function bacaURL() {
  let p;
  try { p = new URLSearchParams(location.search); } catch { return; }
  const kSlug = p.get('karcis');
  if (typeof kSlug === 'string' && /^[a-z0-9-]{1,40}$/.test(kSlug)) {
    const k = KARCIS.find((x) => x.slug === kSlug) ||
      (kSlug === EASTER_EGG.slug ? EASTER_EGG : null);
    if (k) { if (k === EASTER_EGG) bukaEaster(); setTimeout(() => bukaDetail(k), 400); }
  }
  const d = p.get('dompet');
  if (typeof d === 'string') {
    const slugs = d.split(',').map((s) => s.trim()).filter(itemValid);
    if (slugs.length) {
      state.dompet = [...new Set(slugs)];
      simpanDompet();
      renderDompet();
    }
  }
}
function perbaruiURL() {
  try {
    const p = new URLSearchParams(location.search);
    if (detailTerbuka) {
      // jangan destruktif: pertahankan param lain
    } else {
      // bersihkan hanya param karcis milik kita
      if (p.has('karcis')) { p.delete('karcis'); }
    }
    if (state.dompet.length) p.set('dompet', state.dompet.join(','));
    else p.delete('dompet');
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  } catch { /* abaikan */ }
}

/* ---------- easter egg "ngebut" ---------- */
function bukaEaster() {
  if (state.easterTerbuka) return;
  state.easterTerbuka = true;
  state.semua = KARCIS.concat([EASTER_EGG]);
  renderTumpukan();
  // tambah chip kategori
  const saring = $('#saring');
  if (saring) {
    const c = el('button', 'chip', esc(EASTER_EGG.nama));
    c.type = 'button';
    c.dataset.kat = esc(EASTER_EGG.slug);
    saring.appendChild(c);
  }
  toast('Karcis rahasia kebuka, Bos!');
}
function pasangEaster() {
  let buf = '';
  addEventListener('keydown', (ev) => {
    if (ev.key && ev.key.length === 1) {
      buf = (buf + ev.key.toLowerCase()).slice(-6);
      if (buf === 'ngebut') { bukaEaster(); buf = ''; }
    }
  });
}

/* ---------- tutup detail: Esc / backdrop ---------- */
function pasangTutupDetail() {
  addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && detailTerbuka) tutupDetail();
  });
  const dlg = $('#detail');
  if (dlg) {
    dlg.addEventListener('click', (ev) => {
      if (ev.target === dlg) tutupDetail();
    });
    const tombol = dlg.querySelector('[data-tutup]');
    if (tombol) tombol.addEventListener('click', tutupDetail);
  }
}

/* ---------- gerak toggle ---------- */
function pasangGerakToggle() {
  const t = $('#gerak-toggle');
  if (!t) return;
  try {
    const mati = localStorage.getItem('tiketservis.gerak') === 'mati';
    t.setAttribute('aria-pressed', String(!mati));
  } catch { /* abaikan */ }
  t.addEventListener('click', () => Motion.toggleGerak());
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Mode ringan deterministik sejak awal (tanpa tunggu GSAP malas):
  // perangkat kentang langsung dapat 1 band marquee via CSS .ringan.
  try {
    const nav = navigator;
    if ((nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
        (nav.deviceMemory && nav.deviceMemory <= 4) ||
        (nav.connection && nav.connection.saveData)) {
      document.documentElement.classList.add('ringan');
    }
  } catch { /* abaikan */ }
  state.dompet = muatDompet();
  Motion.init();
  renderTumpukan();
  renderDompet();
  pasangDrag();
  pasangCariSaring();
  pasangKosongkan();
  pasangAksi();
  pasangTutupDetail();
  pasangEaster();
  pasangGerakToggle();
  bacaURL();
});
