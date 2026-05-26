(function () {
  let images        = [];
  let currentIndex  = 0;
  let touchStartX   = 0;
  let activeFilter  = 'all';

  const lightbox = document.getElementById('lightbox');
  const lbImg    = document.getElementById('lb-img');
  const lbClose  = document.getElementById('lb-close');
  const lbPrev   = document.getElementById('lb-prev');
  const lbNext   = document.getElementById('lb-next');
  const lbDots   = document.getElementById('lb-dots');

  /* ── Ambil item yang visible ── */
  function getVisibleItems() {
    return Array.from(
      document.querySelectorAll('#gallery-masonry .masonry-item')
    ).filter(el => el.style.display !== 'none');
  }

  /* ── Dots ── */
  function buildDots(count) {
    if (!lbDots) return;
    lbDots.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button');
      dot.className = 'lb-dot';
      dot.setAttribute('aria-label', `Foto ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      lbDots.appendChild(dot);
    }
    updateDots();
  }

  function updateDots() {
    if (!lbDots) return;
    lbDots.querySelectorAll('.lb-dot').forEach((d, i) =>
      d.classList.toggle('active', i === currentIndex));
  }

  /* ── Lightbox ── */
  function openLightbox(index) {
    images = getVisibleItems().map(el => el.querySelector('.gallery-img').src);
    if (!lightbox || images.length === 0) return;
    currentIndex = index;
    buildDots(images.length);
    lbImg.src = images[currentIndex];
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function goTo(index) {
    currentIndex = (index + images.length) % images.length;
    lbImg.src = images[currentIndex];
    updateDots();
  }

  /* ── Filter ── */
function getVisibleItems() {
  return Array.from(
    document.querySelectorAll('#gallery-container .gallery-group:not([style*="display: none"]) .masonry-item')
  );
}

window.filterGallery = function (theme, btn) {
  document.querySelectorAll('.gallery-filter-btn').forEach(b =>
    b.classList.toggle('active', b === btn));

  document.querySelectorAll('#gallery-container .gallery-group').forEach(group => {
    const show = theme === 'all' || group.dataset.group === theme;
    group.style.display = show ? '' : 'none';
  });

  document.querySelectorAll('#gallery-container .gallery-divider').forEach(div => {
    // Tampilkan divider hanya di mode "all"
    div.style.display = theme === 'all' ? '' : 'none';
  });
};

  /* ── Event delegation — satu listener di container ── */
  document.getElementById('gallery-container')?.addEventListener('click', (e) => {
    const item = e.target.closest('.masonry-item');
    if (!item) return;
    const group = item.closest('.gallery-group');
    if (group && group.style.display === 'none') return;
    const visibleItems = getVisibleItems();
    const idx = visibleItems.indexOf(item);
    if (idx !== -1) openLightbox(idx);
  });

  /* ── Navigasi ── */
  lbClose?.addEventListener('click', closeLightbox);
  lbPrev?.addEventListener('click', () => goTo(currentIndex - 1));
  lbNext?.addEventListener('click', () => goTo(currentIndex + 1));

  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  lightbox?.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lightbox?.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 40) diff > 0 ? goTo(currentIndex + 1) : goTo(currentIndex - 1);
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (!lightbox || lightbox.classList.contains('hidden')) return;
    if (e.key === 'ArrowLeft')  goTo(currentIndex - 1);
    if (e.key === 'ArrowRight') goTo(currentIndex + 1);
    if (e.key === 'Escape')     closeLightbox();
  });

  window.initGallery = function () { /* item click sudah via delegation */ };
})();