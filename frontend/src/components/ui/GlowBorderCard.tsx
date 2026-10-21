import React from 'react';
import { cn } from '../../lib/utils';

export interface GlowBorderCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export const GlowBorderCard: React.FC<GlowBorderCardProps> = ({
  children,
  className,
  glowColor = 'rgba(56, 189, 248, 0.15)',
  ...props
}) => {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border-card bg-surface-card p-6 transition-all duration-300 hover:border-border-highlight/60',
        className
      )}
      {...props}
    >
      {/* Ambient Radial Flare on Hover */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-all duration-500 group-hover:opacity-100 group-hover:scale-125"
        style={{ background: glowColor }}
      />
      {children}
    </div>
  );
};
