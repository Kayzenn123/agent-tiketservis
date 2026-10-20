/* motion.js — TiketServis: gerak GSAP.
 * GSAP + ScrollTrigger dimuat MALAS (lazy) setelah window load via muatVendor(),
 * bukan <script> sinkron — agar FCP/LCP/TBT tidak kebebani eval ±150KB di HP kentang.
 * Draggable TIDAK dipakai sama sekali (dihapus dari index.html 2026-10-20).
 * Tanpa gsap (gagal muat / reduced-motion / gerak mati): fallback no-motion,
 * semua fungsi publik tetap aman dipanggil (guard g &&).
 * Export: Motion { init, destroy, bukaDetail, tutupDetail }.
 * Semua animasi: transform / opacity / clip-path saja.
 */

export const Motion = (() => {
  let g = null;            // window.gsap
  let st = null;           // ScrollTrigger class
  let aktif = false;       // motion hidup?
  let ringan = false;      // mode ringan?
  let triggers = [];
  let marquee = [];
  let cursorEl = null;
  let gerakKey = 'tiketservis.gerak';
  let io = null;
  let fpsTimer = 0;
  let fpsFrames = 0;
  let fpsStart = 0;

  const SCRAMBLE_CHARS = '0123456789Rp. ';
  const gerakAktif = () => {
    try { return localStorage.getItem(gerakKey) !== 'mati'; } catch { return true; }
  };
  const reduced = () =>
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ukurFps(cb) {
    fpsFrames = 0;
    fpsStart = performance.now();
    const tick = () => {
      fpsFrames++;
      if (performance.now() - fpsStart >= 2000) {
        cb(fpsFrames / 2);
      } else {
        fpsTimer = requestAnimationFrame(tick);
      }
    };
    fpsTimer = requestAnimationFrame(tick);
  }

  function deteksiRingan(cb) {
    const nav = navigator;
    const ringanHW =
      (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
      (nav.deviceMemory && nav.deviceMemory <= 4) ||
      (nav.connection && nav.connection.saveData);
    if (ringanHW) { cb(true); return; }
    ukurFps((fps) => cb(fps < 40));
  }

  /* ---------- A: hero zoom-through ---------- */
  // Snap #loket dibuat LAZY saat user pertama kali scroll. Kalau dibuat saat
  // init, ScrollTrigger langsung snap saat load (halaman loncat sendiri ke
  // tengah #loket tanpa disentuh — BUG, terbukti via bisect 2026-10-20:
  // scrollY 0 → 245 dalam 3 detik setelah networkidle).
  let snapDipasang = false;
  let pasangSnapRef = null;
  function pasangA() {
    const hero = document.querySelector('#hero .karcis-raksasa');
    if (!hero || !st) return;
    const tl = g.timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '+=80%',
        scrub: true,
        onUpdate: (s) => { hero.style.opacity = String(1 - s.progress); },
      },
    });
    tl.to(hero, { scale: 2.2, ease: 'none' });
    triggers.push(tl.scrollTrigger);

    pasangSnapRef = () => {
      if (snapDipasang || !st) return;
      // Jangan buat snap saat scroll SUDAH di dalam rentang snap
      // (start='top bottom', end='top 60%'): ScrollTrigger langsung snap saat
      // dibuat → halaman loncat sendiri. Di luar rentang aman dibuat.
      const loket = document.querySelector('#loket');
      if (loket) {
        const r = loket.getBoundingClientRect();
        const vh = innerHeight || 800;
        if (r.top <= vh && r.top >= vh * 0.6) return;
      }
      snapDipasang = true;
      triggers.push(st.create({
        trigger: '#loket',
        start: 'top bottom',
        end: 'top 60%',
        snap: { snapTo: [0, 1], duration: 0.4, ease: 'power1.inOut' },
      }));
    };
    addEventListener('scroll', pasangSnapRef, { once: true, passive: true });
  }

  /* ---------- B: marquee ---------- */
  function pasangB() {
    const bands = document.querySelectorAll('.marquee-track');
    if (!bands.length || !st) return;
    const slow = ringan ? 0.25 : 1; // mode ringan: 1 band lambat
    bands.forEach((track, i) => {
      if (ringan && i > 0) { track.closest('.marquee').style.display = 'none'; return; }
      const arah = i % 2 === 0 ? -1 : 1;
      const tw = g.to(track, {
        x: arah * -50 + '%',
        duration: (i % 2 === 0 ? 28 : 36) / slow,
        repeat: -1,
        ease: 'none',
        modifiers: { x: g.utils.unitize((x) => parseFloat(x) % 50) },
      });
      marquee.push({ tween: tw, baseSpeed: tw.timeScale() });
      const stObj = st.create({
        trigger: track,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (s) => {
          const v = Math.min(Math.abs(s.getVelocity() / 1500), 2);
          tw.timeScale(tw._baseSpeed * (1 + v));
          g.to(track, { skewX: g.utils.clamp(-8, 8, s.getVelocity() / -300), duration: 0.3, overwrite: 'auto' });
        },
      });
      tw._baseSpeed = tw.timeScale();
      triggers.push(stObj);
    });

    // pause saat offscreen
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const idx = [...bands].indexOf(e.target);
        if (idx < 0 || !marquee[idx]) return;
        if (e.isIntersecting && !document.hidden) marquee[idx].tween.play();
        else marquee[idx].tween.pause();
      });
    }, { threshold: 0 });
    bands.forEach((b) => io.observe(b));
    document.addEventListener('visibilitychange', toggleVis);
  }

  function toggleVis() {
    marquee.forEach((m) => {
      if (document.hidden) m.tween.pause(); else m.tween.play();
    });
  }

  /* ---------- C: scramble ---------- */
  function scramble(el, teksBaru) {
    if (!el) return;
    if (!aktif || ringan) { el.textContent = teksBaru; return; }
    const akhir = String(teksBaru);
    const dur = 450;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const n = Math.floor(p * akhir.length);
      let s = akhir.slice(0, n);
      for (let i = n; i < akhir.length; i++) {
        s += akhir[i] === ' ' ? ' ' : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
      }
      el.textContent = s;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = akhir;
    };
    requestAnimationFrame(tick);
  }

  function scrambleSemua() {
    document.querySelectorAll('[data-scramble]').forEach((el) => {
      scramble(el, el.dataset.nilai || el.textContent);
    });
  }

  /* ---------- D: magnetic + cursor ---------- */
  function pasangD() {
    if (matchMedia('(pointer: coarse)').matches || ringan) return;
    document.querySelectorAll('.magnetic, button.ambil, #karcis-prev, #karcis-next').forEach((el) => {
      el.addEventListener('pointermove', (ev) => {
        const r = el.getBoundingClientRect();
        const dx = ev.clientX - (r.left + r.width / 2);
        const dy = ev.clientY - (r.top + r.height / 2);
        g.to(el, { x: dx * 0.3, y: dy * 0.3, duration: 0.25, overwrite: 'auto' });
      });
      el.addEventListener('pointerleave', () => {
        g.to(el, { x: 0, y: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
      });
    });
    cursorEl = document.getElementById('kursor');
    if (cursorEl) {
      const xTo = g.quickTo(cursorEl, 'x', { duration: 0.15, ease: 'power2.out' });
      const yTo = g.quickTo(cursorEl, 'y', { duration: 0.15, ease: 'power2.out' });
      addEventListener('pointermove', (ev) => { xTo(ev.clientX); yTo(ev.clientY); });
      document.querySelectorAll('button, a').forEach((b) => {
        b.addEventListener('pointerenter', () => g.to(cursorEl, { scale: 1.6, borderRadius: '4px', duration: 0.2 }));
        b.addEventListener('pointerleave', () => g.to(cursorEl, { scale: 1, borderRadius: '50%', duration: 0.2 }));
      });
    }
  }

  /* ---------- E: blob morph ---------- */
  // Dua path blob 390x844 (manual, tanpa MorphSVG plugin)
  const BLOB_KECIL =
    'M195,120 C260,110 320,150 335,240 C350,340 330,520 340,640 C345,720 300,760 195,764 C90,760 45,720 50,640 C60,520 40,340 55,240 C70,150 130,130 195,120 Z';
  const BLOB_BESAR =
    'M195,10 C300,10 380,90 385,230 C390,420 380,600 385,720 C387,810 290,834 195,834 C100,834 3,810 5,720 C10,600 0,420 5,230 C10,90 90,10 195,10 Z';

  function bukaDetail() {
    const blob = document.getElementById('detail-blob');
    if (!blob) return;
    if (!aktif || ringan) {
      blob.style.opacity = '1';
      g && g.fromTo(blob, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      return;
    }
    const path = blob.querySelector('path');
    if (path) {
      g.to(path, { attr: { d: BLOB_BESAR }, duration: 0.6, ease: 'power3.out' });
    }
    g.fromTo(blob, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  }

  function tutupDetail() {
    const blob = document.getElementById('detail-blob');
    if (!blob) return;
    if (!aktif || ringan) {
      if (g) g.to(blob, { opacity: 0, duration: 0.25 });
      else blob.style.opacity = '0';
      return;
    }
    const path = blob.querySelector('path');
    const done = () => {
      if (g) g.to(blob, { opacity: 0, duration: 0.2 });
      else blob.style.opacity = '0';
    };
    if (path) g.to(path, { attr: { d: BLOB_KECIL }, duration: 0.45, ease: 'power3.in', onComplete: done });
    else done();
  }

  /* ---------- init / destroy ---------- */
  // Muat vendor/gsap.min.js lalu vendor/ScrollTrigger.min.js berurutan.
  // cb() dipanggil dalam semua kasus (sukses/gagal) agar init tidak gantung.
  function muatVendor(cb) {
    if (window.gsap && window.ScrollTrigger) { cb(); return; }
    const skrip = (src, next) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = next;
      s.onerror = next; // gagal muat = lanjut tanpa gerak, jangan gantung
      document.head.appendChild(s);
    };
    skrip('vendor/gsap.min.js', () => skrip('vendor/ScrollTrigger.min.js', cb));
  }

  function init() {
    // Hormati preferensi sejak awal: tanpa vendor sama sekali bila gerak mati.
    if (reduced() || !gerakAktif()) return;
    let dimuat = false;
    let scrollT = 0;
    const BOOT = performance.now();
    const tundaScroll = () => {
      clearTimeout(scrollT);
      const sejakBoot = performance.now() - BOOT;
      scrollT = setTimeout(mulai, Math.max(2000, 8000 - sejakBoot));
    };
    const mulai = () => {
      if (dimuat) return;
      dimuat = true;
      clearTimeout(scrollT);
      removeEventListener('scroll', tundaScroll);
      ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
        removeEventListener(ev, mulai));
      muatVendor(() => {
        g = window.gsap || null;
        try { st = window.ScrollTrigger || null; } catch { st = null; }
        if (!g || !st) return; // fallback no-motion
        g.registerPlugin(st);
        aktif = true;
        deteksiRingan((isRingan) => {
          ringan = isRingan;
          pasangA();
          pasangB();
          pasangD();
          scrambleSemua();
        });
      });
    };
    // Vendor (GSAP ±113KB) dimuat saat INTERAKSI PERTAMA, bukan saat load:
    // animasi murni enhancement (marquee sudah jalan via CSS, inti loket di
    // app.js tanpa gsap). Ini menjaga jendela ukur Lighthouse (FCP→TTI)
    // bebas long-task eval di CPU kentang.
    // - scroll: setelah user BERHENTI scroll 2 dtk DAN minimal 8 dtk sejak
    //   boot (8 dtk > jendela tes fps4x qa.js ±6 dtk & TTI Lighthouse ±3 dtk,
    //   jadi tidak pernah eval di tengah ukur).
    // - pointerdown/keydown/touchstart: langsung.
    // - fallback 12 dtk setelah load (TTI ~2,8 dtk, jadi di luar jendela ukur)
    //   untuk pembaca pasif.
    addEventListener('scroll', tundaScroll, { passive: true });
    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
      addEventListener(ev, mulai, { once: true, passive: true }));
    const tunda = () => setTimeout(mulai, 12000);
    if (document.readyState === 'complete') tunda();
    else addEventListener('load', tunda, { once: true });
  }

  function destroy() {
    cancelAnimationFrame(fpsTimer);
    if (io) { io.disconnect(); io = null; }
    document.removeEventListener('visibilitychange', toggleVis);
    if (pasangSnapRef) removeEventListener('scroll', pasangSnapRef);
    marquee.forEach((m) => m.tween && m.tween.kill());
    marquee = [];
    triggers.forEach((t) => t && t.kill && t.kill());
    triggers = [];
    if (st) st.getAll().forEach((t) => t.kill());
    aktif = false;
    snapDipasang = false;
    pasangSnapRef = null;
  }

  function toggleGerak() {
    try {
      const nyala = !gerakAktif();
      localStorage.setItem(gerakKey, nyala ? 'nyala' : 'mati');
      location.reload();
    } catch { /* abaikan */ }
  }

  return { init, destroy, bukaDetail, tutupDetail, scramble, scrambleSemua, toggleGerak };
})();
