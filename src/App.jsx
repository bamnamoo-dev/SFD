import React, { useState, useMemo, useEffect, useCallback, useTransition } from 'react';
import { Header } from './components/Header';
import { KPISummary } from './components/KPISummary';
import { UploadSection } from './components/UploadSection';
import { SupplementToolbar } from './components/SupplementToolbar';
import { BudgetTable } from './components/BudgetTable';
import { ExpenseTable } from './components/ExpenseTable';
import { ColumnManager } from './components/ColumnManager';

import { useBudgetStore } from './hooks/useBudgetStore';
import { parseBudgetFile, parseExpenseFile } from './utils/excelParser';
import { exportSupplementExcel, exportExpenseExcel } from './utils/excelExporter';

function App() {
  const {
    budgetData,
    setBudgetData,
    expenseData,
    setExpenseData,
    updateBudgetRow,
    reduceAllBalance,
    resetSupplement,
    canUndo,
    canRedo,
    undo,
    redo,
    exportJSON,
    importJSON
  } = useBudgetStore();

  const [activeTab, setActiveTab] = useState('detail');
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [deferredSearch, setDeferredSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
  const [activeFilterCol, setActiveFilterCol] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [showManager, setShowManager] = useState(false);
  const [isLightMode, setIsLightMode] = useState(true);
  const [dateMode, setDateMode] = useState('month');

  // 컬럼 표시/숨김 설정 (기본값)
  const [hiddenCols, setHiddenCols] = useState({
    detail: { policy: true, unit: true, manager: true, supplement: true, note: true },
    supplement: { policy: true, unit: true, manager: true, rate: true },
    expense: {}
  });

  // 컬럼 너비 상태
  const [detailColWidths, setDetailColWidths] = useState({
    policy: 110, unit: 120, project: 150, item: 140, desc: 220, cost: 130,
    a: 110, b: 110, ab: 140, c: 110, ac: 140, supplement: 110, note: 160,
    rate: 80, exclude: 90, manager: 120
  });

  const [expenseColWidths, setExpenseColWidths] = useState({
    proj: 200, item: 200, category: 150, date: 120, title: 450, payee: 150, amount: 130
  });

  // 세부사업 및 추경 컬럼 정의
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
    { label: '추경 사유(비고)', key: '_note', wk: 'note' },
    { label: '불용율', key: '_rate', wk: 'rate', isRate: true },
    { label: '정산재원', key: '_exclude', wk: 'exclude', isNum: true },
    { label: '세부항목담당자', key: '세부항목담당자', wk: 'manager' }
  ], []);

  // 세부지출현황 컬럼 정의
  const expenseCols = useMemo(() => [
    { label: '세부사업명', key: '세부사업명', wk: 'proj' },
    { label: '세부항목명', key: '세부항목명', wk: 'item' },
    { label: '원가비목', key: '원가비목', wk: 'category' },
    { label: '지출일자', key: '_date', wk: 'date' },
    { label: '제목', key: '제목', wk: 'title' },
    { label: '채주', key: '채주', wk: 'payee' },
    { label: '지출액', key: '_amt', wk: 'amount', isNum: true }
  ], []);

  // 라이트 모드 바디 클래스 제어
  useEffect(() => {
    if (isLightMode) document.body.classList.add('light-mode');
    else document.body.classList.remove('light-mode');
  }, [isLightMode]);

  // 키보드 단축키 (Ctrl+Z: Undo, Ctrl+Y: Redo)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // 외부 클릭 시 필터 닫기
  useEffect(() => {
    const handleClickOutside = () => setActiveFilterCol(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // 사업관리카드 업로드 처리
  const handleBudgetUpload = async (file) => {
    try {
      const data = await parseBudgetFile(file);
      setBudgetData(data);
      setActiveTab('detail');
    } catch (err) {
      alert('사업관리카드 파일 파싱 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // 현금출납부 업로드 처리
  const handleExpenseUpload = async (file) => {
    try {
      const data = await parseExpenseFile(file);
      setExpenseData(data);
      setActiveTab('expense');
    } catch (err) {
      alert('현금출납부 파일 파싱 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // 검색어 입력 핸들러
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    startTransition(() => setDeferredSearch(val));
  };

  // 정렬 핸들러
  const handleSort = (colKey) => {
    setSortConfig(prev => ({
      key: colKey,
      direction: prev.key === colKey && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 컬럼 너비 리사이징 핸들러
  const handleStartResize = (e, colKey, isExpense) => {
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

  // 필터링된 기본 데이터
  const filteredData = useMemo(() => {
    const source = activeTab === 'expense' ? expenseData : budgetData;
    let items = source.filter(d => {
      const searchMatch = !deferredSearch || Object.values(d).some(v => 
        String(v).toLowerCase().includes(deferredSearch.toLowerCase())
      );
      if (!searchMatch) return false;

      for (let colKey in columnFilters) {
        const allowed = columnFilters[colKey];
        if (allowed && allowed.length > 0) {
          let val = (d[colKey] === undefined || d[colKey] === null) ? '' : String(d[colKey]);
          if (colKey === '_date' && dateMode === 'month') {
            val = val.substring(0, 7);
          }
          if (!allowed.includes(val)) return false;
        }
      }
      return true;
    });

    if (sortConfig.key) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        aVal = String(aVal || '');
        bVal = String(bVal || '');
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }

    return items;
  }, [activeTab, budgetData, expenseData, deferredSearch, sortConfig, columnFilters, dateMode]);

  // 세부사업별 소계가 삽입된 렌더링 데이터
  const displayData = useMemo(() => {
    if ((activeTab !== 'detail' && activeTab !== 'supplement') || filteredData.length === 0) {
      return filteredData;
    }

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
        _id: `subtotal_${name}_${Math.random()}`,
        '세부사업': `${name} 소계`,
        _a: sumA,
        _b: sumB,
        _ab: sumA - sumB,
        _c: sumC,
        _ac: sumA - sumC,
        추경: sumSupp,
        _exclude: sumExclude,
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

  // 상단 및 하단 총계 계산
  const totals = useMemo(() => {
    if (activeTab === 'expense') {
      return { expense: filteredData.reduce((acc, cur) => acc + (cur._amt || 0), 0) };
    }
    const baseData = filteredData.filter(d => !d._totalType);
    return {
      a: baseData.reduce((acc, cur) => acc + (cur._a || 0), 0),
      b: baseData.reduce((acc, cur) => acc + (cur._b || 0), 0),
      ab: baseData.reduce((acc, cur) => acc + (cur._ab || 0), 0),
      c: baseData.reduce((acc, cur) => acc + (cur._c || 0), 0),
      ac: baseData.reduce((acc, cur) => acc + (cur._ac || 0), 0),
      supp: baseData.reduce((acc, cur) => acc + (Number(cur['추경']) || 0), 0),
      exclude: baseData.reduce((acc, cur) => acc + (Number(cur._exclude) || 0), 0)
    };
  }, [filteredData, activeTab]);

  // 현재 활성화된 컬럼 목록
  const activeCols = useMemo(() => {
    const cols = activeTab === 'expense' ? expenseCols : detailCols;
    const tabHidden = hiddenCols[activeTab] || {};
    return cols.filter(c => !tabHidden[c.wk]);
  }, [activeTab, hiddenCols, detailCols, expenseCols]);

  // 엑셀 내보내기 핸들러
  const handleExportExcel = useCallback(() => {
    if (activeTab === 'expense') {
      exportExpenseExcel(filteredData, activeCols);
    } else {
      exportSupplementExcel(displayData, activeCols);
    }
  }, [activeTab, displayData, filteredData, activeCols]);

  // 컬럼 토글
  const handleToggleCol = (tab, colWk) => {
    setHiddenCols(prev => ({
      ...prev,
      [tab]: { ...prev[tab], [colWk]: !prev[tab]?.[colWk] }
    }));
  };

  // 컬럼 기본값 복원
  const handleResetCols = (tab) => {
    if (tab === 'detail') {
      setHiddenCols(prev => ({ ...prev, detail: { policy: true, unit: true, manager: true, supplement: true, note: true } }));
    } else if (tab === 'supplement') {
      setHiddenCols(prev => ({ ...prev, supplement: { policy: true, unit: true, manager: true, rate: true } }));
    } else {
      setHiddenCols(prev => ({ ...prev, expense: {} }));
    }
  };

  return (
    <div className="container">
      {/* 헤더 & JSON 백업/복원 */}
      <Header 
        isLightMode={isLightMode} 
        setIsLightMode={setIsLightMode} 
        onExportJSON={exportJSON}
        onImportJSON={importJSON}
      />

      {/* 상단 4대 핵심 재정 지표 요약 카드 */}
      <KPISummary 
        budgetData={budgetData} 
        expenseData={expenseData} 
        activeTab={activeTab} 
      />

      {/* 파일 업로드 박스 2종 & 퀵 툴바 */}
      <UploadSection 
        budgetDataLength={budgetData.filter(d => !d._totalType).length}
        expenseDataLength={expenseData.length}
        onBudgetFileUpload={handleBudgetUpload}
        onExpenseFileUpload={handleExpenseUpload}
        search={search}
        onSearchChange={handleSearchChange}
        isPending={isPending}
        activeTab={activeTab}
        showManager={showManager}
        setShowManager={setShowManager}
        onExportExcel={handleExportExcel}
        onPrint={() => window.print()}
      />

      {/* 탭 네비게이션 & 데이터 카운터 */}
      <div className="tab-area animate-fade-in">
        <div className="tabs">
          {[
            { id: 'detail', label: '1. 세부사업 현황' },
            { id: 'supplement', label: '2. 추경 시뮬레이터' },
            { id: 'expense', label: '3. 세부지출현황' }
          ].map(t => (
            <div 
              key={t.id} 
              className={`tab ${activeTab === t.id ? 'active' : ''}`} 
              onClick={() => { setActiveTab(t.id); setColumnFilters({}); }}
            >
              {t.label}
            </div>
          ))}
        </div>
        <div className="tab-status-count">
          조회 결과: <strong>{filteredData.filter(d => !d._totalType).length}</strong> 건
        </div>
      </div>

      {/* 추경 탭 전용 빠른 툴바 */}
      {activeTab === 'supplement' && (
        <SupplementToolbar 
          onReduceAllBalance={reduceAllBalance}
          onResetSupplement={resetSupplement}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
        />
      )}

      {/* 메인 테이블 카드 */}
      <div className="content-card animate-fade-in">
        {activeTab === 'expense' ? (
          <ExpenseTable 
            data={filteredData}
            activeCols={activeCols}
            colWidths={expenseColWidths}
            sortConfig={sortConfig}
            onSort={handleSort}
            onStartResize={handleStartResize}
            columnFilters={columnFilters}
            activeFilterCol={activeFilterCol}
            setActiveFilterCol={setActiveFilterCol}
            setColumnFilters={setColumnFilters}
            dateMode={dateMode}
            setDateMode={setDateMode}
            totalExpense={totals.expense}
          />
        ) : (
          <BudgetTable 
            displayData={displayData}
            activeCols={activeCols}
            activeTab={activeTab}
            colWidths={detailColWidths}
            sortConfig={sortConfig}
            onSort={handleSort}
            onStartResize={handleStartResize}
            columnFilters={columnFilters}
            activeFilterCol={activeFilterCol}
            setActiveFilterCol={setActiveFilterCol}
            setColumnFilters={setColumnFilters}
            onUpdateBudget={updateBudgetRow}
            totals={totals}
          />
        )}
      </div>

      {/* 컬럼 관리 모달 */}
      <ColumnManager 
        showManager={showManager}
        onClose={() => setShowManager(false)}
        activeTab={activeTab}
        cols={activeTab === 'expense' ? expenseCols : detailCols}
        hiddenCols={hiddenCols}
        onToggleCol={handleToggleCol}
        onResetCols={handleResetCols}
      />
    </div>
  );
}

export default App;
