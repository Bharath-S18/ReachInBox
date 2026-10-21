import React from 'react';
import { Bell, Layers, Mail } from 'lucide-react';
import { GlowBorderCard } from '../ui/GlowBorderCard';

export const LandingFeatures: React.FC = () => {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col items-start mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-card bg-surface-card px-3 py-0.5 font-mono text-[11px] uppercase tracking-wider text-border-highlight mb-3">
          <Layers className="h-3.5 w-3.5" />
          <span>Core Capabilities</span>
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Engineered for Absolute Reliability
        </h2>
        <p className="mt-3 font-sans text-sm text-text-muted max-w-2xl">
          Traditional schedulers drop jobs during server restarts and crash when rate limits are breached. ReachInbox guarantees zero email drops through persistent Redis queues and graceful fallbacks.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Card 1: BullMQ Queue Engine (Col 7) */}
        <GlowBorderCard className="md:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-text-muted">01 / ARCHITECTURE</span>
              <span className="rounded border border-border-card bg-code-badge-bg px-2 py-0.5 font-mono text-[10px] uppercase text-border-highlight">
                Redis Backed
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">
              Distributed BullMQ Queue & Worker Engine
            </h3>
            <p className="font-sans text-xs sm:text-sm text-text-muted leading-relaxed mb-6">
              Persistent Redis-backed job storage ensures that server crashes or restarts never lose pending or delayed jobs. Configurable worker concurrency and a strictly enforced 2,000ms inter-email delay prevent ESP throttling and domain penalties.
            </p>
          </div>

          <div className="rounded-lg border border-border-card bg-surface-container p-4 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-text-muted">
              <span>WORKER_CONCURRENCY</span>
              <span className="text-white font-semibold">5 Threads</span>
            </div>
            <div className="flex items-center justify-between text-text-muted">
              <span>MIN_THROTTLE_DELAY</span>
              <span className="text-border-highlight font-semibold">2,000 ms</span>
            </div>
            <div className="flex items-center justify-between text-text-muted">
              <span>PERSISTENCE_LAYER</span>
              <span className="text-emerald-400 font-semibold">Redis RDB + AOF</span>
            </div>
          </div>
        </GlowBorderCard>

        {/* Card 2: Slack Alerting (Col 5) */}
        <GlowBorderCard className="md:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-text-muted">02 / LIVE ALERTS</span>
              <span className="rounded border border-border-card bg-code-badge-bg px-2 py-0.5 font-mono text-[10px] uppercase text-amber-400">
                Slack OAuth 2.0
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">
              Atomic Rate Limit Cutoff & Slack Alerts
            </h3>
            <p className="font-sans text-xs sm:text-sm text-text-muted leading-relaxed mb-6">
              When a sender account hits its hourly quota, the rate limiter instantly defers remaining jobs to the next hour window and dispatches a live Block Kit notification directly to your Slack channel.
            </p>
          </div>

          <div className="rounded-lg border border-border-card bg-black/40 p-3.5 font-mono text-[11px] text-text-muted">
            <div className="flex items-center gap-2 text-white font-semibold mb-1">
              <Bell className="h-3.5 w-3.5 text-amber-400" />
              <span>[SLACK] Rate Limit Exceeded</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Sender: ethereal-1@example.com reached limit (50/50). Deferred 15 jobs to next UTC window.
            </p>
          </div>
        </GlowBorderCard>

        {/* Card 3: Multi-Sender SMTP (Col 5) */}
        <GlowBorderCard className="md:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-text-muted">03 / MULTI-TRANSPORTER</span>
              <span className="rounded border border-border-card bg-code-badge-bg px-2 py-0.5 font-mono text-[10px] uppercase text-emerald-400">
                SMTP Rotation
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">
              Multi-Sender Accounts & Ethereal Previews
            </h3>
            <p className="font-sans text-xs sm:text-sm text-text-muted leading-relaxed mb-6">
              Pool multiple sender accounts with independent hourly quotas. Test email campaigns safely using Ethereal SMTP with automatic message preview link extraction saved directly into PostgreSQL.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border-card bg-surface-container p-3 font-mono text-xs text-text-muted">
            <Mail className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="truncate">ethereal.email/message/test-preview-url</span>
          </div>
        </GlowBorderCard>

        {/* Card 4: Dual-Engine Search (Col 7) */}
        <GlowBorderCard className="md:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-text-muted">04 / FULL-TEXT SEARCH</span>
              <span className="rounded border border-border-card bg-code-badge-bg px-2 py-0.5 font-mono text-[10px] uppercase text-border-highlight">
                Dual-Engine
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">
              Elasticsearch v8 with Zero-Downtime Fallback
            </h3>
            <p className="font-sans text-xs sm:text-sm text-text-muted leading-relaxed mb-6">
              Full-text indexing with fuzzy matching on recipient email, subject, and body text. If the Elasticsearch cluster becomes unavailable, search automatically and transparently falls back to PostgreSQL ILIKE queries without disrupting users.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="rounded-lg border border-border-card bg-surface-container p-3">
              <span className="text-[10px] text-text-muted block">PRIMARY ENGINE</span>
              <span className="text-white font-semibold">Elasticsearch multi_match</span>
            </div>
            <div className="rounded-lg border border-border-card bg-surface-container p-3">
              <span className="text-[10px] text-text-muted block">FALLBACK ENGINE</span>
              <span className="text-emerald-400 font-semibold">PostgreSQL ILIKE</span>
            </div>
          </div>
        </GlowBorderCard>
      </div>
    </section>
  );
};
