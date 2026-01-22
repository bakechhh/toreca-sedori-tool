-- Supabase テーブル作成SQL
-- Supabase Dashboard > SQL Editor で実行してください

-- 作業者テーブル
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 仕入れ記録テーブル
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  card_name TEXT NOT NULL,
  card_number TEXT,
  rarity TEXT,
  is_psa BOOLEAN NOT NULL DEFAULT FALSE,
  psa_grade INTEGER CHECK (psa_grade IS NULL OR (psa_grade >= 1 AND psa_grade <= 10)),
  purchase_price INTEGER NOT NULL,
  selling_price INTEGER NOT NULL,
  platform_id TEXT NOT NULL,
  platform_name TEXT NOT NULL,
  fee_rate DECIMAL(5,2) NOT NULL,
  fee_amount INTEGER NOT NULL,
  shipping_cost INTEGER NOT NULL DEFAULT 0,
  other_costs_total INTEGER NOT NULL DEFAULT 0,
  net_revenue INTEGER NOT NULL,
  profit INTEGER NOT NULL,
  roi DECIMAL(10,2) NOT NULL,
  sales_count_3days INTEGER,
  judgment TEXT CHECK (judgment IN ('buy', 'consider', 'skip')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- 在庫管理用カラム
  status TEXT NOT NULL DEFAULT 'stock' CHECK (status IN ('stock', 'listing', 'sold')),
  actual_selling_price INTEGER,
  sold_at TIMESTAMPTZ
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_purchases_worker_id ON purchases(worker_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);

-- RLS (Row Level Security) ポリシー
-- 注意: 認証なしで使用する場合はRLSを無効にするか、以下のポリシーを設定

-- RLSを無効にする場合（開発・テスト用）
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- 全員がアクセスできるポリシー（認証なしで使用する場合）
CREATE POLICY "Allow all access to workers" ON workers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to purchases" ON purchases
  FOR ALL USING (true) WITH CHECK (true);

-- 初期データ（必要に応じて）
-- INSERT INTO workers (name) VALUES ('作業者A'), ('作業者B');

-- ========================================
-- 既存テーブルへのカラム追加（マイグレーション用）
-- ※ 新規作成の場合は上記のCREATE TABLEに含まれているので不要
-- ========================================

-- PSA鑑定情報カラムを追加（既存テーブルがある場合）
-- ALTER TABLE purchases ADD COLUMN IF NOT EXISTS is_psa BOOLEAN NOT NULL DEFAULT FALSE;
-- ALTER TABLE purchases ADD COLUMN IF NOT EXISTS psa_grade INTEGER CHECK (psa_grade IS NULL OR (psa_grade >= 1 AND psa_grade <= 10));

-- 在庫管理カラムを追加（既存テーブルがある場合）
-- ALTER TABLE purchases ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'stock' CHECK (status IN ('stock', 'listing', 'sold'));
-- ALTER TABLE purchases ADD COLUMN IF NOT EXISTS actual_selling_price INTEGER;
-- ALTER TABLE purchases ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;
-- CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
