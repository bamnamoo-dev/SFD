import * as XLSX from 'xlsx';

/**
 * 추경 작업 내역 엑셀 내보내기 (.xlsx)
 */
export const exportSupplementExcel = (data, activeCols, filename) => {
  if (!data || data.length === 0) {
    alert('내보낼 데이터가 없습니다.');
    return;
  }

  // 순수 데이터 행(소계 제외) 매핑
  const exportRows = data.filter(r => !r._totalType).map(r => {
    const rowObj = {};
    activeCols.forEach(col => {
      let val = r[col.key];
      if (col.isNum) {
        val = Number(val) || 0;
      }
      rowObj[col.label] = val;
    });
    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "추경현황");

  const actualFilename = filename || `학교회계_추경현황_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, actualFilename);
};

/**
 * 세부지출현황 엑셀 내보내기 (.xlsx)
 */
export const exportExpenseExcel = (data, activeCols, filename) => {
  if (!data || data.length === 0) {
    alert('내보낼 데이터가 없습니다.');
    return;
  }

  const exportRows = data.map(r => {
    const rowObj = {};
    activeCols.forEach(col => {
      let val = r[col.key];
      if (col.isNum) {
        val = Number(val) || 0;
      }
      rowObj[col.label] = val;
    });
    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "세부지출현황");

  const actualFilename = filename || `학교회계_세부지출현황_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, actualFilename);
};
