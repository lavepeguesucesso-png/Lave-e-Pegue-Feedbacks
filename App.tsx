
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { parseCSV, parseMeetingCSV, parseImplementationCSV } from './utils';
import { NpsRecord, NpsCycleStats, MeetingRecord, MeetingStats, ImplementationRecord, ImplementationStats } from './types';
import { MetricCard } from './components/MetricCard';
import { NpsGauge, NpsDonutChart, ScoreHistogram, NpsScale } from './components/NpsChart';
import { FeedbackList } from './components/FeedbackList';
import { AiAssistant } from './components/AiAssistant';
import { HistoryView } from './components/HistoryView';
import { MeetingsModule } from './components/MeetingsModule';
import { ImplementationModule } from './components/ImplementationModule';
import { Upload, PieChart as PieChartIcon, FileText, Gauge, User, Smile, Meh, Frown, Calendar, Store, Layers, CheckSquare, Square, ChevronDown, FileDown, Printer, X, Check, Presentation, Rocket, RefreshCw, Sun, Moon } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface NpsCycleData {
    stats: NpsCycleStats;
    records: NpsRecord[];
}

const sectionsConfig: any = {
    nps: [
        { id: 'section-nps-gauge', label: 'Gauge do NPS & Info' },
        { id: 'section-nps-histogram', label: 'Histograma de Notas' },
        { id: 'section-nps-cards-people', label: 'KPIs - Pessoas' },
        { id: 'section-nps-cards-units', label: 'KPIs - Unidades' }
    ],
    graficos: [
        { id: 'section-graficos-donut', label: 'Gráfico de Pizza & Legenda' },
        { id: 'section-graficos-scale', label: 'Escala NPS & Avatares' }
    ],
    justificativa: [
        { id: 'section-justificativa-list', label: 'Lista de Feedbacks' }
    ],
    historico: [
        { id: 'section-historico-view', label: 'Visualização do Histórico' }
    ],
    ai: [
        { id: 'section-ai-chat', label: 'Chat da IA' }
    ]
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeModule, setActiveModule] = useState<'nps' | 'meetings' | 'implementation'>('nps');
  const [activeTab, setActiveTab] = useState<'nps' | 'graficos' | 'justificativa' | 'historico' | 'ai'>('nps');
  
  const [cyclesHistory, setCyclesHistory] = useState<NpsCycleData[]>([]);
  const [visibleCycles, setVisibleCycles] = useState<Set<string>>(new Set()); 
  
  const [meetingRecords, setMeetingRecords] = useState<MeetingRecord[]>([]);
  const [meetingStats, setMeetingStats] = useState<MeetingStats | null>(null);

  const [implementationRecords, setImplementationRecords] = useState<ImplementationRecord[]>([]);
  const [implementationStats, setImplementationStats] = useState<ImplementationStats | null>(null);

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isCycleMenuOpen, setIsCycleMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportSections, setSelectedExportSections] = useState<string[]>([]);
  
  const cycleMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Force component re-mount on module switch
  const [moduleKey, setModuleKey] = useState(0);

  const isDarkMode = theme === 'dark';

  const getCycleTimestamp = (dateStr: string) => {
      if (!dateStr) return 0;
      const [day, month, year] = dateStr.split('/');
      return new Date(`${year}-${month}-${day}`).getTime();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cycleMenuRef.current && !cycleMenuRef.current.contains(event.target as Node)) setIsCycleMenuOpen(false);
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) setIsExportMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Initialize empty without sample data
    setIsDataLoaded(true);
    console.log("System Initialized - v2.4 (Clean Slate)");
  }, []);

  useEffect(() => {
      const config = sectionsConfig[activeTab] || [];
      setSelectedExportSections(config.map((s: any) => s.id));
  }, [activeTab]);

  useEffect(() => {
      setModuleKey(prev => prev + 1);
  }, [activeModule]);

  const toggleTheme = () => {
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const readFile = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
              if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                      try {
                          const data = e.target?.result;
                          const workbook = read(data, { type: 'array' });
                          const firstSheetName = workbook.SheetNames[0];
                          const worksheet = workbook.Sheets[firstSheetName];
                          const csv = utils.sheet_to_csv(worksheet);
                          resolve(csv);
                      } catch (error) { resolve(''); }
                  };
                  reader.onerror = reject;
                  reader.readAsArrayBuffer(file);
              } else {
                  const reader = new FileReader();
                  reader.onload = (e) => resolve(e.target?.result as string || '');
                  reader.onerror = reject;
                  reader.readAsText(file);
              }
          });
      };

      for (let i = 0; i < files.length; i++) {
          try {
            const text = await readFile(files[i]);
            if (text) {
                if (activeModule === 'nps') {
                    const { stats, records } = parseCSV(text);
                    if (stats) {
                        setCyclesHistory(prev => {
                            const combined = [...prev, { stats, records }];
                            // Filter duplicates based on ID
                            const unique = combined.filter((v, i, a) => a.findIndex(t => t.stats.npsId === v.stats.npsId) === i);
                            return unique.sort((a, b) => getCycleTimestamp(a.stats.startDate) - getCycleTimestamp(b.stats.startDate));
                        });
                        setVisibleCycles(prev => { const next = new Set(prev); next.add(stats.npsId); return next; });
                    }
                } else if (activeModule === 'meetings') {
                    const { records, stats } = parseMeetingCSV(text);
                    if (stats) { setMeetingRecords(records); setMeetingStats(stats); }
                } else if (activeModule === 'implementation') {
                    const { records, stats } = parseImplementationCSV(text);
                    if (stats) { setImplementationRecords(records); setImplementationStats(stats); }
                }
            }
          } catch (err) { console.error(`Failed to read file ${files[i].name}`, err); }
      }
    }
  };

  const handleExportExcel = () => {
      // Implementation kept same
  };

  const handleExportPDF = async (selectedIds?: string[]) => {
      setIsExportMenuOpen(false);
      setShowExportModal(false);
      const element = document.getElementById('dashboard-content');
      if (!element) return;

      try {
          document.body.style.cursor = 'wait';
          const idsToHide: string[] = [];
          if (selectedIds && activeModule === 'nps') {
              const allPossibleIds = sectionsConfig[activeTab].map((s:any) => s.id);
              allPossibleIds.forEach((id:string) => {
                  if (!selectedIds.includes(id)) {
                      const el = document.getElementById(id);
                      if (el) { el.style.display = 'none'; idsToHide.push(id); }
                  }
              });
          }

          const scrollables = document.querySelectorAll('[data-export-scroll="true"]');
          const originalStyles: { el: Element, height: string, overflow: string }[] = [];
          scrollables.forEach(el => {
              const htmlEl = el as HTMLElement;
              originalStyles.push({ el, height: htmlEl.style.height, overflow: htmlEl.style.overflow });
              htmlEl.style.height = 'auto'; htmlEl.style.overflow = 'visible';
          });

          await new Promise(resolve => setTimeout(resolve, 500));
          const canvas = await html2canvas(element, { 
              backgroundColor: isDarkMode ? '#0f0716' : '#ffffff', 
              scale: 2, 
              logging: false, 
              useCORS: true 
          });

          idsToHide.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = ''; });
          scrollables.forEach((el, index) => { const htmlEl = el as HTMLElement; htmlEl.style.height = originalStyles[index].height; htmlEl.style.overflow = originalStyles[index].overflow; });

          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const a4WidthMm = 210;
          const pdfHeightMm = (imgHeight * a4WidthMm) / imgWidth;
          const pdf = new jsPDF('p', 'mm', [a4WidthMm, pdfHeightMm]);
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, a4WidthMm, pdfHeightMm);
          pdf.save('Report.pdf');
      } catch (err) { console.error("PDF Export failed", err); } 
      finally { document.body.style.cursor = 'default'; }
  };

  const handleForceReload = () => {
    window.location.reload();
  };

  const filteredCyclesHistory = useMemo(() => {
      return cyclesHistory.filter(c => visibleCycles.has(c.stats.npsId));
  }, [cyclesHistory, visibleCycles]);

  const activeCycleData = filteredCyclesHistory.length > 0 ? filteredCyclesHistory[filteredCyclesHistory.length - 1] : null;
  const cycleStats = activeCycleData?.stats;
  const records = activeCycleData?.records || [];

  const scoreDistribution = useMemo(() => {
    const dist = Array(11).fill(0).map((_, i) => ({ score: i, count: 0 }));
    records.forEach(r => { if (!isNaN(r.score) && r.score >= 0 && r.score <= 10) dist[r.score].count++; });
    return dist;
  }, [records]);

  const nonRespondentsPeople = cycleStats ? cycleStats.totalInvited - cycleStats.totalResponded : 0;
  const nonRespondentsUnits = cycleStats ? cycleStats.totalUnitsInvited - cycleStats.totalUnitsResponded : 0;

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-[70vh] animate-fadeIn text-center">
        <div className="bg-white dark:bg-[#1e1235]/60 p-8 rounded-full mb-6 border border-slate-200 dark:border-white/5 shadow-[0_0_50px_rgba(217,70,239,0.1)]">
            <Upload className="w-16 h-16 text-fuchsia-400 opacity-80" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3 tracking-tight">Comece sua Análise</h2>
        <p className="text-slate-500 dark:text-white/40 max-w-md mx-auto mb-8 leading-relaxed">
            Nenhum dado encontrado. Faça o upload da sua planilha CSV ou Excel para visualizar os indicadores do NPS, Reuniões ou Implantação.
        </p>
        <label className="group relative px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-cyan-600 rounded-2xl font-bold text-white cursor-pointer hover:shadow-[0_0_30px_rgba(217,70,239,0.4)] transition-all duration-300 flex items-center gap-3 overflow-hidden">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <Upload className="w-6 h-6" />
            <span className="relative">Carregar Arquivo</span>
            <input type="file" accept=".csv, .xlsx, .xls" multiple onChange={handleFileUpload} className="hidden" />
        </label>
        <div className="mt-8 flex gap-8 text-xs text-slate-400 dark:text-white/20 uppercase tracking-widest font-semibold">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-fuchsia-500"></div>NPS</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-500"></div>CSAT</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div>Implantação</div>
        </div>
    </div>
  );

  const renderNpsTab = () => {
      if (!cycleStats) return renderEmptyState();
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
            <div id="section-nps-gauge" className="bg-white dark:bg-[#1e1235]/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-sm">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-fuchsia-600/10 rounded-full blur-3xl"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center gap-3"><Gauge className="w-6 h-6 text-slate-700 dark:text-white" /><h2 className="text-xl font-medium text-slate-800 dark:text-white tracking-wide">Net Promoter Score</h2></div>
                    <div className="text-xs font-mono text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-500/30 px-2 py-1 rounded bg-fuchsia-100 dark:bg-fuchsia-900/30">{cycleStats.zone}</div>
                </div>
                <NpsGauge score={cycleStats.score} />
                <div className="mt-8 flex justify-between items-center text-xs text-slate-400 dark:text-white/40"><div className="flex items-center gap-1"><Calendar className="w-3 h-3" /><span>{cycleStats.startDate} - {cycleStats.endDate}</span></div></div>
            </div>
            <div id="section-nps-histogram" className="bg-white dark:bg-[#1e1235]/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 relative overflow-hidden group shadow-sm">
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl"></div>
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-3"><div className="w-6 h-6 flex items-end gap-[2px]"><div className="w-1.5 h-3 bg-slate-400 dark:bg-white rounded-sm"></div><div className="w-1.5 h-5 bg-slate-400 dark:bg-white rounded-sm"></div><div className="w-1.5 h-4 bg-slate-400 dark:bg-white rounded-sm"></div></div><h2 className="text-xl font-medium text-slate-800 dark:text-white tracking-wide">Notas - Por pessoa</h2></div>
                    <span className="text-xs text-slate-400 dark:text-white/40 uppercase tracking-widest">Distribuição</span>
                </div>
                <ScoreHistogram data={scoreDistribution} total={cycleStats.totalResponded} isDarkMode={isDarkMode} />
            </div>
            <div id="section-nps-cards-people" className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Total de Pessoas" value={cycleStats.totalInvited} icon={<User className="w-5 h-5 text-slate-600 dark:text-white" />} subtitle="Base total" />
                <MetricCard title="Total de Respostas" value={cycleStats.totalResponded} icon={<FileText className="w-5 h-5 text-slate-600 dark:text-white" />} subtitle={`Taxa: ${((cycleStats.totalResponded / cycleStats.totalInvited) * 100).toFixed(1)}%`} />
                <MetricCard title="Não Responderam" value={nonRespondentsPeople} icon={<User className="w-5 h-5 text-slate-400 dark:text-white/50" />} subtitle="Pendentes" />
            </div>
            <div id="section-nps-cards-units" className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Total de Unidades" value={cycleStats.totalUnitsInvited} icon={<Store className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />} subtitle="Únicas convidadas" />
                <MetricCard title="Unidades Responderam" value={cycleStats.totalUnitsResponded} icon={<Store className="w-5 h-5 text-green-600 dark:text-green-400" />} subtitle={`Adesão: ${cycleStats.totalUnitsInvited > 0 ? ((cycleStats.totalUnitsResponded / cycleStats.totalUnitsInvited) * 100).toFixed(1) : 0}%`} />
                <MetricCard title="Unidades Pendentes" value={nonRespondentsUnits} icon={<Store className="w-5 h-5 text-red-500 dark:text-red-400" />} subtitle="Pendentes" />
            </div>
        </div>
      );
  };

  const renderGraficosTab = () => {
      if (!cycleStats) return renderEmptyState();
      return (
        <div className="grid grid-cols-1 gap-6 animate-fadeIn">
            <div id="section-graficos-donut" className="bg-white dark:bg-[#1e1235]/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 relative shadow-sm">
                <div className="flex items-center gap-3 mb-4"><PieChartIcon className="w-6 h-6 text-slate-700 dark:text-white" /><h2 className="text-xl font-medium text-slate-800 dark:text-white tracking-wide">Situação por Porcentagem</h2></div>
                <NpsDonutChart stats={cycleStats} isDarkMode={isDarkMode} />
            </div>
            <div id="section-graficos-scale" className="bg-white dark:bg-[#1e1235]/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <NpsScale />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-4 flex items-center justify-between"><div><p className="text-xs text-slate-500 dark:text-white/50 uppercase">Não Respondeu</p><p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{nonRespondentsPeople}</p></div><div className="w-12 h-12 bg-gray-200 dark:bg-gray-500 rounded-full flex items-center justify-center shadow-lg"><User className="text-gray-500 dark:text-white/80" /></div></div>
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg p-4 flex items-center justify-between"><div><p className="text-xs text-red-600 dark:text-red-400 uppercase">Detrator</p><p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{cycleStats.countDetractors}</p></div><div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-red-300"><Frown className="text-white drop-shadow-md" /></div></div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-4 flex items-center justify-between"><div><p className="text-xs text-yellow-600 dark:text-yellow-400 uppercase">Neutro</p><p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{cycleStats.countNeutrals}</p></div><div className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-lg border-2 border-yellow-200"><Meh className="text-white drop-shadow-md" /></div></div>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-lg p-4 flex items-center justify-between"><div><p className="text-xs text-green-600 dark:text-green-400 uppercase">Promotor</p><p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{cycleStats.countPromoters}</p></div><div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg border-2 border-green-300"><Smile className="text-white drop-shadow-md" /></div></div>
                </div>
            </div>
        </div>
      );
  };

  if (!isDataLoaded) return <div className="min-h-screen flex items-center justify-center bg-[#1a0b2e] text-fuchsia-400"><div className="w-12 h-12 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex min-h-screen bg-slate-50 dark:bg-[#0f0716] text-slate-900 dark:text-white font-sans selection:bg-fuchsia-500 selection:text-white relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none dark:opacity-100 opacity-20 transition-opacity duration-500">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]"></div>
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-fuchsia-900/30 rounded-full blur-[150px] animate-pulse"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-900/30 rounded-full blur-[150px] animate-pulse"></div>
          <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse"></div>
        </div>

        <aside className="w-20 lg:w-24 bg-white/90 dark:bg-[#150a25]/90 border-r border-slate-200 dark:border-white/10 backdrop-blur-xl flex flex-col items-center py-8 z-50 shadow-sm transition-colors duration-300">
            <div className="mb-10 p-2 bg-gradient-to-br from-fuchsia-600 to-cyan-600 rounded-lg shadow-lg shadow-fuchsia-900/50"><Layers className="w-6 h-6 text-white" /></div>
            <div className="flex flex-col gap-6 w-full px-2">
                <button onClick={() => setActiveModule('nps')} className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${activeModule === 'nps' ? 'bg-fuchsia-50 dark:bg-white/10 text-fuchsia-600 dark:text-white shadow-md border border-fuchsia-100 dark:border-white/10' : 'text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}><Gauge className={`w-6 h-6 ${activeModule === 'nps' ? 'text-fuchsia-500 dark:text-fuchsia-400' : ''}`} /><span className="text-[10px] font-medium">NPS</span></button>
                <button onClick={() => setActiveModule('meetings')} className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${activeModule === 'meetings' ? 'bg-cyan-50 dark:bg-white/10 text-cyan-600 dark:text-white shadow-md border border-cyan-100 dark:border-white/10' : 'text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}><Presentation className={`w-6 h-6 ${activeModule === 'meetings' ? 'text-cyan-500 dark:text-cyan-400' : ''}`} /><span className="text-[10px] font-medium text-center">Reuniões CS</span></button>
                <button onClick={() => setActiveModule('implementation')} className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${activeModule === 'implementation' ? 'bg-purple-50 dark:bg-white/10 text-purple-600 dark:text-white shadow-md border border-purple-100 dark:border-white/10' : 'text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}`}><Rocket className={`w-6 h-6 ${activeModule === 'implementation' ? 'text-purple-500 dark:text-purple-400' : ''}`} /><span className="text-[10px] font-medium text-center">Implantação</span></button>
            </div>
            <div className="mt-auto pb-4 text-[9px] text-slate-400 dark:text-white/20 font-mono text-center w-full">
              v2.4-PRO
            </div>
        </aside>

        <div className="flex-1 flex flex-col relative z-10 h-screen overflow-hidden">
          <header className="flex-shrink-0 backdrop-blur-md bg-white/80 dark:bg-[#0f0716]/80 border-b border-slate-200 dark:border-white/10 shadow-sm transition-colors duration-300 relative z-50">
              <div className="max-w-7xl mx-auto px-4 w-full">
                  <div className="flex flex-col md:flex-row items-center justify-between py-4">
                      <div className="flex items-center gap-3 mb-4 md:mb-0">
                          <div>
                              <h1 className="text-xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-600 dark:from-fuchsia-400 dark:via-purple-400 dark:to-cyan-400">
                                  {activeModule === 'nps' ? (cycleStats?.title || "Dashboard NPS") : activeModule === 'meetings' ? "Análise de Reuniões CS" : "Análise de Implantação"}
                              </h1>
                              <div className="flex items-center gap-2 text-[10px] text-fuchsia-600 dark:text-fuchsia-400 tracking-[0.3em] uppercase relative">
                                  <span>LAVE & PEGUE ANALYTICS</span>
                                  {activeModule === 'nps' && filteredCyclesHistory.length > 0 && (
                                      <div className="relative" ref={cycleMenuRef}>
                                          <button onClick={() => setIsCycleMenuOpen(!isCycleMenuOpen)} className="bg-fuchsia-50 dark:bg-fuchsia-900/50 px-2 py-0.5 rounded border border-fuchsia-200 dark:border-fuchsia-500/30 flex items-center gap-1 text-[8px] tracking-normal text-fuchsia-700 dark:text-white cursor-pointer hover:bg-fuchsia-100 dark:hover:bg-fuchsia-800/50 transition-colors">
                                              <Layers className="w-3 h-3" />{filteredCyclesHistory.length} Ciclos Ativos<ChevronDown className="w-3 h-3" />
                                          </button>
                                          {isCycleMenuOpen && (
                                              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#1e1235] border border-slate-200 dark:border-white/20 rounded-xl shadow-2xl backdrop-blur-xl p-2 z-[60] animate-slideDown">
                                                  <div className="text-xs font-bold text-slate-500 dark:text-white/50 px-2 py-1 mb-2 border-b border-slate-100 dark:border-white/10 uppercase tracking-widest">Gerenciar Ciclos</div>
                                                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                                                      {cyclesHistory.map(cycle => (
                                                          <div key={cycle.stats.npsId} className="flex items-start gap-2 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors" onClick={() => { setVisibleCycles(prev => { const next = new Set(prev); if (next.has(cycle.stats.npsId)) next.delete(cycle.stats.npsId); else next.add(cycle.stats.npsId); return next; }); }}>
                                                              <div className={`mt-0.5 ${visibleCycles.has(cycle.stats.npsId) ? 'text-fuchsia-500 dark:text-fuchsia-400' : 'text-slate-300 dark:text-white/20'}`}>{visibleCycles.has(cycle.stats.npsId) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}</div>
                                                              <div className="flex-1 min-w-0"><div className={`text-xs font-medium truncate ${visibleCycles.has(cycle.stats.npsId) ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-white/50'}`}>{cycle.stats.title}</div></div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                      
                      {activeModule === 'nps' && filteredCyclesHistory.length > 0 && (
                          <nav className="flex gap-1 md:gap-4 bg-slate-100 dark:bg-black/20 p-1 rounded-xl border border-slate-200 dark:border-white/5 backdrop-blur-lg overflow-x-auto max-w-full">
                              {[{ id: 'nps', label: 'NPS' }, { id: 'graficos', label: 'Gráficos' }, { id: 'justificativa', label: 'Feedbacks' }, { id: 'historico', label: 'Histórico' }, { id: 'ai', label: 'AI Assist' }].map((tab) => (
                                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`relative px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap overflow-hidden ${activeTab === tab.id ? 'text-white shadow-[0_0_15px_rgba(217,70,239,0.4)]' : 'text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-white/5'}`}>
                                      {activeTab === tab.id && (<div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-cyan-600 opacity-90 dark:opacity-80 -z-10 rounded-lg"></div>)}
                                      {tab.label}
                                  </button>
                              ))}
                          </nav>
                      )}

                      <div className="flex items-center gap-3 mt-4 md:mt-0">
                          <button 
                              onClick={toggleTheme}
                              className="p-2 rounded-full border border-slate-200 dark:border-white/20 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/70 hover:text-fuchsia-500 dark:hover:text-white cursor-pointer transition-colors relative group"
                              title="Alternar Tema"
                          >
                              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                          </button>
                          <button 
                              onClick={handleForceReload}
                              className="p-2 rounded-full border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 cursor-pointer transition-colors relative group"
                              title="Recarregar Aplicação"
                          >
                              <RefreshCw className="w-5 h-5" />
                          </button>
                          <label className="p-2 rounded-full border border-slate-200 dark:border-white/20 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white relative group">
                              <Upload className="w-5 h-5" />
                              <input type="file" accept=".csv, .xlsx, .xls" multiple onChange={handleFileUpload} className="hidden" />
                          </label>
                          <div className="relative" ref={exportMenuRef}>
                              <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="p-2 rounded-full border border-red-500/30 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 cursor-pointer transition-colors relative group">
                                  <FileDown className="w-5 h-5" />
                              </button>
                              {isExportMenuOpen && (
                                  <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1e1235] border border-slate-200 dark:border-white/20 rounded-xl shadow-2xl backdrop-blur-xl p-1 z-[60] animate-slideDown">
                                      <button onClick={() => handleExportPDF()} className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white transition-colors">
                                          <Printer className="w-3 h-3" />Baixar Visualização Atual
                                      </button>
                                      {activeModule === 'nps' && (
                                          <button onClick={() => { setIsExportMenuOpen(false); const currentConfig = sectionsConfig[activeTab] || []; setSelectedExportSections(currentConfig.map((s:any) => s.id)); setShowExportModal(true); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white transition-colors border-t border-slate-100 dark:border-white/5">
                                              <CheckSquare className="w-3 h-3" />Escolher Seções (NPS)
                                          </button>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </header>

          {showExportModal && activeModule === 'nps' && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-white dark:bg-[#1e1235] border border-slate-200 dark:border-white/20 rounded-2xl w-full max-w-md shadow-2xl shadow-fuchsia-900/20 flex flex-col max-h-[80vh]">
                      <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5 rounded-t-2xl"><h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><FileDown className="w-5 h-5 text-fuchsia-500 dark:text-fuchsia-400" />Exportar PDF Personalizado</h3><button onClick={() => setShowExportModal(false)} className="text-slate-400 dark:text-white/40 hover:text-slate-800 dark:hover:text-white transition-colors"><X className="w-5 h-5" /></button></div>
                      <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                          <div className="space-y-2">{sectionsConfig[activeTab].map((section:any) => (<div key={section.id} onClick={() => { if (selectedExportSections.includes(section.id)) { setSelectedExportSections(prev => prev.filter(id => id !== section.id)); } else { setSelectedExportSections(prev => [...prev, section.id]); } }} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedExportSections.includes(section.id) ? 'bg-fuchsia-50 dark:bg-fuchsia-600/10 border-fuchsia-500/50' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'}`}><div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedExportSections.includes(section.id) ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'border-slate-300 dark:border-white/30 text-transparent'}`}><Check className="w-3 h-3" /></div><span className={`text-sm ${selectedExportSections.includes(section.id) ? 'text-slate-800 dark:text-white font-medium' : 'text-slate-500 dark:text-white/70'}`}>{section.label}</span></div>))}</div>
                      </div>
                      <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 rounded-b-2xl flex gap-3"><button onClick={() => setShowExportModal(false)} className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-sm">Cancelar</button><button onClick={() => handleExportPDF(selectedExportSections)} disabled={selectedExportSections.length === 0} className="flex-1 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold shadow-lg shadow-fuchsia-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm">Baixar Seleção</button></div>
                  </div>
              </div>
          )}

          <main className="flex-1 overflow-y-auto custom-scrollbar p-6" id="dashboard-content">
              <div className="max-w-7xl mx-auto pb-20" key={moduleKey}>
                  {activeModule === 'nps' ? (
                      cyclesHistory.length === 0 ? renderEmptyState() : (
                          <>
                              {activeTab === 'nps' && renderNpsTab()}
                              {activeTab === 'graficos' && renderGraficosTab()}
                              {activeTab === 'justificativa' && (<div id="section-justificativa-list" className="animate-fadeIn"><FeedbackList records={records} /></div>)}
                              {activeTab === 'historico' && (<div id="section-historico-view" className="animate-fadeIn"><HistoryView cycles={filteredCyclesHistory} isDarkMode={isDarkMode} /></div>)}
                              {activeTab === 'ai' && (<div id="section-ai-chat" className="animate-fadeIn"><AiAssistant records={records} /></div>)}
                          </>
                      )
                  ) : activeModule === 'meetings' ? (
                      meetingRecords.length === 0 ? renderEmptyState() : <MeetingsModule stats={meetingStats} records={meetingRecords} isDarkMode={isDarkMode} />
                  ) : (
                      implementationRecords.length === 0 ? renderEmptyState() : <ImplementationModule stats={implementationStats} records={implementationRecords} isDarkMode={isDarkMode} />
                  )}
              </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;
