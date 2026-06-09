import React, { useState, useMemo, useRef, useEffect, useCallback, memo, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, Search, Settings, Sun, Moon, Save, 
  ChevronUp, ChevronDown, Filter, FileSpreadsheet, 
  FileText, Printer, CreditCard 
} from 'lucide-react';

const formatDate = (val) => {
  if (!val) return '';
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    if (val.includes('T')) return val.split('T')[0];
    if (/^\d{8}$/.test(val)) return `${val.substring(0, 4)}-${val.substring(4, 6)}-${val.substring(6, 8)}`;
  }
  return String(val);
};

const TableRow = memo(({ row: r, activeCols, activeTab, onUpdateBudget }) => {
  return (
    <tr className={r._totalType ? `total-${r._totalType}` : ''}>
      {activeCols.map(col => {
        const val = r[col.key];
        const numVal = Number(val);
        const isNegative = (col.isNum || col.isRate) && numVal < 0;
        const isEditable = activeTab === 'supplement' && col.key === '추경' && !r._totalType;
        
        const isSuppCol = col.key === '추경';
        let specialClass = isSuppCol ? 'supp-cell' : '';
        if (isSuppCol && numVal > 0) specialClass += ' supp-positive';
        else if (isSuppCol && numVal < 0) specialClass += ' supp-negative';

        return (
          <td key={col.key} className={`${col.isNum ? 'num-cell' : col.isRate ? 'percent-cell' : 'center-cell'} ${isNegative && !isSuppCol ? 'negative-val' : ''} ${specialClass}`}>
            {isEditable ? (
              <input 
                type="text" 
                className={`edit-input ${specialClass}`}
                value={val || ''}
                placeholder="0"
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.-]/g, '');
                  onUpdateBudget('추경', raw);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const inputs = Array.from(document.querySelectorAll('.edit-input'));
                    const index = inputs.indexOf(e.target);
                    if (e.key === 'ArrowUp' && index > 0) {
                      inputs[index - 1].focus();
                      inputs[index - 1].select();
                    } else if (e.key === 'ArrowDown' && index < inputs.length - 1) {
                      inputs[index + 1].focus();
                      inputs[index + 1].select();
                    }
                  }
                }}
                onFocus={(e) => e.target.select()}
              />
            ) : (
              col.isNum ? new Intl.NumberFormat().format(numVal || 0) : 
              col.isRate ? (val || '0.0') + '%' : 
              (col.key === '_exclude' ? (r._exclude || r['정산재원'] || '') : 
              (col.key === '_costItem' ? r._costItem : r[col.key]))
            )}
          </td>
        );
      })}
    </tr>
  );
});

