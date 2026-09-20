import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Lock,
  CreditCard,
  Candy,
  Coffee,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

export default function CartPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const { cartItems, cartTotal, updateQuantity, removeItem } = useCart()

  // Tính toán tổng tiền
  const subTotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }, [cartItems])

  const discount = 0 
  const finalTotal = cartTotal - discount

  if (!user) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center bg-[#020617] text-white overflow-hidden">
        {/* Background Aurora */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] left-[30%] h-96 w-96 rounded-full bg-cyan-600/20 blur-[120px]" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="relative z-10 text-center max-w-md p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center border border-white/10 shadow-inner">
            <Lock className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-black mb-3">Yêu cầu xác thực</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Bạn cần đăng nhập bằng tài khoản hội viên để xem giỏ hàng và tiến hành thanh toán.
          </p>
          <Button asChild size="lg" className="w-full h-14 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-cyan-500/25">
            <Link to="/login">Đăng nhập ngay</Link>
          </Button>
          <button onClick={() => navigate(-1)} className="mt-6 text-sm font-semibold text-slate-500 hover:text-white transition-colors">
            Quay lại trang trước
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#020617] text-white font-sans selection:bg-cyan-500/30 pb-24">
      {/* Premium Aurora Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] h-[60%] w-[60%] rounded-full bg-cyan-600/10 blur-[130px]"
        />
        <motion.div
          animate={{ x: [0, -40, 0], y: [0, 60, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-indigo-600/10 blur-[130px]"
        />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8 pt-10">
        
        {/* Nút Quay Lại */}
        <button 
          onClick={() => navigate('/shop')} 
          className="group flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors mb-8"
        >
          <div className="p-2 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Tiếp tục mua sắm
        </button>

        <div className="flex items-center gap-3 mb-10">
          <h1 className="text-4xl font-black tracking-tight">Giỏ hàng của bạn</h1>
          <div className="px-3 py-1 rounded-full bg-white/10 text-cyan-400 text-sm font-bold border border-white/10">
            {cartItems.length} Món
          </div>
        </div>

        {/* ==========================================
            TRẠNG THÁI 1: GIỎ HÀNG TRỐNG
            ========================================== */}
        {cartItems.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center justify-center py-20 px-4 rounded-[3rem] bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 border-dashed"
          >
            <div className="w-32 h-32 mb-8 relative">
              <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full" />
              <ShoppingBag className="w-full h-full text-slate-600 relative z-10 drop-shadow-xl" strokeWidth={1} />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-white">Giỏ hàng đang trống</h2>
            <p className="text-slate-400 mb-8 max-w-md text-center">
              Bạn chưa chọn món đồ nào cả. Hãy dạo quanh cửa hàng và khám phá những hương vị tuyệt vời của chúng tôi nhé!
            </p>
            <Button asChild size="lg" className="h-14 px-10 bg-white text-slate-900 hover:bg-cyan-500 hover:text-white font-bold rounded-full transition-all group shadow-xl shadow-cyan-500/10">
              <Link to="/shop">
                Khám phá cửa hàng ngay
              </Link>
            </Button>
          </motion.div>
        ) : (

          /* ==========================================
             TRẠNG THÁI 2: GIỎ HÀNG CÓ SẢN PHẨM
             ========================================== */
          <div className="grid lg:grid-cols-12 gap-10">
            
            {/* Cột Trái: Danh sách Item */}
            <div className="lg:col-span-8 space-y-4">
              <AnimatePresence>
                {cartItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, x: -50 }}
                    className="flex items-center gap-6 p-4 pr-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors group"
                  >
                    {/* ✨ Ảnh Thumbnail Icon - Sửa điều kiện thành 'candy' */}
                    <div className={`w-24 h-24 shrink-0 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-inner`}>
                      {item.product_type === 'candy' ? <Candy className="w-10 h-10 text-white/70" /> : <Coffee className="w-10 h-10 text-white/70" />}
                    </div>

                    {/* Thông tin SP */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">{item.name}</h3>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* ✨ Label loại sản phẩm - Đã dịch sang Tiếng Việt */}
                      <p className="text-[10px] font-black uppercase tracking-wider text-cyan-500 mb-4">
                        {item.product_type === 'candy' ? 'Bánh Ngọt / Kẹo' : 'Thức Uống'}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <div className="text-lg font-black text-white">
                          {formatCurrency(item.price)}
                        </div>
                        
                        {/* Cụm tăng giảm số lượng */}
                        <div className="flex items-center gap-3 bg-[#020617] rounded-full border border-white/10 p-1">
                          <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold w-4 text-center text-sm">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-cyan-500 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Cột Phải: Tổng quan Đơn hàng */}
            <div className="lg:col-span-4">
              <div className="sticky top-24 p-8 rounded-[2.5rem] bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 shadow-2xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-cyan-400" /> Tóm tắt đơn hàng
                </h3>

                <div className="space-y-4 mb-6 text-sm font-semibold text-slate-400">
                  <div className="flex justify-between items-center">
                    <span>Tạm tính</span>
                    <span className="text-white">{formatCurrency(subTotal)}</span>
                  </div>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

                <div className="flex justify-between items-end mb-8">
                  <span className="font-bold text-slate-300">Tổng cộng</span>
                  <div className="text-right">
                    <span className="block text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                      {formatCurrency(finalTotal)}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Đã bao gồm VAT</span>
                  </div>
                </div>

                <Button className="w-full h-14 bg-white text-slate-900 hover:bg-cyan-400 hover:text-white font-black text-lg rounded-2xl transition-all shadow-xl hover:shadow-cyan-500/50 flex items-center justify-center gap-2 group" onClick={() => navigate('/shop/checkout')}>
                  Thanh Toán <ArrowLeft className="w-5 h-5 rotate-180 group-hover:translate-x-1 transition-transform" />
                </Button>

                <div className="mt-6 flex items-start gap-3 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed font-medium">
                    Bạn có thể áp dụng mã SmartVoucher của bạn ở bước thanh toán tiếp theo để nhận ưu đãi!
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}