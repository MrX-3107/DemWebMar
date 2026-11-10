-- ============================================================================
-- TT BOTTLY – SUPABASE CLOUD BaaS DATABASE SCHEMA & RLS POLICIES
-- Hướng dẫn: Sao chép toàn bộ nội dung file này vào mục "SQL Editor" trên
-- bảng điều khiển Supabase (https://supabase.com/dashboard) và nhấn "Run".
-- ============================================================================

-- 1. BẢNG NGƯỜI DÙNG & TÀI KHOẢN (users)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  fullname TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'customer', -- 'admin' | 'customer'
  status TEXT DEFAULT 'active', -- 'active' | 'locked'
  address TEXT DEFAULT '',
  "createdAt" TEXT DEFAULT '',
  "lastLogin" TEXT DEFAULT ''
);

-- 2. BẢNG ĐƠN HÀNG CỦA KHÁCH HÀNG (orders)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  "userId" TEXT DEFAULT 'guest',
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerEmail" TEXT DEFAULT '',
  province TEXT DEFAULT '',
  address TEXT NOT NULL,
  product TEXT NOT NULL,
  qty INTEGER DEFAULT 1,
  addons TEXT DEFAULT '',
  total TEXT DEFAULT 'Liên hệ',
  status TEXT DEFAULT 'Chờ xác nhận',
  payment TEXT DEFAULT 'COD',
  note TEXT DEFAULT '',
  "adminNote" TEXT DEFAULT '',
  date TEXT DEFAULT '',
  "createdAt" TEXT DEFAULT ''
);

-- 3. BẢNG YÊU CẦU HỖ TRỢ KHÁCH HÀNG (support_tickets)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  topic TEXT DEFAULT 'other',
  "topicLabel" TEXT DEFAULT 'Yêu cầu hỗ trợ CSKH',
  source TEXT DEFAULT 'Form Hỗ Trợ',
  note TEXT NOT NULL,
  status TEXT DEFAULT 'Mới tiếp nhận',
  priority TEXT DEFAULT 'Trung bình',
  "adminReply" TEXT DEFAULT '',
  "createdAt" TEXT DEFAULT '',
  "updatedAt" TEXT DEFAULT ''
);

-- 4. CẤP QUYỀN DATA API (GRANT) & BẬT ROW LEVEL SECURITY (RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.users, public.orders, public.support_tickets TO anon, authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to users" ON public.users;
CREATE POLICY "Allow public access to users" ON public.users
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to orders" ON public.orders;
CREATE POLICY "Allow public access to orders" ON public.orders
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to support_tickets" ON public.support_tickets;
CREATE POLICY "Allow public access to support_tickets" ON public.support_tickets
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. KHỞI TẠO TÀI KHOẢN QUẢN TRỊ VIÊN MẶC ĐỊNH
INSERT INTO public.users (id, fullname, email, phone, password, role, status, address, "createdAt", "lastLogin")
VALUES
  ('usr_admin_1', 'Quản Trị Viên TT Bottly', 'admin@bottly.vn', '0966321069', 'admin123', 'admin', 'active', 'Tòa nhà Aquabottle, Cầu Giấy, Hà Nội', '01/10/2026', 'Hôm nay')
ON CONFLICT (id) DO NOTHING;
