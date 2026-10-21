import React from 'react';
import { Cpu, Database, HardDrive, Layers, Mail, MessageSquare, Search, ShieldCheck } from 'lucide-react';

export const LandingTechStrip: React.FC = () => {
  const stack = [
    { name: 'BullMQ', desc: 'Distributed Queue', icon: Cpu },
    { name: 'Redis', desc: 'Atomic Rate Limiter', icon: HardDrive },
    { name: 'Supabase PostgreSQL', desc: 'Relational Ledger', icon: Database },
    { name: 'Elasticsearch v8', desc: 'Dual-Engine Search', icon: Search },
    { name: 'Slack OAuth 2.0', desc: 'Live Alert Dispatcher', icon: MessageSquare },
    { name: 'Ethereal SMTP', desc: 'Multi-Sender Dispatch', icon: Mail },
    { name: 'TypeScript', desc: 'Type-Safe Architecture', icon: ShieldCheck },
  ];

  return (
    <section id="stack" className="border-y border-border-card bg-surface-card/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-text-muted font-mono text-xs uppercase tracking-wider shrink-0">
            <Layers className="h-4 w-4 text-border-highlight" />
            <span>Infrastructure Stack</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 font-mono text-xs text-text-muted">
            {stack.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="flex items-center gap-2 group transition-colors hover:text-white">
                  <Icon className="h-4 w-4 text-slate-500 group-hover:text-border-highlight transition-colors" />
                  <span className="font-semibold text-white">{item.name}</span>
                  <span className="text-[10px] text-slate-500 hidden sm:inline">({item.desc})</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
