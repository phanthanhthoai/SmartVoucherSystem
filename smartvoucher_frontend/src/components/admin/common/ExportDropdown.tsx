import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { FileDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

interface ExportDropdownProps {
  onExport: (type: 'excel' | 'csv') => void;
  isLoading?: boolean;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({ onExport, isLoading = false }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={isLoading}
          className="h-11 px-4 border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-indigo-300 transition-all font-semibold text-slate-600 shadow-sm flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          ) : (
            <FileDown className="w-4 h-4 text-indigo-600" />
          )}
          <span>Xuất dữ liệu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl border border-slate-100 shadow-2xl animate-in fade-in zoom-in duration-200">
        <DropdownMenuItem
          onClick={() => onExport('excel')}
          className="flex items-center gap-3 py-3 px-4 rounded-xl cursor-pointer hover:bg-indigo-50 group transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-slate-700">Xuất Excel (.xlsx)</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onExport('csv')}
          className="flex items-center gap-3 py-3 px-4 rounded-xl cursor-pointer hover:bg-orange-50 group transition-colors"
        >
          <FileText className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-slate-700">Xuất CSV (.csv)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
