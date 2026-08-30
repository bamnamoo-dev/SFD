import * as XLSX from 'xlsx';
import { formatDate } from './formatters';

/**
 * K-에듀파인 사업관리카드(현액) 엑셀 파일 파싱
 */
export const parseBudgetFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('파일이 선택되지 않았습니다.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // 헤더 행 탐색
        let headerIdx = rows.findIndex(r => 
          Array.isArray(r) && r.some(v => String(v).includes('정책사업') || String(v).includes('단위사업') || String(v).includes('세부사업'))
        );
        if (headerIdx === -1) headerIdx = 0;

        const json = XLSX.utils.sheet_to_json(ws, { range: headerIdx });

        // 합계/소계 행 제외 및 유효 데이터 필터링
        const filtered = json.filter(r => {
          const isTotalRow = Object.values(r).some(v => {
            const s = String(v || '').replace(/\s/g, '');
            return /합계|소계|누계|전기계|\[.*계.*\]|\[.*소.*\]/.test(s);
          });
          if (isTotalRow) return false;
          return !!(r['정책사업'] || r['단위사업'] || r['세부사업'] || r['세부항목']);
        }).map((r, idx) => {
          const a = Number(r['예산현액 (A)'] || r['예산현액(A)'] || r['예산현액'] || 0);
          const b = Number(r['원인행위액 (B)'] || r['원인행위액(B)'] || r['원인행위액'] || 0);
          const c = Number(r['지출액 (C)'] || r['지출액(C)'] || r['지출액'] || 0);
          
          return {
            ...r,
            _id: `b_${idx}_${Date.now()}`,
            _a: a,
            _b: b,
            _ab: a - b,
            _c: c,
            _ac: a - c,
            _rate: a > 0 ? ((a - b) / a * 100).toFixed(1) : '0.0',
            _exclude: Number(r['정산재원'] || r['결산제외'] || 0),
            _costItem: r['원가통계비목'] || r['원가비목'] || r['원가통계'] || '',
            추경: r['추경'] ? String(r['추경']) : '',
            _note: r['비고'] || r['추경사유'] || '',
            _totalType: ''
          };
        });

        resolve(filtered);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

/**
 * K-에듀파인 현금출납부 엑셀 파일 파싱
 */
export const parseExpenseFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('파일이 선택되지 않았습니다.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // 헤더 행 탐색
        let headerIdx = rows.findIndex(r => 
          Array.isArray(r) && r.some(v => 
            String(v).includes('지출일자') || String(v).includes('세부사업명') || String(v).includes('채주')
          )
        );
        if (headerIdx === -1) headerIdx = 0;

        const json = XLSX.utils.sheet_to_json(ws, { range: headerIdx });

        // 합계/소계/0원 행 제외
        const filteredJson = json.filter(r => {
          const isTotal = Object.values(r).some(v => {
            const s = String(v || '').replace(/\s/g, '');
            return /합계|소계|누계|전기계|기간계|월계|\[.*계.*\]/.test(s);
          });
          if (isTotal) return false;
          const amt = Number(r['지출액'] || r['지급액'] || r['금액'] || r['지출액(C)'] || 0);
          return amt !== 0;
        });

        const parsed = filteredJson.map((r, idx) => ({
          ...r,
          _id: `e_${idx}_${Date.now()}`,
          _amt: Number(r['지출액'] || r['지급액'] || r['금액'] || r['지출액(C)'] || 0),
          _date: formatDate(r['지출일자'] || r['일자'] || r['지출일'])
        }));

        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};
