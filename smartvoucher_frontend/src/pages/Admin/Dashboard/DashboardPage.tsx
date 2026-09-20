import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
  Bar
} from "recharts";
import { Ticket, Percent, TrendingUp, DollarSign } from "lucide-react";
import { API_BASE_URL, authFetch } from '@/services/apiService';
import { DatePickerWithRange } from './DateRangePicker';
import { useNavigate } from 'react-router-dom';
import { ExportDropdown } from '@/components/admin/common/ExportDropdown';
import { exportMultiSheetExcel, exportToCSV } from '@/utils/downloadUtils';
import { toast } from 'sonner';
import { formatDateInVietnam } from '@/utils/dateTime';

// --- UTILS ---
const formatCurrency = (value: number) => {
  if (value === undefined || value === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return formatDateInVietnam(dateString);
};

const formatChartDate = (dateString: string, groupBy: string) => {
  const date = new Date(dateString);
  if (groupBy === 'month') return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
  if (groupBy === 'week') return `Tuần ${formatDateInVietnam(dateString, { day: '2-digit', month: '2-digit' })}`;
  return formatDateInVietnam(dateString, { day: '2-digit', month: '2-digit' });
};

// --- COMPONENT CHÍNH ---
export default function DashboardPage() {
  const navigate = useNavigate();
  const [topFilter, setTopFilter] = useState("most_used"); // State quản lý tiêu chí của Top Vouchers
  // 1. STATES BỘ LỌC
  const [dateChart, setDateChart] = useState({ from: "2026-03-01", to: "2026-03-31" });
  const [chartGroupBy, setChartGroupBy] = useState("day");
  const [dateTop, setDateTop] = useState({ from: "2026-03-01", to: "2026-03-31" });
  const [datePerformance, setDatePerformance] = useState({ from: "2026-03-01", to: "2026-03-31" });

  // 2. STATES DỮ LIỆU
  const [overview, setOverview] = useState<any>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [topVouchers, setTopVouchers] = useState({ most_used: [], highest_revenue: [], highest_usage_rate: [], highest_discount_amount: [], highest_revenue_impacted: [] });
  const [performance, setPerformance] = useState<any[]>([]);
  const [exportLoading, setExportLoading] = useState(false);

  // 3. (Mô phỏng useEffect gọi API - Bạn đã có phần này ở câu trả lời trước)
  // --- API: OVERVIEW ---
  useEffect(() => {
    const fetchOverview = async () => {
      const res = await authFetch(`${API_BASE_URL}/vouchers/stats/overview/`);
      const data = await res.json();
      setOverview(data);
    };
    fetchOverview();
  }, []); // Chỉ chạy lại khi dateOverview đổi

  // --- API: REVENUE CHART (XỬ LÝ LOGIC ĐẶC BIỆT) ---
  useEffect(() => {
    const fetchChart = async () => {
      // Khởi tạo URL cơ bản
      let url = `${API_BASE_URL}/vouchers/stats/revenue-chart/?group_by=${chartGroupBy}`;

      // Nếu là day, mới nối thêm start_date và end_date
      if (chartGroupBy === "day" && dateChart.from && dateChart.to) {
        url += `&start_date=${dateChart.from}&end_date=${dateChart.to}`;
      }

      const res = await authFetch(url);
      const data = await res.json();
      setChart(data.chart || []);
    };
    fetchChart();
  }, [chartGroupBy, dateChart]); // Chạy lại khi group_by hoặc dateChart đổi

  // --- API: TOP VOUCHERS ---
  useEffect(() => {
    const fetchTopVouchers = async () => {
      if (!dateTop.from || !dateTop.to) return;
      const url = `${API_BASE_URL}/vouchers/stats/top-vouchers/?start_date=${dateTop.from}&end_date=${dateTop.to}&limit=5`;
      const res = await authFetch(url);
      const data = await res.json();
      setTopVouchers(data.top_vouchers || { most_used: [], highest_revenue: [] });
    };
    fetchTopVouchers();
  }, [dateTop]);

  // --- API: PERFORMANCE ---
  useEffect(() => {
    const fetchPerformance = async () => {
      if (!datePerformance.from || !datePerformance.to) return;
      const url = `${API_BASE_URL}/vouchers/stats/performance/?start_date=${datePerformance.from}&end_date=${datePerformance.to}&ordering=-usage_count`;
      const res = await authFetch(url);
      const data = await res.json();
      setPerformance(data.results || []);
    };
    fetchPerformance();
  }, [datePerformance]);

  const handleExport = async (type: 'excel' | 'csv') => {
    try {
      setExportLoading(true);

      // 1. Dữ liệu tổng quan
      const overviewData = [
        { 'Chỉ số': 'Tổng Doanh Thu (Gross)', 'Giá trị': formatCurrency(overview?.gross_revenue) },
        { 'Chỉ số': 'Doanh Thu Thuần (Net)', 'Giá trị': formatCurrency(overview?.net_revenue) },
        { 'Chỉ số': 'Tổng Tiền Giảm Giá', 'Giá trị': formatCurrency(overview?.total_discount_amount) },
        { 'Chỉ số': 'Tỉ Lệ Sử Dụng', 'Giá trị': `${overview?.usage_rate_percent || 0}%` },
        { 'Chỉ số': 'Đã dùng / Đã cấp', 'Giá trị': `${overview?.total_used || 0} / ${overview?.total_assigned || 0}` },
        { 'Chỉ số': 'Tổng số chiến dịch', 'Giá trị': overview?.total_vouchers || 0 },
      ];

      // 2. Dữ liệu Top Vouchers hiện tại
      let currentTopData: any[] = [];
      if (topFilter === "most_used") currentTopData = topVouchers.most_used;
      else if (topFilter === "highest_revenue") currentTopData = topVouchers.highest_revenue_impacted;
      else if (topFilter === "highest_rate") currentTopData = topVouchers.highest_usage_rate;
      else if (topFilter === "highest_discount") currentTopData = topVouchers.highest_discount_amount;

      const topExportData = (currentTopData || []).map((v: any) => ({
        'Mã Voucher': v.code,
        'Tên Voucher': v.title,
        'Giá trị': topFilter === "most_used" ? `${v.usage_count} lượt` :
                  topFilter === "highest_revenue" ? formatCurrency(v.revenue_impacted) :
                  topFilter === "highest_rate" ? `${v.usage_rate_percent}%` :
                  formatCurrency(v.total_discount_amount)
      }));

      // 3. Dữ liệu bảng chi tiết
      const performanceData = (performance || []).map((item: any) => ({
        'Mã Voucher': item.code,
        'Tên Voucher': item.title,
        'Bắt đầu': formatDate(item.release_date),
        'Kết thúc': formatDate(item.expiry_date),
        'Đã dùng': item.usage_count,
        'Tổng cấp': item.quantity,
        'Tỉ lệ (%)': item.usage_rate_percent,
        'Tổng giảm giá': formatCurrency(item.total_discount_amount),
        'Doanh thu đóng góp': formatCurrency(item.revenue_impacted)
      }));

      const filename = `Bao_cao_thong_ke_voucher`;

      if (type === 'excel') {
        exportMultiSheetExcel([
          { data: overviewData, sheetName: 'Tổng quan' },
          { data: topExportData, sheetName: `Top Voucher (${topFilter})` },
          { data: performanceData, sheetName: 'Chi tiết hiệu suất' }
        ], filename);
      } else {
        exportToCSV(performanceData, filename);
      }

      toast.success(`Xuất báo cáo ${type.toUpperCase()} thành công`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xuất báo cáo thống kê');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent pb-1">
            Thống kê Voucher
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Phân tích chuyên sâu về hiệu suất và doanh thu khuyến mãi
          </p>
        </div>
        <ExportDropdown 
          onExport={handleExport}
          isLoading={exportLoading}
        />
      </div>

      {/* --- PHẦN 1: OVERVIEW CARDS --- */}
      <div className="space-y-4">

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Tổng Doanh Thu (Gross)</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overview?.gross_revenue)}</div>
              <p className="text-xs text-muted-foreground">Net: {formatCurrency(overview?.net_revenue)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Tổng Tiền Giảm Giá</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                -{formatCurrency(overview?.total_discount_amount)}
              </div>
              <p className="text-xs text-muted-foreground">Chi phí khuyến mãi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Tỉ Lệ Sử Dụng</CardTitle>
              <Percent className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.usage_rate_percent || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {overview?.total_used || 0} / {overview?.total_assigned || 0} voucher đã phân bổ
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Tổng Voucher</CardTitle>
              <Ticket className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.total_vouchers || 0}</div>
              <p className="text-xs text-muted-foreground">Chiến dịch đang chạy</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- PHẦN 2: CHARTS & TOP VOUCHERS --- */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* CHART */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Biểu đồ sử dụng & Giảm giá</CardTitle>
              <CardDescription>Biến động số lượt dùng và tiền giảm giá</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Chỉ hiện DatePicker nếu group_by là 'day' */}
              {chartGroupBy === "day" && (
                <DatePickerWithRange
                  date={dateChart}
                  setDate={setDateChart}
                />
              )}

              <Select value={chartGroupBy} onValueChange={setChartGroupBy}>
                <SelectTrigger className="w-32.5 h-9">
                  <SelectValue placeholder="Theo ngày" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Theo ngày</SelectItem>
                  <SelectItem value="week">Theo tuần</SelectItem>
                  <SelectItem value="month">Theo tháng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pl-0 pt-4">
            <div className="h-87.5 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {/* Dùng state 'chart' thay vì 'chartData' */}
                <ComposedChart data={chart} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tickFormatter={(val) => formatChartDate(val, chartGroupBy)}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value} lượt`} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip
                    labelFormatter={(label: any) => formatChartDate(label, chartGroupBy)}
                    formatter={(value: any, name: any) => {
                      if (name === "Số lượt dùng") return [value, name];
                      return [formatCurrency(Number(value)), name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="usage_count" name="Số lượt dùng" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="discount_amount" name="Tiền giảm giá" stroke="#ef4444" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* TOP VOUCHERS */}
        {/* TOP VOUCHERS */}
        <Card className="col-span-1 flex flex-col">
          <CardHeader className="flex flex-col space-y-4 pb-4">
            <div className="flex flex-row items-start justify-between">
              <div className="space-y-1">
                <CardTitle>Top Vouchers</CardTitle>
                <CardDescription>Hoạt động hiệu quả nhất</CardDescription>
              </div>
            </div>

            {/* Khu vực bộ lọc: Gom DatePicker và Select vào chung */}
            <div className="space-y-2">
              <DatePickerWithRange
                date={dateTop}
                setDate={setDateTop}
                className="w-full"
              />
              <Select value={topFilter} onValueChange={setTopFilter}>
                <SelectTrigger className="w-full h-9 bg-slate-50">
                  <SelectValue placeholder="Chọn tiêu chí" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="most_used">Sử dụng nhiều nhất</SelectItem>
                  <SelectItem value="highest_revenue">Doanh thu tạo ra</SelectItem>
                  <SelectItem value="highest_rate">Tỷ lệ sử dụng</SelectItem>
                  <SelectItem value="highest_discount">Tiền giảm giá</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          {/* TOP VOUCHERS */}
          <CardContent className="flex-1 pt-2">
            <div className="space-y-4">
              {/* 1. HIỂN THỊ THEO LƯỢT DÙNG */}
              {topFilter === "most_used" && topVouchers?.most_used?.map((voucher: any) => (
                <div key={voucher.voucher_id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="space-y-1 overflow-hidden pr-2">
                    <p className="text-sm font-medium leading-none truncate">{voucher.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{voucher.code}</p>
                  </div>
                  <div className="font-medium text-sm whitespace-nowrap">
                    {voucher.used_count} lượt
                  </div>
                </div>
              ))}

              {/* 2. HIỂN THỊ THEO DOANH THU */}
              {topFilter === "highest_revenue" && topVouchers?.highest_revenue_impacted?.map((voucher: any) => (
                <div key={voucher.voucher_id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="space-y-1 overflow-hidden pr-2">
                    <p className="text-sm font-medium leading-none truncate">{voucher.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{voucher.code}</p>
                  </div>
                  <div className="font-medium text-sm text-green-600 whitespace-nowrap">
                    {formatCurrency(voucher.revenue_impacted)}
                  </div>
                </div>
              ))}

              {/* 3. HIỂN THỊ THEO TỶ LỆ DÙNG */}
              {topFilter === "highest_rate" && topVouchers?.highest_usage_rate?.map((voucher: any) => (
                <div key={voucher.voucher_id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="space-y-1 overflow-hidden pr-2">
                    <p className="text-sm font-medium leading-none truncate">{voucher.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{voucher.code}</p>
                  </div>
                  <div className="font-medium text-sm text-blue-600 whitespace-nowrap">
                    {voucher.usage_rate_percent}%
                  </div>
                </div>
              ))}

              {/* 4. HIỂN THỊ THEO TIỀN GIẢM */}
              {topFilter === "highest_discount" && topVouchers?.highest_discount_amount?.map((voucher: any) => (
                <div key={voucher.voucher_id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="space-y-1 overflow-hidden pr-2">
                    <p className="text-sm font-medium leading-none truncate">{voucher.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{voucher.code}</p>
                  </div>
                  <div className="font-medium text-sm text-red-500 whitespace-nowrap">
                    -{formatCurrency(voucher.total_discount_amount)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- PHẦN 3: PERFORMANCE TABLE --- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Chi tiết hiệu suất Voucher</CardTitle>
            <CardDescription>Báo cáo danh sách các voucher</CardDescription>
          </div>
          <div className="px-3 py-1.5 text-sm bg-white border rounded-md shadow-sm cursor-pointer hover:bg-slate-50">
            <DatePickerWithRange
              date={datePerformance}
              setDate={setDatePerformance}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã / Tên Voucher</TableHead>
                <TableHead>Thời hạn</TableHead>
                <TableHead className="text-right">Đã dùng / Tổng</TableHead>
                <TableHead className="text-right">Tỉ lệ</TableHead>
                <TableHead className="text-right">Tổng Giảm Giá</TableHead>
                <TableHead className="text-right">Tác động Doanh thu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Lặp qua state performance */}
              {performance?.map((item: any) => (
                <TableRow
                  key={item.voucher_id}
                  className="cursor-pointer hover:bg-slate-100"
                  onClick={() => navigate(`/admin/vouchers/${item.voucher_id}/recipients`)}
                >
                  <TableCell>
                    <div className="font-medium">{item.code}</div>
                    <div className="text-xs text-muted-foreground">{item.title}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDate(item.release_date)}</div>
                    <div className="text-xs text-muted-foreground">đến {formatDate(item.expiry_date)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.used_count} / {item.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${item.usage_rate_percent > 0 ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {item.usage_rate_percent}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-red-500 font-medium">
                    {item.total_discount_amount > 0 ? `-${formatCurrency(item.total_discount_amount)}` : '0 ₫'}
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {formatCurrency(item.revenue_impacted)}
                  </TableCell>
                </TableRow>
              ))}
              {performance?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
