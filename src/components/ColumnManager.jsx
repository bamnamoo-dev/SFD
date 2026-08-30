import React from 'react';
import { X, CheckSquare, Square } from 'lucide-react';

export const ColumnManager = ({
  showManager,
  onClose,
  activeTab,
  cols,
  hiddenCols,
  onToggleCol,
  onResetCols
}) => {
  if (!showManager) return null;

  const currentTabHidden = hiddenCols[activeTab] || {};

  return (
    <div className="col-manager-backdrop" onClick={onClose}>
      <div className="col-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚙️ 컬럼 표시/숨김 설정 ({activeTab === 'expense' ? '세부지출' : activeTab === 'supplement' ? '추경' : '세부사업'})</h3>
          <button className="close-btn" onClick={onClose}><X size={16} /></button>
        </div>
        
        <div className="modal-body">
          <p className="modal-desc">체크된 컬럼만 화면 테이블에 표시됩니다.</p>
          <div className="col-grid">
            {cols.map(col => {
              const isChecked = !currentTabHidden[col.wk];
              return (
                <label key={col.wk} className={`col-checkbox-label ${isChecked ? 'checked' : ''}`}>
                  <input 
                    type="checkbox" 
                    checked={isChecked} 
                    onChange={() => onToggleCol(activeTab, col.wk)} 
                  />
                  <span>{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={() => onResetCols(activeTab)}>
            기본값 복원
          </button>
          <button className="btn-primary" onClick={onClose}>
            완료
          </button>
        </div>
      </div>
    </div>
  );
};
