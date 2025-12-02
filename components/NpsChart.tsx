import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Sector } from 'recharts';
import { NpsCycleStats } from '../types';

interface NpsChartProps {
  stats: NpsCycleStats;
  distribution?: { score: number; count: number }[];
  trendData?: any[];
}

const NEON_GREEN = '#4ade80';
const NEON_YELLOW = '#facc15';
const NEON_RED = '#f87171';
const NEON_CYAN = '#22d3ee'; // Changed to Cyan for Quality Zone

export const NpsGauge: React.FC<{ score: number }> = ({ score }) => {
    // NPS Scale: -100 to 100 (Total range 200)
    // Critical: -100 to 0 (50% of range)
    // Improvement: 0 to 50 (25% of range)
    // Quality: 50 to 75 (12.5% of range)
    // Excellence: 75 to 100 (12.5% of range)
    
    const data = [
        { name: 'Crítica (-100 a 0)', value: 100, color: NEON_RED }, 
        { name: 'Aperfeiçoamento (0 a 50)', value: 50, color: NEON_YELLOW },
        { name: 'Qualidade (50 a 75)', value: 25, color: NEON_CYAN },
        { name: 'Excelência (75 a 100)', value: 25, color: NEON_GREEN }
    ];
    
    const normalizedScore = Math.max(-100, Math.min(100, score));
    // Rotation Logic:
    // -100 -> 180deg (Left)
    // 0    -> 270deg (Up)
    // 100  -> 360deg (Right)
    const rotation = 180 + ((normalizedScore + 100) / 200 * 180);

    return (
        <div className="relative h-48 w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="70%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1025', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                        itemStyle={{ color: 'white' }}
                    />
                </PieChart>
            </ResponsiveContainer>
            
            {/* Needle */}
            <div 
                className="absolute top-[70%] left-1/2 w-[110px] h-[4px] bg-white origin-left rounded-full shadow-[0_0_10px_white] transition-all duration-1000 ease-out"
                style={{ transform: `rotate(${rotation}deg) translateY(-50%)` }}
            >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg"></div>
            </div>

            <div className="absolute top-[55%] text-center">
                <span className={`text-5xl font-bold drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] ${
                    score >= 75 ? 'text-green-400' :
                    score >= 50 ? 'text-cyan-400' :
                    score >= 0 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                    {score.toFixed(2).replace('.', ',')}
                </span>
            </div>
             <div className="absolute bottom-4 flex justify-between w-full px-10 text-xs text-slate-400 font-medium">
                <span>-100</span>
                <span>100</span>
            </div>
            {/* Zone Label */}
            <div className="absolute bottom-0 text-xs uppercase tracking-widest text-white/50">
                {score >= 75 ? 'Zona de Excelência' :
                 score >= 50 ? 'Zona de Qualidade' :
                 score >= 0 ? 'Zona de Aperfeiçoamento' : 'Zona Crítica'}
            </div>
        </div>
    );
};

// Interactive Shape for Donut Chart
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill="#fff" className="text-xl font-bold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 15} dy={8} textAnchor="middle" fill="#ffffff80" className="text-sm">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius}
        fill={fill}
        opacity={0.6}
      />
    </g>
  );
};

export const NpsDonutChart: React.FC<NpsChartProps> = ({ stats }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const data = [
    { name: 'Detrator', value: stats.countDetractors },
    { name: 'Neutro', value: stats.countNeutrals },
    { name: 'Promotor', value: stats.countPromoters },
  ];
  
  const total = stats.totalResponded;

  return (
    <div className="h-72 w-full flex items-center gap-8">
      {/* Chart */}
      <div className="flex-1 h-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                onMouseEnter={onPieEnter}
              >
                <Cell fill={NEON_RED} />
                <Cell fill={NEON_YELLOW} />
                <Cell fill={NEON_GREEN} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
      </div>
      
      {/* Custom Legend (Interactive) */}
       <div className="flex flex-col gap-4 w-48 pr-4">
            <div 
                className={`flex items-center justify-between p-3 rounded-xl border relative overflow-hidden group transition-all cursor-pointer ${activeIndex === 2 ? 'bg-green-500/20 border-green-500 shadow-[0_0_15px_rgba(74,222,128,0.3)]' : 'bg-green-500/10 border-green-500/30'}`}
                onMouseEnter={() => setActiveIndex(2)}
            >
                <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors"></div>
                <div className="relative z-10 flex flex-col">
                     <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Promotor</span>
                     <span className="text-white font-bold text-lg">{stats.countPromoters}</span>
                </div>
                <div className="relative z-10 text-green-300 text-sm font-medium">
                    {total > 0 ? ((stats.countPromoters/total)*100).toFixed(1) : 0}%
                </div>
            </div>

            <div 
                className={`flex items-center justify-between p-3 rounded-xl border relative overflow-hidden group transition-all cursor-pointer ${activeIndex === 1 ? 'bg-yellow-500/20 border-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'bg-yellow-500/10 border-yellow-500/30'}`}
                onMouseEnter={() => setActiveIndex(1)}
            >
                 <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors"></div>
                 <div className="relative z-10 flex flex-col">
                     <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Neutro</span>
                     <span className="text-white font-bold text-lg">{stats.countNeutrals}</span>
                </div>
                <div className="relative z-10 text-yellow-300 text-sm font-medium">
                    {total > 0 ? ((stats.countNeutrals/total)*100).toFixed(1) : 0}%
                </div>
            </div>

            <div 
                className={`flex items-center justify-between p-3 rounded-xl border relative overflow-hidden group transition-all cursor-pointer ${activeIndex === 0 ? 'bg-red-500/20 border-red-500 shadow-[0_0_15px_rgba(248,113,113,0.3)]' : 'bg-red-500/10 border-red-500/30'}`}
                onMouseEnter={() => setActiveIndex(0)}
            >
                 <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors"></div>
                 <div className="relative z-10 flex flex-col">
                     <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Detrator</span>
                     <span className="text-white font-bold text-lg">{stats.countDetractors}</span>
                </div>
                <div className="relative z-10 text-red-300 text-sm font-medium">
                    {total > 0 ? ((stats.countDetractors/total)*100).toFixed(1) : 0}%
                </div>
            </div>
       </div>
    </div>
  );
};

// Detailed Tooltip for Histogram
const HistogramTooltip = ({ active, payload, label, total }: any) => {
    if (active && payload && payload.length) {
        const count = payload[0].value;
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
        
        let color = '#fff';
        const score = parseInt(label);
        if (score <= 6) color = NEON_RED;
        else if (score <= 8) color = NEON_YELLOW;
        else color = NEON_GREEN;

        return (
            <div className="bg-[#1a1025] border border-white/20 p-3 rounded-lg shadow-2xl backdrop-blur-xl">
                <p className="font-bold text-white mb-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }}></span>
                    Nota {label}
                </p>
                <div className="flex items-end gap-2 text-sm">
                    <span className="text-2xl font-bold text-white">{count}</span>
                    <span className="text-white/50 mb-1">votos</span>
                </div>
                <div className="text-xs text-white/70 mt-1 border-t border-white/10 pt-1">
                    Representa <span className="text-fuchsia-300 font-bold">{percentage}%</span> do total
                </div>
            </div>
        );
    }
    return null;
};

export const ScoreHistogram: React.FC<{ data: { score: number; count: number }[], total: number }> = ({ data, total }) => {
    const sortedData = [...data].sort((a, b) => a.score - b.score);

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                    <XAxis 
                        dataKey="score" 
                        stroke="#ffffff50" 
                        tick={{fill: '#ffffff50', fontSize: 12}} 
                        tickLine={false} 
                        axisLine={false} 
                    />
                    <YAxis 
                        stroke="#ffffff50" 
                        tick={{fill: '#ffffff50', fontSize: 12}} 
                        tickLine={false} 
                        axisLine={false} 
                    />
                    <Tooltip 
                        content={<HistogramTooltip total={total} />}
                        cursor={{fill: '#ffffff10'}}
                    />
                    <Bar 
                        dataKey="count" 
                        radius={[4, 4, 0, 0]}
                    >
                        {sortedData.map((entry, index) => {
                            const score = entry.score;
                            const color = score <= 6 ? '#d946ef' : score <= 8 ? '#e879f9' : '#f0abfc'; // Gradient of purples
                            return <Cell key={`cell-${index}`} fill={color} className="hover:opacity-80 transition-opacity" />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const NpsScale: React.FC = () => {
    return (
        <div className="w-full mt-4">
            <div className="flex w-full h-12 rounded-lg overflow-hidden font-bold text-white text-lg shadow-lg border border-white/10">
                <div className="flex-1 bg-[#ef4444] flex items-center justify-center border-r border-black/20 hover:brightness-110 transition-all cursor-crosshair relative group">
                    0
                    <div className="absolute -top-8 bg-black/80 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Detrator</div>
                </div>
                <div className="flex-1 bg-[#ef4444] flex items-center justify-center border-r border-black/20 hover:brightness-110 transition-all cursor-crosshair">1</div>
                <div className="flex-1 bg-[#ef4444] flex items-center justify-center border-r border-black/20 hover:brightness-110 transition-all cursor-crosshair">2</div>
                <div className="flex-1 bg-[#ef4444] flex items-center justify-center border-r border-black/20 hover:brightness-110 transition-all cursor-crosshair">3</div>
                <div className="flex-1 bg-[#ef4444] flex items-center justify-center border-r border-black/20 hover:brightness-110 transition-all cursor-crosshair">4</div>
                <div className="flex-1 bg-[#ef4444] flex items-center justify-center border-r border-black/20 hover:brightness-110 transition-all cursor-crosshair">5</div>
                <div className="flex-1 bg-[#ef4444] flex items-center justify-center border-r border-black/20 hover:brightness-110 transition-all cursor-crosshair">6</div>
                <div className="flex-1 bg-[#eab308] flex items-center justify-center border-r border-black/20 hover:brightness-110 transition-all cursor-crosshair">7</div>
                <div className="flex-1 bg-[#eab308] flex items-center justify-center border-r border-black/20 hover:brightness-110 transition-all cursor-crosshair">8</div>
                <div className="flex-1 bg-[#22c55e] flex items-center justify-center border-r border-black/20 hover:brightness-110 transition-all cursor-crosshair">9</div>
                <div className="flex-1 bg-[#22c55e] flex items-center justify-center hover:brightness-110 transition-all cursor-crosshair">10</div>
            </div>
            <div className="flex justify-between mt-2 text-xs uppercase tracking-wider font-semibold">
                <span className="text-red-400 pl-4">Detrator (0-6)</span>
                <span className="text-yellow-400">Neutro (7-8)</span>
                <span className="text-green-400 pr-4">Promotor (9-10)</span>
            </div>
        </div>
    );
}

export const TrendLineChart: React.FC<{data: any[]}> = ({ data }) => {
    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                    <XAxis dataKey="name" stroke="#ffffff50" tick={{fill: '#ffffff50', fontSize: 10}} tickLine={false} axisLine={false} />
                    <YAxis stroke="#ffffff50" tick={{fill: '#ffffff50', fontSize: 10}} tickLine={false} axisLine={false} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1025', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#4ade80" strokeWidth={2} dot={{fill: '#4ade80', r: 4}} activeDot={{r: 6, fill: '#fff'}} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};