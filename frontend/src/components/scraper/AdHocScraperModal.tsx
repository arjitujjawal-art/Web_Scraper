import React, { useState } from 'react';
import { apiClient } from '../../api/client';
import type { AdHocScrapeResult } from '../../api/types';
import { 
  X, 
  Sparkles, 
  Link, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Zap
} from 'lucide-react';

interface AdHocScraperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignalExtracted: (result: AdHocScrapeResult) => void;
}

export const AdHocScraperModal: React.FC<AdHocScraperModalProps> = ({
  isOpen,
  onClose,
  onSignalExtracted,
}) => {
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('Extract announcement title, publication date, city location, technology domain, and summary.');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<number>(0);
  const [result, setResult] = useState<AdHocScrapeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setStep(1);

    const stepInterval = setInterval(() => {
      setStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1200);

    try {
      const res = await apiClient.triggerAdHocScrape(url, prompt);
      clearInterval(stepInterval);
      setStep(4);
      setResult(res);
      onSignalExtracted(res);
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || 'Failed to extract from URL');
    } finally {
      setLoading(false);
    }
  };

  const exampleUrls = [
    { label: 'Live Test Newsroom', url: 'https://arjitujjawal-art.github.io/Web_Scraper/fixtures/newsroom_v1.html' },
    { label: 'IIT Delhi Research', url: 'https://home.iitd.ac.in/research-all.php' },
    { label: 'Mutated Newsroom', url: 'https://arjitujjawal-art.github.io/Web_Scraper/fixtures/newsroom_v2_mutated.html' },
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-xl bg-[#0c0c10] rounded-2xl border border-white/15 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 bg-[#08080c] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-[#ff4d55]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                One-Stop URL Scraper
              </h2>
              <p className="text-xs text-zinc-400">
                Extract signals on-demand via Bright Data Scraper Studio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Quick Example Presets */}
          <div>
            <span className="text-xs text-zinc-400 block mb-2 font-medium">
              Quick Test Targets:
            </span>
            <div className="flex flex-wrap gap-2">
              {exampleUrls.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setUrl(preset.url)}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-red-500/40 text-zinc-300 hover:text-white transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Target Web Page URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  required
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/60"
                />
                <Link className="absolute right-3.5 top-3.5 w-4 h-4 text-zinc-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Extraction Prompt / Guidance
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/60 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !url}
              className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl disabled:opacity-40 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>Processing Scraper Studio Pipeline...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-zinc-950 text-zinc-950" />
                  <span>Scrape & Pin on Map</span>
                </>
              )}
            </button>
          </form>

          {/* Live Progress Pipeline */}
          {loading && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs text-red-400 font-mono font-bold">
                <span>STAGE {step} / 4</span>
                <span>{step === 1 ? 'Routing Domain' : step === 2 ? 'Scraping DOM' : step === 3 ? 'Normalizing' : 'Complete'}</span>
              </div>
              <div className="w-full bg-black h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-[#ff4d55] h-full transition-all duration-500"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Result Box */}
          {result && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Extracted & Saved {result.signals_saved} Signals!</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {result.signals.map((s) => (
                  <div key={s.signal_id} className="p-2 rounded-lg bg-zinc-900 text-xs flex items-center justify-between border border-white/5">
                    <span className="font-medium text-white truncate max-w-[280px]">{s.title}</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] uppercase font-semibold">{s.domain}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
