import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmModal } from '@/components/layout/admin/confirmModal';
import { API_BASE_URL, authFetch } from '@/services/apiService';
import { Calendar, Clock, Edit, Eye, History, Lock, Mail, PauseCircle, Phone, PlayCircle, Plus, RefreshCw, Search, ShieldCheck, Star, Trash2, UserCircle, UserPlus, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import VoucherHistoryModal from '@/components/admin/vouchers/VoucherHistoryModal';
import { ExportDropdown } from '@/components/admin/common/ExportDropdown';
import { exportToExcel, exportToCSV } from '@/utils/downloadUtils';
import { formatDateInVietnam, formatDateTimeInVietnam } from '@/utils/dateTime';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

interface Customer {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  points: number;
  total_spent: number;
  date_joined: string;
  last_login: string | null;
}

export default function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);

  // Dialog states
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Customer | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<Customer | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    points: 0,
    total_spent: 0
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUserId, setHistoryUserId] = useState<number | null>(null);
  const [historyUserName, setHistoryUserName] = useState("");

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.username.trim() || formData.username.length < 3) {
      errors.username = 'Tên đăng nhập tối thiểu 3 ký tự';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.email = 'Email không đúng định dạng hợp lệ';
    }
    if (formMode === 'create') {
      if (!formData.password || formData.password.length < 6) {
        errors.password = 'Mật khẩu phải từ 6 ký tự trở lên';
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Mật khẩu xác nhận không khớp';
      }
    }
    if (formMode === 'edit') {
      if (formData.points < 0) errors.points = 'Điểm tích lũy không được âm';
      if (formData.total_spent < 0) errors.total_spent = 'Tổng chi tiêu không được âm';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/users/customers/?page=${page}&page_size=${pageSize}&search=${encodeURIComponent(debouncedSearch)}`;
      const res = await authFetch(url);
      const data = await res.json();

      if (res.ok) {
        setCustomers(data.results);
        setTotalPages(data.total_pages);
        setTotalCount(data.count);
      } else {
        toast.error('Không thể tải danh sách khách hàng');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, pageSize, debouncedSearch]);

  const handleExport = async (type: 'excel' | 'csv') => {
    try {
      setExportLoading(true);
      const url = `${API_BASE_URL}/users/customers/?page_size=1000&search=${encodeURIComponent(debouncedSearch)}`;
      const res = await authFetch(url);
      const data = await res.json();

      if (res.ok && data.results) {
        const exportData = data.results.map((c: any) => ({
          'Họ tên': c.username,
          'Email': c.email,
          'Số điện thoại': c.phone || 'N/A',
          'Vai trò': c.role === 'customer' ? 'Khách hàng' : c.role,
          'Điểm tích lũy': `${c.points} điểm`,
          'Tổng chi tiêu': formatCurrency(c.total_spent || 0),
          'Trạng thái': c.is_active ? 'Đang hoạt động' : 'Tạm khóa',
          'Lần cuối đăng nhập': c.last_login ? formatDateTimeInVietnam(c.last_login) : 'Chưa từng',
          'Ngày tham gia': formatDateTimeInVietnam(c.date_joined),
        }));

        if (type === 'excel') exportToExcel(exportData, 'Danh_sach_khach_hang', 'Khách hàng');
        else exportToCSV(exportData, 'Danh_sach_khach_hang');
        toast.success(`Xuất file ${type.toUpperCase()} thành công`);
      }
    } catch {
      toast.error('Lỗi khi xuất dữ liệu');
    } finally {
      setExportLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/users/${toggleTarget.id}/toggle-active/`, {
        method: 'PATCH',
      });
      if (res.ok) {
        toast.success(toggleTarget.is_active ? 'Đã vô hiệu hóa tài khoản' : 'Đã kích hoạt tài khoản');
        setToggleConfirmOpen(false);
        setToggleTarget(null);
        fetchCustomers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Lỗi cập nhật trạng thái');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setToggleLoading(false);
    }
  };

  const confirmToggle = (c: Customer) => {
    setToggleTarget(c);
    setToggleConfirmOpen(true);
  };

  const confirmDelete = (c: Customer) => {
    setDeleteTarget(c);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/users/${deleteTarget.id}/`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Đã xóa khách hàng thành công');
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
        fetchCustomers();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Lỗi khi xóa');
      }
    } catch {
      toast.error('Lỗi server');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại các trường không hợp lệ.');
      return;
    }
    setFormLoading(true);
    try {
      let url = `${API_BASE_URL}/users/register/`;
      let method = 'POST';
      let payload: any = { ...formData };

      if (formMode === 'edit' && selectedUser) {
        url = `${API_BASE_URL}/users/${selectedUser.id}/update/`;
        method = 'PATCH';
        delete payload.password; // Không sửa password qua đây
      }

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(formMode === 'create' ? 'Tạo khách hàng mới thành công' : 'Cập nhật thành công');
        setFormOpen(false);
        fetchCustomers();
      } else {
        const err = await res.json();
        toast.error(err.message || err.error || 'Lỗi xử lý yêu cầu');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (c: Customer) => {
    setFormMode('edit');
    setSelectedUser(c);
    setFormData({
      username: c.username,
      email: c.email,
      phone: c.phone || '',
      password: '',
      confirmPassword: '',
      points: c.points,
      total_spent: c.total_spent
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openCreate = () => {
    setFormMode('create');
    setSelectedUser(null);
    setFormData({
      username: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      points: 0,
      total_spent: 0
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return formatDateInVietnam(dateString);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-slate-50 min-h-screen">
      {/* Header Section - Exactly MATCHING Voucher Layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent pb-1">
            Quản lý Khách hàng
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Hệ thống quản trị và chăm sóc cơ sở dữ liệu thành viên
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <ExportDropdown
            onExport={handleExport}
            isLoading={exportLoading}
          />
          <Button
            onClick={openCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-xl px-5 h-11 transition-all font-semibold w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-1" />
            Thêm Khách hàng mới
          </Button>
        </div>
      </div>

      {/* Main Table Container - MATCHING Voucher Style */}
      <div className="border-none shadow-xl shadow-slate-200/30 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
        {/* Table Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border-b border-slate-100">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Danh sách Khách hàng
            </h3>
            <p className="text-sm text-slate-500 font-medium">Quản lý toàn bộ thông tin tài khoản và điểm tích lũy</p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <Input
                placeholder="Tìm theo Tên hoặc Email..."
                className="pl-9 h-10 w-full bg-slate-50 border-slate-200/80 transition-all focus:bg-white rounded-xl shadow-sm text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchCustomers}
              className="h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-50 text-indigo-600 shrink-0 shadow-sm transition-all"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="hover:bg-transparent border-slate-50 h-20">
                <TableHead className="font-black text-slate-600 pl-6 uppercase text-[12px] tracking-widest">Khách hàng</TableHead>
                <TableHead className="font-black text-slate-600 uppercase text-[12px] tracking-widest">Email liên hệ</TableHead>
                <TableHead className="font-black text-slate-600 uppercase text-[12px] tracking-widest">Số điện thoại</TableHead>
                <TableHead className="font-black text-slate-600 uppercase text-[12px] tracking-widest text-right">Tích lũy</TableHead>
                <TableHead className="font-black text-slate-600 uppercase text-[12px] tracking-widest text-right">Tổng chi tiêu</TableHead>
                <TableHead className="font-black text-slate-600 uppercase text-[12px] tracking-widest text-center">Trạng thái</TableHead>
                <TableHead className="font-black text-slate-600 uppercase text-[12px] tracking-widest text-right pr-6">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse h-20 border-slate-50">
                    <TableCell colSpan={7} className="bg-slate-50/10 h-20"></TableCell>
                  </TableRow>
                ))
              ) : customers.length > 0 ? (
                customers.map((c) => (
                  <TableRow key={c.id} className="group hover:bg-slate-50/50 transition-all h-20 border-slate-50/50">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-blue-500/10 flex items-center justify-center border border-indigo-100/50 shadow-sm">
                          <UserCircle className="w-7 h-7 text-[#5a46e5]" />
                        </div>
                        <span className="font-black text-slate-800 text-sm whitespace-nowrap">{c.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100/60 font-mono text-[13px] font-bold text-[#5a46e5] tracking-wider shadow-sm">
                        {c.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.phone ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100/60 font-mono text-[13px] font-bold text-emerald-700 tracking-wider shadow-sm">
                          <Phone className="w-3.5 h-3.5" />
                          {c.phone}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs font-medium italic">Chưa cập nhật</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-black text-[13px] border border-amber-200/50 shadow-sm">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                        {c.points.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="font-black text-slate-800 text-base">
                          {new Intl.NumberFormat('vi-VN').format(c.total_spent)}<span className="text-xs ml-1 text-slate-400 font-bold uppercase tracking-tighter">đ</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={cn(
                          "whitespace-nowrap rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-tighter border shadow-sm ring-1",
                          c.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10 shadow-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10 shadow-rose-100"
                        )}
                        variant="outline"
                      >
                        {c.is_active ? 'ĐANG HOẠT ĐỘNG' : 'ĐÃ KHÓA'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost" size="icon" title="Xem chi tiết"
                          className="w-9 h-9 rounded-xl text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-800 shadow-sm"
                          onClick={(e) => { e.stopPropagation(); setDetailCustomer(c); setDetailOpen(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Lịch sử Voucher"
                          className="w-9 h-9 rounded-xl text-[#5a46e5] bg-indigo-50/50 hover:bg-indigo-100 hover:text-indigo-700 transition-all shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHistoryUserId(c.id);
                            setHistoryUserName(c.username);
                            setHistoryOpen(true);
                          }}
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Sửa thông tin"
                          className="w-9 h-9 rounded-xl text-blue-600 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-700 transition-all shadow-sm"
                          onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" title={c.is_active ? "Tạm dừng" : "Mở lại"}
                          className={cn(
                            "w-9 h-9 rounded-xl transition-all shadow-sm",
                            c.is_active
                              ? "text-amber-600 bg-amber-50/50 hover:bg-amber-100 hover:text-amber-700"
                              : "text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-700"
                          )}
                          onClick={(e) => { e.stopPropagation(); confirmToggle(c); }}
                        >
                          {c.is_active ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Xóa tài khoản"
                          className="w-9 h-9 rounded-xl text-rose-500 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-600 transition-all shadow-sm"
                          onClick={(e) => { e.stopPropagation(); confirmDelete(c); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-32">
                    <Users className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold italic text-sm uppercase tracking-widest">Không có dữ liệu phù hợp</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer Statistics & Pagination - Mirroring UI */}
        <div className="px-6 py-4 bg-white/60 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm font-medium text-slate-500">
            Hiển thị <span className="font-bold text-[#5a46e5]">{customers.length}</span> / <span className="font-bold text-slate-800">{totalCount}</span> khách hàng
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 whitespace-nowrap hidden sm:inline-block">Dòng hiển thị:</span>
              <select
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500/10 shadow-sm"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="h-8 px-3 rounded-lg border-slate-200 font-bold text-slate-500 hover:bg-slate-50 text-xs shadow-sm"
              >
                Trước
              </Button>
              <div className="h-8 min-w-[32px] px-2 flex items-center justify-center bg-slate-50 text-slate-600 border border-slate-200 rounded-lg font-bold text-xs" title="Trang hiện tại">
                {page}
              </div>
              <Button
                variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="h-8 px-3 rounded-lg border-slate-200 font-bold text-slate-500 hover:bg-slate-50 text-xs shadow-sm"
              >
                Sau
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Dialog: Create & Edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white rounded-[2rem] p-0 border-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] outline-none">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-8 md:py-10 text-white relative flex items-center gap-6">
            <div className="hidden sm:flex w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl items-center justify-center shadow-inner shrink-0">
              {formMode === 'create' ? <UserPlus className="w-8 h-8 text-white" /> : <Edit className="w-8 h-8 text-white" />}
            </div>
            <div className="flex-1 relative z-10">
              <DialogTitle className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {formMode === 'create' ? 'Tạo Khách hàng mới' : 'Cập nhật Thông tin'}
              </DialogTitle>
              <p className="text-indigo-100/90 mt-2 text-sm md:text-base font-medium">{formMode === 'create' ? 'Thêm tài khoản thành viên vào hệ thống.' : `Chỉnh sửa hồ sơ của khách hàng ${formData.username}`}</p>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 bg-[radial-gradient(circle,rgba(255,255,255,0.4)_0%,transparent_60%)] -translate-y-1/2 translate-x-1/3 rounded-full blur-3xl" />
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label className="text-xs font-black uppercase text-slate-500 tracking-widest pl-1">Họ và Tên Đăng Nhập <span className="text-rose-500">*</span></Label>
                <div className="relative group">
                  <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    required placeholder="Nhập tên đăng nhập..."
                    className={cn(
                      "h-14 bg-white border-2 rounded-2xl pl-14 pr-6 focus:ring-4 focus:ring-indigo-500/10 font-bold text-lg transition-all",
                      formErrors.username ? "border-rose-400 focus:border-rose-500 shadow-[0_0_15px_-3px_rgba(251,113,133,0.3)]" : "border-slate-200 hover:border-indigo-300 focus:border-indigo-600 shadow-sm"
                    )}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                {formErrors.username && <p className="text-sm font-bold text-rose-500 animate-in slide-in-from-top-1 pl-2">{formErrors.username}</p>}
              </div>

              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label className="text-xs font-black uppercase text-slate-500 tracking-widest pl-1">Địa chỉ Email liên hệ <span className="text-rose-500">*</span></Label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                  <Input
                    required type="email" placeholder="example@email.com"
                    className={cn(
                      "h-14 bg-white border-2 rounded-2xl pl-14 pr-6 focus:ring-4 focus:ring-indigo-500/10 font-bold text-lg transition-all",
                      formErrors.email ? "border-rose-400 focus:border-rose-500 shadow-[0_0_15px_-3px_rgba(251,113,133,0.3)]" : "border-slate-200 hover:border-indigo-300 focus:border-indigo-600 shadow-sm"
                    )}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                {formErrors.email && <p className="text-sm font-bold text-rose-500 animate-in slide-in-from-top-1 pl-2">{formErrors.email}</p>}
              </div>

              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label className="text-xs font-black uppercase text-slate-500 tracking-widest pl-1">Số điện thoại</Label>
                <div className="relative group">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 group-focus-within:text-emerald-600 transition-colors" />
                  <Input
                    type="tel" placeholder="VD: 0912345678"
                    className="h-14 bg-white border-2 border-slate-200 hover:border-emerald-300 focus:border-emerald-500 rounded-2xl pl-14 pr-6 focus:ring-4 focus:ring-emerald-500/10 font-bold text-lg transition-all shadow-sm"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {formMode === 'create' && (
                <>
                  <div className="space-y-2 col-span-1">
                    <Label className="text-xs font-black uppercase text-slate-500 tracking-widest pl-1">Mật khẩu ban đầu <span className="text-rose-500">*</span></Label>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                      <Input
                        required type="password" placeholder="Tối thiểu 6 ký tự"
                        className={cn(
                          "h-14 bg-white border-2 rounded-2xl pl-14 pr-6 focus:ring-4 focus:ring-indigo-500/10 font-bold text-base transition-all",
                          formErrors.password ? "border-rose-400 focus:border-rose-500 shadow-[0_0_15px_-3px_rgba(251,113,133,0.3)]" : "border-slate-200 hover:border-indigo-300 focus:border-indigo-600 shadow-sm"
                        )}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                    {formErrors.password && <p className="text-sm font-bold text-rose-500 animate-in slide-in-from-top-1 pl-2">{formErrors.password}</p>}
                  </div>

                  <div className="space-y-2 col-span-1">
                    <Label className="text-xs font-black uppercase text-slate-500 tracking-widest pl-1">Xác nhận Mật khẩu <span className="text-rose-500">*</span></Label>
                    <div className="relative group">
                      <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
                      <Input
                        required type="password" placeholder="Nhập lại mật khẩu"
                        className={cn(
                          "h-14 bg-white border-2 rounded-2xl pl-14 pr-6 focus:ring-4 focus:ring-indigo-500/10 font-bold text-base transition-all",
                          formErrors.confirmPassword ? "border-rose-400 focus:border-rose-500 shadow-[0_0_15px_-3px_rgba(251,113,133,0.3)]" : "border-slate-200 hover:border-indigo-300 focus:border-indigo-600 shadow-sm"
                        )}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                    </div>
                    {formErrors.confirmPassword && <p className="text-sm font-bold text-rose-500 animate-in slide-in-from-top-1 pl-2">{formErrors.confirmPassword}</p>}
                  </div>
                </>
              )}

              {formMode === 'edit' && (
                <>
                  <div className="space-y-2 col-span-1 md:col-span-1">
                    <Label className="text-xs font-black uppercase text-slate-500 tracking-widest pl-1">Điểm tích lũy</Label>
                    <div className="relative group">
                      <Star className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 group-focus-within:text-amber-500 transition-colors" />
                      <Input
                        type="number" className={cn(
                          "h-14 bg-white border-2 rounded-2xl pl-14 pr-6 focus:ring-4 focus:ring-amber-500/10 font-bold text-lg transition-all",
                          formErrors.points ? "border-rose-400 focus:border-rose-500 shadow-[0_0_15px_-3px_rgba(251,113,133,0.3)]" : "border-slate-200 hover:border-amber-300 focus:border-amber-500 shadow-sm"
                        )}
                        value={formData.points}
                        onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                      />
                    </div>
                    {formErrors.points && <p className="text-sm font-bold text-rose-500 animate-in slide-in-from-top-1 pl-2">{formErrors.points}</p>}
                  </div>
                  <div className="space-y-2 col-span-1 md:col-span-1">
                    <Label className="text-xs font-black uppercase text-slate-500 tracking-widest pl-1">Tổng chi (VNĐ)</Label>
                    <div className="relative group">
                      <Wallet className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 group-focus-within:text-emerald-500 transition-colors" />
                      <Input
                        type="number" className={cn(
                          "h-14 bg-white border-2 rounded-2xl pl-14 pr-6 focus:ring-4 focus:ring-emerald-500/10 font-bold text-lg transition-all",
                          formErrors.total_spent ? "border-rose-400 focus:border-rose-500 shadow-[0_0_15px_-3px_rgba(251,113,133,0.3)]" : "border-slate-200 hover:border-emerald-300 focus:border-emerald-500 shadow-sm"
                        )}
                        value={formData.total_spent}
                        onChange={(e) => setFormData({ ...formData, total_spent: Number(e.target.value) })}
                      />
                    </div>
                    {formErrors.total_spent && <p className="text-sm font-bold text-rose-500 animate-in slide-in-from-top-1 pl-2">{formErrors.total_spent}</p>}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200/80">
              <Button type="button" variant="outline" className="flex-1 h-16 rounded-2xl font-black text-slate-500 border-2 border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-all uppercase tracking-widest text-sm" onClick={() => setFormOpen(false)}>HỦY BỎ</Button>
              <Button type="submit" disabled={formLoading} className="flex-[2] h-16 bg-[#5a46e5] hover:bg-[#4838b7] text-white rounded-2xl font-black text-[15px] uppercase tracking-widest shadow-xl shadow-indigo-200 transition-all active:scale-[0.98]">
                {formLoading ? <RefreshCw className="animate-spin w-6 h-6" /> : (formMode === 'create' ? 'TẠO TÀI KHOẢN MỚI' : 'LƯU LẠI THAY ĐỔI')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden bg-white/95 backdrop-blur-md border-none shadow-2xl rounded-[2.5rem] p-0 outline-none">
          <div className="bg-gradient-to-br from-[#5a46e5] to-indigo-800 h-32 md:h-40 relative flex justify-end p-6">
            <div className="absolute -bottom-12 md:-bottom-16 left-6 md:left-12 p-1.5 bg-white rounded-[2rem] shadow-2xl z-10">
              <div className="bg-[#f5f3ff] w-24 h-24 md:w-32 md:h-32 rounded-[1.75rem] flex items-center justify-center border border-indigo-100">
                <UserCircle className="w-14 h-14 md:w-20 md:h-20 text-[#5a46e5]" />
              </div>
            </div>
            <div className="relative z-10 mt-2">
              <Badge className={cn(
                "px-4 md:px-6 py-1.5 md:py-2 rounded-xl md:rounded-2xl font-black border-none text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-white shadow-xl backdrop-blur-md",
                detailCustomer?.is_active ? "bg-emerald-500/90" : "bg-rose-500/90"
              )}>
                {detailCustomer?.is_active ? 'Thành viên Active' : 'Tài khoản Đã Khóa'}
              </Badge>
            </div>
          </div>

          <div className="pt-16 md:pt-20 pb-8 md:pb-12 px-6 md:px-12 space-y-8 md:space-y-10">
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight break-all">{detailCustomer?.username}</h3>
                <p className="text-base md:text-lg text-slate-500 font-bold flex items-center gap-3 break-all">
                  <Mail className="w-5 h-5 text-indigo-500 shrink-0" />
                  {detailCustomer?.email}
                </p>
                {detailCustomer?.phone && (
                  <p className="text-base md:text-lg text-slate-500 font-bold flex items-center gap-3">
                    <Phone className="w-5 h-5 text-emerald-500 shrink-0" />
                    {detailCustomer.phone}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div className="bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Tích lũy</span>
                  <div className="flex items-center justify-center gap-1.5 md:gap-2 text-xl md:text-3xl font-black text-slate-800">
                    <Star className="w-5 h-5 md:w-6 md:h-6 text-amber-500 fill-amber-400 shrink-0" />
                    <span className="truncate">{detailCustomer ? detailCustomer.points.toLocaleString() : 0}</span>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Chi tiêu</span>
                  <div className="flex items-center justify-center gap-1.5 md:gap-2 text-xl md:text-3xl font-black text-emerald-600">
                    <Wallet className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
                    <span className="truncate">{detailCustomer ? new Intl.NumberFormat('vi-VN').format(detailCustomer.total_spent) : 0}đ</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 pt-6 border-t border-slate-100">
              <div className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm shrink-0">
                    <Calendar className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest truncate">Ngày gia nhập</span>
                    <span className="text-base md:text-lg font-bold text-slate-700 truncate">{formatDate(detailCustomer?.date_joined || null)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm shrink-0">
                    <Clock className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest truncate">Đăng nhập</span>
                    <span className="text-base md:text-lg font-bold text-slate-700 truncate">{detailCustomer?.last_login ? formatDateTimeInVietnam(detailCustomer.last_login) : 'Chưa có'}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center bg-indigo-50/50 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-indigo-100 relative overflow-hidden group">
                <ShieldCheck className="absolute -right-4 -bottom-4 md:-right-6 md:-bottom-6 w-24 h-24 md:w-32 md:h-32 text-indigo-100/60 group-hover:scale-110 transition-transform" />
                <div className="relative z-10">
                  <div className="bg-white/80 backdrop-blur-sm w-fit px-3 py-1 md:px-4 md:py-1.5 rounded-lg md:rounded-xl border border-indigo-100 mb-2 md:mb-4">
                    <span className="text-[10px] md:text-[11px] font-black text-indigo-600 uppercase tracking-widest">Hệ thống</span>
                  </div>
                  <h4 className="text-xl md:text-2xl font-black text-indigo-900 mb-1 md:mb-2 italic">MEMBER</h4>
                  <p className="text-indigo-700/60 text-xs md:text-sm font-bold leading-relaxed px-1">Quyền lợi thành viên được bảo vệ.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 md:gap-4 pt-6">
              <Button variant="outline" className="w-full sm:w-auto h-12 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl font-black text-slate-600 border-slate-200 hover:bg-slate-50 transition-all" onClick={() => setDetailOpen(false)}>Thoát màn hình</Button>
              <Button className="w-full sm:w-auto h-12 md:h-14 px-8 md:px-10 bg-[#5a46e5] hover:bg-[#4838b7] text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg shadow-xl shadow-indigo-100 transition-all active:scale-95" onClick={() => { setDetailOpen(false); if (detailCustomer) openEdit(detailCustomer); }}>Chỉnh sửa Hồ sơ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Xác nhận xóa khách hàng"
        description={`Bạn có chắc chắn muốn xóa khách hàng ${deleteTarget?.username}? Tài khoản này sẽ bị vô hiệu hóa vĩnh viễn.`}
        confirmText="Đồng ý xóa"
        isLoading={deleteLoading}
        onConfirm={handleDelete}
      />

      <ConfirmModal
        open={toggleConfirmOpen}
        onOpenChange={setToggleConfirmOpen}
        title={toggleTarget?.is_active ? "Xác nhận tạm dừng" : "Xác nhận mở lại"}
        description={toggleTarget?.is_active
          ? `Bạn có muốn tạm dừng tài khoản ${toggleTarget?.username}? Khách hàng sẽ không thể đăng nhập cho đến khi được mở lại.`
          : `Bạn có muốn kích hoạt lại tài khoản ${toggleTarget?.username}?`
        }
        confirmText={toggleTarget?.is_active ? "Tạm dừng ngay" : "Mở lại ngay"}
        variant={toggleTarget?.is_active ? "warning" : "info"}
        isLoading={toggleLoading}
        onConfirm={handleToggleActive}
      />

      <VoucherHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        userId={historyUserId}
        userName={historyUserName}
      />
    </div>
  );
}
