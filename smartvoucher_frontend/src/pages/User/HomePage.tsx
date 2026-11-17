import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    ArrowRight,
    Globe,
    UserIcon,
    ChevronDown,
    Ticket,
    ClipboardList,
    LayoutDashboard,
    LogOut,
    ShoppingCart,
    Plus,
    Coffee, // Icon cho Drink
    Candy, // Icon cho Candy
    Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/context/CartContext'
import { toast } from 'sonner'
import { productApi } from '@/services/apiService'

type Product = {
    id: number
    name: string
    description: string
    price: number
    product_type: string
    color: string
    image: string | null
}

const productColor = (productType: string) => {
    if (productType === 'candy') return 'from-pink-500 to-rose-500'
    if (productType === 'drink') return 'from-amber-500 to-orange-600'
    return 'from-cyan-500 to-indigo-600'
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

export default function ShopPage() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { cartCount, addToCart } = useCart()
    
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const [products, setProducts] = useState<Product[]>([])
    const [productsLoading, setProductsLoading] = useState(true)
    const [productsError, setProductsError] = useState('')
    const [activeFilter, setActiveFilter] = useState('all')

    useEffect(() => {
        let isMounted = true
        productApi.list()
            .then((catalog) => {
                if (!isMounted) return
                setProducts(catalog.map((product) => ({
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    price: Number(product.unit_price),
                    product_type: product.product_type,
                    color: productColor(product.product_type),
                    image: product.image,
                })))
            })
            .catch(() => {
                if (isMounted) setProductsError('Không thể tải danh sách sản phẩm. Vui lòng thử tải lại trang.')
            })
            .finally(() => {
                if (isMounted) setProductsLoading(false)
            })
        return () => { isMounted = false }
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // ✨ ĐIỂM SỬA QUAN TRỌNG NHẤT: Map dữ liệu chuẩn Backend
    const handleAddToCart = (product: Product) => {
        addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            // Chuyển ngôn ngữ Frontend sang Backend
            product_type: product.product_type,
            color: product.color,
            image: product.image,
        });
        toast.success(`Đã thêm ${product.name} vào giỏ hàng!`)
    }

    const categories = Array.from(new Set(products.map((product) => product.product_type)))
    const filteredProducts = products.filter((product) => activeFilter === 'all' || product.product_type === activeFilter)

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#020617] text-white font-sans selection:bg-cyan-500/30 pb-20">

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

            <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">

                {/* Navigation */}
                <motion.header
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center justify-between py-4 sticky top-0 z-50 backdrop-blur-md bg-[#020617]/80"
                >
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group cursor-pointer">
                        <div className="relative h-11 w-11 flex items-center justify-center rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-900/40 group-hover:scale-110 transition-transform">
                            <ShoppingCart className="h-5 w-5 text-white" />
                            <div className="absolute inset-0 rounded-2xl bg-white/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent">SmartShop</h2>
                            <div className="flex items-center gap-1.5 opacity-60">
                                <Globe className="w-2.5 h-2.5 text-cyan-500" />
                                <p className="text-[10px] uppercase font-bold tracking-widest">Premium Store</p>
                            </div>
                        </div>
                    </Link>

                    <div className="flex items-center gap-6">
                        {/* Giỏ hàng */}
                        <div className="relative group">
                            <button
                                type="button"
                                aria-label={`Mở giỏ hàng, ${cartCount} sản phẩm`}
                                onClick={() => navigate('/shop/cart')}
                                className="p-2.5 bg-white/5 border border-white/10 rounded-full group-hover:bg-white/10 transition-colors"
                            >
                                <ShoppingCart className="w-5 h-5 text-slate-300 group-hover:text-cyan-400 transition-colors" />
                            </button>
                            {cartCount > 0 && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    key={cartCount}
                                    className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg"
                                >
                                    {cartCount}
                                </motion.div>
                            )}
                        </div>

                        {/* Auth Section */}
                        {!user ? (
                            <div className="flex gap-3">
                                <Button asChild size="sm" className="hidden md:flex h-10 px-5 bg-transparent border border-white/20 text-white hover:bg-white/10 transition-all font-bold rounded-full">
                                    <Link to="/register">Đăng ký</Link>
                                </Button>
                                <Button asChild size="sm" className="h-10 px-5 bg-white text-slate-900 hover:bg-cyan-500 hover:text-white transition-all font-bold rounded-full group">
                                    <Link to="/login" className="flex items-center gap-2">
                                        Đăng nhập <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setIsOpen(!isOpen)}
                                    className="flex items-center gap-3 h-11 px-2 md:px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all duration-300 rounded-full focus:outline-none"
                                >
                                    <div className="w-8 h-8 rounded-full bg-linear-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shadow-inner">
                                        <UserIcon className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="font-semibold hidden md:block max-w-[100px] truncate">
                                        {user.username}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 hidden md:block ${isOpen ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-slate-100"
                                        >
                                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                                                <p className="text-xs text-slate-500 mb-1">Đăng nhập dưới tên</p>
                                                <p className="font-bold text-slate-900 truncate text-base">{user.username}</p>
                                                <span className="inline-block mt-2 text-[10px] uppercase font-black tracking-wider text-cyan-700 bg-cyan-100 px-2.5 py-1 rounded-full">
                                                    {user.role}
                                                </span>
                                            </div>

                                            <div className="py-2 text-slate-700">
                                                {user.role === 'customer' ? (
                                                    <>
                                                        <Link to="/vouchers" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-5 py-3 text-sm font-semibold hover:bg-cyan-50 hover:text-cyan-600">
                                                            <Ticket className="w-4 h-4" /> Ví Voucher của tôi
                                                        </Link>
                                                        <Link to="/shop/orders" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-5 py-3 text-sm font-semibold hover:bg-cyan-50 hover:text-cyan-600">
                                                            <ClipboardList className="w-4 h-4" /> Đơn hàng của tôi
                                                        </Link>
                                                    </>
                                                ) : (
                                                    <Link to="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-5 py-3 text-sm font-semibold hover:bg-cyan-50 hover:text-cyan-600">
                                                        <LayoutDashboard className="w-4 h-4" /> Quản trị Admin
                                                    </Link>
                                                )}
                                            </div>

                                            <div className="border-t border-slate-100 p-2">
                                                <button onClick={() => { setIsOpen(false); logout(); }} className="w-full flex items-center gap-3 px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl">
                                                    <LogOut className="w-4 h-4" /> Đăng xuất
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </motion.header>

                <section className="pt-4 pb-6">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
                                <Sparkles className="h-4 w-4" />
                                Cửa hàng SmartShop
                            </p>
                            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Sản phẩm</h1>
                            <p className="mt-1 text-sm text-slate-400">Chọn sản phẩm yêu thích và thêm vào giỏ hàng.</p>
                        </div>
                        {!productsLoading && !productsError && (
                            <p className="text-sm text-slate-400" aria-live="polite">
                                {filteredProducts.length} sản phẩm
                            </p>
                        )}
                    </div>

                    {/* Bộ lọc danh mục */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-2 overflow-x-auto pb-2"
                        aria-label="Lọc sản phẩm theo danh mục"
                    >
                        <button
                            onClick={() => setActiveFilter('all')}
                            aria-pressed={activeFilter === 'all'}
                            className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${activeFilter === 'all' ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'}`}
                        >
                            Tất cả
                        </button>
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setActiveFilter(category)}
                                aria-pressed={activeFilter === category}
                                className={`flex shrink-0 items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${activeFilter === category ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'}`}
                            >
                                {category === 'candy' ? <Candy className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
                                {category === 'candy' ? 'Kẹo ngọt' : category === 'drink' ? 'Đồ uống' : category}
                            </button>
                        ))}
                    </motion.div>
                </section>

                {/* Lưới Sản phẩm */}
                <motion.section layout aria-label="Danh sách sản phẩm" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {productsLoading && <p className="col-span-full py-12 text-center text-slate-400">Đang tải sản phẩm...</p>}
                    {productsError && <p role="alert" className="col-span-full py-12 text-center text-rose-300">{productsError}</p>}
                    {!productsLoading && !productsError && filteredProducts.length === 0 && (
                        <p className="col-span-full py-12 text-center text-slate-400">Hiện chưa có sản phẩm trong danh mục này.</p>
                    )}
                    <AnimatePresence>
                        {filteredProducts.map((product) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3 }}
                                key={product.id}
                                className="group relative p-6 rounded-[2rem] bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all duration-500 shadow-lg hover:shadow-cyan-500/10 flex flex-col h-full"
                            >
                                {/* Ảnh Placeholder với Gradient */}
                                <div className={`w-full h-48 rounded-2xl mb-6 bg-gradient-to-br ${product.color} flex items-center justify-center shadow-inner relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500`}>
                                    {product.image ? (
                                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                                    ) : (
                                        product.product_type === 'candy' ? <Candy className="w-16 h-16 text-white/50" /> : <Coffee className="w-16 h-16 text-white/50" />
                                    )}

                                    {/* Label loại sản phẩm */}
                                    <div className="absolute top-3 left-3 px-3 py-1 bg-black/30 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black uppercase tracking-wider text-white">
                                        {product.product_type === 'candy' ? 'Candy' : 'Drink'}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col">
                                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{product.name}</h3>
                                    <p className="text-sm text-slate-400 mb-6 line-clamp-2 leading-relaxed">{product.description}</p>

                                    <div className="mt-auto flex items-center justify-between">
                                        <div className="text-2xl font-black text-white tracking-tight">
                                            {formatCurrency(product.price)}
                                        </div>

                                        <button
                                            onClick={() => handleAddToCart(product)}
                                            className="h-12 w-12 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-cyan-400 hover:text-white hover:scale-110 transition-all shadow-xl hover:shadow-cyan-500/50"
                                        >
                                            <Plus className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.section>

            </div>
        </div>
    )
}