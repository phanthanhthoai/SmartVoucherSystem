import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/layout/admin/confirmModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { API_BASE_URL, authFetch } from '@/services/apiService';
import { ArrowLeft, CheckCircle, XCircle, Search, Users, Activity, Ticket, Calendar, Filter, Eye, Trash2, ChevronLeft, ChevronRight, User, Mail, Shield } from 'lucide-react';
import { toast } from 'sonner';
import VoucherHistoryModal from '@/components/admin/vouchers/VoucherHistoryModal';
import { History } from 'lucide-react';
import { formatDateTimeInVietnam } from '@/utils/dateTime';

interface VoucherInfo {
  id: number;
  code: string;
  title: string;
  quantity: number;
  used_count: number;
  recipient_count: number;
}

interface Recipient {
  user_id: number;
  username: string;
  email: string;
  role: string;
  is_used: boolean;
  assigned_at: string;
  used_at: string | null;
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '—';
  return formatDateTimeInVietnam(dateString, { second: undefined });
};

export default function VoucherRecipientsPage() {
  const { voucherId } = useParams<{ voucherId: string }>();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState<VoucherInfo | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [filterUsed, setFilterUsed] = useState('all');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRecipient, setDeletingRecipient] = useState<Recipient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUserId, setHistoryUserId] = useState<number | null>(null);
  const [historyUserName, setHistoryUserName] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearch !== searchTerm) {
        setDebouncedSearch(searchTerm);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearch]);

  const fetchRecipients = useCallback(async () => {
    if (!voucherId) return;
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/vouchers/${voucherId}/recipients/?page=${page}&page_size=${pageSize}&search=${encodeURIComponent(debouncedSearch)}`;
      const res = await authFetch(url);
      if (!res.ok) {
        toast.error('Không thể tải danh sách nhận voucher');
        return;
      }
      const data = await res.json();
      setVoucher(data.voucher || null);
      setRecipients(data.results || []);
      setTotalCount(data.count || 0);
      setHasNext(!!data.next);
      setHasPrev(!!data.previous);
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  }, [voucherId, page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const filteredRecipients = useMemo(() => {
    if (filterUsed === 'all') return recipients;
    return recipients.filter(r =>
      (filterUsed === 'used' && r.is_used) ||
      (filterUsed === 'not_used' && !r.is_used)
    );
  }, [recipients, filterUsed]);

  const handleDeleteRecipient = async () => {
    if (!deletingRecipient || !voucherId) return;
    setIsDeleting(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/vouchers/${voucherId}/recipients/${deletingRecipient.user_id}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Đã xóa người nhận thành công');
        setIsDetailModalOpen(false);
        fetchRecipients();
      } else {
        const errText = await res.text();
        let errMsg = 'Lỗi không xác định';
        try {
          const errData = JSON.parse(errText);
          errMsg = errData.error || errData.message || errMsg;
        } catch {
          errMsg = `Lỗi hệ thống (${res.status})`;
        }
        toast.error(errMsg);
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setDeletingRecipient(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/vouchers/list')}
            className="rounded-xl hover:bg-white hover:shadow-md transition-all h-10 w-10 shrink-0 border border-slate-100 bg-white shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent pb-1">
              Người nhận Voucher
            </h2>
            {voucher && (
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-indigo-50/80 border-indigo-100 text-indigo-700 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                  {voucher.code}
                </Badge>
                <span className="text-sm text-slate-500 font-medium opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">
                  — {voucher.title}
                </span>
              </div>
            )}
          </div>
        </div>

        {voucher && (
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100/50 rounded-xl shadow-sm border-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-tight">Thống kê người dùng</span>
          </div>
        )}
      </div>

      {voucher && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-none shadow-xl shadow-slate-200/30 rounded-2xl bg-white overflow-hidden transition-all hover:shadow-2xl hover:shadow-indigo-100 border-t-4 border-t-indigo-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-slate-500">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider">Mã Voucher</CardTitle>
              <Ticket className="w-4 h-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-slate-900 font-mono tracking-wider">{voucher.code}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/30 rounded-2xl bg-white overflow-hidden transition-all hover:shadow-2xl hover:shadow-indigo-100">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-slate-500">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider">Tổng nhận</CardTitle>
              <Users className="w-4 h-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{totalCount}</p>
                <span className="text-xs font-medium text-slate-400">người</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/30 rounded-2xl bg-white overflow-hidden transition-all hover:shadow-2xl hover:shadow-emerald-100">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-slate-500">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider">Đã dùng</CardTitle>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">{voucher.used_count}</p>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold">
                  {Math.round((voucher.used_count / (totalCount || 1)) * 100)}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/30 rounded-2xl bg-white overflow-hidden transition-all hover:shadow-2xl hover:shadow-amber-100">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 text-slate-500">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider">Còn lại</CardTitle>
              <Calendar className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{Math.max(voucher.quantity - voucher.used_count, 0)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-none shadow-xl shadow-slate-200/30 rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 bg-white border-b border-slate-100">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Khách hàng sở hữu
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Danh sách các khách hàng hiện đang nắm giữ mã voucher này
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-72 mt-2 sm:mt-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <Input
                placeholder="Tìm tài khoản, email..."
                className="pl-9 h-11 w-full bg-slate-50 border-slate-200/80 transition-all focus:bg-white rounded-xl shadow-sm text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-[120px]">
              <Select value={filterUsed} onValueChange={setFilterUsed}>
                <SelectTrigger className="h-11 bg-slate-50 border-slate-200/80 rounded-xl text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <SelectValue placeholder="Tất cả" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="used" className="text-emerald-600 font-bold">Đã dùng</SelectItem>
                  <SelectItem value="not_used" className="text-slate-500 font-bold">Chưa dùng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-24 font-medium text-slate-400 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              Đang nạp dữ liệu...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="pl-6 font-bold text-slate-600 h-14 uppercase text-[11px] tracking-wider">Hội viên</TableHead>
                    <TableHead className="font-bold text-slate-600 h-14 uppercase text-[11px] tracking-wider">Email</TableHead>
                    <TableHead className="font-bold text-slate-600 h-14 uppercase text-[11px] tracking-wider text-center">Vai trò</TableHead>
                    <TableHead className="text-center font-bold text-slate-600 h-14 uppercase text-[11px] tracking-wider">Trạng thái</TableHead>
                    <TableHead className="font-bold text-slate-600 h-14 uppercase text-[11px] tracking-wider">Thời gian nhận</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-slate-600 h-14 uppercase text-[11px] tracking-wider">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecipients.map((r) => (
                    <TableRow key={r.user_id} className="hover:bg-indigo-50/20 transition-colors border-slate-100/50 group">
                      <TableCell className="pl-6">
                        <div className="font-extrabold text-slate-900 text-[14px] group-hover:text-indigo-600 transition-colors tracking-tight">
                          {r.username}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium">
                        {r.email}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="rounded-full px-4 py-0.5 text-[10px] font-bold border-slate-200 text-slate-500 bg-slate-50/50 shadow-sm lowercase">
                          {r.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.is_used ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200/50 rounded-full font-bold text-[10px] uppercase px-3 py-1">
                            <CheckCircle className="w-3 h-3 mr-1.5" />
                            Đã dùng
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-slate-200 rounded-full font-bold text-[10px] uppercase px-3 py-1">
                            <XCircle className="w-3 h-3 mr-1.5 text-slate-400" />
                            Chưa dùng
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-[13px] font-semibold text-slate-600 tabular-nums">
                        {formatDate(r.assigned_at)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Xem chi tiết"
                            className="text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 font-medium rounded-xl transition-all h-8 w-8 shadow-sm border border-transparent"
                            onClick={() => {
                              setSelectedRecipient(r);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Lịch sử Voucher"
                            className="text-[#5a46e5] bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-700 font-medium rounded-xl transition-all h-8 w-8 shadow-sm border border-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHistoryUserId(r.user_id);
                              setHistoryUserName(r.username);
                              setHistoryOpen(true);
                            }}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Gỡ bỏ"
                            className="text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-600 font-medium rounded-xl transition-all h-8 w-8 shadow-sm border border-transparent"
                            onClick={() => {
                              setDeletingRecipient(r);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRecipients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-24 text-slate-400">
                        <div className="flex flex-col items-center gap-3 opacity-40">
                          <Search className="w-12 h-12 mb-2" />
                          <p className="text-lg font-bold">Không tìm thấy dữ liệu</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && recipients.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-8 py-5 bg-slate-50/30 border-t border-slate-100 gap-4">
              <p className="text-[13px] font-medium text-slate-500">
                Hiển thị <span className="font-extrabold text-indigo-600">{recipients.length}</span> / <span className="font-extrabold text-slate-800">{totalCount}</span> người nhận
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:inline-block">Dòng:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 w-[70px] bg-white border-slate-200 shadow-sm text-sm font-bold text-slate-700 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl min-w-[70px]">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 bg-white border-slate-200 shadow-sm rounded-xl transition-all hover:bg-slate-900 hover:text-white disabled:opacity-40 font-bold"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={!hasPrev && page === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Trước
                  </Button>
                  <div className="flex items-center justify-center min-w-[40px] h-10 rounded-xl border border-slate-200 bg-white text-indigo-700 font-extrabold text-[15px] shadow-sm">
                    {page}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 bg-white border-slate-200 shadow-sm rounded-xl transition-all hover:bg-slate-900 hover:text-white disabled:opacity-40 font-bold"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasNext}
                  >
                    Sau
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Xác nhận gỡ bỏ"
        description={`Bạn có chắc chắn muốn gỡ tài khoản "${deletingRecipient?.username}" khỏi danh sách nhận voucher này không?`}
        confirmText="Đồng ý gỡ"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteRecipient}
      />

      {/* COMPACT DETAILS MODAL */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[550px] w-[95vw] rounded-[2rem] border-none shadow-3xl p-0 overflow-hidden bg-white">
          <div className="h-36 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 flex flex-col justify-end relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative flex items-center gap-6">
              <div className="p-3 bg-white/20 backdrop-blur-2xl rounded-2xl border border-white/20">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-2xl font-extrabold text-white tracking-tight">Chi tiết hồ sơ</DialogTitle>
                <DialogDescription className="text-indigo-100/70 font-bold uppercase tracking-wider text-[10px]">Quản trị Phân phối</DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Account Info */}
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider underline underline-offset-4 decoration-indigo-200">Cơ bản</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Tên tài khoản</span>
                    <p className="text-base font-extrabold text-slate-900 tracking-tight">{selectedRecipient?.username}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Email liên hệ</span>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-sm font-semibold text-slate-700 break-all">{selectedRecipient?.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Info */}
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider underline underline-offset-4 decoration-violet-200">Hành trình</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Hiện trạng</span>
                    {selectedRecipient?.is_used ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold uppercase px-2 py-0.5 text-[9px] shadow-sm flex items-center w-fit">
                        Đã dùng
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 font-bold uppercase px-2 py-0.5 text-[9px] shadow-sm flex items-center w-fit">
                        Chưa dùng
                      </Badge>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Cấp bậc</span>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-sm font-bold text-slate-800 uppercase tracking-tight">{selectedRecipient?.role}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Tracking Section */}
            <div className="bg-slate-50/50 border border-slate-100/60 rounded-2xl p-6 grid grid-cols-2 gap-4 shadow-inner">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Ngày nhận mã</p>
                <p className="text-[14px] font-extrabold text-slate-800 tabular-nums">{formatDate(selectedRecipient?.assigned_at || null)}</p>
              </div>
              <div className="space-y-1 pl-4 border-l border-slate-200">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Ngày kích hoạt</p>
                <p className={`text-[14px] font-extrabold tabular-nums ${selectedRecipient?.is_used ? 'text-emerald-600' : 'text-slate-300 italic font-medium'}`}>
                  {selectedRecipient?.used_at ? formatDate(selectedRecipient?.used_at) : 'Chưa sử dụng'}
                </p>
              </div>
            </div>

            <div className="flex pt-2">
              <Button
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-widest text-[10px] rounded-xl shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] border-none"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Đóng cửa sổ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <VoucherHistoryModal 
        open={historyOpen} 
        onOpenChange={setHistoryOpen} 
        userId={historyUserId} 
        userName={historyUserName}
      />
    </div>
  );
}
