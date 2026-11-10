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
     2. KHỞI TẠO DỮ LIỆU MẪU (SEED DATA) CHO HỆ THỐNG
     -------------------------------------------------------------------------- */
  function initSeedData() {
    // 2.1. Seed Users (Bao gồm tài khoản Admin và Khách hàng)
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem(KEYS.USERS)) || [];
    } catch {
      users = [];
    }

    const defaultUsers = [
      {
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
      },
      {
        id: 'usr_demo_1',
        fullname: 'Nguyễn Văn A',
        email: 'demo@bottly.vn',
        phone: '0912345678',
        password: '123456',
        role: 'customer',
        status: 'active',
        address: 'Số 123 Đường Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',
        createdAt: '15/10/2026',
        lastLogin: 'Hôm nay',
      },
      {
        id: 'usr_cust_2',
        fullname: 'Trần Thị Mai Lan',
        email: 'lan.tran@gmail.com',
        phone: '0987654321',
        password: '123456',
        role: 'customer',
        status: 'active',
        address: '88 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội',
        createdAt: '28/10/2026',
        lastLogin: '05/11/2026',
      },
      {
        id: 'usr_cust_3',
        fullname: 'Lê Hoàng Minh',
        email: 'minh.le@company.vn',
        phone: '0905112233',
        password: '123456',
        role: 'customer',
        status: 'active',
        address: '45 Nguyễn Văn Linh, Quận Hải Châu, Đà Nẵng',
        createdAt: '02/11/2026',
        lastLogin: '08/11/2026',
      },
    ];

    if (users.length === 0) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(defaultUsers));
    } else {
      // Đảm bảo luôn có tài khoản admin@bottly.vn và chuẩn hóa trường role/status
      let updated = false;
      users = users.map((u) => {
        const copy = { ...u };
        if (!copy.role) {
          copy.role =
            copy.email && copy.email.toLowerCase() === 'admin@bottly.vn'
              ? 'admin'
              : 'customer';
          updated = true;
        }
        if (!copy.status) {
          copy.status = 'active';
          updated = true;
        }
        return copy;
      });
      if (!users.some((u) => u.email.toLowerCase() === 'admin@bottly.vn')) {
        users.unshift(defaultUsers[0]);
        updated = true;
      }
      if (updated) {
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      }
    }

    // 2.2. Seed Orders
    let orders = [];
    try {
      orders = JSON.parse(localStorage.getItem(KEYS.ORDERS)) || [];
    } catch {
      orders = [];
    }

    if (orders.length === 0) {
      const demoOrders = [
        {
          id: 'TTB-883921',
          userId: 'usr_demo_1',
          customerName: 'Nguyễn Văn A',
          customerPhone: '0912345678',
          customerEmail: 'demo@bottly.vn',
          province: 'TP. Hồ Chí Minh',
          address: 'Số 123 Đường Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh',
          product: 'Bình Giữ Nhiệt Sport 700ml',
          qty: 1,
          addons: '',
          total: 'Liên hệ',
          status: 'Đã xác nhận',
          payment: 'COD',
          note: '',
          adminNote: '',
          date: '05/11/2026',
          createdAt: '2026-11-05T09:30:00.000Z',
        },
        {
          id: 'TTB-792410',
          userId: 'usr_cust_2',
          customerName: 'Trần Thị Mai Lan',
          customerPhone: '0987654321',
          customerEmail: 'lan.tran@gmail.com',
          province: 'Hà Nội',
          address: '88 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội',
          product: 'Combo 2 Bình Everyday Daily Duo',
          qty: 1,
          addons: '',
          total: 'Liên hệ',
          status: 'Chờ xác nhận',
          payment: 'BANK',
          note: '',
          adminNote: '',
          date: '08/11/2026',
          createdAt: '2026-11-08T14:20:00.000Z',
        },
        {
          id: 'TTB-651094',
          userId: 'usr_cust_3',
          customerName: 'Lê Hoàng Minh',
          customerPhone: '0905112233',
          customerEmail: 'minh.le@company.vn',
          province: 'Đà Nẵng',
          address: '45 Nguyễn Văn Linh, Quận Hải Châu, Đà Nẵng',
          product: 'Bộ 3 Bình Everyday Daily Family',
          qty: 2,
          addons: '',
          total: 'Liên hệ',
          status: 'Đang giao hàng',
          payment: 'BANK',
          note: '',
          adminNote: '',
          date: '07/11/2026',
          createdAt: '2026-11-07T11:15:00.000Z',
        },
      ];
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(demoOrders));
    } else {
      // Chuẩn hóa các đơn hàng cũ nếu thiếu trường customerName / customerPhone
      let updated = false;
      orders = orders.map((o) => {
        const copy = { ...o };
        if (!copy.customerName) {
          copy.customerName = copy.name || 'Nguyễn Văn A';
          updated = true;
        }
        if (!copy.customerPhone) {
          copy.customerPhone = copy.phone || '0912345678';
          updated = true;
        }
        if (!copy.customerEmail) {
          copy.customerEmail = copy.email || 'demo@bottly.vn';
          updated = true;
        }
        if (!copy.address) {
          copy.address = 'Số 123 Đường Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh';
          updated = true;
        }
        if (!copy.status) {
          copy.status = 'Chờ xác nhận';
          updated = true;
        }
        return copy;
      });
      if (updated) {
        localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
      }
    }

    // 2.3. Seed Support Tickets
    let tickets = [];
    try {
      tickets = JSON.parse(localStorage.getItem(KEYS.TICKETS)) || [];
    } catch {
      tickets = [];
    }

    if (tickets.length === 0) {
      const demoTickets = [
        {
          id: 'CSKH-582910',
          name: 'Trần Thị Mai Lan',
          phone: '0987654321',
          email: 'lan.tran@gmail.com',
          topic: 'corporate',
          topicLabel: 'Đặt hàng số lượng lớn / Khắc tên doanh nghiệp',
          source: 'Form Hỗ Trợ',
          note: 'Mình muốn đặt 50 bình giữ nhiệt 500ml màu Xanh lục bảo khắc logo công ty làm quà cuối năm, báo giá chiết khấu giúp mình nhé.',
          status: 'Mới tiếp nhận',
          priority: 'Cao',
          adminReply: '',
          createdAt: '09/11/2026 09:15',
          updatedAt: '09/11/2026 09:15',
        },
        {
          id: 'CSKH-349182',
          name: 'Nguyễn Văn A',
          phone: '0912345678',
          email: 'demo@bottly.vn',
          topic: 'shipping',
          topicLabel: 'Tra cứu vận chuyển / Giao hàng chậm',
          source: 'Form Hỗ Trợ',
          note: 'Shop kiểm tra giúp mình đơn hàng TTB-883921 bao giờ giao tới Quận 1 TP.HCM nhé?',
          status: 'Đang xử lý',
          priority: 'Trung bình',
          adminReply: 'Đã liên hệ bưu cục, dự kiến giao trước 16h chiều nay.',
          createdAt: '08/11/2026 15:40',
          updatedAt: '08/11/2026 16:05',
        },
        {
          id: 'CSKH-120495',
          name: 'Phạm Quốc Bảo',
          phone: '0938123999',
          email: 'baopham@gmail.com',
          topic: 'warranty',
          topicLabel: 'Bảo hành / Đổi trả sản phẩm',
          source: 'Form Hỗ Trợ',
          note: 'Mình muốn mua thêm nắp thay thế và gioăng silicone cho bình 700ml.',
          status: 'Đã giải quyết',
          priority: 'Thấp',
          adminReply: 'Đã gửi tặng khách 1 bộ gioăng silicone mới kèm đơn phụ kiện.',
          createdAt: '04/11/2026 10:20',
          updatedAt: '04/11/2026 11:00',
        },
      ];
      localStorage.setItem(KEYS.TICKETS, JSON.stringify(demoTickets));
    } else {
      let updatedTickets = false;
      tickets = tickets.map((t) => {
        if (t.source !== 'Form Hỗ Trợ') {
          updatedTickets = true;
          return { ...t, source: 'Form Hỗ Trợ' };
        }
        return t;
      });
      if (updatedTickets) {
        localStorage.setItem(KEYS.TICKETS, JSON.stringify(tickets));
      }
    }
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
    try {
      if (isSupabaseConfigured(cfg)) {
        const [cloudUsers, cloudOrders, cloudTickets] = await Promise.all([
          supabaseRequest('users', 'GET', null, 'select=*'),
          supabaseRequest('orders', 'GET', null, 'select=*'),
          supabaseRequest('support_tickets', 'GET', null, 'select=*'),
        ]);
        if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
          localStorage.setItem(KEYS.USERS, JSON.stringify(cloudUsers));
        }
        if (Array.isArray(cloudOrders) && cloudOrders.length > 0) {
          localStorage.setItem(KEYS.ORDERS, JSON.stringify(cloudOrders));
        }
        if (Array.isArray(cloudTickets) && cloudTickets.length > 0) {
          localStorage.setItem(KEYS.TICKETS, JSON.stringify(cloudTickets));
        }
        // Nếu bảng trên Supabase mới tạo chưa có đơn hàng/phiếu hỗ trợ, tự động đẩy dữ liệu khởi tạo lên Cloud
        if (
          Array.isArray(cloudOrders) &&
          cloudOrders.length === 0 &&
          Array.isArray(cloudTickets) &&
          cloudTickets.length === 0
        ) {
          await pushAllLocalToCloud();
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
        if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
          localStorage.setItem(KEYS.USERS, JSON.stringify(cloudUsers));
        }
        if (Array.isArray(cloudOrders) && cloudOrders.length > 0) {
          localStorage.setItem(KEYS.ORDERS, JSON.stringify(cloudOrders));
        }
        if (Array.isArray(cloudTickets) && cloudTickets.length > 0) {
          localStorage.setItem(KEYS.TICKETS, JSON.stringify(cloudTickets));
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
    try {
      return JSON.parse(localStorage.getItem(KEYS.ORDERS)) || [];
    } catch {
      return [];
    }
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

