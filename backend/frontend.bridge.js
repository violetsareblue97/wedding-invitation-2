// ═══════════════════════════════════════════════════════════
// FRONTEND BRIDGE
// wedding-backend/frontend.bridge.js
//
// File ini menjadi penghubung antara UI (index.html / wishes.js)
// dengan SupabaseService. Dipanggil dari main.js frontend.
//
// Yang dilakukan file ini:
//  1. Override window.addWish  → kirim ke Supabase
//  2. Override window.initWishes → load dari Supabase + subscribe realtime
//  3. Map kolom Supabase → format yang dimengerti wishes.js
// ═══════════════════════════════════════════════════════════

'use strict';

// ─── Peta kolom Supabase → format internal UI ─────────────
//
//  Supabase             → UI (wishes.js)
//  ─────────────────────────────────────
//  nama_tamu            → name
//  pesan                → message
//  tidak_hadir          → attendance ('tidak' / 'hadir')
//  attend_pemberkatan   → events[] ('pemberkatan')
//  attend_resepsi       → events[] ('resepsi')
//  created_at           → time (ISO string)
// ─────────────────────────────────────────────────────────

function mapRowToWish(row) {
  const events = [];
  if (row.attend_pemberkatan) events.push('pemberkatan');
  if (row.attend_resepsi)     events.push('resepsi');

  return {
    name:       row.nama_tamu,
    message:    row.pesan,
    attendance: row.tidak_hadir ? 'tidak' : 'hadir',
    events,
    time:       row.created_at,
  };
}

// ─── State ──────────────────────────────────────────────────
let realtimeSocket = null;

// ═══════════════════════════════════════════════════════════
// OVERRIDE: window.addWish
// Dipanggil dari main.js saat user submit RSVP.
// Sekarang mengirim ke Supabase, lalu render secara optimistik.
// ═══════════════════════════════════════════════════════════
window.addWish = async function (wish) {
  // Mapping UI format → Supabase format
  const payload = {
    nama_tamu:          wish.name,
    pesan:              wish.message,
    tidak_hadir:        wish.attendance === 'tidak',
    attend_pemberkatan: wish.events?.includes('pemberkatan') ?? false,
    attend_resepsi:     wish.events?.includes('resepsi')     ?? false,
  };

  try {
    const newRow = await SupabaseService.submitRSVP(payload);
    console.log('[Bridge] RSVP tersimpan:', newRow?.id);

    // Render ulang dari server agar data sinkron
    await refreshWishesWall();
  } catch (err) {
    console.error('[Bridge] Gagal simpan RSVP:', err.message);
    // Fallback: render optimistik di UI tanpa server
    renderWishCard(wish);
    showBridgeError('Ucapan tersimpan sementara. Cek koneksi internet.');
  }
};

// ═══════════════════════════════════════════════════════════
// OVERRIDE: window.initWishes
// Dipanggil dari main.js setelah halaman utama terbuka.
// Mengambil data dari Supabase + aktifkan realtime.
// ═══════════════════════════════════════════════════════════
window.initWishes = async function () {
  await refreshWishesWall();
  startRealtimeSubscription();
};

// ═══════════════════════════════════════════════════════════
// REFRESH WALL — ambil ulang semua data dari Supabase
// ═══════════════════════════════════════════════════════════
async function refreshWishesWall() {
  const wall = document.getElementById('wishes-wall');
  if (!wall) return;

  try {
    const { wishes, totalCount } = await SupabaseService.fetchWishes({ limit: 100 });

    // Update counter jika ada elemen
    const counter = document.getElementById('wishes-count');
    if (counter) counter.textContent = totalCount;

    // Render semua kartu
    wall.innerHTML = '';
    wishes.forEach(row => {
      const wish = mapRowToWish(row);
      renderWishCard(wish, false); // false = append to wall (no prepend)
    });

    // Jika kosong, tampilkan empty state
    if (wishes.length === 0) {
      renderEmptyState(wall);
    }
  } catch (err) {
    console.error('[Bridge] Gagal fetch wishes:', err.message);
    renderErrorState(document.getElementById('wishes-wall'));
  }
}

