// import { useState, useEffect } from "react"
// import { useParams, useNavigate } from "react-router-dom"
// import { format } from "date-fns"
// import { ArrowLeft, Ticket, Calendar, Clock, Users, ShoppingCart, Tag, AlertCircle, CheckCircle2, XCircle, Gift, Info } from "lucide-react"
// import { toast } from "sonner"

// import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Separator, Skeleton } from "@/components/ui"
// import { voucherApi } from "@/services/apiService"
// import type { Voucher } from "@/types/voucher"
// import { cn } from "@/lib/utils"

// const CountdownTimer = ({ targetDate, label, color = "rose" }: { targetDate: Date; label: string; color?: "rose" | "amber" | "indigo" }) => {
//   const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

//   useEffect(() => {
//     const calculateTimeLeft = () => {
//       const now = new Date().getTime();
//       const distance = targetDate.getTime() - now;
//       if (distance < 0) return null;
//       return {
//         d: Math.floor(distance / (1000 * 60 * 60 * 24)),
//         h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
//         m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
//         s: Math.floor((distance % (1000 * 60)) / 1000),
//       };
//     };

//     setTimeLeft(calculateTimeLeft());
//     const timer = setInterval(() => {
//       const remaining = calculateTimeLeft();
//       setTimeLeft(remaining);
//       if (!remaining) clearInterval(timer);
//     }, 1000);

//     return () => clearInterval(timer);
//   }, [targetDate]);

//   if (!timeLeft) return null;

//   return (
//     <div className={cn(
//       "p-4 rounded-2xl border flex flex-col items-center gap-3 transition-colors",
//       color === "rose" ? "bg-rose-50 border-rose-100 text-rose-700" :
//       color === "amber" ? "bg-amber-50 border-amber-100 text-amber-700" :
//       "bg-indigo-50 border-indigo-100 text-indigo-700"
//     )}>
//       <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</span>
//       <div className="flex items-center gap-2">
//         <div className="flex flex-col items-center min-w-[3rem]">
//           <span className="text-xl font-black">{timeLeft.d}</span>
//           <span className="text-[8px] font-bold uppercase">Ngày</span>
//         </div>
//         <div className="w-[1px] h-6 bg-current/10" />
//         <div className="flex flex-col items-center min-w-[3rem]">
//           <span className="text-xl font-black">{timeLeft.h}</span>
//           <span className="text-[8px] font-bold uppercase">Giờ</span>
//         </div>
//         <div className="w-[1px] h-6 bg-current/10" />
//         <div className="flex flex-col items-center min-w-[3rem]">
//           <span className="text-xl font-black">{timeLeft.m}</span>
//           <span className="text-[8px] font-bold uppercase">Phút</span>
//         </div>
//         <div className="w-[1px] h-6 bg-current/10" />
//         <div className="flex flex-col items-center min-w-[3rem]">
//           <span className="text-xl font-black">{timeLeft.s}</span>
//           <span className="text-[8px] font-bold uppercase">Giây</span>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default function VoucherDetailPage() {
//   const { voucherId } = useParams()
//   const navigate = useNavigate()
//   const [voucher, setVoucher] = useState<Voucher | null>(null)
//   const [loading, setLoading] = useState(true)
//   const [currentTime, setCurrentTime] = useState(new Date())

//   useEffect(() => {
//     const timer = setInterval(() => setCurrentTime(new Date()), 1000)
//     return () => clearInterval(timer)
//   }, [])

//   useEffect(() => {
//     if (!voucherId) return
//     const fetchVoucher = async () => {
//       try {
//         const data = await voucherApi.get(voucherId)
//         setVoucher(data)
//       } catch (error) {
//         toast.error("Không tải được chi tiết voucher")
//       } finally {
//         setLoading(false)
//       }
//     }
//     fetchVoucher()
//   }, [voucherId])

