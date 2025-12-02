
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { NpsRecord, NpsCycleStats } from '../types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, AreaChart, Area } from 'recharts';
import { Search, Store, User, Calendar, TrendingUp, TrendingDown, Hash, Award, Globe, Users, ChevronDown, X, MousePointerClick, History, MessageSquare, ArrowRight, Shuffle, ArrowUpRight, ArrowDownRight, Filter, Minus, Meh, Eye, EyeOff } from 'lucide-react';

interface HistoryViewProps {
  cycles: { stats: NpsCycleStats; records: NpsRecord[] }[];
  isDarkMode?: boolean;
}

const COLORS = ['#d946ef', '#4ade80', '#22d3ee', '#facc15', '#f87171', '#a78bfa', '#fb923c', '#ec4899'];
const ITEMS_PER_PAGE = 30;

export const HistoryView: React.FC<HistoryViewProps> = ({ cycles, isDarkMode }) => {
  const [viewType, setViewType] = useState<'overview' | 'comparison' | 'unit' | 'person'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [comparisonSearch, setComparisonSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'improved' | 'stable' | 'declined' | 'recovered_detractor' | 'lost_promoter' | 'retained_neutral'>('all');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  
  // Pagination States
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(ITEMS_PER_PAGE);
  const [visibleComparisonCount, setVisibleComparisonCount] = useState(ITEMS_PER_PAGE);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
      setHiddenSeries(new Set());
      setVisibleHistoryCount(ITEMS_PER_PAGE);
  }, [selectedEntity]);

  const parseDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('/');
    return new Date(`${year}-${month}-${day} ${timePart || '00:00:00'}`).getTime();
  };

  const allRecords = useMemo(() => {
      return cycles.flatMap(c => c.records);
  }, [cycles]);

  const entities = useMemo(() => {
    const counts = new Map<string, number>();
    allRecords.forEach(r => {
      const key = viewType === 'unit' ? r.unitName : r.respondentName;
      if (key) {
          counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, count]) => ({ name, count }));
  }, [allRecords, viewType]);

  const filteredEntities = useMemo(() => {
      if (!searchTerm) return entities.slice(0, 100); // Limit initial list for performance
      return entities.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 100);
  }, [entities, searchTerm]);

  const entityData = useMemo(() => {
    if (!selectedEntity || (viewType !== 'unit' && viewType !== 'person')) return null;

    const rawData = allRecords.filter(r => 
      (viewType === 'unit' ? r.unitName : r.respondentName) === selectedEntity
    );

    const sortedData = rawData.sort((a, b) => parseDate(a.responseDate) - parseDate(b.responseDate));
    const detailedHistory = [...sortedData].reverse();

    const sum = sortedData.reduce((acc, curr) => acc + (isNaN(curr.score) ? 0 : curr.score), 0);
    const validScores = sortedData.filter(r => !isNaN(r.score));
    const avg = validScores.length ? (sum / validScores.length).toFixed(1) : 'N/A';
    
    let pivotedChartData: any[] = [];
    const uniqueRespondents = new Set<string>();

    if (viewType === 'unit') {
        sortedData.forEach(r => uniqueRespondents.add(r.respondentName));
        pivotedChartData = sortedData.map(r => ({
            date: r.responseDate.split(' ')[0],
            fullDate: r.responseDate,
            [r.respondentName]: r.score,
            comment: r.justification,
            respondentName: r.respondentName,
            score: r.score
        })).filter(d => !isNaN(d.score));
    } else {
        pivotedChartData = sortedData.map(r => ({
            date: r.responseDate.split(' ')[0],
            fullDate: r.responseDate,
            score: r.score,
            comment: r.justification,
            respondentName: r.respondentName,
            status: r.status,
            timestamp: parseDate(r.responseDate)
        })).filter(d => !isNaN(d.score));
    }

    return {
      stats: { total: sortedData.length, avg, count: validScores.length },
      chartData: pivotedChartData,
      respondents: Array.from(uniqueRespondents),
      detailedHistory,
      lastRecord: sortedData[sortedData.length - 1]
    };
  }, [selectedEntity, allRecords, viewType]);

  const comparisonData = useMemo(() => {
      if (viewType !== 'comparison') return null;
      const respondentMap = new Map<string, NpsRecord[]>();
      allRecords.forEach(r => {
          if (!r.respondentId) return;
          if (!respondentMap.has(r.respondentId)) respondentMap.set(r.respondentId, []);
          respondentMap.get(r.respondentId)?.push(r);
      });

      const migrations: any[] = [];
      let recoveredDetractors = 0;
      let lostPromoters = 0;
      let improvedCount = 0;
      let declinedCount = 0;
      let stableCount = 0;
      let neutralRetention = 0;

      respondentMap.forEach((records, id) => {
          if (records.length < 2) return;
          const sorted = records.sort((a, b) => parseDate(a.responseDate) - parseDate(b.responseDate));
          const oldest = sorted[0];
          const newest = sorted[sorted.length - 1];

          if (isNaN(oldest.score) || isNaN(newest.score)) return;

          const diff = newest.score - oldest.score;
          let trend = 'stable';
          if (diff > 0) { trend = 'improved'; improvedCount++; } 
          else if (diff < 0) { trend = 'declined'; declinedCount++; } 
          else { stableCount++; }

          if (oldest.status === 'Detrator' && newest.status !== 'Detrator') recoveredDetractors++;
          if (oldest.status === 'Promotor' && newest.status !== 'Promotor') lostPromoters++;
          if (oldest.status === 'Neutro' && newest.status === 'Neutro') neutralRetention++;

          let transitionLabel = 'Mantido';
          let colorClass = isDarkMode ? 'bg-white/5 border-white/10 text-white/50' : 'bg-slate-100 border-slate-200 text-slate-500';

          if (oldest.status !== newest.status) {
              transitionLabel = `${oldest.status} ➝ ${newest.status}`;
              const scoreMap: any = { 'Detrator': 0, 'Neutro': 1, 'Promotor': 2 };
              const oldScore = scoreMap[oldest.status];
              const newScore = scoreMap[newest.status];
              if (newScore > oldScore) colorClass = isDarkMode ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-600';
              else if (newScore < oldScore) colorClass = isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600';
              else colorClass = isDarkMode ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-yellow-50 border-yellow-200 text-yellow-600';
          } else {
              if (diff > 0) colorClass = isDarkMode ? 'bg-green-500/5 border-green-500/20 text-green-300/70' : 'bg-green-50 border-green-100 text-green-500';
              else if (diff < 0) colorClass = isDarkMode ? 'bg-red-500/5 border-red-500/20 text-red-300/70' : 'bg-red-50 border-red-100 text-red-500';
          }

          migrations.push({ id, name: newest.respondentName, unit: newest.unitName, oldest, newest, trend, scoreDiff: diff, transitionLabel, colorClass });
      });

      migrations.sort((a, b) => Math.abs(b.scoreDiff) - Math.abs(a.scoreDiff));
      return { migrations, stats: { recoveredDetractors, lostPromoters, improvedCount, declinedCount, stableCount, neutralRetention, totalComparisons: migrations.length } };
  }, [allRecords, viewType, isDarkMode]);

  const filteredMigrations = useMemo(() => {
      if (!comparisonData) return [];
      let data = comparisonData.migrations;
      if (filterType !== 'all') {
          if (filterType === 'recovered_detractor') data = data.filter((m: any) => m.oldest.status === 'Detrator' && m.newest.status !== 'Detrator');
          else if (filterType === 'lost_promoter') data = data.filter((m: any) => m.oldest.status === 'Promotor' && m.newest.status !== 'Promotor');
          else if (filterType === 'retained_neutral') data = data.filter((m: any) => m.oldest.status === 'Neutro' && m.newest.status === 'Neutro');
          else data = data.filter((m: any) => m.trend === filterType);
      }
      if (comparisonSearch) {
          const lower = comparisonSearch.toLowerCase();
          data = data.filter((m: any) => m.name.toLowerCase().includes(lower) || m.unit.toLowerCase().includes(lower));
      }
      return data;
  }, [comparisonData, comparisonSearch, filterType]);

  const toggleSeries = (name: string) => {
      const next = new Set(hiddenSeries);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      setHiddenSeries(next);
  };

  const renderCustomLegend = () => {
      if (!entityData || !entityData.respondents || entityData.respondents.length === 0) return null;
      return (
          <div className="flex flex-wrap gap-2 justify-center mt-4 px-4 max-h-32 overflow-y-auto custom-scrollbar" data-export-scroll="true">
              {entityData.respondents.map((respondent, idx) => {
                  const isHidden = hiddenSeries.has(respondent);
                  const color = COLORS[idx % COLORS.length];
                  return (
                      <button key={respondent} onClick={() => toggleSeries(respondent)} className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] uppercase font-bold border transition-all ${isHidden ? 'bg-transparent border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30' : 'bg-slate-100 dark:bg-[#150a25] border-slate-300 dark:border-white/20 text-slate-800 dark:text-white shadow-sm'}`} style={!isHidden ? { borderColor: color, color: isDarkMode ? '#fff' : '#1e293b' } : {}}>
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isHidden ? '#666' : color }} />
                          <span className={isHidden ? 'line-through' : ''}>{respondent}</span>
                          {isHidden ? <EyeOff className="w-3 h-3 ml-1" /> : <Eye className="w-3 h-3 ml-1 opacity-50" />}
                      </button>
                  )
              })}
          </div>
      );
  };

  const globalTrends = useMemo(() => {
      if (viewType !== 'overview') return null;
      return cycles.map(c => ({
          name: c.stats.startDate ? `${c.stats.startDate.split('/')[1]}/${c.stats.startDate.split('/')[2].slice(2)}` : 'N/A',
          fullTitle: c.stats.title,
          score: c.stats.score,
          totalInvited: c.stats.totalInvited,
          totalResponded: c.stats.totalResponded,
          unitInvited: c.stats.totalUnitsInvited,
          unitResponded: c.stats.totalUnitsResponded,
          respRate: c.stats.totalInvited > 0 ? ((c.stats.totalResponded / c.stats.totalInvited) * 100).toFixed(1) : 0,
          unitRate: c.stats.totalUnitsInvited > 0 ? ((c.stats.totalUnitsResponded / c.stats.totalUnitsInvited) * 100).toFixed(1) : 0
      }));
  }, [cycles, viewType]);

  const handleTypeChange = (type: any) => {
    setViewType(type);
    if (type === 'comparison' || type === 'overview') setSelectedEntity(null);
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const selectEntity = (name: string) => {
      setSelectedEntity(name);
      setSearchTerm(name);
      setIsDropdownOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn h-full pb-10">
      <div className="bg-white dark:bg-[#1e1235]/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl relative z-20">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex bg-slate-100 dark:bg-black/40 p-1.5 rounded-xl border border-slate-200 dark:border-white/5 flex-wrap shadow-inner">
            {[ { id: 'overview', icon: Globe, label: 'Visão Geral' }, { id: 'comparison', icon: Shuffle, label: 'Comparativo' }, { id: 'unit', icon: Store, label: 'Por Unidade' }, { id: 'person', icon: User, label: 'Por Pessoa' } ].map((tab) => (
                <button key={tab.id} onClick={() => handleTypeChange(tab.id as any)} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${viewType === tab.id ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white shadow-lg shadow-fuchsia-900/30 ring-1 ring-white/20' : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}`}>
                    <tab.icon className="w-4 h-4" />{tab.label}
                </button>
            ))}
          </div>
          {(viewType === 'unit' || viewType === 'person') && (
            <div className="relative w-full md:w-96 group" ref={dropdownRef}>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className={`h-4 w-4 transition-colors ${isDropdownOpen ? 'text-fuchsia-500 dark:text-fuchsia-400' : 'text-slate-400 dark:text-white/40'}`} /></div>
                    <input type="text" placeholder={viewType === 'unit' ? "Selecione uma unidade..." : "Selecione uma pessoa..."} className="block w-full pl-10 pr-10 py-3 border border-slate-200 dark:border-white/10 rounded-xl leading-5 bg-white dark:bg-[#150a25] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50 sm:text-sm transition-all shadow-inner hover:bg-slate-50 dark:hover:bg-[#1a0e2e] cursor-pointer" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); if (e.target.value === '') setSelectedEntity(null); }} onFocus={() => setIsDropdownOpen(true)} onClick={() => setIsDropdownOpen(true)} />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer gap-2">
                        {searchTerm && <X className="h-4 w-4 text-slate-400 dark:text-white/40 hover:text-slate-800 dark:hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setSearchTerm(''); setSelectedEntity(null); setIsDropdownOpen(true); }} />}
                        <ChevronDown className={`h-4 w-4 text-slate-400 dark:text-white/40 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-fuchsia-500 dark:text-fuchsia-400' : ''}`} />
                    </div>
                </div>
                {isDropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-white dark:bg-[#1e1235] border border-slate-200 dark:border-white/20 rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar animate-slideDown backdrop-blur-xl">
                        {filteredEntities.length > 0 ? (
                            <div className="py-2">
                                <div className="px-4 py-2 text-xs font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wider border-b border-slate-100 dark:border-white/5 mb-1">{filteredEntities.length} Resultados</div>
                                {filteredEntities.map((entity, idx) => (
                                    <button key={idx} onClick={() => selectEntity(entity.name)} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between group transition-all border-l-2 ${selectedEntity === entity.name ? 'bg-fuchsia-50 dark:bg-fuchsia-600/10 border-fuchsia-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white'}`}>
                                        <span className="font-medium truncate pr-4">{entity.name}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${selectedEntity === entity.name ? 'bg-fuchsia-100 dark:bg-fuchsia-500/20 border-fuchsia-200 dark:border-fuchsia-500/50 text-fuchsia-700 dark:text-fuchsia-200' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/30 group-hover:border-slate-300 dark:group-hover:border-white/30'}`}>{entity.count}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-8 text-center text-slate-400 dark:text-white/40 flex flex-col items-center gap-2"><Search className="w-8 h-8 opacity-20" /><span>Nenhum resultado</span></div>
                        )}
                    </div>
                )}
            </div>
          )}
        </div>
      </div>

      {viewType === 'comparison' && comparisonData && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-slideUp">
              {comparisonData.migrations.length === 0 ? (
                  <div className="col-span-5 flex flex-col items-center justify-center p-16 bg-white dark:bg-[#1e1235]/40 rounded-2xl border border-slate-200 dark:border-white/5 border-dashed"><div className="w-20 h-20 bg-fuchsia-50 dark:bg-fuchsia-900/20 rounded-full flex items-center justify-center mb-6"><Shuffle className="w-10 h-10 text-fuchsia-500/50" /></div><h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Dados insuficientes</h3><p className="text-slate-500 dark:text-white/40 text-center max-w-md">Carregue múltiplas planilhas de meses diferentes.</p></div>
              ) : (
                  <>
                    <div className="col-span-5 grid grid-cols-1 md:grid-cols-5 gap-6">
                        <button onClick={() => setFilterType(filterType === 'recovered_detractor' ? 'all' : 'recovered_detractor')} className={`bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40 border rounded-xl p-5 flex items-center justify-between group hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] transition-all text-left ${filterType === 'recovered_detractor' ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-green-200 dark:border-green-500/30'}`}><div><p className="text-green-600 dark:text-green-400 text-xs font-bold uppercase tracking-wider mb-1">Detratores Recuperados</p><p className="text-3xl font-bold text-slate-800 dark:text-white">{comparisonData.stats.recoveredDetractors}</p></div><div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform"><ArrowUpRight className="w-6 h-6" /></div></button>
                        <button onClick={() => setFilterType(filterType === 'lost_promoter' ? 'all' : 'lost_promoter')} className={`bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/40 dark:to-pink-900/40 border rounded-xl p-5 flex items-center justify-between group hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all text-left ${filterType === 'lost_promoter' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-red-200 dark:border-red-500/30'}`}><div><p className="text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider mb-1">Promotores Perdidos</p><p className="text-3xl font-bold text-slate-800 dark:text-white">{comparisonData.stats.lostPromoters}</p></div><div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform"><ArrowDownRight className="w-6 h-6" /></div></button>
                        <button onClick={() => setFilterType(filterType === 'retained_neutral' ? 'all' : 'retained_neutral')} className={`bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/40 dark:to-amber-900/40 border rounded-xl p-5 flex items-center justify-between group hover:shadow-[0_0_20px_rgba(234,179,8,0.2)] transition-all text-left ${filterType === 'retained_neutral' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-yellow-200 dark:border-yellow-500/30'}`}><div><p className="text-yellow-600 dark:text-yellow-400 text-xs font-bold uppercase tracking-wider mb-1">Permaneceram Neutros</p><p className="text-3xl font-bold text-slate-800 dark:text-white">{comparisonData.stats.neutralRetention}</p></div><div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg flex items-center justify-center text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform"><Meh className="w-6 h-6" /></div></button>
                        <button onClick={() => setFilterType(filterType === 'improved' ? 'all' : 'improved')} className={`bg-white dark:bg-[#1e1235]/60 border rounded-xl p-5 flex items-center justify-between text-left transition-all hover:bg-slate-50 dark:hover:bg-white/5 border-cyan-200 dark:border-cyan-500/20 hover:border-cyan-500/50 ${filterType === 'improved' ? 'border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : ''}`}><div><p className="text-cyan-600 dark:text-cyan-300/70 text-xs font-bold uppercase tracking-wider mb-1">Melhoraram a Nota</p><p className="text-3xl font-bold text-slate-800 dark:text-white">{comparisonData.stats.improvedCount}</p></div><div className="w-10 h-10 bg-cyan-50 dark:bg-white/5 rounded-lg flex items-center justify-center text-cyan-600 dark:text-cyan-300/50"><TrendingUp className="w-6 h-6" /></div></button>
                        <button onClick={() => setFilterType(filterType === 'declined' ? 'all' : 'declined')} className={`bg-white dark:bg-[#1e1235]/60 border rounded-xl p-5 flex items-center justify-between text-left transition-all hover:bg-slate-50 dark:hover:bg-white/5 border-slate-200 dark:border-white/10 ${filterType === 'declined' ? 'border-slate-400 dark:border-white/40 shadow-inner' : ''}`}><div><p className="text-slate-400 dark:text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Pioraram a Nota</p><p className="text-3xl font-bold text-slate-800 dark:text-white">{comparisonData.stats.declinedCount}</p></div><div className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-lg flex items-center justify-center text-slate-400 dark:text-white/30"><TrendingDown className="w-6 h-6" /></div></button>
                    </div>

                    <div className="col-span-5 bg-white dark:bg-[#1e1235]/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl">
                        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2"><Shuffle className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-400" />Fluxo de Migração</h3>
                            <div className="relative w-full md:w-64">
                                <input type="text" placeholder="Buscar..." className="w-full bg-slate-50 dark:bg-[#150a25] border border-slate-200 dark:border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-fuchsia-500" value={comparisonSearch} onChange={(e) => setComparisonSearch(e.target.value)} />
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-white/40" />
                            </div>
                        </div>
                        <div className="overflow-x-auto min-h-[400px]" data-export-scroll="true">
                            <table className="w-full text-left border-collapse">
                                <thead><tr className="border-b border-slate-200 dark:border-white/10 text-xs uppercase tracking-wider text-slate-400 dark:text-white/40"><th className="p-4 font-medium">Pessoa / Unidade</th><th className="p-4 font-medium text-center">Status Anterior</th><th className="p-4 font-medium text-center"></th><th className="p-4 font-medium text-center">Status Atual</th><th className="p-4 font-medium text-center">Transição</th></tr></thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {filteredMigrations.slice(0, visibleComparisonCount).map((mig: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group relative">
                                            <td className="p-4"><div className="text-slate-800 dark:text-white font-medium">{mig.name}</div><div className="text-xs text-slate-500 dark:text-white/40">{mig.unit}</div>
                                                <div className="hidden group-hover:block absolute left-4 top-full mt-2 w-[600px] z-50 bg-white dark:bg-[#1a1025] border border-cyan-200 dark:border-cyan-500/30 rounded-xl shadow-2xl p-4 animate-fadeIn pointer-events-none">
                                                    <div className="grid grid-cols-2 gap-4"><div className="bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-100 dark:border-white/5"><div className="text-[10px] text-slate-400 dark:text-white/40 uppercase mb-1">Anterior (Nota {mig.oldest.score})</div><p className="text-xs text-slate-600 dark:text-white/80 italic">"{mig.oldest.justification || 'Sem comentário'}"</p></div><div className="bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-100 dark:border-white/5"><div className="text-[10px] text-slate-400 dark:text-white/40 uppercase mb-1">Atual (Nota {mig.newest.score})</div><p className="text-xs text-slate-600 dark:text-white/80 italic">"{mig.newest.justification || 'Sem comentário'}"</p></div></div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center"><span className={`text-[10px] uppercase font-bold ${mig.oldest.status === 'Promotor' ? 'text-green-500 dark:text-green-400' : mig.oldest.status === 'Neutro' ? 'text-yellow-500 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'}`}>{mig.oldest.status}</span></td>
                                            <td className="p-4 text-center"><ArrowRight className="w-4 h-4 mx-auto opacity-30 text-slate-400 dark:text-white" /></td>
                                            <td className="p-4 text-center"><span className={`text-[10px] uppercase font-bold ${mig.newest.status === 'Promotor' ? 'text-green-500 dark:text-green-400' : mig.newest.status === 'Neutro' ? 'text-yellow-500 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'}`}>{mig.newest.status}</span></td>
                                            <td className="p-4 text-center"><div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-bold ${mig.colorClass}`}>{mig.transitionLabel}</div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {visibleComparisonCount < filteredMigrations.length && (
                                <div className="p-4 flex justify-center"><button onClick={() => setVisibleComparisonCount(prev => prev + ITEMS_PER_PAGE)} className="text-xs text-fuchsia-500 dark:text-fuchsia-400 hover:text-fuchsia-700 dark:hover:text-white transition-colors">Carregar mais...</button></div>
                            )}
                        </div>
                    </div>
                  </>
              )}
          </div>
      )}

      {viewType === 'overview' && globalTrends && (
          <div className="grid grid-cols-1 gap-6 animate-slideUp">
                <div className="bg-white dark:bg-[#1e1235]/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 h-[450px] relative overflow-hidden group">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Evolução do NPS</h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <AreaChart data={globalTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs><linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d946ef" stopOpacity={0.6}/><stop offset="95%" stopColor="#d946ef" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#ffffff10" : "#e2e8f0"} />
                            <XAxis dataKey="name" stroke={isDarkMode ? "#ffffff50" : "#64748b"} tick={{fill: isDarkMode ? '#ffffff50' : '#64748b', fontSize: 12}} tickLine={false} axisLine={false} dy={10} />
                            <YAxis domain={[-100, 100]} stroke={isDarkMode ? "#ffffff50" : "#64748b"} tick={{fill: isDarkMode ? '#ffffff50' : '#64748b', fontSize: 12}} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1a1025' : '#fff', borderRadius: '12px', border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0' }} />
                            <Area type="monotone" dataKey="score" stroke="#d946ef" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" dot={{ r: 4, fill: '#d946ef', stroke: isDarkMode ? '#1a0b2e' : '#fff', strokeWidth: 2 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
          </div>
      )}

      {(viewType === 'unit' || viewType === 'person') && selectedEntity && entityData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slideUp">
          <div className="lg:col-span-1 bg-white dark:bg-[#1e1235]/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col items-center text-center shadow-xl">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-fuchsia-600 to-purple-700 p-[2px] mb-4"><div className="w-full h-full rounded-full bg-white dark:bg-[#150a25] flex items-center justify-center"><Store className="w-10 h-10 text-slate-700 dark:text-white" /></div></div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">{selectedEntity}</h2>
              <div className="w-full grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/5"><div className="text-xs text-slate-400 dark:text-white/40 uppercase mb-1">Média</div><div className="text-2xl font-bold text-slate-800 dark:text-white">{entityData.stats.avg}</div></div>
                  <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-100 dark:border-white/5"><div className="text-xs text-slate-400 dark:text-white/40 uppercase mb-1">Respostas</div><div className="text-2xl font-bold text-slate-800 dark:text-white">{entityData.stats.total}</div></div>
              </div>
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-[#1e1235]/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Linha do Tempo</h3>
            <div className="flex-1 min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={entityData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#ffffff10" : "#e2e8f0"} />
                    <XAxis dataKey="date" stroke={isDarkMode ? "#ffffff50" : "#64748b"} tick={{fill: isDarkMode ? '#ffffff50' : '#64748b', fontSize: 10}} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 10]} stroke={isDarkMode ? "#ffffff50" : "#64748b"} tick={{fill: isDarkMode ? '#ffffff50' : '#64748b', fontSize: 10}} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1a1025' : '#fff', border: isDarkMode ? '1px solid #ffffff20' : '1px solid #e2e8f0' }} />
                    {viewType === 'unit' ? (entityData.respondents?.map((r, i) => <Line key={r} type="linear" dataKey={r} hide={hiddenSeries.has(r)} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{r:3}} connectNulls />)) : (<Line type="linear" dataKey="score" stroke="#d946ef" strokeWidth={3} dot={{r:4}} connectNulls />)}
                    {viewType === 'unit' && <Legend content={renderCustomLegend} />}
                  </LineChart>
                </ResponsiveContainer>
            </div>
          </div>
          <div className="lg:col-span-3 bg-white dark:bg-[#1e1235]/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl">
             <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Histórico Detalhado</h3>
             <div className="overflow-x-auto" data-export-scroll="true">
                <table className="w-full text-left">
                   <thead><tr className="border-b border-slate-200 dark:border-white/10 text-xs uppercase tracking-wider text-slate-400 dark:text-white/40"><th className="p-4">Data</th><th className="p-4">Nome</th><th className="p-4 text-center">Nota</th><th className="p-4">Comentário</th></tr></thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {entityData.detailedHistory.slice(0, visibleHistoryCount).map((record, idx) => (
                         <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5">
                            <td className="p-4 text-sm text-slate-600 dark:text-white/70">{record.responseDate}</td>
                            <td className="p-4 text-sm text-slate-800 dark:text-white">{record.respondentName}</td>
                            <td className="p-4 text-center font-bold text-slate-800 dark:text-white">{record.score}</td>
                            <td className="p-4 text-sm text-slate-500 dark:text-white/60 italic">{record.justification || '-'}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
                {visibleHistoryCount < entityData.detailedHistory.length && (
                    <div className="p-4 flex justify-center"><button onClick={() => setVisibleHistoryCount(prev => prev + ITEMS_PER_PAGE)} className="text-xs text-fuchsia-500 dark:text-fuchsia-400 hover:text-fuchsia-700 dark:hover:text-white transition-colors">Carregar mais...</button></div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
