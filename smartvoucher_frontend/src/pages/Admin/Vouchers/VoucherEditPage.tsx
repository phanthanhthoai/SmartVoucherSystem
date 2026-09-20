"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import VoucherForm from "@/components/admin/vouchers/VoucherForm"
import { voucherApi } from "@/services/apiService"
import type { Voucher } from "@/types/voucher"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { Button, Skeleton } from "@/components/ui"

export default function VoucherEditPage() {
   const { voucherId } = useParams()
   const navigate = useNavigate()
   const [initialData, setInitialData] = useState<Voucher | any | null>(null)
   const [loading, setLoading] = useState(true)

   useEffect(() => {
      if (!voucherId) return;

      const fetchVoucher = async () => {
         try {
            const data = await voucherApi.get(voucherId)
            // Lấy dữ liệu từ .data nếu backend của ní bọc object
            const finalData = data.data || data;
            setInitialData(finalData)
         } catch (error: any) {
            toast.error("Không tải được dữ liệu Voucher hiện tại.")
            console.error(error)
         } finally {
            setLoading(false)
         }
      }

      fetchVoucher()
   }, [voucherId])

   // UI khi đang tải dữ liệu (Sử dụng Skeleton cho đồng bộ với trang Detail)
   if (loading) {
      return (
         <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-8">
            <div className="flex items-center gap-5">
               <Skeleton className="w-11 h-11 rounded-2xl" />
               <div className="space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-32" />
               </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
               <div className="lg:col-span-2 space-y-8">
                  <Skeleton className="h-[400px] rounded-[2rem]" />
                  <Skeleton className="h-[300px] rounded-[2rem]" />
               </div>
               <Skeleton className="h-[500px] rounded-[2rem]" />
            </div>
         </div>
      );
   }

   // UI khi không tìm thấy dữ liệu
   if (!initialData) {
      return (
         <div className="flex flex-col items-center justify-center p-32 space-y-6">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                <AlertCircle className="w-10 h-10 text-slate-300" />
            </div>
            <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800 mb-2">Không tìm thấy Voucher</h2>
                <p className="text-slate-500 font-medium max-w-xs">Có vẻ như mã ưu đãi này không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
            </div>
            <Button 
                onClick={() => navigate("/admin/vouchers/list")} 
                variant="outline"
                className="rounded-xl font-bold h-11 px-6 border-slate-200 hover:bg-slate-50"
            >
               <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại danh sách
            </Button>
         </div>
      )
   }

   // Truyền dữ liệu vào Form
   return (
      <div className="animate-in fade-in duration-500">
         <VoucherForm initialData={initialData} isEdit={true} />
      </div>
   )
}
