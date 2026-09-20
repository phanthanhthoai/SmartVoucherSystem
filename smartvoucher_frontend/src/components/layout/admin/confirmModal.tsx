import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ConfirmModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  variant = 'danger',
  isLoading = false
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl">
        <DialogHeader className={cn(
          "p-8 pb-4 flex flex-col items-center text-center space-y-4",
          variant === 'danger' ? "bg-red-50/50" : "bg-amber-50/50"
        )}>
          <div className={cn(
            "w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-300",
            variant === 'danger' ? "bg-red-100 text-red-600 shadow-red-100" : "bg-amber-100 text-amber-600 shadow-amber-100"
          )}>
            {isLoading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <AlertTriangle className="w-8 h-8" />
            )}
          </div>
          <div className="space-y-3">
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-slate-600 font-semibold text-base px-4 leading-relaxed line-clamp-3">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="p-8 pt-4 flex flex-col sm:flex-row gap-3 sm:justify-center">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-12 px-8 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? "destructive" : "default"}
            disabled={isLoading}
            onClick={onConfirm}
            className={cn(
              "h-14 min-w-[160px] px-10 rounded-2xl font-black text-lg shadow-lg transition-all active:scale-95 disabled:opacity-80 disabled:cursor-not-allowed uppercase tracking-wide",
              variant === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-200 text-white" : "bg-amber-600 hover:bg-amber-700 shadow-amber-200 text-white"
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
                ĐANG XỬ LÝ...
              </span>
            ) : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
