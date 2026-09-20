import * as XLSX from 'xlsx';

/**
 * Xuất dữ liệu ra file Excel (.xlsx)
 * @param data Mảng các object chứa dữ liệu cần xuất
 * @param fileName Tên file (không cần phần mở rộng)
 * @param sheetName Tên sheet trong file Excel
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
  if (data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  // Tự động tính toán độ rộng cột dựa trên nội dung
  const colWidths = Object.keys(data[0]).map(key => {
    const maxLength = Math.max(
      key.toString().length,
      ...data.map(row => (row[key] ? row[key].toString().length : 0))
    );
    return { wch: maxLength + 4 }; // Thêm 4 units đệm
  });

  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}_${new Date().getTime()}.xlsx`);
};

/**
 * Xuất dữ liệu ra file CSV (.csv) kèm theo BOM để hỗ trợ tiếng Việt (UTF-8)
 * @param data Mảng các object chứa dữ liệu cần xuất
 * @param fileName Tên file (không cần phần mở rộng)
 */
export const exportToCSV = (data: any[], fileName: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row =>
      headers.map(fieldName => {
        const value = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];
        const escaped = ('' + value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}_${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
/**
 * Xuất dữ liệu đa sheet ra file Excel (.xlsx)
 * @param sheets Mảng các object chứa dã liệu và tên sheet tương ứng
 * @param fileName Tên file (không cần phần mở rộng)
 */
export const exportMultiSheetExcel = (sheets: { data: any[], sheetName: string }[], fileName: string) => {
  if (sheets.length === 0) return;

  const workbook = XLSX.utils.book_new();

  sheets.forEach(sheet => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.data);
    
    // Tự động tính toán độ rộng cột cho từng sheet
    const colWidths = Object.keys(sheet.data[0] || {}).map(key => {
      const maxLength = Math.max(
        key.toString().length,
        ...sheet.data.map(row => (row[key] ? row[key].toString().length : 0))
      );
      return { wch: maxLength + 4 };
    });
    
    worksheet['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
  });

  XLSX.writeFile(workbook, `${fileName}_${new Date().getTime()}.xlsx`);
};
