import pandas as pd
import json
import os

# Helper to handle Timestamp and Date objects
def date_handler(obj):
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    return str(obj)

# 1. Read Budget Card (Detailed 14 Columns - Final Fixed)
budget_df = pd.read_excel('(0513)사업관리카드(현액).xlsx', header=2)
budget_df.columns = [str(c).replace('\n', '').strip() for c in budget_df.columns]

# Fill missing data for demo
if '정책사업' in budget_df.columns: budget_df['정책사업'] = budget_df['정책사업'].ffill()
if '단위사업' in budget_df.columns: budget_df['단위사업'] = budget_df['단위사업'].ffill()
if '세부사업' in budget_df.columns: budget_df['세부사업'] = budget_df['세부사업'].ffill()

# Normalize Cost Item Column for demo
if '원가비목' in budget_df.columns:
    budget_df['_costItem'] = budget_df['원가비목']
elif '원가통계비목' in budget_df.columns:
    budget_df['_costItem'] = budget_df['원가통계비목']
else:
    budget_df['_costItem'] = ''

budget_data = budget_df.to_dict(orient='records')

# 2. Read Expenditure Data from .xlsm
expense_df = pd.read_excel('학교회계 집행현황(초).xlsm', sheet_name='세부지출현황')
expense_df.columns = [str(c).replace('\n', '').strip() for c in expense_df.columns]

# Strong Filter logic: Remove if ANY cell contains keywords
def is_valid_row(row):
    row_str = " ".join([str(v) for v in row.values if v is not None])
    for k in ['기간계', '누계', '월계']:
        if k in row_str:
            return False
    amt = float(row.get('지출액', 0))
    if amt == 0: return False
    return True

expense_df = expense_df[expense_df.apply(is_valid_row, axis=1)]
expense_data = expense_df.to_dict(orient='records')

