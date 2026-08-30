import React from 'react';
import { Sun, Moon, Download, UploadCloud } from 'lucide-react';

export const Header = ({ isLightMode, setIsLightMode, onExportJSON, onImportJSON }) => {
  return (
    <header className="app-header animate-fade-in">
      <div className="header-left">
        <div className="logo-title-group">
          <h1>2026 학교회계 통합 대시보드</h1>
          <span className="badge-system">v2.5 Pro</span>
        </div>
      </div>

      <div className="header-right">
        <button 
          className="header-btn" 
          onClick={onExportJSON}
          title="작업 중인 전체 데이터를 JSON 파일로 백업합니다."
        >
          <Download size={15} />
          <span>데이터 백업</span>
        </button>

        <label 
          className="header-btn" 
          title="백업해 둔 JSON 파일을 불러와 복원합니다."
          style={{ cursor: 'pointer' }}
        >
          <UploadCloud size={15} />
          <span>데이터 복원</span>
          <input 
            type="file" 
            accept=".json" 
            style={{ display: 'none' }} 
            onChange={onImportJSON}
          />
        </label>

        <button 
          className="theme-toggle-btn" 
          onClick={() => setIsLightMode(!isLightMode)}
          title={isLightMode ? "다크 모드로 전환" : "라이트 모드로 전환"}
        >
          {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
          <span>{isLightMode ? '다크 모드' : '라이트 모드'}</span>
        </button>
      </div>
    </header>
  );
};
