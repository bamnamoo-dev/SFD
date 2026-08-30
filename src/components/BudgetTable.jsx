import React, { memo, useRef } from 'react';
import { ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { formatCurrency, formatPercent, sanitizeNumberInput } from '../utils/formatters';

const TableRow = memo(({ row: r, activeCols, activeTab, onUpdateBudget }) => {
  return (
    <tr className={r._totalType ? `total-${r._totalType}` : ''}>
      {activeCols.map(col => {
        const val = r[col.key];
        const numVal = Number(val);
        const isNegative = (col.isNum || col.isRate) && numVal < 0;
        const isEditableSupp = activeTab === 'supplement' && col.key === '추경' && !r._totalType;
        const isEditableNote = activeTab === 'supplement' && col.key === '_note' && !r._totalType;
        
        const isSuppCol = col.key === '추경';
        let specialClass = isSuppCol ? 'supp-cell' : '';
        if (isSuppCol && numVal > 0) specialClass += ' supp-positive';
        else if (isSuppCol && numVal < 0) specialClass += ' supp-negative';

        return (
          <td 
            key={col.key} 
            className={`${col.isNum ? 'num-cell' : col.isRate ? 'percent-cell' : 'center-cell'} ${isNegative && !isSuppCol ? 'negative-val' : ''} ${specialClass}`}
          >
            {isEditableSupp ? (
              <input 
                type="text" 
                className={`edit-input ${specialClass}`}
                value={val || ''}
                placeholder="0"
                onChange={(e) => {
                  const raw = sanitizeNumberInput(e.target.value);
                  onUpdateBudget(r._id, '추경', raw);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const inputs = Array.from(document.querySelectorAll('.edit-input-supp'));
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
            ) : isEditableNote ? (
              <input 
                type="text" 
                className="edit-input-note"
                value={val || ''}
                placeholder="추경 사유 입력..."
                onChange={(e) => {
                  onUpdateBudget(r._id, '_note', e.target.value);
                }}
              />
            ) : (
              col.isNum ? formatCurrency(numVal) : 
              col.isRate ? formatPercent(val) : 
              (col.key === '_exclude' ? (r._exclude || r['정산재원'] || '') : 
              (col.key === '_costItem' ? (r._costItem || r['원가통계비목'] || '') : 
              (col.key === '_note' ? (r._note || '') : r[col.key] || '')))
            )}
          </td>
        );
      })}
    </tr>
  );
});

export const BudgetTable = ({
  displayData,
  activeCols,
  activeTab,
  colWidths,
  sortConfig,
  onSort,
  onStartResize,
  columnFilters,
  activeFilterCol,
  setActiveFilterCol,
  setColumnFilters,
  onUpdateBudget,
  totals
}) => {
  const filterRef = useRef(null);

  const renderFilterMenu = (colKey) => {
    if (activeFilterCol !== colKey) return null;
    
    // 유효 데이터에서 고유값 추출
    const allValues = [...new Set(
      displayData.filter(d => !d._totalType).map(d => {
        const v = d[colKey];
        return (v === undefined || v === null) ? '' : String(v);
      })
    )].sort();

    const selected = columnFilters[colKey] || [];
    
    return (
      <div className="filter-menu" ref={filterRef} onClick={e => e.stopPropagation()}>
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
                style={{ width: `${colWidths[col.wk] || 120}px` }} 
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
                  onMouseDown={e => onStartResize(e, col.wk, false)} 
                />
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
              onUpdateBudget={onUpdateBudget}
            />
          ))}

          {/* 총 합 계 행 */}
          <tr className="grand-total">
            {(() => {
              const firstNumIdx = activeCols.findIndex(c => c.isNum || c.isRate);
              const labelSpan = firstNumIdx > 0 ? firstNumIdx : 1;
              const afterNumCols = activeCols.slice(firstNumIdx);
              return (
                <>
                  <td colSpan={labelSpan} className="center-cell">총 합 계</td>
                  {afterNumCols.map(col => {
                    let val = '';
                    let className = col.isNum ? 'num-cell' : col.isRate ? 'percent-cell' : 'center-cell';
                    if (col.key === '_a') val = formatCurrency(totals.a);
                    else if (col.key === '_b') val = formatCurrency(totals.b);
                    else if (col.key === '_ab') val = formatCurrency(totals.ab);
                    else if (col.key === '_c') val = formatCurrency(totals.c);
                    else if (col.key === '_ac') val = formatCurrency(totals.ac);
                    else if (col.key === '추경') val = formatCurrency(totals.supp);
                    else if (col.key === '_exclude') val = formatCurrency(totals.exclude);
                    else if (col.key === '_rate') val = totals.a > 0 ? ((totals.a - totals.b) / totals.a * 100).toFixed(1) + '%' : '0.0%';
                    else if (col.key === '_note') val = totals.supp !== 0 ? `순증감: ₩ ${formatCurrency(totals.supp)}` : '';
                    
                    const isNeg = (col.key === '_a' && totals.a < 0) || (col.key === '_b' && totals.b < 0) || 
                                  (col.key === '_ab' && totals.ab < 0) || (col.key === '_c' && totals.c < 0) || 
                                  (col.key === '_ac' && totals.ac < 0) || (col.key === '_rate' && totals.a > 0 && (totals.a - totals.b) < 0);
                    
                    return <td key={col.key} className={`${className} ${isNeg ? 'negative-val' : ''}`}>{val}</td>;
                  })}
                </>
              );
            })()}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
