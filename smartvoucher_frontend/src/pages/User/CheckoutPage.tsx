import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi, orderApi } from '@/services/apiService'
import {
  ArrowLeft,
  MapPin,
  Phone,
  User as UserIcon,
  Ticket,
  CheckCircle2,
  X,
  CreditCard,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// 1. Cập nhật Type chuẩn khớp 100% với Backend
export type WalletVoucher = {
  id: number;
  code: string;
  title?: string;
  type: string; // 'fixed' hoặc 'percent'
  value: number;
  max_discount_amount?: number;
  min_spend?: number; 
  is_used: boolean;
  start_date: string;
  expiry_date: string;
  product_type: string;
  is_active: boolean;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

export default function CheckoutPage() {
  const { user } = useAuth()
  const { cartItems, cartTotal, clearCart } = useCart()
  const navigate = useNavigate()

  // Form State
  const [formData, setFormData] = useState({ fullName: user?.username || '', phone: '', address: '' })
  
  // Voucher State
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<WalletVoucher | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // State lưu dữ liệu thật từ API
  const [myVouchers, setMyVouchers] = useState<WalletVoucher[]>([])
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false)

  // Validate Route
  useEffect(() => {
    if (!user) navigate('/login')
    if (cartItems.length === 0) navigate('/shop')
  }, [user, cartItems, navigate])

  // GỌI API LẤY VÍ VOUCHER KHI VÀO TRANG
  useEffect(() => {
    const fetchVouchers = async () => {
      setIsLoadingVouchers(true)
      try {
        const rawData = await userApi.getMyVouchers()
        
        let safeArray: WalletVoucher[] = []
        const data = rawData as any
        if (Array.isArray(data)) {
            safeArray = data
        } else if (data && Array.isArray(data.data)) {
            safeArray = data.data
        } else if (data && data.data && Array.isArray(data.data.data)) {
            safeArray = data.data.data
        }

        const validVouchers = safeArray.filter((v: WalletVoucher) => v.is_active && !v.is_used)
        setMyVouchers(validVouchers)
        
      } catch (error) {
        console.error("Chi tiết lỗi API:", error)
        toast.error('Không thể tải ví Voucher của bạn!')
      } finally {
        setIsLoadingVouchers(false)
      }
    }

    if (user && isVoucherModalOpen && myVouchers.length === 0) {
       fetchVouchers()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isVoucherModalOpen])

  // Logic Tính toán Tiền Đã Được Cập Nhật Giống Backend
  const discountAmount = useMemo(() => {
    if (!selectedVoucher) return 0;

    // 1. Tính tổng tiền của các món HỢP LỆ (giống eligible_amount ở Backend)
    let eligibleAmount = 0;
    if (selectedVoucher.product_type && selectedVoucher.product_type.toLowerCase() !== 'all') {
      eligibleAmount = cartItems.reduce((total, item) => {
        // Chỉ cộng tiền những món có product_type khớp với voucher
        if (item.product_type === selectedVoucher.product_type) {
          return total + (item.price * item.quantity);
        }
        return total;
      }, 0);
    } else {
      // Nếu mã áp dụng cho tất cả
      eligibleAmount = cartTotal;
    }

    // 2. Bắt đầu tính tiền giảm dựa trên eligibleAmount
    if (selectedVoucher.type.toLowerCase() === 'fixed') {
      return Math.min(selectedVoucher.value, eligibleAmount);
    }
    
    if (selectedVoucher.type.toLowerCase() === 'percent') {
      let calc = (eligibleAmount * selectedVoucher.value) / 100;
      if (selectedVoucher.max_discount_amount && calc > selectedVoucher.max_discount_amount) {
        return selectedVoucher.max_discount_amount;
      }
      return calc;
    }
    
    return 0;
  }, [selectedVoucher, cartItems, cartTotal]);

  const finalTotal = cartTotal - discountAmount > 0 ? cartTotal - discountAmount : 0

  // ✨ ĐÃ VÁ LỖ HỔNG: CHỌN VOUCHER (LỚP KHÓA 1) ✨
  const handleSelectVoucher = (voucher: WalletVoucher) => {
    const minRequired = voucher.min_spend || 0
    if (cartTotal < minRequired) {
      toast.error(`Đơn hàng chưa đạt mức tối thiểu ${formatCurrency(minRequired)}`)
      return
    }

    // Kiểm tra xem trong giỏ hàng có món đồ nào khớp loại yêu cầu không
    if (voucher.product_type && voucher.product_type.toLowerCase() !== 'all') {
      const hasRequiredType = cartItems.some(item => item.product_type === voucher.product_type);
      if (!hasRequiredType) {
        toast.error(`Mã giảm giá này chỉ áp dụng cho sản phẩm loại: ${voucher.product_type}`);
        return;
      }
    }

    setSelectedVoucher(voucher)
    setIsVoucherModalOpen(false)
  }

  const handlePlaceOrder = async () => {
    if (!formData.phone || !formData.address) {
      toast.error('Vui lòng điền đầy đủ số điện thoại và địa chỉ nhận hàng!');
      return;
    }
  
    setIsProcessing(true);
  
    try {
      const orderPayload = {
        external_order_id: `ORD-${Date.now()}`, 
        user_id: user?.id,
        status: "pending",
        total_amount: cartTotal,
        items: cartItems.map(item => ({
          name: item.name,
          product_type: item.product_type, // "food" hoặc "beverage" để Backend check Voucher
          quantity: item.quantity,
          unit_price: item.price
        })),
        voucher_code: selectedVoucher ? selectedVoucher.code : null 
      };
  
      const response = await orderApi.placeOrderWithVoucher(orderPayload);
  
      toast.success(`Đặt hàng thành công! Mã đơn: ${response.external_order_id}`);
      clearCart();
      navigate('/shop/success'); 
  
    } catch (error: any) {
      console.error("Lỗi đặt hàng chi tiết:", error.response?.data);
      
      // ✨ NÂNG CẤP TRÍ TUỆ BÁO LỖI (Bóc trần sự thật từ Django) ✨
      let errorMsg = 'Đặt hàng thất bại, vui lòng thử lại!';
      if (error.response?.data) {
        const data = error.response.data;
        if (data.message) {
          errorMsg = data.message;
        } else if (data.detail) {
          errorMsg = data.detail;
        } else if (Array.isArray(data)) {
          errorMsg = data[0]; 
        } else if (typeof data === 'object') {
          errorMsg = Object.values(data)[0] as string;
        } else if (typeof data === 'string') {
          errorMsg = data;
        }
      }
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#020617] text-white font-sans selection:bg-cyan-500/30 pb-24">
      {/* Premium Aurora Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ x: [0, 50, 0], y: [0, 30, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-[10%] -left-[10%] h-[60%] w-[60%] rounded-full bg-cyan-600/10 blur-[130px]" />
        <motion.div animate={{ x: [0, -40, 0], y: [0, 60, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-indigo-600/10 blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8 pt-10">
        
        <button onClick={() => navigate('/shop/cart')} className="group flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors mb-8">
          <div className="p-2 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Quay lại giỏ hàng
        </button>

        <h1 className="text-4xl font-black tracking-tight mb-10">Thanh toán an toàn</h1>

        <div className="grid lg:grid-cols-12 gap-10">
          
          {/* CỘT TRÁI: FORM ĐIỀN THÔNG TIN */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-md">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" /> Thông tin giao hàng
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Họ và tên người nhận</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                      type="text" 
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="w-full h-12 pl-12 pr-4 bg-[#0f172a] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      placeholder="Nhập họ và tên..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Số điện thoại liên hệ</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full h-12 pl-12 pr-4 bg-[#0f172a] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      placeholder="09xx xxx xxx"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Địa chỉ nhận hàng</label>
                  <textarea 
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full p-4 bg-[#0f172a] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
                    placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: TÓM TẮT & VOUCHER */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 p-8 rounded-[2.5rem] bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 shadow-2xl">
              
              {/* VOUCHER SECTION */}
              <div className="mb-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Mã giảm giá (Voucher)</h3>
                <button 
                  onClick={() => setIsVoucherModalOpen(true)}
                  className="w-full h-14 px-4 bg-[#0f172a] border border-cyan-500/30 rounded-2xl hover:border-cyan-400 hover:bg-cyan-500/5 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <Ticket className={`w-5 h-5 ${selectedVoucher ? 'text-emerald-400' : 'text-cyan-400'}`} />
                    <span className={`font-semibold ${selectedVoucher ? 'text-emerald-400' : 'text-slate-300 group-hover:text-white'}`}>
                      {selectedVoucher ? selectedVoucher.code : 'Chọn mã giảm giá...'}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </button>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

              {/* TÓM TẮT ĐƠN */}
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-cyan-400" /> Tóm tắt đơn hàng
              </h3>

              <div className="space-y-4 mb-6 text-sm font-semibold text-slate-400">
                <div className="flex justify-between items-center">
                  <span>Tạm tính ({cartItems.length} món)</span>
                  <span className="text-white">{formatCurrency(cartTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-400">
                  <span>Giảm giá Voucher</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              </div>

              <div className="flex justify-between items-end mb-8 pt-4 border-t border-white/10">
                <span className="font-bold text-slate-300">Tổng thanh toán</span>
                <div className="text-right">
                  <span className="block text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                    {formatCurrency(finalTotal)}
                  </span>
                </div>
              </div>

              <Button 
                onClick={handlePlaceOrder}
                disabled={isProcessing}
                className="w-full h-14 bg-white text-slate-900 hover:bg-cyan-400 hover:text-white font-black text-lg rounded-2xl transition-all shadow-xl hover:shadow-cyan-500/50 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <div className="w-6 h-6 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Hoàn Tất Đặt Hàng'
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* List Voucher*/}
      <AnimatePresence>
        {isVoucherModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsVoucherModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md bg-[#020617] border border-white/10 rounded-[2.5rem] shadow-2xl shadow-cyan-900/50 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-cyan-400" /> Smart Voucher
                </h3>
                <button onClick={() => setIsVoucherModalOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                
                {isLoadingVouchers && (
                   <div className="flex justify-center items-center py-10">
                      <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                   </div>
                )}

                {!isLoadingVouchers && myVouchers.length === 0 && (
                   <div className="text-center py-10 text-slate-400">
                      Ví của bạn hiện chưa có mã giảm giá nào.
                   </div>
                )}

                {!isLoadingVouchers && myVouchers.map((voucher) => {
                  const minRequired = voucher.min_spend || 0
                  
                  // ✨ ĐÃ VÁ LỖ HỔNG: HIỂN THỊ UI XÁM XỊT (LỚP KHÓA 2) ✨
                  let hasRequiredType = true;
                  if (voucher.product_type && voucher.product_type.toLowerCase() !== 'all') {
                    // Quét xem giỏ hàng có món nào khớp loại không
                    hasRequiredType = cartItems.some(item => item.product_type === voucher.product_type);
                  }

                  // Đạt điều kiện = Đủ tiền + CÓ món đồ khớp loại
                  const isEligible = (cartTotal >= minRequired) && hasRequiredType;
                  
                  const isSelected = selectedVoucher?.id === voucher.id

                  return (
                    <div 
                      key={voucher.id}
                      className={`relative p-4 rounded-2xl border transition-all ${
                        isSelected 
                          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/20' 
                          : isEligible 
                            ? 'bg-white/[0.03] border-white/10 hover:border-white/30 cursor-pointer' 
                            : 'bg-white/[0.01] border-white/5 opacity-50 grayscale cursor-not-allowed'
                      }`}
                      onClick={() => {
                          if (isEligible) {
                            handleSelectVoucher(voucher);
                          } else {
                            // Cố tình bấm vào sẽ bị chửi vỗ mặt
                            if (!hasRequiredType) {
                              toast.error(`Mã này chỉ áp dụng cho loại: ${voucher.product_type}`);
                            } else {
                              toast.error(`Đơn hàng chưa đạt mức tối thiểu ${formatCurrency(minRequired)}`);
                            }
                          }
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-block px-3 py-1 bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                          {voucher.code}
                        </span>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-cyan-400" />}
                      </div>
                      <h4 className="font-bold text-white mb-1">
                        {voucher.title || (voucher.type === 'percent' ? `Giảm ${voucher.value}%` : `Giảm ${formatCurrency(voucher.value)}`)}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium">
                        Đơn tối thiểu: {formatCurrency(minRequired)}
                      </p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Áp dụng: <span className="text-cyan-400">{voucher.product_type || "All"}</span>
                      </p>
                      <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-[#020617] rounded-full border-r border-white/10" />
                      <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-[#020617] rounded-full border-l border-white/10" />
                    </div>
                  )
                })}
              </div>

              {selectedVoucher && (
                <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                  <Button 
                    onClick={() => { setSelectedVoucher(null); setIsVoucherModalOpen(false) }}
                    variant="outline" 
                    className="w-full bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl h-12 font-bold"
                  >
                    Bỏ chọn mã giảm giá
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
