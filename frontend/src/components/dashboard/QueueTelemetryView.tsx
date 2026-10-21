import React from 'react';
import { Activity, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import { EmailStats, ScheduledEmailJob, SentEmailJob } from '../../types';

interface QueueTelemetryViewProps {
  stats: EmailStats | null;
  scheduledJobs: ScheduledEmailJob[];
  sentJobs: SentEmailJob[];
  loading: boolean;
  onRefresh: () => void;
}

export const QueueTelemetryView: React.FC<QueueTelemetryViewProps> = ({
  stats,
  scheduledJobs,
  sentJobs,
  loading,
  onRefresh,
}) => {
  return (
    <div className="space-y-6">
      {/* Telemetry Overview Card */}
      <div className="rounded-xl border border-border-card bg-surface-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-card pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-card bg-surface-container text-amber-400 shadow-sm">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-white tracking-tight">
                  BullMQ Queue Engine & Worker Cluster
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <p className="font-mono text-xs text-text-muted mt-0.5">
                Cluster: emailQueue | Redis Port: 6379 | Concurrency: 5 | Throttle: 2000ms
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-border-card bg-surface-container px-3 py-1.5 font-mono text-xs text-text-muted transition-colors hover:border-border-highlight hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-border-highlight' : ''}`} />
              <span>Poll Status</span>
            </button>

            <a
              href="http://localhost:5000/admin/queues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 font-display text-xs font-semibold text-black shadow-glow-white transition-all hover:bg-slate-200 active:scale-95"
            >
              <span>Open Bull-Board Web UI</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Worker Cluster Metrics Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border-card bg-surface-container p-4 font-mono">
            <span className="text-[11px] text-text-muted block">WORKER THREADS</span>
            <span className="font-display text-2xl font-bold text-white mt-1 block">5 Active</span>
            <span className="text-[10px] text-emerald-400">Concurrency Enforced</span>
          </div>

          <div className="rounded-lg border border-border-card bg-surface-container p-4 font-mono">
            <span className="text-[11px] text-text-muted block">INTER-EMAIL THROTTLE</span>
            <span className="font-display text-2xl font-bold text-border-highlight mt-1 block">2,000 ms</span>
            <span className="text-[10px] text-slate-400">Min Provider Delay</span>
          </div>

          <div className="rounded-lg border border-border-card bg-surface-container p-4 font-mono">
            <span className="text-[11px] text-text-muted block">PERSISTENT QUEUE</span>
            <span className="font-display text-2xl font-bold text-white mt-1 block">
              {stats?.scheduled || 0} Jobs
            </span>
            <span className="text-[10px] text-sky-400">Delayed in Redis</span>
          </div>

          <div className="rounded-lg border border-border-card bg-surface-container p-4 font-mono">
            <span className="text-[11px] text-text-muted block">RATE LIMIT BOUNDARY</span>
            <span className="font-display text-2xl font-bold text-amber-400 mt-1 block">
              {stats?.rescheduled || 0} Deferred
            </span>
            <span className="text-[10px] text-amber-400/80">Hourly Quotas Safe</span>
          </div>
        </div>
      </div>

      {/* Live Job Stream Inspector */}
      <div className="rounded-xl border border-border-card bg-surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border-card px-6 py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-border-highlight" />
            <h4 className="font-display text-sm font-bold text-white tracking-tight">
              Live Queue Job Stream
            </h4>
          </div>
          <span className="font-mono text-xs text-text-muted">
            {scheduledJobs.length} Delayed • {sentJobs.length} Dispatched
          </span>
        </div>

        <div className="divide-y divide-border-card/60 overflow-x-auto">
          {scheduledJobs.length === 0 && sentJobs.length === 0 ? (
            <div className="px-6 py-12 text-center font-mono text-xs text-text-muted">
              Queue is currently idle. Schedule an email campaign to view real-time delayed job telemetry.
            </div>
          ) : (
            <>
              {scheduledJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between px-6 py-3 text-xs font-mono hover:bg-surface-card-hover transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                    <div>
                      <p className="text-white font-medium">{job.recipientEmail}</p>
                      <p className="text-[11px] text-text-muted font-sans">{job.subject}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-text-muted text-[11px]">
                    <span>Sender: {job.senderAccount?.email}</span>
                    <span className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-400 uppercase text-[10px]">
                      DELAYED
                    </span>
                  </div>
                </div>
              ))}

              {sentJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between px-6 py-3 text-xs font-mono hover:bg-surface-card-hover transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <div>
                      <p className="text-white font-medium">{job.recipientEmail}</p>
                      <p className="text-[11px] text-text-muted font-sans">{job.subject}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-text-muted text-[11px]">
                    <span>Sender: {job.senderAccount?.email}</span>
                    <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-400 uppercase text-[10px]">
                      DISPATCHED
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
