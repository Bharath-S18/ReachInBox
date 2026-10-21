import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Play,
  RotateCw,
  Zap,
} from 'lucide-react';

interface LandingHeroProps {
  onOpenAuth: () => void;
  onOpenDashboard: () => void;
  isLoggedIn: boolean;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onOpenAuth,
  onOpenDashboard,
  isLoggedIn,
}) => {
  const [simStep, setSimStep] = useState<number>(0);
  const [simRunning, setSimRunning] = useState<boolean>(false);

  const runSimulation = () => {
    if (simRunning) return;
    setSimRunning(true);
    setSimStep(1); // Enqueued

    setTimeout(() => {
      setSimStep(2); // Rate check & throttle
    }, 1200);

    setTimeout(() => {
      setSimStep(3); // Dispatched
      setSimRunning(false);
    }, 2800);
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Background Radial Glow */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-b from-sky-400/10 via-purple-500/5 to-transparent blur-3xl -z-10" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Heading & CTAs */}
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border-card bg-surface-card px-3.5 py-1 font-mono text-[11px] text-text-muted mb-6 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-border-highlight animate-pulse" />
            <span>BullMQ Queue Engine • Redis Rate Boundary</span>
          </div>

          {/* Main Title */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            High-Performance{' '}
            <span className="bg-gradient-to-r from-sky-400 via-white to-slate-400 bg-clip-text text-transparent">
              Email Orchestration
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 font-sans text-sm sm:text-base text-text-muted max-w-xl leading-relaxed">
            Idempotent delayed scheduling, multi-sender SMTP dispatch, strict hourly rate limiting, and real-time Slack alerting engineered for scalable developer outreach.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={isLoggedIn ? onOpenDashboard : onOpenAuth}
              className="flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-display text-xs sm:text-sm font-semibold text-black shadow-glow-white transition-all hover:bg-slate-200 active:scale-95"
            >
              <Zap className="h-4 w-4" />
              <span>{isLoggedIn ? 'Launch Outreach Dashboard' : 'Open Dashboard (Demo / Google)'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <a
              href="#architecture"
              className="flex items-center gap-2 rounded-lg border border-border-card bg-surface-card px-4 py-3 font-mono text-xs sm:text-sm text-text-muted transition-all hover:border-border-highlight hover:text-white"
            >
              <span>Explore Architecture</span>
            </a>
          </div>

          {/* Telemetry Highlights */}
          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-border-card/60 pt-6 font-mono text-xs text-text-muted">
            <div>
              <span className="block font-display text-xl font-bold text-white">0%</span>
              <span className="text-[11px]">Job Drop Rate</span>
            </div>
            <div>
              <span className="block font-display text-xl font-bold text-border-highlight">2,000ms</span>
              <span className="text-[11px]">Throttle Precision</span>
            </div>
            <div>
              <span className="block font-display text-xl font-bold text-emerald-400">100%</span>
              <span className="text-[11px]">Idempotent Execution</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Dispatch Simulator Box */}
        <div className="lg:col-span-5 w-full">
          <div className="rounded-2xl border border-border-card bg-surface-card p-6 shadow-2xl relative overflow-hidden">
            {/* Box Header */}
            <div className="flex items-center justify-between border-b border-border-card pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-border-highlight animate-ping" />
                <span className="font-mono text-xs font-semibold text-white">
                  LIVE WORKER SIMULATOR
                </span>
              </div>
              <button
                onClick={runSimulation}
                disabled={simRunning}
                className="flex items-center gap-1.5 rounded bg-surface-container border border-border-card px-2.5 py-1 font-mono text-[11px] text-border-highlight transition-all hover:border-border-highlight hover:text-white active:scale-95 disabled:opacity-50"
              >
                <Play className="h-3 w-3" />
                <span>{simRunning ? 'Executing Pipeline...' : 'Run Simulation'}</span>
              </button>
            </div>

            {/* Simulation Pipeline Steps */}
            <div className="space-y-3 font-mono text-xs">
              {/* Step 1: Delayed Queue */}
              <div
                className={`rounded-xl border p-3.5 transition-all ${
                  simStep >= 1
                    ? 'border-sky-500/40 bg-sky-950/20 text-white'
                    : 'border-border-card bg-surface-container/60 text-text-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-4 w-4 ${simStep >= 1 ? 'text-sky-400' : 'text-slate-600'}`} />
                    <span className="font-semibold">1. BullMQ Delayed Queue</span>
                  </div>
                  <span className="text-[10px] uppercase">
                    {simStep >= 1 ? 'Job Enqueued' : 'Idle'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-text-muted font-sans">
                  Target: lead.enterprise@domain.com | Delay: 5m
                </p>
              </div>

              {/* Step 2: Rate Limit & Throttling */}
              <div
                className={`rounded-xl border p-3.5 transition-all ${
                  simStep >= 2
                    ? 'border-amber-500/40 bg-amber-950/20 text-white'
                    : 'border-border-card bg-surface-container/60 text-text-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCw className={`h-4 w-4 ${simStep >= 2 ? 'text-amber-400 animate-spin' : 'text-slate-600'}`} />
                    <span className="font-semibold">2. Rate Boundary & Throttle</span>
                  </div>
                  <span className="text-[10px] uppercase">
                    {simStep >= 2 ? 'Throttling (2000ms)' : 'Standby'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-text-muted font-sans">
                  Redis hourly count: 12/50 | Delay between sends enforced
                </p>
              </div>

              {/* Step 3: SMTP Dispatch & Ethereal URL */}
              <div
                className={`rounded-xl border p-3.5 transition-all ${
                  simStep >= 3
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-white'
                    : 'border-border-card bg-surface-container/60 text-text-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${simStep >= 3 ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span className="font-semibold">3. SMTP Ethereal Dispatch</span>
                  </div>
                  <span className="text-[10px] uppercase">
                    {simStep >= 3 ? 'Sent' : 'Pending'}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-text-muted font-sans">Status: Delivered</span>
                  {simStep >= 3 && (
                    <a
                      href="https://ethereal.email"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-border-highlight hover:underline"
                    >
                      <span>ethereal.email preview</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Micro Terminal Log */}
            <div className="mt-4 rounded-lg bg-black/60 border border-border-card p-3 font-mono text-[10px] text-text-muted">
              <span className="text-slate-500">[WORKER_TELEMETRY]</span> Concurrency: 5 | Redis: 127.0.0.1:6379 | State: READY
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
