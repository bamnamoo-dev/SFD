import React, { useState } from 'react';
import { 
  FileSpreadsheet, CreditCard, Search, Settings, 
  Save, Printer, RotateCcw, AlertCircle 
} from 'lucide-react';

export const UploadSection = ({
  budgetDataLength,
  expenseDataLength,
  onBudgetFileUpload,
  onExpenseFileUpload,
  search,
  onSearchChange,
  isPending,
  activeTab,
  showManager,
  setShowManager,
  onExportExcel,
  onPrint
}) => {
  const [dragOverBox, setDragOverBox] = useState(null);

  return (
    <div className="upload-section animate-fade-in">
      {/* 사업관리카드(현액) 업로드 박스 */}
      <div 
        className={`upload-box ${budgetDataLength ? 'done' : ''} ${dragOverBox === 'budget' ? 'drag-active' : ''}`}
        onClick={() => document.getElementById('budget-file-input').click()}
        onDragOver={(e) => { e.preventDefault(); setDragOverBox('budget'); }}
        onDragLeave={() => setDragOverBox(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverBox(null);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onBudgetFileUpload(e.dataTransfer.files[0]);
          }
        }}
      >
        <div className="upload-guide">
          <FileSpreadsheet size={26} className="box-icon" />
          <strong>📂 사업관리카드(현액)</strong>
          <span className="box-sub-guide">
            K-에듀파인: 학교회계 &gt; 사업관리 &gt; 사업관리카드(현액) (정책,단위 체크 후 엑셀저장)
          </span>
        </div>
        <div className="box-status">
          {budgetDataLength > 0 ? (
            <span className="status-badge done">✅ {budgetDataLength}개 항목 로드 완료</span>
          ) : (
            <span className="status-badge ready">클릭 또는 엑셀 드래그</span>
          )}
        </div>
        <input 
          type="file" 
          id="budget-file-input" 
          hidden 
          accept=".xlsx, .xls" 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onBudgetFileUpload(e.target.files[0]);
            }
          }}
        />
      </div>

      {/* 현금출납부 업로드 박스 */}
      <div 
        className={`upload-box ${expenseDataLength ? 'done' : ''} ${dragOverBox === 'expense' ? 'drag-active' : ''}`}
        onClick={() => document.getElementById('expense-file-input').click()}
        onDragOver={(e) => { e.preventDefault(); setDragOverBox('expense'); }}
        onDragLeave={() => setDragOverBox(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverBox(null);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onExpenseFileUpload(e.dataTransfer.files[0]);
          }
        }}
      >
        <div className="upload-guide">
          <CreditCard size={26} className="box-icon" />
          <strong>📂 현금출납부</strong>
          <span className="box-sub-guide">
            K-에듀파인: 학교회계 &gt; 지출관리 &gt; 지출장부 &gt; 현금출납부 (전체선택 후 엑셀저장)
          </span>
        </div>
        <div className="box-status">
          {expenseDataLength > 0 ? (
            <span className="status-badge done">✅ {expenseDataLength}개 지출건 로드 완료</span>
          ) : (
            <span className="status-badge ready">클릭 또는 엑셀 드래그</span>
          )}
        </div>
        <input 
          type="file" 
          id="expense-file-input" 
          hidden 
          accept=".xlsx, .xls" 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onExpenseFileUpload(e.target.files[0]);
            }
          }}
        />
      </div>

      {/* 상단 퀵 툴바 */}
      <div className="header-tools">
        <div className="tool-row">
          <div className="search-box-wrap">
            <Search size={15} className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="사업명, 항목, 비목, 채주 검색..." 
              value={search} 
              onChange={onSearchChange}
              style={{ opacity: isPending ? 0.7 : 1 }}
            />
          </div>
        </div>

        <div className="tool-row buttons">
          <button 
            className="tool-btn manager-toggle" 
            onClick={() => setShowManager(!showManager)}
            title="테이블 컬럼 표시/숨김 설정"
          >
            <Settings size={15} />
            <span>컬럼 설정</span>
          </button>

          <button 
            className={`tool-btn export-btn ${activeTab === 'supplement' ? 'active' : ''}`}
            onClick={onExportExcel}
            title={activeTab === 'supplement' ? "추경 작업 엑셀 다운로드" : "현재 화면 엑셀 다운로드"}
          >
            <Save size={15} />
            <span>엑셀 저장</span>
          </button>

          <button 
            className="tool-btn print-btn" 
            onClick={onPrint}
            title="A4 가로 규격 인쇄"
          >
            <Printer size={15} />
            <span>인쇄</span>
          </button>
        </div>
      </div>
    </div>
  );
};
