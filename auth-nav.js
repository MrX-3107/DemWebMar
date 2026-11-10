/**
 * TT Bottly – Global Navigation & Left Sidebar Menu Helper
 * Handles global navigation auth state and Left Offcanvas Sidebar Menu interactions
 */
(function () {
  function initSidebarMenu() {
    const dropdownWrapper = document.getElementById('hamburgerDropdownWrapper');
    const dropdownMenu = document.getElementById('hamburgerDropdownMenu');
    const sidebarToggle = document.getElementById('sidebarToggle') || document.getElementById('burger');

    let menuHoverTimeout = null;
    let isMenuClickLocked = false;

    function setMenu(open, lockState = null) {
      if (lockState !== null) isMenuClickLocked = lockState;
      clearTimeout(menuHoverTimeout);

      if (dropdownWrapper) dropdownWrapper.classList.toggle('is-open', open);
      if (dropdownMenu) dropdownMenu.classList.toggle('is-open', open);

      if (sidebarToggle) {
        sidebarToggle.setAttribute('aria-expanded', String(open));
        sidebarToggle.classList.toggle('is-open', open);
      }

      if (dropdownMenu) dropdownMenu.setAttribute('aria-hidden', String(!open));
    }

    window.setSidebar = setMenu;
    window.setMenu = setMenu;

    function scheduleCloseMenu(delay = 320) {
      clearTimeout(menuHoverTimeout);
      menuHoverTimeout = setTimeout(() => {
        if (!isMenuClickLocked) {
          setMenu(false, false);
        }
      }, delay);
    }

    // 1. Hover chuột mở menu sổ xuống
    if (dropdownWrapper && !dropdownWrapper.dataset.menuBound) {
      dropdownWrapper.dataset.menuBound = 'true';
      dropdownWrapper.addEventListener('mouseenter', () => {
        clearTimeout(menuHoverTimeout);
        setMenu(true, false);
      });
      dropdownWrapper.addEventListener('mouseleave', () => {
        scheduleCloseMenu(320);
      });
    } else if (sidebarToggle && !sidebarToggle.dataset.menuBound) {
      sidebarToggle.dataset.menuBound = 'true';
      sidebarToggle.addEventListener('mouseenter', () => {
        clearTimeout(menuHoverTimeout);
        setMenu(true, false);
      });
      sidebarToggle.addEventListener('mouseleave', () => {
        scheduleCloseMenu(320);
      });
    }

    // 2. Kích chuột mở & ghim giữ menu sổ xuống
    if (sidebarToggle && !sidebarToggle.dataset.clickBound) {
      sidebarToggle.dataset.clickBound = 'true';
      sidebarToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = dropdownMenu && dropdownMenu.classList.contains('is-open');
        if (isOpen && isMenuClickLocked) {
          setMenu(false, false);
        } else {
          setMenu(true, true);
        }
      });
    }

    // Giữ mở khi rê chuột bên trong nội dung menu
    if (dropdownMenu && !dropdownMenu.dataset.hoverBound) {
      dropdownMenu.dataset.hoverBound = 'true';
      dropdownMenu.addEventListener('mouseenter', () => {
        clearTimeout(menuHoverTimeout);
      });
      dropdownMenu.addEventListener('mouseleave', () => {
        scheduleCloseMenu(320);
      });
    }

    // Đóng khi click ngoài menu
    document.addEventListener('click', (e) => {
      const isInsideDropdown = dropdownWrapper && dropdownWrapper.contains(e.target);
      if (!isInsideDropdown) {
        setMenu(false, false);
      }
    });

    // Đóng khi nhấn ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setMenu(false, false);
      }
    });

    // Đóng êm ái khi click vào bất kỳ liên kết nào trong menu
    if (dropdownMenu) {
      dropdownMenu.querySelectorAll('a').forEach(a => {
        if (!a.dataset.clickBound) {
          a.dataset.clickBound = 'true';
          a.addEventListener('click', () => {
            setTimeout(() => setMenu(false, false), 120);
          });
        }
      });
    }
  }

  function syncAuthNav() {
    // Tự động nạp SDK Cloud BaaS (baas.js) nếu trang chưa nhúng trực tiếp
    if (!window.TTBaaS && !document.querySelector('script[src*="baas.js"]')) {
      const s = document.createElement('script');
      s.src = 'baas.js';
      s.onload = () => {
        if (window.TTBaaS && typeof window.TTBaaS.onChange === 'function') {
          window.TTBaaS.onChange(() => syncAuthNav());
        }
      };
      document.head.appendChild(s);
    } else if (window.TTBaaS && !window.__ttBaasNavBound) {
      window.__ttBaasNavBound = true;
      window.TTBaaS.onChange(() => syncAuthNav());
    }

    const nav = document.getElementById('nav') || document.querySelector('header .nav');
    const navAccountLink = document.getElementById('navAccountLink') || document.querySelector('nav a[href="auth.html"]');

    let currentUser = null;
    try {
      currentUser = JSON.parse(localStorage.getItem('tt_bottly_current_user'));
    } catch (err) {}

    const isAdmin = Boolean(
      currentUser &&
        currentUser.status !== 'locked' &&
        (currentUser.role === 'admin' ||
          (currentUser.email && currentUser.email.toLowerCase() === 'admin@bottly.vn'))
    );

    if (navAccountLink) {
      navAccountLink.textContent = isAdmin ? 'Tài khoản (Admin)' : 'Tài khoản';
      if (currentUser && currentUser.fullname) {
        navAccountLink.title = `Tài khoản: ${currentUser.fullname}`;
      } else {
        navAccountLink.title = 'Tài khoản';
      }
    }

    // Chỉ hiển thị mục "Quản trị" (admin.html) trên Header khi đã đăng nhập bằng tài khoản Admin
    if (nav) {
      const existingAdminLink = nav.querySelector('a[href="admin.html"]');
      if (isAdmin) {
        if (!existingAdminLink) {
          const adminLink = document.createElement('a');
          adminLink.href = 'admin.html';
          adminLink.id = 'navAdminLink';
          adminLink.textContent = 'Quản trị';
          adminLink.title = 'Hệ thống Quản trị Cloud BaaS (Đơn hàng, Người dùng, CSKH)';
          if (window.location.pathname.endsWith('admin.html')) {
            adminLink.classList.add('is-active');
            adminLink.setAttribute('aria-current', 'page');
          }
          nav.appendChild(adminLink);
        } else {
          existingAdminLink.hidden = false;
          existingAdminLink.style.display = '';
        }
      } else if (existingAdminLink) {
        existingAdminLink.remove();
      }
    }

    initSidebarMenu();
  }

  window.syncAuthNav = syncAuthNav;
  window.addEventListener('storage', syncAuthNav);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncAuthNav);
  } else {
    syncAuthNav();
  }
})();
