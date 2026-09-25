/* =========================================================
   TT Bottly – Landing page scripts
   ========================================================= */
document.documentElement.classList.add('js');

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ---------- 1. Sticky header + 10. Back to top + 11. Floating CTA ---------- */
const header = $('#header');
const hero = $('#home');
const toTop = $('#toTop');
const floatCta = $('#floatCta');
const orderSection = $('#dat-hang');

function onScroll() {
  const y = window.scrollY;
  header.classList.toggle('is-scrolled', y > 10);
  toTop.classList.toggle('is-visible', y > 600);

  // Floating CTA: hiện sau Hero, ẩn khi đang ở khu vực form
  const pastHero = y > hero.offsetTop + hero.offsetHeight - 80;
  const r = orderSection.getBoundingClientRect();
  const atOrder = r.top < window.innerHeight && r.bottom > 0;
  floatCta.classList.toggle('is-visible', pastHero && !atOrder);

  updateActiveNav();
}

/* ---------- Highlight tab header theo section đang xem ---------- */
const navLinks = $$('.nav a:not(.btn)');
const navTargets = navLinks.map(a => $(a.getAttribute('href')));

function updateActiveNav() {
  const line = window.scrollY + header.offsetHeight + 40;
  let idx = 0;
  navTargets.forEach((sec, i) => { if (sec && sec.offsetTop <= line) idx = i; });
  // Cuộn tới cuối trang thì chọn tab cuối
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

toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---------- 2. Mobile menu ---------- */
const burger = $('#burger');
const nav = $('#nav');

function setMenu(open) {
  nav.classList.toggle('is-open', open);
  burger.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
}
burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));

/* ---------- 3. Smooth scroll (đóng menu khi chọn link) ---------- */
$$('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href');
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    setMenu(false);
    target.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ---------- 4. Product gallery ---------- */
const mainImg = $('#mainImg');
$$('.thumb').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('is-active')) return;
    $$('.thumb').forEach(t => t.classList.remove('is-active'));
    btn.classList.add('is-active');
    mainImg.classList.add('is-fading');
    setTimeout(() => {
      mainImg.src = btn.dataset.src;
      mainImg.alt = 'TT Bottly – ' + $('img', btn).alt.toLowerCase();
      mainImg.classList.remove('is-fading');
    }, 200);
  });
});

/* ---------- 5. FAQ accordion ---------- */
$$('.faq__q').forEach(q => {
  q.addEventListener('click', () => {
    const open = q.getAttribute('aria-expanded') === 'true';
    const answer = q.nextElementSibling;
    q.setAttribute('aria-expanded', String(!open));
    answer.style.maxHeight = open ? '0' : answer.scrollHeight + 'px';
  });
});

/* ---------- 6. Quantity selector (không nhỏ hơn 1) ---------- */
const qtyInput = $('#qty');
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

/* ---------- 7. Order form validation + 8. Success modal ---------- */
const form = $('#orderForm');
const modal = $('#modal');
const fields = form.elements;
const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/; // SĐT di động Việt Nam

function setError(input, msg) {
  const field = input.closest('.field');
  field.classList.toggle('has-error', !!msg);
  $('.error', field).textContent = msg;
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  return !msg;
}

function validate() {
  const name = fields.name.value.trim();
  const phone = fields.phone.value.replace(/[\s.-]/g, '');
  const address = fields.address.value.trim();
  const qty = parseInt(fields.qty.value, 10);

  const checks = [
    setError(fields.name, name ? '' : 'Vui lòng nhập họ tên.'),
    setError(fields.phone, PHONE_RE.test(phone) ? '' : 'Số điện thoại không hợp lệ.'),
    setError(fields.address, address ? '' : 'Vui lòng nhập địa chỉ.'),
    setError(fields.qty, qty > 0 ? '' : 'Số lượng phải lớn hơn 0.'),
  ];
  return checks.every(Boolean);
}

form.addEventListener('submit', e => {
  e.preventDefault();
  if (!validate()) {
    $('[aria-invalid="true"]', form).focus();
    return;
  }

  // Chưa có backend: chỉ mô phỏng phía frontend, KHÔNG gửi dữ liệu đi.
  // Khi có API, thay bằng: fetch('/api/orders', { method: 'POST', body: new FormData(form) })

  form.reset();
  qtyInput.value = 1;
  openModal();
});

// Xoá lỗi khi người dùng nhập lại
['name', 'phone', 'address'].forEach(n => {
  fields[n].addEventListener('input', () => setError(fields[n], ''));
});

let lastFocus = null;
function openModal() {
  lastFocus = document.activeElement;
  modal.hidden = false;
  $('#modalClose').focus();
}
function closeModal() {
  modal.hidden = true;
  if (lastFocus) lastFocus.focus();
}
$('#modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!modal.hidden) closeModal();
  else setMenu(false);
});

/* ---------- 9. Scroll reveal (Intersection Observer) ---------- */
const reveals = $$('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(el => io.observe(el));
} else {
  reveals.forEach(el => el.classList.add('is-in'));
}
