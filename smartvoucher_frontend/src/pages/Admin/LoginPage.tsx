import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Ticket, ShieldCheck, User, Lock, Sparkles, CheckCircle2, Zap, LayoutDashboard } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authApi } from '@/services/apiService'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
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
      navigate('/admin', { replace: true })
    } catch {
      setError('Đăng nhập thất bại. Vui lòng kiểm tra tài khoản hoặc mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: <Zap className="w-5 h-5 text-yellow-400" />, text: "Phát hành voucher nhanh chóng chỉ trong vài giây." },
    { icon: <ShieldCheck className="w-5 h-5 text-cyan-400" />, text: "Hệ thống bảo mật, chống gian lận và sử dụng lại." },
    { icon: <LayoutDashboard className="w-5 h-5 text-indigo-400" />, text: "Báo cáo chi tiết và quản lý người dùng tập trung." },
    { icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, text: "Tối ưu hóa chiến dịch marketing của doanh nghiệp." }
  ]

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[#050811]">
      {/* Background Layer: Mesh Gradient & Grid */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[-20%] left-[-10%] h-[70%] w-[70%] rounded-full bg-cyan-600/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[10%] h-[60%] w-[60%] rounded-full bg-blue-700/15 blur-[120px] animate-pulse-slow" />
        <div className="absolute top-[30%] right-[-5%] h-[40%] w-[40%] rounded-full bg-purple-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row w-full max-w-7xl mx-auto px-4 py-8 items-center justify-center gap-12 lg:gap-24">
        
        {/* Left Side: Brand & Features (Hidden on mobile or smaller viewports if needed, but here designed to be responsive) */}
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
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>SmartVoucher Admin Portal</span>
            </motion.div>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white">
              Quản lý <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent">Voucher</span> chuyên nghiệp.
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
              Giải pháp toàn diện giúp doanh nghiệp xây dựng, vận hành và quản lý các chương trình ưu đãi một cách thông minh và hiệu quả nhất.
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
             <div className="flex -space-x-3">
               {[1,2,3,4].map(i => (
                 <div key={i} className={`w-10 h-10 rounded-full border-2 border-[#050811] bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white shadow-xl`}>
                   U{i}
                 </div>
               ))}
               <div className="w-10 h-10 rounded-full border-2 border-[#050811] bg-cyan-600 flex items-center justify-center text-[10px] font-bold text-white shadow-xl">
                 +99
               </div>
             </div>
             <p className="text-slate-500 text-xs">
               Tham gia cùng hơn <span className="text-white font-semibold">1,000+</span> quản trị viên khác.
             </p>
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
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600" />
            
            <CardHeader className="space-y-4 pb-6 px-8 pt-10">
              <div className="lg:hidden flex justify-center mb-4">
                 <div className="p-4 bg-cyan-500/10 rounded-2xl ring-1 ring-cyan-500/30">
                   <Ticket className="w-8 h-8 text-cyan-400" />
                 </div>
              </div>
              <div className="text-center space-y-1.5">
                <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
                  Đăng nhập
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm">
                  Chào mừng bạn quay trở lại hệ thống quản trị.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-cyan-500" />
                    Username
                  </label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Nhập tên đăng nhập"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-cyan-500" />
                    Mật khẩu
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:bg-white/10 transition-all"
                    required
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-xs text-red-400 text-center"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold shadow-lg shadow-cyan-900/20 active:scale-[0.98] transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Truy cập hệ thống'
                  )}
                </Button>
              </form>
            </CardContent>

            <div className="px-8 py-5 bg-white/5 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest font-medium">
              <span>SmartVoucher v1.0</span>
              <div className="flex gap-4">
                <a href="#" className="hover:text-cyan-400 transition-colors">Trợ giúp</a>
                <a href="#" className="hover:text-cyan-400 transition-colors">Chính sách</a>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Floating Elements Background Decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-[10%] right-[40%] text-cyan-500/10"
        >
          <Ticket className="w-24 h-24" />
        </motion.div>
        <motion.div 
          animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute bottom-[10%] left-[20%] text-blue-500/10"
        >
          <LayoutDashboard className="w-32 h-32" />
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
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