function App() {
  const [budgetData, setBudgetData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [activeTab, setActiveTab] = useState('detail');

  const isLoadedRef = useRef(false);

  useEffect(() => {
    const sendHeartbeat = () => {
      fetch('/api/heartbeat').catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 3000);
    return () => clearInterval(interval);
  }, []);

  // API 데이터 로드
  useEffect(() => {
    fetch('/api/load')
      .then(res => res.json())
      .then(data => {
        if (data.budgetData) setBudgetData(data.budgetData);
        if (data.expenseData) setExpenseData(data.expenseData);
        isLoadedRef.current = true;
      })
      .catch(err => {
        console.error("데이터 로드 실패:", err);
        isLoadedRef.current = true;
      });
  }, []);

  // API 데이터 저장 (디바운스 처리)
  useEffect(() => {
    if (!isLoadedRef.current) return;

    const saveData = async () => {
      try {
        await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ budgetData, expenseData })
        });
      } catch (err) {
        console.error("데이터 저장 실패:", err);
      }
    };

    const timeoutId = setTimeout(saveData, 500);
    return () => clearTimeout(timeoutId);
  }, [budgetData, expenseData]);

  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [deferredSearch, setDeferredSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [activeFilterCol, setActiveFilterCol] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [showManager, setShowManager] = useState(false);
  const [isLightMode, setIsLightMode] = useState(true);
  const [dragOverBox, setDragOverBox] = useState(null);
  const [hiddenCols, setHiddenCols] = useState({
    detail: { policy: true, unit: true, manager: true, supplement: true },
    supplement: { policy: true, unit: true, manager: true, rate: true },
    expense: {}
  });
  const [dateMode, setDateMode] = useState('month');

  const filterRef = useRef(null);
  const managerRef = useRef(null);

  const [detailColWidths, setDetailColWidths] = useState({
    policy: 110, unit: 120, project: 150, item: 130, desc: 220, cost: 130,
    a: 110, b: 110, ab: 140, c: 110, ac: 140, supplement: 100, rate: 80, exclude: 90, manager: 120
  });
  const [expenseColWidths, setExpenseColWidths] = useState({
    proj: 200, item: 200, category: 150, date: 120, title: 800, payee: 150, amount: 120
  });

  const detailCols = useMemo(() => [
    { label: '정책사업', key: '정책사업', wk: 'policy' },
    { label: '단위사업', key: '단위사업', wk: 'unit' },
    { label: '세부사업', key: '세부사업', wk: 'project' },
    { label: '세부항목', key: '세부항목', wk: 'item' },
    { label: '산출내역', key: '산출내역', wk: 'desc' },
    { label: '원가통계비목', key: '_costItem', wk: 'cost' },
    { label: '예산현액 (A)', key: '_a', wk: 'a', isNum: true },
    { label: '원인행위액 (B)', key: '_b', wk: 'b', isNum: true },
    { label: '원인행위잔액 (A-B)', key: '_ab', wk: 'ab', isNum: true },
    { label: '지출액 (C)', key: '_c', wk: 'c', isNum: true },
    { label: '지출잔액 (A-C)', key: '_ac', wk: 'ac', isNum: true },
    { label: '추경', key: '추경', wk: 'supplement', isNum: true },
    { label: '불용율', key: '_rate', wk: 'rate', isRate: true },
    { label: '정산재원', key: '_exclude', wk: 'exclude', isNum: true },
    { label: '세부항목담당자', key: '세부항목담당자', wk: 'manager' }
  ], []);

  const expenseCols = useMemo(() => [
    { label: '세부사업명', key: '세부사업명', wk: 'proj' },
    { label: '세부항목명', key: '세부항목명', wk: 'item' },
    { label: '원가비목', key: '원가비목', wk: 'category' },
    { label: '지출일자', key: '_date', wk: 'date' },
    { label: '제목', key: '제목', wk: 'title' },
    { label: '채주', key: '채주', wk: 'payee' },
    { label: '지출액', key: '_amt', wk: 'amount', isNum: true }
  ], []);

  useEffect(() => {
    if (isLightMode) document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
  }, [isLightMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setActiveFilterCol(null);
      if (managerRef.current && !managerRef.current.contains(event.target) && !event.target.closest('.manager-toggle')) setShowManager(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const processBudgetFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      let headerIdx = rows.findIndex(r => r.includes('정책사업') || r.includes('단위사업'));
      if (headerIdx === -1) headerIdx = 0;

      const json = XLSX.utils.sheet_to_json(ws, { range: headerIdx });
      const filtered = json.filter(r => {
        const isTotalRow = Object.values(r).some(v => {
          const s = String(v || '').replace(/\s/g, '');
          return /합계|소계|누계|전기계|\[.*계.*\]|\[.*소.*\]/.test(s);
        });
        if (isTotalRow) return false;
        return (r['정책사업'] || r['단위사업'] || r['세부사업']);
      }).map((r, idx) => {
        const a = Number(r['예산현액 (A)'] || r['예산현액(A)'] || r['예산현액'] || 0);
        const b = Number(r['원인행위액 (B)'] || r['원인행위액(B)'] || r['원인행위액'] || 0);
        const c = Number(r['지출액 (C)'] || r['지출액(C)'] || r['지출액'] || 0);
        return {
          ...r, _id: idx,
          _a: a, _b: b, _ab: a - b, _c: c, _ac: a - c,
          _rate: a > 0 ? ((a - b) / a * 100).toFixed(1) : '0.0',
          _exclude: Number(r['정산재원'] || r['결산제외'] || 0),
          _costItem: r['원가통계비목'] || r['원가비목'] || r['원가통계'] || '',
          _totalType: ''
        };
      });
      setBudgetData(filtered);
      setActiveTab('detail');
    };
    reader.readAsBinaryString(file);
  };

  const processExpenseFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      let headerIdx = rows.findIndex(r => 
        r.some(v => String(v).includes('지출일자') || String(v).includes('세부사업명') || String(v).includes('채주'))
      );
      if (headerIdx === -1) headerIdx = 0;
      const json = XLSX.utils.sheet_to_json(ws, { range: headerIdx });
      const filteredJson = json.filter(r => {
        const isTotal = Object.values(r).some(v => {
          const s = String(v || '').replace(/\s/g, '');
          return /합계|소계|누계|전기계|기간계|월계|\[.*계.*\]/.test(s);
        });
        if (isTotal) return false;
        const amt = Number(r['지출액'] || r['지급액'] || r['금액'] || r['지출액(C)'] || 0);
        return amt !== 0;
      });
      setExpenseData(filteredJson.map(r => ({
        ...r,
        _amt: Number(r['지출액'] || r['지급액'] || r['금액'] || r['지출액(C)'] || 0),
        _date: formatDate(r['지출일자'] || r['일자'] || r['지출일'])
      })));
      setActiveTab('expense');
    };
    reader.readAsBinaryString(file);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    startTransition(() => setDeferredSearch(val));
  };

  const filteredData = useMemo(() => {
    const source = activeTab === 'expense' ? expenseData : budgetData;
    let items = source.filter(d => {
      const searchMatch = !deferredSearch || Object.values(d).some(v => String(v).toLowerCase().includes(deferredSearch.toLowerCase()));
      if (!searchMatch) return false;
      for (let colKey in columnFilters) {
        const allowed = columnFilters[colKey];
        if (allowed && allowed.length > 0) {
          let val = (d[colKey] === undefined || d[colKey] === null) ? '' : String(d[colKey]);
          if (colKey === '_date') val = dateMode === 'month' ? val.substring(0, 7) : val;
          if (!allowed.includes(val)) return false;
        }
      }
      return true;
    });
    if (sortConfig.key) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [activeTab, budgetData, expenseData, deferredSearch, sortConfig, columnFilters, dateMode]);

  const displayData = useMemo(() => {
    if ((activeTab !== 'detail' && activeTab !== 'supplement') || filteredData.length === 0) return filteredData;
    const result = [];
    let currentGroup = filteredData[0]['세부사업'];
    let groupRows = [];
    const addTotalRow = (name, rows) => {
      if (rows.length === 0) return;
      const sumA = rows.reduce((s, r) => s + (r._a || 0), 0);
      const sumB = rows.reduce((s, r) => s + (r._b || 0), 0);
      const sumC = rows.reduce((s, r) => s + (r._c || 0), 0);
      const sumExclude = rows.reduce((s, r) => s + (Number(r._exclude) || 0), 0);
      const sumSupp = rows.reduce((s, r) => s + (Number(r['추경']) || 0), 0);
      result.push({
        '세부사업': `${name} 합계`,
        _a: sumA, _b: sumB, _ab: sumA - sumB, _c: sumC, _ac: sumA - sumC,
        추경: sumSupp, _exclude: sumExclude,
        _rate: sumA > 0 ? ((sumA - sumB) / sumA * 100).toFixed(1) : '0.0',
        _totalType: 'detail'
      });
    };
    filteredData.forEach(row => {
      if (row['세부사업'] !== currentGroup) { 
        addTotalRow(currentGroup, groupRows); 
        currentGroup = row['세부사업']; 
        groupRows = []; 
      }
      result.push(row); 
      groupRows.push(row);
    });
    addTotalRow(currentGroup, groupRows);
    return result;
  }, [filteredData, activeTab]);

  const totals = useMemo(() => {
    if (activeTab === 'expense') return { expense: filteredData.reduce((acc, cur) => acc + cur._amt, 0) };
    const baseData = filteredData.filter(d => !d._totalType);
    return {
      a: baseData.reduce((acc, cur) => acc + cur._a, 0),
      b: baseData.reduce((acc, cur) => acc + cur._b, 0),
      ab: baseData.reduce((acc, cur) => acc + cur._ab, 0),
      c: baseData.reduce((acc, cur) => acc + cur._c, 0),
      ac: baseData.reduce((acc, cur) => acc + cur._ac, 0),
      supp: baseData.reduce((acc, cur) => acc + (Number(cur['추경']) || 0), 0),
      exclude: baseData.reduce((acc, cur) => acc + (Number(cur._exclude) || 0), 0)
    };
  }, [filteredData, activeTab]);

  const activeCols = useMemo(() => {
    const cols = activeTab === 'expense' ? expenseCols : detailCols;
    const tabHidden = hiddenCols[activeTab] || {};
    return cols.filter(c => !tabHidden[c.wk]);
  }, [activeTab, hiddenCols, detailCols, expenseCols]);

  const startResize = (e, colKey, isExpense) => {
    e.stopPropagation();
    const startX = e.pageX;
    const startWidth = isExpense ? expenseColWidths[colKey] : detailColWidths[colKey];
    const onMouseMove = (moveE) => {
      const newWidth = Math.max(60, startWidth + (moveE.pageX - startX));
      if (isExpense) setExpenseColWidths(prev => ({ ...prev, [colKey]: newWidth }));
      else setDetailColWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleExport = useCallback(() => {
    if (!budgetData.length) return alert('저장할 데이터가 없습니다.');
    const dataToExport = displayData.filter(r => !r._totalType).map(r => {
      const obj = {};
      activeCols.forEach(col => {
        let val = r[col.key];
        if (col.isNum) val = Number(val) || 0;
        obj[col.label] = val;
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "추경현황");
    XLSX.writeFile(wb, `학교회계_추경현황_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [budgetData, displayData, activeCols]);

  const renderFilterMenu = (colKey) => {
    if (activeFilterCol !== colKey) return null;
    const source = activeTab === 'expense' ? expenseData : budgetData;
    let allValues = [...new Set(source.map(d => (d[colKey] === undefined || d[colKey] === null) ? '' : String(d[colKey])))].sort();
    
    if (colKey === '_date') {
      if (dateMode === 'month') {
        allValues = [...new Set(allValues.map(v => v.substring(0, 7)))].sort();
      }
    }
    const selected = columnFilters[colKey] || [];
    
    return (
      <div className="filter-menu" ref={filterRef} onClick={e => e.stopPropagation()}>
        {colKey === '_date' && (
          <div className="date-mode-toggle">
            <button className={dateMode === 'month' ? 'active' : ''} onClick={() => { setDateMode('month'); setColumnFilters(p => ({...p, [colKey]: []})); }}>월별</button>
            <button className={dateMode === 'day' ? 'active' : ''} onClick={() => { setDateMode('day'); setColumnFilters(p => ({...p, [colKey]: []})); }}>일별</button>
          </div>
        )}
        <div className="filter-item" onClick={() => setColumnFilters(prev => ({ ...prev, [colKey]: selected.length === allValues.length ? [] : allValues }))}>
          <input type="checkbox" checked={selected.length === allValues.length} readOnly />
          <strong>(전체 선택)</strong>
        </div>
        <hr style={{ borderColor: 'var(--border)', margin: '6px 0' }} />
        {allValues.map(v => (
          <div key={v} className="filter-item" onClick={() => setColumnFilters(prev => ({ ...prev, [colKey]: prev[colKey]?.includes(v) ? prev[colKey].filter(x => x !== v) : [...(prev[colKey] || []), v] }))}>
            <input type="checkbox" checked={selected.includes(v)} readOnly />
            <span>{v === '' ? '(공백)' : v}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container">
      <header className="animate-fade-in" style={{ textAlign: 'center' }}>
        <h1>2026 학교회계 통합 대시보드</h1>
        <span className="creator-info">제작자: bamnamoo@gmail.com</span>
      </header>

      <div className="upload-section animate-fade-in">
        <div 
          className={`upload-box ${budgetData.length ? 'done' : ''} ${dragOverBox === 'budget' ? 'drag-active' : ''}`} 
          onClick={() => document.getElementById('budget-file').click()}
          onDragOver={(e) => { e.preventDefault(); setDragOverBox('budget'); }}
          onDragLeave={() => setDragOverBox(null)}
          onDrop={(e) => { e.preventDefault(); setDragOverBox(null); if (e.dataTransfer.files[0]) processBudgetFile(e.dataTransfer.files[0]); }}
        >
          <div className="upload-guide">
            <FileSpreadsheet size={28} style={{ marginBottom: '0.2rem', color: budgetData.length ? 'var(--success)' : 'var(--primary)' }} />
            <strong style={{ fontSize: '1.1rem' }}>📂 사업관리카드(현액)(정책,단위체크)</strong><br />
            <span className="box-sub" style={{ fontSize: '0.8rem', opacity: 0.8, display: 'block', letterSpacing: '-0.02em' }}>
              ① K-에듀파인: 학교회계/사업관리/사업관리카드/사업관리카드(현액) (정책,단위체크 선택 후 조회) &gt; 엑셀저장
            </span>
          </div>
          <div className="box-sub" style={{ fontWeight: 700, marginTop: '0.1rem', fontSize: '1rem' }}>
            {budgetData.length ? `✅ ${budgetData.filter(d => !d._totalType).length}건 완료` : '클릭 또는 파일 드래그'}
          </div>
          <input type="file" id="budget-file" hidden onChange={e => processBudgetFile(e.target.files[0])} accept=".xlsx, .xls" />
        </div>

        <div 
          className={`upload-box ${expenseData.length ? 'done' : ''} ${dragOverBox === 'expense' ? 'drag-active' : ''}`} 
          onClick={() => document.getElementById('expense-file').click()}
          onDragOver={(e) => { e.preventDefault(); setDragOverBox('expense'); }}
          onDragLeave={() => setDragOverBox(null)}
          onDrop={(e) => { e.preventDefault(); setDragOverBox(null); if (e.dataTransfer.files[0]) processExpenseFile(e.dataTransfer.files[0]); }}
        >
          <div className="upload-guide">
            <CreditCard size={28} style={{ marginBottom: '0.2rem', color: expenseData.length ? 'var(--success)' : 'var(--primary)' }} />
            <strong style={{ fontSize: '1.1rem' }}>📂 현금출납부</strong><br />
            <span className="box-sub" style={{ fontSize: '0.8rem', opacity: 0.8, display: 'block', letterSpacing: '-0.02em' }}>
              ① K-에듀파인: 학교회계/지출관리/지출장부/현금출납부/조회/엑셀저장
            </span>
          </div>
          <div className="box-sub" style={{ fontWeight: 700, marginTop: '0.1rem', fontSize: '1rem' }}>
            {expenseData.length ? `✅ ${expenseData.length}건 완료` : '클릭 또는 파일 드래그'}
          </div>
          <input type="file" id="expense-file" hidden onChange={e => processExpenseFile(e.target.files[0])} accept=".xlsx, .xls" />
        </div>

        <div className="header-tools">
          <div className="tool-row">
            <button className="toggle-btn manager-toggle" onClick={() => setShowManager(!showManager)}>
              <Settings size={16} /> 컬럼 설정
            </button>
            <button className="toggle-btn" onClick={() => setIsLightMode(!isLightMode)}>
              {isLightMode ? <Moon size={16} /> : <Sun size={16} />} {isLightMode ? '다크' : '화이트'}
            </button>
          </div>
          <div className="tool-row">
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="search-input" 
                placeholder="검색어..." 
                value={search} 
                onChange={handleSearchChange}
                style={{ paddingLeft: '32px', opacity: isPending ? 0.7 : 1 }} 
              />
            </div>
            <button className="toggle-btn" 
              onClick={handleExport} 
              disabled={activeTab !== 'supplement'}
              style={{
                background: activeTab === 'supplement' ? 'var(--success)' : 'var(--surface)', 
                color: activeTab === 'supplement' ? 'white' : 'var(--text-muted)',
                opacity: activeTab === 'supplement' ? 1 : 0.5
              }}>
              <Save size={16} /> 저장
            </button>
            <button className="toggle-btn" onClick={() => window.print()} style={{background: 'var(--primary)', color: 'white', border: 'none'}}>
              <Printer size={16} /> 인쇄
            </button>
          </div>
        </div>

        {showManager && (
          <div className="col-manager-modal" ref={managerRef}>
            {(activeTab === 'expense' ? expenseCols : detailCols).map(col => (
              <label key={col.wk}>
                <input type="checkbox" 
                  checked={!(hiddenCols[activeTab] || {})[col.wk]} 
                  onChange={() => setHiddenCols(prev => ({
                    ...prev,
                    [activeTab]: { ...prev[activeTab], [col.wk]: !prev[activeTab][col.wk] }
                  }))} 
                />
                {col.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="tab-area animate-fade-in">
        <div className="tabs">
          {[
            { id: 'detail', label: '1. 세부사업' },
            { id: 'supplement', label: '2. 추경' },
            { id: 'expense', label: '3. 세부지출현황' }
          ].map(t => (
            <div key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => { setActiveTab(t.id); setColumnFilters({}); }}>
              {t.label}
            </div>
          ))}
        </div>
        <div className="box-sub">총 {filteredData.length}건</div>
      </div>

      <div className="content-card animate-fade-in">
        <div className="table-wrapper" key={activeTab}>
          <table>
            <thead className="excel-header">
              <tr>
                {activeCols.map(col => (
                  <th 
                    key={col.key} 
                    style={{ width: (activeTab === 'expense' ? expenseColWidths[col.wk] : detailColWidths[col.wk]) + 'px' }} 
                    onClick={() => setSortConfig({ key: col.key, direction: sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                  >
                    <div className="header-content">
                      <span className={`filter-btn ${columnFilters[col.key]?.length > 0 ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setActiveFilterCol(activeFilterCol === col.key ? null : col.key); }}>
                        <Filter size={12} />
                      </span>
                      <span className="header-label">{col.label}</span>
                      <span className="sort-icon">
                        {sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ChevronDown size={10} style={{ opacity: 0.3 }} />}
                      </span>
                    </div>
                    <div className="resizer" onMouseDown={e => startResize(e, col.wk, activeTab === 'expense')}></div>
                    {renderFilterMenu(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((r, i) => (
                <TableRow 
                  key={r._id || i} 
                  row={r} 
                  activeCols={activeCols} 
                  activeTab={activeTab}
                  onUpdateBudget={(key, val) => {
                    setBudgetData(prev => prev.map(row => row._id === r._id ? { ...row, [key]: val } : row));
                  }}
                />
              ))}
              <tr className="grand-total">
                {activeTab === 'expense' ? (
                  (() => {
                    const labelSpan = activeCols.findIndex(c => c.wk === 'amount');
                    return (
                      <>
                        <td colSpan={labelSpan > 0 ? labelSpan : 1} className="center-cell">총 합 계</td>
                        {activeCols.filter((_, idx) => idx >= labelSpan).map(col => (
                          <td key={col.key} className={col.isNum ? 'num-cell' : 'center-cell'}>
                            {col.key === '_amt' ? new Intl.NumberFormat().format(totals.expense) : ''}
                          </td>
                        ))}
                      </>
                    );
                  })()
                ) : (
                  (() => {
                    const firstNumIdx = activeCols.findIndex(c => c.isNum || c.isRate);
                    const labelSpan = firstNumIdx > 0 ? firstNumIdx : 1;
                    const afterNumCols = activeCols.slice(firstNumIdx);
                    return (
                      <>
                        <td colSpan={labelSpan} className="center-cell">총 합 계</td>
                        {afterNumCols.map(col => {
                          let val = '';
                          let className = col.isNum ? 'num-cell' : col.isRate ? 'percent-cell' : 'center-cell';
                          if (col.key === '_a') val = new Intl.NumberFormat().format(totals.a);
                          else if (col.key === '_b') val = new Intl.NumberFormat().format(totals.b);
                          else if (col.key === '_ab') val = new Intl.NumberFormat().format(totals.ab);
                          else if (col.key === '_c') val = new Intl.NumberFormat().format(totals.c);
                          else if (col.key === '_ac') val = new Intl.NumberFormat().format(totals.ac);
                          else if (col.key === '추경') val = new Intl.NumberFormat().format(totals.supp);
                          else if (col.key === '_exclude') val = new Intl.NumberFormat().format(totals.exclude);
                          else if (col.key === '_rate') val = (totals.a > 0 ? ((totals.a - totals.b) / totals.a * 100).toFixed(1) : '0.0') + '%';
                          
                          const isNeg = (col.key === '_a' && totals.a < 0) || (col.key === '_b' && totals.b < 0) || 
                                        (col.key === '_ab' && totals.ab < 0) || (col.key === '_c' && totals.c < 0) || 
                                        (col.key === '_ac' && totals.ac < 0) || (col.key === '_rate' && totals.a > 0 && (totals.a - totals.b) < 0);
                          
                          return <td key={col.key} className={`${className} ${isNeg ? 'negative-val' : ''}`}>{val}</td>;
                        })}
                      </>
                    );
                  })()
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
