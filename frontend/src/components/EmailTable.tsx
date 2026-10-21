import React from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Layers,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { ScheduledEmailJob, SearchResult, SentEmailJob } from '../types';

interface EmailTableProps {
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  scheduledJobs: ScheduledEmailJob[];
  sentJobs: SentEmailJob[];
  searchResults: SearchResult[] | null;
  searchQuery: string;
  onClearSearch: () => void;
  searchSource: string | null;
  loading: boolean;
  onCancelJob: (jobId: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export const EmailTable: React.FC<EmailTableProps> = ({
  activeTab,
  onTabChange,
  scheduledJobs,
  sentJobs,
  searchResults,
  searchQuery,
  onClearSearch,
  searchSource,
  loading,
  onCancelJob,
  page,
  totalPages,
  onPageChange,
}) => {
  const isSearching = searchResults !== null && searchQuery.trim().length > 0;

  const formatDate = (isoString: string | null | undefined) => {
    if (!isoString) return '--';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getRelativeTime = (iso: string | null | undefined) => {
    if (!iso) return '';
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return 'Due now';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (mins > 60) return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
    if (mins > 0) return `in ${mins}m ${secs}s`;
    return `in ${secs}s`;
  };

  const extractDomain = (email: string) => {
    const parts = email.split('@');
    return parts.length > 1 ? `@${parts[1]}` : '';
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border-card bg-surface-card shadow-xl">
      {/* Table Header Controls */}
      <div className="flex flex-col gap-4 border-b border-border-card px-6 py-4 sm:flex-row sm:items-center sm:justify-between bg-surface-container/50">
        {/* Vengeance UI Segmented Tab Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-border-card bg-surface-container p-1 font-mono text-xs">
          <button
            onClick={() => onTabChange('scheduled')}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 transition-all ${
              activeTab === 'scheduled' && !isSearching
                ? 'bg-white font-semibold text-black shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Scheduled Queue</span>
            <span
              className={`rounded px-1.5 py-0.2 font-mono text-[10px] ${
                activeTab === 'scheduled' && !isSearching
                  ? 'bg-black/15 text-black font-bold'
                  : 'bg-surface-card text-text-muted'
              }`}
            >
              {scheduledJobs.length}
            </span>
          </button>

          <button
            onClick={() => onTabChange('sent')}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 transition-all ${
              activeTab === 'sent' && !isSearching
                ? 'bg-white font-semibold text-black shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Delivered Outreach</span>
            <span
              className={`rounded px-1.5 py-0.2 font-mono text-[10px] ${
                activeTab === 'sent' && !isSearching
                  ? 'bg-black/15 text-black font-bold'
                  : 'bg-surface-card text-text-muted'
              }`}
            >
              {sentJobs.length}
            </span>
          </button>
        </div>

        {/* Live Filter Indicator or Total Records */}
        <div className="flex items-center gap-2 font-mono text-xs text-text-muted">
          <Layers className="h-3.5 w-3.5 text-border-highlight" />
          <span>
            {isSearching
              ? `Engine: ${searchSource?.toUpperCase() || 'DUAL-SEARCH'} (${searchResults?.length} matches)`
              : `Total Visible: ${activeTab === 'scheduled' ? scheduledJobs.length : sentJobs.length} records`}
          </span>
        </div>
      </div>

      {/* Search Filter Active Banner */}
      {isSearching && (
        <div className="flex items-center justify-between border-b border-border-highlight/30 bg-sky-950/20 px-6 py-2.5">
          <div className="flex items-center gap-2 font-mono text-xs text-border-highlight">
            <Search className="h-3.5 w-3.5" />
            <span>
              Searching across recipients & subjects for <strong className="text-white">"{searchQuery}"</strong> ({searchResults?.length || 0} hits)
            </span>
          </div>
          <button
            onClick={onClearSearch}
            className="flex items-center gap-1 rounded border border-border-card bg-surface-card px-2.5 py-1 font-mono text-[11px] text-text-muted hover:text-white hover:border-border-highlight transition-all"
          >
            <X className="h-3 w-3" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* Main Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[750px] text-left text-xs font-sans">
          <thead className="border-b border-border-card bg-surface-container font-mono uppercase tracking-wider text-text-muted">
            <tr>
              <th className="px-6 py-3 font-semibold">Recipient</th>
              <th className="px-6 py-3 font-semibold">Campaign Subject</th>
              <th className="px-6 py-3 font-semibold">
                {activeTab === 'scheduled' && !isSearching ? 'Scheduled Send Time' : 'Dispatch Timestamp'}
              </th>
              <th className="px-6 py-3 font-semibold">Sender Account</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold text-right">
                {activeTab === 'scheduled' && !isSearching ? 'Actions' : 'Ethereal Link'}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-card/60">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center font-mono text-text-muted">
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-border-highlight animate-ping" />
                    <span>Loading campaigns and dispatch records...</span>
                  </div>
                </td>
              </tr>
            ) : isSearching ? (
              searchResults && searchResults.length > 0 ? (
                searchResults.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-surface-card-hover">
                    <td className="px-6 py-3.5 font-mono text-white">
                      <div className="flex items-center gap-2">
                        <span>{row.recipientEmail}</span>
                        <span className="rounded bg-surface-container px-1.5 py-0.2 font-mono text-[10px] text-text-muted">
                          {extractDomain(row.recipientEmail)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 max-w-xs truncate text-slate-300 font-medium">{row.subject}</td>
                    <td className="px-6 py-3.5 font-mono text-text-muted">
                      {formatDate(row.sentAt || row.scheduledTime)}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-text-muted">Auto-assigned</td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded border px-2.5 py-0.5 font-mono text-[10px] uppercase ${
                          row.status === 'SENT'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : row.status === 'FAILED'
                            ? 'border-red-500/30 bg-red-500/10 text-red-400'
                            : 'border-sky-500/30 bg-sky-500/10 text-sky-400'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {row.previewUrl ? (
                        <a
                          href={row.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-border-card bg-surface-container px-2.5 py-1 font-mono text-[11px] text-border-highlight transition-all hover:border-border-highlight hover:text-white"
                        >
                          <span>Preview</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="font-mono text-text-muted">--</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center font-mono text-text-muted">
                    No emails match the query "{searchQuery}".
                  </td>
                </tr>
              )
            ) : activeTab === 'scheduled' ? (
              scheduledJobs.length > 0 ? (
                scheduledJobs.map((job) => (
                  <tr key={job.id} className="transition-colors hover:bg-surface-card-hover">
                    <td className="px-6 py-3.5 font-mono text-white">
                      <div className="flex items-center gap-2">
                        <span>{job.recipientEmail}</span>
                        <span className="rounded bg-surface-container px-1.5 py-0.2 font-mono text-[10px] text-text-muted">
                          {extractDomain(job.recipientEmail)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 max-w-xs truncate text-slate-300 font-medium">
                      {job.subject}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-text-muted">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-white">
                          <Calendar className="h-3 w-3 text-border-highlight" />
                          <span>{formatDate(job.scheduledTime)}</span>
                        </div>
                        <span className="text-[10px] text-sky-400">
                          {getRelativeTime(job.scheduledTime)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-text-muted">
                      <span className="truncate">{job.senderAccount?.email || 'Default Transporter'}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase text-sky-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                        SCHEDULED
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => onCancelJob(job.id)}
                        title="Cancel Scheduled Job"
                        className="inline-flex items-center gap-1 rounded border border-border-card bg-surface-container px-2.5 py-1 font-mono text-[11px] text-text-muted transition-all hover:border-red-500/50 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Cancel</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center font-mono text-text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="h-8 w-8 text-slate-600" />
                      <p className="text-base text-white font-display font-semibold">No scheduled emails in queue</p>
                      <p className="text-xs text-text-muted max-w-sm">
                        Use the "+ Schedule Campaign" button above to upload a CSV lead list and dispatch outreach.
                      </p>
                    </div>
                  </td>
                </tr>
              )
            ) : sentJobs.length > 0 ? (
              sentJobs.map((job) => (
                <tr key={job.id} className="transition-colors hover:bg-surface-card-hover">
                  <td className="px-6 py-3.5 font-mono text-white">
                    <div className="flex items-center gap-2">
                      <span>{job.recipientEmail}</span>
                      <span className="rounded bg-surface-container px-1.5 py-0.2 font-mono text-[10px] text-text-muted">
                        {extractDomain(job.recipientEmail)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 max-w-xs truncate text-slate-300 font-medium">{job.subject}</td>
                  <td className="px-6 py-3.5 font-mono text-text-muted">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                      <span>{formatDate(job.sentAt)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 font-mono text-text-muted">
                    <span className="truncate">{job.senderAccount?.email || 'Ethereal SMTP'}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-2.5 py-0.5 font-mono text-[10px] uppercase ${
                        job.status === 'SENT'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-red-500/30 bg-red-500/10 text-red-400'
                      }`}
                    >
                      {job.status === 'SENT' ? (
                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-red-400" />
                      )}
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {job.previewUrl ? (
                      <a
                        href={job.previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border-card bg-surface-container px-3 py-1 font-mono text-[11px] font-medium text-border-highlight transition-all hover:border-border-highlight hover:bg-sky-500/10 hover:text-white"
                      >
                        <span>Ethereal Preview</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="font-mono text-text-muted">No Preview</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center font-mono text-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle className="h-8 w-8 text-slate-600" />
                    <p className="text-base text-white font-display font-semibold">No dispatched emails yet</p>
                    <p className="text-xs text-text-muted max-w-sm">
                      Emails dispatched by the BullMQ worker threads will appear here with live Ethereal preview links.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border-card bg-surface-container px-6 py-3">
          <span className="font-mono text-xs text-text-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded border border-border-card bg-surface-card px-3 py-1 font-mono text-xs text-text-muted hover:text-white disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded border border-border-card bg-surface-card px-3 py-1 font-mono text-xs text-text-muted hover:text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