//   if (loading) {
//     return (
//       <div className="max-w-6xl mx-auto space-y-8 p-4 sm:p-8">
//         <div className="flex items-center gap-5">
//           <Skeleton className="w-11 h-11 rounded-2xl" />
//           <div className="space-y-2">
//             <Skeleton className="h-8 w-64" />
//             <Skeleton className="h-4 w-32" />
//           </div>
//         </div>
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//           <Skeleton className="lg:col-span-2 h-[500px] rounded-[2rem]" />
//           <Skeleton className="h-[500px] rounded-[2rem]" />
//         </div>
//       </div>
//     )
//   }

//   if (!voucher) {
//     return (
//       <div className="flex flex-col items-center justify-center p-32 space-y-6">
//         <AlertCircle className="w-16 h-16 text-slate-300" />
//         <h2 className="text-2xl font-bold text-slate-700">Không tìm thấy Voucher</h2>
//         <Button onClick={() => navigate("/admin/vouchers/list")} variant="outline">
//           <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
//         </Button>
//       </div>
//     )
//   }

//   const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val || 0)

//   const now = currentTime
//   const releaseDate = new Date(voucher.release_date)
//   const expiryDate = new Date(voucher.expiry_date)

//   const isExpired = now > expiryDate
//   const isRunning = now >= releaseDate && now <= expiryDate
//   const isPending = now < releaseDate

//   const getVoucherStatus = () => {
//     if (!voucher.is_active) return {
//       label: "Đã khóa",
//       color: "bg-slate-200 text-slate-700 border-slate-300",
//       preview: "bg-slate-500 text-white border-slate-400/50",
//       card: "bg-slate-400 border-slate-300 grayscale",
//       icon: <XCircle className="w-3 h-3" />
//     };
//     if (isPending) return {
//       label: "Chưa phát hành",
//       color: "bg-sky-100 text-sky-800 border-sky-300",
//       preview: "bg-sky-500 text-white border-sky-400/50",
//       card: "bg-sky-600 border-sky-500",
//       icon: <Clock className="w-3 h-3" />
//     };
//     if (isExpired) return {
//       label: "Đã hết hạn",
//       color: "bg-rose-100 text-rose-800 border-rose-300",
//       preview: "bg-rose-500 text-white border-rose-400/50",
//       card: "bg-rose-600 border-rose-500",
//       icon: <Clock className="w-3 h-3" />
//     };
//     return {
//       label: "Đang hoạt động",
//       color: "bg-emerald-100 text-emerald-800 border-emerald-300",
//       preview: "bg-emerald-500 text-white border-emerald-400/50",
//       card: "bg-indigo-600 border-indigo-500",
//       icon: <CheckCircle2 className="w-3 h-3" />
//     };
//   };

//   const status = getVoucherStatus();
//   const statusBadge = (
//     <Badge variant="secondary" className={cn("font-bold border shadow-sm flex items-center gap-1.5", status.color)}>
//       {status.icon}
//       {status.label}
//     </Badge>
//   );

//   return (
//     <div className="max-w-6xl mx-auto space-y-8 p-4 sm:p-8">
//       {/* Header */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
//         <div className="flex items-center gap-5">
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={() => navigate("/admin/vouchers/list")}
//             className="w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-all text-slate-600 shrink-0"
//           >
//             <ArrowLeft className="h-5 w-5" />
//           </Button>
//           <div>
//             <h1 className="text-3xl font-black tracking-tight text-slate-800 mb-1">Chi tiết Voucher</h1>
//             <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
//               Mã Code: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-indigo-600 font-bold">{voucher.code}</span>
//             </p>
//           </div>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

