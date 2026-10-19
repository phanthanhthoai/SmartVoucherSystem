"use client"

import React, { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { 
  CalendarIcon, Ticket, Clock, CheckCircle2, Save, ArrowLeft, 
  RefreshCw, Info, Gift, UserPlus, PartyPopper, Globe, User, Crown, TrendingUp 
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { NumericFormat } from "react-number-format"

import { cn } from "@/lib/utils"
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card, CardContent, CardHeader, CardTitle, CardDescription, Switch } from "@/components/ui"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import type { Voucher } from "@/types/voucher"
import { voucherApi } from "@/services/apiService"
import { toast } from "sonner"
import { addDays, getNowInVietnam, getStartOfTodayInVietnam, toVietnamFormDate } from "@/utils/dateTime"

// 1. CẬP NHẬT SCHEMA THÊM CÁC TRƯỜNG ĐIỀU KIỆN TÍCH LŨY
const formSchema = z.object({
  code: z.string().min(1, "Vui lòng nhập mã voucher"),
  title: z.string().min(1, "Vui lòng nhập tiêu đề voucher"),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().min(1, "Giá trị giảm phải > 0"),
  max_discount_amount: z.number().optional(),
  release_date: z.date(),
  expiry_date: z.date(),
  quantity: z.number().min(1, "Số lượng tối thiểu là 1"),
  is_active: z.boolean(),
  event_type: z.string().nullable(),
  rule: z.object({
    required_role: z.string().nullable(),
    birthday_only: z.boolean(),
    min_order_amount: z.number().min(0),
    min_items: z.number().min(1, "Số lượng món tối thiểu phải từ 1"),
    required_product_type: z.string().nullable(),
    period_type: z.enum(["day", "week", "month"]).nullable(),
    // Các trường tích lũy mới
    lookback_days: z.number().min(0).optional(),
    min_accumulated_orders: z.number().min(0).optional(),
    min_accumulated_spent: z.number().min(0).optional(),
    target_month: z.number().nullable().optional(),
    target_year: z.number().nullable().optional(),
  })
}).superRefine((data, ctx) => {
  if (data.discount_type === 'percent' && data.discount_value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Mức giảm phần trăm không được vượt quá 100%",
      path: ["discount_value"],
    });
  }
  if (data.expiry_date <= data.release_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Ngày kết thúc phải sau ngày bắt đầu",
      path: ["expiry_date"],
    });
  }
});

type FormValues = z.infer<typeof formSchema>

