import React, { useState, useRef, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { CopilotMessage, CopilotCitation } from '../../api/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Bot, 
  Send, 
  X, 
  Loader2, 
  Zap, 
  Terminal,
  ExternalLink,
  MapPin
} from 'lucide-react';

export interface LocationTarget {
  lat: number;
  lng: number;
  zoom?: number;
  city: 'delhi' | 'sf';
  label: string;
}

export function detectLocationFromText(text: string): LocationTarget | null {
  const norm = (text || '').toLowerCase();
  if (norm.includes('noida')) return { lat: 28.5355, lng: 77.3910, zoom: 13, city: 'delhi', label: 'Noida Tech Corridor' };
  if (norm.includes('gurugram') || norm.includes('gurgaon')) return { lat: 28.4595, lng: 77.0266, zoom: 13, city: 'delhi', label: 'Gurugram Cyber City' };
  if (norm.includes('okhla')) return { lat: 28.5355, lng: 77.2732, zoom: 14, city: 'delhi', label: 'Okhla R&D Cluster' };
  if (norm.includes('hauz khas') || norm.includes('iit delhi')) return { lat: 28.5450, lng: 77.1926, zoom: 14, city: 'delhi', label: 'IIT Delhi / Hauz Khas' };
  if (norm.includes('delhi')) return { lat: 28.6139, lng: 77.2090, zoom: 11, city: 'delhi', label: 'Delhi NCR Hub' };
  if (norm.includes('berkeley')) return { lat: 37.8719, lng: -122.2585, zoom: 14, city: 'sf', label: 'UC Berkeley / BAIR' };
  if (norm.includes('soma') || norm.includes('mission bay')) return { lat: 37.7749, lng: -122.4194, zoom: 13, city: 'sf', label: 'San Francisco Tech Core' };
  if (norm.includes('palo alto') || norm.includes('stanford')) return { lat: 37.4275, lng: -122.1697, zoom: 14, city: 'sf', label: 'Palo Alto / Stanford' };
  if (norm.includes('santa clara') || norm.includes('silicon valley')) return { lat: 37.3541, lng: -121.9552, zoom: 13, city: 'sf', label: 'Silicon Valley' };
  if (norm.includes('san francisco')) return { lat: 37.7749, lng: -122.4194, zoom: 12, city: 'sf', label: 'San Francisco Bay Area' };
  return null;
}

interface CopilotChatProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCitation?: (citation: CopilotCitation) => void;
  onNavigateLocation?: (loc: LocationTarget) => void;
}

