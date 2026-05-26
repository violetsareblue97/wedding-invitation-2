/**
 * COUNTDOWN TIMER
 * Target: 14 Februari 2026 10:00 WIB (UTC+7)
 * Ganti TARGET_DATE sesuai tanggal pernikahan
 */

(function () {
  // ─── GANTI TANGGAL DI SINI ───────────────────────────────
  const TARGET_DATE = new Date('2026-07-11T10:00:00+07:00');
  // ─────────────────────────────────────────────────────────

  const els = {
    days:  document.getElementById('cd-days'),
    hours: document.getElementById('cd-hours'),
    mins:  document.getElementById('cd-mins'),
    secs:  document.getElementById('cd-secs'),
  };

  function pad(n) {
    return String(Math.max(0, n)).padStart(2, '0');
  }

  function tick() {
    const now  = new Date();
    const diff = TARGET_DATE - now;

    if (diff <= 0) {
      if (els.days)  els.days.textContent  = '00';
      if (els.hours) els.hours.textContent = '00';
      if (els.mins)  els.mins.textContent  = '00';
      if (els.secs)  els.secs.textContent  = '00';
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    if (els.days)  els.days.textContent  = pad(d);
    if (els.hours) els.hours.textContent = pad(h);
    if (els.mins)  els.mins.textContent  = pad(m);
    if (els.secs)  els.secs.textContent  = pad(s);

    setTimeout(tick, 1000);
  }

  tick();
})();
