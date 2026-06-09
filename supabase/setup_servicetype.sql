-- ============================================================
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- PURPOSE: 1. Create servicetype reference table
--          2. Insert initial service types for KFC Vietnam
--             ("All Channels" được insert đầu tiên → id nhỏ nhất → hiển thị trên cùng)
--          3. Fix VARCHAR(20) constraint on promotiondetail.servicetype
-- ============================================================

-- 1. Tạo bảng servicetype
CREATE TABLE IF NOT EXISTS servicetype (
  id     SERIAL  PRIMARY KEY,
  name   TEXT    NOT NULL UNIQUE,
  active BOOLEAN DEFAULT TRUE
);

-- 2. Insert dữ liệu ban đầu — "All Channels" đứng đầu tiên
--    Frontend sắp xếp theo id, nên item nào có id nhỏ hơn sẽ hiển thị trước
INSERT INTO servicetype (name) VALUES
  ('All Channels'),
  ('Dine-in'),
  ('Take Away'),
  ('Delivery'),
  ('Drive-thru'),
  ('GrabFood'),
  ('ShopeeFood'),
  ('Baemin')
ON CONFLICT (name) DO NOTHING;

-- 3. Mở rộng cột servicetype trong promotiondetail (bỏ giới hạn 20 ký tự)
ALTER TABLE promotiondetail ALTER COLUMN servicetype TYPE TEXT;

-- ============================================================
-- NẾU BẢNG ĐÃ ĐƯỢC TẠO TRƯỚC ĐÓ (All Channels có id cao):
-- Chạy đoạn bên dưới để reset lại thứ tự id
-- ============================================================

-- Bước 1: Xóa toàn bộ dữ liệu cũ
-- TRUNCATE servicetype RESTART IDENTITY;

-- Bước 2: Insert lại theo đúng thứ tự muốn hiển thị
-- INSERT INTO servicetype (name) VALUES
--   ('All Channels'),
--   ('Dine-in'),
--   ('Take Away'),
--   ('Delivery'),
--   ('Drive-thru'),
--   ('GrabFood'),
--   ('ShopeeFood'),
--   ('Baemin');
