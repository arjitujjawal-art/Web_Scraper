import React, { useState, useRef, useEffect } from 'react';
import { apiClient } from '../../api/client';
import type { CopilotMessage, CopilotCitation } from '../../api/types';
import { 
  Bot, 
  Send, 
  X, 
  Loader2, 
  Zap, 
  Terminal
} from 'lucide-react';

interface CopilotChatProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCitation?: (citation: CopilotCitation) => void;
}

export const CopilotChat: React.FC<CopilotChatProps> = ({
  isOpen,
  onClose,
  onSelectCitation,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "👋 Hello! I am the **Signal Atlas Copilot**. Ask me about emergence scores, active job vacancies in Delhi/SF, on-demand web scraping, or how to navigate the platform!",
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
    "Show ML Engineer jobs in Gurugram",
    "Check scraper fleet health",
    "How do I use this website?",
  ];

  return (
    <div className="fixed bottom-6 right-6 w-96 sm:w-[440px] h-[580px] z-[10000] glass-panel-elevated rounded-3xl border border-cyan-400/50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
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
              Groq GPT-OSS 120B
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
              className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-md ${
                m.sender === 'user'
                  ? 'bg-cyan-500 text-slate-950 font-medium rounded-br-none'
                  : m.sender === 'system'
                  ? 'bg-rose-500/10 border border-rose-500/40 text-rose-300'
                  : 'glass-panel border border-slate-800 text-slate-200 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>

            {/* Inline Citations */}
            {m.citations && m.citations.length > 0 && (
              <div className="mt-2 space-y-1 w-full max-w-[90%]">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Grounding Evidence:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {m.citations.map((c) => (
                    <button
                      key={c.signal_id}
                      onClick={() => onSelectCitation && onSelectCitation(c)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-cyan-500/30 text-[10px] text-cyan-300 hover:border-cyan-400"
                    >
                      <Zap className="w-2.5 h-2.5 fill-cyan-400" />
                      <span className="truncate max-w-[140px]">{c.title}</span>
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
            <span>Copilot analyzing signals & executing tools...</span>
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
          placeholder="Ask Copilot or paste a URL to scrape..."
          className="flex-1 px-3 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-9 h-9 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 flex items-center justify-center transition-all shadow"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
