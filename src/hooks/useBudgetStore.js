import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'k_edu_budget_dashboard_data';

export const useBudgetStore = () => {
  const [budgetData, setBudgetData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isLoadedRef = useRef(false);

  // 1. 데스크톱 런처 Heartbeat 송신 (3초 간격)
  useEffect(() => {
    const sendHeartbeat = () => {
      fetch('/api/heartbeat').catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 3000);
    return () => clearInterval(interval);
  }, []);

  // 2. 초기 데이터 로드 (/api/load -> localStorage fallback)
  useEffect(() => {
    fetch('/api/load')
      .then(res => res.json())
      .then(data => {
        if (data.budgetData && data.budgetData.length > 0) {
          setBudgetData(data.budgetData);
        } else {
          // 로컬 스토리지 확인
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed.budgetData) setBudgetData(parsed.budgetData);
              if (parsed.expenseData) setExpenseData(parsed.expenseData);
            } catch (e) {}
          }
        }
        if (data.expenseData && data.expenseData.length > 0) {
          setExpenseData(data.expenseData);
        }
        isLoadedRef.current = true;
      })
      .catch(() => {
        // 순수 웹 브라우저 환경인 경우 로컬스토리지 활용
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.budgetData) setBudgetData(parsed.budgetData);
            if (parsed.expenseData) setExpenseData(parsed.expenseData);
          } catch (e) {}
        }
        isLoadedRef.current = true;
      });
  }, []);

  // 3. 데이터 변경 시 자동 저장 (디바운스 500ms)
  useEffect(() => {
    if (!isLoadedRef.current) return;

    const saveData = async () => {
      const payload = { budgetData, expenseData };
      // LocalStorage 백업
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {}

      // API 백엔드 백업
      try {
        await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {}
    };

    const timeoutId = setTimeout(saveData, 500);
    return () => clearTimeout(timeoutId);
  }, [budgetData, expenseData]);

  // 4. 히스토리 기록 (Undo/Redo 지원)
  const pushHistory = useCallback((newData) => {
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      return [...next, JSON.parse(JSON.stringify(newData))];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // 단일 항목 예산(추경/사유) 업데이트
  const updateBudgetRow = useCallback((id, field, value) => {
    setBudgetData(prev => {
      const next = prev.map(row => row._id === id ? { ...row, [field]: value } : row);
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  // 원인행위잔액(A-B) 전액 감액 일괄 적용
  const reduceAllBalance = useCallback(() => {
    if (!budgetData.length) return;
    if (!window.confirm('남아있는 모든 원인행위잔액(A-B)을 추경 감액(-)으로 일괄 적용하시겠습니까?')) return;

    setBudgetData(prev => {
      const next = prev.map(row => {
        if (row._totalType) return row;
        const balance = (row._a || 0) - (row._b || 0);
        if (balance > 0) {
          return { ...row, 추경: String(-balance), _note: '불용 방지 잔액 전액 감액' };
        }
        return row;
      });
      pushHistory(next);
      return next;
    });
  }, [budgetData, pushHistory]);

  // 추경액 전체 초기화
  const resetSupplement = useCallback(() => {
    if (!window.confirm('입력된 모든 추경 금액과 사유를 초기화하시겠습니까?')) return;
    setBudgetData(prev => {
      const next = prev.map(row => ({ ...row, 추경: '', _note: '' }));
      pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  // Undo (실행 취소)
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const targetState = history[historyIndex - 1];
      setBudgetData(JSON.parse(JSON.stringify(targetState)));
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  // Redo (다시 실행)
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetState = history[historyIndex + 1];
      setBudgetData(JSON.parse(JSON.stringify(targetState)));
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // JSON 파일로 전체 데이터 내보내기
  const exportJSON = useCallback(() => {
    const data = {
      budgetData,
      expenseData,
      exportDate: new Date().toISOString(),
      version: '2.5'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `학교회계_대시보드_데이터백업_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [budgetData, expenseData]);

  // JSON 파일 불러와서 데이터 복원
  const importJSON = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.budgetData) setBudgetData(json.budgetData);
        if (json.expenseData) setExpenseData(json.expenseData);
        alert('데이터가 성공적으로 복원되었습니다.');
      } catch (err) {
        alert('올바르지 않은 백업 파일 형식입니다.');
      }
    };
    reader.readAsText(file);
  }, []);

  return {
    budgetData,
    setBudgetData,
    expenseData,
    setExpenseData,
    updateBudgetRow,
    reduceAllBalance,
    resetSupplement,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    undo,
    redo,
    exportJSON,
    importJSON
  };
};
