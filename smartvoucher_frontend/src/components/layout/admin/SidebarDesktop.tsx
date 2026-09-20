import {
  ChevronDown,
  LogOut,
  Wand2,
} from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { sidebarItems } from "./SidebarItem"
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  sidebarOpen: boolean;
  toggleExpanded: (title: string) => void
  isActivePath: (path: string) => boolean
  handleNavClick: (path: string) => void
  expandedItems: Record<string, boolean>;
}

const SidebarDesktop = ({ sidebarOpen, expandedItems, toggleExpanded, isActivePath, handleNavClick }: SidebarProps) => {
  const { logout } = useAuth();
  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden w-64 transform border-r bg-background transition-transform duration-300 ease-in-out md:block",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-10 items-center justify-center rounded-2xl bg-linear-to-br from-purple-600 to-blue-600 text-white">
              <Wand2 className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">SmartVoucher</h2>
              <p className="text-xs text-muted-foreground">Quản lý Voucher</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 py-2">
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <div key={item.title} className="mb-1">
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium",
                    isActivePath(item.path) ? "bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                  onClick={() => {
                    if (item.items) {
                      toggleExpanded(item.title)
                    } else {
                      handleNavClick(item.path)
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.title}</span>
                  </div>
                  {item.items && (
                    <ChevronDown
                      className={cn(
                        "ml-2 h-4 w-4 transition-transform",
                        expandedItems[item.title] ? "rotate-180" : "",
                      )}
                    />
                  )}
                </button>

                {item.items && expandedItems[item.title] && (
                  <div className="mt-1 ml-6 space-y-1 border-l pl-3">
                    {item.items.map((subItem) => (
                      <button
                        key={subItem.title}
                        className={cn(
                          "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm",
                          isActivePath(subItem.path) ? "bg-primary/10 text-primary" : "hover:bg-muted",
                        )}
                        onClick={() => handleNavClick(subItem.path)}
                      >
                        {subItem.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t p-3">
          <div className="space-y-1">
            <button
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted cursor-pointer"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SidebarDesktop