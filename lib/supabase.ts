import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase環境変数が設定されていません。データ同期機能は無効です。');
}

// 型安全性よりも柔軟性を優先するため、型パラメータなしで作成
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Supabaseが有効かどうか
export const isSupabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

// 作業者関連
export interface Worker {
  id: string;
  name: string;
  created_at: string;
}

export async function getWorkers(): Promise<Worker[]> {
  if (!isSupabaseEnabled) return [];

  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .order('name');

  if (error) {
    console.error('作業者取得エラー:', error);
    return [];
  }
  return data ?? [];
}

export async function addWorker(name: string): Promise<Worker | null> {
  if (!isSupabaseEnabled) return null;

  const { data, error } = await supabase
    .from('workers')
    .insert({ name })
    .select()
    .single();

  if (error) {
    console.error('作業者追加エラー:', error);
    return null;
  }
  return data;
}

export async function deleteWorker(id: string): Promise<boolean> {
  if (!isSupabaseEnabled) return false;

  const { error } = await supabase
    .from('workers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('作業者削除エラー:', error);
    return false;
  }
  return true;
}

// 在庫ステータス型
export type PurchaseStatus = 'stock' | 'listing' | 'sold';

// 仕入れ記録関連
export interface Purchase {
  id: string;
  worker_id: string;
  card_name: string;
  card_number: string | null;
  rarity: string | null;
  is_psa: boolean;
  psa_grade: number | null;
  purchase_price: number;
  selling_price: number;
  platform_id: string;
  platform_name: string;
  fee_rate: number;
  fee_amount: number;
  shipping_cost: number;
  other_costs_total: number;
  net_revenue: number;
  profit: number;
  roi: number;
  sales_count_3days: number | null;
  judgment: 'buy' | 'consider' | 'skip' | null;
  notes: string | null;
  created_at: string;
  // 在庫管理用
  status: PurchaseStatus;
  actual_selling_price: number | null;
  sold_at: string | null;
}

export interface PurchaseInput {
  worker_id: string;
  card_name: string;
  card_number?: string | null;
  rarity?: string | null;
  is_psa?: boolean;
  psa_grade?: number | null;
  purchase_price: number;
  selling_price: number;
  platform_id: string;
  platform_name: string;
  fee_rate: number;
  fee_amount: number;
  shipping_cost: number;
  other_costs_total: number;
  net_revenue: number;
  profit: number;
  roi: number;
  sales_count_3days?: number | null;
  judgment?: 'buy' | 'consider' | 'skip' | null;
  notes?: string | null;
  // 在庫管理用（オプション、デフォルトは'stock'）
  status?: PurchaseStatus;
  actual_selling_price?: number | null;
  sold_at?: string | null;
}

export async function savePurchase(input: PurchaseInput): Promise<Purchase | null> {
  if (!isSupabaseEnabled) return null;

  const { data, error } = await supabase
    .from('purchases')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('仕入れ保存エラー:', error);
    return null;
  }
  return data;
}

export async function getPurchases(workerId?: string): Promise<Purchase[]> {
  if (!isSupabaseEnabled) return [];

  let query = supabase
    .from('purchases')
    .select('*')
    .order('created_at', { ascending: false });

  if (workerId) {
    query = query.eq('worker_id', workerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('仕入れ履歴取得エラー:', error);
    return [];
  }
  return data ?? [];
}

export async function deletePurchase(id: string): Promise<boolean> {
  if (!isSupabaseEnabled) return false;

  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('仕入れ削除エラー:', error);
    return false;
  }
  return true;
}

// ステータス別の仕入れ取得
export async function getPurchasesByStatus(
  status: PurchaseStatus,
  workerId?: string
): Promise<Purchase[]> {
  if (!isSupabaseEnabled) return [];

  let query = supabase
    .from('purchases')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (workerId) {
    query = query.eq('worker_id', workerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('ステータス別仕入れ取得エラー:', error);
    return [];
  }
  return data ?? [];
}

// ステータス更新
export async function updatePurchaseStatus(
  id: string,
  status: PurchaseStatus,
  actualSellingPrice?: number
): Promise<Purchase | null> {
  if (!isSupabaseEnabled) return null;

  const updateData: {
    status: PurchaseStatus;
    actual_selling_price?: number;
    sold_at?: string;
  } = { status };

  // 販売済みの場合は販売日時と実際の販売価格を記録
  if (status === 'sold') {
    updateData.sold_at = new Date().toISOString();
    if (actualSellingPrice !== undefined) {
      updateData.actual_selling_price = actualSellingPrice;
    }
  }

  const { data, error } = await supabase
    .from('purchases')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('ステータス更新エラー:', error);
    return null;
  }
  return data;
}

