/**
 * TT Bottly – Authentication & User Account System (Local Storage)
 * Supports Register, Login, Profile Dashboard, Orders Sync, and Password Reset
 */

document.addEventListener('DOMContentLoaded', () => {
  // Storage Keys
  const USERS_KEY = 'tt_bottly_users';
  const CURRENT_USER_KEY = 'tt_bottly_current_user';
  const ORDERS_KEY = 'tt_bottly_orders';

  // Seed default demo user and order if first time
  initStorageSeed();

  // DOM Elements
  const authBox = document.getElementById('authBox');
  const profileBox = document.getElementById('profileBox');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabRegisterBtn = document.getElementById('tabRegisterBtn');
  const loginFormPanel = document.getElementById('loginFormPanel');
  const registerFormPanel = document.getElementById('registerFormPanel');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const authAlert = document.getElementById('authAlert');
  const demoBanner = document.getElementById('demoBanner');
  const btnFillDemo = document.getElementById('btnFillDemo');
  const linkToRegister = document.getElementById('linkToRegister');
  const linkToLogin = document.getElementById('linkToLogin');
  const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
  const navAccountLink = document.getElementById('navAccountLink');

  // Form DOMs
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const updateProfileForm = document.getElementById('updateProfileForm');
  const btnLogout = document.getElementById('btnLogout');

  // Forgot password modal
  const btnForgotPwd = document.getElementById('btnForgotPwd');
  const forgotModal = document.getElementById('forgotModal');
  const btnCloseForgot = document.getElementById('btnCloseForgot');
  const forgotForm = document.getElementById('forgotForm');
  const forgotEmailInput = document.getElementById('forgotEmail');
  const forgotError = document.getElementById('forgotError');
  const forgotResult = document.getElementById('forgotResult');

  // Regex
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

  /* ---------------------------------------------------------
     1. STORAGE HELPERS
     --------------------------------------------------------- */
  function initStorageSeed() {
    if (!localStorage.getItem(USERS_KEY)) {
      const demoUsers = [
        {
          id: 'usr_demo_1',
          fullname: 'Nguyễn Văn A',
          email: 'demo@bottly.vn',
          phone: '0912345678',
          password: '123456',
          address: 'Số 123 Đường Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',
          createdAt: new Date().toLocaleDateString('vi-VN')
        }
      ];
      localStorage.setItem(USERS_KEY, JSON.stringify(demoUsers));
    }

    if (!localStorage.getItem(ORDERS_KEY)) {
      const demoOrders = [
        {
          id: 'TTB-883921',
          date: '25/09/2026',
          product: 'TT Bottly Classic (Xanh Rêu - 750ml) x 1',
          total: '389.000₫',
          status: 'Đã xác nhận',
          payment: 'COD'
        }
      ];
      localStorage.setItem(ORDERS_KEY, JSON.stringify(demoOrders));
    }
  }

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
    } catch {
      return null;
    }
  }

  function setCurrentUser(user) {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    updateNavAccountText();
  }

  function getOrders() {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
    } catch {
      return [];
    }
  }

  /* ---------------------------------------------------------
     2. NAVIGATION & TABS
     --------------------------------------------------------- */
  function switchTab(target) {
    clearAlert();
    clearErrors();

    if (target === 'register') {
      tabLoginBtn.classList.remove('is-active');
      tabLoginBtn.setAttribute('aria-selected', 'false');
      tabRegisterBtn.classList.add('is-active');
      tabRegisterBtn.setAttribute('aria-selected', 'true');

      loginFormPanel.classList.remove('is-active');
      registerFormPanel.classList.add('is-active');

      authTitle.textContent = 'Tạo tài khoản mới';
      authSubtitle.textContent = 'Đăng ký nhanh chóng chỉ mất 1 phút để nhận ưu đãi và quản lý đơn hàng.';
      if (demoBanner) demoBanner.style.display = 'none';
      window.location.hash = 'register';
    } else {
      tabRegisterBtn.classList.remove('is-active');
      tabRegisterBtn.setAttribute('aria-selected', 'false');
      tabLoginBtn.classList.add('is-active');
      tabLoginBtn.setAttribute('aria-selected', 'true');

      registerFormPanel.classList.remove('is-active');
      loginFormPanel.classList.add('is-active');

      authTitle.textContent = 'Chào mừng bạn quay lại';
      authSubtitle.textContent = 'Đăng nhập tài khoản để quản lý đơn hàng và tích lũy điểm thưởng.';
      if (demoBanner) demoBanner.style.display = 'flex';
      window.location.hash = 'login';
    }
  }

  tabLoginBtn.addEventListener('click', () => switchTab('login'));
  tabRegisterBtn.addEventListener('click', () => switchTab('register'));
  if (linkToRegister) linkToRegister.addEventListener('click', () => switchTab('register'));
  if (linkToLogin) linkToLogin.addEventListener('click', () => switchTab('login'));

  // Quick fill demo button
  if (btnFillDemo) {
    btnFillDemo.addEventListener('click', () => {
      document.getElementById('loginIdentifier').value = 'demo@bottly.vn';
      document.getElementById('loginPassword').value = '123456';
      showToast('Đã điền tài khoản thử nghiệm!', 'success');
      clearAlert();
    });
  }

  // Toggle password visibility
  document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPwd = input.type === 'password';
      input.type = isPwd ? 'text' : 'password';
      btn.textContent = isPwd ? '🙈' : '👁️';
    });
  });

  // Password Strength Evaluation for Register
  const regPasswordInput = document.getElementById('regPassword');
  const pwdStrengthFill = document.getElementById('pwdStrengthFill');
  const pwdStrengthText = document.getElementById('pwdStrengthText');

  if (regPasswordInput && pwdStrengthFill && pwdStrengthText) {
    regPasswordInput.addEventListener('input', () => {
      const val = regPasswordInput.value;
      if (!val) {
        pwdStrengthFill.style.width = '0%';
        pwdStrengthText.textContent = 'Độ mạnh mật khẩu';
        pwdStrengthText.style.color = 'var(--muted)';
        return;
      }
      let score = 0;
      if (val.length >= 6) score++;
      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val) || /[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      if (score <= 1) {
        pwdStrengthFill.style.width = '25%';
        pwdStrengthFill.style.backgroundColor = '#ef4444';
        pwdStrengthText.textContent = 'Mật khẩu yếu';
        pwdStrengthText.style.color = '#ef4444';
      } else if (score === 2 || score === 3) {
        pwdStrengthFill.style.width = '65%';
        pwdStrengthFill.style.backgroundColor = '#f59e0b';
        pwdStrengthText.textContent = 'Mật khẩu trung bình';
        pwdStrengthText.style.color = '#f59e0b';
      } else {
        pwdStrengthFill.style.width = '100%';
        pwdStrengthFill.style.backgroundColor = '#10b981';
        pwdStrengthText.textContent = 'Mật khẩu mạnh & an toàn';
        pwdStrengthText.style.color = '#10b981';
      }
    });
  }

  /* ---------------------------------------------------------
     3. FORM VALIDATION & SUBMISSION
     --------------------------------------------------------- */
  function showAlert(msg, isSuccess = false) {
    if (!authAlert) return;
    authAlert.textContent = msg;
    authAlert.hidden = false;
    authAlert.className = `auth-alert ${isSuccess ? 'is-success' : 'is-error'}`;
  }

  function clearAlert() {
    if (authAlert) {
      authAlert.hidden = true;
      authAlert.textContent = '';
    }
  }

  function clearErrors() {
    document.querySelectorAll('.error').forEach(err => err.textContent = '');
    document.querySelectorAll('.has-error').forEach(f => f.classList.remove('has-error'));
  }

  function setFieldError(fieldId, errElId, message) {
    const field = document.getElementById(fieldId);
    const errEl = document.getElementById(errElId);
    if (!field || !errEl) return;
    const container = field.closest('.field');
    if (message) {
      if (container) container.classList.add('has-error');
      errEl.textContent = message;
      return false;
    } else {
      if (container) container.classList.remove('has-error');
      errEl.textContent = '';
      return true;
    }
  }

  // Handle LOGIN
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAlert();
    clearErrors();

    const idInput = document.getElementById('loginIdentifier');
    const pwdInput = document.getElementById('loginPassword');
    const identifier = idInput.value.trim();
    const password = pwdInput.value;

    let isValid = true;
    if (!identifier) {
      setFieldError('loginIdentifier', 'loginIdError', 'Vui lòng nhập Email hoặc Số điện thoại.');
      isValid = false;
    }
    if (!password) {
      setFieldError('loginPassword', 'loginPwdError', 'Vui lòng nhập mật khẩu.');
      isValid = false;
    }
    if (!isValid) return;

    // Verify credentials against local storage
    const users = getUsers();
    const user = users.find(u => 
      (u.email.toLowerCase() === identifier.toLowerCase() || u.phone === identifier) &&
      u.password === password
    );

    if (!user) {
      showAlert('Email, Số điện thoại hoặc mật khẩu không chính xác. Vui lòng thử lại!');
      return;
    }

    // Login success
    setCurrentUser(user);
    showToast(`Đăng nhập thành công! Chào mừng ${user.fullname}`, 'success');
    renderView();
  });

  // Handle REGISTER
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAlert();
    clearErrors();

    const name = document.getElementById('regFullname').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPwd = document.getElementById('regConfirmPassword').value;
    const address = document.getElementById('regAddress').value.trim();
    const terms = document.getElementById('regTerms').checked;

    let valid = true;
    if (!name) {
      valid = setFieldError('regFullname', 'regNameError', 'Vui lòng nhập họ và tên của bạn.') && valid;
    }
    if (!email || !EMAIL_RE.test(email)) {
      valid = setFieldError('regEmail', 'regEmailError', 'Vui lòng nhập địa chỉ Email hợp lệ.') && valid;
    }
    if (!phone || !PHONE_RE.test(phone)) {
      valid = setFieldError('regPhone', 'regPhoneError', 'Vui lòng nhập số điện thoại Việt Nam hợp lệ (10 chữ số).') && valid;
    }
    if (!password || password.length < 6) {
      valid = setFieldError('regPassword', 'regPwdError', 'Mật khẩu phải chứa ít nhất 6 ký tự.') && valid;
    }
    if (password !== confirmPwd) {
      valid = setFieldError('regConfirmPassword', 'regConfirmError', 'Mật khẩu xác nhận không trùng khớp.') && valid;
    }
    if (!terms) {
      document.getElementById('regTermsError').textContent = 'Bạn cần đồng ý với điều khoản sử dụng.';
      valid = false;
    }
    if (!valid) return;

    // Check existing email or phone
    const users = getUsers();
    const existsEmail = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (existsEmail) {
      setFieldError('regEmail', 'regEmailError', 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.');
      return;
    }
    const existsPhone = users.some(u => u.phone === phone);
    if (existsPhone) {
      setFieldError('regPhone', 'regPhoneError', 'Số điện thoại này đã được đăng ký.');
      return;
    }

    // Create user
    const newUser = {
      id: 'usr_' + Date.now(),
      fullname: name,
      email: email,
      phone: phone,
      password: password,
      address: address || '',
      createdAt: new Date().toLocaleDateString('vi-VN')
    };

    users.push(newUser);
    saveUsers(users);

    // Auto login
    setCurrentUser(newUser);
    showToast('Tạo tài khoản thành công! Chào mừng bạn gia nhập TT Bottly.', 'success');
    renderView();
  });

  // Handle PROFILE UPDATE
  updateProfileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const newName = document.getElementById('editFullname').value.trim();
    const newPhone = document.getElementById('editPhone').value.trim();
    const newAddress = document.getElementById('editAddress').value.trim();
    const feedback = document.getElementById('saveFeedback');

    if (!newName) {
      alert('Vui lòng không để trống họ tên.');
      return;
    }
    if (!newPhone || !PHONE_RE.test(newPhone)) {
      alert('Vui lòng nhập số điện thoại hợp lệ (10 chữ số).');
      return;
    }

    currentUser.fullname = newName;
    currentUser.phone = newPhone;
    currentUser.address = newAddress;

    // Update in users database
    const users = getUsers();
    const idx = users.findIndex(u => u.id === currentUser.id || u.email === currentUser.email);
    if (idx !== -1) {
      users[idx] = currentUser;
      saveUsers(users);
    }
    setCurrentUser(currentUser);

    feedback.textContent = '✓ Đã cập nhật thông tin thành công!';
    feedback.className = 'save-feedback is-success';
    showToast('Thông tin tài khoản đã được lưu.', 'success');

    setTimeout(() => {
      feedback.textContent = '';
      renderProfileData(currentUser);
    }, 2000);
  });

  // Handle LOGOUT
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn đăng xuất tài khoản?')) {
        setCurrentUser(null);
        showToast('Bạn đã đăng xuất tài khoản an toàn.', 'success');
        renderView();
      }
    });
  }

  // Social login dummy actions
  document.getElementById('btnGoogleLogin').addEventListener('click', () => {
    showToast('Tính năng đăng nhập Google sẵn sàng tích hợp OAuth client ID.', 'success');
  });
  document.getElementById('btnFacebookLogin').addEventListener('click', () => {
    showToast('Tính năng đăng nhập Facebook sẵn sàng tích hợp OAuth App ID.', 'success');
  });

  /* ---------------------------------------------------------
     4. RENDER VIEWS & DATA
     --------------------------------------------------------- */
  function renderView() {
    const user = getCurrentUser();
    if (user) {
      // Logged in
      authBox.hidden = true;
      profileBox.hidden = false;
      breadcrumbCurrent.textContent = `Tài khoản (${user.fullname})`;
      renderProfileData(user);
    } else {
      // Not logged in
      authBox.hidden = false;
      profileBox.hidden = true;
      breadcrumbCurrent.textContent = 'Tài khoản & Đăng nhập';
      // Read URL hash
      if (window.location.hash === '#register') {
        switchTab('register');
      } else {
        switchTab('login');
      }
    }
    updateNavAccountText();
  }

  function renderProfileData(user) {
    // Avatar Initials
    const initials = user.fullname.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || 'TB';
    document.getElementById('profileAvatar').textContent = initials;
    document.getElementById('profileNameDisplay').textContent = user.fullname;
    document.getElementById('profileEmailDisplay').textContent = `✉️ ${user.email}`;
    document.getElementById('profilePhoneDisplay').textContent = `📱 ${user.phone}`;

    // Edit form fields
    document.getElementById('editFullname').value = user.fullname;
    document.getElementById('editEmail').value = user.email;
    document.getElementById('editPhone').value = user.phone;
    document.getElementById('editAddress').value = user.address || '';

    // Render Order History from localStorage
    renderOrderHistory();
  }

  function renderOrderHistory() {
    const listEl = document.getElementById('orderHistoryList');
    const statOrdersCount = document.getElementById('statOrdersCount');
    const orders = getOrders();

    if (statOrdersCount) statOrdersCount.textContent = orders.length;

    if (!orders || orders.length === 0) {
      listEl.innerHTML = `
        <div class="order-empty-state">
          <div class="order-empty-icon">🛒</div>
          <h4>Chưa có đơn hàng nào</h4>
          <p>Bạn chưa đặt hàng nào trên TT Bottly. Hãy trải nghiệm bình giữ nhiệt cao cấp ngay!</p>
          <a href="order.html" class="btn btn--cta" style="font-size: 13.5px; padding: 0 18px; min-height: 40px; display: inline-flex;">Mua sắm ngay</a>
        </div>
      `;
      return;
    }

    listEl.innerHTML = orders.map(ord => `
      <div class="order-history-item">
        <div class="order-item-header">
          <span class="order-item-code">Mã: ${ord.id}</span>
          <span class="order-item-date">${ord.date || 'Hôm nay'}</span>
          <span class="order-item-badge">${ord.status || 'Đang chuẩn bị'}</span>
        </div>
        <div class="order-item-body">
          ${ord.product || 'TT Bottly Vacuum Flask'}
        </div>
        <div class="order-item-footer">
          <span style="font-size: 13px; color: var(--muted);">Thanh toán: ${ord.payment || 'COD'}</span>
          <span class="order-item-total">${ord.total || '0₫'}</span>
        </div>
      </div>
    `).join('');
  }

  function updateNavAccountText() {
    if (!navAccountLink) return;
    const user = getCurrentUser();
    if (user) {
      const firstName = user.fullname.split(' ').pop();
      navAccountLink.textContent = `👤 ${firstName}`;
      navAccountLink.title = `Tài khoản: ${user.fullname}`;
    } else {
      navAccountLink.textContent = 'Tài khoản';
      navAccountLink.title = 'Đăng nhập / Đăng ký';
    }
  }

  // Copy voucher buttons
  document.querySelectorAll('.btn-copy-code').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      navigator.clipboard.writeText(code).then(() => {
        const oldText = btn.textContent;
        btn.textContent = 'Đã chép!';
        btn.classList.add('is-copied');
        showToast(`Đã sao chép mã ưu đãi "${code}" vào bộ nhớ tạm!`, 'success');
        setTimeout(() => {
          btn.textContent = oldText;
          btn.classList.remove('is-copied');
        }, 2000);
      });
    });
  });

  /* ---------------------------------------------------------
     5. FORGOT PASSWORD MODAL
     --------------------------------------------------------- */
  if (btnForgotPwd && forgotModal) {
    btnForgotPwd.addEventListener('click', (e) => {
      e.preventDefault();
      forgotModal.hidden = false;
      forgotResult.hidden = true;
      forgotError.textContent = '';
      forgotEmailInput.value = '';
    });
  }

  if (btnCloseForgot) {
    btnCloseForgot.addEventListener('click', () => {
      forgotModal.hidden = true;
    });
  }

  if (forgotModal) {
    forgotModal.addEventListener('click', (e) => {
      if (e.target === forgotModal) forgotModal.hidden = true;
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = forgotEmailInput.value.trim().toLowerCase();
      if (!email || !EMAIL_RE.test(email)) {
        forgotError.textContent = 'Vui lòng nhập định dạng email hợp lệ.';
        return;
      }
      forgotError.textContent = '';
      const users = getUsers();
      const user = users.find(u => u.email.toLowerCase() === email);

      if (user) {
        forgotResult.hidden = false;
        forgotResult.innerHTML = `
          <strong>Đã tìm thấy tài khoản!</strong><br>
          Mật khẩu hiện tại của tài khoản <code>${user.email}</code> là: <strong><code>${user.password}</code></strong>.<br>
          <span style="font-size: 12px; color: #555;">(Hệ thống mô phỏng phục hồi trực tiếp từ Local Storage của thiết bị).</span>
        `;
      } else {
        forgotResult.hidden = false;
        forgotResult.innerHTML = `
          <span style="color: #991b1b;">Không tìm thấy tài khoản tương ứng với email <strong>${email}</strong>. Vui lòng đăng ký mới!</span>
        `;
      }
    });
  }

  /* ---------------------------------------------------------
     6. TOAST NOTIFICATIONS
     --------------------------------------------------------- */
  function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `auth-toast is-${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : 'ℹ️'}</span> <span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Header sticky & burger
  const header = document.getElementById('header');
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');

  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('is-scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  if (burger && nav) {
    burger.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Init view on page load
  renderView();
});
