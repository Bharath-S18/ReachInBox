import React from 'react';
import { Github, Mail, Star, Zap } from 'lucide-react';
import { User } from '../../types';

interface LandingNavbarProps {
  user: User | null;
  onOpenAuth: () => void;
  onOpenDashboard: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  user,
  onOpenAuth,
  onOpenDashboard,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-card bg-surface-dock backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-card bg-surface-card text-white shadow-glow-cyan transition-all duration-200 group-hover:border-border-highlight">
              <Mail className="h-4 w-4 text-border-highlight" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              ReachInbox
            </span>
          </a>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 font-sans text-xs text-text-muted">
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#architecture" className="transition-colors hover:text-white">
              Architecture
            </a>
            <a href="#queue" className="transition-colors hover:text-white">
              Queue Engine
            </a>
            <a href="#stack" className="transition-colors hover:text-white">
              Tech Stack
            </a>
          </nav>
        </div>

        {/* Right Cluster */}
        <div className="flex items-center gap-3">
          {/* GitHub Star Link */}
          <a
            href="https://github.com/Bharath-S18/ReachInBox"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 rounded-lg border border-border-card bg-surface-card px-3 py-1.5 font-mono text-xs text-text-muted transition-all hover:border-border-highlight hover:text-white active:scale-95"
          >
            <Github className="h-3.5 w-3.5" />
            <span>GitHub</span>
            <span className="flex items-center gap-1 rounded border border-border-card bg-code-badge-bg px-1.5 py-0.2 text-[10px] text-border-highlight">
              <Star className="h-2.5 w-2.5 fill-border-highlight text-border-highlight" />
              <span>Star</span>
            </span>
          </a>

          {/* CTA Button */}
          {user ? (
            <button
              onClick={onOpenDashboard}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-1.5 font-display text-xs font-semibold text-black shadow-glow-white transition-all hover:bg-slate-200 active:scale-95"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Go to Dashboard</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAuth}
                className="rounded-lg border border-border-card bg-surface-card px-3.5 py-1.5 font-sans text-xs font-medium text-white transition-all hover:border-border-highlight hover:bg-surface-card-hover"
              >
                Sign In
              </button>
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 font-display text-xs font-semibold text-black shadow-glow-white transition-all hover:bg-slate-200 active:scale-95"
              >
                <span>Launch App</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
