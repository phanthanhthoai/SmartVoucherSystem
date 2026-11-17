import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, RefreshCw, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { userApi, type WalletVoucher } from '@/services/apiService';

const formatCurrency = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value ?? 0));

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value));

const getVoucherState = (voucher: WalletVoucher, now: number) => {
  if (voucher.is_used) return { label: 'Đã sử dụng', style: 'border-slate-500/30 bg-slate-500/10 text-slate-300' };
  if (!voucher.is_active) return { label: 'Đang tạm khóa', style: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
  if (new Date(voucher.start_date).getTime() > now) return { label: 'Chưa bắt đầu', style: 'border-blue-500/30 bg-blue-500/10 text-blue-300' };
  if (new Date(voucher.expiry_date).getTime() < now) return { label: 'Đã hết hạn', style: 'border-rose-500/30 bg-rose-500/10 text-rose-300' };
  return { label: 'Có thể sử dụng', style: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
};

export default function MyVouchersPage() {
  const [vouchers, setVouchers] = useState<WalletVoucher[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    try {
      setVouchers(await userApi.getMyVouchers());
    } catch {
      toast.error('Không thể tải ví voucher. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchVouchers();
  }, [fetchVouchers]);

  const now = Date.now();

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Button asChild variant="ghost" className="mb-6 text-slate-300 hover:text-white">
          <Link to="/shop"><ArrowLeft className="mr-2 size-4" />Quay lại cửa hàng</Link>
        </Button>

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-400">
              <Ticket className="size-4" /> Ưu đãi dành cho bạn
            </p>
            <h1 className="text-3xl font-black sm:text-4xl">Ví Voucher</h1>
            <p className="mt-2 text-slate-400">Theo dõi mã đã nhận, thời hạn và trạng thái sử dụng.</p>
          </div>
          <Button variant="outline" onClick={() => void fetchVouchers()} disabled={loading} className="w-fit border-white/20 bg-white/5 text-white hover:bg-white/10">
            <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />Làm mới
          </Button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] py-16 text-center text-slate-400">Đang tải ví voucher...</div>
        ) : vouchers.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <Ticket className="mx-auto mb-4 size-10 text-slate-500" />
            <h2 className="text-lg font-bold">Bạn chưa có voucher</h2>
            <p className="mt-2 text-slate-400">Voucher được phân phối sẽ xuất hiện tại đây.</p>
            <Button asChild className="mt-6"><Link to="/shop">Khám phá cửa hàng</Link></Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {vouchers.map((voucher) => {
              const state = getVoucherState(voucher, now);
              const amount = voucher.type === 'percent'
                ? `Giảm ${Number(voucher.value)}%`
                : `Giảm ${formatCurrency(voucher.value)}`;
              return (
                <article key={`${voucher.id}-${voucher.code}`} className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
                  <div className="absolute -right-8 -top-8 size-28 rounded-full bg-cyan-500/10 blur-2xl" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 font-mono text-sm font-black tracking-wider text-cyan-300">{voucher.code}</span>
                      <h2 className="mt-4 text-xl font-black">{voucher.title || amount}</h2>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${state.style}`}>{state.label}</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-emerald-300">{amount}</p>
                  <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm text-slate-300">
                    <p>Đơn tối thiểu: <span className="font-semibold text-white">{formatCurrency(voucher.min_spend)}</span></p>
                    <p>Áp dụng cho: <span className="font-semibold text-white">{voucher.product_type || 'Tất cả sản phẩm'}</span></p>
                    <p className="flex items-center gap-2"><CalendarDays className="size-4 text-cyan-400" />Hạn dùng đến {formatDate(voucher.expiry_date)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
