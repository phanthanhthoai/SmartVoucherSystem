import React from "react"
import {
  LayoutDashboard,
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