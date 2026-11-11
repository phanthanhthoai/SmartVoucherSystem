import React from "react"
import {
  LayoutDashboard,
  Megaphone,
  ShoppingBag,
  Package,
  Percent,
  UserCog,
  Users,
} from "lucide-react"

interface SidebarSubItem {
  title: string;
  path: string;
}

interface SidebarItem {
  title: string;
  icon: React.ReactNode;
  path: string;
  items?: SidebarSubItem[];
}

export const sidebarItems: SidebarItem[] = [
  {
    title: "Thống kê",
    icon: <LayoutDashboard />,
    path: "/admin/dashboard",
  },
  {
    title: "Đơn hàng",
    icon: <ShoppingBag />,
    path: "/admin/orders",
  },
  {
    title: "Chiến dịch",
    icon: <Megaphone />,
    path: "/admin/campaigns",
  },
  {
    title: "Sản phẩm",
    icon: <Package />,
    path: "/admin/products",
  },
  {
    title: "Voucher",
    icon: <Percent />,
    path: "/admin/vouchers/list",
  },
  {
    title: "Nhân viên",
    icon: <UserCog />,
    path: "/admin/staffs/list",  
  },
  {
    title: "Khách hàng",
    icon: <Users />,
    path: "/admin/customers/list",
  },

]