//         {/* Main Info column */}
//         <div className="lg:col-span-2 space-y-8">
//           {/* Basic Info Card */}
//           <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
//             <CardHeader className="bg-slate-50/50 pb-6 border-b border-slate-100">
//               <div className="flex items-center justify-between w-full">
//                 <div className="flex items-center gap-3">
//                   <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
//                     <Ticket className="w-5 h-5" />
//                   </div>
//                   <div>
//                     <CardTitle className="text-xl font-black text-slate-800">Thông tin cơ bản</CardTitle>
//                     <p className="text-xs text-slate-500 font-medium">Chi tiết chiến dịch voucher</p>
//                   </div>
//                 </div>
//                 {statusBadge}
//               </div>
//             </CardHeader>
//             <CardContent className="p-8">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
//                 <div>
//                   <p className="text-xs font-semibold text-slate-500 mb-1">Tiêu đề Voucher</p>
//                   <p className="text-lg font-bold text-slate-800">{voucher.title}</p>
//                 </div>
//                 <div>
//                   <p className="text-xs font-semibold text-slate-500 mb-1">Loại chiến dịch</p>
//                   <div className="flex items-center gap-2">
//                     {voucher.event_type === 'welcome' && <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">Người mới</span>}
//                     {voucher.event_type === 'holiday' && <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md">Ngày lễ</span>}
//                     {(!voucher.event_type || voucher.event_type === 'regular') && <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">Thường xuyên</span>}
//                   </div>
//                 </div>

//                 <div className="col-span-full">
//                   <Separator className="bg-slate-100" />
//                 </div>

//                 <div>
//                   <p className="text-xs font-semibold text-slate-500 mb-1">Mức ưu đãi</p>
//                   <p className="text-2xl font-black text-indigo-600">
//                     {voucher.discount_type === 'percent' ? `${voucher.discount_value}%` : `${formatCurrency(voucher.discount_value)}đ`}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-xs font-semibold text-slate-500 mb-1">Giảm tối đa</p>
//                   <p className="text-lg font-bold text-slate-700">
//                     {voucher.discount_type === 'percent' && voucher.max_discount_amount
//                       ? `${formatCurrency(voucher.max_discount_amount)}đ`
//                       : <span className="text-slate-400 italic font-normal">Không giới hạn</span>}
//                   </p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Rule Rules Card */}
//           <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
//             <CardHeader className="bg-slate-50/50 pb-6 border-b border-slate-100">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
//                   <Tag className="w-5 h-5" />
//                 </div>
//                 <div>
//                   <CardTitle className="text-xl font-black text-slate-800">Quy định áp dụng</CardTitle>
//                 </div>
//               </div>
//             </CardHeader>
//             <CardContent className="p-8">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
//                 <div className="flex flex-col gap-1">
//                   <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><ShoppingCart className="w-3 h-3" /> Đơn tối thiểu</span>
//                   <span className="font-bold text-slate-700">{formatCurrency(voucher.rule?.min_order_amount || 0)}đ</span>
//                 </div>
//                 <div className="flex flex-col gap-1">
//                   <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><ShoppingCart className="w-3 h-3" /> Số lượng món tối thiểu</span>
//                   <span className="font-bold text-slate-700">{voucher.rule && voucher.rule.min_items > 0 ? voucher.rule.min_items : 1} món</span>
//                 </div>
//                 <div className="flex flex-col gap-1">
//                   <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Users className="w-3 h-3" /> Đối tượng</span>
//                   <span className="font-bold text-slate-700">
//                     {!voucher.rule?.required_role || voucher.rule?.required_role === 'none' ? 'Tất cả mọi người' :
//                       voucher.rule?.required_role === 'vip' ? 'Thành viên VIP' : 'Người dùng đăng nhập'}
//                   </span>
//                 </div>
//                 <div className="flex flex-col gap-1">
//                   <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Gift className="w-3 h-3" /> Ưu đãi sinh nhật</span>
//                   <span className="font-bold text-slate-700">
//                     {voucher.rule?.birthday_only ? <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Có áp dụng</Badge> : 'Không'}
//                   </span>
//                 </div>
//                 {voucher.rule?.period_type && (
//                   <div className="flex flex-col gap-1">
//                     <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Chu kỳ lặp lại</span>
//                     <span className="font-bold text-slate-700 capitalize text-sm bg-slate-100 px-3 py-1 rounded inline-flex w-max">{voucher.rule.period_type}</span>
//                   </div>
//                 )}
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Sidebar Info column */}
//         <div className="lg:col-span-1 space-y-8">
          
