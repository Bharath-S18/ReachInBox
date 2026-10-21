import React from 'react';
import { Activity, Clock, HardDrive, RotateCw, Zap } from 'lucide-react';
import { GlowBorderCard } from '../ui/GlowBorderCard';

interface LandingQueueSectionProps {
  onOpenDashboard: () => void;
  onOpenAuth: () => void;
  isLoggedIn: boolean;
}

export const LandingQueueSection: React.FC<LandingQueueSectionProps> = ({
  onOpenDashboard,
  onOpenAuth,
  isLoggedIn,
}) => {
  return (
    <section id="queue" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-border-card">
      <div className="flex flex-col items-start mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-card bg-surface-card px-3.5 py-1 font-mono text-[11px] uppercase tracking-wider text-border-highlight mb-3">
          <Zap className="h-3.5 w-3.5" />
          <span>BullMQ Engine Deep-Dive</span>
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Native Queue Engine Mechanics
        </h2>
        <p className="mt-3 font-sans text-sm text-text-muted max-w-2xl">
          Unlike standard queue managers that freeze or drop jobs, ReachInbox uses a persistent BullMQ engine with Redis sorted sets to guarantee exact millisecond dispatch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pillar 1 */}
        <GlowBorderCard>
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-xs text-text-muted">RELIABILITY</span>
            <div className="rounded-lg border border-border-card bg-surface-container p-2 text-border-highlight">
              <HardDrive className="h-4 w-4" />
            </div>
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-2">
            Redis Delayed Queue (ZSET)
          </h3>
          <p className="font-sans text-xs sm:text-sm text-text-muted leading-relaxed">
            Every scheduled outreach campaign creates delayed jobs in Redis scored by exact Unix millisecond timestamps. If the server terminates unexpectedly, jobs resume automatically upon restart without duplicate sending.
          </p>
        </GlowBorderCard>

        {/* Pillar 2 */}
        <GlowBorderCard>
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-xs text-text-muted">THROTTLING</span>
            <div className="rounded-lg border border-border-card bg-surface-container p-2 text-emerald-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-2">
            2,000ms ESP Protection Delay
          </h3>
          <p className="font-sans text-xs sm:text-sm text-text-muted leading-relaxed">
            Worker threads enforce a minimum 2-second sleep between consecutive emails per transporter. This prevents email service providers (Gmail, Outlook) from rate-limiting the sender IP or marking outreach as spam.
          </p>
        </GlowBorderCard>

        {/* Pillar 3 */}
        <GlowBorderCard>
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-xs text-text-muted">ISOLATION</span>
            <div className="rounded-lg border border-border-card bg-surface-container p-2 text-amber-400">
              <RotateCw className="h-4 w-4" />
            </div>
          </div>
          <h3 className="font-display text-lg font-bold text-white mb-2">
            Multi-Sender Rate Isolation
          </h3>
          <p className="font-sans text-xs sm:text-sm text-text-muted leading-relaxed">
            Each SMTP transporter maintains its own atomic Redis hourly quota counter (key pattern: rl:sender:id:window). Reaching the quota on one sender pauses only that transporter, allowing others to continue dispatching uninterrupted.
          </p>
        </GlowBorderCard>
      </div>

      <div className="mt-8 flex items-center justify-between rounded-xl border border-border-card bg-surface-card p-6">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-border-highlight" />
          <div>
            <p className="font-display text-sm font-bold text-white">
              Ready to explore live worker telemetry?
            </p>
            <p className="font-sans text-xs text-text-muted">
              Launch the ReachInbox operations dashboard to schedule campaigns and observe BullMQ jobs in real time.
            </p>
          </div>
        </div>

        <button
          onClick={isLoggedIn ? onOpenDashboard : onOpenAuth}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-display text-xs font-semibold text-black transition-all hover:bg-slate-200 active:scale-95 shrink-0"
        >
          <span>{isLoggedIn ? 'View Queue Telemetry' : 'Launch Dashboard'}</span>
        </button>
      </div>
    </section>
  );
};
