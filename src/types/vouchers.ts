// src/types/vouchers.ts
export interface Voucher {
  id: string;
  code: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  usage_limit: number;
  usage_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  event_id: string | null;
}