//           {/* Time & Usage limits Card */}
//           <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
//             <CardHeader className="bg-slate-50/50 pb-5 border-b border-slate-100 p-6">
//               <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-500" /> Thời gian & Số lượng</CardTitle>
//             </CardHeader>
//             <CardContent className="p-6 space-y-6">
//               <div className="space-y-4">
//                 <div className="flex justify-between items-center">
//                   <span className="text-sm font-medium text-slate-500">Bắt đầu</span>
//                   <span className="text-sm font-bold text-slate-800">{format(releaseDate, 'dd/MM/yyyy HH:mm')}</span>
//                 </div>
//                 {isPending && <CountdownTimer targetDate={releaseDate} label="Sắp bắt đầu sau" color="amber" />}
//                 <div className="flex justify-between items-center">
//                   <span className="text-sm font-medium text-slate-500">Kết thúc</span>
//                   <span className="text-sm font-bold text-rose-600">{format(expiryDate, 'dd/MM/yyyy HH:mm')}</span>
//                 </div>
//                 {isRunning && <CountdownTimer targetDate={expiryDate} label="Thời gian còn lại" color="rose" />}
//               </div>

//               <Separator className="bg-slate-100" />

//               <div className="space-y-4">
//                 <div className="flex justify-between items-center">
//                   <span className="text-sm font-medium text-slate-500">Tổng phát hành</span>
//                   <Badge variant="outline" className="font-mono">{voucher.quantity}</Badge>
//                 </div>
//                 <div className="flex justify-between items-center">
//                   <span className="text-sm font-medium text-slate-500">Đã sử dụng</span>
//                   <Badge variant="secondary" className="font-mono bg-indigo-50 text-indigo-700">{voucher.used_count || 0}</Badge>
//                 </div>
//                 <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
//                   <div
//                     className={cn("h-full rounded-full transition-all", (voucher.used_count || 0) >= voucher.quantity ? "bg-red-500" : "bg-indigo-500")}
//                     style={{ width: `${Math.min(((voucher.used_count || 0) / Math.max(voucher.quantity, 1)) * 100, 100)}%` }}
//                   />
//                 </div>
//                 <p className="text-xs text-right text-slate-400 font-medium">Còn lại: <span className="font-bold text-slate-600">{Math.max(voucher.quantity - (voucher.used_count || 0), 0)}</span></p>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Quick Preview Card (Synchronized with VoucherForm) */}
//           <div className="sticky top-10 space-y-6">
//             <div className="flex items-center gap-2 mb-2">
//               <Ticket className="w-5 h-5 text-slate-500" />
//               <h3 className="font-bold text-slate-800">Xem trước giao diện</h3>
//             </div>

//             <div className="relative group">
//               <div className={cn(
//                 "relative p-5 rounded-2xl shadow-lg border overflow-hidden transition-all duration-500",
//                 status.card
//               )}>
//                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
//                 <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 blur-xl"></div>

//                 <div className="relative z-10 flex flex-col h-full justify-between gap-5">
//                   <div className="flex justify-between items-start">
//                     <div className="flex flex-col gap-2">
//                       <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
//                         <Ticket className="w-5 h-5 text-white" />
//                       </div>
//                       <div className={cn(
//                         "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border shadow-sm flex items-center gap-1.5",
//                         status.preview
//                       )}>
//                         {status.icon}
//                         {status.label}
//                       </div>
//                     </div>
//                     <div className="px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/20 rounded-full font-medium text-xs text-white uppercase tracking-wider font-mono">
//                       {voucher.code}
//                     </div>
//                   </div>

//                   <div>
//                     <p className="text-white/80 text-xs font-semibold uppercase mb-1">
//                       {voucher.event_type === 'holiday' ? 'Chương trình Lễ' : voucher.event_type === 'welcome' ? 'Người mới' : 'Ưu đãi độc quyền'}
//                     </p>
//                     <h4 className="text-lg font-bold text-white line-clamp-2">
//                       {voucher.title}
//                     </h4>
//                   </div>

