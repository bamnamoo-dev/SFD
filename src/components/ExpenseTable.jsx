import React, { memo, useRef } from 'react';
import { ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const ExpenseRow = memo(({ row: r, activeCols }) => {
  return (
    <tr>
      {activeCols.map(col => {
        const val = r[col.key];
        const isAmt = col.key === '_amt';
        return (
          <td 
            key={col.key} 
            className={isAmt ? 'num-cell' : (col.key === '_date' || col.key === '원가비목') ? 'center-cell' : 'text-cell'}
          >
            {isAmt ? formatCurrency(val) : (val || '')}
          </td>
        );
      })}
    </tr>
  );
});

export const ExpenseTable = ({
  data,
  activeCols,
  colWidths,
  sortConfig,
  onSort,
  onStartResize,
  columnFilters,
  activeFilterCol,
  setActiveFilterCol,
  setColumnFilters,
  dateMode,
  setDateMode,
  totalExpense
}) => {
  const filterRef = useRef(null);

  const renderFilterMenu = (colKey) => {
    if (activeFilterCol !== colKey) return null;
    
    let allValues = [...new Set(
      data.map(d => {
        let v = (d[colKey] === undefined || d[colKey] === null) ? '' : String(d[colKey]);
        if (colKey === '_date' && dateMode === 'month') {
          v = v.substring(0, 7);
        }
        return v;
      })
    )].sort();

    const selected = columnFilters[colKey] || [];

    return (
      <div className="filter-menu" ref={filterRef} onClick={e => e.stopPropagation()}>
        {colKey === '_date' && (
          <div className="date-mode-toggle">
            <button 
              className={dateMode === 'month' ? 'active' : ''} 
              onClick={() => { setDateMode('month'); setColumnFilters(p => ({ ...p, [colKey]: [] })); }}
            >
              월별
            </button>
            <button 
              className={dateMode === 'day' ? 'active' : ''} 
              onClick={() => { setDateMode('day'); setColumnFilters(p => ({ ...p, [colKey]: [] })); }}
            >
              일별
            </button>
          </div>
        )}
        <div 
          className="filter-item header-item" 
          onClick={() => setColumnFilters(prev => ({ 
            ...prev, 
            [colKey]: selected.length === allValues.length ? [] : allValues 
          }))}
        >
          <input type="checkbox" checked={selected.length === allValues.length} readOnly />
          <strong>(전체 선택)</strong>
        </div>
        <hr className="filter-divider" />
        <div className="filter-scroll-list">
          {allValues.map(v => (
            <div 
              key={v} 
              className="filter-item" 
              onClick={() => setColumnFilters(prev => ({
                ...prev,
                [colKey]: prev[colKey]?.includes(v)
                  ? prev[colKey].filter(x => x !== v)
                  : [...(prev[colKey] || []), v]
              }))}
            >
              <input type="checkbox" checked={selected.includes(v)} readOnly />
              <span>{v === '' ? '(공백)' : v}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="table-wrapper">
      <table>
        <thead className="excel-header">
          <tr>
            {activeCols.map(col => (
              <th 
                key={col.key} 
                style={{ width: `${colWidths[col.wk] || 150}px` }} 
                onClick={() => onSort(col.key)}
              >
                <div className="header-content">
                  <span 
                    className={`filter-btn ${columnFilters[col.key]?.length > 0 ? 'active' : ''}`} 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setActiveFilterCol(activeFilterCol === col.key ? null : col.key); 
                    }}
                    title="필터"
                  >
                    <Filter size={12} />
                  </span>
                  <span className="header-label">{col.label}</span>
                  <span className="sort-icon">
                    {sortConfig.key === col.key ? (
                      sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    ) : (
                      <ChevronDown size={12} style={{ opacity: 0.25 }} />
                    )}
                  </span>
                </div>
                <div 
                  className="resizer" 
                  onMouseDown={e => onStartResize(e, col.wk, true)} 
                />
                {renderFilterMenu(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <ExpenseRow 
              key={r._id || i} 
              row={r} 
              activeCols={activeCols} 
            />
          ))}

          {/* 총 합 계 행 */}
          <tr className="grand-total">
            {(() => {
              const amtIdx = activeCols.findIndex(c => c.wk === 'amount');
              const labelSpan = amtIdx > 0 ? amtIdx : 1;
              const afterAmtCols = activeCols.slice(amtIdx);
              return (
                <>
                  <td colSpan={labelSpan} className="center-cell">총 합 계</td>
                  {afterAmtCols.map(col => (
                    <td key={col.key} className={col.key === '_amt' ? 'num-cell' : 'center-cell'}>
                      {col.key === '_amt' ? formatCurrency(totalExpense) : ''}
                    </td>
                  ))}
                </>
              );
            })()}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
