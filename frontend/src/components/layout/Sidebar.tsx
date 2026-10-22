import React, { useState, useRef, useEffect } from 'react';
import { Clock, Send, ChevronDown, Plus, LogOut, Radio, Slack, Mail, Activity } from 'lucide-react';
import { User } from '../../types';

interface SidebarProps {
  user: User | null;
  activeTab: 'scheduled' | 'sent' | 'telemetry';
  onTabChange: (tab: 'scheduled' | 'sent' | 'telemetry') => void;
  onOpenCompose: () => void;
  onOpenSlack: () => void;
  onOpenSenders: () => void;
  onLogout: () => void;
  scheduledCount: number;
  sentCount: number;
  slackConnected?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  onTabChange,
  onOpenCompose,
  onOpenSlack,
  onOpenSenders,
  onLogout,
  scheduledCount,
  sentCount,
  slackConnected,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.name || 'Oliver Brown';
  const displayEmail = user?.email || 'oliver.brown@domain.io';
  const displayAvatar = user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80';

  return (
    <aside className="w-[260px] flex-shrink-0 bg-white border-r border-gray-100 min-h-screen flex flex-col p-4 select-none">
      {/* Brand Logo - Matching ONB stylized branding from Screenshots */}
      <div className="pt-2 pb-4 px-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Geometric bold ONB mark */}
          <div className="flex items-center tracking-tighter font-black text-2xl text-black">
            <span>ON</span>
            <span className="text-[#00a854]">B</span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            ReachInbox
          </span>
        </div>
      </div>

      {/* User Card with dropdown */}
      <div className="relative mb-5" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200"
              onError={(e) => {
                // Fallback avatar
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayEmail}`;
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 truncate">{displayName}</div>
              <div className="text-xs text-gray-400 truncate">{displayEmail}</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition flex-shrink-0 ml-1" />
        </button>

        {/* User dropdown popover */}
        {menuOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-50 py-1.5 text-xs text-gray-700 animate-in fade-in zoom-in-95 duration-100">
            <button
              onClick={() => {
                onTabChange('telemetry');
                setMenuOpen(false);
              }}
              className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-gray-50 text-left font-medium"
            >
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span>BullMQ Queue Telemetry</span>
            </button>
            <button
              onClick={() => {
                onOpenSenders();
                setMenuOpen(false);
              }}
              className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-gray-50 text-left font-medium"
            >
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              <span>Outbound SMTP Senders</span>
            </button>
            <button
              onClick={() => {
                onOpenSlack();
                setMenuOpen(false);
              }}
              className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-gray-50 text-left font-medium"
            >
              <Slack className="w-3.5 h-3.5 text-purple-600" />
              <span>Slack Live Alerts {slackConnected && '(Connected)'}</span>
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button
              onClick={() => {
                onLogout();
                setMenuOpen(false);
              }}
              className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-red-50 text-red-600 text-left font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Compose Action - Green outline pill button */}
      <div className="mb-6">
        <button
          onClick={onOpenCompose}
          className="w-full py-2.5 px-4 rounded-full border border-[#00a854] text-[#00a854] hover:bg-[#00a854] hover:text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Compose</span>
        </button>
      </div>

      {/* CORE Navigation Section */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
          CORE
        </div>

        {/* Scheduled tab */}
        <button
          onClick={() => onTabChange('scheduled')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'scheduled'
              ? 'bg-[#e8f5e9] text-gray-900 font-semibold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <Clock
              className={`w-4 h-4 ${
                activeTab === 'scheduled' ? 'text-[#00a854]' : 'text-gray-400'
              }`}
            />
            <span>Scheduled</span>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              activeTab === 'scheduled'
                ? 'text-[#00a854] font-bold'
                : 'text-gray-400'
            }`}
          >
            {scheduledCount}
          </span>
        </button>

        {/* Sent tab */}
        <button
          onClick={() => onTabChange('sent')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab === 'sent'
              ? 'bg-[#e8f5e9] text-gray-900 font-semibold'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <Send
              className={`w-4 h-4 ${
                activeTab === 'sent' ? 'text-[#00a854]' : 'text-gray-400'
              }`}
            />
            <span>Sent</span>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              activeTab === 'sent'
                ? 'text-[#00a854] font-bold'
                : 'text-gray-400'
            }`}
          >
            {sentCount}
          </span>
        </button>
      </div>

      {/* Telemetry & Integrations Bottom Section */}
      <div className="mt-auto pt-6 border-t border-gray-100 space-y-1">
        <button
          onClick={() => onTabChange('telemetry')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'telemetry'
              ? 'bg-blue-50 text-blue-700 font-semibold'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Radio className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            <span>BullMQ Telemetry</span>
          </div>
          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Live</span>
        </button>

        <button
          onClick={onOpenSlack}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition"
        >
          <div className="flex items-center gap-2.5">
            <Slack className="w-3.5 h-3.5 text-purple-600" />
            <span>Slack #alerts</span>
          </div>
          {slackConnected ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          ) : (
            <span className="text-[10px] text-gray-400">Link</span>
          )}
        </button>
      </div>
    </aside>
  );
};
