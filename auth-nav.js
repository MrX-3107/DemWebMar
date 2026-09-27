/**
 * TT Bottly – Global Navigation Auth Helper
 * Updates header account link dynamically based on localStorage auth state
 */
(function () {
  function syncAuthNav() {
    const navAccountLink = document.getElementById('navAccountLink') || document.querySelector('nav a[href="auth.html"]');
    if (!navAccountLink) return;

    try {
      const currentUser = JSON.parse(localStorage.getItem('tt_bottly_current_user'));
      if (currentUser && currentUser.fullname) {
        const parts = currentUser.fullname.trim().split(' ');
        const shortName = parts.length > 1 ? parts.slice(-2).join(' ') : parts[0];
        navAccountLink.innerHTML = `👤 ${shortName}`;
        navAccountLink.title = `Tài khoản: ${currentUser.fullname}`;
      } else {
        navAccountLink.textContent = 'Tài khoản';
        navAccountLink.title = 'Đăng nhập / Đăng ký';
      }
    } catch {
      // Ignore
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncAuthNav);
  } else {
    syncAuthNav();
  }
})();
