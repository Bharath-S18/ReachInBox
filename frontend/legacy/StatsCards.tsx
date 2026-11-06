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
      description: 'Delayed BullMQ jobs',
      badge: 'PERSISTENT ZSET',
      icon: Clock,
      accentColor: 'text-border-highlight',
      borderColor: 'hover:border-border-highlight',
      gradient: 'from-sky-500/20 via-transparent to-transparent',
    },
    {
      id: 'sent',
      label: 'DELIVERED OUTREACH',
      value: stats ? stats.sent : 0,
      description: 'Ethereal SMTP delivered',
      badge: '100% IDEMPOTENT',
      icon: CheckCircle2,
      accentColor: 'text-emerald-400',
      borderColor: 'hover:border-emerald-500/50',
      gradient: 'from-emerald-500/20 via-transparent to-transparent',
    },
    {
      id: 'rescheduled',
      label: 'RATE LIMIT DEFERRED',
      value: stats ? stats.rescheduled : 0,
      description: 'Deferred to next hour',
      badge: 'HOURLY SAFE',
      icon: RotateCw,
      accentColor: 'text-amber-400',
      borderColor: 'hover:border-amber-500/50',
      gradient: 'from-amber-500/20 via-transparent to-transparent',
    },
    {
      id: 'failed',
      label: 'FAILED DISPATCHES',
      value: stats ? stats.failed : 0,
      description: 'Retry backoff exhausted',
      badge: 'DLQ PROTECTED',
      icon: AlertTriangle,
      accentColor: 'text-red-400',
      borderColor: 'hover:border-red-500/50',
      gradient: 'from-red-500/20 via-transparent to-transparent',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`group relative overflow-hidden rounded-2xl border border-border-card bg-surface-card p-6 transition-all duration-300 ${card.borderColor} shadow-lg hover:shadow-2xl hover:-translate-y-0.5`}
          >
            {/* Top Glowing Gradient Accent */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`}
            />

            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                {card.label}
              </span>
              <div className={`rounded-lg border border-border-card bg-surface-container p-2 ${card.accentColor} shadow-sm`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-display text-3xl font-bold tracking-tight text-white">
                {loading ? '--' : card.value.toLocaleString()}
              </span>
              <span className="rounded border border-border-card bg-surface-container px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-text-muted">
                {card.badge}
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
