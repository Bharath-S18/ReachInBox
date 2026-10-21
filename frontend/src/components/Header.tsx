import React from 'react';
import {
  Cpu,
  Globe,
  Hash,
  LogOut,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { SlackStatus, User } from '../types';

interface HeaderProps {
  user: User;
  currentView: 'campaigns' | 'queue';
  onViewChange: (view: 'campaigns' | 'queue') => void;
  slackStatus: SlackStatus | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCompose: () => void;
  onOpenSlackModal: () => void;
  onOpenSendersModal: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  isRefreshing: boolean;
  onOpenLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentView,
  onViewChange,
  slackStatus,
  searchQuery,
  onSearchChange,
  onOpenCompose,
  onOpenSlackModal,
  onOpenSendersModal,
  onRefresh,
  onLogout,
  isRefreshing,
  onOpenLanding,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-card bg-surface-dock/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        {/* Left Section: Brand & Navigation Tabs */}
        <div className="flex items-center gap-6">
          {/* Brand Mark */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-card bg-surface-card text-white shadow-glow-cyan transition-all hover:border-border-highlight">
              <Mail className="h-4.5 w-4.5 text-border-highlight" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-base font-bold tracking-tight text-white leading-none">
                ReachInbox
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted mt-0.5">
                Operations Platform
              </span>
            </div>
          </div>

          {/* Redis Live Badge */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>REDIS 7</span>
          </div>

          {/* Segmented View Switcher */}
          <nav className="flex items-center rounded-lg border border-border-card bg-surface-container p-1 font-mono text-xs">
            <button
              onClick={() => onViewChange('campaigns')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all ${
                currentView === 'campaigns'
                  ? 'bg-white font-semibold text-black shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Campaigns</span>
            </button>
            <button
              onClick={() => onViewChange('queue')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all ${
                currentView === 'queue'
                  ? 'bg-white font-semibold text-black shadow-sm'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>Queue Telemetry</span>
            </button>
          </nav>
        </div>

        {/* Center: Command Search Bar */}
        <div className="relative hidden md:flex flex-1 max-w-sm items-center">
          <div className="flex w-full items-center rounded-lg border border-border-card bg-surface-card px-3 py-1.5 transition-all focus-within:border-border-highlight hover:border-slate-700">
            <Search className="mr-2 h-3.5 w-3.5 text-text-muted shrink-0" />
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search leads, subjects..."
              className="w-full border-0 bg-transparent p-0 font-sans text-xs text-white placeholder:text-text-muted focus:outline-none focus:ring-0"
            />
            <kbd className="rounded border border-border-card bg-code-badge-bg px-1.5 py-0.2 font-mono text-[10px] text-text-muted ml-2 shrink-0">
              /
            </kbd>
          </div>
        </div>

        {/* Right Section: Actions Suite */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Website Toggle Button */}
          {onOpenLanding && (
            <button
              onClick={onOpenLanding}
              title="View Public Website Overview"
              className="hidden lg:flex items-center gap-1.5 rounded-lg border border-border-card bg-surface-card px-2.5 py-1.5 font-mono text-xs text-text-muted transition-all hover:border-border-highlight hover:text-white active:scale-95"
            >
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <span>Website</span>
            </button>
          )}

          {/* Refresh Poller */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Poll Queue Telemetry"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-card bg-surface-card text-text-muted transition-all hover:border-border-highlight hover:text-white active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-border-highlight' : ''}`} />
          </button>

          {/* Senders Manager */}
          <button
            onClick={onOpenSendersModal}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border-card bg-surface-card px-3 py-1.5 font-mono text-xs text-text-muted transition-all hover:border-border-highlight hover:text-white active:scale-95"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-border-highlight" />
            <span>Senders</span>
          </button>

          {/* Slack Live Alert Indicator */}
          <button
            onClick={onOpenSlackModal}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs transition-all active:scale-95 ${
              slackStatus?.connected
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:border-emerald-400'
                : 'border-border-card bg-surface-card text-text-muted hover:border-border-highlight hover:text-white'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                slackStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <Hash className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {slackStatus?.connected ? `#${slackStatus.channelName || 'alerts'}` : 'Slack'}
            </span>
          </button>

          {/* Primary Action Button */}
          <button
            onClick={onOpenCompose}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 font-display text-xs font-semibold text-black shadow-glow-white transition-all hover:bg-slate-200 active:scale-95 shrink-0"
          >
            <span>+ Compose</span>
          </button>

          {/* Profile & Logout */}
          <div className="flex items-center gap-2 border-l border-border-card pl-2 sm:pl-3">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || user.email}
                className="h-8 w-8 rounded-full border border-border-card object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border-card bg-surface-card font-mono text-xs font-semibold text-border-highlight">
                {(user.name || user.email).substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="hidden xl:block text-left">
              <p className="font-sans text-xs font-medium text-white max-w-[120px] truncate">
                {user.name || 'User'}
              </p>
              <p className="font-mono text-[10px] text-text-muted max-w-[120px] truncate">
                {user.email}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-text-muted transition-all hover:border-border-card hover:bg-surface-card hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