//                   <div className="pt-4 border-t border-white/20 flex flex-col gap-3">
//                     <div className="flex items-end justify-between">
//                       <div className="flex flex-col">
//                         <span className="text-white/80 text-[10px] mb-0.5 font-bold uppercase tracking-tight">Giá trị nhận</span>
//                         <span className="text-2xl font-black text-white leading-none">
//                           {voucher.discount_type === 'percent'
//                             ? `${voucher.discount_value}%`
//                             : `-${formatCurrency(voucher.discount_value)}đ`}
//                         </span>
//                       </div>
//                       <div className="text-right">
//                         <div className="flex items-center justify-end text-white/90 text-[10px] font-bold mb-1">
//                           <Clock className="w-2.5 h-2.5 mr-1" />
//                           <span>Hết hạn: {format(expiryDate, 'dd/MM/yyyy')}</span>
//                         </div>
//                         <div className={cn(
//                           "h-7 text-[10px] rounded-full px-4 border-none shadow-sm font-black tracking-tight flex items-center justify-center cursor-default",
//                           voucher.is_active ? "bg-white text-indigo-600" : "bg-slate-200 text-slate-500"
//                         )}>
//                           SỬ DỤNG NGAY
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl space-y-3">
//               <div className="flex items-center gap-2 text-blue-700">
//                 <Info className="w-4 h-4" />
//                 <span className="font-bold text-xs uppercase tracking-wider">Thông tin quy định</span>
//               </div>
//               <p className="text-[12px] text-blue-600/80 leading-relaxed font-medium">
//                 Voucher này sẽ dành cho <b>{!voucher.rule?.required_role || voucher.rule?.required_role === 'none' ? 'Tất cả mọi người' : voucher.rule?.required_role === 'vip' ? 'Member VIP' : 'Khách hàng đăng nhập'}</b>.
//                 {voucher.rule?.min_order_amount > 0 && ` Áp dụng cho đơn hàng từ ${formatCurrency(voucher.rule.min_order_amount)}đ.`}
//                 {voucher.rule && voucher.rule.min_items > 0 && ` Tối thiểu ${voucher.rule.min_items} sản phẩm.`}
//                 {voucher.rule?.birthday_only && ` Chỉ áp dụng tháng sinh nhật.`}
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { 
  ArrowLeft, Ticket, Calendar, Clock, Users, ShoppingCart, 
  Tag, AlertCircle, CheckCircle2, XCircle, Gift, Info, 
  TrendingUp, Layers 
} from "lucide-react"
import { toast } from "sonner"
import { formatDateInVietnam, formatDateTimeInVietnam } from "@/utils/dateTime"

import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Separator, Skeleton } from "@/components/ui"
import { voucherApi } from "@/services/apiService"
import { cn } from "@/lib/utils"

const CountdownTimer = ({ targetDate, label, color = "rose" }: { targetDate: Date; label: string; color?: "rose" | "amber" | "indigo" }) => {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;
      if (distance < 0) return null;
      return {
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (!remaining) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className={cn(
      "p-4 rounded-2xl border flex flex-col items-center gap-3 transition-colors",
      color === "rose" ? "bg-rose-50 border-rose-100 text-rose-700" :
      color === "amber" ? "bg-amber-50 border-amber-100 text-amber-700" :
      "bg-indigo-50 border-indigo-100 text-indigo-700"
    )}>
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center min-w-[3rem]">
          <span className="text-xl font-black">{timeLeft.d}</span>
          <span className="text-[8px] font-bold uppercase">Ngày</span>
        </div>
        <div className="w-[1px] h-6 bg-current/10" />
        <div className="flex flex-col items-center min-w-[3rem]">
          <span className="text-xl font-black">{timeLeft.h}</span>
          <span className="text-[8px] font-bold uppercase">Giờ</span>
        </div>
        <div className="w-[1px] h-6 bg-current/10" />
        <div className="flex flex-col items-center min-w-[3rem]">
          <span className="text-xl font-black">{timeLeft.m}</span>
          <span className="text-[8px] font-bold uppercase">Phút</span>
        </div>
        <div className="w-[1px] h-6 bg-current/10" />
        <div className="flex flex-col items-center min-w-[3rem]">
          <span className="text-xl font-black">{timeLeft.s}</span>
          <span className="text-[8px] font-bold uppercase">Giây</span>
        </div>
      </div>
    </div>
  );
};

