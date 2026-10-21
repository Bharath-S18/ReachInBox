import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  Layers,
  RefreshCw,
  RotateCw,
  Search,
} from 'lucide-react';
import { EmailStats, ScheduledEmailJob, SentEmailJob } from '../../types';

interface QueueTelemetryViewProps {
  stats: EmailStats | null;
  scheduledJobs: ScheduledEmailJob[];
  sentJobs: SentEmailJob[];
  loading: boolean;
  onRefresh: () => void;
  onCancelJob?: (jobId: string) => void;
}

export const QueueTelemetryView: React.FC<QueueTelemetryViewProps> = ({
  stats,
  scheduledJobs,
  sentJobs,
  loading,
  onRefresh,
  onCancelJob,
}) => {
  const [filter, setFilter] = useState<'all' | 'delayed' | 'completed' | 'deferred'>('all');
  const [search, setSearch] = useState('');

  const delayedCount = stats?.scheduled ?? scheduledJobs.length;
  const sentCount = stats?.sent ?? sentJobs.length;
  const deferredCount = stats?.rescheduled ?? 0;
  const failedCount = stats?.failed ?? 0;

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
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

  const filteredScheduled = scheduledJobs.filter((job) =>
    `${job.recipientEmail} ${job.subject} ${job.id}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSent = sentJobs.filter((job) =>
    `${job.recipientEmail} ${job.subject} ${job.id}`.toLowerCase().includes(search.toLowerCase())
  );

  // Worker threads simulation for visual cockpit
  const workers = [
    { id: 1, name: 'Worker-Thread-1', status: scheduledJobs.length > 0 ? 'ACTIVE' : 'IDLE', rate: '2,000ms delay' },
    { id: 2, name: 'Worker-Thread-2', status: scheduledJobs.length > 1 ? 'ACTIVE' : 'IDLE', rate: '2,000ms delay' },
    { id: 3, name: 'Worker-Thread-3', status: scheduledJobs.length > 2 ? 'ACTIVE' : 'IDLE', rate: '2,000ms delay' },
    { id: 4, name: 'Worker-Thread-4', status: 'POLLING', rate: 'ZSET Listener' },
    { id: 5, name: 'Worker-Thread-5', status: 'POLLING', rate: 'ZSET Listener' },
  ];

  return (
    <div className="space-y-8">
      {/* Cluster Status Top Bar */}
      <div className="rounded-2xl border border-border-card bg-surface-card p-6 lg:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-border-highlight/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-border-card pb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-card bg-surface-container text-border-highlight shadow-glow-cyan">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-xl font-bold text-white tracking-tight">
                  BullMQ Distributed Queue Engine
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 font-mono text-[11px] font-semibold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  REDIS 7 ONLINE
                </span>
                <span className="rounded border border-border-card bg-code-badge-bg px-2 py-0.5 font-mono text-[10px] text-border-highlight">
                  BullMQ v5 Core
                </span>
              </div>
              <p className="font-mono text-xs text-text-muted mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Queue: <strong className="text-white">emailQueue</strong></span>
                <span>Host: <strong className="text-white">127.0.0.1:6379</strong></span>
                <span>Idempotency: <strong className="text-emerald-400">100% Enforced</strong></span>
                <span>ESP Delay: <strong className="text-border-highlight">2,000 ms</strong></span>
                <span>DLQ Failed: <strong className="text-red-400">{failedCount}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-border-card bg-surface-container px-4 py-2 font-mono text-xs text-text-muted transition-all hover:border-border-highlight hover:text-white active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-border-highlight' : ''}`} />
              <span>Poll Telemetry</span>
            </button>
          </div>
        </div>

        {/* 4 Architectural Telemetry Metrics */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          <div className="rounded-xl border border-border-card bg-surface-container p-4 font-mono transition-all hover:border-zinc-700">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] uppercase tracking-wider">Worker Concurrency</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="font-display text-2xl font-bold text-white block">5 Threads</span>
            <span className="text-[11px] text-emerald-400">Parallel Dispatch Pool</span>
          </div>

          <div className="rounded-xl border border-border-card bg-surface-container p-4 font-mono transition-all hover:border-zinc-700">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] uppercase tracking-wider">Throttling Delay</span>
              <Clock className="h-4 w-4 text-border-highlight" />
            </div>
            <span className="font-display text-2xl font-bold text-border-highlight block">2,000 ms</span>
            <span className="text-[11px] text-slate-400">Inter-Email Sleep</span>
          </div>

          <div className="rounded-xl border border-border-card bg-surface-container p-4 font-mono transition-all hover:border-zinc-700">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] uppercase tracking-wider">Delayed ZSET</span>
              <Layers className="h-4 w-4 text-sky-400" />
            </div>
            <span className="font-display text-2xl font-bold text-white block">
              {delayedCount} Jobs
            </span>
            <span className="text-[11px] text-sky-400">Persisted in Redis</span>
          </div>

          <div className="rounded-xl border border-border-card bg-surface-container p-4 font-mono transition-all hover:border-zinc-700">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] uppercase tracking-wider">Rate Deferred</span>
              <RotateCw className="h-4 w-4 text-amber-400" />
            </div>
            <span className="font-display text-2xl font-bold text-amber-400 block">
              {deferredCount} Jobs
            </span>
            <span className="text-[11px] text-amber-400/80">Hourly Limits Preserved</span>
          </div>
        </div>

        {/* Worker Pool Activity Strip */}
        <div className="mt-6 pt-6 border-t border-border-card">
          <div className="flex items-center justify-between mb-3 font-mono text-xs text-text-muted">
            <span className="uppercase tracking-wider">Worker Thread Allocation</span>
            <span>Concurrency: 5 Active Listeners</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {workers.map((w) => (
              <div
                key={w.id}
                className="rounded-lg border border-border-card bg-surface-card p-3 font-mono text-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold text-[11px]">{w.name}</span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      w.status === 'ACTIVE'
                        ? 'bg-emerald-400 animate-pulse'
                        : w.status === 'POLLING'
                        ? 'bg-sky-400'
                        : 'bg-slate-600'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span className={w.status === 'ACTIVE' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                    {w.status}
                  </span>
                  <span>{w.rate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Job Stream & Queue Inspector */}
      <div className="rounded-2xl border border-border-card bg-surface-card overflow-hidden shadow-xl">
        {/* Table Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-card px-6 py-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3.5 py-1.5 font-mono text-xs transition-all ${
                filter === 'all'
                  ? 'bg-white font-semibold text-black shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              All Queue Jobs ({delayedCount + sentCount})
            </button>
            <button
              onClick={() => setFilter('delayed')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-mono text-xs transition-all ${
                filter === 'delayed'
                  ? 'bg-white font-semibold text-black shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Delayed Queue ({delayedCount})</span>
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-mono text-xs transition-all ${
                filter === 'completed'
                  ? 'bg-white font-semibold text-black shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Dispatched ({sentCount})</span>
            </button>
          </div>

          <div className="relative flex items-center">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Job ID, email, subject..."
              className="rounded-lg border border-border-card bg-surface-container py-1.5 pl-8 pr-3 font-sans text-xs text-white placeholder:text-text-muted focus:border-border-highlight focus:outline-none w-full sm:w-64"
            />
          </div>
        </div>

        {/* Job Stream Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-xs font-sans">
            <thead className="border-b border-border-card bg-surface-container font-mono uppercase tracking-wider text-text-muted">
              <tr>
                <th className="px-6 py-3 font-semibold">BullMQ Job ID</th>
                <th className="px-6 py-3 font-semibold">Recipient</th>
                <th className="px-6 py-3 font-semibold">Subject</th>
                <th className="px-6 py-3 font-semibold">Transporter Account</th>
                <th className="px-6 py-3 font-semibold">Scheduled / Sent Timing</th>
                <th className="px-6 py-3 font-semibold text-right">Queue Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border-card/60">
              {/* Delayed Section */}
              {(filter === 'all' || filter === 'delayed') &&
                filteredScheduled.map((job) => (
                  <tr key={job.id} className="transition-colors hover:bg-surface-card-hover">
                    <td className="px-6 py-3.5 font-mono text-[11px] text-border-highlight">
                      {job.id.substring(0, 16)}...
                    </td>
                    <td className="px-6 py-3.5 font-mono text-white font-medium">
                      {job.recipientEmail}
                    </td>
                    <td className="px-6 py-3.5 text-slate-300 max-w-xs truncate">
                      {job.subject}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-text-muted">
                      {job.senderAccount?.email || 'Default Transporter'}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-text-muted">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-white">
                          <Clock className="h-3 w-3 text-sky-400" />
                          <span>{formatDate(job.scheduledTime)}</span>
                        </div>
                        <span className="text-[10px] text-sky-400">
                          {getRelativeTime(job.scheduledTime)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase text-sky-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                          DELAYED
                        </span>
                        {onCancelJob && (
                          <button
                            onClick={() => onCancelJob(job.id)}
                            className="rounded border border-border-card bg-surface-container px-2 py-0.5 font-mono text-[10px] text-text-muted hover:border-red-500/50 hover:text-red-400 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

              {/* Completed Section */}
              {(filter === 'all' || filter === 'completed') &&
                filteredSent.map((job) => (
                  <tr key={job.id} className="transition-colors hover:bg-surface-card-hover">
                    <td className="px-6 py-3.5 font-mono text-[11px] text-text-muted">
                      {job.id.substring(0, 16)}...
                    </td>
                    <td className="px-6 py-3.5 font-mono text-white font-medium">
                      {job.recipientEmail}
                    </td>
                    <td className="px-6 py-3.5 text-slate-300 max-w-xs truncate">
                      {job.subject}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-text-muted">
                      {job.senderAccount?.email || 'Ethereal SMTP'}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-text-muted">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        <span>{formatDate(job.sentAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {job.previewUrl ? (
                        <a
                          href={job.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-border-card bg-surface-container px-2.5 py-1 font-mono text-[10px] text-border-highlight hover:border-border-highlight hover:text-white transition-colors"
                        >
                          <span>Ethereal Preview</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase text-emerald-400">
                          SENT
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

              {filteredScheduled.length === 0 && filteredSent.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center font-mono text-xs text-text-muted">
                    No active or historical queue jobs matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