# HTML Template
html_content = f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>학교회계 통합 대시보드 (데모)</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --primary: #6366f1;
            --bg: #0f172a;
            --surface: #1e293b;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --border: #334155;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --tab-active: #4f46e5;
            --excel-header-bg: #000000;
            --excel-header-text: #ffffff;
        }}
        body {{ font-family: 'Outfit', sans-serif; background-color: var(--bg); color: var(--text); margin: 0; padding: 0; overflow-x: hidden; }}
        .container {{ width: 100%; max-width: 100%; margin: 0; padding: 0.8rem; box-sizing: border-box; }}
        header {{ margin-bottom: 0.8rem; display: flex; justify-content: space-between; align-items: center; }}
        h1 {{ background: linear-gradient(to right, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; font-size: 1.4rem; }}
        
        .upload-section {{ display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin-bottom: 0.8rem; }}
        
        .upload-box {{ 
            background: var(--surface); border: 2px dashed var(--border); border-radius: 0.75rem; 
            padding: 0.8rem 1.2rem; text-align: center; cursor: pointer; transition: 0.3s; position: relative; 
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            min-height: 100px; gap: 6px;
        }}
        .upload-box:hover {{ border-color: var(--primary); background: rgba(99, 102, 241, 0.05); transform: translateY(-2px); }}
        .upload-box.dragging {{ border-color: var(--primary); background: rgba(99, 102, 241, 0.15); border-style: solid; box-shadow: 0 0 25px rgba(99, 102, 241, 0.2); }}
        
        .upload-box h3 {{ margin: 0; font-size: 0.95rem; color: #fff; font-weight: 700; pointer-events: none; }}
        .upload-box .box-sub {{ margin: 0; font-size: 0.75rem; color: var(--text-muted); pointer-events: none; }}

        .upload-guide {{ 
            font-size: 0.85rem; color: #e2e8f0; line-height: 1.4; 
            background: rgba(0,0,0,0.15); padding: 0.6rem 1rem; border-radius: 0.5rem;
            width: 95%; text-align: center; pointer-events: none;
            border: 1px solid rgba(255,255,255,0.03);
        }}
        .upload-guide strong {{ color: var(--warning); font-weight: 700; font-size: 0.9rem; }}
        .path-arrow {{ color: var(--primary); margin: 0 2px; font-weight: bold; font-size: 0.8rem; }}

        .tab-area {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }}
        .tabs {{ display: flex; gap: 0.4rem; background: rgba(0,0,0,0.2); padding: 0.25rem; border-radius: 0.5rem; width: fit-content; }}
        .tab {{ padding: 0.4rem 0.8rem; border-radius: 0.3rem; cursor: pointer; font-weight: 600; font-size: 0.8rem; transition: 0.2s; color: var(--text-muted); }}
        .tab.active {{ background: var(--tab-active); color: white; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2); }}
        
        .toggle-btn {{ 
            background: var(--surface); color: var(--text-muted); border: 1px solid var(--border); 
            padding: 0.4rem 0.8rem; border-radius: 0.4rem; font-size: 0.75rem; font-weight: 600; 
            cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 6px;
        }}
        .toggle-btn:hover {{ border-color: var(--primary); color: white; }}
        .toggle-btn.active {{ background: var(--primary); border-color: var(--primary); color: white; }}

        .content-card {{ background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(10px); border: 1px solid var(--border); border-radius: 0.75rem; overflow: hidden; width: 100%; }}
        .table-wrapper {{ overflow: auto; max-height: 72vh; position: relative; width: 100%; }}
        table {{ width: 100%; border-collapse: collapse; font-size: 0.72rem; table-layout: fixed; min-width: 100%; }}
        
        .excel-header th {{ 
            background: var(--excel-header-bg) !important; color: var(--excel-header-text) !important; 
            padding: 0.6rem 0.3rem; text-align: center; border: 1px solid #333; 
            position: sticky !important; top: 0 !important; z-index: 100; font-weight: 600; cursor: pointer; user-select: none;
        }}
        .header-content {{ display: flex; align-items: center; justify-content: center; gap: 4px; }}
        .filter-btn {{ 
            color: #888; font-size: 12px; cursor: pointer; padding: 1px 3px; border-radius: 3px; 
            background: rgba(255,255,255,0.05); border: 1px solid transparent; transition: 0.2s;
            line-height: 1; display: inline-flex; align-items: center;
        }}
        .filter-btn:hover {{ background: #333; color: white; border-color: #555; }}
        .filter-btn.active {{ color: var(--success); border-color: var(--success); background: rgba(16, 185, 129, 0.1); }}

        .filter-menu {{ 
            position: absolute; background: #1e293b; border: 1px solid #475569; border-radius: 8px; 
            z-index: 1000; min-width: 180px; max-height: 300px; overflow-y: auto; padding: 8px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.7);
            text-align: left; font-weight: 400; color: #e2e8f0; top: 100%; left: 0;
        }}
        .filter-item {{ display: flex; align-items: center; gap: 8px; padding: 6px 4px; font-size: 0.7rem; cursor: pointer; border-radius: 4px; transition: 0.15s; }}
        .filter-item:hover {{ background: #334155; }}

        td {{ padding: 0.5rem 0.6rem; border: 1px solid rgba(255,255,255,0.05); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
        tr:hover td {{ background: rgba(255,255,255,0.04); }}
        
        .total-detail {{ background-color: rgba(99, 102, 241, 0.12) !important; font-weight: 700; color: #a5b4fc; }}
        .total-unit {{ background-color: rgba(16, 185, 129, 0.12) !important; font-weight: 700; color: #6ee7b7; }}
        .total-policy {{ background-color: rgba(129, 140, 248, 0.18) !important; font-weight: 700; color: #c4b5fd; }}

        .grand-total {{ 
            background: #1e293b !important; font-weight: 700; color: var(--success); 
            border-top: 2px solid var(--success); position: sticky; bottom: 0; z-index: 50;
            box-shadow: 0 -4px 10px rgba(0,0,0,0.3);
        }}
        .num-cell {{ text-align: right; font-family: 'Consolas', monospace; }}
        .center-cell {{ text-align: center; }}
        .percent-cell {{ text-align: center; font-weight: 600; color: var(--danger); }}
        
        .controls {{ display: flex; gap: 0.8rem; align-items: center; }}
        input[type="text"] {{ background: var(--surface); border: 1px solid var(--border); color: white; padding: 0.4rem 0.8rem; border-radius: 0.4rem; width: 220px; outline: none; font-size: 0.75rem; }}
        .resizer {{ position: absolute; right: 0; top: 0; height: 100%; width: 5px; cursor: col-resize; z-index: 110; }}
        .sort-icon {{ font-size: 9px; color: var(--primary); opacity: 0.7; }}
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const {{ useState, useMemo, useRef, useEffect }} = React;

        const BUDGET_RAW = {json.dumps(budget_data, default=date_handler, ensure_ascii=False)};
        const EXPENSE_RAW = {json.dumps(expense_data, default=date_handler, ensure_ascii=False)};

        function App() {{
            const [activeTab, setActiveTab] = useState('detail');
            const [search, setSearch] = useState('');
            const [sortConfig, setSortConfig] = useState({{ key: '', direction: 'asc' }});
            const [activeFilterCol, setActiveFilterCol] = useState(null);
            const [columnFilters, setColumnFilters] = useState({{}});
            const [draggingType, setDraggingType] = useState(null);
            const [showManager, setShowManager] = useState(false);
            const filterRef = useRef(null);

            const [detailColWidths, setDetailColWidths] = useState({{ 
                policy: 100, unit: 120, project: 150, item: 120, desc: 220, cost: 120, 
                a: 100, b: 100, ab: 110, c: 100, ac: 110, rate: 70, exclude: 80, manager: 120 
            }});
            const [expenseColWidths, setExpenseColWidths] = useState({{ 
                proj: 150, item: 150, category: 120, date: 100, title: 350, payee: 120, amount: 100 
            }});

            useEffect(() => {{
                const handleClickOutside = (event) => {{
                    if (filterRef.current && !filterRef.current.contains(event.target)) setActiveFilterCol(null);
                }};
                document.addEventListener('mousedown', handleClickOutside);
                return () => document.removeEventListener('mousedown', handleClickOutside);
            }}, []);

            const budgetData = useMemo(() => {{
                return BUDGET_RAW.filter(r => {{
                    const rowStr = Object.values(r).join(' ');
                    if (rowStr.includes('전기계') || rowStr.includes('누계')) return false;
                    return (r['정책사업'] || r['단위사업'] || r['세부사업']);
                }}).map(r => {{
                    const a = Number(r['예산현액 (A)'] || r['예산현액(A)'] || r['예산현액'] || 0);
                    const b = Number(r['원인행위액 (B)'] || r['원인행위액(B)'] || r['원인행위액'] || 0);
                    const c = Number(r['지출액 (C)'] || r['지출액(C)'] || r['지출액'] || 0);
                    
                    const costItem = r['_costItem'] || r['원가통계비목'] || r['원가비목'] || r['원가통계'] || '';

                    let totalType = '';
                    if (String(r['정책사업'] || '').includes('합계')) totalType = 'policy';
                    else if (String(r['단위사업'] || '').includes('합계')) totalType = 'unit';
                    else if (String(r['세부사업'] || '').includes('합계')) totalType = 'detail';

                    return {{
                        ...r,
                        _a: a, _b: b, _ab: a - b, _c: c, _ac: a - c,
                        _rate: a > 0 ? ((a - c) / a * 100).toFixed(1) : '0.0',
                        _exclude: r['정산재원'] || r['결산제외'] || '',
                        _costItem: costItem,
                        _totalType: totalType
                    }};
                }});
            }}, []);

            const expenseData = useMemo(() => {{
                return EXPENSE_RAW.map(r => ({{
                    ...r,
                    _amt: Number(r['지출액'] || r['지급액'] || r['금액'] || 0),
                    _date: r['지출일자'] ? r['지출일자'].split('T')[0] : ''
                }}));
            }}, []);

            const filteredData = useMemo(() => {{
                const source = activeTab === 'expense' ? expenseData : budgetData;
                let items = source.filter(d => {{
                    const searchMatch = Object.values(d).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
                    if (!searchMatch) return false;
                    for (let colKey in columnFilters) {{
                        const allowed = columnFilters[colKey];
                        if (allowed && allowed.length > 0) {{
                            const val = String(d[colKey] || '');
                            if (!allowed.includes(val)) return false;
                        }}
                    }}
                    return true;
                }});
                if (sortConfig.key) {{
                    items.sort((a, b) => {{
                        let aVal = a[sortConfig.key];
                        let bVal = b[sortConfig.key];
                        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                        return 0;
                    }});
                }}
                return items;
            }}, [activeTab, budgetData, expenseData, search, sortConfig, columnFilters]);

            const totals = useMemo(() => {{
                if (activeTab === 'expense') return {{ expense: filteredData.reduce((acc, cur) => acc + cur._amt, 0) }};
                const baseData = filteredData.filter(d => !d._totalType);
                return {{
                    a: baseData.reduce((acc, cur) => acc + cur._a, 0),
                    b: baseData.reduce((acc, cur) => acc + cur._b, 0),
                    ab: baseData.reduce((acc, cur) => acc + cur._ab, 0),
                    c: baseData.reduce((acc, cur) => acc + cur._c, 0),
                    ac: baseData.reduce((acc, cur) => acc + cur._ac, 0)
                }};
            }}, [filteredData, activeTab]);

            const toggleFilterValue = (colKey, value) => {{
                setColumnFilters(prev => {{
                    const current = prev[colKey] || [];
                    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
                    return {{ ...prev, [colKey]: next }};
                }});
            }};

            const toggleSelectAll = (colKey, data) => {{
                setColumnFilters(prev => {{
                    const all = [...new Set(data.map(d => String(d[colKey] || '')))].sort();
                    const current = prev[colKey] || [];
                    return {{ ...prev, [colKey]: current.length === all.length ? [] : all }};
                }});
            }};

            const renderFilterMenu = (colKey, data) => {{
                if (activeFilterCol !== colKey) return null;
                const allValues = [...new Set(data.map(d => String(d[colKey] || '')))].sort();
                const selected = columnFilters[colKey] || [];
                return (
                    <div className="filter-menu" ref={{filterRef}} onClick={{e => e.stopPropagation()}}>
                        <div className="filter-item" onClick={{() => toggleSelectAll(colKey, data)}}>
                            <input type="checkbox" checked={{selected.length === allValues.length}} readOnly />
                            <strong>(전체 선택)</strong>
                        </div>
                        <hr style={{{{borderColor: '#475569', margin: '8px 0'}}}} />
                        {{allValues.map(v => (
                            <div key={{v}} className="filter-item" onClick={{() => toggleFilterValue(colKey, v)}}>
                                <input type="checkbox" checked={{selected.includes(v)}} readOnly />
                                <span>{{v || '(공백)'}}</span>
                            </div>
                        ))}}
                    </div>
                );
            }};

            const startResize = (e, colKey, isExpense) => {{
                e.stopPropagation();
                const startX = e.pageX;
                const startWidth = isExpense ? expenseColWidths[colKey] : detailColWidths[colKey];
                const onMouseMove = (moveE) => {{
                    const newWidth = Math.max(40, startWidth + (moveE.pageX - startX));
                    if (isExpense) setExpenseColWidths(prev => ({{ ...prev, [colKey]: newWidth }}));
                    else setDetailColWidths(prev => ({{ ...prev, [colKey]: newWidth }}));
                }};
                const onMouseUp = () => {{
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }};
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            }};

            const Arrow = () => <span className="path-arrow"> &gt; </span>;

            const detailCols = [
                {{label:'정책사업', key:'정책사업', wk:'policy'}}, {{label:'단위사업', key:'단위사업', wk:'unit'}},
                {{label:'세부사업', key:'세부사업', wk:'project'}}, {{label:'세부항목', key:'세부항목', wk:'item'}},
                {{label:'산출내역', key:'산출내역', wk:'desc'}}, {{label:'원가통계비목', key:'_costItem', wk:'cost'}},
                {{label:'예산현액 (A)', key:'_a', wk:'a', isNum:true}}, {{label:'원인행위액 (B)', key:'_b', wk:'b', isNum:true}},
                {{label:'원인행위잔액 (A-B)', key:'_ab', wk:'ab', isNum:true}}, {{label:'지출액 (C)', key:'_c', wk:'c', isNum:true}},
                {{label:'지출잔액 (A-C)', key:'_ac', wk:'ac', isNum:true}}, {{label:'불용율', key:'_rate', wk:'rate', isRate:true}},
                {{label:'정산재원', key:'_exclude', wk:'exclude'}}, {{label:'세부항목담당자', key:'세부항목담당자', wk:'manager', isHideable:true}}
            ];

            const expenseCols = [
                {{label:'세부사업명', key:'세부사업명', wk:'proj'}}, {{label:'세부항목명', key:'세부항목명', wk:'item'}},
                {{label:'원가비목', key:'원가비목', wk:'category'}}, {{label:'지출일자', key:'_date', wk:'date'}},
                {{label:'제목', key:'제목', wk:'title'}}, {{label:'채주', key:'채주', wk:'payee'}},
                {{label:'지출액', key:'_amt', wk:'amount', isNum:true}}
            ];

            const activeCols = (activeTab === 'expense' ? expenseCols : detailCols).filter(col => !col.isHideable || showManager);

            return (
                <div className="container">
                    <header>
                        <div>
                            <h1>학교회계 통합 대시보드</h1>
                            <p style={{{{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.75rem' }}}}>모든 데이터 매칭 완료 (데모)</p>
                        </div>
                        <div className="controls">
                            <input type="text" placeholder="검색..." value={{search}} onChange={{e => setSearch(e.target.value)}} />
                        </div>
                    </header>

                    <div className="upload-section">
                        <div className={{`upload-box active`}}>
                            <div className="upload-guide">
                                <strong>📂 사업관리카드(현액)</strong> 업로드<br/>
                                <span style={{{{fontSize:'0.72rem', color: 'var(--text-muted)'}}}}>사업관리<Arrow/>사업관리카드<Arrow/><strong>사업관리카드(현액)</strong></span>
                            </div>
                            <p className="box-sub">데모 데이터 로드됨</p>
                        </div>
                        <div className={{`upload-box active`}}>
                            <div className="upload-guide">
                                <strong>📂 현금출납부</strong> 업로드<br/>
                                <span style={{{{fontSize:'0.72rem', color: 'var(--text-muted)'}}}}>지출관리<Arrow/>지출장부<Arrow/><strong>현금출납부</strong></span>
                            </div>
                            <p className="box-sub">데모 데이터 로드됨</p>
                        </div>
                    </div>

                    <div className="tab-area">
                        <div className="tabs">
                            {{['detail', 'supplement', 'expense'].map(t => (
                                <div key={{t}} className={{`tab ${{activeTab === t ? 'active' : ''}}`}} onClick={{() => {{ setActiveTab(t); setColumnFilters({{}}); }}}}>
                                    {{t === 'detail' ? '1. 세부사업' : t === 'supplement' ? '2. 추경' : '3. 세부지출현황'}}
                                </div>
                            ))}}
                        </div>
                        {{activeTab === 'detail' && (
                            <button className={{`toggle-btn ${{showManager ? 'active' : ''}}`}} onClick={{() => setShowManager(!showManager)}}>
                                {{showManager ? '👤 담당자 숨기기' : '👤 담당자 보기'}}
                            </button>
                        )}}
                    </div>

                    <div className="content-card">
                        <div className="table-wrapper">
                            <table>
                                <thead className="excel-header">
                                    <tr>
                                        {{activeCols.map(col => (
                                            <th key={{col.key}} style={{{{width: (activeTab === 'expense' ? expenseColWidths[col.wk] : detailColWidths[col.wk])+'px'}}}} onClick={{{{() => setSortConfig({{key: col.key, direction: sortConfig.direction==='asc'?'desc':'asc'}})}}}}>
                                                <div className="header-content">
                                                    <span className={{{{`filter-btn ${{columnFilters[col.key]?.length > 0 ? 'active' : ''}}`}}}} onClick={{{{(e) => {{ e.stopPropagation(); setActiveFilterCol(activeFilterCol === col.key ? null : col.key); }}}}}}>≣</span>
                                                    <span>{{col.label}}</span>
                                                    <span className="sort-icon">{{sortConfig.key===col.key?(sortConfig.direction==='asc'?'▲':'▼'):'▼'}}</span>
                                                </div>
                                                <div className="resizer" onMouseDown={{{{e => startResize(e, col.wk, activeTab === 'expense')}}}}></div>
                                                {{renderFilterMenu(col.key, activeTab === 'expense' ? expenseData : budgetData)}}
                                            </th>
                                        ))}}
                                    </tr>
                                </thead>
                                <tbody>
                                    {{filteredData.map((r, i) => (
                                        <tr key={{i}} className={{r._totalType ? `total-${{r._totalType}}` : ''}}>
                                            {{activeCols.map(col => (
                                                <td key={{col.key}} className={{col.isNum ? 'num-cell' : col.isRate ? 'percent-cell' : 'center-cell'}}>
                                                    {{col.isNum ? new Intl.NumberFormat().format(r[col.key] || 0) : col.isRate ? r[col.key]+'%' : (col.key === '_exclude' ? (r._exclude || r['정산재원'] || '') : (col.key === '_costItem' ? r._costItem : r[col.key]))}}
                                                </td>
                                            ))}}
                                        </tr>
                                    ))}}
                                    <tr className="grand-total">
                                        {{activeTab === 'expense' ? (
                                            <><td colSpan="6" className="center-cell">전 기 계 (합 계)</td><td className="num-cell">{{new Intl.NumberFormat().format(totals.expense)}}</td></>
                                        ) : (
                                            <><td colSpan="6" className="center-cell">전 기 계 (합 계)</td>
                                            <td className="num-cell">{{new Intl.NumberFormat().format(totals.a)}}</td><td className="num-cell">{{new Intl.NumberFormat().format(totals.b)}}</td>
                                            <td className="num-cell">{{new Intl.NumberFormat().format(totals.ab)}}</td><td className="num-cell">{{new Intl.NumberFormat().format(totals.c)}}</td>
                                            <td className="num-cell">{{new Intl.NumberFormat().format(totals.ac)}}</td><td className="percent-cell">{{(totals.a > 0 ? ((totals.a - totals.c)/totals.a*100).toFixed(1) : '0.0')}}%</td>
                                            <td colSpan={{showManager ? 2 : 1}}></td></>
                                        )}}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }}

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>"""

with open('demo.html', 'w', encoding='utf-8') as f:
    f.write(html_content)
print("demo.html updated with Fixed Cost Item Mapping.")
