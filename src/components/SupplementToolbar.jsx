import React from 'react';
import { MinusCircle, RotateCcw, Undo, Redo, HelpCircle } from 'lucide-react';

export const SupplementToolbar = ({
  onReduceAllBalance,
  onResetSupplement,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}) => {
  return (
    <div className="supplement-toolbar animate-fade-in">
      <div className="toolbar-left">
        <span className="toolbar-title">⚡ 추경 시뮬레이션 빠른 도구</span>
        <button 
          className="supp-tool-btn" 
          onClick={onReduceAllBalance}
          title="불용을 방지하기 위해 남아있는 원인행위잔액(A-B)만큼 마이너스(-) 감액을 일괄 적용합니다."
        >
          <MinusCircle size={14} className="icon-neg" />
          <span>원인행위잔액 전액 감액</span>
        </button>
        <button 
          className="supp-tool-btn" 
          onClick={onResetSupplement}
          title="입력된 모든 추경액과 사유를 초기화합니다."
        >
          <RotateCcw size={14} />
          <span>추경 초기화</span>
        </button>
      </div>

      <div className="toolbar-right">
        <button 
          className="supp-history-btn" 
          onClick={onUndo} 
          disabled={!canUndo}
          title="실행 취소 (Ctrl+Z)"
        >
          <Undo size={14} />
          <span>되돌리기</span>
        </button>
        <button 
          className="supp-history-btn" 
          onClick={onRedo} 
          disabled={!canRedo}
          title="다시 실행 (Ctrl+Y)"
        >
          <Redo size={14} />
          <span>다시실행</span>
        </button>
      </div>
    </div>
  );
};
