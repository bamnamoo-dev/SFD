import React, { useMemo } from 'react';
import { 
  DollarSign, CheckCircle2, TrendingUp, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, Layers 
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../utils/formatters';

export const KPISummary = ({ budgetData, expenseData, activeTab }) => {
  const stats = useMemo(() => {
    const rawData = budgetData.filter(d => !d._totalType);
    if (!rawData.length) {
      return {
        totalA: 0,
        totalB: 0,
        totalC: 0,
        totalAB: 0,
        totalSupp: 0,
        execRate: 0,
        disbRate: 0,
        riskCount: 0,
        totalCount: 0
      };
    }

    const totalA = rawData.reduce((s, r) => s + (r._a || 0), 0);
    const totalB = rawData.reduce((s, r) => s + (r._b || 0), 0);
    const totalC = rawData.reduce((s, r) => s + (r._c || 0), 0);
    const totalAB = totalA - totalB;
    const totalSupp = rawData.reduce((s, r) => s + (Number(r['추경']) || 0), 0);

    const execRate = totalA > 0 ? (totalB / totalA * 100) : 0;
    const disbRate = totalB > 0 ? (totalC / totalB * 100) : 0;

    // 세부사업별 집행률 분석하여 불용 위험(집행률 70% 미만) 사업 카운트
    const projectMap = {};
    rawData.forEach(r => {
      const proj = r['세부사업'] || '기타';
      if (!projectMap[proj]) projectMap[proj] = { a: 0, b: 0 };
      projectMap[proj].a += (r._a || 0);
      projectMap[proj].b += (r._b || 0);
    });

    const projectNames = Object.keys(projectMap);
    const riskCount = projectNames.filter(p => {
      const item = projectMap[p];
      if (item.a <= 0) return false;
      const rate = (item.b / item.a) * 100;
      return rate < 70;
    }).length;

    return {
      totalA,
      totalB,
      totalC,
      totalAB,
      totalSupp,
      execRate,
      disbRate,
      riskCount,
      totalCount: projectNames.length
    };
  }, [budgetData]);

  if (!budgetData.length && !expenseData.length) return null;

  return (
    <div className="kpi-grid animate-fade-in">
      {/* 카드 1: 총 예산현액 */}
      <div className="kpi-card">
        <div className="kpi-icon-wrap primary">
          <DollarSign size={20} />
        </div>
        <div className="kpi-info">
          <span className="kpi-label">총 예산현액 (A)</span>
          <div className="kpi-value">
            ₩ {formatCurrency(stats.totalA)}
          </div>
          <div className="kpi-sub">
            {stats.totalSupp !== 0 ? (
              <span className={`kpi-badge ${stats.totalSupp > 0 ? 'positive' : 'negative'}`}>
                {stats.totalSupp > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                추경 반영 후 ₩ {formatCurrency(stats.totalA + stats.totalSupp)}
              </span>
            ) : (
              <span className="kpi-badge neutral">
                <Layers size={12} /> 총 {stats.totalCount}개 세부사업
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 카드 2: 원인행위액 & 집행률 */}
      <div className="kpi-card">
        <div className="kpi-icon-wrap success">
          <TrendingUp size={20} />
        </div>
        <div className="kpi-info">
          <div className="kpi-label-row">
            <span className="kpi-label">원인행위액 (B)</span>
            <span className="kpi-rate-badge">{stats.execRate.toFixed(1)}% 집행</span>
          </div>
          <div className="kpi-value">
            ₩ {formatCurrency(stats.totalB)}
          </div>
          <div className="kpi-progress-bar">
            <div 
              className="kpi-progress-fill" 
              style={{ width: `${Math.min(100, Math.max(0, stats.execRate))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 카드 3: 실지출액 */}
      <div className="kpi-card">
        <div className="kpi-icon-wrap info">
          <CheckCircle2 size={20} />
        </div>
        <div className="kpi-info">
          <div className="kpi-label-row">
            <span className="kpi-label">실제 지출액 (C)</span>
            <span className="kpi-rate-badge neutral">원인대비 {stats.disbRate.toFixed(1)}%</span>
          </div>
          <div className="kpi-value">
            ₩ {formatCurrency(stats.totalC)}
          </div>
          <div className="kpi-sub text-muted">
            출납완료율: {stats.totalA > 0 ? ((stats.totalC / stats.totalA) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* 카드 4: 집행잔액 & 불용 위험 */}
      <div className="kpi-card">
        <div className={`kpi-icon-wrap ${stats.riskCount > 0 ? 'warning' : 'neutral'}`}>
          <AlertTriangle size={20} />
        </div>
        <div className="kpi-info">
          <span className="kpi-label">원인행위잔액 (A-B)</span>
          <div className={`kpi-value ${stats.totalAB < 0 ? 'danger-val' : ''}`}>
            ₩ {formatCurrency(stats.totalAB)}
          </div>
          <div className="kpi-sub">
            {stats.riskCount > 0 ? (
              <span className="kpi-badge warning">
                <AlertTriangle size={12} /> 불용주의(집행률 70% 미만) {stats.riskCount}개
              </span>
            ) : (
              <span className="kpi-badge success">
                <CheckCircle2 size={12} /> 전 사업 원활한 집행 중
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
