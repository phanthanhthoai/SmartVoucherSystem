import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { voucherApi } from '@/services/apiService';
import { Calendar, History, Clock, User, Mail, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDateInVietnam, formatDateTimeInVietnam } from '@/utils/dateTime';

interface VoucherHistory {
  id: number;
  voucher_id: number;
  voucher_code: string;
  voucher_title: string;
  discount_type: string;
  discount_value: number;
  expiry_date: string;
  is_used: boolean;
  assigned_at: string;
  used_at: string | null;
  remaining_uses: number;
}

interface UserInfo {
  id: number;
  username: string;
  email: string;
}

interface VoucherHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number | null;
  userName?: string;
}

export default function VoucherHistoryModal({ open, onOpenChange, userId, userName }: VoucherHistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<VoucherHistory[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    if (open && userId) {
      fetchHistory();
    } else {
      setHistory([]);
      setUserInfo(null);
    }
  }, [open, userId]);

  const fetchHistory = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await voucherApi.userHistory(userId);
      setHistory(data.results);
      setUserInfo(data.user);
    } catch (error) {
      console.error('Failed to fetch voucher history', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return formatDateTimeInVietnam(dateString, { second: undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden bg-white/95 backdrop-blur-xl border-none shadow-[0_25px_70px_-15px_rgba(0,0,0,0.3)] rounded-[2.5rem] p-0 outline-none flex flex-col">
        {/* Header - Gradient Background */}
        <div className="bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 p-8 md:p-10 shrink-0 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                <History className="w-8 h-8 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  Lịch sử Voucher
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                   <div className="flex items-center gap-2 text-indigo-100/90 text-sm font-bold">
                    <User className="w-4 h-4" />
                    {userName || userInfo?.username || "Đang tải..."}
                  </div>
                  {userInfo?.email && (
                    <div className="flex items-center gap-2 text-indigo-100/70 text-xs font-medium">
                      <Mail className="w-3.5 h-3.5" />
                      {userInfo.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 text-center min-w-[100px]">
                <span className="block text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-0.5">Tổng nhận</span>
                <span className="text-2xl font-black text-white leading-none">{history.length}</span>
              </div>
              <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 rounded-2xl px-5 py-3 text-center min-w-[100px]">
                <span className="block text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-0.5">Đã dùng</span>
                <span className="text-2xl font-black text-emerald-300 leading-none">{history.filter(h => h.is_used).length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-0 relative">
           <ScrollArea className="h-full max-h-[calc(90vh-220px)] border-t border-slate-100">
            <div className="p-6 md:p-8">
              <Table>
                <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-[0.15em] pl-6 py-5">Voucher</TableHead>
                    <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-[0.15em] text-center">Giá trị</TableHead>
                    <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-[0.15em] text-center">Trạng thái</TableHead>
                    <TableHead className="font-black text-slate-500 uppercase text-[10px] tracking-[0.15em]">Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse h-24 border-slate-50">
                        <TableCell colSpan={4} className="py-8"><div className="h-12 bg-slate-100 rounded-2xl w-full"></div></TableCell>
                      </TableRow>
                    ))
                  ) : history.length > 0 ? (
                    history.map((h) => (
                      <TableRow key={h.id} className="group hover:bg-slate-50 transition-all border-slate-50">
                        <TableCell className="pl-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 flex items-center justify-center border border-indigo-100 shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                              <Tag className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-black text-slate-800 text-sm truncate">{h.voucher_title}</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">{h.voucher_code}</span>
                                <span className={cn(
                                  "text-[10px] font-bold",
                                  new Date(h.expiry_date) < new Date() ? "text-rose-500" : "text-slate-400"
                                )}>
                                  Hết: {formatDateInVietnam(h.expiry_date)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={cn(
                            "inline-flex flex-col items-center px-4 py-2 rounded-2xl border font-black shadow-sm",
                            h.discount_type === 'percent' 
                              ? "bg-amber-50 text-amber-700 border-amber-100" 
                              : "bg-indigo-50 text-indigo-700 border-indigo-100"
                          )}>
                            <span className="text-base">
                              {h.discount_type === 'percent' ? `${h.discount_value}%` : `${h.discount_value.toLocaleString()}đ`}
                            </span>
                            <span className="text-[8px] uppercase tracking-widest opacity-70">
                              {h.discount_type === 'percent' ? 'Giảm giá' : 'Tiền mặt'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            "rounded-full px-4 py-1.5 font-black text-[10px] uppercase tracking-wider border shadow-sm",
                            h.is_used 
                              ? "bg-slate-100 text-slate-500 border-slate-200" 
                              : (new Date(h.expiry_date) < new Date() 
                                  ? "bg-rose-50 text-rose-500 border-rose-200"
                                  : "bg-emerald-50 text-emerald-600 border-emerald-200")
                          )} variant="outline">
                            {h.is_used ? 'ĐÃ SỬ DỤNG' : (new Date(h.expiry_date) < new Date() ? 'HẾT HẠN' : 'KHẢ DỤNG')}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                <Calendar className="w-4 h-4 text-indigo-500" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Thời gian nhận</span>
                                <span className="text-[13px] font-bold text-slate-700">{formatDate(h.assigned_at)}</span>
                              </div>
                            </div>
                            
                            {h.is_used && (
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                  <Clock className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Đã sử dụng lúc</span>
                                  <span className="text-[13px] font-bold text-emerald-700">{formatDate(h.used_at)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-32 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Tag className="w-10 h-10 text-slate-200" />
                          </div>
                          <p className="text-slate-400 font-bold italic text-sm uppercase tracking-[0.2em]">Người này chưa nhận voucher nào</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3 shrink-0 rounded-b-[2.5rem]">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="h-12 px-8 rounded-2xl font-black text-slate-500 border-2 border-slate-200 hover:bg-white hover:text-indigo-600 transition-all uppercase tracking-widest text-xs"
          >
            Đóng màn hình
          </Button>
          <Button 
            onClick={fetchHistory}
            className="h-12 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Làm mới dữ liệu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
