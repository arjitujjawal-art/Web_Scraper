import React, { useState } from 'react';
import { X, Briefcase, ExternalLink, Building2, Search } from 'lucide-react';
import type { JobPosting } from '../../api/types';

interface ActiveJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: JobPosting[];
  activeCity: 'delhi' | 'sf';
  onSelectJob: (job: JobPosting) => void;
}

export const ActiveJobsModal: React.FC<ActiveJobsModalProps> = ({
  isOpen,
  onClose,
  jobs,
  activeCity,
  onSelectJob,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'full-time' | 'fellowship'>('all');

  if (!isOpen) return null;

  const cityName = activeCity === 'delhi' ? 'Delhi NCR' : 'San Francisco Bay Area';

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = 
      typeFilter === 'all' ||
      (typeFilter === 'fellowship' && (job.job_type.toLowerCase().includes('fellowship') || job.title.toLowerCase().includes('fellow') || job.title.toLowerCase().includes('postdoc'))) ||
      (typeFilter === 'full-time' && !job.job_type.toLowerCase().includes('fellowship') && !job.title.toLowerCase().includes('fellow'));

    return matchesSearch && matchesType;
  });

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#0c0c10] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-950/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Active Opportunities & Tech Jobs</h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 font-bold">
                  {cityName}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {jobs.length} verified listings indexed via Bright Data & Cache-First Discovery
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="px-6 py-3 border-b border-white/5 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by title, company, skills, or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/60"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === 'all' ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({jobs.length})
            </button>
            <button
              onClick={() => setTypeFilter('full-time')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === 'full-time' ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Full-time
            </button>
            <button
              onClick={() => setTypeFilter('fellowship')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === 'fellowship' ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Fellowships & Postdocs
            </button>
          </div>
        </div>

        {/* Jobs Grid / List */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => {
                onSelectJob(job);
                onClose();
              }}
              className="p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/10 hover:border-blue-500/50 transition-all cursor-pointer group flex flex-col justify-between gap-3 shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors leading-snug">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                      <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="font-semibold text-zinc-200">{job.company}</span>
                      <span>•</span>
                      <span className="text-blue-400 font-medium">{job.domain}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-semibold whitespace-nowrap">
                    {job.job_type}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 mt-2.5 line-clamp-2 leading-relaxed">
                  {job.summary}
                </p>
              </div>

              <div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {job.skills.slice(0, 4).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-white/5 text-zinc-400 border border-white/5"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-mono font-bold">
                    {job.salary_range}
                  </span>

                  <a
                    href={job.source_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold hover:underline"
                  >
                    <span>Apply Vacancy</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}

          {filteredJobs.length === 0 && (
            <div className="col-span-2 text-center py-12 text-zinc-500 text-sm">
              No matching job vacancies found for "{searchQuery}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500 flex-shrink-0">
          <span>Showing {filteredJobs.length} of {jobs.length} total listings</span>
          <span className="text-zinc-400">Click any card to center radar map</span>
        </div>
      </div>
    </div>
  );
};
