import React from 'react';
import { Github, Mail, ShieldCheck } from 'lucide-react';

interface FooterLinkItem {
  label: string;
  href: string;
  external?: boolean;
}

export const LandingFooter: React.FC = () => {
  const links: Record<string, FooterLinkItem[]> = {
    Product: [
      { label: 'Email Scheduler', href: '#features' },
      { label: 'BullMQ Telemetry', href: '#queue' },
      { label: 'Multi-Sender SMTP', href: '#features' },
      { label: 'Slack Alerts', href: '#features' },
    ],
    Architecture: [
      { label: 'Queue Engine', href: '#architecture' },
      { label: 'Redis Rate Limiter', href: '#architecture' },
      { label: 'Elasticsearch Search', href: '#architecture' },
      { label: 'Supabase Ledger', href: '#architecture' },
    ],
    Resources: [
      { label: 'GitHub Repository', href: 'https://github.com/Bharath-S18/ReachInBox', external: true },
      { label: 'Bull-Board Admin', href: 'http://localhost:5000/admin/queues', external: true },
      { label: 'Health Status', href: 'http://localhost:5000/health', external: true },
    ],
  };

  return (
    <footer className="border-t border-border-card bg-surface-canvas text-text-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand Info */}
          <div className="md:col-span-5 flex flex-col items-start gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-card bg-surface-card text-white">
                <Mail className="h-4 w-4 text-border-highlight" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-white">
                ReachInbox
              </span>
            </div>

            <p className="font-sans text-xs sm:text-sm text-text-muted max-w-sm leading-relaxed">
              High-performance email orchestration platform. Idempotent delayed queues with BullMQ, Redis rate boundaries, and real-time Slack alerting.
            </p>

            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Production-Grade Architecture</span>
            </div>
          </div>

          {/* Links Grid */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 font-sans text-xs">
            {Object.entries(links).map(([category, items]) => (
              <div key={category} className="flex flex-col gap-3">
                <span className="font-mono text-xs uppercase tracking-wider text-white font-semibold">
                  {category}
                </span>
                <ul className="flex flex-col gap-2">
                  {items.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        target={item.external ? '_blank' : undefined}
                        rel={item.external ? 'noopener noreferrer' : undefined}
                        className="transition-colors hover:text-white"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-border-card/60 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-text-muted">
          <span>2026 ReachInbox. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a
              href="https://github.com/Bharath-S18/ReachInBox"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <Github className="h-3.5 w-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
