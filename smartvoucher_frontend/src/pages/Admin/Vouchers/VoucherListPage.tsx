import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ConfirmModal } from '@/components/layout/admin/confirmModal';
import { authFetch, API_BASE_URL, customerApi, voucherApi } from '@/services/apiService';
import { Edit, Trash2, Users, Plus, ChevronLeft, ChevronRight, PauseCircle, PlayCircle, Calendar, Eye, Search, Send, Mail, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ExportDropdown } from '@/components/admin/common/ExportDropdown';
import { exportToExcel, exportToCSV } from '@/utils/downloadUtils';
import type { Voucher } from '@/types/voucher';
import { formatDateInVietnam, formatDateTimeInVietnam } from '@/utils/dateTime';

const formatCurrency = (value: number) => {
  if (value === undefined || value === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return formatDateInVietnam(dateString);
};

const statusLabel: Record<string, string> = {
  active: 'Đang hoạt động',
  scheduled: 'Chờ phát hành',
  expired: 'Hết hạn',
  exhausted: 'Hết lượt',
  paused: 'Tạm dừng',
};



export default function VoucherListPage() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<any | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedVoucherForDist, setSelectedVoucherForDist] = useState<any | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedChannels] = useState<string[]>(['email']);
  const [autoSelectLoading, setAutoSelectLoading] = useState(false);
  const [autoSelectResult, setAutoSelectResult] = useState<any | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await customerApi.list({ page_size: 1000 });
        setCustomers(data.results || (Array.isArray(data) ? data : []));
      } catch {
        toast.error('Không thể tải danh sách khách hàng');
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (isDistributeModalOpen && selectedVoucherForDist && !autoSelectResult && !autoSelectLoading) {
      const fetchEligibility = async () => {
        setAutoSelectLoading(true);
        try {
          const result = await voucherApi.eligibleUsers(selectedVoucherForDist.voucher_id);
          setAutoSelectResult(result);
        } catch {
          toast.error('Không thể kiểm tra điều kiện khách hàng');
        } finally {
          setAutoSelectLoading(false);
        }
      };
      fetchEligibility();
    }
  }, [isDistributeModalOpen, selectedVoucherForDist, autoSelectResult, autoSelectLoading]);

  const handleAutoSelect = useCallback(async () => {
    if (!selectedVoucherForDist) return;

    // Use cached results if available, otherwise fetch
    let result = autoSelectResult;
    if (!result) {
      setAutoSelectLoading(true);
      try {
        result = await voucherApi.eligibleUsers(selectedVoucherForDist.voucher_id);
        setAutoSelectResult(result);
      } catch {
        toast.error('Không thể tải danh sách khách hàng đủ điều kiện');
        setAutoSelectLoading(false);
        return;
      } finally {
        setAutoSelectLoading(false);
      }
    }

    const newIds = (result.users || []).filter((u: any) => !u.already_assigned).map((u: any) => u.id);
    setSelectedCustomers(newIds);
    if (newIds.length === 0) {
      toast.info('Tất cả các khách hàng đủ điều kiện đều đã nhận được voucher này rồi!');
    } else {
      toast.success(`Đã tự động chọn ${newIds.length} khách hàng đủ điều kiện!`);
    }
  }, [selectedVoucherForDist, autoSelectResult]);

  const handleDistribute = async () => {
    if (!selectedVoucherForDist || selectedCustomers.length === 0) {
      toast.error('Vui lòng chọn khách hàng');
      return;
    }
    setDistributing(true);
    try {
      const result = await voucherApi.distribute({
        voucher_id: selectedVoucherForDist.voucher_id,
        user_ids: selectedCustomers,
        channels: selectedChannels
      });
      toast.success(result?.message || 'Phân bổ và gửi thông báo thành công');
      setIsDistributeModalOpen(false);
      setSelectedVoucherForDist(null);
      setSelectedCustomers([]);
      fetchVouchers();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Phân bổ thất bại');
    } finally {
      setDistributing(false);
    }
  };

  const handleExport = async (type: 'excel' | 'csv') => {
    try {
      setExportLoading(true);
      // Fetch performance data with a large page size for full export
      const url = `${API_BASE_URL}/vouchers/stats/performance/?page_size=1000&search=${encodeURIComponent(debouncedSearch)}`;
      const res = await authFetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (data.results) {
        const exportData = data.results.map((v: any) => ({
          'Mã Voucher': v.code,
          'Tiêu đề': v.title,
          'Loại giảm giá': v.discount_type === 'percent' ? 'Phần trăm' : 'Số tiền cố định',
          'Giá trị giảm': v.discount_type === 'fixed' ? formatCurrency(v.discount_value) : `${v.discount_value}%`,
          'Chi tiêu tối thiểu': formatCurrency(v.min_spend),
          'Giảm tối đa': v.discount_type === 'percent' ? formatCurrency(v.max_discount) : 'N/A',
          'Đã dùng': `${v.usage_count} lượt`,
          'Tổng lượt cấp': `${v.quantity} lượt`,
          'Giới hạn/Người dùng': `${v.usage_limit_per_user} lần`,
          'Ngày bắt đầu': formatDate(v.release_date),
          'Ngày kết thúc': formatDate(v.expiry_date),
          'Trạng thái': statusLabel[v.status] || v.status,
          'Ngày tạo': v.created_at ? formatDateTimeInVietnam(v.created_at) : '',
        }));

        if (type === 'excel') {
          exportToExcel(exportData, 'Danh_sach_voucher', 'Voucher');
        } else {
          exportToCSV(exportData, 'Danh_sach_voucher');
        }
        toast.success(`Xuất file ${type.toUpperCase()} thành công`);
      }
    } catch {
      toast.error('Lỗi khi xuất dữ liệu voucher');
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearch !== searchTerm) {
        setDebouncedSearch(searchTerm);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearch]);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/vouchers/stats/performance/?page=${page}&page_size=${pageSize}&search=${encodeURIComponent(debouncedSearch)}`;
      const res = await authFetch(url);
      if (!res.ok) {
        toast.error('Không thể tải danh sách voucher');
        return;
      }
      const data = await res.json();
      setVouchers(data.results || []);
      setHasNext(!!data.next);
      setHasPrev(!!data.previous);
      setTotalCount(data.count || (data.results ? data.results.length : 0));
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/vouchers/${deleteTarget.voucher_id}/`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || 'Xóa voucher thất bại');
        return;
      }
      toast.success('Đã xóa voucher thành công');
      fetchVouchers();
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      const isCurrentlyActive = toggleTarget.status !== 'paused';
      const res = await authFetch(`${API_BASE_URL}/vouchers/${toggleTarget.voucher_id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isCurrentlyActive })
      });
      if (!res.ok) {
        toast.error((await res.json()).error || 'Lỗi cập nhật trạng thái');
        return;
      }
      toast.success(isCurrentlyActive ? 'Đã tạm dừng voucher' : 'Đã mở lại voucher');
      fetchVouchers();
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setToggleLoading(false);
      setToggleConfirmOpen(false);
    }
  };

  const getStatus = (v: Voucher) => {
    const now = new Date();
    const start = new Date(v.release_date);
    const end = new Date(v.expiry_date);
    const used = v.used_count ?? 0;
    const quantity = v.quantity ?? 0;

    if (used >= quantity) return 'exhausted';
    if (now < start) return 'scheduled';
    if (now > end) return 'expired';

    return 'active';
};
  const getStatusStyles = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-600 border-green-200 ring-green-200';
    case 'expired':
      return 'bg-red-100 text-red-600 border-red-200 ring-red-200';
    case 'scheduled':
      return 'bg-blue-100 text-blue-600 border-blue-200 ring-blue-200';
    case 'exhausted':
      return 'bg-gray-200 text-gray-600 border-gray-300 ring-gray-300';
    case 'paused':
      return 'bg-yellow-100 text-yellow-600 border-yellow-200 ring-yellow-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200 ring-slate-200';
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [page, pageSize, debouncedSearch]);

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent pb-1">Quản lý Voucher</h2>
          <p className="text-sm text-slate-500 font-medium">Hệ thống phân phối và theo dõi mã khuyến mãi</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <ExportDropdown
            onExport={handleExport}
            isLoading={exportLoading}
          />
          <Button
            onClick={() => navigate('/admin/vouchers/create')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-xl px-5 h-11 transition-all font-semibold w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-1" />
            Tạo Voucher mới
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/30 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 bg-white border-b border-slate-100">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold text-slate-800">Danh sách Voucher</CardTitle>
            <CardDescription className="text-slate-500 font-medium">Quản lý toàn bộ các chương trình ưu đãi và thông tin phát hành</CardDescription>
          </div>
          <div className="relative w-full sm:w-72 mt-2 sm:mt-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              type="text"
              placeholder="Tìm theo Mã số hoặc Tiêu đề..."
              className="pl-9 h-10 w-full bg-slate-50 border-slate-200/80 transition-all focus:bg-white rounded-xl shadow-sm text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-10 font-medium text-slate-400">Đang tải dữ liệu...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader className="bg-slate-50/70">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="min-w-[140px] font-bold text-slate-700 whitespace-nowrap">Mã Voucher</TableHead>
                    <TableHead className="min-w-[140px] font-bold text-slate-700 whitespace-nowrap">Trị giá Ưu đãi</TableHead>
                    <TableHead className="min-w-[180px] font-bold text-slate-700 whitespace-nowrap">Thời hạn</TableHead>
                    <TableHead className="text-right font-bold text-slate-700 whitespace-nowrap">Đã dùng / Tổng</TableHead>
                    <TableHead className="text-center font-bold text-slate-700 whitespace-nowrap min-w-[200px]">Trạng thái</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-slate-700 whitespace-nowrap min-w-[140px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.map((v: any) => (
                    <TableRow
                      key={v.voucher_id}
                      className="hover:bg-indigo-50/20 transition-colors border-slate-100/50"
                    >
                      <TableCell className="pl-4">
                        <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50/80 border border-indigo-100 font-mono text-[13px] font-bold text-indigo-700 tracking-wider shadow-sm">
                          {v.code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`font-bold border px-2 py-0.5 rounded text-[12px] shadow-sm ${v.discount_type === 'percent' ? 'text-violet-700 bg-violet-50/70 border-violet-100/50' : 'text-emerald-700 bg-emerald-50/70 border-emerald-100/50'}`}>
                            {v.discount_type === 'percent' ? `Giảm ${v.discount_value}%` : `Giảm ${formatCurrency(v.discount_value)}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 py-1">
                          <div className="flex items-center text-[12px] font-bold text-slate-700 whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-500 shrink-0" />
                            <span className="opacity-75 mr-1 font-medium select-none">Bắt đầu:</span> {formatDate(v.release_date)}
                          </div>
                          <div className="flex items-center text-[12px] font-bold text-slate-700 whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-orange-500 shrink-0" />
                            <span className="opacity-75 mr-1 font-medium select-none">Kết thúc:</span> {formatDate(v.expiry_date)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-700">
                        {v.used_count} / {v.quantity}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center justify-center h-full">
                          <Badge
                            variant="outline"
                            className={`whitespace-nowrap rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-tighter border ring-1 shadow-sm ${getStatusStyles(getStatus(v))}`}
                          >
                            {statusLabel[getStatus(v)] || getStatus(v)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {v.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Gửi Voucher"
                              className="text-violet-600 bg-violet-50/50 hover:bg-violet-100 hover:text-violet-700 font-medium rounded-xl transition-all shadow-sm shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVoucherForDist(v);
                                setIsDistributeModalOpen(true);
                              }}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Xem chi tiết"
                            className="text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-800 font-medium rounded-xl transition-all shadow-sm shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/vouchers/${v.voucher_id}/detail`);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={v.status === 'paused' ? "Mở lại" : "Tạm dừng"}
                            className={`shrink-0 font-medium rounded-xl transition-all shadow-sm ${v.status === 'paused' ? 'text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100' : 'text-amber-500 bg-amber-50/50 hover:bg-amber-100'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setToggleTarget(v);
                              setToggleConfirmOpen(true);
                            }}
                          >
                            {v.status === 'paused' ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Sửa Voucher"
                            className="text-blue-600 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-700 font-medium rounded-xl transition-all shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/vouchers/${v.voucher_id}/edit`);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Người nhận Voucher"
                            className="text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-700 font-medium rounded-xl transition-all shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/vouchers/${v.voucher_id}/recipients`);
                            }}
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Xóa Voucher"
                            className="text-red-500 bg-red-50/50 hover:bg-red-100 hover:text-red-600 font-medium rounded-xl transition-all shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(v);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {vouchers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-medium">
                        <div className="flex flex-col items-center justify-center opacity-60">
                          <span className="text-4xl mb-3">📭</span>
                          Không tìm thấy chương trình Voucher nào
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-between px-6 py-4 bg-white/60 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-500">
              Hiển thị <span className="font-bold text-indigo-600">{vouchers.length}</span> / <span className="font-bold text-slate-800">{totalCount}</span> voucher
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500 whitespace-nowrap hidden sm:inline-block">Dòng hiển thị:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200 shadow-sm text-sm font-semibold text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shadow-sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!hasPrev && page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Trước
                </Button>
                <div className="flex items-center justify-center min-w-[32px] h-8 rounded-md bg-slate-50 text-sm font-bold text-slate-600 border border-slate-200">
                  {page}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shadow-sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasNext && vouchers.length < 10}
                >
                  Sau
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Xác nhận xóa Voucher"
        description={`Bạn có chắc chắn muốn xóa voucher ${deleteTarget?.code}? Hành động này sẽ ẩn voucher khỏi hệ thống người dùng.`}
        confirmText="Đồng ý xóa"
        isLoading={deleteLoading}
        onConfirm={handleDelete}
      />

      <ConfirmModal
        open={toggleConfirmOpen}
        onOpenChange={setToggleConfirmOpen}
        title={toggleTarget?.status === 'paused' ? "Xác nhận mở lại" : "Xác nhận tạm dừng"}
        description={toggleTarget?.status === 'paused'
          ? `Bạn có muốn mở lại voucher ${toggleTarget?.code}? Voucher sẽ có thể được áp dụng trở lại.`
          : `Bạn có muốn tạm dừng voucher ${toggleTarget?.code}? Người dùng sẽ không thể áp dụng voucher này cho đến khi được mở lại.`
        }
        confirmText={toggleTarget?.status === 'paused' ? "Mở lại ngay" : "Tạm dừng ngay"}
        variant={toggleTarget?.status === 'paused' ? "info" : "warning"}
        isLoading={toggleLoading}
        onConfirm={handleToggleActive}
      />

      <Dialog open={isDistributeModalOpen} onOpenChange={(open) => { setIsDistributeModalOpen(open); if (!open) { setCustomerSearch(""); setAutoSelectResult(null); setSelectedCustomers([]); } }}>
        <DialogContent className="sm:max-w-[700px] p-0 border-none rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden flex flex-col outline-none">
          {/* Header section with gradient */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 md:p-8 text-white relative shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <DialogHeader className="relative z-10 text-left">
              <DialogTitle className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner shrink-0">
                  <Send className="w-6 h-6 text-white" />
                </div>
                Gửi Voucher Tặng Khách Hàng
              </DialogTitle>
              <DialogDescription className="text-indigo-100/90 font-medium text-sm md:text-base mt-3 flex flex-col gap-1.5 text-left">
                <span>Chiến dịch: <strong className="text-white bg-white/20 px-2.5 py-0.5 rounded-md ml-1 font-mono tracking-wider">{selectedVoucherForDist?.code}</strong> &bull; <span className="text-white font-bold">{selectedVoucherForDist?.title}</span></span>
                <span className="opacity-80">Vui lòng chọn các khách hàng mục tiêu bên dưới để tiến hành phân phối mã ưu đãi.</span>
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 md:px-8 py-5 flex flex-col gap-4">
            {/* Auto-select banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/60">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-extrabold text-indigo-800">🤖 Phân bổ Thông minh theo Rule</span>
                {autoSelectResult ? (
                  <span className="text-xs text-indigo-600 font-medium">
                    Tìm thấy <strong>{autoSelectResult.total_eligible}</strong> đủ điều kiện
                    {autoSelectResult.rule_summary?.required_role && autoSelectResult.rule_summary.required_role !== 'none'
                      ? ` (Hạng: ${autoSelectResult.rule_summary.required_role})`
                      : ''}
                    {autoSelectResult.rule_summary?.birthday_only ? ' · Sinh nhật tháng này' : ''}
                    {' · '}<span className="text-emerald-600">{autoSelectResult.new_eligible_count} khách mới chưa nhận</span>
                    {autoSelectResult.already_assigned_count > 0 && <span className="text-slate-400"> · {autoSelectResult.already_assigned_count} đã có rồi (bỏ qua)</span>}
                  </span>
                ) : (
                  <span className="text-xs text-indigo-400 font-medium">Hệ thống tự quét và chọn người phù hợp với điều kiện Voucher</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleAutoSelect}
                disabled={autoSelectLoading}
                className="shrink-0 flex items-center gap-2 h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-indigo-300/60 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
              >
                {autoSelectLoading ? (
                  <><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>Đang quét...</>
                ) : (
                  <>⚡ Tự Động Chọn</>
                )}
              </button>
            </div>

            <div className="flex flex-col gap-2 pb-2">
              <span className="text-sm font-bold text-slate-700">Kênh gửi thông báo:</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 p-2 px-4 rounded-xl border border-indigo-600 bg-indigo-50 transition-all font-bold text-sm text-indigo-700 shadow-sm border-dashed">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  Gửi qua Email (Mặc định)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 w-full">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Tìm khách hàng theo Tên, Email..."
                  className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl shadow-sm text-sm font-medium w-full transition-all"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="h-[360px] pr-4 -mr-4 rounded-xl relative">
              {autoSelectLoading && !autoSelectResult && (
                <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-bold text-indigo-700">Đang quét điều kiện...</span>
                  </div>
                </div>
              )}
              <div className="space-y-2 pb-2">
                {customers.filter(c => c.username?.toLowerCase().includes(customerSearch.toLowerCase()) || c.email?.toLowerCase().includes(customerSearch.toLowerCase())).map(c => {
                  const uId = c.id || c.user_id;
                  const isSelected = selectedCustomers.includes(uId);

                  // Matching logic using autoSelectResult.users array
                  const matchInfo = autoSelectResult?.users?.find((u: any) => u.id === uId);
                  const isEligible = matchInfo !== undefined;
                  const alreadyAssigned = matchInfo?.already_assigned;
                  const matchReason = matchInfo?.match_reason;

                  const handleToggle = () => {
                    if (alreadyAssigned) {
                      toast.info(`Khách hàng ${c.username} đã sở hữu voucher này rồi.`);
                      return;
                    }
                    if (!isEligible && autoSelectResult) {
                      toast.warning(`Khách hàng ${c.username} chưa đủ điều kiện nhận voucher này.`);
                      return;
                    }
                    setSelectedCustomers(prev => isSelected ? prev.filter(id => id !== uId) : [...prev, uId]);
                  };

                  return (
                    <div
                      key={uId}
                      className={`flex items-center gap-4 p-3.5 rounded-2xl transition-all border-2 group relative overflow-hidden ${isSelected ? 'bg-indigo-50/80 border-indigo-400 shadow-md ring-4 ring-indigo-500/10' :
                          (!isEligible && autoSelectResult) || alreadyAssigned ? 'bg-slate-50 border-slate-200/50 cursor-not-allowed border-l-4 border-l-slate-300' :
                            'bg-white hover:bg-slate-50 border-slate-100 hover:border-indigo-200 shadow-sm cursor-pointer'
                        }`}
                      style={(!isEligible && autoSelectResult) || alreadyAssigned ? {
                        backgroundImage: 'linear-gradient(135deg, transparent 25%, rgba(0,0,0,0.02) 25%, rgba(0,0,0,0.02) 50%, transparent 50%, transparent 75%, rgba(0,0,0,0.02) 75%, rgba(0,0,0,0.02) 100%)',
                        backgroundSize: '20px 20px'
                      } : {}}
                      onClick={handleToggle}
                    >
                      {(!isEligible && autoSelectResult !== null) || alreadyAssigned ? (
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                          <Lock className="w-4 h-4 text-slate-400 opacity-60" />
                        </div>
                      ) : (
                        <Checkbox
                          id={`customer-${uId}`}
                          checked={isSelected}
                          className={`w-5 h-5 rounded-[6px] transition-all data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600 ${isSelected ? 'text-white' : 'border-slate-300'}`}
                        />
                      )}

                      <div className="flex items-center gap-3.5 w-full">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-black shadow-inner shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : ((!isEligible && autoSelectResult) || alreadyAssigned ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors')}`}>
                          {c.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-[15px] font-extrabold tracking-tight ${isSelected ? 'text-indigo-900' : ((!isEligible && autoSelectResult) || alreadyAssigned ? 'text-slate-400' : 'text-slate-700 group-hover:text-indigo-700 transition-colors')}`}>{c.username}</span>
                            {isEligible && !alreadyAssigned ? (
                              <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0 border-none shadow-none ${isSelected ? 'bg-indigo-200/50 text-indigo-700' : 'bg-emerald-50 text-emerald-600'}`}>
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                {matchReason || "Đủ điều kiện"}
                              </Badge>
                            ) : !isEligible && autoSelectResult && (
                              <Badge variant="outline" className="text-[10px] font-bold px-2 py-0 border-none bg-red-50 text-red-500 shadow-none">
                                <ShieldAlert className="w-3 h-3 mr-1" />
                                Không đủ điều kiện
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[12px] font-medium ${isSelected ? 'text-indigo-600/80' : 'text-slate-400'}`}>{c.email}</span>
                            <span className="text-[10px] text-slate-300">&bull;</span>
                            <span className={`text-[11px] font-semibold ${isSelected ? 'text-indigo-50' : 'text-slate-500'}`}>{c.phone || "Chưa cập nhật SĐT"}</span>
                          </div>
                        </div>

                        {alreadyAssigned && (
                          <div className="absolute top-2 right-2 flex items-center gap-1.5 translate-y-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Đã sở hữu</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {customers.filter(c => c.username?.toLowerCase().includes(customerSearch.toLowerCase()) || c.email?.toLowerCase().includes(customerSearch.toLowerCase())).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <Search className="w-6 h-6 text-slate-300" />
                    </div>
                    <span className="font-bold text-sm text-slate-600">Không tìm thấy khách hàng nào.</span>
                    <span className="text-xs mt-1">Vui lòng thử từ khóa khác.</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="bg-slate-50 border-t border-slate-100 p-5 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.1)] relative z-10">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center shadow-inner shrink-0">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">Đã chọn phân phối</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-indigo-700 leading-none">{selectedCustomers.length}</span>
                  <span className="text-[12px] font-bold text-indigo-500/80 mr-2">Khách hàng</span>
                  {selectedCustomers.length > 0 && (
                    <button
                      onClick={() => setSelectedCustomers([])}
                      className="text-[10px] font-bold text-red-500 hover:text-red-600 underline underline-offset-2 uppercase tracking-tight"
                    >
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 w-full sm:w-auto mt-2 sm:mt-0">
              <Button variant="outline" className="flex-1 sm:flex-none h-12 px-6 font-bold text-slate-600 border-slate-300 hover:bg-slate-100 rounded-xl transition-all" onClick={() => setIsDistributeModalOpen(false)}>Quay lại</Button>
              <Button
                onClick={handleDistribute}
                disabled={distributing || selectedCustomers.length === 0}
                className="flex-1 sm:flex-none h-12 px-8 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black uppercase tracking-wider text-[13px] rounded-xl shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] border-none transition-all hover:scale-[1.02] active:scale-95 disabled:hover:scale-100 disabled:opacity-70 disabled:shadow-none"
              >
                {distributing ? "ĐANG XỬ LÝ..." : "XÁC NHẬN GỬI"}
                {!distributing && <Send className="w-4 h-4 ml-2 opacity-90" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