export default function VoucherDetailPage() {
  const { voucherId } = useParams()
  const navigate = useNavigate()
  const [voucher, setVoucher] = useState<any | null>(null) // Dùng any tạm để khớp các trường mới
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!voucherId) return
    const fetchVoucher = async () => {
      try {
        const data = await voucherApi.get(voucherId)
        setVoucher(data)
      } catch (error) {
        toast.error("Không tải được chi tiết voucher")
      } finally {
        setLoading(false)
      }
    }
    fetchVoucher()
  }, [voucherId])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 p-4 sm:p-8">
        <div className="flex items-center gap-5">
          <Skeleton className="w-11 h-11 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-2 h-[500px] rounded-[2rem]" />
          <Skeleton className="h-[500px] rounded-[2rem]" />
        </div>
      </div>
    )
  }

  if (!voucher) {
    return (
      <div className="flex flex-col items-center justify-center p-32 space-y-6">
        <AlertCircle className="w-16 h-16 text-slate-300" />
        <h2 className="text-2xl font-bold text-slate-700">Không tìm thấy Voucher</h2>
        <Button onClick={() => navigate("/admin/vouchers/list")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
        </Button>
      </div>
    )
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val || 0)

  const now = currentTime
  const releaseDate = new Date(voucher.release_date)
  const expiryDate = new Date(voucher.expiry_date)

  const isExpired = now > expiryDate
  const isRunning = now >= releaseDate && now <= expiryDate
  const isPending = now < releaseDate

  const getVoucherStatus = () => {
    if (!voucher.is_active) return {
      label: "Đã khóa",
      color: "bg-slate-200 text-slate-700 border-slate-300",
      preview: "bg-slate-500 text-white border-slate-400/50",
      card: "bg-slate-400 border-slate-300 grayscale",
      icon: <XCircle className="w-3 h-3" />
    };
    if (isPending) return {
      label: "Chưa phát hành",
      color: "bg-sky-100 text-sky-800 border-sky-300",
      preview: "bg-sky-500 text-white border-sky-400/50",
      card: "bg-sky-600 border-sky-500",
      icon: <Clock className="w-3 h-3" />
    };
    if (isExpired) return {
      label: "Đã hết hạn",
      color: "bg-rose-100 text-rose-800 border-rose-300",
      preview: "bg-rose-500 text-white border-rose-400/50",
      card: "bg-rose-600 border-rose-500",
      icon: <Clock className="w-3 h-3" />
    };
    return {
      label: "Đang hoạt động",
      color: "bg-emerald-100 text-emerald-800 border-emerald-300",
      preview: "bg-emerald-500 text-white border-emerald-400/50",
      card: "bg-indigo-600 border-indigo-500",
      icon: <CheckCircle2 className="w-3 h-3" />
    };
  };

  const status = getVoucherStatus();
  const statusBadge = (
    <Badge variant="secondary" className={cn("font-bold border shadow-sm flex items-center gap-1.5", status.color)}>
      {status.icon}
      {status.label}
    </Badge>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
        <div className="flex items-center gap-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/vouchers/list")}
            className="w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-all text-slate-600 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800 mb-1">Chi tiết Voucher</h1>
            <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
              Mã Code: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-indigo-600 font-bold">{voucher.code}</span>
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/admin/vouchers/edit/${voucher.id}`)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-8 h-12 shadow-lg shadow-indigo-100">
          Chỉnh sửa thông số
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Info column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Basic Info Card */}
          <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-slate-50/50 pb-6 border-b border-slate-100">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black text-slate-800">Thông tin cơ bản</CardTitle>
                    <p className="text-xs text-slate-500 font-medium">Chi tiết chiến dịch voucher</p>
                  </div>
                </div>
                {statusBadge}
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Tiêu đề Voucher</p>
                  <p className="text-lg font-bold text-slate-800">{voucher.title}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Loại chiến dịch</p>
                  <div className="flex items-center gap-2">
                    {voucher.event_type === 'welcome' && <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100">Người mới</Badge>}
                    {voucher.event_type === 'holiday' && <Badge className="bg-rose-50 text-rose-700 border-rose-100">Ngày lễ</Badge>}
                    {voucher.event_type === 'manual' && <Badge className="bg-amber-50 text-amber-700 border-amber-100">Tự động/Thủ công</Badge>}
                    {(!voucher.event_type || voucher.event_type === 'regular') && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">Thường xuyên</Badge>}
                  </div>
                </div>

                <div className="col-span-full">
                  <Separator className="bg-slate-100" />
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Mức ưu đãi</p>
                  <p className="text-2xl font-black text-indigo-600">
                    {voucher.discount_type === 'percent' ? `${voucher.discount_value}%` : `${formatCurrency(voucher.discount_value)}đ`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Giảm tối đa</p>
                  <p className="text-lg font-bold text-slate-700">
                    {voucher.discount_type === 'percent' && voucher.max_discount_amount
                      ? `${formatCurrency(voucher.max_discount_amount)}đ`
                      : <span className="text-slate-400 italic font-normal">Không giới hạn</span>}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rule Rules Card */}
          <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-slate-50/50 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-slate-800">Quy định áp dụng</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><ShoppingCart className="w-3 h-3" /> Đơn tối thiểu</span>
                  <span className="font-bold text-slate-700">{formatCurrency(voucher.rule?.min_order_amount || 0)}đ</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Layers className="w-3 h-3" /> Loại sản phẩm</span>
                  <span className="font-bold text-cyan-600 uppercase text-xs tracking-wider">{voucher.rule?.required_product_type || "Tất cả"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Users className="w-3 h-3" /> Đối tượng nhận</span>
                  <span className="font-bold text-slate-700">
                    {!voucher.rule?.required_role || voucher.rule?.required_role === 'none' ? 'Tất cả mọi người' :
                      voucher.rule?.required_role === 'vip' ? 'Thành viên VIP' : 'Người dùng đăng nhập'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5"><Gift className="w-3 h-3" /> Ưu đãi sinh nhật</span>
                  <span className="font-bold text-slate-700">
                    {voucher.rule?.birthday_only ? <Badge className="bg-amber-50 text-amber-700 border-amber-200">Có áp dụng</Badge> : 'Không'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NEW: Accumulated System Rules Card */}
          <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-slate-50/50 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black text-slate-800">Điều kiện tích lũy hệ thống</CardTitle>
                  <p className="text-xs text-slate-500 font-medium">KPI cho việc tự động phát hành Voucher</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Thời gian xét duyệt</p>
                  <p className="font-bold text-slate-800">
                    {voucher.rule?.target_month ? `Tháng ${voucher.rule.target_month}` : ''}
                    {voucher.rule?.target_year ? ` / Năm ${voucher.rule.target_year}` : ''}
                    {!voucher.rule?.target_month && !voucher.rule?.target_year && voucher.rule?.lookback_days > 0 ? `Lùi ${voucher.rule.lookback_days} ngày` : ''}
                    {!voucher.rule?.target_month && !voucher.rule?.target_year && !voucher.rule?.lookback_days && "Không giới hạn"}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Số đơn tối thiểu</p>
                  <p className="font-bold text-emerald-600 text-lg">{voucher.rule?.min_accumulated_orders || 0} <span className="text-xs text-slate-400">Đơn</span></p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Tiền tích lũy tối thiểu</p>
                  <p className="font-bold text-emerald-600 text-lg">{formatCurrency(voucher.rule?.min_accumulated_spent || 0)}đ</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info column */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Time & Usage limits Card */}
          <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-slate-50/50 pb-5 border-b border-slate-100 p-6">
              <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-500" /> Thời gian & Số lượng</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500">Bắt đầu</span>
                  <span className="text-sm font-bold text-slate-800">{formatDateTimeInVietnam(releaseDate, { second: undefined })}</span>
                </div>
                {isPending && <CountdownTimer targetDate={releaseDate} label="Sắp bắt đầu sau" color="amber" />}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500">Kết thúc</span>
                  <span className="text-sm font-bold text-rose-600">{formatDateTimeInVietnam(expiryDate, { second: undefined })}</span>
                </div>
                {isRunning && <CountdownTimer targetDate={expiryDate} label="Thời gian còn lại" color="rose" />}
              </div>

              <Separator className="bg-slate-100" />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500">Tổng phát hành</span>
                  <Badge variant="outline" className="font-mono">{voucher.quantity}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-500">Đã sử dụng</span>
                  <Badge variant="secondary" className="font-mono bg-indigo-50 text-indigo-700">{voucher.used_count || 0}</Badge>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className={cn("h-full rounded-full transition-all", (voucher.used_count || 0) >= voucher.quantity ? "bg-red-500" : "bg-indigo-500")}
                    style={{ width: `${Math.min(((voucher.used_count || 0) / Math.max(voucher.quantity, 1)) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-right text-slate-400 font-medium">Còn lại: <span className="font-bold text-slate-600">{Math.max(voucher.quantity - (voucher.used_count || 0), 0)}</span></p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Preview Card */}
          <div className="sticky top-10 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="w-5 h-5 text-slate-500" />
              <h3 className="font-bold text-slate-800">Xem trước giao diện</h3>
            </div>

            <div className="relative group">
              <div className={cn(
                "relative p-5 rounded-2xl shadow-lg border overflow-hidden transition-all duration-500",
                status.card
              )}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 blur-xl"></div>

                <div className="relative z-10 flex flex-col h-full justify-between gap-5">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                        <Ticket className="w-5 h-5 text-white" />
                      </div>
                      <div className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border shadow-sm flex items-center gap-1.5",
                        status.preview
                      )}>
                        {status.icon}
                        {status.label}
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/20 rounded-full font-medium text-xs text-white uppercase tracking-wider font-mono">
                      {voucher.code}
                    </div>
                  </div>

                  <div>
                    <p className="text-white/80 text-xs font-semibold uppercase mb-1">
                      {voucher.event_type === 'holiday' ? 'Chương trình Lễ' : voucher.event_type === 'welcome' ? 'Người mới' : 'Ưu đãi độc quyền'}
                    </p>
                    <h4 className="text-lg font-bold text-white line-clamp-2">
                      {voucher.title}
                    </h4>
                  </div>

                  <div className="pt-4 border-t border-white/20 flex flex-col gap-3">
                    <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-white/80 text-[10px] mb-0.5 font-bold uppercase tracking-tight">Giá trị nhận</span>
                        <span className="text-2xl font-black text-white leading-none">
                          {voucher.discount_type === 'percent'
                            ? `${voucher.discount_value}%`
                            : `-${formatCurrency(voucher.discount_value)}đ`}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end text-white/90 text-[10px] font-bold mb-1">
                          <Clock className="w-2.5 h-2.5 mr-1" />
                          <span>Hết hạn: {formatDateInVietnam(expiryDate)}</span>
                        </div>
                        <div className={cn(
                          "h-7 text-[10px] rounded-full px-4 border-none shadow-sm font-black tracking-tight flex items-center justify-center cursor-default",
                          voucher.is_active ? "bg-white text-indigo-600" : "bg-slate-200 text-slate-500"
                        )}>
                          SỬ DỤNG NGAY
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-blue-700">
                <Info className="w-4 h-4" />
                <span className="font-bold text-xs uppercase tracking-wider">Thông tin quy định</span>
              </div>
              <div className="text-[12px] text-blue-600/80 leading-relaxed font-medium space-y-1">
                <p>• Đối tượng: <b>{!voucher.rule?.required_role || voucher.rule?.required_role === 'none' ? 'Tất cả' : voucher.rule?.required_role === 'vip' ? 'Member VIP' : 'User đăng nhập'}</b></p>
                <p>• Đơn tối thiểu: <b>{formatCurrency(voucher.rule?.min_order_amount || 0)}đ</b></p>
                <p>• Loại sản phẩm: <span className="text-cyan-600 font-bold uppercase">{voucher.rule?.required_product_type || "Tất cả"}</span></p>
                {voucher.rule?.birthday_only && <p className="text-amber-600 font-bold">• Chỉ áp dụng tháng sinh nhật</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
