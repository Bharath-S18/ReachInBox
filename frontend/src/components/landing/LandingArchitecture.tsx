import React, { useState } from 'react';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Cpu,
  HardDrive,
  Mail,
  Zap,
} from 'lucide-react';

export const LandingArchitecture: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const pipeline = [
    {
      id: 'ingestion',
      step: '01',
      title: 'Lead Ingestion & Deduplication',
      tech: 'Express.js & CSV Parser',
      desc: 'Multipart lead CSVs are parsed line-by-line with regex email validation and RFC-compliant deduplication before writing to PostgreSQL.',
      icon: Mail,
      badge: 'Input Stage',
    },
    {
      id: 'rate-limit',
      step: '02',
      title: 'Redis Rate Boundary Verification',
      tech: 'Redis Atomic INCRBY & TTL',
      desc: 'Verifies the sender account hourly quota against Redis keys. If limit is reached, jobs are deferred to the next UTC hour and Slack is alerted.',
      icon: HardDrive,
      badge: 'Rate Limiter',
    },
    {
      id: 'bullmq',
      step: '03',
      title: 'BullMQ Delayed Queue Enqueue',
      tech: 'BullMQ & Redis Streams',
      desc: 'Jobs are assigned deterministic idempotency keys and enqueued with millisecond-exact delays. Jobs persist across backend server restarts.',
      icon: Cpu,
      badge: 'Queue Core',
    },
    {
      id: 'worker',
      step: '04',
      title: 'Concurrent Worker & Throttling',
      tech: 'BullMQ Worker Pool',
      desc: '5 concurrent worker threads process delayed jobs, enforcing a strict 2,000ms delay between consecutive dispatches to prevent provider throttling.',
      icon: Zap,
      badge: 'Worker Pool',
    },
    {
      id: 'dispatch',
      step: '05',
      title: 'Multi-Sender SMTP & Preview',
      tech: 'Nodemailer & Ethereal SMTP',
      desc: 'Connects to assigned SMTP accounts, dispatches the email, extracts the test message preview URL, and indexes into Elasticsearch.',
      icon: CheckCircle2,
      badge: 'Delivery Stage',
    },
    {
      id: 'alert',
      step: '06',
      title: 'Slack Real-Time Webhook Alert',
      tech: 'Slack OAuth & Block Kit',
      desc: 'Dispatches live Block Kit notification to connected Slack channel whenever a rate boundary cutoff is hit, reporting deferred jobs.',
      icon: Bell,
      badge: 'Alert System',
    },
  ];

  return (
    <section id="architecture" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-border-card">
      {/* Section Heading */}
      <div className="flex flex-col items-start mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-card bg-surface-card px-3.5 py-1 font-mono text-[11px] uppercase tracking-wider text-border-highlight mb-3">
          <Cpu className="h-3.5 w-3.5" />
          <span>System Architecture</span>
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
          End-to-End Orchestration Pipeline
        </h2>
        <p className="mt-3 font-sans text-sm text-text-muted max-w-2xl">
          Click any stage of the pipeline below to inspect how BullMQ, Redis, PostgreSQL, and SMTP transporters execute idempotent email outreach.
        </p>
      </div>

      {/* Interactive Pipeline Step Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {pipeline.map((item, idx) => {
          const Icon = item.icon;
          const isActive = activeStep === idx;
          return (
            <button
              key={item.id}
              onClick={() => setActiveStep(idx)}
              className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? 'border-border-highlight bg-sky-950/20 shadow-glow-cyan text-white'
                  : 'border-border-card bg-surface-card text-text-muted hover:border-slate-600 hover:text-white'
              }`}
            >
              <div className="flex w-full items-center justify-between mb-3">
                <span className="font-mono text-[11px] font-semibold text-border-highlight">
                  {item.step}
                </span>
                <Icon className={`h-4 w-4 ${isActive ? 'text-border-highlight' : 'text-slate-600'}`} />
              </div>
              <span className="font-display text-xs font-bold leading-snug line-clamp-2">
                {item.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detail Showcase of Active Step */}
      <div className="rounded-2xl border border-border-card bg-surface-card p-8 lg:p-10 shadow-2xl relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 rounded border border-border-card bg-code-badge-bg px-2.5 py-0.5 font-mono text-xs text-border-highlight mb-3 uppercase">
              <span>{pipeline[activeStep].badge}</span>
              <span>•</span>
              <span className="text-white">{pipeline[activeStep].tech}</span>
            </div>

            <h3 className="font-display text-2xl font-bold text-white mb-3">
              {pipeline[activeStep].title}
            </h3>

            <p className="font-sans text-sm sm:text-base text-text-muted leading-relaxed mb-6">
              {pipeline[activeStep].desc}
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveStep((prev) => (prev + 1) % pipeline.length)}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-display text-xs font-semibold text-black transition-all hover:bg-slate-200 active:scale-95"
              >
                <span>Next Stage: {pipeline[(activeStep + 1) % pipeline.length].title.split(' ')[0]}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Flow Visualizer */}
          <div className="lg:col-span-5 w-full rounded-xl border border-border-card bg-surface-container p-6 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border-card pb-3 mb-4 text-text-muted">
              <span>PIPELINE TELEMETRY</span>
              <span className="text-border-highlight">STAGE {pipeline[activeStep].step} / 06</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-text-muted">Component:</span>
                <span className="text-white font-semibold">{pipeline[activeStep].tech}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-text-muted">State:</span>
                <span className="text-emerald-400 font-semibold">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-text-muted">Fault Tolerance:</span>
                <span className="text-sky-400 font-semibold">Automatic Retry + DLQ</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-text-muted">Idempotency Key:</span>
                <span className="text-amber-400 font-semibold truncate max-w-[180px]">
                  idemp_cmvh..._{activeStep}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
