import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon }) => {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-[#1e1235]/60 border-white/10 backdrop-blur-md transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] group">
      {/* Brand Gradient Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 to-cyan-500 opacity-50 group-hover:opacity-100 transition-opacity" />
      
      <div className="p-5 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium uppercase tracking-wider text-purple-200/70">{title}</h3>
            {icon && <div className="text-fuchsia-400 group-hover:text-cyan-400 transition-colors">{icon}</div>}
        </div>
        
        <div>
            <div className="text-4xl font-bold text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                {value}
            </div>
            {subtitle && (
                <p className="text-xs mt-2 font-light border-t pt-2 text-purple-300/60 border-white/5">
                    {subtitle}
                </p>
            )}
        </div>
      </div>
    </div>
  );
};