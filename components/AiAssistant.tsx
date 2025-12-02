import React, { useState, useRef, useEffect } from 'react';
import { NpsRecord, ChatMessage } from '../types';
import { analyzeData } from '../services/geminiService';
import { Sparkles, Send, Bot, User, AlertCircle, BrainCircuit } from 'lucide-react';

interface AiAssistantProps {
  records: NpsRecord[];
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ records }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `Olá! Analisei os ${records.length} registros da sua base. Posso ajudar a identificar tendências, resumir feedbacks ou analisar sentimentos. O que você gostaria de saber?`, timestamp: new Date() }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // Check for API key availability via simple check (in real app, use a more robust check)
    if (!process.env.API_KEY) {
        setError("API Key is missing. Please check your configuration.");
        return;
    }

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const responseText = await analyzeData(records, userMsg.text);
      const botMsg: ChatMessage = { role: 'model', text: responseText, timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setError("Failed to get a response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!process.env.API_KEY) {
        setError("API Key is missing. Please check your configuration.");
        return;
    }

    const summaryPrompt = "Analise todas as justificativas fornecidas e gere um RESUMO EXECUTIVO dos sentimentos gerais. Identifique: 1) Principais elogios (o que os promotores amam), 2) Principais dores (o que os detratores reclamam) e 3) Sugestões de melhoria recorrentes. Formate a resposta em Markdown com tópicos claros.";

    const userMsg: ChatMessage = { role: 'user', text: "📊 Gerar Resumo de Sentimentos", timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const responseText = await analyzeData(records, summaryPrompt);
      const botMsg: ChatMessage = { role: 'model', text: responseText, timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setError("Failed to generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Qual o principal motivo das notas baixas?",
    "Resuma os feedbacks positivos.",
    "Quais unidades tem melhor desempenho?",
    "Existem reclamações sobre custos?"
  ];

  return (
    <div className="bg-[#1e1235]/80 backdrop-blur-md rounded-xl shadow-lg border border-white/10 flex flex-col h-[650px] overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-fuchsia-900/40 to-purple-900/40">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-fuchsia-500/20 border border-fuchsia-500/50 rounded-lg text-fuchsia-400">
                <Sparkles className="w-5 h-5" />
            </div>
            <div>
                <h2 className="text-lg font-semibold text-white">AI Data Analyst</h2>
                <p className="text-xs text-purple-300/60">Powered by Gemini</p>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" ref={scrollRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-white/10 ${msg.role === 'user' ? 'bg-white/10' : 'bg-fuchsia-600 text-white'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-purple-600/80 text-white rounded-tr-none shadow-lg' 
                : 'bg-[#2a1b3d] border border-white/10 text-gray-200 rounded-tl-none shadow-sm'
            }`}>
               {msg.text.split('\n').map((line, i) => (
                 <p key={i} className={line.startsWith('-') || line.startsWith('*') ? 'ml-4' : 'mb-2'}>{line}</p>
               ))}
               <span className="text-[10px] opacity-40 block mt-2 text-right">
                 {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
               </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-fuchsia-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                <Sparkles className="w-4 h-4" />
             </div>
             <div className="bg-[#2a1b3d] border border-white/10 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
             </div>
          </div>
        )}
        {error && (
            <div className="flex justify-center my-4">
                <div className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2 border border-red-500/30">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-[#150a25]">
        <div className="flex flex-col gap-3">
            {/* Quick Action Button for Sentiment Summary */}
            {!loading && messages.length < 5 && (
                <button 
                    onClick={handleGenerateSummary}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-to-r from-fuchsia-900/50 to-purple-900/50 border border-fuchsia-500/30 rounded-lg text-fuchsia-200 text-xs font-semibold uppercase tracking-wider hover:bg-fuchsia-800/50 transition-all shadow-[0_0_10px_rgba(217,70,239,0.1)] hover:shadow-[0_0_15px_rgba(217,70,239,0.3)] mb-1"
                >
                    <BrainCircuit className="w-4 h-4" />
                    Gerar Resumo Geral de Sentimentos
                </button>
            )}

            {/* Suggestions Chips */}
            {messages.length < 3 && (
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {suggestions.map((s, i) => (
                        <button 
                            key={i}
                            onClick={() => setInput(s)}
                            className="whitespace-nowrap px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-purple-200 hover:bg-fuchsia-600/20 hover:border-fuchsia-500 hover:text-white transition-colors"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
            
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Pergunte algo sobre seus dados..."
                    className="flex-1 px-4 py-2.5 bg-[#2a1b3d] border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm text-white placeholder-white/30 shadow-inner"
                />
                <button 
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shadow-lg shadow-fuchsia-900/50"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};