interface VoucherFormProps {
  initialData?: Voucher | any;
  isEdit?: boolean;
}

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

  const colors = {
    rose: { bg: "bg-rose-50/50", border: "border-rose-100/50", text: "text-rose-600", label: "text-rose-400", title: "text-rose-500" },
    amber: { bg: "bg-amber-50/50", border: "border-amber-100/50", text: "text-amber-600", label: "text-amber-400", title: "text-amber-500" },
    indigo: { bg: "bg-indigo-50/50", border: "border-indigo-100/50", text: "text-indigo-600", label: "text-indigo-400", title: "text-indigo-500" },
  }[color];

  return (
    <div className={cn("space-y-3 p-4 rounded-2xl border shadow-sm", colors.bg, colors.border)}>
      <p className={cn("text-[10px] font-black uppercase tracking-widest pl-1", colors.title)}>{label}</p>
      <div className="grid grid-cols-4 gap-2">
        {['d', 'h', 'm', 's'].map((unit) => (
          <div key={unit} className="flex flex-col items-center py-2 rounded-xl bg-white/50 border border-white/50 shadow-sm">
            <span className={cn("text-lg font-black", colors.text)}>{timeLeft[unit as keyof typeof timeLeft]}</span>
            <span className={cn("text-[8px] font-bold uppercase", colors.label)}>
              {unit === 'd' ? 'Ngày' : unit === 'h' ? 'Giờ' : unit === 'm' ? 'Phút' : 'Giây'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DateTimePickerFields = ({
  value,
  onChange,
  onConfirm,
  disabledDates,
}: {
  value: Date;
  onChange: (date: Date) => void;
  onConfirm: () => void;
  disabledDates?: (date: Date) => boolean;
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));
  const seconds = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  const handleTimeChange = (type: 'h' | 'm' | 's', newValue: string) => {
    const next = new Date(value);
    if (type === 'h') next.setHours(parseInt(newValue));
    if (type === 'm') next.setMinutes(parseInt(newValue));
    if (type === 's') next.setSeconds(parseInt(newValue));
    onChange(next);
  };

  return (
    <div className="p-3 space-y-4">
      <Calendar
        mode="single"
        locale={vi}
        formatters={{
          formatCaption: (date, options) => {
            return `Tháng ${format(date, "MM, yyyy", { locale: options?.locale })}`
          }
        }}
        selected={value}
        onSelect={(date) => {
          if (!date) return;
          const next = new Date(date);
          next.setHours(value.getHours(), value.getMinutes(), value.getSeconds());
          onChange(next);
        }}
        disabled={disabledDates}
        initialFocus
      />

      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between px-1">
          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Thời gian (HH:mm:ss)</Label>
          <Clock className="w-3 h-3 text-slate-300" />
        </div>

        <div className="flex items-center gap-2">
          {[
            { type: 'h' as const, vals: hours, val: value.getHours() },
            { type: 'm' as const, vals: minutes, val: value.getMinutes() },
            { type: 's' as const, vals: seconds, val: value.getSeconds() }
          ].map((item, idx) => (
            <React.Fragment key={item.type}>
              <Select
                value={item.val.toString().padStart(2, "0")}
                onValueChange={(v) => handleTimeChange(item.type, v)}
              >
                <SelectTrigger className="flex-1 h-10 rounded-xl bg-slate-50 border-transparent font-bold text-slate-700 text-sm focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[70px] max-h-[200px]">
                  {item.vals.map((v) => (
                    <SelectItem key={v} value={v} className="font-medium text-xs">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {idx < 2 && <span className="text-slate-300 font-bold">:</span>}
            </React.Fragment>
          ))}
        </div>

        <Button
          onClick={onConfirm}
          className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all"
        >
          Xác nhận
        </Button>
      </div>
    </div>
  );
};

export default function VoucherForm({ initialData, isEdit = false }: VoucherFormProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [expiryOpen, setExpiryOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(getNowInVietnam())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getNowInVietnam()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 2. KHỞI TẠO DEFAULT VALUES BAO GỒM CÁC TRƯỜNG MỚI
  const defaultValues: Partial<FormValues> = initialData ? {
    ...initialData,
    release_date: toVietnamFormDate(initialData.release_date),
    expiry_date: toVietnamFormDate(initialData.expiry_date),
    max_discount_amount: initialData.max_discount_amount || 0,
    rule: {
      required_role: initialData.rule?.required_role || "none",
      birthday_only: initialData.rule?.birthday_only || false,
      min_order_amount: initialData.rule?.min_order_amount ?? 0,
      min_items: initialData.rule && initialData.rule.min_items > 0 ? initialData.rule.min_items : 1,
      required_product_type: initialData.rule?.required_product_type || null,
      period_type: initialData.rule?.period_type || null,
      // Dữ liệu tích lũy
      lookback_days: initialData.rule?.lookback_days || 0,
      min_accumulated_orders: initialData.rule?.min_accumulated_orders || 0,
      min_accumulated_spent: initialData.rule?.min_accumulated_spent || 0,
      target_month: initialData.rule?.target_month || null,
      target_year: initialData.rule?.target_year || null,
    },
    is_active: initialData.is_active !== undefined ? initialData.is_active : true,
  } : {
    code: "",
    title: "",
    discount_type: "percent",
    discount_value: 0,
    max_discount_amount: 0,
    release_date: new Date(),
    expiry_date: addDays(new Date(), 30),
    // release_date: getNowInVietnam(),
    // expiry_date: addDays(getNowInVietnam(), 30),
    quantity: 1,
    is_active: true,
    event_type: "regular",
    rule: {
      required_role: "none",
      birthday_only: false,
      min_order_amount: 0,
      min_items: 1,
      required_product_type: null,
      period_type: null,
      lookback_days: 0,
      min_accumulated_orders: 0,
      min_accumulated_spent: 0,
      target_month: null,
      target_year: null,
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues as FormValues,
    mode: "onChange",
  })

  const watchedValues = form.watch()

  const generateRandomCode = () => {
    if (isEdit) return;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    form.setValue('code', `VC-${result}`, { shouldValidate: true })
  }

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true)
      
      // 3. ĐÓNG GÓI PAYLOAD HOÀN CHỈNH
      const payload: any = {
        title: data.title,
        discount_type: data.discount_type,
        discount_value: Number(data.discount_value),
        max_discount_amount: data.discount_type === 'percent' ? Number(data.max_discount_amount) : null,
        quantity: Number(data.quantity),
        event_type: data.event_type,
        is_active: data.is_active,
        release_date: data.release_date.toISOString(),
        expiry_date: data.expiry_date.toISOString(),
        // release_date: toVietnamISOString(data.release_date),
        // expiry_date: toVietnamISOString(data.expiry_date),
        rule: {
          required_role: data.rule.required_role === 'none' ? null : data.rule.required_role,
          birthday_only: data.rule.birthday_only,
          min_order_amount: Number(data.rule.min_order_amount),
          min_items: Number(data.rule.min_items),
          required_product_type: data.rule.required_product_type === 'none' || !data.rule.required_product_type ? null : data.rule.required_product_type,
          period_type: data.rule.period_type || null,
          
          lookback_days: Number(data.rule.lookback_days || 0),
          min_accumulated_orders: Number(data.rule.min_accumulated_orders || 0),
          min_accumulated_spent: Number(data.rule.min_accumulated_spent || 0),
          target_month: data.rule.target_month ? Number(data.rule.target_month) : null,
          target_year: data.rule.target_year ? Number(data.rule.target_year) : null,
        }
      }

      if (data.code && data.code.trim() !== "") {
        payload.code = data.code;
      }

      if (isEdit && initialData?.id) {
        await voucherApi.update(initialData.id, payload)
        toast.success("Cập nhật voucher thành công!")
        navigate(`/admin/vouchers/detail/${initialData.id}`)
      } else {
        await voucherApi.create(payload)
        toast.success("Tạo voucher thành công!")
        navigate("/admin/vouchers/list")
      }
    } catch (error: any) {
      console.error("Lỗi khi lưu voucher:", error)
      toast.error(error.response?.data?.error || "Đã có lỗi xảy ra khi lưu")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val || 0)
  }

  const getVoucherStatus = () => {
    const { is_active, release_date, expiry_date } = watchedValues;
    const now = currentTime;

    if (!is_active) return {
      label: "Đã khóa",
      color: "bg-slate-200 text-slate-900 border-slate-400",
      preview: "bg-slate-600 text-white border-slate-500/50",
      card: "bg-slate-400 border-slate-300 grayscale",
      icon: <Info className="w-3 h-3" />
    };
    if (release_date && now < release_date) return {
      label: "Chưa phát hành",
      color: "bg-sky-100 text-sky-800 border-sky-300",
      preview: "bg-sky-500 text-white border-sky-400/50",
      card: "bg-sky-600 border-sky-500",
      icon: <Clock className="w-3 h-3" />
    };
    if (expiry_date && now > expiry_date) return {
      label: "Đã hết hạn",
      color: "bg-rose-100 text-rose-800 border-rose-300",
      preview: "bg-rose-500 text-white border-rose-400/50",
      card: "bg-rose-600 border-rose-500",
      icon: <Info className="w-3 h-3" />
    };
    return {
      label: "Đang hoạt động",
      color: "bg-emerald-100 text-emerald-800 border-emerald-300",
      preview: "bg-emerald-500 text-white border-emerald-400/50",
      card: "bg-indigo-600 border-indigo-500",
      icon: <CheckCircle2 className="w-3 h-3" />
    };
  };

  const VoucherPreviewCard = () => {
    const status = getVoucherStatus();
    return (
      <div className="sticky top-10 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Ticket className="w-5 h-5 text-slate-500" />
          <h3 className="font-bold text-slate-800">Xem trước giao diện</h3>
        </div>

        <div className="relative group">
          <div className={cn(
            "relative p-5 rounded-2xl shadow-lg overflow-hidden border transition-all duration-500",
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
                <div className="px-3 py-1 bg-white/20 backdrop-blur-sm border border-white/20 rounded-full font-medium text-xs text-white uppercase tracking-wider">
                  {watchedValues.code || "VC-XXXXXXXX"}
                </div>
              </div>

              <div>
                <p className="text-white/80 text-xs font-semibold uppercase mb-1">
                  {watchedValues.event_type === 'holiday' ? 'Chương trình Lễ' : watchedValues.event_type === 'welcome' ? 'Người mới' : 'Ưu đãi độc quyền'}
                </p>
                <h4 className="text-lg font-bold text-white line-clamp-2">
                  {watchedValues.title || "Tên Voucher của bạn..."}
                </h4>
              </div>

              <div className="pt-4 border-t border-white/20 flex flex-col gap-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-white/80 text-[10px] mb-0.5 font-bold uppercase tracking-tight">Giá trị nhận</p>
                    <span className="text-2xl font-black text-white leading-none">
                      {watchedValues.discount_type === 'percent'
                        ? `${watchedValues.discount_value}%`
                        : `-${formatCurrency(watchedValues.discount_value)}đ`}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end text-white/90 text-[10px] font-bold mb-1">
                      <Clock className="w-2.5 h-2.5 mr-1" />
                      <span>Hết hạn: {watchedValues.expiry_date ? format(watchedValues.expiry_date, 'dd/MM/yyyy') : '...'}</span>
                    </div>
                    <div className={cn(
                      "h-7 text-[10px] rounded-full px-4 border-none shadow-sm font-black tracking-tight flex items-center justify-center cursor-default",
                      watchedValues.is_active ? "bg-white text-indigo-600" : "bg-slate-200 text-slate-500"
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
          <p className="text-[12px] text-blue-600/80 leading-relaxed font-medium">
            Voucher này sẽ dành cho <b>{watchedValues.rule.required_role === 'none' || !watchedValues.rule.required_role ? 'Tất cả mọi người' : watchedValues.rule.required_role === 'vip' ? 'Member VIP' : 'Khách hàng đăng nhập'}</b>.
            {watchedValues.rule.min_order_amount > 0 && ` Áp dụng cho đơn hàng từ ${formatCurrency(watchedValues.rule.min_order_amount)}đ.`}
            {watchedValues.rule.min_items > 0 && ` Tối thiểu ${watchedValues.rule.min_items} sản phẩm.`}
            {watchedValues.rule.birthday_only && ` Chỉ áp dụng tháng sinh nhật.`}
            {watchedValues.rule.required_product_type && ` Loại SP: ${watchedValues.rule.required_product_type}.`}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
        <div className="flex items-center gap-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/vouchers/list")}
            className="w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-all text-slate-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
              {isEdit ? "Cập nhật Voucher" : "Tạo Voucher mới"}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {isEdit ? `Chỉnh sửa thông số chiến dịch ${initialData?.code ? `[${initialData.code}]` : ''}` : "Tạo mẫu ưu đãi mới và phát hành cho người dùng"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/vouchers/list")}
            className="rounded-xl font-bold h-11 px-6 border-slate-200 hover:bg-slate-50"
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold h-11 px-8 shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? "Đang xử lý..." : "Lưu Thay đổi"}
          </Button>
        </div>
      </div>

      {isEdit && (
        <div className="bg-[#fff9eb] border border-amber-200/50 rounded-2xl p-5 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-sm text-amber-900 leading-relaxed font-medium">
            <span className="font-black text-base block mb-0.5">Chế độ chỉnh sửa! 📝</span>
            Bạn có thể thay đổi hầu hết các thông số của Voucher. Để đảm bảo tính chính xác của hệ thống, chỉ có <b>Mã Voucher</b> là không thể thay đổi sau khi đã tạo.
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit as any)} className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* Form Column */}
        <div className="lg:col-span-2 space-y-8">

          {/* CARD 1: THÔNG TIN CƠ BẢN */}
          <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-slate-50/50 pb-6 border-b border-slate-100">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800">Thông tin cơ bản</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">Thiết lập cấu hình chung</CardDescription>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-black border shadow-sm flex items-center gap-1.5",
                  getVoucherStatus().color
                )}>
                  {getVoucherStatus().icon}
                  {getVoucherStatus().label}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="code" className={cn("font-semibold text-sm text-slate-700 pl-1", isEdit && "text-slate-400")}>
                    Mã Voucher {isEdit && <span className="text-[10px] lowercase font-normal italic">(Khóa)</span>}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="code"
                        className={cn(
                          "uppercase font-mono tracking-widest h-12 rounded-xl bg-slate-50 focus:bg-white pl-4 transition-all shadow-inner border-transparent focus:ring-indigo-500/10",
                          isEdit && "text-slate-400 opacity-70",
                          form.formState.errors.code && "border-red-500"
                        )}
                        placeholder="VD: VC50K"
                        disabled={isEdit}
                        {...form.register("code")}
                      />
                    </div>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={generateRandomCode}
                      disabled={isEdit}
                      className="h-12 w-12 rounded-xl border-slate-200 bg-white hover:bg-slate-50 shadow-sm text-indigo-600 disabled:opacity-50 flex items-center justify-center p-0"
                      title={isEdit ? "Đã khóa" : "Tạo ngẫu nhiên"}
                    >
                      <RefreshCw className="w-5 h-5" />
                    </Button>
                  </div>
                  {form.formState.errors.code && !isEdit && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{form.formState.errors.code.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title" className="font-semibold text-sm text-slate-700 pl-1">Tiêu đề Voucher <span className="text-red-500">*</span></Label>
                  <Input
                    id="title"
                    placeholder="VD: Giảm 20% cho đơn từ 200k"
                    className={cn(
                      "h-12 rounded-xl bg-slate-50 focus:bg-white transition-all shadow-inner border-transparent focus:ring-indigo-500/10 font-bold",
                      form.formState.errors.title && "border-red-500 focus:ring-red-500/10 bg-red-50/30"
                    )}
                    {...form.register("title")}
                  />
                  {form.formState.errors.title && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{form.formState.errors.title.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm text-slate-700 pl-1">Loại chiến dịch</Label>
                  <Select
                    value={watchedValues.event_type || 'regular'}
                    onValueChange={(val) => form.setValue("event_type", val)}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 hover:bg-white transition-all shadow-inner border-transparent font-black text-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                      <SelectItem value="regular" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-indigo-500" />
                          <span>Thường xuyên</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="welcome" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-emerald-500" />
                          <span>User Mới</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="holiday" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <PartyPopper className="w-4 h-4 text-rose-500" />
                          <span>Ngày Lễ</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="manual" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-amber-500" />
                          <span>Tự động/Thủ công</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm text-slate-700 pl-1">Số lượng phát hành</Label>
                  <div className="relative">
                    <Controller
                      control={form.control}
                      name="quantity"
                      render={({ field: { onChange, value } }) => (
                        <NumericFormat
                          value={value === 0 ? "" : value}
                          onValueChange={(values) => onChange(values.floatValue || 0)}
                          thousandSeparator="."
                          decimalSeparator=","
                          customInput={Input}
                          placeholder="VD: 100"
                          className={cn(
                            "h-12 rounded-xl bg-slate-50 focus:bg-white transition-all shadow-inner border-transparent font-bold pr-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                            form.formState.errors.quantity && "border-red-500"
                          )}
                        />
                      )}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Vé</div>
                  </div>
                  <div className="min-h-[20px]">
                    {form.formState.errors.quantity && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{form.formState.errors.quantity.message}</p>}
                  </div>
                </div>

                <div className="space-y-2 pt-6">
                  <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 w-full">
                    <Switch
                      id="is_active"
                      checked={watchedValues.is_active}
                      onCheckedChange={(checked) => form.setValue("is_active", checked)}
                    />
                    <Label htmlFor="is_active" className="font-semibold text-sm text-slate-700 cursor-pointer">Hoạt động ngay</Label>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className={cn("font-semibold text-sm text-slate-700 pl-1")}>Loại ưu đãi</Label>
                  <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 shadow-inner">
                    <button
                      type="button"
                      onClick={() => form.setValue("discount_type", "percent")}
                      className={cn(
                        "flex-1 h-10 rounded-xl font-bold text-sm transition-all",
                        watchedValues.discount_type === 'percent' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => form.setValue("discount_type", "fixed")}
                      className={cn(
                        "flex-1 h-10 rounded-xl font-bold text-sm transition-all",
                        watchedValues.discount_type === 'fixed' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      VNĐ
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={cn("font-semibold text-sm text-slate-700 pl-1")}>Mức ưu đãi</Label>
                  <div className="relative">
                    <Controller
                      control={form.control}
                      name="discount_value"
                      render={({ field: { onChange, value } }) => (
                        <NumericFormat
                          value={value === 0 ? "" : value}
                          onValueChange={(values) => onChange(values.floatValue || 0)}
                          thousandSeparator="."
                          decimalSeparator=","
                          customInput={Input}
                          placeholder={watchedValues.discount_type === 'percent' ? "VD: 10" : "VD: 50.000"}
                          className={cn(
                            "h-12 rounded-xl bg-slate-50 focus:bg-white transition-all shadow-inner border-transparent font-bold text-blue-600 text-lg pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                            form.formState.errors.discount_value && "border-red-500"
                          )}
                        />
                      )}
                    />
                    <div className={cn("absolute right-4 top-1/2 -translate-y-1/2 font-bold text-lg text-slate-400")}>
                      {watchedValues.discount_type === 'percent' ? '%' : 'đ'}
                    </div>
                  </div>
                  {form.formState.errors.discount_value && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{form.formState.errors.discount_value.message}</p>}
                </div>
              </div>

              {watchedValues.discount_type === 'percent' && (
                <div className="space-y-3 p-5 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2 text-indigo-700 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <Label className="font-semibold text-xs mt-0.5">Giới hạn tối đa (VNĐ)</Label>
                  </div>
                  <div className="relative">
                    <Controller
                      control={form.control}
                      name="max_discount_amount"
                      render={({ field: { onChange, value } }) => (
                        <NumericFormat
                          placeholder="Không giới hạn"
                          value={value === 0 ? "" : value}
                          onValueChange={(values) => onChange(values.floatValue || 0)}
                          thousandSeparator="."
                          decimalSeparator=","
                          customInput={Input}
                          className="h-11 rounded-xl bg-white border-indigo-100 font-bold pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      )}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-sm">đ</div>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

          {/* CARD 2: CẤU HÌNH QUY ĐỊNH SỬ DỤNG */}
          <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-slate-50/50 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Cấu hình Quy định sử dụng</CardTitle>
                  <CardDescription className="text-slate-500 font-medium">Thời gian và điều kiện áp dụng</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className={cn("font-semibold text-sm text-slate-700 pl-1")}>Từ ngày</Label>
                  <Popover open={releaseOpen} onOpenChange={setReleaseOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full h-12 rounded-xl justify-start text-left font-bold border-transparent bg-slate-50 hover:bg-slate-100",
                          !watchedValues.release_date && "text-muted-foreground",
                          form.formState.errors.release_date && "border-red-500 bg-red-50"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {watchedValues.release_date ? format(watchedValues.release_date, "dd/MM/yyyy HH:mm:ss") : <span>Chọn ngày & giờ</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DateTimePickerFields
                        value={watchedValues.release_date || new Date()}
                        onChange={(date) => form.setValue("release_date", date)}
                        onConfirm={() => setReleaseOpen(false)}
                        disabledDates={(date) => date < getStartOfTodayInVietnam()}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="min-h-[20px]">
                    {form.formState.errors.release_date && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{form.formState.errors.release_date.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm text-slate-700 pl-1">Đến ngày</Label>
                  <Popover open={expiryOpen} onOpenChange={setExpiryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full h-12 rounded-xl justify-start text-left font-bold border-transparent bg-slate-50 hover:bg-slate-100",
                          !watchedValues.expiry_date && "text-muted-foreground",
                          form.formState.errors.expiry_date && "border-red-500 bg-red-50"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {watchedValues.expiry_date ? format(watchedValues.expiry_date, "dd/MM/yyyy HH:mm:ss") : <span>Chọn ngày & giờ</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DateTimePickerFields
                        value={watchedValues.expiry_date || new Date()}
                        onChange={(date) => form.setValue("expiry_date", date)}
                        onConfirm={() => setExpiryOpen(false)}
                        disabledDates={(date) => !!watchedValues.release_date && date < new Date(new Date(watchedValues.release_date).setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="min-h-[20px]">
                    {form.formState.errors.expiry_date && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{form.formState.errors.expiry_date.message}</p>}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm text-slate-700 pl-1">Điều kiện đơn hàng tối thiểu</Label>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="relative">
                        <Controller
                          control={form.control}
                          name="rule.min_order_amount"
                          render={({ field: { onChange, value } }) => (
                            <NumericFormat
                              value={value === 0 ? "" : value}
                              onValueChange={(values) => onChange(values.floatValue || 0)}
                              thousandSeparator="."
                              decimalSeparator=","
                              customInput={Input}
                              placeholder="VD: 10.000"
                              className="h-12 rounded-xl bg-slate-50 border-transparent font-bold pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          )}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">đ</div>
                      </div>
                      <div className="min-h-[20px]">
                        {form.formState.errors.rule?.min_order_amount && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{form.formState.errors.rule.min_order_amount.message}</p>}
                      </div>
                    </div>

                    <div className="w-24 space-y-1">
                      <div className="relative">
                        <Controller
                          control={form.control}
                          name="rule.min_items"
                          render={({ field: { onChange, value } }) => (
                            <NumericFormat
                              value={value}
                              onValueChange={(values) => onChange(values.floatValue ?? 0)}
                              thousandSeparator="."
                              decimalSeparator=","
                              customInput={Input}
                              placeholder="1"
                              className="h-12 rounded-xl bg-slate-50 border-transparent font-bold pr-8 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          )}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Món</div>
                      </div>
                      <div className="min-h-[20px]">
                        {form.formState.errors.rule?.min_items && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{form.formState.errors.rule.min_items.message}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold text-sm text-slate-700 pl-1">Đối tượng nhận</Label>
                  <Select
                    value={watchedValues.rule.required_role || 'none'}
                    onValueChange={(val) => form.setValue("rule.required_role", val)}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-transparent font-bold text-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-slate-500" />
                          <span>Tất cả</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="customer" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-500" />
                          <span>User Đăng nhập</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="vip" className="rounded-lg">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-500" />
                          <span>Member VIP</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-100 w-full h-12">
                    <Checkbox
                      id="birthday_only"
                      checked={watchedValues.rule.birthday_only}
                      onCheckedChange={(checked: boolean | 'indeterminate') => form.setValue("rule.birthday_only", checked === true)}
                    />
                    <Label htmlFor="birthday_only" className="font-bold text-slate-700 text-sm cursor-pointer">Chỉ áp dụng tháng Sinh Nhật</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-sm text-slate-700 pl-1">Loại chu kỳ</Label>
                  <Select
                    value={watchedValues.rule.period_type || 'none'}
                    onValueChange={(val) => form.setValue("rule.period_type", val === 'none' ? null : val as "day" | "week" | "month")}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-transparent font-bold text-slate-700">
                      <SelectValue placeholder="Không cấu hình" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="rounded-lg text-slate-400 font-normal italic">Không dùng</SelectItem>
                      <SelectItem value="day" className="rounded-lg">Theo Ngày</SelectItem>
                      <SelectItem value="week" className="rounded-lg">Theo Tuần</SelectItem>
                      <SelectItem value="month" className="rounded-lg">Theo Tháng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Loại Sản Phẩm Áp Dụng */}
              <div className="pt-6 border-t border-slate-50">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm text-slate-700 pl-1">Loại sản phẩm áp dụng</Label>
                  <Input 
                    placeholder="VD: beverage, food... (Để trống nếu áp dụng toàn bộ)" 
                    className="h-12 rounded-xl bg-slate-50 focus:bg-white transition-all shadow-inner border-transparent focus:ring-indigo-500/10 font-bold text-slate-700"
                    {...form.register("rule.required_product_type")} 
                  />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* CARD 3: ĐIỀU KIỆN TÍCH LŨY (AUTO) */}
          <Card className="border-none shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-sm mt-8">
            <CardHeader className="bg-slate-50/50 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Điều kiện tích lũy (Auto System)</CardTitle>
                  <CardDescription className="text-slate-500 font-medium">Thiết lập KPI để hệ thống tự động phát Voucher</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Tháng */}
                <div className="space-y-2">
                  <Label className="font-semibold text-sm text-slate-700 pl-1">Tháng xét duyệt</Label>
                  <Select
                    value={watchedValues.rule.target_month ? watchedValues.rule.target_month.toString() : 'none'}
                    onValueChange={(val) => form.setValue("rule.target_month", val === 'none' ? null : parseInt(val))}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-transparent font-bold text-slate-700">
                      <SelectValue placeholder="Không xét tháng" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60">
                      <SelectItem value="none" className="text-slate-400 italic">Bỏ qua</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <SelectItem key={m} value={m.toString()}>Tháng {m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Năm */}
                <div className="space-y-2">
                  <Label className="font-semibold text-sm text-slate-700 pl-1">Năm xét duyệt</Label>
                  <Input 
                    type="number"
                    placeholder="VD: 2026" 
                    className="h-12 rounded-xl bg-slate-50 border-transparent font-bold"
                    {...form.register("rule.target_year", { setValueAs: v => v === "" ? null : parseInt(v, 10) })} 
                  />
                </div>

                {/* Lookback Days */}
                <div className="space-y-2">
                  <Label className="font-semibold text-sm text-slate-700 pl-1">Lookback (Số ngày lùi)</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      placeholder="VD: 30" 
                      className="h-12 rounded-xl bg-slate-50 border-transparent font-bold pr-14"
                      {...form.register("rule.lookback_days", { setValueAs: v => v === "" ? 0 : parseInt(v, 10) })} 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Ngày</div>
                  </div>
                  <p className="text-[10px] text-slate-400 px-1 italic">*Dùng nếu không xét Tháng/Năm</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Tổng đơn */}
                <div className="space-y-2">
                  <Label className="font-semibold text-sm text-slate-700 pl-1">Tổng số đơn yêu cầu</Label>
                  <div className="relative">
                    <Controller
                      control={form.control}
                      name="rule.min_accumulated_orders"
                      render={({ field: { onChange, value } }) => (
                        <NumericFormat
                          value={value === 0 ? "" : value}
                          onValueChange={(values) => onChange(values.floatValue || 0)}
                          thousandSeparator="." decimalSeparator="," customInput={Input}
                          placeholder="VD: 100"
                          className="h-12 rounded-xl bg-slate-50 border-transparent font-bold pr-12 text-emerald-600"
                        />
                      )}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Đơn</div>
                  </div>
                </div>

                {/* Tổng tiền */}
                <div className="space-y-2">
                  <Label className="font-semibold text-sm text-slate-700 pl-1">Tổng tiền tích lũy yêu cầu</Label>
                  <div className="relative">
                    <Controller
                      control={form.control}
                      name="rule.min_accumulated_spent"
                      render={({ field: { onChange, value } }) => (
                        <NumericFormat
                          value={value === 0 ? "" : value}
                          onValueChange={(values) => onChange(values.floatValue || 0)}
                          thousandSeparator="." decimalSeparator="," customInput={Input}
                          placeholder="VD: 10.000.000"
                          className="h-12 rounded-xl bg-slate-50 border-transparent font-bold pr-10 text-emerald-600"
                        />
                      )}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">đ</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-1 sticky top-8 space-y-6">
          <VoucherPreviewCard />

          {/* Live countdown in sidebar */}
          {watchedValues.release_date && watchedValues.expiry_date && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              {currentTime < watchedValues.release_date ? (
                <CountdownTimer
                  targetDate={watchedValues.release_date}
                  label="Sắp bắt đầu sau"
                  color="amber"
                />
              ) : currentTime <= watchedValues.expiry_date ? (
                <CountdownTimer
                  targetDate={watchedValues.expiry_date}
                  label="Thời gian còn lại"
                  color="rose"
                />
              ) : (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-center">
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Voucher đã hết hạn</span>
                </div>
              )}
            </div>
          )}
        </div>

      </form>
    </div>
  )
}
