import React, { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import { X, Briefcase, ExternalLink, Building2, Search, GraduationCap, MapPin } from 'lucide-react';
import type { JobPosting } from '../../api/types';

interface ActiveJobsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCity: 'delhi' | 'sf';
  onSelectJob: (job: JobPosting) => void;
}

export const ActiveJobsModal: React.FC<ActiveJobsModalProps> = ({
  isOpen,
  onClose,
  activeCity,
  onSelectJob,
}) => {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'full-time' | 'fellowship' | 'internship'>('all');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const cityName = activeCity === 'delhi' ? 'Delhi' : 'San Francisco';
  const displayCityName = activeCity === 'delhi' ? 'Delhi NCR' : 'San Francisco Bay Area';

  useEffect(() => {
    if (isOpen) {
      loadAllCityJobs();
      const interval = setInterval(loadAllCityJobs, 6000);
      return () => clearInterval(interval);
    }
  }, [isOpen, activeCity]);

  const loadAllCityJobs = async () => {
    setLoading(true);
    try {
      // Fetch all jobs for this city without domain constraint so user can view all fellowships and jobs
      const res = await apiClient.getJobs(cityName, undefined, undefined, 100);
      setJobs(res.items || []);
    } catch (err) {
      console.error('Failed to load city jobs', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const domainsList = Array.from(new Set(jobs.map((j) => j.domain))).filter(Boolean);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const normType = (job.job_type || '').toLowerCase();
    const normTitle = (job.title || '').toLowerCase();
    const isFellow = normType.includes('fellow') || normTitle.includes('fellow') || normTitle.includes('postdoc') || normTitle.includes('grant');
    const isIntern = normType.includes('intern') || normTitle.includes('intern');

    const matchesType = 
      typeFilter === 'all' ||
      (typeFilter === 'fellowship' && isFellow) ||
      (typeFilter === 'internship' && isIntern) ||
      (typeFilter === 'full-time' && !isFellow && !isIntern);

    const matchesDomain = !selectedDomain || job.domain.toLowerCase() === selectedDomain.toLowerCase();

    return matchesSearch && matchesType && matchesDomain;
  });

  const fellowshipsCount = jobs.filter(j => {
    const t = (j.job_type || '').toLowerCase() + ' ' + (j.title || '').toLowerCase();
    return t.includes('fellow') || t.includes('postdoc') || t.includes('grant');
  }).length;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0c0c10] border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#08080c] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-[#ff4d55]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Active Opportunities & Tech Jobs</h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-red-950/60 border border-red-500/30 text-red-300 font-bold">
                  {displayCityName}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                  {jobs.length} Total Roles
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Crawler Sync
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Verified traditional tech vacancies, AI/ML roles, research fellowships & grants
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

        {/* Filters Bar: Search + Type Switcher + Domain Switcher */}
        <div className="px-6 py-3 border-b border-white/10 bg-[#121217] flex flex-col gap-2.5 flex-shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by role, company, skills, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/60"
              />
            </div>

            {/* Type Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  typeFilter === 'fellowship' ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Fellowships & Grants ({fellowshipsCount})</span>
              </button>
              <button
                onClick={() => setTypeFilter('internship')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  typeFilter === 'internship' ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Internships
              </button>
            </div>
          </div>

          {/* Domain Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
            <button
              onClick={() => setSelectedDomain(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                selectedDomain === null
                  ? 'bg-red-500/20 text-[#ff4d55] border border-red-500/40'
                  : 'text-zinc-400 hover:text-white bg-zinc-900 border border-white/5'
              }`}
            >
              All Domains
            </button>
            {domainsList.map((domain) => (
              <button
                key={domain}
                onClick={() => setSelectedDomain(selectedDomain === domain ? null : domain)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                  selectedDomain === domain
                    ? 'bg-white text-zinc-950 font-bold shadow'
                    : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-white/5'
                }`}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>

        {/* Jobs Grid / List */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => {
            const isFellowship = (job.job_type || '').toLowerCase().includes('fellow') || (job.title || '').toLowerCase().includes('fellow') || (job.title || '').toLowerCase().includes('postdoc');
            
            return (
              <div
                key={job.id}
                onClick={() => {
                  onSelectJob(job);
                  onClose();
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between gap-3 shadow-lg ${
                  isFellowship
                    ? 'bg-[#141014] border-red-500/30 hover:border-red-500/70 hover:bg-[#1c141c]'
                    : 'bg-zinc-900/70 hover:bg-zinc-800/90 border-white/10 hover:border-white/25'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        {isFellowship ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-[#ff4d55] border border-red-500/30 font-bold flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            <span>Fellowship / Grant</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-semibold">
                            {job.job_type}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-zinc-400">
                          {job.domain}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white group-hover:text-[#ff4d55] transition-colors leading-snug">
                        {job.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                        <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-semibold text-zinc-200">{job.company}</span>
                        <span>•</span>
                        <span className="text-zinc-400 flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          {job.city}
                        </span>
                      </div>
                    </div>
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
                      className="inline-flex items-center gap-1 text-[#ff4d55] hover:text-red-300 font-semibold hover:underline"
                    >
                      <span>Apply Vacancy</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredJobs.length === 0 && !loading && (
            <div className="col-span-2 text-center py-12 text-zinc-500 text-sm">
              No matching postings found. Try clearing filters.
            </div>
          )}

          {loading && (
            <div className="col-span-2 text-center py-12 text-zinc-400 text-xs">
              Loading active vacancies...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500 flex-shrink-0">
          <span>Showing {filteredJobs.length} of {jobs.length} total listings</span>
          <span className="text-zinc-400">Click any vacancy card to view on radar map</span>
        </div>
      </div>
    </div>
  );
};
