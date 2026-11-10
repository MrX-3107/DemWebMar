/**
 * ============================================================================
 * TT BOTTLY – ALL-IN-ONE CLOUD BaaS ADMIN PORTAL CONTROLLER (admin.js)
 * ============================================================================
 * Quản lý tập trung trên 1 trang duy nhất (Không dùng icon):
 *  1. Quản lý Đơn hàng của khách hàng (Orders)
 *  2. Quản lý Đăng ký / Đăng nhập người dùng (Users & Auth)
 *  3. Quản lý Yêu cầu hỗ trợ khách hàng (Support Tickets)
 *  4. Cấu hình & Đồng bộ Cloud BaaS (Supabase / Firebase / Local Cloud)
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const BaaS = window.TTBaaS;
  if (!BaaS) {
    console.error('TTBaaS SDK not loaded!');
    return;
  }

  // DOM Elements
  const adminAuthGate = $('#adminAuthGate');
  const adminLoginForm = $('#adminLoginForm');
  const adminLoginError = $('#adminLoginError');
  const btnQuickFillAdmin = $('#btnQuickFillAdmin');
  const btnAdminLogout = $('#btnAdminLogout');
  const adminNameBadge = $('#adminNameBadge');

  const baasStatusText = $('#baasStatusText');
  const globalSearchInput = $('#globalAdminSearch');
  const viewTabs = $$('.admin-view-tab');

  const sectionOrders = $('#sectionOrders');
  const sectionUsers = $('#sectionUsers');
  const sectionSupport = $('#sectionSupport');

  const ordersTableBody = $('#ordersTableBody');
  const usersTableBody = $('#usersTableBody');
  const ticketsTableBody = $('#ticketsTableBody');
  const activityLogList = $('#activityLogList');

  // Filter selects
  const filterOrderStatus = $('#filterOrderStatus');
  const filterOrderPayment = $('#filterOrderPayment');
  const filterUserRole = $('#filterUserRole');
  const filterUserStatus = $('#filterUserStatus');
  const filterTicketStatus = $('#filterTicketStatus');
  const filterTicketSource = $('#filterTicketSource');

  // Escape HTML helper to prevent XSS
  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(msg) {
    const container = $('#adminToastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'admin-toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 3000);
  }

  /* --------------------------------------------------------------------------
     1. KIỂM TRA QUYỀN ĐĂNG NHẬP ADMIN
     -------------------------------------------------------------------------- */
  function checkAdminAccess() {
    if (typeof window.syncAuthNav === 'function') {
      window.syncAuthNav();
    }
    const user = BaaS.getCurrentUser();
    if (user && user.role === 'admin' && user.status !== 'locked') {
      adminAuthGate.hidden = true;
      if (adminNameBadge) adminNameBadge.textContent = user.fullname;
      renderAll();
    } else {
      adminAuthGate.hidden = false;
    }
  }

  if (btnQuickFillAdmin) {
    btnQuickFillAdmin.addEventListener('click', () => {
      $('#adminLoginEmail').value = 'admin@bottly.vn';
      $('#adminLoginPwd').value = 'admin123';
      adminLoginError.style.display = 'none';
      showToast('Đã điền tài khoản Admin mặc định!');
    });
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('#adminLoginEmail').value.trim();
      const pwd = $('#adminLoginPwd').value;

      const res = BaaS.loginUser(id, pwd);
      if (!res.ok) {
        adminLoginError.textContent = res.error;
        adminLoginError.style.display = 'block';
        return;
      }
      if (res.user.role !== 'admin') {
        adminLoginError.textContent =
          'Tài khoản này là Khách hàng, không có quyền Quản trị viên (Admin). Vui lòng dùng tài khoản admin@bottly.vn!';
        adminLoginError.style.display = 'block';
        return;
      }

      adminLoginError.style.display = 'none';
      showToast(`Chào mừng Quản trị viên: ${res.user.fullname}`);
      checkAdminAccess();
    });
  }

  if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', () => {
      BaaS.setCurrentUser(null);
      showToast('Đã đăng xuất khỏi phiên Quản trị viên.');
      checkAdminAccess();
    });
  }

  /* --------------------------------------------------------------------------
     2. CHUYỂN ĐỔI CHẾ ĐỘ XEM (TẤT CẢ TRÊN 1 TRANG HOẶC TỪNG PHÂN HỆ)
     -------------------------------------------------------------------------- */
  viewTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      viewTabs.forEach((t) => t.classList.remove('is-active'));
      tab.classList.add('is-active');

      const view = tab.dataset.view;
      if (view === 'all') {
        sectionOrders.hidden = false;
        sectionUsers.hidden = false;
        sectionSupport.hidden = false;
      } else if (view === 'orders') {
        sectionOrders.hidden = false;
        sectionUsers.hidden = true;
        sectionSupport.hidden = true;
      } else if (view === 'users') {
        sectionOrders.hidden = true;
        sectionUsers.hidden = false;
        sectionSupport.hidden = true;
      } else if (view === 'support') {
        sectionOrders.hidden = true;
        sectionUsers.hidden = true;
        sectionSupport.hidden = false;
      }
    });
  });

  /* --------------------------------------------------------------------------
     3. RENDER KPI & CLOUD BaaS STATUS
     -------------------------------------------------------------------------- */
  function renderStatusAndKPIs() {
    const cfg = BaaS.getConfig();
    if (baasStatusText) {
      if (BaaS.isSupabaseConfigured(cfg)) {
        baasStatusText.textContent = `Cloud BaaS: Supabase Connected (${cfg.supabaseUrl.replace(/^https?:\/\//, '')})`;
      } else if (BaaS.isFirebaseConfigured(cfg)) {
        baasStatusText.textContent = `Cloud BaaS: Firebase Firestore Connected (${cfg.firebaseProjectId})`;
      } else {
        baasStatusText.textContent =
          'Cloud BaaS: Local Cloud Realtime Active (Đồng bộ tức thì đa Tab)';
      }
    }

    const stats = BaaS.getDashboardStats();
    $('#kpiTotalOrders').textContent = stats.totalOrders;
    $('#kpiPendingOrders').textContent = `${stats.pendingOrders} đơn chờ xác nhận · ${stats.completedOrders} hoàn thành`;

    $('#kpiTotalUsers').textContent = stats.totalUsers;
    $('#kpiActiveUsers').textContent = `${stats.activeUsers} hoạt động · ${stats.adminUsers} Admin`;

    $('#kpiTotalTickets').textContent = stats.totalTickets;
    $('#kpiOpenTickets').textContent = `${stats.openTickets} yêu cầu đang chờ xử lý`;

    $('#kpiEstRevenue').textContent = stats.completedOrders;

    $('#tabBadgeOrders').textContent = stats.totalOrders;
    $('#tabBadgeUsers').textContent = stats.totalUsers;
    $('#tabBadgeSupport').textContent = stats.totalTickets;
  }

  /* --------------------------------------------------------------------------
     4. RENDER BẢNG 1: QUẢN LÝ ĐƠN HÀNG (ORDERS)
     -------------------------------------------------------------------------- */
  function getOrderStatusBadgeClass(status) {
    if (status === 'Chờ xác nhận' || status === 'Đang chuẩn bị')
      return 'status-badge--pending';
    if (status === 'Đã xác nhận') return 'status-badge--confirmed';
    if (status === 'Đang giao hàng') return 'status-badge--shipping';
    if (status === 'Hoàn thành') return 'status-badge--completed';
    if (status === 'Đã hủy') return 'status-badge--cancelled';
    return 'status-badge--confirmed';
  }

  function getCleanProductAndQty(ord) {
    const raw = String(ord.product || 'Bình Giữ Nhiệt TT Bottly').trim();
    const qtyMatch = raw.match(/\sx\s*(\d+)\s*$/i);
    const qty = Number(ord.qty) || (qtyMatch ? Number(qtyMatch[1]) : 1);
    const cleanName = raw
      .replace(/\sx\s*\d+\s*$/i, '')
      .replace(/\s*\([^)]*\)/g, '')
      .trim();
    return { cleanName: cleanName || raw, qty };
  }

  function renderOrdersTable() {
    const q = (globalSearchInput?.value || '').trim().toLowerCase();
    const statusFilter = filterOrderStatus?.value || 'ALL';
    const paymentFilter = filterOrderPayment?.value || 'ALL';

    const orders = BaaS.getOrders().filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (
        paymentFilter !== 'ALL' &&
        (o.payment || '').toUpperCase() !== paymentFilter
      )
        return false;
      if (q) {
        const hay = `${o.id} ${o.customerName} ${o.customerPhone} ${o.customerEmail} ${o.product} ${o.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (orders.length === 0) {
      ordersTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-table-msg">
            Không tìm thấy đơn hàng nào khớp với bộ lọc hiện tại.
          </td>
        </tr>
      `;
      return;
    }

    const statuses = [
      'Chờ xác nhận',
      'Đã xác nhận',
      'Đang giao hàng',
      'Hoàn thành',
      'Đã hủy',
    ];

    ordersTableBody.innerHTML = orders
      .map((ord) => {
        const { cleanName, qty } = getCleanProductAndQty(ord);
        return `
      <tr>
        <td>
          <span class="code-pill">${esc(ord.id)}</span>
          <div class="cell-sub" style="margin-top: 4px;">Ngày: ${esc(ord.date || 'Hôm nay')}</div>
        </td>
        <td>
          <div class="cell-primary">${esc(ord.customerName)}</div>
          <div class="cell-sub">SĐT: ${esc(ord.customerPhone)}</div>
          ${ord.customerEmail ? `<div class="cell-sub">Email: ${esc(ord.customerEmail)}</div>` : ''}
        </td>
        <td style="max-width: 280px;">
          <div style="font-weight: 600; color: var(--text);">${esc(cleanName)}</div>
          <div class="cell-sub">Số lượng: ${esc(qty)}</div>
        </td>
        <td style="max-width: 220px;">
          <div style="font-size: 13px;">${esc(ord.address)}</div>
        </td>
        <td>
          <span class="status-badge ${getOrderStatusBadgeClass(ord.status)}" style="margin-bottom: 6px;">
            ${esc(ord.status)}
          </span>
          <div>
            <select class="inline-status-select js-order-status" data-id="${esc(ord.id)}" aria-label="Đổi trạng thái đơn ${esc(ord.id)}">
              ${statuses
                .map(
                  (st) =>
                    `<option value="${st}" ${ord.status === st ? 'selected' : ''}>${st}</option>`
                )
                .join('')}
            </select>
          </div>
        </td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn-icon-action btn-icon-action--edit js-edit-order" data-id="${esc(ord.id)}">
              Sửa
            </button>
            <button type="button" class="btn-icon-action btn-icon-action--danger js-delete-order" data-id="${esc(ord.id)}">
              Xóa
            </button>
          </div>
        </td>
      </tr>
    `;
      })
      .join('');
  }

  /* --------------------------------------------------------------------------
     5. RENDER BẢNG 2: QUẢN LÝ NGƯỜI DÙNG (USERS & AUTH)
     -------------------------------------------------------------------------- */
  function renderUsersTable() {
    const q = (globalSearchInput?.value || '').trim().toLowerCase();
    const roleFilter = filterUserRole?.value || 'ALL';
    const statusFilter = filterUserStatus?.value || 'ALL';

    const users = BaaS.getUsers().filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (q) {
        const hay = `${u.id} ${u.fullname} ${u.email} ${u.phone} ${u.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (users.length === 0) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-table-msg">
            Không tìm thấy tài khoản người dùng nào khớp với bộ lọc.
          </td>
        </tr>
      `;
      return;
    }

    usersTableBody.innerHTML = users
      .map(
        (u) => `
      <tr>
        <td>
          <div class="cell-primary">${esc(u.fullname)}</div>
          <span class="code-pill">${esc(u.id)}</span>
        </td>
        <td>
          <div style="font-weight: 600;">Email: ${esc(u.email)}</div>
          <div class="cell-sub">SĐT: ${esc(u.phone)}</div>
        </td>
        <td style="max-width: 230px;">
          <div style="font-size: 13px;">${esc(u.address || 'Chưa cập nhật địa chỉ')}</div>
          <div class="cell-sub">Ngày tạo: ${esc(u.createdAt || '—')}</div>
        </td>
        <td>
          <code style="background: #f1f5f3; padding: 3px 7px; border-radius: 6px; font-size: 12.5px;">${esc(u.password)}</code>
        </td>
        <td>
          <span class="role-badge ${u.role === 'admin' ? 'role-badge--admin' : 'role-badge--customer'}">
            ${u.role === 'admin' ? 'Admin' : 'Khách hàng'}
          </span>
        </td>
        <td>
          <span class="status-badge ${u.status === 'locked' ? 'status-badge--locked' : 'status-badge--active'}">
            ${u.status === 'locked' ? 'Đã khóa' : 'Đang hoạt động'}
          </span>
          <div class="cell-sub" style="margin-top: 4px;">Đăng nhập: ${esc(u.lastLogin || 'Chưa đăng nhập')}</div>
        </td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn-icon-action btn-icon-action--edit js-edit-user" data-id="${esc(u.id)}">
              Sửa
            </button>
            <button type="button" class="btn-icon-action btn-icon-action--warn js-toggle-lock-user" data-id="${esc(u.id)}">
              ${u.status === 'locked' ? 'Mở khóa' : 'Khóa TK'}
            </button>
            <button type="button" class="btn-icon-action btn-icon-action--danger js-delete-user" data-id="${esc(u.id)}">
              Xóa
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');
  }

  /* --------------------------------------------------------------------------
     6. RENDER BẢNG 3: QUẢN LÝ YÊU CẦU HỖ TRỢ CSKH (SUPPORT TICKETS)
     -------------------------------------------------------------------------- */
  function getTicketStatusBadgeClass(status) {
    if (status === 'Mới tiếp nhận') return 'status-badge--new';
    if (status === 'Đang xử lý') return 'status-badge--processing';
    if (status === 'Đã giải quyết') return 'status-badge--resolved';
    return 'status-badge--closed';
  }

  function getPriorityBadgeClass(priority) {
    if (priority === 'Cao') return 'priority-badge--high';
    if (priority === 'Thấp') return 'priority-badge--low';
    return 'priority-badge--medium';
  }

  function renderTicketsTable() {
    const q = (globalSearchInput?.value || '').trim().toLowerCase();
    const statusFilter = filterTicketStatus?.value || 'ALL';

    const tickets = BaaS.getSupportTickets().filter((t) => {
      if (t.source && t.source !== 'Form Hỗ Trợ') return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (q) {
        const hay = `${t.id} ${t.name} ${t.phone} ${t.email} ${t.topicLabel} ${t.note} ${t.adminReply}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (tickets.length === 0) {
      ticketsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-table-msg">
            Không có yêu cầu hỗ trợ khách hàng nào khớp với bộ lọc.
          </td>
        </tr>
      `;
      return;
    }

    const ticketStatuses = [
      'Mới tiếp nhận',
      'Đang xử lý',
      'Đã giải quyết',
      'Đã đóng',
    ];

    ticketsTableBody.innerHTML = tickets
      .map(
        (t) => `
      <tr>
        <td>
          <span class="code-pill">#${esc(t.id)}</span>
          <div class="cell-sub" style="margin-top: 4px;">Thời gian: ${esc(t.createdAt)}</div>
        </td>
        <td>
          <div class="cell-primary">${esc(t.name)}</div>
          <div class="cell-sub">SĐT: ${esc(t.phone)}</div>
          ${t.email ? `<div class="cell-sub">Email: ${esc(t.email)}</div>` : ''}
        </td>
        <td style="max-width: 210px;">
          <div style="font-weight: 700; color: var(--primary); font-size: 13px;">${esc(t.topicLabel)}</div>
          <div class="cell-sub">Nguồn: <strong>${esc(t.source)}</strong></div>
        </td>
        <td style="max-width: 310px;">
          <div style="font-size: 13px; line-height: 1.45;">"${esc(t.note)}"</div>
          ${
            t.adminReply
              ? `<div style="margin-top: 6px; padding: 6px 9px; background: #ecfdf5; border-left: 3px solid #10b981; border-radius: 6px; font-size: 12px; color: #065f46;">
                  <strong>Phản hồi CSKH:</strong> ${esc(t.adminReply)}
                </div>`
              : `<div class="cell-sub" style="color: #d97706; margin-top: 4px;">Chưa có ghi chú phản hồi</div>`
          }
        </td>
        <td>
          <span class="priority-badge ${getPriorityBadgeClass(t.priority)}">
            ${esc(t.priority || 'Trung bình')}
          </span>
        </td>
        <td>
          <span class="status-badge ${getTicketStatusBadgeClass(t.status)}" style="margin-bottom: 6px;">
            ${esc(t.status)}
          </span>
          <div>
            <select class="inline-status-select js-ticket-status" data-id="${esc(t.id)}" aria-label="Đổi trạng thái phiếu ${esc(t.id)}">
              ${ticketStatuses
                .map(
                  (st) =>
                    `<option value="${st}" ${t.status === st ? 'selected' : ''}>${st}</option>`
                )
                .join('')}
            </select>
          </div>
        </td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn-icon-action btn-icon-action--edit js-reply-ticket" data-id="${esc(t.id)}">
              Phản hồi / Xử lý
            </button>
            <button type="button" class="btn-icon-action btn-icon-action--danger js-delete-ticket" data-id="${esc(t.id)}">
              Xóa
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');
  }

  function renderAll() {
    renderStatusAndKPIs();
    renderOrdersTable();
    renderUsersTable();
    renderTicketsTable();
  }

  /* --------------------------------------------------------------------------
     8. SỰ KIỆN TÌM KIẾM, BỘ LỌC & THAO TÁC TRỰC TIẾP TRÊN BẢNG
     -------------------------------------------------------------------------- */
  [
    globalSearchInput,
    filterOrderStatus,
    filterOrderPayment,
    filterUserRole,
    filterUserStatus,
    filterTicketStatus,
    filterTicketSource,
  ].forEach((el) => {
    if (el) {
      el.addEventListener('input', renderAll);
      el.addEventListener('change', renderAll);
    }
  });

  // Event delegation cho bảng Đơn hàng
  ordersTableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('js-order-status')) {
      const id = e.target.dataset.id;
      const newStatus = e.target.value;
      BaaS.updateOrder(id, { status: newStatus });
      showToast(`Đã cập nhật đơn hàng #${id} sang trạng thái: ${newStatus}`);
      renderAll();
    }
  });

  ordersTableBody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.js-edit-order');
    if (editBtn) {
      openOrderModal('edit', editBtn.dataset.id);
      return;
    }
    const delBtn = e.target.closest('.js-delete-order');
    if (delBtn) {
      const id = delBtn.dataset.id;
      if (confirm(`Bạn có chắc chắn muốn xóa đơn hàng #${id}?`)) {
        BaaS.deleteOrder(id);
        showToast(`Đã xóa đơn hàng #${id}`);
        renderAll();
      }
    }
  });

  // Event delegation cho bảng Người dùng
  usersTableBody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.js-edit-user');
    if (editBtn) {
      openUserModal('edit', editBtn.dataset.id);
      return;
    }

    const lockBtn = e.target.closest('.js-toggle-lock-user');
    if (lockBtn) {
      const id = lockBtn.dataset.id;
      const u = BaaS.getUsers().find((x) => x.id === id);
      if (!u) return;
      const nextStatus = u.status === 'locked' ? 'active' : 'locked';
      BaaS.updateUser(id, { status: nextStatus });
      showToast(
        nextStatus === 'locked'
          ? `Đã khóa tài khoản "${u.fullname}".`
          : `Đã mở khóa tài khoản "${u.fullname}".`
      );
      renderAll();
      return;
    }

    const delBtn = e.target.closest('.js-delete-user');
    if (delBtn) {
      const id = delBtn.dataset.id;
      const u = BaaS.getUsers().find((x) => x.id === id);
      if (!u) return;
      if (u.email.toLowerCase() === 'admin@bottly.vn') {
        alert('Không thể xóa tài khoản Quản trị viên gốc (admin@bottly.vn)!');
        return;
      }
      if (confirm(`Xác nhận xóa tài khoản người dùng "${u.fullname}" (${u.email})?`)) {
        BaaS.deleteUser(id);
        showToast(`Đã xóa tài khoản "${u.fullname}".`);
        renderAll();
      }
    }
  });

  // Event delegation cho bảng Yêu cầu hỗ trợ CSKH
  ticketsTableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('js-ticket-status')) {
      const id = e.target.dataset.id;
      const newStatus = e.target.value;
      BaaS.updateSupportTicket(id, { status: newStatus });
      showToast(`Đã cập nhật trạng thái phiếu #${id} sang: ${newStatus}`);
      renderAll();
    }
  });

  ticketsTableBody.addEventListener('click', (e) => {
    const replyBtn = e.target.closest('.js-reply-ticket');
    if (replyBtn) {
      openTicketModal('edit', replyBtn.dataset.id);
      return;
    }
    const delBtn = e.target.closest('.js-delete-ticket');
    if (delBtn) {
      const id = delBtn.dataset.id;
      if (confirm(`Bạn có chắc chắn muốn xóa phiếu hỗ trợ #${id}?`)) {
        BaaS.deleteSupportTicket(id);
        showToast(`Đã xóa phiếu hỗ trợ #${id}`);
        renderAll();
      }
    }
  });

  /* --------------------------------------------------------------------------
     9. QUẢN LÝ MODALS (ĐƠN HÀNG / NGƯỜI DÙNG / PHIẾU HỖ TRỢ / CLOUD BaaS)
     -------------------------------------------------------------------------- */
  $$('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.close);
      if (target) target.hidden = true;
    });
  });

  $$('.admin-modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.hidden = true;
    });
  });

  // --- 9.1. Order Modal ---
  function openOrderModal(mode, orderId = null) {
    const backdrop = $('#orderModalBackdrop');
    $('#ordFormMode').value = mode;
    if (mode === 'create') {
      $('#orderModalTitle').textContent = 'Tạo Đơn Hàng Mới (Thủ công)';
      $('#ordIdInput').value =
        'TTB-' + Math.floor(100000 + Math.random() * 900000);
      $('#ordStatusInput').value = 'Đã xác nhận';
      $('#ordCustName').value = '';
      $('#ordCustPhone').value = '';
      $('#ordAddress').value = '';
      $('#ordProduct').value = 'Combo 2 Bình Everyday Daily Duo';
      if ($('#ordQty')) $('#ordQty').value = 1;
    } else {
      const ord = BaaS.getOrders().find((o) => o.id === orderId);
      if (!ord) return;
      const { cleanName, qty } = getCleanProductAndQty(ord);
      $('#orderModalTitle').textContent = `Cập Nhật Đơn Hàng #${ord.id}`;
      $('#ordIdInput').value = ord.id;
      $('#ordStatusInput').value = ord.status || 'Chờ xác nhận';
      $('#ordCustName').value = ord.customerName || '';
      $('#ordCustPhone').value = ord.customerPhone || '';
      $('#ordAddress').value = ord.address || '';
      $('#ordProduct').value = cleanName;
      if ($('#ordQty')) $('#ordQty').value = qty;
    }
    backdrop.hidden = false;
  }

  $('#btnAddOrderModal')?.addEventListener('click', () =>
    openOrderModal('create')
  );

  $('#adminOrderForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const mode = $('#ordFormMode').value;
    const qtyVal = Math.max(1, parseInt($('#ordQty')?.value || '1', 10) || 1);
    const prodName = $('#ordProduct').value.trim();
    const payload = {
      id: $('#ordIdInput').value.trim(),
      status: $('#ordStatusInput').value,
      customerName: $('#ordCustName').value.trim(),
      customerPhone: $('#ordCustPhone').value.trim(),
      address: $('#ordAddress').value.trim(),
      product: prodName,
      qty: qtyVal,
      addons: '',
      note: '',
      adminNote: '',
    };

    if (mode === 'create') {
      BaaS.createOrder(payload);
      showToast(`Đã tạo đơn hàng mới #${payload.id}!`);
    } else {
      BaaS.updateOrder(payload.id, payload);
      showToast(`Đã lưu thay đổi đơn hàng #${payload.id}!`);
    }

    $('#orderModalBackdrop').hidden = true;
    renderAll();
  });

  // --- 9.2. User Modal ---
  function openUserModal(mode, userId = null) {
    const backdrop = $('#userModalBackdrop');
    $('#usrFormMode').value = mode;
    if (mode === 'create') {
      $('#userModalTitle').textContent = 'Thêm Tài Khoản Người Dùng Mới';
      $('#usrIdInput').value = '';
      $('#usrFullname').value = '';
      $('#usrPhone').value = '';
      $('#usrEmail').value = '';
      $('#usrPassword').value = '123456';
      $('#usrRole').value = 'customer';
      $('#usrStatus').value = 'active';
      $('#usrAddress').value = '';
    } else {
      const u = BaaS.getUsers().find((x) => x.id === userId);
      if (!u) return;
      $('#userModalTitle').textContent = `Chỉnh Sửa Tài Khoản: ${u.fullname}`;
      $('#usrIdInput').value = u.id;
      $('#usrFullname').value = u.fullname || '';
      $('#usrPhone').value = u.phone || '';
      $('#usrEmail').value = u.email || '';
      $('#usrPassword').value = u.password || '';
      $('#usrRole').value = u.role || 'customer';
      $('#usrStatus').value = u.status || 'active';
      $('#usrAddress').value = u.address || '';
    }
    backdrop.hidden = false;
  }

  $('#btnAddUserModal')?.addEventListener('click', () =>
    openUserModal('create')
  );

  $('#adminUserForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const mode = $('#usrFormMode').value;
    const payload = {
      fullname: $('#usrFullname').value.trim(),
      phone: $('#usrPhone').value.trim(),
      email: $('#usrEmail').value.trim(),
      password: $('#usrPassword').value,
      role: $('#usrRole').value,
      status: $('#usrStatus').value,
      address: $('#usrAddress').value.trim(),
    };

    if (mode === 'create') {
      const res = BaaS.registerUser(payload);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      showToast(`Đã tạo tài khoản "${payload.fullname}" thành công!`);
    } else {
      const id = $('#usrIdInput').value;
      BaaS.updateUser(id, payload);
      showToast(`Đã cập nhật tài khoản "${payload.fullname}"!`);
    }

    $('#userModalBackdrop').hidden = true;
    renderAll();
  });

  // --- 9.3. Support Ticket Modal ---
  function openTicketModal(mode, ticketId = null) {
    const backdrop = $('#ticketModalBackdrop');
    $('#tktFormMode').value = mode;
    if (mode === 'create') {
      $('#ticketModalTitle').textContent = 'Tạo Phiếu Yêu Cầu Hỗ Trợ Mới';
      $('#tktIdInput').value =
        'CSKH-' + Math.floor(100000 + Math.random() * 900000);
      $('#tktStatus').value = 'Mới tiếp nhận';
      $('#tktName').value = '';
      $('#tktPhone').value = '';
      $('#tktEmail').value = '';
      $('#tktPriority').value = 'Trung bình';
      $('#tktTopic').value = 'warranty';
      $('#tktNote').value = '';
      $('#tktAdminReply').value = '';
    } else {
      const t = BaaS.getSupportTickets().find((x) => x.id === ticketId);
      if (!t) return;
      $('#ticketModalTitle').textContent = `Xử Lý Yêu Cầu Hỗ Trợ #${t.id}`;
      $('#tktIdInput').value = t.id;
      $('#tktStatus').value = t.status || 'Đang xử lý';
      $('#tktName').value = t.name || '';
      $('#tktPhone').value = t.phone || '';
      $('#tktEmail').value = t.email || '';
      $('#tktPriority').value = t.priority || 'Trung bình';
      $('#tktTopic').value = t.topic || 'other';
      $('#tktNote').value = t.note || '';
      $('#tktAdminReply').value = t.adminReply || '';
    }
    backdrop.hidden = false;
  }

  $('#btnAddTicketModal')?.addEventListener('click', () =>
    openTicketModal('create')
  );

  $('#adminTicketForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const mode = $('#tktFormMode').value;
    const topicEl = $('#tktTopic');
    const topicVal = topicEl.value;
    const topicLabel =
      BaaS.TOPIC_LABELS[topicVal] || 'Yêu cầu hỗ trợ CSKH';

    const payload = {
      id: $('#tktIdInput').value.trim(),
      status: $('#tktStatus').value,
      name: $('#tktName').value.trim(),
      phone: $('#tktPhone').value.trim(),
      email: $('#tktEmail').value.trim(),
      priority: $('#tktPriority').value,
      topic: topicVal,
      topicLabel,
      note: $('#tktNote').value.trim(),
      adminReply: $('#tktAdminReply').value.trim(),
    };

    if (mode === 'create') {
      BaaS.createSupportTicket(payload);
      showToast(`Đã tạo phiếu hỗ trợ #${payload.id}!`);
    } else {
      BaaS.updateSupportTicket(payload.id, payload);
      showToast(`Đã lưu phản hồi xử lý cho phiếu #${payload.id}!`);
    }

    $('#ticketModalBackdrop').hidden = true;
    renderAll();
  });

  // --- 9.4. Cloud BaaS Configuration Modal ---
  const baasProviderSelect = $('#baasProviderSelect');
  const supabaseFieldsWrap = $('#supabaseFieldsWrap');
  const firebaseFieldsWrap = $('#firebaseFieldsWrap');

  function syncBaasProviderUI() {
    const val = baasProviderSelect.value;
    supabaseFieldsWrap.hidden = val !== 'supabase';
    firebaseFieldsWrap.hidden = val !== 'firebase';
  }

  if (baasProviderSelect) {
    baasProviderSelect.addEventListener('change', syncBaasProviderUI);
  }

  $('#btnOpenBaasConfig')?.addEventListener('click', () => {
    const cfg = BaaS.getConfig();
    baasProviderSelect.value = cfg.provider || 'local_cloud';
    $('#cfgSupabaseUrl').value = cfg.supabaseUrl || '';
    $('#cfgSupabaseKey').value = cfg.supabaseAnonKey || '';
    $('#cfgFirebaseProjectId').value = cfg.firebaseProjectId || '';
    $('#cfgFirebaseApiKey').value = cfg.firebaseApiKey || '';
    syncBaasProviderUI();
    $('#baasConfigModalBackdrop').hidden = false;
  });

  $('#baasConfigForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    BaaS.saveConfig({
      provider: baasProviderSelect.value,
      supabaseUrl: $('#cfgSupabaseUrl').value.trim(),
      supabaseAnonKey: $('#cfgSupabaseKey').value.trim(),
      firebaseProjectId: $('#cfgFirebaseProjectId').value.trim(),
      firebaseApiKey: $('#cfgFirebaseApiKey').value.trim(),
    });
    $('#baasConfigModalBackdrop').hidden = true;
    await BaaS.syncFromCloud();
    renderAll();
    showToast('Đã lưu cấu hình Cloud BaaS và đồng bộ dữ liệu!');
  });

  $('#btnCopySqlSchema')?.addEventListener('click', async () => {
    const sqlText = $('#sqlSchemaPreview').textContent;
    try {
      await navigator.clipboard.writeText(sqlText);
      showToast('Đã sao chép mã SQL Schema cho Supabase vào bộ nhớ tạm!');
    } catch {
      showToast('Không thể sao chép tự động, vui lòng bôi đen mã SQL.');
    }
  });

  $('#btnPushLocalToCloud')?.addEventListener('click', async () => {
    BaaS.saveConfig({
      provider: baasProviderSelect.value,
      supabaseUrl: $('#cfgSupabaseUrl').value.trim(),
      supabaseAnonKey: $('#cfgSupabaseKey').value.trim(),
      firebaseProjectId: $('#cfgFirebaseProjectId').value.trim(),
      firebaseApiKey: $('#cfgFirebaseApiKey').value.trim(),
    });
    const res = await BaaS.pushAllLocalToCloud();
    if (res.ok) {
      showToast(
        `Đã đồng bộ ${res.counts.orders} đơn hàng, ${res.counts.users} tài khoản, ${res.counts.tickets} phiếu CSKH lên Cloud (${res.provider})!`
      );
      renderAll();
    }
  });

  $('#btnSyncCloudNow')?.addEventListener('click', async () => {
    const res = await BaaS.syncFromCloud();
    renderAll();
    if (res.ok) {
      showToast(`Đồng bộ Cloud BaaS (${res.provider}) thành công!`);
    } else {
      showToast(`Đang sử dụng bộ nhớ Cloud cục bộ (${res.error || 'Offline'}).`);
    }
  });

  /* --------------------------------------------------------------------------
     10. XUẤT BÁO CÁO TỔNG HỢP RA FILE CSV
     -------------------------------------------------------------------------- */
  $('#btnExportCsv')?.addEventListener('click', () => {
    const orders = BaaS.getOrders();
    const users = BaaS.getUsers();
    const tickets = BaaS.getSupportTickets();

    const rows = [
      ['=== 1. DANH SACH DON HANG ==='],
      ['Ma Don', 'Ngay Dat', 'Khach Hang', 'SDT', 'San Pham', 'Trang Thai', 'Dia Chi'],
      ...orders.map((o) => [
        o.id,
        o.date,
        o.customerName,
        o.customerPhone,
        o.product,
        o.status,
        o.address,
      ]),
      [],
      ['=== 2. DANH SACH NGUOI DUNG ==='],
      ['ID', 'Ho Ten', 'Email', 'SDT', 'Vai Tro', 'Trang Thai', 'Ngay Tao'],
      ...users.map((u) => [
        u.id,
        u.fullname,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.createdAt,
      ]),
      [],
      ['=== 3. YEU CAU HO TRO CSKH ==='],
      ['Ma Phieu', 'Thoi Gian', 'Khach Hang', 'SDT', 'Chu De', 'Nguon', 'Noi Dung', 'Phan Hoi CSKH', 'Trang Thai'],
      ...tickets.map((t) => [
        t.id,
        t.createdAt,
        t.name,
        t.phone,
        t.topicLabel,
        t.source,
        t.note,
        t.adminReply,
        t.status,
      ]),
    ];

    const csvContent =
      '\uFEFF' +
      rows
        .map((r) =>
          r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TT_Bottly_Cloud_BaaS_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Đã xuất báo cáo tổng hợp CSV thành công!');
  });

  /* --------------------------------------------------------------------------
     11. LẮNG NGHE SỰ KIỆN REALTIME ĐA TAB TỪ CLOUD BaaS SDK
     -------------------------------------------------------------------------- */
  BaaS.onChange((event) => {
    renderAll();
    if (event === 'orders_updated' || event === 'tickets_updated' || event === 'users_updated') {
      showToast('Dữ liệu vừa được cập nhật theo thời gian thực!');
    }
  });

  // Khởi chạy kiểm tra quyền truy cập và render giao diện
  checkAdminAccess();
});
