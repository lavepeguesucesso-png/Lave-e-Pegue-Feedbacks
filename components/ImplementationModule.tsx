
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ImplementationRecord, ImplementationStats } from '../types';
import { MetricCard } from './MetricCard';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Legend } from 'recharts';
import { Rocket, Box, Users, PenTool, LayoutTemplate, Star, MessageSquare, Wrench, Zap, Store, Filter, HelpCircle, Search, ChevronDown, Monitor, CreditCard, Layers, User, X } from 'lucide-react';

interface ImplementationModuleProps {
    records: ImplementationRecord[];
    stats: ImplementationStats | null;
}

const COLUMN_DESCRIPTIONS: Record<string, string> = {
    'Treinamento': 'Nível de satisfação geral com o treinamento presencial.',
    'Equipe L&P': 'Satisfação com o suporte da equipe Lave & Pegue durante a implantação.',
    'Arquiteto': 'Avaliação do atendimento e suporte prestado pelo arquiteto.',
    'Máquinas': 'Satisfação geral com as máquinas adquiridas.',
    'Vendpago': 'Avaliação do sistema de pagamento Vendpago.',
    'SULTS': 'Facilidade para acompanhar etapas pelo SULTS.',
    'Stone': 'Processo de aquisição e suporte das maquininhas Stone.',
    'Técnico': 'Satisfação com o atendimento do técnico homologado.'
};

const ITEMS_PER_PAGE = 20;

const CATEGORIES = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutTemplate },
    { id: 'training', label: 'Treinamento', icon: Users, keys: { sat: 'trainingSat', ease: 'trainingEase', comment: 'trainingComment', partner: 'trainer' } },
    { id: 'team', label: 'Equipe L&P', icon: Rocket, keys: { sat: 'teamSat', ease: 'teamEase', comment: 'teamComment' } },
    { id: 'architect', label: 'Arquiteto', icon: PenTool, keys: { sat: 'architectSat', ease: 'architectEase', comment: 'architectComment' } },
    { id: 'machines', label: 'Máquinas', icon: Box, keys: { sat: 'machineSat', ease: 'machineEase', comment: 'machineComment', partner: 'machineSupplier' } },
    { id: 'vendpago', label: 'VendPago', icon: CreditCard, keys: { sat: 'vendpagoSat', ease: 'vendpagoEase', comment: 'vendpagoComment' } },
    { id: 'sults', label: 'SULTS', icon: Layers, keys: { sat: 'sultsSat', ease: 'sultsEase', comment: 'sultsComment' } },
    { id: 'stone', label: 'Stone', icon: Zap, keys: { sat: 'stoneSat', ease: 'stoneEase', comment: 'stoneComment' } },
    { id: 'technician', label: 'Técnico', icon: Wrench, keys: { sat: 'technicianSat', ease: 'technicianEase', comment: 'technicianComment', partner: 'technician' } },
];

const EASE_ORDER = ['Muito difícil', 'Difícil', 'Neutro', 'Fácil', 'Muito fácil'];
const EASE_COLORS = {
    'Muito difícil': '#ef4444',
    'Difícil': '#f97316',
    'Neutro': '#eab308',
    'Fácil': '#22d3ee',
    'Muito fácil': '#4ade80'
};

