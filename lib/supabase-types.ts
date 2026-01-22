// Supabaseデータベース型定義
export interface Database {
  public: {
    Tables: {
      workers: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      purchases: {
        Row: {
          id: string;
          worker_id: string;
          card_name: string;
          card_number: string | null;
          rarity: string | null;
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
          status: 'stock' | 'listing' | 'sold';
          actual_selling_price: number | null;
          sold_at: string | null;
        };
        Insert: {
          id?: string;
          worker_id: string;
          card_name: string;
          card_number?: string | null;
          rarity?: string | null;
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
          created_at?: string;
          status?: 'stock' | 'listing' | 'sold';
          actual_selling_price?: number | null;
          sold_at?: string | null;
        };
        Update: {
          id?: string;
          worker_id?: string;
          card_name?: string;
          card_number?: string | null;
          rarity?: string | null;
          purchase_price?: number;
          selling_price?: number;
          platform_id?: string;
          platform_name?: string;
          fee_rate?: number;
          fee_amount?: number;
          shipping_cost?: number;
          other_costs_total?: number;
          net_revenue?: number;
          profit?: number;
          roi?: number;
          sales_count_3days?: number | null;
          judgment?: 'buy' | 'consider' | 'skip' | null;
          notes?: string | null;
          created_at?: string;
          status?: 'stock' | 'listing' | 'sold';
          actual_selling_price?: number | null;
          sold_at?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