// 仕入れ情報更新（全般）
export async function updatePurchase(
  id: string,
  updates: Partial<PurchaseInput>
): Promise<Purchase | null> {
  if (!isSupabaseEnabled) return null;

  const { data, error } = await supabase
    .from('purchases')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('仕入れ更新エラー:', error);
    return null;
  }
  return data;
}

// 集計データ取得
export interface PurchaseStats {
  totalPurchases: number;
  totalStock: number;
  totalListing: number;
  totalSold: number;
  totalPurchaseAmount: number;
  totalSoldAmount: number;
  totalProfit: number;
  averageRoi: number;
}

export async function getPurchaseStats(workerId?: string): Promise<PurchaseStats> {
  const defaultStats: PurchaseStats = {
    totalPurchases: 0,
    totalStock: 0,
    totalListing: 0,
    totalSold: 0,
    totalPurchaseAmount: 0,
    totalSoldAmount: 0,
    totalProfit: 0,
    averageRoi: 0,
  };

  if (!isSupabaseEnabled) return defaultStats;

  let query = supabase.from('purchases').select('*');

  if (workerId) {
    query = query.eq('worker_id', workerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('集計データ取得エラー:', error);
    return defaultStats;
  }

  if (!data || data.length === 0) return defaultStats;

  const purchases = data as Purchase[];
  const soldPurchases = purchases.filter((p) => p.status === 'sold');

  const totalPurchaseAmount = purchases.reduce((sum, p) => sum + p.purchase_price, 0);
  const totalSoldAmount = soldPurchases.reduce(
    (sum, p) => sum + (p.actual_selling_price ?? p.selling_price),
    0
  );

  // 販売済み商品の実際の利益計算
  const totalProfit = soldPurchases.reduce((sum, p) => {
    const actualSelling = p.actual_selling_price ?? p.selling_price;
    const fee = Math.floor(actualSelling * (p.fee_rate / 100));
    const netRevenue = actualSelling - fee - p.shipping_cost - p.other_costs_total;
    return sum + (netRevenue - p.purchase_price);
  }, 0);

  const roiSum = soldPurchases.reduce((sum, p) => {
    const actualSelling = p.actual_selling_price ?? p.selling_price;
    const fee = Math.floor(actualSelling * (p.fee_rate / 100));
    const netRevenue = actualSelling - fee - p.shipping_cost - p.other_costs_total;
    const profit = netRevenue - p.purchase_price;
    return sum + (profit / p.purchase_price) * 100;
  }, 0);

  return {
    totalPurchases: purchases.length,
    totalStock: purchases.filter((p) => p.status === 'stock').length,
    totalListing: purchases.filter((p) => p.status === 'listing').length,
    totalSold: soldPurchases.length,
    totalPurchaseAmount,
    totalSoldAmount,
    totalProfit,
    averageRoi: soldPurchases.length > 0 ? roiSum / soldPurchases.length : 0,
  };
}

// 月別集計
export interface MonthlyStats {
  month: string; // YYYY-MM形式
  purchaseCount: number;
  soldCount: number;
  purchaseAmount: number;
  soldAmount: number;
  profit: number;
}

export async function getMonthlyStats(workerId?: string): Promise<MonthlyStats[]> {
  if (!isSupabaseEnabled) return [];

  let query = supabase.from('purchases').select('*');

  if (workerId) {
    query = query.eq('worker_id', workerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('月別集計取得エラー:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  const purchases = data as Purchase[];
  const monthlyMap = new Map<string, MonthlyStats>();

  purchases.forEach((p) => {
    const month = p.created_at.slice(0, 7); // YYYY-MM
    const existing = monthlyMap.get(month) || {
      month,
      purchaseCount: 0,
      soldCount: 0,
      purchaseAmount: 0,
      soldAmount: 0,
      profit: 0,
    };

    existing.purchaseCount += 1;
    existing.purchaseAmount += p.purchase_price;

    if (p.status === 'sold') {
      existing.soldCount += 1;
      const actualSelling = p.actual_selling_price ?? p.selling_price;
      existing.soldAmount += actualSelling;
      const fee = Math.floor(actualSelling * (p.fee_rate / 100));
      const netRevenue = actualSelling - fee - p.shipping_cost - p.other_costs_total;
      existing.profit += netRevenue - p.purchase_price;
    }

    monthlyMap.set(month, existing);
  });

  return Array.from(monthlyMap.values()).sort((a, b) => b.month.localeCompare(a.month));
}
