/**
 * 통화, 숫자, 날짜, 비율 포맷팅 유틸리티
 */

// 날짜 포맷팅 (엑셀 시리얼 넘버, ISO 문자열, YYYYMMDD 지원)
export const formatDate = (val) => {
  if (!val) return '';
  if (typeof val === 'number') {
    // 엑셀 시리얼 날짜 (1900년 기준)
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    if (val.includes('T')) return val.split('T')[0];
    if (/^\d{8}$/.test(val)) {
      return `${val.substring(0, 4)}-${val.substring(4, 6)}-${val.substring(6, 8)}`;
    }
  }
  return String(val);
};

// 천 단위 콤마 숫자 포맷팅
export const formatCurrency = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('ko-KR').format(num);
};

// 비율 포맷팅 (%)
export const formatPercent = (val) => {
  if (val === undefined || val === null || val === '') return '0.0%';
  const num = Number(val);
  if (isNaN(num)) return '0.0%';
  return `${num.toFixed(1)}%`;
};

// 숫자 문자열 정제 (숫자, 마이너스, 점만 허용)
export const sanitizeNumberInput = (val) => {
  if (!val) return '';
  return String(val).replace(/[^0-9.-]/g, '');
};