export const CopilotChat: React.FC<CopilotChatProps> = ({
  isOpen,
  onClose,
  onSelectCitation,
  onNavigateLocation,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "👋 Hello! I am the **Signal Atlas Copilot**.\n\nAsk me anything about:\n- **Emergence scores** & mathematical time-decay models\n- **Active LinkedIn job vacancies** across Delhi NCR and SF\n- **On-demand web scraping** and scraper fleet health!",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    // Check location in query and fly map immediately
    const queryLoc = detectLocationFromText(query);
    if (queryLoc && onNavigateLocation) {
      onNavigateLocation(queryLoc);
    }

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiClient.sendChatMessage(query);
      const assistantMsg: CopilotMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        citations: res.citations,
        tools_used: res.tools_used,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Check location in reply and focus map
      const replyLoc = detectLocationFromText(res.reply) || queryLoc;
      if (replyLoc && onNavigateLocation) {
        onNavigateLocation(replyLoc);
      }
    } catch (err: any) {
      const errorMsg: CopilotMessage = {
        id: `error-${Date.now()}`,
        sender: 'system',
        text: `⚠️ Error: ${err.message || 'Failed to reach Copilot engine.'}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Why is Delhi emerging in AI/ML?",
    "Show ML Engineer jobs in Noida & Gurugram",
    "Check scraper fleet health",
    "How does the time-decay math work?",
  ];

  return (
    <div className="fixed bottom-6 right-6 w-96 sm:w-[500px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-80px)] z-[10000] glass-panel-elevated rounded-3xl border border-cyan-400/50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Bot className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Signal Copilot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-cyan-400 font-mono">
              Groq GPT-OSS 120B · Multi-Tool Engine
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg glass-panel flex items-center justify-center text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="p-4 overflow-y-auto space-y-4 flex-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Tool invocation badge */}
            {m.tools_used && m.tools_used.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {m.tools_used.map((tool) => (
                  <span
                    key={tool}
                    className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                  >
                    <Terminal className="w-2.5 h-2.5" />
                    <span>Tool: {tool}</span>
                  </span>
                ))}
              </div>
            )}

            <div
              className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[95%] shadow-md overflow-x-auto ${
                m.sender === 'user'
                  ? 'bg-cyan-500 text-slate-950 font-medium rounded-br-none'
                  : m.sender === 'system'
                  ? 'bg-rose-500/10 border border-rose-500/40 text-rose-300'
                  : 'glass-panel border border-slate-800 text-slate-200 rounded-bl-none'
              }`}
            >
              {m.sender === 'user' ? (
                <div className="whitespace-pre-wrap">{m.text}</div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ node, ...props }) => (
                      <div className="my-2.5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 shadow-inner">
                        <table className="w-full text-left text-[11px] border-collapse" {...props} />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead className="bg-slate-900/90 text-cyan-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <th className="p-2.5 font-semibold text-cyan-300 border-r border-slate-800 last:border-r-0" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="p-2.5 text-slate-300 border-t border-slate-800/60 border-r border-slate-800/40 last:border-r-0" {...props} />
                    ),
                    tr: ({ node, ...props }) => (
                      <tr className="hover:bg-slate-800/30 transition-colors" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-bold text-white" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="my-1.5 leading-relaxed text-slate-300" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="my-2 space-y-1 list-disc list-inside text-slate-300" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="my-2 space-y-1 list-decimal list-inside text-slate-300" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="leading-relaxed" {...props} />
                    ),
                    a: ({ node, href, children, ...props }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors"
                        {...props}
                      >
                        <span>{children}</span>
                        <ExternalLink className="w-2.5 h-2.5 inline" />
                      </a>
                    ),
                    code: ({ node, ...props }) => (
                      <code className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 font-mono text-[10px] border border-slate-800" {...props} />
                    ),
                  }}
                >
                  {m.text}
                </ReactMarkdown>
              )}
            </div>

            {/* Location Focus Button */}
            {m.sender === 'assistant' && detectLocationFromText(m.text) && (
              <button
                onClick={() => onNavigateLocation && onNavigateLocation(detectLocationFromText(m.text)!)}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 transition-all shadow"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>📍 Fly to {detectLocationFromText(m.text)!.label} on Map</span>
              </button>
            )}

            {/* Inline Citations */}
            {m.citations && m.citations.length > 0 && (
              <div className="mt-2 space-y-1 w-full max-w-[95%]">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Grounding Evidence:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {m.citations.map((c) => (
                    <button
                      key={c.signal_id}
                      onClick={() => onSelectCitation && onSelectCitation(c)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-500/40 text-[10px] text-cyan-300 hover:border-cyan-400 hover:bg-slate-800 transition-all shadow"
                    >
                      <Zap className="w-2.5 h-2.5 fill-cyan-400" />
                      <span className="truncate max-w-[180px] font-medium">{c.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <span className="text-[9px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 glass-panel p-3 rounded-2xl w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Copilot analyzing signals & querying tools...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40 flex flex-wrap gap-1.5">
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="text-[10px] px-2.5 py-1 rounded-lg glass-panel border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-all text-left"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Copilot (e.g. 'Show ML jobs in Noida')..."
          className="flex-1 px-3.5 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-9 h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 flex items-center justify-center transition-all shadow"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
