import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, RotateCw } from 'lucide-react';
import { EmailStats } from '../types';

interface StatsCardsProps {
  stats: EmailStats | null;
  loading: boolean;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  const cards = [
    {
      id: 'scheduled',
      label: 'SCHEDULED QUEUE',
      value: stats ? stats.scheduled : 0,
      description: 'Active BullMQ delayed jobs',
      icon: Clock,
      accentColor: 'text-border-highlight',
      borderColor: 'hover:border-border-highlight',
      bgGlow: 'group-hover:bg-sky-500/5',
    },
    {
      id: 'sent',
      label: 'DELIVERED OUTREACH',
      value: stats ? stats.sent : 0,
      description: 'Dispatched via Ethereal SMTP',
      icon: CheckCircle2,
      accentColor: 'text-emerald-400',
      borderColor: 'hover:border-emerald-500/50',
      bgGlow: 'group-hover:bg-emerald-500/5',
    },
    {
      id: 'rescheduled',
      label: 'RATE LIMIT DEFERRED',
      value: stats ? stats.rescheduled : 0,
      description: 'Hourly boundary preserved',
      icon: RotateCw,
      accentColor: 'text-amber-400',
      borderColor: 'hover:border-amber-500/50',
      bgGlow: 'group-hover:bg-amber-500/5',
    },
    {
      id: 'failed',
      label: 'FAILED DISPATCHES',
      value: stats ? stats.failed : 0,
      description: 'Exhausted retry attempts',
      icon: AlertTriangle,
      accentColor: 'text-red-400',
      borderColor: 'hover:border-red-500/50',
      bgGlow: 'group-hover:bg-red-500/5',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`group relative overflow-hidden rounded-xl border border-border-card bg-surface-card p-5 transition-all duration-300 ${card.borderColor} ${card.bgGlow}`}
          >
            {/* Ambient Corner Flare */}
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/5 blur-2xl transition-all group-hover:scale-150" />

            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                {card.label}
              </span>
              <div className={`rounded-lg border border-border-card bg-surface-container p-2 ${card.accentColor}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold tracking-tight text-white">
                {loading ? '--' : card.value.toLocaleString()}
              </span>
            </div>

            <p className="mt-1 font-mono text-[11px] text-text-muted">
              {card.description}
            </p>
          </div>
        );
      })}
    </div>
  );
};
