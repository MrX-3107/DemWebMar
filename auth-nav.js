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
      navAccountLink.textContent = 'Tài khoản';
      if (currentUser && currentUser.fullname) {
        navAccountLink.title = `Tài khoản: ${currentUser.fullname}`;
      } else {
        navAccountLink.title = 'Tài khoản';
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
