import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmModal } from '@/components/layout/admin/confirmModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { orderApi, voucherApi, type AdminOrder } from '@/services/apiService';

const formatCurrency = (value: string) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));

const statusLabels: Record<AdminOrder['status'], string> = {
  pending: 'Chờ xác nhận thanh toán',
  paid: 'Đã thanh toán',
  canceled: 'Đã hủy',
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
  return 'Đã xảy ra lỗi, vui lòng thử lại.';
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState<AdminOrder | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await orderApi.adminList());
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const confirmPayment = async () => {
    if (!confirmTarget) return;
    setConfirming(true);
    try {
      await voucherApi.confirm(confirmTarget.id);
      toast.success('Đã xác nhận thanh toán. Voucher (nếu có) đã được ghi nhận sử dụng.');
      setConfirmTarget(null);
      await fetchOrders();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý đơn hàng</h1>
          <p className="text-muted-foreground">
            Chỉ xác nhận sau khi đã kiểm tra khách thanh toán thành công.
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchOrders()} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : ''} /> Làm mới
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng gần đây</CardTitle>
          <CardDescription>
            Voucher được tính là đã dùng và thống kê được cập nhật khi nhân viên xác nhận thanh toán.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Đang tải đơn hàng...</p>
          ) : orders.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Chưa có đơn hàng.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <article key={order.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="font-semibold">{order.external_order_id || `Đơn #${order.id}`}</h2>
                      <p className="text-sm text-muted-foreground">
                        {order.customer}{order.customer_email ? ` · ${order.customer_email}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.created_at))}
                        {' · '}{statusLabels[order.status]}
                      </p>
                    </div>
                    {order.status === 'pending' && (
                      <Button onClick={() => setConfirmTarget(order)}>
                        <Check /> Xác nhận đã thanh toán
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                    {order.items.map((item, index) => (
                      <div key={`${order.id}-${index}`} className="flex justify-between gap-4">
                        <span>{item.name} × {item.quantity}</span>
                        <span>{formatCurrency(item.line_total)}</span>
                      </div>
                    ))}
                    {order.applied_voucher && (
                      <div className="flex justify-between gap-4 text-emerald-700">
                        <span>Voucher {order.applied_voucher.code}</span>
                        <span>-{formatCurrency(order.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Khách cần thanh toán</span>
                      <span>{formatCurrency(order.final_total)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open && !confirming) setConfirmTarget(null);
        }}
        title="Xác nhận thanh toán"
        description={`Chỉ xác nhận đơn ${confirmTarget?.external_order_id || ''} nếu đã kiểm tra giao dịch thanh toán thực tế. Thao tác này sẽ hoàn tất đơn và ghi nhận sử dụng voucher.`}
        confirmText="Đã kiểm tra, xác nhận"
        variant="warning"
        isLoading={confirming}
        onConfirm={() => void confirmPayment()}
      />
    </div>
  );
}
