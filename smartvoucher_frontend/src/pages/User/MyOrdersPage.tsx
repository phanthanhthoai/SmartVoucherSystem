import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ClipboardList, Package, RefreshCw, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { orderApi, type CustomerOrder } from '@/services/apiService';

const currency = (value: string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));

const statusLabels: Record<CustomerOrder['status'], string> = {
  pending: 'Chờ xác nhận thanh toán',
  paid: 'Đã thanh toán',
  canceled: 'Đã hủy',
};

const statusStyles: Record<CustomerOrder['status'], string> = {
  pending: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  paid: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  canceled: 'border-slate-400/30 bg-slate-400/10 text-slate-300',
};

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = error.response;
    if (typeof response === 'object' && response !== null && 'data' in response) {
      const data = response.data;
      if (typeof data === 'object' && data !== null) {
        const values = Object.values(data);
        const message = values.flatMap((value) => Array.isArray(value) ? value : [value])
          .find((value): value is string => typeof value === 'string');
        if (message) return message;
      }
    }
  }
  return 'Không thể tải lịch sử đơn hàng. Vui lòng thử lại.';
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await orderApi.mine());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Button asChild variant="ghost" className="mb-6 text-slate-300 hover:text-white">
          <Link to="/shop"><ArrowLeft className="mr-2 size-4" />Quay lại cửa hàng</Link>
        </Button>

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-400">
              <ClipboardList className="size-4" /> Tài khoản của bạn
            </p>
            <h1 className="text-3xl font-black sm:text-4xl">Đơn hàng của tôi</h1>
            <p className="mt-2 text-slate-400">Xem trạng thái, sản phẩm và voucher đã áp dụng.</p>
          </div>
          <Button variant="outline" onClick={() => void fetchOrders()} disabled={loading} className="w-fit border-white/20 bg-white/5 text-white hover:bg-white/10">
            <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />Làm mới
          </Button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] py-16 text-center text-slate-400">Đang tải đơn hàng...</div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <Package className="mx-auto mb-4 size-10 text-slate-500" />
            <h2 className="text-lg font-bold">Bạn chưa có đơn hàng</h2>
            <p className="mt-2 text-slate-400">Đơn hàng sau khi đặt sẽ được lưu tại đây.</p>
            <Button asChild className="mt-6"><Link to="/shop">Bắt đầu mua sắm</Link></Button>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => (
              <article key={order.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl sm:p-7">
                <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Mã đơn hàng</p>
                    <h2 className="mt-1 font-mono text-lg font-black">{order.external_order_id || `#${order.id}`}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.created_at))}
                    </p>
                  </div>
                  <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                </div>

                <div className="space-y-3 py-5">
                  {order.items.map((item, index) => (
                    <div key={`${order.id}-${index}`} className="flex items-start justify-between gap-4 text-sm">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="mt-1 text-slate-400">{item.quantity} × {currency(item.unit_price)}</p>
                      </div>
                      <p className="shrink-0 font-semibold">{currency(item.line_total)}</p>
                    </div>
                  ))}
                </div>

                {order.applied_voucher && (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm">
                    <span className="flex items-center gap-2 text-cyan-200">
                      <Ticket className="size-4" />{order.applied_voucher.title} ({order.applied_voucher.code})
                    </span>
                    <span className="font-bold text-emerald-300">-{currency(order.discount_amount)}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-white/10 pt-4 text-sm">
                  <span className="text-slate-400">Tạm tính</span>
                  <span>{currency(order.total_amount)}</span>
                </div>
                <div className="mt-2 flex justify-between text-base font-black">
                  <span>Tổng thanh toán</span>
                  <span className="text-cyan-300">{currency(order.final_total)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
