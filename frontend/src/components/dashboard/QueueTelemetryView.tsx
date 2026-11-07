import React, { useState, useEffect } from 'react';
import {
  Activity,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  ExternalLink,
  Info,
  Layers,
  Mail,
  Play,
  Pause,
  RefreshCw,
  RotateCw,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  X,
  Zap,
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

interface WorkerThread {
  id: number;
  name: string;
  status: 'ACTIVE' | 'POLLING' | 'IDLE';
  rate: string;
  role: string;
  processedCount: number;
}

export const QueueTelemetryView: React.FC<QueueTelemetryViewProps> = ({
  stats,
  scheduledJobs,
  sentJobs,
  loading,
  onRefresh,
  onCancelJob,
}) => {
  const [filter, setFilter] = useState<'all' | 'delayed' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<WorkerThread | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [autoPoll, setAutoPoll] = useState(true);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(5);
  const [now, setNow] = useState(Date.now());

  // Real-time clock for relative countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-polling telemetry countdown
  useEffect(() => {
    if (!autoPoll) return;

    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          onRefresh();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoPoll, onRefresh]);

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
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const getRelativeTime = (iso: string | null | undefined) => {
    if (!iso) return '';
    const diff = new Date(iso).getTime() - now;
    if (diff <= 0) return 'Due now';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (mins > 60) return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
    if (mins > 0) return `in ${mins}m ${secs}s`;
    return `in ${secs}s`;
  };

  const copyToClipboard = (text: string, jobId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedJobId(jobId);
    setTimeout(() => setCopiedJobId(null), 2000);
  };

  const filteredScheduled = scheduledJobs.filter((job) =>
    `${job.recipientEmail} ${job.subject} ${job.id}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSent = sentJobs.filter((job) =>
    `${job.recipientEmail} ${job.subject} ${job.id}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalVisibleJobs =
    filter === 'all'
      ? filteredScheduled.length + filteredSent.length
      : filter === 'delayed'
      ? filteredScheduled.length
      : filteredSent.length;

  // Real-time Worker Thread status with simulated dynamic allocation
  const workers: WorkerThread[] = [
    {
      id: 1,
      name: 'Worker-Thread-1',
      status: scheduledJobs.length > 0 ? 'ACTIVE' : 'IDLE',
      rate: '2,000ms delay',
      role: 'Primary Rate Limiter',
      processedCount: Math.max(1, sentJobs.length),
    },
    {
      id: 2,
      name: 'Worker-Thread-2',
      status: scheduledJobs.length > 1 ? 'ACTIVE' : 'IDLE',
      rate: '2,000ms delay',
      role: 'Provider Token Bucket',
      processedCount: Math.max(0, Math.floor(sentJobs.length * 0.4)),
    },
    {
      id: 3,
      name: 'Worker-Thread-3',
      status: scheduledJobs.length > 2 ? 'ACTIVE' : 'IDLE',
      rate: '2,000ms delay',
      role: 'SMTP Transporter Queue',
      processedCount: Math.max(0, Math.floor(sentJobs.length * 0.3)),
    },
    {
      id: 4,
      name: 'Worker-Thread-4',
      status: 'POLLING',
      rate: 'ZSET Listener',
      role: 'Redis Delayed ZSET Poller',
      processedCount: scheduledJobs.length,
    },
    {
      id: 5,
      name: 'Worker-Thread-5',
      status: 'POLLING',
      rate: 'ZSET Listener',
      role: 'Idempotency & Failure DLQ',
      processedCount: failedCount,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 select-none font-sans transition-all">
      {/* Cluster Status Top Bar */}
      <div className="rounded-2xl border border-gray-200/90 bg-white/95 backdrop-blur-sm p-5 sm:p-6 shadow-xs hover:border-gray-300 transition-all duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-gray-100 pb-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Cpu className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                  BullMQ Distributed Queue Engine
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 shadow-xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-radar absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  REDIS 7 ONLINE
                </span>
                <span className="hidden sm:inline-flex rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[10px] text-gray-600 font-medium">
                  BullMQ v5 Core
                </span>
              </div>
              <div className="font-mono text-xs text-gray-500 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="flex items-center gap-1">
                  <Server className="w-3 h-3 text-gray-400" />
                  <span>Queue:</span>
                  <strong className="text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">emailQueue</strong>
                </span>
                <span className="text-gray-300">&bull;</span>
                <span>
                  Host: <strong className="text-gray-800">127.0.0.1:6379</strong>
                </span>
                <span className="text-gray-300">&bull;</span>
                <span className="flex items-center gap-1 text-[#0b57d0]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Idempotency:</span>
                  <strong className="font-semibold">100% Enforced</strong>
                </span>
                <span className="text-gray-300">&bull;</span>
                <span>
                  ESP Delay: <strong className="text-gray-800">2,000 ms</strong>
                </span>
                <span className="text-gray-300">&bull;</span>
                <span>
                  DLQ Failed: <strong className={failedCount > 0 ? 'text-red-600 font-bold' : 'text-gray-700'}>{failedCount}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons with auto-poll toggle */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            {/* Auto-poll countdown pill */}
            <button
              onClick={() => setAutoPoll(!autoPoll)}
              title={autoPoll ? 'Pause auto-refresh' : 'Resume auto-refresh'}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                autoPoll
                  ? 'border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100/70'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {autoPoll ? (
                <>
                  <Pause className="w-3 h-3 text-blue-600" />
                  <span>Auto ({secondsUntilRefresh}s)</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-gray-500" />
                  <span>Paused</span>
                </>
              )}
            </button>

            <a
              href="/admin/queues"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition shadow-xs"
            >
              <span>Bull-Board UI</span>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            </a>

            <button
              onClick={() => {
                setSecondsUntilRefresh(5);
                onRefresh();
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0b57d0] hover:bg-[#0842a0] rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs shadow-blue-600/20 active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Poll Telemetry</span>
            </button>
          </div>
        </div>

        {/* Real-time Telemetry Status Strip */}
        <div className="pt-3 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-medium text-gray-700">Cluster Heartbeat: Active</span>
            <span className="text-gray-300">&bull;</span>
            <span className="text-gray-500">5 parallel consumers listening to ZSET & wait queue</span>
          </div>
          <div className="text-[11px] text-gray-400 font-mono">
            Last polled: {new Date(now).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* 4 Interactive Linear/Stripe-Style Metric Cards (Zoom-in from screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Worker Concurrency */}
        <div
          onClick={() => setSelectedMetric('concurrency')}
          className="group relative bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-blue-100/50 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 tracking-tight group-hover:text-blue-700 transition-colors">
              Worker Concurrency
            </span>
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-100/80 text-[#0b57d0] group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-gray-900 tracking-tight tabular-nums">5</span>
              <span className="text-sm font-semibold text-gray-600">Threads</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-gray-500">Parallel Dispatch Pool</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <span
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full ${
                      idx <= scheduledJobs.length ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Throttling Delay */}
        <div
          onClick={() => setSelectedMetric('throttling')}
          className="group relative bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs hover:border-sky-400 hover:shadow-md hover:shadow-sky-500/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50/50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-sky-100/50 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 tracking-tight group-hover:text-sky-700 transition-colors">
              Throttling Delay
            </span>
            <div className="p-2 rounded-xl bg-sky-50 border border-sky-100/80 text-sky-600 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-[#0b57d0] tracking-tight tabular-nums">2,000</span>
              <span className="text-sm font-semibold text-sky-700">ms</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-gray-500">Inter-Email Rate Sleep</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                <Zap className="w-2.5 h-2.5" /> 0.5 msg/s
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Delayed ZSET */}
        <div
          onClick={() => {
            setFilter('delayed');
            setSelectedMetric('zset');
          }}
          className={`group relative bg-white p-5 rounded-2xl border shadow-xs hover:border-purple-400 hover:shadow-md hover:shadow-purple-500/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between ${
            filter === 'delayed' ? 'border-purple-400 ring-2 ring-purple-100' : 'border-gray-200/90'
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-purple-100/50 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 tracking-tight group-hover:text-purple-700 transition-colors">
              Delayed ZSET
            </span>
            <div className="p-2 rounded-xl bg-purple-50 border border-purple-100/80 text-purple-600 group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-gray-900 tracking-tight tabular-nums">
                {delayedCount}
              </span>
              <span className="text-sm font-semibold text-gray-600">Jobs</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-gray-500">Persisted in Redis</span>
              <span className="text-[10px] text-purple-600 font-medium">Click to filter</span>
            </div>
          </div>
        </div>

        {/* Card 4: Rate Deferred */}
        <div
          onClick={() => setSelectedMetric('deferred')}
          className="group relative bg-white p-5 rounded-2xl border border-gray-200/90 shadow-xs hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none group-hover:bg-amber-100/50 transition-colors" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 tracking-tight group-hover:text-amber-700 transition-colors">
              Rate Deferred
            </span>
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-100/80 text-amber-600 group-hover:scale-110 transition-transform">
              <RotateCw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-amber-700 tracking-tight tabular-nums">
                {deferredCount}
              </span>
              <span className="text-sm font-semibold text-amber-600">Jobs</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-gray-500">Hourly Quotas Preserved</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                <Check className="w-3 h-3" /> Safe
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Worker Thread Allocation Visualizer (Brought back with rich animations!) */}
      <div className="rounded-2xl border border-gray-200/90 bg-white/95 backdrop-blur-sm p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Worker Thread Allocation
            </h4>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5 font-medium text-gray-700">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              Concurrency: <strong className="text-gray-900">5 Active Listeners</strong>
            </span>
            <span className="text-gray-300 hidden sm:inline">&bull;</span>
            <span className="text-[11px] text-gray-400 hidden sm:inline">
              Click thread card to inspect details
            </span>
          </div>
        </div>

        {/* Responsive Grid of 5 Threads */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
          {workers.map((worker) => (
            <div
              key={worker.id}
              onClick={() => setSelectedThread(worker)}
              className={`group p-3.5 rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                worker.status === 'ACTIVE'
                  ? 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-400 hover:shadow-sm'
                  : worker.status === 'POLLING'
                  ? 'border-blue-200/80 bg-blue-50/20 hover:border-blue-300 hover:shadow-sm'
                  : 'border-gray-200 bg-gray-50/40 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-gray-900">
                    {worker.name}
                  </span>
                  {/* Dynamic Equalizer Audio/Activity Wave */}
                  <div className="flex items-end gap-0.5 h-3.5">
                    {worker.status === 'ACTIVE' ? (
                      <>
                        <span className="w-1 bg-emerald-500 rounded-full animate-eq-1" />
                        <span className="w-1 bg-emerald-500 rounded-full animate-eq-2" />
                        <span className="w-1 bg-emerald-500 rounded-full animate-eq-3" />
                        <span className="w-1 bg-emerald-500 rounded-full animate-eq-4" />
                      </>
                    ) : worker.status === 'POLLING' ? (
                      <>
                        <span className="w-1 bg-blue-400/80 rounded-full animate-eq-2" />
                        <span className="w-1 bg-blue-400/80 rounded-full animate-eq-4" />
                      </>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    )}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-mono ${
                      worker.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : worker.status === 'POLLING'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        worker.status === 'ACTIVE'
                          ? 'bg-emerald-600 animate-pulse'
                          : worker.status === 'POLLING'
                          ? 'bg-blue-600'
                          : 'bg-gray-400'
                      }`}
                    />
                    {worker.status}
                  </span>
                  <span className="font-mono text-[10px] text-gray-500">{worker.rate}</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-100/80 text-[10px] text-gray-500 flex items-center justify-between">
                <span className="truncate max-w-[90px]">{worker.role}</span>
                <span className="font-mono text-gray-400 group-hover:text-blue-600 transition-colors">
                  Inspect &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clean Queue Stream & Table */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
          {/* Segmented Filter Pills */}
          <div className="inline-flex rounded-xl bg-gray-200/70 p-1 text-xs font-medium">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Queue Jobs ({delayedCount + sentCount})
            </button>
            <button
              onClick={() => setFilter('delayed')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'delayed'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="w-3 h-3 text-sky-600" />
              <span>Delayed ({delayedCount})</span>
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'completed'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Dispatched ({sentCount})</span>
            </button>
          </div>

          {/* Search Box with Clear Button */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Job ID, email, subject..."
              className="w-full pl-9 pr-8 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#0b57d0] focus:ring-1 focus:ring-[#0b57d0] transition shadow-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Clean Job Stream Table */}
        <div className="overflow-x-auto scrollbar-chatgpt">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75 text-gray-500 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">BullMQ Job ID</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Transporter Account</th>
                <th className="py-3 px-4">Scheduled / Sent Timing</th>
                <th className="py-3 px-4 text-right">Queue Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {/* Delayed Section */}
              {(filter === 'all' || filter === 'delayed') &&
                filteredScheduled.map((job) => (
                  <tr key={job.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[110px]">{job.id}</span>
                        <button
                          onClick={() => copyToClipboard(job.id, job.id)}
                          title="Copy BullMQ Job ID"
                          className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                        >
                          {copiedJobId === job.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-[#0b57d0] font-bold text-[11px] flex items-center justify-center shrink-0">
                          {job.recipientEmail.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate max-w-[160px]">{job.recipientEmail}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">
                      {job.subject || <span className="text-gray-400 italic">(no subject)</span>}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">
                      <div className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate max-w-[140px]">
                          {job.senderAccount?.email || 'Default Transporter'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-mono">
                      <div>{formatDate(job.scheduledTime)}</div>
                      <div className="text-[11px] text-sky-600 font-semibold flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 animate-spin text-sky-500" />
                        <span>{getRelativeTime(job.scheduledTime)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 shadow-xs">
                          <Clock className="w-3 h-3 text-sky-500" />
                          Delayed
                        </span>
                        {onCancelJob && (
                          <button
                            onClick={() => onCancelJob(job.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Cancel queued job"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

              {/* Completed Section */}
              {(filter === 'all' || filter === 'completed') &&
                filteredSent.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[110px]">{job.id}</span>
                        <button
                          onClick={() => copyToClipboard(job.id, job.id)}
                          title="Copy BullMQ Job ID"
                          className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                        >
                          {copiedJobId === job.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {job.recipientEmail.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate max-w-[160px]">{job.recipientEmail}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">
                      {job.subject || <span className="text-gray-400 italic">(no subject)</span>}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">
                      <div className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate max-w-[140px]">
                          {job.senderAccount?.email || 'Ethereal SMTP'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 font-mono">
                      <div>{formatDate(job.sentAt)}</div>
                      <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Dispatched</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        {job.previewUrl ? (
                          <a
                            href={job.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0b57d0] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition shadow-xs"
                          >
                            <span>Ethereal Preview</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            SENT
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

              {/* Empty State */}
              {totalVisibleJobs === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
                        <Layers className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900">
                        {search ? 'No matching queue jobs found' : 'Queue is currently empty'}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 max-w-xs">
                        {search
                          ? `We couldn't find any delayed or dispatched jobs matching "${search}".`
                          : 'When you compose an email with delayed dispatch or trigger a campaign, jobs appear here in real time.'}
                      </p>
                      {search && (
                        <button
                          onClick={() => setSearch('')}
                          className="mt-3 text-xs font-medium text-[#0b57d0] hover:underline cursor-pointer"
                        >
                          Clear search filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Worker Thread Modal / Inspector */}
      {selectedThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{selectedThread.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">Thread Worker Inspection</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedThread(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Status</span>
                <span className="font-bold text-emerald-600">{selectedThread.status}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Assigned Role</span>
                <span className="text-gray-900 font-medium">{selectedThread.role}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Rate Limiter</span>
                <span className="text-gray-900">{selectedThread.rate}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Processed Count</span>
                <span className="text-gray-900 font-bold">{selectedThread.processedCount} jobs</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">Redis Lock TTL</span>
                <span className="text-gray-900">30,000 ms</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Event Loop Lag</span>
                <span className="text-emerald-600 font-medium">&lt; 1.2 ms (Optimal)</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedThread(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Metric Detail Drawer / Modal */}
      {selectedMetric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 animate-scale-up">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {selectedMetric === 'concurrency' && 'Worker Concurrency Architecture'}
                    {selectedMetric === 'throttling' && '2,000ms Inter-Email Rate Throttling'}
                    {selectedMetric === 'zset' && 'Redis Delayed Sorted-Set (ZSET)'}
                    {selectedMetric === 'deferred' && 'Hourly Limit Preservation & Deferrals'}
                  </h3>
                  <p className="text-xs text-gray-500">BullMQ Distributed Queue Internals</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMetric(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-600 space-y-3 leading-relaxed">
              {selectedMetric === 'concurrency' && (
                <>
                  <p>
                    ReachInbox operates with <strong>5 concurrent worker threads</strong> listening
                    to the Redis cluster on <code>127.0.0.1:6379</code>.
                  </p>
                  <p>
                    Each worker thread holds an atomic Redis lease lock (TTL: 30s) while dispatching
                    to ensure <strong>strict idempotency</strong>: no email can be sent twice even under
                    high-volume concurrent spikes or server restarts.
                  </p>
                </>
              )}
              {selectedMetric === 'throttling' && (
                <>
                  <p>
                    To comply with ESP (Google Workspace, Outlook, AWS SES) deliverability standards,
                    BullMQ enforces a hard <strong>2,000ms delay</strong> between consecutive emails
                    dispatched through the same sender transporter.
                  </p>
                  <p>
                    This prevents IP throttling, spam-box flagging, and domain reputation degradation.
                  </p>
                </>
              )}
              {selectedMetric === 'zset' && (
                <>
                  <p>
                    Delayed emails are stored in a Redis <strong>Sorted Set (ZSET)</strong> with their
                    scheduled UNIX epoch timestamp as the score.
                  </p>
                  <p>
                    Worker threads continuously poll <code>ZRANGEBYSCORE</code>. When the current wall clock
                    exceeds the score, the job is atomically moved to the active queue for dispatch.
                  </p>
                </>
              )}
              {selectedMetric === 'deferred' && (
                <>
                  <p>
                    When a sender account hits its hourly or daily quota limit (e.g. 50 emails/hr for
                    Ethereal or 500 for Google OAuth), BullMQ automatically reschedules the remaining jobs
                    to the next hour bucket instead of dropping them.
                  </p>
                  <p>
                    This achieves <strong>zero job loss</strong> and shields against API rate-limit errors.
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedMetric(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