// ═══════════════════════════════════════════════════════════
// RENDER SATU KARTU ke wishes wall
// Reuse fungsi dari wishes.js atau buat sendiri di sini
// ═══════════════════════════════════════════════════════════
function renderWishCard(wish, prepend = true) {
  const wall = document.getElementById('wishes-wall');
  if (!wall) return;

  // Gunakan createWishCard dari wishes.js jika tersedia
  if (typeof createWishCard === 'function') {
    const card = createWishCard(wish);
    if (prepend) {
      wall.insertBefore(card, wall.firstChild);
    } else {
      wall.appendChild(card);
    }
    return;
  }

  // Fallback inline jika createWishCard tidak tersedia
  const events = wish.events || [];
  const badgeHadir   = wish.attendance === 'hadir'
    ? '<span class="badge badge-hadir">Hadir</span>' : '';
  const badgeTidak   = wish.attendance === 'tidak'
    ? '<span class="badge badge-tidak">Tidak Hadir</span>' : '';
  const badgePemberkatan = events.includes('pemberkatan')
    ? '<span class="badge badge-pemberkatan">Pemberkatan</span>' : '';
  const badgeResepsi = events.includes('resepsi')
    ? '<span class="badge badge-hadir">Resepsi</span>' : '';

  const timeAgo = formatTimeAgoBridge(wish.time);

  const card = document.createElement('div');
  card.className = 'masonry-item wish-card';
  card.innerHTML = `
    <div class="wish-name">${escapeHTMLBridge(wish.name)}</div>
    <p class="wish-message">${escapeHTMLBridge(wish.message)}</p>
    <div class="wish-meta">
      <span class="wish-time">${timeAgo}</span>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${badgeTidak}${badgeHadir}${badgePemberkatan}${badgeResepsi}
      </div>
    </div>
  `;

  if (prepend) {
    wall.insertBefore(card, wall.firstChild);
  } else {
    wall.appendChild(card);
  }
}

// ═══════════════════════════════════════════════════════════
// REALTIME — subscribe ke INSERT baru
// ═══════════════════════════════════════════════════════════
function startRealtimeSubscription() {
  // Tutup koneksi lama jika ada
  if (realtimeSocket && realtimeSocket.readyState !== WebSocket.CLOSED) {
    realtimeSocket.close();
  }

  realtimeSocket = SupabaseService.subscribe((newRow) => {
    console.log('[Realtime] Ucapan baru masuk:', newRow.id);

    const wish = mapRowToWish(newRow);
    renderWishCard(wish, true); // prepend (muncul di atas)

    // Update counter
    const counter = document.getElementById('wishes-count');
    if (counter) counter.textContent = parseInt(counter.textContent || '0', 10) + 1;

    // Subtle flash animasi pada card pertama
    const firstCard = document.querySelector('#wishes-wall .wish-card');
    if (firstCard) {
      firstCard.style.boxShadow = '0 0 0 1px #e26f97';
      setTimeout(() => firstCard.style.boxShadow = '', 1500);
    }
  });
}

// ═══════════════════════════════════════════════════════════
// HELPER: Empty & Error states
// ═══════════════════════════════════════════════════════════
function renderEmptyState(wall) {
  wall.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:2rem 1rem">
      <p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.1rem;color:rgba(244,249,233,0.4)">
        Belum ada ucapan.<br>Jadilah yang pertama!
      </p>
    </div>
  `;
}

function renderErrorState(wall) {
  if (!wall) return;
  wall.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:2rem 1rem">
      <p style="font-family:'DM Sans',sans-serif;font-size:0.75rem;color:rgba(226,111,151,0.6);letter-spacing:.1em">
        Gagal memuat ucapan. Periksa koneksi internet.
      </p>
    </div>
  `;
}

function showBridgeError(msg) {
  const toast    = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);
}

// ═══════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════
function escapeHTMLBridge(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str || '')));
  return d.innerHTML;
}

function formatTimeAgoBridge(isoString) {
  if (!isoString) return '';
  const diff  = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Baru saja';
  if (mins < 60)  return `${mins} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  return `${days} hari lalu`;
}