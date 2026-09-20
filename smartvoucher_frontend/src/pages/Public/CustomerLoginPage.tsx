import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Loader2, Ticket, ShieldCheck, User, Lock, Sparkles, CheckCircle2, LayoutDashboard, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authApi } from '@/services/apiService'
import { useAuth } from '@/context/AuthContext'

export default function CustomerLoginPage() {
  const {fetchMe} = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await authApi.login({ username, password })
      await fetchMe?.()
      navigate('/shop', { replace: true })
    } catch {
      setError('Đăng nhập thất bại. Vui lòng kiểm tra tài khoản hoặc mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: <Ticket className="w-5 h-5 text-yellow-400" />, text: "Săn deal khủng, gom trọn voucher độc quyền nhanh chóng." },
    { icon: <ShieldCheck className="w-5 h-5 text-cyan-400" />, text: "Thanh toán an toàn với công nghệ bảo mật giao dịch hàng đầu." },
    { icon: <LayoutDashboard className="w-5 h-5 text-indigo-400" />, text: "Quản lý kho Voucher và tích điểm đổi thưởng dễ dàng." },
    { icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, text: "Gia nhập hạng Thẻ thành viên VIP với đặc quyền riêng biệt." }
  ]

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[#050811]">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[-20%] left-[-10%] h-[70%] w-[70%] rounded-full bg-indigo-600/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[10%] h-[60%] w-[60%] rounded-full bg-cyan-600/15 blur-[120px] animate-pulse-slow" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row w-full max-w-7xl mx-auto px-4 py-8 items-center justify-center gap-12 lg:gap-24">

        {/* Left Side: Brand & Features */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex-1 space-y-10 max-w-xl text-left hidden lg:block"
        >
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Khách hàng SmartVoucher</span>
            </motion.div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white">
              Săn mã kho <span className="bg-gradient-to-r from-blue-400 via-indigo-500 to-cyan-400 bg-clip-text text-transparent">Voucher</span> cực khủng.
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
              Đăng nhập để xem danh sách ưu đãi dành riêng cho bạn. Càng mua sắm, tích điểm càng lớn!
            </p>
          </div>

          <div className="grid gap-6">
            {features.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  {item.icon}
                </div>
                <p className="text-slate-300 text-sm pt-1.5">{item.text}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-4 pt-4">
            <Button variant="link" asChild className="text-indigo-400 hover:text-indigo-300 p-0 font-bold h-auto shadow-none">
              <Link to="/"><ArrowRight className="w-4 h-4 mr-2" /> Về trang chủ</Link>
            </Button>
          </div>
        </motion.div>

        {/* Right Side: Login Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-white overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500" />

            <CardHeader className="space-y-4 pb-6 px-8 pt-10">
              <div className="lg:hidden flex justify-center mb-4">
                <div className="p-4 bg-indigo-500/10 rounded-2xl ring-1 ring-indigo-500/30">
                  <User className="w-8 h-8 text-indigo-400" />
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
                  Đăng nhập Thành Viên
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm">
                  Chào mừng bạn quay trở lại SmartVoucher.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    Username
                  </label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Nhập tên đăng nhập"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 transition-all font-semibold"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    Mật khẩu
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 transition-all font-semibold"
                    required
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-xs text-red-400 text-center font-medium"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold shadow-lg shadow-indigo-900/20 active:scale-[0.98] transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Vào săn sale'
                  )}
                </Button>
              </form>
            </CardContent>

            <div className="px-8 py-5 bg-white/5 border-t border-white/10 flex flex-col items-center gap-2 text-[12px] text-slate-400">
              <div>Chưa có tài khoản? <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-bold ml-1">Đăng ký ngay</Link></div>
              <div className="flex justify-between items-center w-full uppercase tracking-widest font-medium mt-2 pt-2 border-t border-white/5">
                <span>SmartVoucher v1.0</span>
                <div className="flex gap-4">
                  <a href="#" className="hover:text-cyan-400 transition-colors">Trợ giúp</a>
                  <a href="#" className="hover:text-cyan-400 transition-colors">Chính sách</a>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 12s infinite ease-in-out;
        }
      `}} />
    </div>
  )
}
