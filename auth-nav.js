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
    const navAccountLink = document.getElementById('navAccountLink') || document.querySelector('nav a[href="auth.html"]');
    if (navAccountLink) {
      try {
        const currentUser = JSON.parse(localStorage.getItem('tt_bottly_current_user'));
        navAccountLink.textContent = 'Tài khoản';
        if (currentUser && currentUser.fullname) {
          navAccountLink.title = `Tài khoản: ${currentUser.fullname}`;
        } else {
          navAccountLink.title = 'Tài khoản';
        }
      } catch (err) {}
    }
    initSidebarMenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncAuthNav);
  } else {
    syncAuthNav();
  }
})();
