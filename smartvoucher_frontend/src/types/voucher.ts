export interface VoucherRule {
  customer_group?: 'all' | 'new' | 'vip' | 'loyal' | null;
  required_role: string | null;
  birthday_only: boolean;
  min_order_amount: number;
  min_items: number;
  required_product_type: string | null;
  period_type: 'day' | 'week' | 'month' | null;
  lookback_days?: number;
  min_accumulated_spent?: number;
  min_accumulated_orders?: number;
  target_month?: number | null;
  target_year?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  buy_quantity?: number | null;
  get_quantity?: number | null;
  get_product_type?: string | null;
}

export interface Voucher {
  id?: number;
  code: string;
  title: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_discount_amount?: number; // Even though not in model, often useful in UI or added later
  release_date: string;
  expiry_date: string;
  quantity: number;
  used_count?: number;
  is_active: boolean;
  event_type: string | null;
  rule: VoucherRule;
  created_at?: string;
}

export type CreateVoucherPayload = Omit<Voucher, 'id' | 'used_count' | 'created_at'>;
export type UpdateVoucherPayload = Partial<CreateVoucherPayload>;
