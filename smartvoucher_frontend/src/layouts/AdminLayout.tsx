import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import Header from "@/components/layout/admin/Header"
import SidebarDesktop from "@/components/layout/admin/SidebarDesktop"
import SidebarMobile from "@/components/layout/admin/SidebarMobile"

export default function AdminLayout() {
  const location = useLocation();
  const navigate=useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/")
  }

  const handleNavClick = (path: string) => {
    // setCurrentPath(path)
    setMobileMenuOpen(false)
    navigate(path)
  }

  return (
   <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 -z-10 opacity-20"
        animate={{
          background: [
            "radial-gradient(circle at 50% 50%, rgba(120, 41, 190, 0.5) 0%, rgba(53, 71, 125, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 30% 70%, rgba(233, 30, 99, 0.5) 0%, rgba(81, 45, 168, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 70% 30%, rgba(76, 175, 80, 0.5) 0%, rgba(32, 119, 188, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 50% 50%, rgba(120, 41, 190, 0.5) 0%, rgba(53, 71, 125, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
          ],
        }}
        transition={{ duration: 30, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar - Mobile */}
      <SidebarMobile mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} toggleExpanded={toggleExpanded} isActivePath={isActivePath} handleNavClick={handleNavClick} expandedItems={expandedItems} />

      {/* Sidebar - Desktop */}
      <SidebarDesktop sidebarOpen={sidebarOpen} expandedItems={expandedItems} toggleExpanded={toggleExpanded} isActivePath={isActivePath} handleNavClick={handleNavClick} />

      {/* Main Content */}
      <div className={cn("min-h-screen transition-all duration-300 ease-in-out", sidebarOpen ? "md:pl-64" : "md:pl-0")}>
        
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} setMobileMenuOpen={setMobileMenuOpen} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}