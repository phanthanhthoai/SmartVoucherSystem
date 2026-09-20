import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Toaster } from './components/ui/sonner'
import AdminLayout from './layouts/AdminLayout'
import DashboardPage from './pages/Admin/Dashboard/DashboardPage'
import LoginPage from './pages/Admin/LoginPage'
import VoucherListPage from './pages/Admin/Vouchers/VoucherListPage'
import VoucherRecipientsPage from './pages/Admin/Vouchers/VoucherRecipientsPage'
import StaffListPage from './pages/Admin/Staffs/StaffListPage'
import VoucherCreatePage from './pages/Admin/Vouchers/VoucherCreatePage'
import VoucherEditPage from './pages/Admin/Vouchers/VoucherEditPage'
import VoucherDetailPage from './pages/Admin/Vouchers/VoucherDetailPage'
import VoucherDeliveryLogPage from './pages/Admin/Vouchers/VoucherDeliveryLogPage'
import CustomerListPage from './pages/Admin/Customers/CustomerListPage'
import HomePage from './pages/Public/HomePage'
import RegisterPage from './pages/Public/RegisterPage'
import CustomerLoginPage from './pages/Public/CustomerLoginPage'
import { useAuth } from './context/AuthContext'
import HomeAdminPage from './pages/Admin/Home/page'
import ShopPage from './pages/User/HomePage'
import CartPage from './pages/User/CartPage'
import CheckoutPage from './pages/User/CheckoutPage'

function RequireAdminAuth() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    ); 
  }
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.role !== 'admin' && user.role !== 'staff') {
    return <Navigate to="/" replace />; 
  }

  return <Outlet />;
}

function AdminPlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground">Trang này đang được phát triển.</p>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<CustomerLoginPage />} />
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/shop/cart" element={<CartPage />} />
      <Route path="/shop/checkout" element={<CheckoutPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route element={<RequireAdminAuth />}>
        <Route
          path="/admin"
          element={<AdminLayout />}
        >
          <Route index element={<HomeAdminPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="vouchers/list" element={<VoucherListPage />} />
          <Route path="vouchers/create" element={<VoucherCreatePage />} />
          <Route path="vouchers/:voucherId/edit" element={<VoucherEditPage />} />
          <Route path="vouchers/:voucherId/detail" element={<VoucherDetailPage />} />
          <Route path="vouchers/:voucherId/recipients" element={<VoucherRecipientsPage />} />
          <Route path="vouchers/:voucherId/delivery-logs" element={<VoucherDeliveryLogPage />} />
          <Route path="staffs/list" element={<StaffListPage />} />
          <Route path="customers/list" element={<CustomerListPage />} />
          <Route path="settings" element={<AdminPlaceholderPage title="Cài đặt hệ thống" />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <AppRoutes />
    </>
  )
}

export default App