export const ImplementationModule: React.FC<ImplementationModuleProps> = ({ records, stats: initialStats }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('overview');
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

    // Get unique names for the dropdown
    const uniqueNames = useMemo(() => {
        return Array.from(new Set(records.map(r => r.name))).sort();
    }, [records]);

    const filteredNames = useMemo(() => {
        if (!searchTerm) return uniqueNames;
        return uniqueNames.filter(n => n.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [uniqueNames, searchTerm]);

    const filteredData = useMemo(() => {
        setVisibleCount(ITEMS_PER_PAGE);

        if (!searchTerm) return { records, stats: initialStats };

        const filteredRecords = records.filter(r => 
            r.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredRecords.length === 0) return { records: [], stats: null };

        const totalRecords = filteredRecords.length;
        const avg = (key: keyof ImplementationRecord) => {
            const valid = filteredRecords.filter(r => (r[key] as number) > 0);
            return valid.length ? valid.reduce((acc, r) => acc + (r[key] as number), 0) / valid.length : 0;
        };

        const machineSuppliers: Record<string, { count: number, avg: number }> = {};
        filteredRecords.forEach(r => {
            if (!r.machineSupplier) return;
            if (!machineSuppliers[r.machineSupplier]) machineSuppliers[r.machineSupplier] = { count: 0, avg: 0 };
            machineSuppliers[r.machineSupplier].count++;
            machineSuppliers[r.machineSupplier].avg += r.machineSat;
        });
        for (const s in machineSuppliers) machineSuppliers[s].avg /= machineSuppliers[s].count;

        return {
            records: filteredRecords,
            stats: {
                totalRecords,
                avgGeneral: avg('generalSat'),
                averages: {
                    training: avg('trainingSat'),
                    team: avg('teamSat'),
                    architect: avg('architectSat'),
                    machines: avg('machineSat'),
                    vendpago: avg('vendpagoSat'),
                    sults: avg('sultsSat'),
                    stone: avg('stoneSat'),
                    technician: avg('technicianSat')
                },
                machineSuppliers
            }
        };
    }, [records, initialStats, searchTerm]);

    const { records: displayRecords, stats } = filteredData;

    if (!stats || !displayRecords.length) return (
        <div className="flex flex-col items-center justify-center py-20 bg-[#1e1235]/30 rounded-2xl border border-white/5 border-dashed">
            <Filter className="w-16 h-16 text-white/10 mb-4" />
            <p className="text-white/40 text-lg">Nenhum dado encontrado.</p>
            {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm font-medium underline">Limpar Filtro</button>}
        </div>
    );

    // --- Overview Logic ---
    const radarData = [
        { subject: 'Treinamento', A: parseFloat(stats.averages.training.toFixed(1)), fullMark: 5 },
        { subject: 'Equipe L&P', A: parseFloat(stats.averages.team.toFixed(1)), fullMark: 5 },
        { subject: 'Arquiteto', A: parseFloat(stats.averages.architect.toFixed(1)), fullMark: 5 },
        { subject: 'Máquinas', A: parseFloat(stats.averages.machines.toFixed(1)), fullMark: 5 },
        { subject: 'Vendpago', A: parseFloat(stats.averages.vendpago.toFixed(1)), fullMark: 5 },
        { subject: 'SULTS', A: parseFloat(stats.averages.sults.toFixed(1)), fullMark: 5 },
        { subject: 'Stone', A: parseFloat(stats.averages.stone.toFixed(1)), fullMark: 5 },
        { subject: 'Técnico', A: parseFloat(stats.averages.technician.toFixed(1)), fullMark: 5 },
    ];

    const CustomRadarTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const subject = payload[0].payload.subject;
            const description = COLUMN_DESCRIPTIONS[subject] || '';
            const value = payload[0].value;
            return (
                <div className="bg-[#1a1025] border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-xl max-w-[250px]">
                    <p className="font-bold text-fuchsia-400 mb-1">{subject}</p>
                    <p className="text-white/60 text-xs italic mb-2 leading-relaxed">"{description}"</p>
                    <div className="flex items-center justify-between border-t border-white/10 pt-2">
                        <span className="text-xs text-white">Média:</span>
                        <span className="font-bold text-white text-lg">{value} / 5</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    // --- Specific Category Analysis Render ---
    const renderCategoryAnalysis = (categoryKey: string) => {
        const config = CATEGORIES.find(c => c.id === categoryKey);
        if (!config || !config.keys) return null;

        const keys = config.keys;
        const categoryRecords = displayRecords.filter(r => (r as any)[keys.sat] > 0);
        const paginatedRecords = categoryRecords.slice(0, visibleCount);

        // Stats for this category
        const avg = categoryRecords.reduce((acc, r) => acc + (r as any)[keys.sat], 0) / (categoryRecords.length || 1);
        
        // CSAT Distribution
        const distribution = [0,0,0,0,0,0]; 
        categoryRecords.forEach(r => {
            const score = Math.round((r as any)[keys.sat]);
            if (score >= 1 && score <= 5) distribution[score]++;
        });
        const distData = Array.from({length: 5}, (_, i) => ({ name: `${i+1} ★`, val: distribution[i+1] }));

        // Effort Distribution (CES)
        const effortCounts: Record<string, number> = {};
        categoryRecords.forEach(r => {
            const ease = (r as any)[keys.ease] as string;
            if (!ease) return;
            const normalized = EASE_ORDER.find(e => ease.toLowerCase().includes(e.toLowerCase())) || 'Outros';
            effortCounts[normalized] = (effortCounts[normalized] || 0) + 1;
        });
        const effortData = EASE_ORDER.map(label => ({
            name: label,
            val: effortCounts[label] || 0,
            color: (EASE_COLORS as any)[label] || '#9ca3af'
        })).filter(d => d.val > 0); // Only show present values or keep all for scale? Let's keep strict scale.

        // Partner Analysis (if applicable)
        let partnerData: any[] = [];
        if (keys.partner) {
            const pMap = new Map<string, {sum:number, count:number}>();
            categoryRecords.forEach(r => {
                const pName = (r as any)[keys.partner as string];
                if (pName) {
                    const curr = pMap.get(pName) || {sum:0, count:0};
                    pMap.set(pName, {sum: curr.sum + (r as any)[keys.sat], count: curr.count + 1});
                }
            });
            partnerData = Array.from(pMap.entries()).map(([name, d]) => ({
                name,
                avg: parseFloat((d.sum/d.count).toFixed(1)),
                count: d.count
            })).sort((a,b) => b.avg - a.avg);
        }

        return (
            <div className="animate-fadeIn space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <MetricCard title={`Satisfação Média`} value={avg.toFixed(1)} subtitle="Escala 1 a 5" icon={<Star className="w-5 h-5 text-yellow-400" />} />
                    <MetricCard title="Total de Respostas" value={categoryRecords.length} subtitle="Franqueados" icon={<Box className="w-5 h-5 text-cyan-400" />} />
                    
                    {/* CSAT Chart */}
                    <div className="bg-[#1e1235]/60 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl">
                        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Notas (1-5)</h4>
                        <div className="h-20 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={distData}>
                                    <Bar dataKey="val" radius={[2, 2, 0, 0]}>
                                        {distData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index >= 3 ? '#4ade80' : index === 2 ? '#facc15' : '#f87171'} />
                                        ))}
                                    </Bar>
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1a1025', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Effort Chart */}
                    <div className="bg-[#1e1235]/60 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-xl">
                        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Esforço (Facilidade)</h4>
                        <div className="h-20 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={effortData}>
                                    <Bar dataKey="val" radius={[2, 2, 0, 0]}>
                                        {effortData.map((entry, index) => (
                                            <Cell key={`cell-eff-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1a1025', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '12px' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-[#1e1235]/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2"><config.icon className="w-5 h-5 text-fuchsia-400" />Detalhamento: {config.label}</h3>
                            <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded">Exibindo {paginatedRecords.length} de {categoryRecords.length}</span>
                        </div>
                        
                        <div className="overflow-x-auto" data-export-scroll="true">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/40">
                                        <th className="p-4 w-1/4">Franqueado / Unidade</th>
                                        <th className="p-4 text-center w-24">Nota</th>
                                        <th className="p-4 w-1/6">Esforço</th>
                                        {keys.partner && <th className="p-4 w-1/6">Responsável</th>}
                                        <th className="p-4">Comentário</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {paginatedRecords.map((r, idx) => {
                                        const score = (r as any)[keys.sat];
                                        const ease = (r as any)[keys.ease] as string;
                                        const comment = (r as any)[keys.comment];
                                        const partner = keys.partner ? (r as any)[keys.partner as string] : null;
                                        
                                        // Determine ease color
                                        let easeColor = 'text-white/50 border-white/10';
                                        if (ease) {
                                            if (ease.toLowerCase().includes('muito fácil')) easeColor = 'text-green-400 border-green-500/30 bg-green-500/10';
                                            else if (ease.toLowerCase().includes('fácil')) easeColor = 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
                                            else if (ease.toLowerCase().includes('difícil')) easeColor = 'text-orange-400 border-orange-500/30 bg-orange-500/10';
                                            else if (ease.toLowerCase().includes('muito difícil')) easeColor = 'text-red-400 border-red-500/30 bg-red-500/10';
                                            else if (ease.toLowerCase().includes('neutro')) easeColor = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
                                        }

                                        return (
                                            <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-4">
                                                    <div className="text-sm font-bold text-white group-hover:text-fuchsia-400 transition-colors">{(r as any).name}</div>
                                                    <div className="text-[10px] text-white/40 flex items-center gap-1"><Store className="w-3 h-3" /> {r.unit}</div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center font-bold text-sm shadow-lg border border-white/10 ${score >= 4 ? 'bg-green-500 text-white' : score === 3 ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'}`}>
                                                        {score}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm">
                                                    {ease ? (
                                                        <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${easeColor}`}>
                                                            {ease}
                                                        </span>
                                                    ) : <span className="text-white/20">-</span>}
                                                </td>
                                                {keys.partner && (
                                                    <td className="p-4 text-sm text-white/70 font-mono">
                                                        {partner || '-'}
                                                    </td>
                                                )}
                                                <td className="p-4 text-sm text-white/60 italic">
                                                    {comment ? (
                                                        <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-white/80">
                                                            "{comment}"
                                                        </div>
                                                    ) : <span className="text-white/20">-</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {visibleCount < categoryRecords.length && (
                            <div className="p-4 flex justify-center">
                                <button onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)} className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/70 hover:text-white transition-all">
                                    <ChevronDown className="w-4 h-4" /> Carregar mais
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Partner Ranking Sidebar (Only if partner key exists) */}
                    {keys.partner && partnerData.length > 0 && (
                        <div className="lg:col-span-1 bg-[#1e1235]/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col h-full">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><User className="w-5 h-5 text-cyan-400" />Ranking: {config.label === 'Máquinas' ? 'Fornecedor' : 'Responsável'}</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <div className="space-y-3">
                                    {partnerData.map((p, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                            <div>
                                                <div className="text-sm font-bold text-white">{p.name}</div>
                                                <div className="text-[10px] text-white/40">{p.count} avaliações</div>
                                            </div>
                                            <div className={`px-2 py-1 rounded text-xs font-bold ${p.avg >= 4.5 ? 'text-green-400 bg-green-500/10' : 'text-white bg-white/10'}`}>
                                                {p.avg} ★
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 animate-fadeIn pb-10">
            {/* Search & Tabs */}
            <div className="sticky top-0 z-30 flex flex-col gap-4">
                <div className="bg-[#1e1235]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 shadow-lg" ref={dropdownRef}>
                    <div className="flex items-center gap-2 text-fuchsia-400">
                        <Filter className="w-5 h-5" />
                        <span className="text-sm font-semibold uppercase tracking-wider hidden md:block">Filtrar por Pessoa</span>
                    </div>
                    
                    {/* Dropdown Filter */}
                    <div className="relative flex-1 w-full">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className={`h-4 w-4 transition-colors ${isDropdownOpen ? 'text-fuchsia-400' : 'text-white/40'}`} /></div>
                            <input 
                                type="text" 
                                placeholder="Selecione um franqueado..." 
                                className="block w-full pl-10 pr-10 py-2.5 border border-white/10 rounded-lg leading-5 bg-[#150a25] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500/50 sm:text-sm transition-all shadow-inner hover:bg-[#1a0e2e] cursor-pointer" 
                                value={searchTerm} 
                                onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} 
                                onFocus={() => setIsDropdownOpen(true)} 
                                onClick={() => setIsDropdownOpen(true)} 
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer gap-2">
                                {searchTerm && <X className="h-4 w-4 text-white/40 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setSearchTerm(''); setIsDropdownOpen(false); }} />}
                                <ChevronDown className={`h-4 w-4 text-white/40 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-fuchsia-400' : ''}`} />
                            </div>
                        </div>
                        {isDropdownOpen && (
                            <div className="absolute z-50 mt-2 w-full bg-[#1e1235] border border-white/20 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar animate-slideDown backdrop-blur-xl">
                                {filteredNames.length > 0 ? (
                                    <div className="py-2">
                                        {filteredNames.map((name, idx) => (
                                            <button key={idx} onClick={() => { setSearchTerm(name); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between group transition-all hover:bg-white/10 ${searchTerm === name ? 'bg-fuchsia-600/20 text-fuchsia-200' : 'text-white/80'}`}>
                                                <span className="truncate">{name}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-4 py-4 text-center text-white/40 text-xs">Nenhum resultado encontrado</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${activeCategory === cat.id ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white border-white/20 shadow-lg' : 'bg-[#1e1235]/60 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'}`}>
                            <cat.icon className="w-3 h-3" /> {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Switcher */}
            {activeCategory === 'overview' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <MetricCard title="Satisfação Geral" value={stats.avgGeneral.toFixed(1)} subtitle="Média Geral (1-5)" icon={<Star className="w-5 h-5 text-yellow-400" />} />
                        <MetricCard title="Total de Implantações" value={stats.totalRecords} subtitle={searchTerm ? "Registros Filtrados" : "Unidades avaliadas"} icon={<Rocket className="w-5 h-5 text-fuchsia-400" />} />
                        <MetricCard title="Máquinas (Satisfação)" value={stats.averages.machines.toFixed(1)} subtitle="Média do Setor" icon={<Box className="w-5 h-5 text-cyan-400" />} />
                        <MetricCard title="Treinamento" value={stats.averages.training.toFixed(1)} subtitle="Nota Média" icon={<Users className="w-5 h-5 text-green-400" />} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-[#1e1235]/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-[50px]"></div>
                            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><LayoutTemplate className="w-5 h-5 text-fuchsia-400" />Ecosistema de Implantação</h3>
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                        <PolarGrid stroke="#ffffff20" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: 'transparent' }} axisLine={false} />
                                        <Radar name="Média" dataKey="A" stroke="#d946ef" strokeWidth={3} fill="#d946ef" fillOpacity={0.4} />
                                        <Tooltip content={<CustomRadarTooltip />} cursor={{ strokeWidth: 0 }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        {/* Placeholder for Recent Comments or other overview metrics */}
                        <div className="bg-[#1e1235]/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                             <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-white" />Feedbacks Recentes</h3>
                             <div className="space-y-4">
                                {displayRecords.slice(0, 5).map((r, i) => (
                                    <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/5">
                                        <div className="flex justify-between text-xs mb-1"><span className="font-bold text-white">{r.name}</span><span className="text-yellow-400 font-bold">{r.generalSat} ★</span></div>
                                        <div className="text-[10px] text-white/40">{r.unit}</div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </>
            ) : (
                renderCategoryAnalysis(activeCategory)
            )}
        </div>
    );
};
