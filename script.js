/* =========================================================
   TT Bottly – Landing page scripts
   ========================================================= */
document.documentElement.classList.add('js');

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ---------- 1. Scroll reveal (Intersection Observer) ---------- */
const reveals = $$('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
  reveals.forEach(el => io.observe(el));
} else {
  reveals.forEach(el => el.classList.add('is-in'));
}

/* ---------- 2. Sticky header + Back to top + Floating CTA ---------- */
const header = $('#header');
const hero = $('#home');
const toTop = $('#toTop');
const floatCta = $('#floatCta');

function onScroll() {
  const y = window.scrollY;
  if (header) header.classList.toggle('is-scrolled', y > 10);
  if (toTop) toTop.classList.toggle('is-visible', y > 500);

  // Floating CTA: hiện sau Hero
  if (floatCta && hero) {
    const pastHero = y > hero.offsetTop + hero.offsetHeight - 80;
    floatCta.classList.toggle('is-visible', pastHero);
  }

  updateActiveNav();
}

/* ---------- 3. Highlight tab header theo section đang xem ---------- */
const navLinks = $$('.nav a[href^="#"]:not(.btn)');
const navTargets = navLinks.map(a => {
  try { return $(a.getAttribute('href')); } catch (e) { return null; }
}).filter(Boolean);

function updateActiveNav() {
  if (navTargets.length === 0) return;
  const line = window.scrollY + (header ? header.offsetHeight : 0) + 40;
  let idx = 0;
  navTargets.forEach((sec, i) => { if (sec && sec.offsetTop <= line) idx = i; });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
    idx = navTargets.length - 1;
  }
  navLinks.forEach((a, i) => {
    a.classList.toggle('is-active', i === idx);
    if (i === idx) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

if (toTop) {
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---------- 4. Mobile menu ---------- */
const burger = $('#burger');
const nav = $('#nav');

function setMenu(open) {
  if (!nav || !burger) return;
  nav.classList.toggle('is-open', open);
  burger.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
}
if (burger) {
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
}

/* ---------- 5. Smooth scroll (đóng menu khi chọn link) ---------- */
$$('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href');
    if (id.length < 2) return;
    try {
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      target.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {}
  });
});

/* ---------- 6. Product gallery ---------- */
const mainImg = $('#mainImg');
$$('.thumb').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!mainImg || btn.classList.contains('is-active')) return;
    $$('.thumb').forEach(t => t.classList.remove('is-active'));
    btn.classList.add('is-active');
    mainImg.classList.add('is-fading');
    setTimeout(() => {
      mainImg.src = btn.dataset.src;
      const sub = $('img', btn);
      mainImg.alt = 'TT Bottly – ' + (sub ? sub.alt.toLowerCase() : 'sản phẩm');
      mainImg.classList.remove('is-fading');
    }, 200);
  });
});

/* ---------- 7. FAQ accordion ---------- */
$$('.faq__q').forEach(q => {
  q.addEventListener('click', () => {
    const open = q.getAttribute('aria-expanded') === 'true';
    const answer = q.nextElementSibling;
    if (!answer) return;
    q.setAttribute('aria-expanded', String(!open));
    answer.style.maxHeight = open ? '0' : answer.scrollHeight + 'px';
  });
});

/* ---------- 8. Quantity selector (nếu có trên trang) ---------- */
const qtyInput = $('#qty');
if (qtyInput) {
  $$('.qty__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = (parseInt(qtyInput.value, 10) || 1) + Number(btn.dataset.step);
      qtyInput.value = Math.max(1, next);
    });
  });
  qtyInput.addEventListener('change', () => {
    const v = parseInt(qtyInput.value, 10);
    qtyInput.value = v > 0 ? v : 1;
  });
}

/* ---------- 9. Order form & modal (nếu có) ---------- */
const form = $('#orderForm');
const modal = $('#modal');

if (form) {
  const fields = form.elements;
  const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

  function setError(input, msg) {
    const field = input.closest('.field');
    if (!field) return !msg;
    field.classList.toggle('has-error', !!msg);
    const err = $('.error', field);
    if (err) err.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  function validate() {
    const name = fields.name ? fields.name.value.trim() : '';
    const phone = fields.phone ? fields.phone.value.replace(/[\s.-]/g, '') : '';
    const address = fields.address ? fields.address.value.trim() : '';
    const qty = parseInt(fields.qty ? fields.qty.value : '1', 10);

    const checks = [
      fields.name ? setError(fields.name, name ? '' : 'Vui lòng nhập họ tên.') : true,
      fields.phone ? setError(fields.phone, PHONE_RE.test(phone) ? '' : 'Số điện thoại không hợp lệ.') : true,
      fields.address ? setError(fields.address, address ? '' : 'Vui lòng nhập địa chỉ.') : true,
      fields.qty ? setError(fields.qty, qty > 0 ? '' : 'Số lượng phải lớn hơn 0.') : true,
    ];
    return checks.every(Boolean);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate()) {
      const inv = $('[aria-invalid="true"]', form);
      if (inv) inv.focus();
      return;
    }
    form.reset();
    if (qtyInput) qtyInput.value = 1;
    openModal();
  });

  ['name', 'phone', 'address'].forEach(n => {
    if (fields[n]) fields[n].addEventListener('input', () => setError(fields[n], ''));
  });
}

let lastFocus = null;
function openModal() {
  if (!modal) return;
  lastFocus = document.activeElement;
  modal.hidden = false;
  const closeBtn = $('#modalClose');
  if (closeBtn) closeBtn.focus();
}
function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  if (lastFocus) lastFocus.focus();
}
if ($('#modalClose')) $('#modalClose').addEventListener('click', closeModal);
if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (modal && !modal.hidden) closeModal();
  else setMenu(false);
});

/* ---------- 10. Product Banner Carousel ---------- */
const bannerContainer = $('#productBanner');
if (bannerContainer) {
  const slides = $$('.banner-slide', bannerContainer);
  const dots = $$('.banner-dot', bannerContainer);
  const prevBtn = $('#bannerPrev');
  const nextBtn = $('#bannerNext');
  let currentSlide = 0;
  let bannerTimer = null;

  function goToSlide(index) {
    currentSlide = (index + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('is-active', i === currentSlide));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === currentSlide));
  }

  function startAutoPlay() {
    stopAutoPlay();
    bannerTimer = setInterval(() => goToSlide(currentSlide + 1), 5000);
  }

  function stopAutoPlay() {
    if (bannerTimer) clearInterval(bannerTimer);
  }

  if (prevBtn) prevBtn.addEventListener('click', () => { goToSlide(currentSlide - 1); startAutoPlay(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { goToSlide(currentSlide + 1); startAutoPlay(); });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      goToSlide(Number(dot.dataset.index));
      startAutoPlay();
    });
  });

  bannerContainer.addEventListener('mouseenter', stopAutoPlay);
  bannerContainer.addEventListener('mouseleave', startAutoPlay);

  startAutoPlay();
}
