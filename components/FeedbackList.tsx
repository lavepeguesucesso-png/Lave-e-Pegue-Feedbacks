import React, { useState, useMemo } from 'react';
import { NpsRecord } from '../types';
import { Search, Filter, ChevronDown } from 'lucide-react';

interface FeedbackListProps {
  records: NpsRecord[];
}

const ITEMS_PER_PAGE = 20;

export const FeedbackList: React.FC<FeedbackListProps> = ({ records }) => {
  const [filter, setFilter] = useState<'All' | 'Promotor' | 'Neutro' | 'Detrator'>('All');
  const [scoreFilter, setScoreFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Reset visible count when filters change
  useMemo(() => {
      setVisibleCount(ITEMS_PER_PAGE);
  }, [filter, scoreFilter, search]);

  const filtered = useMemo(() => {
      return records.filter(r => {
        const matchesFilter = filter === 'All' || r.status === filter;
        
        let matchesScore = true;
        if (scoreFilter !== 'All') {
            if (scoreFilter === 'nan') {
                matchesScore = isNaN(r.score);
            } else {
                matchesScore = r.score === parseInt(scoreFilter);
            }
        }

        const matchesSearch = r.respondentName.toLowerCase().includes(search.toLowerCase()) || 
                              r.unitName.toLowerCase().includes(search.toLowerCase()) ||
                              r.justification.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch && matchesScore;
      });
  }, [records, filter, scoreFilter, search]);

  const visibleRecords = filtered.slice(0, visibleCount);

  const handleShowMore = () => {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  return (
    <div className="bg-[#1e1235]/80 backdrop-blur-md rounded-xl shadow-lg border border-white/10 flex flex-col h-[650px] overflow-hidden transition-all duration-500">
      
      {/* Header Controls */}
      <div className="p-4 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 bg-fuchsia-900/20">
         <h2 className="text-lg font-semibold text-fuchsia-300">Justificativas e Feedbacks</h2>
         <div className="flex gap-2 w-full md:w-auto flex-wrap">
             <div className="relative flex-1 md:flex-none min-w-[200px]">
                 <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="w-full bg-[#150a25] border border-white/10 rounded-lg py-2 pl-3 pr-8 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                 />
                 <Search className="absolute right-2 top-2.5 w-4 h-4 text-white/40" />
             </div>
             
             <select 
                className="bg-[#150a25] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
             >
                <option value="All">Todos Status</option>
                <option value="Promotor">Promotor</option>
                <option value="Neutro">Neutro</option>
                <option value="Detrator">Detrator</option>
             </select>

             <select 
                className="bg-[#150a25] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                value={scoreFilter}
                onChange={(e) => setScoreFilter(e.target.value)}
             >
                <option value="All">Todas Notas</option>
                <option value="10">Nota 10</option>
                <option value="9">Nota 9</option>
                <option value="8">Nota 8</option>
                <option value="7">Nota 7</option>
                <option value="6">Nota 6</option>
                <option value="5">Nota 5</option>
                <option value="4">Nota 4</option>
                <option value="3">Nota 3</option>
                <option value="2">Nota 2</option>
                <option value="1">Nota 1</option>
                <option value="0">Nota 0</option>
                <option value="nan">Sem Nota</option>
             </select>
         </div>
      </div>

      <div className="grid grid-cols-12 bg-gradient-to-r from-fuchsia-900/80 to-cyan-900/80 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 shadow-md z-10">
          <div className="col-span-4">Unidade</div>
          <div className="col-span-3">Nome</div>
          <div className="col-span-4">Justificativa</div>
          <div className="col-span-1 text-right">Nota</div>
      </div>

      <div 
        className="flex-1 overflow-y-auto custom-scrollbar" 
        data-export-scroll="true"
      >
        {visibleRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/30">
                <Filter className="w-12 h-12 mb-2 opacity-20" />
                <p>Nenhum registro encontrado.</p>
            </div>
        ) : (
            <div className="divide-y divide-white/5">
                {visibleRecords.map((record, idx) => (
                    <div key={`${record.respondentId}-${idx}`} className="grid grid-cols-12 py-4 px-4 hover:bg-white/5 transition-colors text-sm items-start group">
                        <div className="col-span-4 pr-2">
                             <div className="text-white/90 font-medium break-words">
                                {record.unitName}
                             </div>
                             <div className="text-[10px] text-fuchsia-300/60 mt-1">{record.unitZone}</div>
                        </div>
                        <div className="col-span-3 pr-2">
                            <div className="text-white/70 break-words">{record.respondentName}</div>
                            <div className="text-[10px] text-white/30 mt-1">{record.responseDate}</div>
                        </div>
                        <div className="col-span-4 pr-2">
                             {record.justification ? (
                                <p className="text-white/80 italic text-xs leading-relaxed whitespace-pre-wrap break-words bg-white/5 p-2 rounded-lg border border-white/5">
                                    "{record.justification}"
                                </p>
                             ) : (
                                <span className="text-white/20 text-xs py-1 block">Sem comentário</span>
                             )}
                        </div>
                        <div className="col-span-1 flex justify-end">
                            {isNaN(record.score) ? (
                                <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-white/40 whitespace-nowrap">
                                    -
                                </div>
                            ) : (
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shadow-lg border border-white/10 ${
                                    record.status === 'Promotor' ? 'bg-green-500 text-white' : 
                                    record.status === 'Neutro' ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
                                }`}>
                                    {record.score}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {visibleCount < filtered.length && (
                    <div className="p-4 flex justify-center">
                        <button 
                            onClick={handleShowMore}
                            className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/70 hover:text-white transition-all"
                        >
                            <ChevronDown className="w-4 h-4" />
                            Carregar mais ({filtered.length - visibleCount} restantes)
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>
      
      <div className="bg-fuchsia-900/30 border-t border-white/10 p-2 text-center text-[10px] text-fuchsia-200/50">
         Exibindo {visibleRecords.length} de {filtered.length} registros • LAVE & PEGUE LAVANDERIA
      </div>
    </div>
  );
};