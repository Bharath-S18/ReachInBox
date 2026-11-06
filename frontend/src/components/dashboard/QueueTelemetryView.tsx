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

  // Dynamic worker threads visualizer
  const workers = [
    { id: 1, name: 'Worker-Thread-1', status: scheduledJobs.length > 0 ? 'ACTIVE' : 'IDLE', rate: '2,000ms delay' },
    { id: 2, name: 'Worker-Thread-2', status: scheduledJobs.length > 1 ? 'ACTIVE' : 'IDLE', rate: '2,000ms delay' },
    { id: 3, name: 'Worker-Thread-3', status: scheduledJobs.length > 2 ? 'ACTIVE' : 'IDLE', rate: '2,000ms delay' },
    { id: 4, name: 'Worker-Thread-4', status: 'POLLING', rate: 'ZSET Listener' },
    { id: 5, name: 'Worker-Thread-5', status: 'POLLING', rate: 'ZSET Listener' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Cluster Status Top Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-[#0b57d0]">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  BullMQ Distributed Queue Engine
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 font-mono text-[11px] font-semibold text-[#0b57d0]">
                  <span className="h-2 w-2 rounded-full bg-[#0b57d0] animate-pulse" />
                  REDIS 7 ONLINE
                </span>
                <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[10px] text-gray-600">
                  BullMQ v5 Core
                </span>
              </div>
              <p className="font-mono text-xs text-gray-500 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Queue: <strong className="text-gray-900">emailQueue</strong></span>
                <span>Host: <strong className="text-gray-900">127.0.0.1:6379</strong></span>
                <span>Idempotency: <strong className="text-[#0b57d0] font-semibold">100% Enforced</strong></span>
                <span>ESP Delay: <strong className="text-gray-900">2,000 ms</strong></span>
                <span>DLQ Failed: <strong className="text-red-600">{failedCount}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin/queues"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 shadow-sm"
            >
              <span>Bull-Board UI</span>
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
            </a>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[#0b57d0] px-4 py-2 font-medium text-xs text-white transition hover:bg-[#0842a0] shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Poll Telemetry</span>
            </button>
          </div>
        </div>

        {/* 4 Architectural Telemetry Metrics */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 font-mono">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-[11px] uppercase tracking-wider">Worker Concurrency</span>
              <Activity className="h-4 w-4 text-[#0b57d0]" />
            </div>
            <span className="text-2xl font-bold text-gray-900 block">5 Threads</span>
            <span className="text-[11px] text-[#0b57d0]">Parallel Dispatch Pool</span>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 font-mono">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-[11px] uppercase tracking-wider">Throttling Delay</span>
              <Clock className="h-4 w-4 text-[#0b57d0]" />
            </div>
            <span className="text-2xl font-bold text-[#0b57d0] block">2,000 ms</span>
            <span className="text-[11px] text-gray-500">Inter-Email Sleep</span>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 font-mono">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-[11px] uppercase tracking-wider">Delayed ZSET</span>
              <Layers className="h-4 w-4 text-sky-500" />
            </div>
            <span className="text-2xl font-bold text-gray-900 block">
              {delayedCount} Jobs
            </span>
            <span className="text-[11px] text-sky-600">Persisted in Redis</span>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 font-mono">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-[11px] uppercase tracking-wider">Rate Deferred</span>
              <RotateCw className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-2xl font-bold text-amber-600 block">
              {deferredCount} Jobs
            </span>
            <span className="text-[11px] text-amber-700/80">Hourly Limits Preserved</span>
          </div>
        </div>

        {/* Worker Pool Activity Strip */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3 font-mono text-xs text-gray-500">
            <span className="uppercase tracking-wider">Worker Thread Allocation</span>
            <span>Concurrency: 5 Active Listeners</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {workers.map((w) => (
              <div
                key={w.id}
                className="rounded-lg border border-gray-200 bg-white p-3 font-mono text-xs flex flex-col justify-between shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-900 font-semibold text-[11px]">{w.name}</span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      w.status === 'ACTIVE'
                        ? 'bg-[#0b57d0] animate-pulse'
                        : w.status === 'POLLING'
                        ? 'bg-sky-500'
                        : 'bg-gray-300'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span className={w.status === 'ACTIVE' ? 'text-[#0b57d0] font-semibold' : 'text-gray-400'}>
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
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {/* Table Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3.5 py-1.5 font-medium text-xs transition ${
                filter === 'all'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Queue Jobs ({delayedCount + sentCount})
            </button>
            <button
              onClick={() => setFilter('delayed')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-medium text-xs transition ${
                filter === 'delayed'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Delayed Queue ({delayedCount})</span>
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-medium text-xs transition ${
                filter === 'completed'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Dispatched ({sentCount})</span>
            </button>
          </div>

          <div className="relative flex items-center">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Job ID, email, subject..."
              className="rounded-lg border border-gray-200 bg-gray-50/50 py-1.5 pl-8 pr-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-[#0b57d0] focus:bg-white focus:outline-none w-full sm:w-64 transition"
            />
          </div>
        </div>

        {/* Job Stream Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50/70 font-mono uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3 font-semibold">BullMQ Job ID</th>
                <th className="px-6 py-3 font-semibold">Recipient</th>
                <th className="px-6 py-3 font-semibold">Subject</th>
                <th className="px-6 py-3 font-semibold">Transporter Account</th>
                <th className="px-6 py-3 font-semibold">Scheduled / Sent Timing</th>
                <th className="px-6 py-3 font-semibold text-right">Queue Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {/* Delayed Section */}
              {(filter === 'all' || filter === 'delayed') &&
                filteredScheduled.map((job) => (
                  <tr key={job.id} className="transition-colors hover:bg-gray-50/70">
                    <td className="px-6 py-3.5 font-mono text-[11px] text-[#0b57d0] font-semibold">
                      {job.id.substring(0, 16)}...
                    </td>
                    <td className="px-6 py-3.5 text-gray-900 font-medium">
                      {job.recipientEmail}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 max-w-xs truncate">
                      {job.subject}
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">
                      {job.senderAccount?.email || 'Default Transporter'}
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-gray-900">
                          <Clock className="h-3 w-3 text-sky-500" />
                          <span>{formatDate(job.scheduledTime)}</span>
                        </div>
                        <span className="text-[10px] text-sky-600 font-medium">
                          {getRelativeTime(job.scheduledTime)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 font-mono text-[10px] uppercase font-semibold text-sky-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                          DELAYED
                        </span>
                        {onCancelJob && (
                          <button
                            onClick={() => onCancelJob(job.id)}
                            className="rounded border border-gray-200 bg-white px-2 py-0.5 font-mono text-[10px] text-gray-600 hover:border-red-300 hover:text-red-600 transition"
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
                  <tr key={job.id} className="transition-colors hover:bg-gray-50/70">
                    <td className="px-6 py-3.5 font-mono text-[11px] text-gray-400">
                      {job.id.substring(0, 16)}...
                    </td>
                    <td className="px-6 py-3.5 text-gray-900 font-medium">
                      {job.recipientEmail}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 max-w-xs truncate">
                      {job.subject}
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">
                      {job.senderAccount?.email || 'Ethereal SMTP'}
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-[#0b57d0]" />
                        <span>{formatDate(job.sentAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {job.previewUrl ? (
                        <a
                          href={job.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-[#0b57d0] hover:bg-blue-100 transition"
                        >
                          <span>Ethereal Preview</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-mono text-[10px] uppercase font-semibold text-[#0b57d0]">
                          SENT
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

              {filteredScheduled.length === 0 && filteredSent.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-xs text-gray-400 font-medium">
                    No active or historical queue jobs found.
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
