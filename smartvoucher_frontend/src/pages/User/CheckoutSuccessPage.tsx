import { CheckCircle2, ClipboardList, Home, Ticket } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';

type CheckoutReceipt = {
  subtotal: string;
  discount: string;
  final_total: string;
};

type CheckoutState = {
  orderId?: number;
  externalOrderId?: string;
  receipt?: CheckoutReceipt;
};

const formatCurrency = (value: string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));

export default function CheckoutSuccessPage() {
  const location = useLocation();
  const state = location.state as CheckoutState | null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#020617] px-4 py-10 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl sm:p-10">
        <CheckCircle2 className="mx-auto size-16 text-emerald-400" />
        <p className="mt-5 text-sm font-bold uppercase tracking-widest text-emerald-300">Thanh toán thành công</p>
        <h1 className="mt-2 text-3xl font-black">Đơn hàng đã được xác nhận</h1>
        <p className="mt-3 text-slate-400">
          Đơn hàng đã chuyển sang trạng thái đã thanh toán. Bạn có thể xem chi tiết trong lịch sử đơn hàng.
        </p>

        {state?.externalOrderId && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Mã đơn hàng</p>
            <p className="mt-1 font-mono text-lg font-bold">{state.externalOrderId}</p>
          </div>
        )}

        {state?.receipt && (
          <div className="mt-5 space-y-2 border-t border-white/10 pt-5 text-sm">
            <p className="flex justify-between text-slate-300"><span>Tạm tính</span><span>{formatCurrency(state.receipt.subtotal)}</span></p>
            <p className="flex justify-between text-emerald-300"><span>Giảm giá</span><span>-{formatCurrency(state.receipt.discount)}</span></p>
            <p className="flex justify-between pt-2 text-base font-black"><span>Tổng thanh toán</span><span className="text-cyan-300">{formatCurrency(state.receipt.final_total)}</span></p>
          </div>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild><Link to="/shop/orders"><ClipboardList className="mr-2 size-4" />Xem đơn hàng</Link></Button>
          <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
            <Link to="/vouchers"><Ticket className="mr-2 size-4" />Ví Voucher</Link>
          </Button>
          <Button asChild variant="ghost" className="text-slate-300 hover:text-white">
            <Link to="/shop"><Home className="mr-2 size-4" />Cửa hàng</Link>
          </Button>
        </div>
        {state?.orderId && <p className="mt-5 text-xs text-slate-500">Mã tham chiếu: #{state.orderId}</p>}
      </section>
    </main>
  );
}
