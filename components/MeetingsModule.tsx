import React, { useState, useMemo } from 'react';
import { MeetingRecord, MeetingStats } from '../types';
import { MetricCard } from './MetricCard';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Legend } from 'recharts';
import { User, Users, Star, MessageSquare, Filter, Trophy, Activity, Target, HelpCircle, ChevronDown } from 'lucide-react';

interface MeetingsModuleProps {
    stats: MeetingStats | null;
    records: MeetingRecord[];
}

const CRITERIA_DESCRIPTIONS: Record<string, string> = {
    'Relevância': 'O conteúdo discutido na reunião foi relevante para as necessidades da sua unidade?',
    'Profundidade': 'O nível de profundidade da reunião foi adequado para sua realidade?',
    'Expectativa': 'A reunião atendeu às suas expectativas de acompanhamento e suporte?',
    'Conhecimento': 'O consultor responsável demonstrou conhecimento sobre os assuntos tratados?',
    'Clareza': 'A comunicação do consultor foi clara e compreensível?',
    'Eficácia': 'Suas perguntas e dúvidas foram respondidas de forma eficaz?'
};

export const MeetingsModule: React.FC<MeetingsModuleProps> = ({ stats: initialStats, records }) => {
    const [selectedConsultant, setSelectedConsultant] = useState<string>('All');
    const [selectedScore, setSelectedScore] = useState<string>('All');
    const [visibleFeedbackCount, setVisibleFeedbackCount] = useState(20);

    const filteredData = useMemo(() => {
        return records.filter(r => {
            const matchConsultant = selectedConsultant === 'All' || r.consultant === selectedConsultant;
            const matchScore = selectedScore === 'All' || r.csat === parseInt(selectedScore);
            return matchConsultant && matchScore;
        });
    }, [records, selectedConsultant, selectedScore]);

    const dynamicStats = useMemo(() => {
        const total = filteredData.length;
        if (total === 0) return null;

        const sumCsat = filteredData.reduce((acc, r) => acc + r.csat, 0);
        const avgCsat = sumCsat / total;

        const consMap = new Map<string, { count: number, sumCsat: number, sumTech: number }>();
        
        filteredData.forEach(r => {
            const curr = consMap.get(r.consultant) || { count: 0, sumCsat: 0, sumTech: 0 };
            const techAvg = (r.relevance + r.depth + r.expectations + r.knowledge + r.clarity + r.efficacy) / 6;
            
            consMap.set(r.consultant, {
                count: curr.count + 1,
                sumCsat: curr.sumCsat + r.csat,
                sumTech: curr.sumTech + techAvg
            });
        });

        const consultantMatrix = Array.from(consMap.entries()).map(([name, data]) => ({
            name,
            count: data.count,
            avgCsat: data.sumCsat / data.count,
            avgTech: data.sumTech / data.count
        })).sort((a, b) => b.avgCsat - a.avgCsat);

        const topVolume = consultantMatrix.length > 0 ? consultantMatrix.reduce((prev, current) => (prev.count > current.count) ? prev : current).name : 'N/A';

        const criteriaSums = { relevance: 0, depth: 0, expectations: 0, knowledge: 0, clarity: 0, efficacy: 0 };
        filteredData.forEach(r => {
            criteriaSums.relevance += r.relevance;
            criteriaSums.depth += r.depth;
            criteriaSums.expectations += r.expectations;
            criteriaSums.knowledge += r.knowledge;
            criteriaSums.clarity += r.clarity;
            criteriaSums.efficacy += r.efficacy;
        });

        const radarData = [
            { subject: 'Relevância', A: parseFloat((criteriaSums.relevance / total).toFixed(1)), fullMark: 5 },
            { subject: 'Profundidade', A: parseFloat((criteriaSums.depth / total).toFixed(1)), fullMark: 5 },
            { subject: 'Expectativa', A: parseFloat((criteriaSums.expectations / total).toFixed(1)), fullMark: 5 },
            { subject: 'Conhecimento', A: parseFloat((criteriaSums.knowledge / total).toFixed(1)), fullMark: 5 },
            { subject: 'Clareza', A: parseFloat((criteriaSums.clarity / total).toFixed(1)), fullMark: 5 },
            { subject: 'Eficácia', A: parseFloat((criteriaSums.efficacy / total).toFixed(1)), fullMark: 5 },
        ];

        return { total, avgCsat, topVolume, consultantMatrix, radarData };
    }, [filteredData]);

    const uniqueConsultants = Array.from(new Set(records.map(r => r.consultant))).sort();

    if (!records.length) return <div className="text-center text-white/50 p-10">Carregue a planilha de Reuniões CS para visualizar os dados.</div>;

    const CustomRadarTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const subject = payload[0].payload.subject;
            const description = CRITERIA_DESCRIPTIONS[subject] || '';
            const value = payload[0].value;
            return (
                <div className="bg-[#1a1025] border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-xl max-w-[250px]">
                    <p className="font-bold text-cyan-400 mb-1">{subject}</p>
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

    return (
        <div className="flex flex-col gap-6 animate-fadeIn pb-10">
            <div className="bg-[#1e1235]/60 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 shadow-lg">
                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-fuchsia-400" />
                    <span className="text-sm font-semibold text-white uppercase tracking-wider">Filtros Estratégicos</span>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <select value={selectedConsultant} onChange={(e) => { setSelectedConsultant(e.target.value); setVisibleFeedbackCount(20); }} className="bg-[#150a25] border border-white/10 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors w-full md:w-48 cursor-pointer">
                        <option value="All">Todos Consultores</option>
                        {uniqueConsultants.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={selectedScore} onChange={(e) => { setSelectedScore(e.target.value); setVisibleFeedbackCount(20); }} className="bg-[#150a25] border border-white/10 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors w-full md:w-48 cursor-pointer">
                        <option value="All">Todas Notas</option>
                        <option value="5">5 Estrelas</option>
                        <option value="4">4 Estrelas</option>
                        <option value="3">3 Estrelas</option>
                        <option value="2">2 Estrelas</option>
                        <option value="1">1 Estrela</option>
                    </select>
                </div>
            </div>

            {!dynamicStats ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[#1e1235]/30 rounded-2xl border border-white/5 border-dashed">
                    <Filter className="w-16 h-16 text-white/10 mb-4" />
                    <p className="text-white/40 text-lg">Nenhum dado encontrado com os filtros selecionados.</p>
                    <button onClick={() => { setSelectedConsultant('All'); setSelectedScore('All'); }} className="mt-4 text-cyan-400 hover:text-cyan-300 text-sm font-medium underline underline-offset-4">Limpar Filtros</button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MetricCard title="Média CSAT" value={dynamicStats.avgCsat.toFixed(1)} subtitle="Satisfação Geral (1-5)" icon={<Star className="w-5 h-5 text-yellow-400" />} />
                        <MetricCard title="Total de Avaliações" value={dynamicStats.total} subtitle="Reuniões analisadas" icon={<Activity className="w-5 h-5 text-fuchsia-400" />} />
                        <MetricCard title="Destaque" value={dynamicStats.topVolume} subtitle="Mais reuniões avaliadas" icon={<Trophy className="w-5 h-5 text-cyan-400" />} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-[#1e1235]/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col">
                            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><Users className="w-5 h-5 text-fuchsia-400" />Matriz de Performance</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
                                <div className="grid grid-cols-12 text-[10px] uppercase text-white/40 tracking-wider mb-2 border-b border-white/10 pb-2 font-bold">
                                    <div className="col-span-4">Consultor</div>
                                    <div className="col-span-4 text-center">Volume</div>
                                    <div className="col-span-2 text-center">CSAT</div>
                                    <div className="col-span-2 text-right">Técnico</div>
                                </div>
                                <div className="space-y-3">
                                    {dynamicStats.consultantMatrix.map((c, idx) => {
                                        const maxVol = Math.max(...dynamicStats.consultantMatrix.map(m => m.count));
                                        const volPercent = (c.count / maxVol) * 100;
                                        return (
                                            <div key={idx} className="grid grid-cols-12 items-center hover:bg-white/5 p-2 rounded-lg transition-colors group">
                                                <div className="col-span-4 flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'}`}>{c.name.charAt(0)}</div>
                                                    <span className="text-sm font-medium text-white truncate">{c.name}</span>
                                                </div>
                                                <div className="col-span-4 px-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-fuchsia-500 rounded-full" style={{ width: `${volPercent}%` }}></div></div>
                                                        <span className="text-[10px] text-white/50 w-6 text-right">{c.count}</span>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 text-center">
                                                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${c.avgCsat >= 4.8 ? 'bg-green-500/20 text-green-400' : c.avgCsat >= 4.5 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{c.avgCsat.toFixed(1)} <Star className="w-3 h-3" /></div>
                                                </div>
                                                <div className="col-span-2 text-right"><span className="text-sm font-mono text-white/70">{c.avgTech.toFixed(1)}</span></div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1e1235]/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px]"></div>
                            <div className="flex justify-between items-start mb-2">
                                <div><h3 className="text-lg font-semibold text-white flex items-center gap-2"><Target className="w-5 h-5 text-cyan-400" />Radar de Qualidade</h3><p className="text-xs text-white/40 mb-4">Análise multidimensional dos critérios técnicos (Escala 1-5)</p></div>
                                <div className="text-white/20 hover:text-white/60 transition-colors" title="Passe o mouse sobre os pontos para ver a pergunta original"><HelpCircle className="w-4 h-4" /></div>
                            </div>
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={dynamicStats.radarData}>
                                        <PolarGrid stroke="#ffffff20" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: 'transparent' }} axisLine={false} />
                                        <Radar name="Média" dataKey="A" stroke="#22d3ee" strokeWidth={2} fill="#22d3ee" fillOpacity={0.3} />
                                        <Tooltip content={<CustomRadarTooltip />} cursor={{ strokeWidth: 0 }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#1e1235]/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2"><MessageSquare className="w-5 h-5 text-purple-400" />Feedbacks Qualitativos</h3>
                            <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded">Últimos registros</span>
                        </div>
                        <div className="grid gap-4" data-export-scroll="true">
                            {filteredData.filter(r => r.comment).slice(0, visibleFeedbackCount).map((rec, idx) => (
                                <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-lg">{rec.consultant.charAt(0)}</div>
                                            <div><div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">{rec.consultant}</div><div className="text-[10px] text-white/40">{rec.timestamp}</div></div>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-md text-xs font-bold border ${rec.csat >= 5 ? 'bg-green-500/10 border-green-500/30 text-green-400' : rec.csat >= 3 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>{rec.csat} ★</div>
                                    </div>
                                    <p className="text-sm text-white/80 leading-relaxed pl-12 border-l-2 border-white/10 ml-4 italic">"{rec.comment}"</p>
                                </div>
                            ))}
                            {filteredData.filter(r => r.comment).length === 0 && <div className="text-center text-white/30 py-8 flex flex-col items-center gap-2"><MessageSquare className="w-8 h-8 opacity-20" /><span>Nenhum comentário registrado.</span></div>}
                            {visibleFeedbackCount < filteredData.filter(r => r.comment).length && (
                                <div className="p-4 flex justify-center"><button onClick={() => setVisibleFeedbackCount(prev => prev + 20)} className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/70 hover:text-white transition-all"><ChevronDown className="w-4 h-4" />Carregar mais</button></div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};