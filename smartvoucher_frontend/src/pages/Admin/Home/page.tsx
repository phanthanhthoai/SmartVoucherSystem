
import { useAuth } from '@/context/AuthContext'
import { motion } from 'framer-motion'
import { Sun, Moon, Coffee, Sparkles } from 'lucide-react'
import { getCurrentHourInVietnam } from '@/utils/dateTime'

const HomeAdminPage = () => {
    const { user } = useAuth()

    const getGreeting = () => {
        const hour = getCurrentHourInVietnam()
        if (hour < 12) return { text: 'Chào buổi sáng', icon: Coffee, color: 'text-amber-500' }
        if (hour < 18) return { text: 'Chào buổi chiều', icon: Sun, color: 'text-orange-500' }
        return { text: 'Chào buổi tối', icon: Moon, color: 'text-indigo-500' }
    }

    const { text: greetingText, icon: GreetingIcon, color: greetingColor } = getGreeting()

    return (
        <div className="min-h-screen bg-slate-50 py-8 font-sans">
            <div className="max-w-6xl mx-auto px-4">

                {/* Khối Lời Chào (Hero Section) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 overflow-hidden"
                >
                    {/* Hiệu ứng mảng màu trang trí ở góc phải */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-linear-to-br from-cyan-50 to-blue-50 rounded-full blur-3xl opacity-70" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            {/* Dòng chữ nhỏ trên cùng */}
                            <div className="flex items-center gap-2 mb-3">
                                <GreetingIcon className={`w-5 h-5 ${greetingColor}`} />
                                <span className="font-semibold text-slate-500 uppercase tracking-wider text-sm">
                                    {greetingText}
                                </span>
                            </div>

                            {/* Tên người dùng nổi bật */}
                            <h1 className="text-3xl md:text-4xl font-black text-slate-800">
                                Xin chào, <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-600 to-blue-600">{user?.username || "Quản trị viên"}</span>! 👋
                            </h1>

                            <p className="mt-3 text-slate-500 font-medium max-w-xl">
                                Chào mừng bạn quay trở lại. Hãy xem qua các cập nhật mới nhất và bắt đầu công việc hôm nay nhé.
                            </p>
                        </div>

                        {/* Khối hiển thị Role (Quyền) ở bên phải */}
                        <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 w-fit">
                            <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-cyan-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Vai trò hiện tại</p>
                                <p className="text-sm font-bold text-slate-700 capitalize">{user?.role || "Admin"}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

            </div>
        </div>
    )
}

export default HomeAdminPage
