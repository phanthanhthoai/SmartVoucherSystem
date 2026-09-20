import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmModal } from '@/components/layout/admin/confirmModal';
import { API_BASE_URL, authFetch } from '@/services/apiService';
import { Trash2, UserPlus, ShieldCheck, Mail, UserCircle, Edit, ShieldAlert, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ExportDropdown } from '@/components/admin/common/ExportDropdown';
import { exportToExcel, exportToCSV } from '@/utils/downloadUtils';

interface Staff {
  id: number;
  username: string;
  email: string;
  role: string;
  is_staff: boolean;
  is_active: boolean;
}

export default function StaffListPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Dialog: add new staff
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });

  // Dialog: edit role
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);
  const [editRole, setEditRole] = useState('');

  // Dialog: confirm delete
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Dialog: confirm toggle active
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<Staff | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/users/staff/`);
      if (!res.ok) {
        toast.error('Không thể tải danh sách nhân viên');
        return;
      }
      const data = await res.json();
      setStaffList(data);
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleExport = async (type: 'excel' | 'csv') => {
    try {
      setExportLoading(true);
      const res = await authFetch(`${API_BASE_URL}/users/staff/`);
      if (res.ok) {
        const data = await res.json();
        const exportData = data.map((s: Staff) => ({
          'ID': `#${s.id}`,
          'Tên thành viên': s.username,
          'Địa chỉ Email': s.email,
          'Phân quyền': s.role === 'admin' ? 'QUẢN TRỊ VIÊN HỆ THỐNG' : 'NHÂN VIÊN CMS',
          'Trạng thái': s.is_active ? 'ĐANG CÔNG TÁC' : 'TẠM KHÓA TRUY CẬP',
        }));

        if (type === 'excel') exportToExcel(exportData, 'Danh_sach_nhan_vien', 'Nhân viên');
        else exportToCSV(exportData, 'Danh_sach_nhan_vien');
        toast.success(`Xuất file ${type.toUpperCase()} thành công`);
      }
    } catch {
      toast.error('Lỗi khi xuất dữ liệu');
    } finally {
      setExportLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.username || !addForm.email || !addForm.password) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (addForm.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (addForm.password !== addForm.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    setAddLoading(true);
    try {
      // Step 1: Register user
      const regRes = await fetch(`${API_BASE_URL}/users/staff-register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      if (!regRes.ok) {
        const err = await regRes.json().catch(() => ({}));
        toast.error(err.message || 'Tạo tài khoản thất bại');
        return;
      } else {
        toast.success('Đăng ký nhân viên thành công');
        setAddDialogOpen(false);
        setAddForm({ username: '', email: '', password: '', confirmPassword: '' });
        fetchStaff();
      }
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editRole) return;
    setEditLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/users/${editTarget.id}/role/`, {
        method: 'PATCH',
        body: JSON.stringify({ role: editRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Cập nhật vai trò thất bại');
        return;
      }
      toast.success('Cập nhật vai trò thành công');
      setEditDialogOpen(false);
      fetchStaff();
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/users/${deleteTarget.id}/`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Xóa nhân viên thất bại');
        return;
      }
      toast.success('Xóa nhân viên thành công');
      fetchStaff();
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/users/${toggleTarget.id}/toggle-active/`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Cập nhật trạng thái thất bại');
        return;
      }
      toast.success(toggleTarget.is_active ? 'Đã vô hiệu hóa quản trị viên' : 'Đã mở khóa quản trị viên');
      fetchStaff();
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setToggleLoading(false);
      setToggleConfirmOpen(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent pb-1">
            Quản lý Nhân viên
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Chỉ định quyền hạn và quản lý tài khoản đội ngũ quản trị
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportDropdown
            onExport={handleExport}
            isLoading={exportLoading}
          />
          <Button 
            onClick={() => setAddDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-xl px-5 h-11 transition-all font-semibold w-fit"
          >
            <UserPlus className="w-5 h-5 mr-1.5" />
            Thêm Quản trị viên
          </Button>
        </div>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 border-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-white flex items-center gap-3">
                    <UserCircle className="w-7 h-7 opacity-90" />
                    Tài khoản Staff
                  </DialogTitle>
                  <DialogDescription className="text-indigo-100/90 font-medium text-sm mt-1">
                    Hệ thống sẽ cấp quyền cho nhân viên mới vào trang quản trị CMS.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <form onSubmit={handleAddStaff} className="p-8 space-y-6 bg-slate-50/50">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 pl-1">Họ và Tên đăng nhập</label>
                    <Input
                      className="h-12 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-800"
                      placeholder="Nhập tên đăng nhập..."
                      value={addForm.username}
                      onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 pl-1">Email liên hệ</label>
                    <Input
                      className="h-12 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-800"
                      type="email"
                      placeholder="example@mail.com"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 pl-1">Mật khẩu cấp <span className="text-rose-400">*</span></label>
                    <Input
                      className="h-12 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-800"
                      type="password"
                      placeholder="Tối thiểu 6 ký tự"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      required minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 pl-1">Xác nhận Mật khẩu <span className="text-rose-400">*</span></label>
                    <div className="relative">
                      <Input
                        className={`h-12 border-2 rounded-xl focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 pr-10 ${addForm.confirmPassword && addForm.password !== addForm.confirmPassword
                          ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                          : addForm.confirmPassword && addForm.password === addForm.confirmPassword
                            ? 'border-emerald-400 focus:border-emerald-500 bg-emerald-50/30'
                            : 'border-slate-200 focus:border-indigo-500'
                          }`}
                        type="password"
                        placeholder="Nhập lại mật khẩu"
                        value={addForm.confirmPassword}
                        onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                        required
                      />
                      {addForm.confirmPassword && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">
                          {addForm.password === addForm.confirmPassword ? '✅' : '❌'}
                        </span>
                      )}
                    </div>
                    {addForm.confirmPassword && addForm.password !== addForm.confirmPassword && (
                      <p className="text-xs font-bold text-rose-500 pl-1 animate-in slide-in-from-top-1">Mật khẩu xác nhận không khớp</p>
                    )}
                  </div>
                </div>
                <DialogFooter className="pt-4 border-t border-slate-200/80">
                  <Button type="button" variant="outline" className="h-12 rounded-xl border-slate-300 font-bold text-slate-600 w-full" onClick={() => setAddDialogOpen(false)}>
                    Hủy thao tác
                  </Button>
                  <Button type="submit" disabled={addLoading} className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-wide w-full shadow-lg shadow-indigo-100">
                    {addLoading ? 'ĐANG TẠO...' : 'TIẾN HÀNH THÊM MỚI'}
                  </Button>
                </DialogFooter>
              </form>
          </DialogContent>
        </Dialog>

      <div className="grid gap-6">
        <Card className="border-none shadow-xl shadow-slate-200/30 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 bg-white border-b border-slate-100">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                Danh sách Quản trị viên
              </CardTitle>
              <CardDescription className="text-slate-500 font-medium">Bạn có thể thay đổi phân quyền hoặc vô hiệu hóa tài khoản tại đây</CardDescription>
            </div>
            <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-4 py-1.5 rounded-xl text-sm font-bold shadow-sm">
              Đang trực: {staffList.length} nhân sự
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16 text-slate-400 font-bold uppercase tracking-widest text-xs">Đang đồng bộ dữ liệu...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-slate-50/70">
                    <TableRow className="hover:bg-transparent border-slate-100 h-14">
                      <TableHead className="w-[100px] font-bold text-slate-700 pl-8 uppercase text-[12px] tracking-widest whitespace-nowrap">ID Code</TableHead>
                      <TableHead className="font-bold text-slate-700 uppercase text-[12px] tracking-widest whitespace-nowrap">Thông tin Quản trị</TableHead>
                      <TableHead className="font-bold text-slate-700 uppercase text-[12px] tracking-widest whitespace-nowrap">Chức vụ Cấp</TableHead>
                      <TableHead className="text-center font-bold text-slate-700 uppercase text-[12px] tracking-widest whitespace-nowrap">Tình trạng</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 pr-8 uppercase text-[12px] tracking-widest whitespace-nowrap">Quản lý Phân quyền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffList.map((s) => (
                      <TableRow key={s.id} className="group hover:bg-indigo-50/20 cursor-pointer border-slate-100/50 transition-colors h-[84px]">
                        <TableCell className="pl-8">
                          <Badge variant="outline" className="font-mono text-slate-500 border-slate-300 bg-white">#{s.id}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-50 flex items-center justify-center border border-indigo-200/50 shadow-sm shrink-0">
                              {s.role === 'admin' ? <ShieldAlert className="w-5 h-5 text-indigo-600" /> : <UserCircle className="w-5 h-5 text-blue-500" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-[15px] text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">{s.username}</span>
                              <span className="text-[12px] font-bold text-slate-400 mt-0.5 flex items-center gap-1.5"><Mail className="w-3 h-3" /> {s.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "px-3 py-1 font-black text-[10px] uppercase tracking-widest border ring-1 shadow-sm rounded-full",
                              s.role === 'admin' ? "bg-violet-50 text-violet-700 border-violet-200 ring-violet-500/10" : "bg-indigo-50 text-indigo-600 border-indigo-200 ring-indigo-500/10"
                            )}>
                            {s.role === 'admin' ? 'SYSTEM ADMIN' : 'STAFF CMS'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "px-3 py-1 font-bold text-[10px] uppercase tracking-widest border ring-1 shadow-sm rounded-full",
                              s.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10" : "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10"
                            )}>
                            {s.is_active ? 'ĐANG THEO DÕI' : 'TẠM KHÓA'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-2">
                            {s.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-[11px] font-bold uppercase tracking-wider select-none">
                                <ShieldAlert className="w-3.5 h-3.5 text-violet-400" />
                                Chỉ xem
                              </span>
                            ) : (
                              <>
                                <Button
                                  variant="ghost" size="icon"
                                  className={cn(
                                    "w-10 h-10 rounded-xl font-medium transition-all shadow-sm group-hover:scale-110",
                                    s.is_active ? "text-amber-500 bg-amber-50/50 hover:bg-amber-100" : "text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100"
                                  )}
                                  title={s.is_active ? "Khóa Quản trị viên" : "Mở khóa Quản trị viên"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setToggleTarget(s);
                                    setToggleConfirmOpen(true);
                                  }}
                                >
                                  {s.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="w-10 h-10 rounded-xl text-blue-600 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-700 font-medium transition-all shadow-sm group-hover:scale-110"
                                  title="Chỉnh sửa Phân quyền"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditTarget(s);
                                    setEditRole(s.role);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className="w-10 h-10 rounded-xl text-rose-500 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-600 font-medium transition-all shadow-sm group-hover:scale-110"
                                  title="Xóa Nhân viên khỏi CMS"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTarget(s);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {staffList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-16 text-slate-400 font-bold italic tracking-widest uppercase text-sm">
                          Hệ thống hiện chưa có nhân viên nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit role dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 border-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
          <div className="bg-gradient-to-br from-[#5a46e5] to-blue-600 p-8 text-white relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-white flex items-center gap-3">
                <ShieldCheck className="w-7 h-7 opacity-90" />
                Cập nhật Vai trò
              </DialogTitle>
              <DialogDescription className="text-blue-100/90 font-medium text-sm mt-1">
                Thay đổi quyền truy cập CMS cho quản trị viên{' '}
                <span className="font-bold underline italic text-white">{editTarget?.username}</span>
              </DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleEditRole} className="p-8 space-y-6 bg-slate-50/50">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 pl-1">Chọn vai trò hệ thống mới</label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger className="h-14 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-800 bg-white text-base">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-slate-100 shadow-xl">
                  <SelectItem value="staff" className="font-bold text-slate-700 py-3 cursor-pointer">Nhân viên (Staff CMS)</SelectItem>
                  <SelectItem value="customer" className="font-bold text-rose-600 py-3 cursor-pointer">Hạ cấp (Khách hàng)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4 border-t border-slate-200/80">
              <Button type="button" variant="outline" className="h-12 rounded-xl border-slate-300 font-bold text-slate-600 w-full" onClick={() => setEditDialogOpen(false)}>
                Hủy thao tác
              </Button>
              <Button type="submit" disabled={editLoading} className="h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-wide w-full shadow-lg shadow-blue-200/50">
                {editLoading ? 'ĐANG LƯU VÀ ĐỒNG BỘ...' : 'ÁP DỤNG THAY ĐỔI'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa nhân viên"
        description={`Bạn có chắc muốn xóa vĩnh viễn tài khoản "${deleteTarget?.username}" khỏi CMS?`}
        onConfirm={handleDelete}
        confirmText={deleteLoading ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
      />

      <ConfirmModal
        open={toggleConfirmOpen}
        onOpenChange={(open) => {
          setToggleConfirmOpen(open);
          if (!open) setToggleTarget(null);
        }}
        title={toggleTarget?.is_active ? "Khóa Quản trị viên" : "Mở khóa Quản trị viên"}
        description={toggleTarget?.is_active
          ? `Bạn có chắc muốn khóa truy cập của "${toggleTarget?.username}"? Nhân viên này sẽ không thể đăng nhập vào hệ thống.`
          : `Bạn có muốn cấp lại quyền truy cập cho "${toggleTarget?.username}"?`
        }
        variant={toggleTarget?.is_active ? "warning" : "info"}
        onConfirm={handleToggleActive}
        confirmText={toggleLoading ? 'Đang cập nhật...' : (toggleTarget?.is_active ? 'Khóa ngay' : 'Mở khóa')}
      />
    </div>
  );
}
