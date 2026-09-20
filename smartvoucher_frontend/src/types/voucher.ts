export interface VoucherRule {
  required_role: string | null;
  birthday_only: boolean;
  min_order_amount: number;
  min_items: number;
  required_product_type: string | null;
  period_type: 'day' | 'week' | 'month' | null;
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
