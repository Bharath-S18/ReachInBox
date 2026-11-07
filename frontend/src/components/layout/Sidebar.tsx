import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  Send,
  ChevronDown,
  Pencil,
  LogOut,
  Mail,
  Activity,
  Hash,
  CheckCircle2,
} from 'lucide-react';
import { SlackStatus, User } from '../../types';

interface SidebarProps {
  user: User | null;
  activeTab: 'scheduled' | 'sent' | 'telemetry';
  onTabChange: (tab: 'scheduled' | 'sent' | 'telemetry') => void;
  onOpenCompose: () => void;
  onOpenSenders: () => void;
  onOpenSlack?: () => void;
  slackStatus?: SlackStatus | null;
  onLogout: () => void;
  scheduledCount: number;
  sentCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  onTabChange,
  onOpenCompose,
  onOpenSenders,
  onOpenSlack,
  slackStatus,
  onLogout,
  scheduledCount,
  sentCount,
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

  const displayName = user?.name || 'User';
  const displayEmail = user?.email || 'user@example.com';
  const displayAvatar =
    user?.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayEmail}`;

  return (
    <aside className="w-[260px] flex-shrink-0 bg-[#f6f8fc] border-r border-[#e0e5ed] min-h-screen flex flex-col p-3 select-none">
      {/* Brand Header: Modern Gmail / Google Workspace Style */}
      <div className="pt-2 pb-5 px-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0b57d0] text-white flex items-center justify-center font-bold text-base shadow-xs tracking-tight">
            R
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold tracking-tight text-gray-800">ReachInbox</span>
            <span className="text-[11px] font-medium text-gray-400">Mail</span>
          </div>
        </div>
      </div>

      {/* Gmail Material 3 Compose Floating Pill Button */}
      <div className="px-1 mb-5">
        <button
          onClick={onOpenCompose}
          className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-[#c2e7ff] text-[#001d35] hover:bg-[#b3dcfb] hover:shadow-md transition-all font-medium text-sm select-none active:scale-98 shadow-xs w-fit"
          title="Compose new outreach"
        >
          <Pencil className="w-4 h-4 stroke-[2.2] text-[#001d35]" />
          <span className="font-semibold text-sm">Compose</span>
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="space-y-0.5">
        {/* Scheduled tab */}
        <button
          onClick={() => onTabChange('scheduled')}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'scheduled'
              ? 'bg-[#d3e3fd] text-[#041e49] font-bold'
              : 'text-gray-700 hover:bg-[#e9eef6] hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <Clock
              className={`w-4 h-4 ${
                activeTab === 'scheduled' ? 'text-[#041e49] stroke-[2.2]' : 'text-gray-500'
              }`}
            />
            <span>Scheduled</span>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              activeTab === 'scheduled'
                ? 'text-[#041e49]'
                : 'text-gray-500 bg-gray-200/60'
            }`}
          >
            {scheduledCount}
          </span>
        </button>

        {/* Sent tab */}
        <button
          onClick={() => onTabChange('sent')}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'sent'
              ? 'bg-[#d3e3fd] text-[#041e49] font-bold'
              : 'text-gray-700 hover:bg-[#e9eef6] hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <Send
              className={`w-4 h-4 ${
                activeTab === 'sent' ? 'text-[#041e49] stroke-[2.2]' : 'text-gray-500'
              }`}
            />
            <span>Sent</span>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              activeTab === 'sent'
                ? 'text-[#041e49]'
                : 'text-gray-500 bg-gray-200/60'
            }`}
          >
            {sentCount}
          </span>
        </button>

        {/* BullMQ Telemetry tab */}
        <button
          onClick={() => onTabChange('telemetry')}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'telemetry'
              ? 'bg-[#d3e3fd] text-[#041e49] font-bold'
              : 'text-gray-700 hover:bg-[#e9eef6] hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <Activity
              className={`w-4 h-4 ${
                activeTab === 'telemetry' ? 'text-[#041e49] stroke-[2.2]' : 'text-gray-500'
              }`}
            />
            <span>Queue Telemetry</span>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </button>
      </div>

      {/* Divider */}
      <div className="my-3 border-t border-[#e0e5ed] mx-2" />

      {/* Integrations & Senders Management */}
      <div className="space-y-1">
        <div className="px-4 pb-1 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
          Integrations
        </div>

        {/* Slack Live Alerting Integration Button */}
        <button
          onClick={onOpenSlack}
          className="w-full flex items-center justify-between px-4 py-2 rounded-full text-xs font-medium text-gray-700 hover:bg-[#e9eef6] transition"
          title="Configure Slack live alerts for rate limiting"
        >
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded bg-[#4a154b] text-white flex items-center justify-center text-[10px] font-black">
              #
            </div>
            <span className="font-medium text-gray-800">Slack Alerts</span>
          </div>
          {slackStatus?.connected ? (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              #{slackStatus.channelName || 'alerts'}
            </span>
          ) : (
            <span className="text-[10px] bg-gray-200/70 text-gray-600 font-medium px-2 py-0.5 rounded-full hover:bg-gray-300">
              Connect
            </span>
          )}
        </button>

        {/* SMTP Senders Manager Button */}
        <button
          onClick={onOpenSenders}
          className="w-full flex items-center justify-between px-4 py-2 rounded-full text-xs font-medium text-gray-700 hover:bg-[#e9eef6] transition"
          title="Manage Ethereal and outbound SMTP senders"
        >
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-[#0b57d0]" />
            <span className="font-medium text-gray-800">SMTP Senders</span>
          </div>
          <span className="text-[10px] bg-blue-50 text-[#0b57d0] font-semibold border border-blue-200 px-2 py-0.5 rounded-full">
            Manage
          </span>
        </button>
      </div>

      {/* User Card Profile & Dropdown at Bottom */}
      <div className="mt-auto pt-3 border-t border-[#e0e5ed] relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-[#e9eef6] transition text-left group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayEmail}`;
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-gray-900 truncate">{displayName}</div>
              <div className="text-[11px] text-gray-500 truncate">{displayEmail}</div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition flex-shrink-0 ml-1" />
        </button>

        {/* User dropdown popover */}
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 py-1.5 text-xs text-gray-700 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3.5 py-2 border-b border-gray-100">
              <div className="font-semibold text-gray-900 truncate">{displayName}</div>
              <div className="text-[11px] text-gray-500 truncate">{displayEmail}</div>
            </div>
            <button
              onClick={() => {
                onOpenSenders();
                setMenuOpen(false);
              }}
              className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-gray-50 text-left font-medium"
            >
              <Mail className="w-3.5 h-3.5 text-[#0b57d0]" />
              <span>Outbound SMTP Senders</span>
            </button>
            <button
              onClick={() => {
                if (onOpenSlack) onOpenSlack();
                setMenuOpen(false);
              }}
              className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-gray-50 text-left font-medium"
            >
              <Hash className="w-3.5 h-3.5 text-purple-600" />
              <span>Slack Alerting</span>
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
    </aside>
  );
};
