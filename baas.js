/**
 * ============================================================================
 * TT BOTTLY – CLOUD BaaS BACKEND SDK & REALTIME DATA ENGINE (baas.js)
 * ============================================================================
 * Hỗ trợ đa nền tảng Cloud BaaS:
 *  1. Supabase (PostgREST + GoTrue Auth + Realtime)
 *  2. Firebase (Cloud Firestore REST API)
 *  3. Local Cloud BaaS Simulator (LocalStorage + BroadcastChannel Realtime)
 *
 * Quản lý tập trung 3 phân hệ:
 *  - users: Đăng ký, Đăng nhập, Phân quyền (Admin/Customer), Khóa tài khoản
 *  - orders: Quản lý đơn hàng, Báo giá, Trạng thái vận chuyển
 *  - support_tickets: Quản lý yêu cầu hỗ trợ từ Form CSKH & Chatbot
 * ============================================================================
 */

(function (global) {
  'use strict';

  // Storage Keys (Local Cache & Fallback)
  const KEYS = {
    CONFIG: 'tt_bottly_baas_config',
    USERS: 'tt_bottly_users',
    CURRENT_USER: 'tt_bottly_current_user',
    ORDERS: 'tt_bottly_orders',
    TICKETS: 'tt_bottly_support_tickets',
    ACTIVITY: 'tt_bottly_activity_logs',
  };

  // Mặc định cấu hình Cloud BaaS (Đã kết nối sẵn dự án Supabase của TT Bottly)
  const DEFAULT_CONFIG = {
    provider: 'supabase', // 'supabase' | 'firebase' | 'local_cloud'
    supabaseUrl: 'https://yiowyomzewrzyxyslxrh.supabase.co',
    supabaseAnonKey: 'sb_publishable_B7oduvLReqwNqyBSEoWnTA_7bX2m2IT',
    firebaseProjectId: '',
    firebaseApiKey: '',
    autoSync: true,
    lastSyncAt: null,
  };

  // Kênh đồng bộ thời gian thực giữa các tab (Order / Support / Auth / Admin)
  const channel =
    typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel('tt_bottly_baas_realtime')
      : null;

  const listeners = new Set();

  function notifyListeners(event, payload) {
    listeners.forEach((cb) => {
      try {
        cb(event, payload);
      } catch (err) {
        console.error('[TTBaaS Listener Error]', err);
      }
    });
  }

  if (channel) {
    channel.addEventListener('message', (e) => {
      if (e.data && e.data.type) {
        notifyListeners(e.data.type, e.data.payload);
      }
    });
  }

  window.addEventListener('storage', (e) => {
    if (
      e.key === KEYS.USERS ||
      e.key === KEYS.ORDERS ||
      e.key === KEYS.TICKETS ||
      e.key === KEYS.CURRENT_USER
    ) {
      notifyListeners('storage_updated', { key: e.key });
    }
  });

  function broadcast(type, payload) {
    if (channel) {
      try {
        channel.postMessage({ type, payload, timestamp: Date.now() });
      } catch (err) {
        // Ignore broadcast errors
      }
    }
    notifyListeners(type, payload);
  }

  /* --------------------------------------------------------------------------
     1. QUẢN LÝ CẤU HÌNH CLOUD BaaS (SUPABASE / FIREBASE / LOCAL CLOUD)
     -------------------------------------------------------------------------- */
  function getConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEYS.CONFIG)) || {};
      const merged = { ...DEFAULT_CONFIG, ...saved };
      // Tự động nâng cấp sang cấu hình Supabase mặc định nếu localStorage cũ đang để trống URL/Key
      if (!merged.supabaseUrl && DEFAULT_CONFIG.supabaseUrl) {
        merged.supabaseUrl = DEFAULT_CONFIG.supabaseUrl;
        merged.supabaseAnonKey = DEFAULT_CONFIG.supabaseAnonKey;
        merged.provider = DEFAULT_CONFIG.provider;
        localStorage.setItem(KEYS.CONFIG, JSON.stringify(merged));
      }
      return merged;
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  function saveConfig(newConfig) {
    const merged = {
      ...getConfig(),
      ...newConfig,
      lastSyncAt: new Date().toISOString(),
    };
    localStorage.setItem(KEYS.CONFIG, JSON.stringify(merged));
    broadcast('config_changed', merged);
    return merged;
  }

  function isSupabaseConfigured(cfg = getConfig()) {
    return (
      cfg.provider === 'supabase' &&
      Boolean(cfg.supabaseUrl && cfg.supabaseUrl.trim()) &&
      Boolean(cfg.supabaseAnonKey && cfg.supabaseAnonKey.trim())
    );
  }

  function isFirebaseConfigured(cfg = getConfig()) {
    return (
      cfg.provider === 'firebase' &&
      Boolean(cfg.firebaseProjectId && cfg.firebaseProjectId.trim())
    );
  }

  /* --------------------------------------------------------------------------
     2. KHỞI TẠO DỮ LIỆU BAN ĐẦU (SEED DATA) CHO HỆ THỐNG
     (Chỉ tạo tài khoản Admin mặc định, tuyệt đối không tạo đơn hàng hay khách ảo)
     -------------------------------------------------------------------------- */
  function initSeedData() {
    // 2.1. Seed Users (Chỉ duy nhất tài khoản Quản trị viên admin@bottly.vn)
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem(KEYS.USERS)) || [];
    } catch {
      users = [];
    }

    const adminUser = {
      id: 'usr_admin_1',
      fullname: 'Quản Trị Viên TT Bottly',
      email: 'admin@bottly.vn',
      phone: '0966321069',
      password: 'admin123',
      role: 'admin',
      status: 'active',
      address: 'Tòa nhà Aquabottle, Cầu Giấy, Hà Nội',
      createdAt: '01/10/2026',
      lastLogin: 'Hôm nay',
    };

    // Dọn dẹp các tài khoản khách ảo cũ nếu còn sót lại trong cache
    const FAKE_USER_EMAILS = ['demo@bottly.vn', 'lan.tran@gmail.com', 'minh.le@company.vn'];
    users = users.filter(
      (u) => !FAKE_USER_EMAILS.includes((u.email || '').toLowerCase().trim())
    );

    // Đảm bảo luôn có tài khoản admin@bottly.vn
    if (!users.some((u) => (u.email || '').toLowerCase().trim() === 'admin@bottly.vn')) {
      users.unshift(adminUser);
    }
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));

    // 2.2. Orders: KHÔNG TẠO ĐƠN HÀNG ẢO
    let orders = [];
    try {
      orders = JSON.parse(localStorage.getItem(KEYS.ORDERS)) || [];
    } catch {
      orders = [];
    }

    // Dọn dẹp triệt để các mã đơn ảo đã gán trước đây
    const FAKE_ORDER_IDS = ['TTB-883921', 'TTB-792410', 'TTB-651094'];
    orders = orders.filter((o) => !FAKE_ORDER_IDS.includes(o.id));
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));

    // 2.3. Support Tickets: KHÔNG TẠO PHIẾU HỖ TRỢ ẢO
    let tickets = [];
    try {
      tickets = JSON.parse(localStorage.getItem(KEYS.TICKETS)) || [];
    } catch {
      tickets = [];
    }

    // Dọn dẹp các phiếu CSKH ảo đã gán trước đây
    const FAKE_TICKET_IDS = ['CSKH-582910', 'CSKH-349182', 'CSKH-120495'];
    tickets = tickets.filter((t) => !FAKE_TICKET_IDS.includes(t.id));
    localStorage.setItem(KEYS.TICKETS, JSON.stringify(tickets));
  }

  // Khởi chạy seed data ngay khi nạp SDK
  initSeedData();

  /* --------------------------------------------------------------------------
     3. ADAPTER KẾT NỐI CLOUD BaaS (SUPABASE REST & FIREBASE FIRESTORE REST)
     -------------------------------------------------------------------------- */
  async function supabaseRequest(table, method = 'GET', body = null, query = '') {
    const cfg = getConfig();
    if (!isSupabaseConfigured(cfg)) return null;

    const baseUrl = cfg.supabaseUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/rest/v1/${table}${query ? `?${query}` : ''}`;
    const headers = {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${cfg.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    const options = { method, headers };
    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase error (${res.status}): ${errText}`);
    }
    if (method === 'DELETE') return true;
    return await res.json();
  }

  // Helper chuyển đổi dữ liệu Firestore REST JSON <-> Object phẳng
  function toFirestoreFields(obj) {
    const fields = {};
    Object.keys(obj || {}).forEach((k) => {
      const val = obj[k];
      if (val === undefined || val === null) {
        fields[k] = { nullValue: null };
      } else if (typeof val === 'number') {
        fields[k] = Number.isInteger(val)
          ? { integerValue: String(val) }
          : { doubleValue: val };
      } else if (typeof val === 'boolean') {
        fields[k] = { booleanValue: val };
      } else {
        fields[k] = { stringValue: String(val) };
      }
    });
    return { fields };
  }

  function fromFirestoreDoc(doc) {
    if (!doc || !doc.fields) return null;
    const out = {};
    Object.keys(doc.fields).forEach((k) => {
      const f = doc.fields[k];
      if ('stringValue' in f) out[k] = f.stringValue;
      else if ('integerValue' in f) out[k] = Number(f.integerValue);
      else if ('doubleValue' in f) out[k] = Number(f.doubleValue);
      else if ('booleanValue' in f) out[k] = Boolean(f.booleanValue);
      else out[k] = null;
    });
    if (!out.id && doc.name) {
      out.id = doc.name.split('/').pop();
    }
    return out;
  }

  async function firebaseRequest(collection, method = 'GET', docId = '', data = null) {
    const cfg = getConfig();
    if (!isFirebaseConfigured(cfg)) return null;

    const projectId = cfg.firebaseProjectId.trim();
    const apiKeyParam = cfg.firebaseApiKey ? `?key=${encodeURIComponent(cfg.firebaseApiKey.trim())}` : '';
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
    const url = docId ? `${baseUrl}/${encodeURIComponent(docId)}${apiKeyParam}` : `${baseUrl}${apiKeyParam}`;

    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (data && (method === 'POST' || method === 'PATCH')) {
      options.body = JSON.stringify(toFirestoreFields(data));
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Firebase Firestore error (${res.status}): ${errText}`);
    }
    if (method === 'DELETE') return true;
    const json = await res.json();
    if (json.documents) {
      return json.documents.map(fromFirestoreDoc).filter(Boolean);
    }
    return fromFirestoreDoc(json);
  }

  /* --------------------------------------------------------------------------
     4. ĐỒNG BỘ DỮ LIỆU GIỮA CLOUD BaaS VÀ LOCAL CACHE
     -------------------------------------------------------------------------- */
  async function syncFromCloud() {
    const cfg = getConfig();
    const FAKE_ORDER_IDS = ['TTB-883921', 'TTB-792410', 'TTB-651094'];
    const FAKE_USER_EMAILS = ['demo@bottly.vn', 'lan.tran@gmail.com', 'minh.le@company.vn'];
    const FAKE_TICKET_IDS = ['CSKH-582910', 'CSKH-349182', 'CSKH-120495'];

    try {
      if (isSupabaseConfigured(cfg)) {
        const [cloudUsers, cloudOrders, cloudTickets] = await Promise.all([
          supabaseRequest('users', 'GET', null, 'select=*'),
          supabaseRequest('orders', 'GET', null, 'select=*'),
          supabaseRequest('support_tickets', 'GET', null, 'select=*'),
        ]);
        if (Array.isArray(cloudUsers)) {
          const cleanUsers = cloudUsers.filter(
            (u) => !FAKE_USER_EMAILS.includes((u.email || '').toLowerCase().trim())
          );
          localStorage.setItem(KEYS.USERS, JSON.stringify(cleanUsers));
        }
        if (Array.isArray(cloudOrders)) {
          const cleanOrders = cloudOrders.filter((o) => !FAKE_ORDER_IDS.includes(o.id));
          localStorage.setItem(KEYS.ORDERS, JSON.stringify(cleanOrders));
        }
        if (Array.isArray(cloudTickets)) {
          const cleanTickets = cloudTickets.filter((t) => !FAKE_TICKET_IDS.includes(t.id));
          localStorage.setItem(KEYS.TICKETS, JSON.stringify(cleanTickets));
        }
        saveConfig({ lastSyncAt: new Date().toISOString() });
        broadcast('cloud_synced', { provider: 'supabase' });
        return { ok: true, provider: 'supabase' };
      }

      if (isFirebaseConfigured(cfg)) {
        const [cloudUsers, cloudOrders, cloudTickets] = await Promise.all([
          firebaseRequest('users', 'GET'),
          firebaseRequest('orders', 'GET'),
          firebaseRequest('support_tickets', 'GET'),
        ]);
        if (Array.isArray(cloudUsers)) {
          const cleanUsers = cloudUsers.filter(
            (u) => !FAKE_USER_EMAILS.includes((u.email || '').toLowerCase().trim())
          );
          localStorage.setItem(KEYS.USERS, JSON.stringify(cleanUsers));
        }
        if (Array.isArray(cloudOrders)) {
          const cleanOrders = cloudOrders.filter((o) => !FAKE_ORDER_IDS.includes(o.id));
          localStorage.setItem(KEYS.ORDERS, JSON.stringify(cleanOrders));
        }
        if (Array.isArray(cloudTickets)) {
          const cleanTickets = cloudTickets.filter((t) => !FAKE_TICKET_IDS.includes(t.id));
          localStorage.setItem(KEYS.TICKETS, JSON.stringify(cleanTickets));
        }
        saveConfig({ lastSyncAt: new Date().toISOString() });
        broadcast('cloud_synced', { provider: 'firebase' });
        return { ok: true, provider: 'firebase' };
      }

      saveConfig({ lastSyncAt: new Date().toISOString() });
      return { ok: true, provider: 'local_cloud' };
    } catch (err) {
      console.warn('[TTBaaS] Fallback to Local Cloud cache:', err.message);
      return { ok: false, error: err.message, provider: cfg.provider };
    }
  }

  async function pushAllLocalToCloud() {
    const cfg = getConfig();
    const users = getUsers();
    const orders = getOrders();
    const tickets = getSupportTickets();

    if (isSupabaseConfigured(cfg)) {
      // Upsert toàn bộ dữ liệu lên Supabase
      const baseUrl = cfg.supabaseUrl.replace(/\/+$/, '');
      const headers = {
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      };

      await Promise.all([
        fetch(`${baseUrl}/rest/v1/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify(users),
        }),
        fetch(`${baseUrl}/rest/v1/orders`, {
          method: 'POST',
          headers,
          body: JSON.stringify(orders),
        }),
        fetch(`${baseUrl}/rest/v1/support_tickets`, {
          method: 'POST',
          headers,
          body: JSON.stringify(tickets),
        }),
      ]);
      saveConfig({ lastSyncAt: new Date().toISOString() });
      broadcast('cloud_synced', { provider: 'supabase' });
      return { ok: true, provider: 'supabase', counts: { users: users.length, orders: orders.length, tickets: tickets.length } };
    }

    if (isFirebaseConfigured(cfg)) {
      await Promise.all([
        ...users.map((u) => firebaseRequest('users', 'PATCH', u.id, u)),
        ...orders.map((o) => firebaseRequest('orders', 'PATCH', o.id, o)),
        ...tickets.map((t) => firebaseRequest('support_tickets', 'PATCH', t.id, t)),
      ]);
      saveConfig({ lastSyncAt: new Date().toISOString() });
      broadcast('cloud_synced', { provider: 'firebase' });
      return { ok: true, provider: 'firebase', counts: { users: users.length, orders: orders.length, tickets: tickets.length } };
    }

    saveConfig({ lastSyncAt: new Date().toISOString() });
    broadcast('cloud_synced', { provider: 'local_cloud' });
    return { ok: true, provider: 'local_cloud', counts: { users: users.length, orders: orders.length, tickets: tickets.length } };
  }

  async function syncRecordToCloud(collection, record, action = 'upsert') {
    const cfg = getConfig();
    try {
      if (isSupabaseConfigured(cfg)) {
        if (action === 'delete') {
          await supabaseRequest(collection, 'DELETE', null, `id=eq.${encodeURIComponent(record.id)}`);
        } else {
          const baseUrl = cfg.supabaseUrl.replace(/\/+$/, '');
          await fetch(`${baseUrl}/rest/v1/${collection}`, {
            method: 'POST',
            headers: {
              apikey: cfg.supabaseAnonKey,
              Authorization: `Bearer ${cfg.supabaseAnonKey}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify(record),
          });
        }
      } else if (isFirebaseConfigured(cfg)) {
        if (action === 'delete') {
          await firebaseRequest(collection, 'DELETE', record.id);
        } else {
          await firebaseRequest(collection, 'PATCH', record.id, record);
        }
      }
    } catch (err) {
      console.warn(`[TTBaaS] Cloud sync warning (${collection}):`, err.message);
    }
  }

  /* --------------------------------------------------------------------------
     5. MODULE 1: QUẢN LÝ NGƯỜI DÙNG & XÁC THỰC (USERS & AUTH)
     -------------------------------------------------------------------------- */
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.USERS)) || [];
    } catch {
      return [];
    }
  }

  function saveUsersLocal(users) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    broadcast('users_updated', users);
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.CURRENT_USER));
    } catch {
      return null;
    }
  }

  function setCurrentUser(user) {
    if (user) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
    broadcast('auth_changed', user);
  }

  function loginUser(identifier, password) {
    const cleanId = (identifier || '').trim().toLowerCase();
    const users = getUsers();
    const user = users.find(
      (u) =>
        (u.email.toLowerCase() === cleanId || u.phone === identifier.trim()) &&
        u.password === password
    );

    if (!user) {
      return {
        ok: false,
        error: 'Email, Số điện thoại hoặc mật khẩu không chính xác!',
      };
    }

    if (user.status === 'locked') {
      return {
        ok: false,
        error: 'Tài khoản của bạn đã bị tạm khóa bởi Quản trị viên. Vui lòng liên hệ CSKH 0966321069.',
      };
    }

    user.lastLogin = new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    saveUsersLocal(users);
    setCurrentUser(user);
    syncRecordToCloud('users', user, 'upsert');
    logActivity('auth', `Người dùng "${user.fullname}" (${user.email}) đã đăng nhập.`);

    return { ok: true, user };
  }

  function registerUser(payload) {
    const users = getUsers();
    const email = (payload.email || '').trim();
    const phone = (payload.phone || '').trim();

    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return {
        ok: false,
        field: 'email',
        error: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.',
      };
    }
    if (users.some((u) => u.phone === phone)) {
      return {
        ok: false,
        field: 'phone',
        error: 'Số điện thoại này đã được đăng ký.',
      };
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      fullname: (payload.fullname || '').trim(),
      email,
      phone,
      password: payload.password || '123456',
      role: payload.role || 'customer',
      status: payload.status || 'active',
      address: (payload.address || '').trim(),
      createdAt: new Date().toLocaleDateString('vi-VN'),
      lastLogin: 'Vừa xong',
    };

    users.unshift(newUser);
    saveUsersLocal(users);
    syncRecordToCloud('users', newUser, 'upsert');
    logActivity('user', `Tài khoản mới đăng ký: "${newUser.fullname}" (${newUser.email}).`);

    return { ok: true, user: newUser };
  }

  function updateUser(userId, updates) {
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === userId || u.email === userId);
    if (idx === -1) return { ok: false, error: 'Không tìm thấy người dùng.' };

    users[idx] = { ...users[idx], ...updates };
    saveUsersLocal(users);

    // Nếu đang cập nhật chính user đang đăng nhập thì đồng bộ phiên hiện tại
    const curr = getCurrentUser();
    if (curr && (curr.id === users[idx].id || curr.email === users[idx].email)) {
      if (users[idx].status === 'locked') {
        setCurrentUser(null);
      } else {
        setCurrentUser(users[idx]);
      }
    }

    syncRecordToCloud('users', users[idx], 'upsert');
    logActivity('user', `Cập nhật tài khoản "${users[idx].fullname}" (${users[idx].email}).`);
    return { ok: true, user: users[idx] };
  }

  function deleteUser(userId) {
    const users = getUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) return { ok: false, error: 'Không tìm thấy người dùng.' };

    const filtered = users.filter((u) => u.id !== userId);
    saveUsersLocal(filtered);

    const curr = getCurrentUser();
    if (curr && curr.id === userId) {
      setCurrentUser(null);
    }

    syncRecordToCloud('users', { id: userId }, 'delete');
    logActivity('user', `Đã xóa tài khoản "${target.fullname}" (${target.email}).`);
    return { ok: true };
  }

  /* --------------------------------------------------------------------------
     6. MODULE 2: QUẢN LÝ ĐƠN HÀNG (ORDERS)
     -------------------------------------------------------------------------- */
  function getOrders() {
    let orders = [];
    try {
      orders = JSON.parse(localStorage.getItem(KEYS.ORDERS)) || [];
    } catch {
      orders = [];
    }
    const FAKE_ORDER_IDS = ['TTB-883921', 'TTB-792410', 'TTB-651094'];
    return orders.filter((o) => !FAKE_ORDER_IDS.includes(o.id));
  }

  function getUserOrders(user) {
    if (!user) return [];
    const orders = getOrders();
    const userEmail = (user.email || '').toLowerCase().trim();
    const userPhone = (user.phone || '').trim();
    const userId = user.id;

    return orders.filter((o) => {
      if (userId && o.userId === userId) return true;
      if (userEmail && o.customerEmail && o.customerEmail.toLowerCase().trim() === userEmail) return true;
      if (userPhone && o.customerPhone && o.customerPhone.trim() === userPhone) return true;
      return false;
    });
  }

  function saveOrdersLocal(orders) {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
    broadcast('orders_updated', orders);
  }

  function createOrder(orderData) {
    const orders = getOrders();
    const currUser = getCurrentUser();
    const orderId =
      orderData.id || 'TTB-' + Math.floor(100000 + Math.random() * 900000);

    const newOrder = {
      id: orderId,
      userId: orderData.userId || (currUser ? currUser.id : 'guest'),
      customerName: (orderData.customerName || orderData.name || (currUser ? currUser.fullname : 'Khách vãng lai')).trim(),
      customerPhone: (orderData.customerPhone || orderData.phone || (currUser ? currUser.phone : '')).trim(),
      customerEmail: (orderData.customerEmail || orderData.email || (currUser ? currUser.email : '')).trim(),
      province: orderData.province || '',
      address: (orderData.address || '').trim(),
      product: orderData.product || 'Bình Giữ Nhiệt TT Bottly',
      qty: Number(orderData.qty) || 1,
      addons: orderData.addons || '',
      total: orderData.total || 'Liên hệ',
      status: orderData.status || 'Chờ xác nhận',
      payment: (orderData.payment || 'COD').toUpperCase(),
      note: (orderData.note || '').trim(),
      adminNote: (orderData.adminNote || '').trim(),
      date: orderData.date || new Date().toLocaleDateString('vi-VN'),
      createdAt: new Date().toISOString(),
    };

    orders.unshift(newOrder);
    saveOrdersLocal(orders);
    syncRecordToCloud('orders', newOrder, 'upsert');
    logActivity(
      'order',
      `Đơn hàng mới #${newOrder.id} từ khách hàng "${newOrder.customerName}" (${newOrder.customerPhone}).`
    );

    return { ok: true, order: newOrder };
  }

  function updateOrder(orderId, updates) {
    const orders = getOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return { ok: false, error: 'Không tìm thấy đơn hàng.' };

    orders[idx] = { ...orders[idx], ...updates };
    saveOrdersLocal(orders);
    syncRecordToCloud('orders', orders[idx], 'upsert');
    logActivity(
      'order',
      `Cập nhật đơn hàng #${orderId} → Trạng thái: "${orders[idx].status}", Tổng: ${orders[idx].total}.`
    );

    return { ok: true, order: orders[idx] };
  }

  function deleteOrder(orderId) {
    const orders = getOrders();
    const target = orders.find((o) => o.id === orderId);
    if (!target) return { ok: false, error: 'Không tìm thấy đơn hàng.' };

    const filtered = orders.filter((o) => o.id !== orderId);
    saveOrdersLocal(filtered);
    syncRecordToCloud('orders', { id: orderId }, 'delete');
    logActivity('order', `Đã xóa đơn hàng #${orderId} của "${target.customerName}".`);
    return { ok: true };
  }

  /* --------------------------------------------------------------------------
     7. MODULE 3: QUẢN LÝ YÊU CẦU HỖ TRỢ KHÁCH HÀNG (SUPPORT TICKETS)
     -------------------------------------------------------------------------- */
  const TOPIC_LABELS = {
    warranty: 'Bảo hành / Đổi trả sản phẩm',
    shipping: 'Tra cứu vận chuyển / Giao hàng chậm',
    product: 'Tư vấn chọn mẫu & Combo quà tặng',
    corporate: 'Đặt hàng số lượng lớn / Khắc tên doanh nghiệp',
    chatbot: 'Hỗ trợ trực tiếp từ Chatbot CSKH',
    other: 'Vấn đề khác',
  };

  function getSupportTickets() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.TICKETS)) || [];
    } catch {
      return [];
    }
  }

  function saveSupportTicketsLocal(tickets) {
    localStorage.setItem(KEYS.TICKETS, JSON.stringify(tickets));
    broadcast('tickets_updated', tickets);
  }

  function createSupportTicket(ticketData) {
    const tickets = getSupportTickets();
    const ticketId =
      ticketData.id || 'CSKH-' + Math.floor(100000 + Math.random() * 900000);
    const nowStr = new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const topicKey = ticketData.topic || 'other';
    const newTicket = {
      id: ticketId.replace(/^#/, ''),
      name: (ticketData.name || 'Khách hàng TT Bottly').trim(),
      phone: (ticketData.phone || '').trim(),
      email: (ticketData.email || '').trim(),
      topic: topicKey,
      topicLabel:
        ticketData.topicLabel || TOPIC_LABELS[topicKey] || 'Yêu cầu hỗ trợ CSKH',
      source: ticketData.source || 'Form Hỗ Trợ',
      note: (ticketData.note || 'Cần chuyên viên CSKH liên hệ tư vấn trực tiếp.').trim(),
      status: ticketData.status || 'Mới tiếp nhận',
      priority:
        ticketData.priority ||
        (topicKey === 'warranty' || topicKey === 'corporate' ? 'Cao' : 'Trung bình'),
      adminReply: (ticketData.adminReply || '').trim(),
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    tickets.unshift(newTicket);
    saveSupportTicketsLocal(tickets);
    syncRecordToCloud('support_tickets', newTicket, 'upsert');
    logActivity(
      'support',
      `Yêu cầu hỗ trợ mới #${newTicket.id} từ "${newTicket.name}" (${newTicket.source}).`
    );

    return { ok: true, ticket: newTicket };
  }

  function updateSupportTicket(ticketId, updates) {
    const cleanId = (ticketId || '').replace(/^#/, '');
    const tickets = getSupportTickets();
    const idx = tickets.findIndex((t) => t.id === cleanId);
    if (idx === -1) return { ok: false, error: 'Không tìm thấy mã hỗ trợ.' };

    const nowStr = new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    tickets[idx] = {
      ...tickets[idx],
      ...updates,
      updatedAt: nowStr,
    };

    saveSupportTicketsLocal(tickets);
    syncRecordToCloud('support_tickets', tickets[idx], 'upsert');
    logActivity(
      'support',
      `Cập nhật yêu cầu #${cleanId} → Trạng thái: "${tickets[idx].status}".`
    );

    return { ok: true, ticket: tickets[idx] };
  }

  function deleteSupportTicket(ticketId) {
    const cleanId = (ticketId || '').replace(/^#/, '');
    const tickets = getSupportTickets();
    const target = tickets.find((t) => t.id === cleanId);
    if (!target) return { ok: false, error: 'Không tìm thấy yêu cầu hỗ trợ.' };

    const filtered = tickets.filter((t) => t.id !== cleanId);
    saveSupportTicketsLocal(filtered);
    syncRecordToCloud('support_tickets', { id: cleanId }, 'delete');
    logActivity('support', `Đã xóa yêu cầu hỗ trợ #${cleanId} của "${target.name}".`);
    return { ok: true };
  }

  /* --------------------------------------------------------------------------
     8. NHẬT KÝ HOẠT ĐỘNG HỆ THỐNG & THỐNG KÊ DASHBOARD
     -------------------------------------------------------------------------- */
  function getActivityLogs() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.ACTIVITY)) || [];
    } catch {
      return [];
    }
  }

  function logActivity(category, message) {
    const logs = getActivityLogs();
    const entry = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      category, // 'order' | 'user' | 'support' | 'auth'
      message,
      time: new Date().toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
      }),
    };
    logs.unshift(entry);
    localStorage.setItem(KEYS.ACTIVITY, JSON.stringify(logs.slice(0, 40)));
    broadcast('activity_logged', entry);
  }

  function getDashboardStats() {
    const users = getUsers();
    const orders = getOrders();
    const tickets = getSupportTickets();

    const pendingOrders = orders.filter(
      (o) => o.status === 'Chờ xác nhận' || o.status === 'Đang chuẩn bị'
    ).length;
    const completedOrders = orders.filter((o) => o.status === 'Hoàn thành').length;

    const activeUsers = users.filter((u) => u.status !== 'locked').length;
    const adminUsers = users.filter((u) => u.role === 'admin').length;

    const openTickets = tickets.filter(
      (t) => t.status === 'Mới tiếp nhận' || t.status === 'Đang xử lý'
    ).length;

    // Tính tổng doanh thu các đơn đã có giá số
    let estimatedRevenue = 0;
    orders.forEach((o) => {
      if (o.status !== 'Đã hủy' && o.total) {
        const digits = String(o.total).replace(/[^\d]/g, '');
        if (digits) estimatedRevenue += parseInt(digits, 10);
      }
    });

    return {
      totalOrders: orders.length,
      pendingOrders,
      completedOrders,
      totalUsers: users.length,
      activeUsers,
      adminUsers,
      totalTickets: tickets.length,
      openTickets,
      estimatedRevenue,
    };
  }

  /* --------------------------------------------------------------------------
     9. EXPORT GLOBAL SDK (`window.TTBaaS`)
     -------------------------------------------------------------------------- */
  global.TTBaaS = {
    KEYS,
    TOPIC_LABELS,
    // Config & Cloud Sync
    getConfig,
    saveConfig,
    isSupabaseConfigured,
    isFirebaseConfigured,
    syncFromCloud,
    pushAllLocalToCloud,
    // Users & Auth
    getUsers,
    getCurrentUser,
    setCurrentUser,
    loginUser,
    registerUser,
    updateUser,
    deleteUser,
    // Orders
    getOrders,
    getUserOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    // Support Tickets
    getSupportTickets,
    createSupportTicket,
    updateSupportTicket,
    deleteSupportTicket,
    // Stats & Realtime
    getDashboardStats,
    getActivityLogs,
    logActivity,
    onChange(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };

  // Tự động đồng bộ dữ liệu với Supabase Cloud BaaS ngay khi khởi chạy
  syncFromCloud();
})(window);

