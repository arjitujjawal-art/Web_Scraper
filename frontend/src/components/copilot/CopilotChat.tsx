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
  MapPin,
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
  onClose?: () => void;
  onSelectCitation?: (citation: CopilotCitation) => void;
  onNavigateLocation?: (loc: LocationTarget) => void;
  isEmbedded?: boolean;
}

export const CopilotChat: React.FC<CopilotChatProps> = ({
  isOpen,
  onClose,
  onSelectCitation,
  onNavigateLocation,
  isEmbedded = false,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "👋 Hello! I am the **Signal Copilot Intelligence Hub**.\n\nAsk me anything about:\n- **Emergence scores** & mathematical time-decay models\n- **Active tech jobs & fellowships** across Delhi NCR and SF\n- **On-demand web scraping** and live Bright Data fleet health!",
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

  if (!isOpen && !isEmbedded) return null;

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
    "Show Berkeley robotics jobs & BAIR fellowships",
    "Check scraper fleet health",
  ];

  const containerClasses = isEmbedded
    ? "w-full bg-[#08080b] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden min-h-[380px] max-h-[520px]"
    : "fixed bottom-6 right-6 w-96 sm:w-[500px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-80px)] z-[10000] bg-[#08080b] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300";

  return (
    <div className={containerClasses}>
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#0d0d12] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shadow-md">
            <Bot className="w-4 h-4 text-[#ff4d55]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Signal Copilot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">
              Groq GPT-OSS 120B · Cache-First Multi-Tool Engine
            </p>
          </div>
        </div>

        {onClose && !isEmbedded && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
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
                    className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/30"
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
                  ? 'bg-white text-zinc-950 font-semibold rounded-br-none'
                  : m.sender === 'system'
                  ? 'bg-rose-500/10 border border-rose-500/40 text-rose-300'
                  : 'bg-[#121217] border border-white/10 text-zinc-200 rounded-bl-none'
              }`}
            >
              {m.sender === 'user' ? (
                <div className="whitespace-pre-wrap">{m.text}</div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ node, ...props }) => (
                      <div className="my-2.5 overflow-x-auto rounded-xl border border-white/10 bg-black/70 shadow-inner">
                        <table className="w-full text-left text-[11px] border-collapse" {...props} />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead className="bg-[#18181f] text-[#ff4d55] font-bold uppercase text-[10px] tracking-wider border-b border-white/10" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <th className="p-2.5 font-semibold text-[#ff4d55] border-r border-white/10 last:border-r-0" {...props} />
                    ),
                    td: ({ node, ...props }) => (
                      <td className="p-2.5 text-zinc-300 border-t border-white/5 border-r border-white/5 last:border-r-0" {...props} />
                    ),
                    tr: ({ node, ...props }) => (
                      <tr className="hover:bg-white/5 transition-colors" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-bold text-white" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="my-1.5 leading-relaxed text-zinc-300" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="my-2 space-y-1 list-disc list-inside text-zinc-300" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="my-2 space-y-1 list-decimal list-inside text-zinc-300" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="leading-relaxed" {...props} />
                    ),
                    a: ({ node, href, children, ...props }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[#ff4d55] hover:text-red-400 underline font-semibold transition-colors"
                        {...props}
                      >
                        <span>{children}</span>
                        <ExternalLink className="w-2.5 h-2.5 inline" />
                      </a>
                    ),
                    code: ({ node, ...props }) => (
                      <code className="px-1.5 py-0.5 rounded bg-black/80 text-red-300 font-mono text-[10px] border border-white/10" {...props} />
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
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] font-bold text-red-300 hover:bg-red-500/20 hover:border-red-400 transition-all shadow"
              >
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>📍 Fly to {detectLocationFromText(m.text)!.label} on Map</span>
              </button>
            )}

            {/* Inline Citations */}
            {m.citations && m.citations.length > 0 && (
              <div className="mt-2 space-y-1 w-full max-w-[95%]">
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
                  Grounding Evidence:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {m.citations.map((c) => (
                    <button
                      key={c.signal_id}
                      onClick={() => onSelectCitation && onSelectCitation(c)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-red-500/30 text-[10px] text-red-300 hover:border-red-400 hover:bg-zinc-800 transition-all shadow"
                    >
                      <Zap className="w-2.5 h-2.5 fill-red-400" />
                      <span className="truncate max-w-[180px] font-medium">{c.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <span className="text-[9px] text-zinc-500 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-zinc-900 border border-red-500/30 p-3 rounded-2xl w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Copilot analyzing signals & executing tools...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t border-white/5 bg-zinc-950/60 flex flex-wrap gap-1.5 flex-shrink-0">
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-red-500/40 text-zinc-300 hover:text-white transition-all text-left"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 border-t border-white/10 bg-[#0d0d12] flex items-center gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Copilot (e.g. 'Show ML jobs in Noida', 'What is emergence in Berkeley?')..."
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#dc2626] to-[#ff4d55] hover:brightness-110 disabled:opacity-30 text-white flex items-center justify-center transition-all shadow"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
