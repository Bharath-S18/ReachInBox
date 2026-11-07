import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  FileText,
} from 'lucide-react';
import { SlackStatus, User } from '../../types';

interface SidebarProps {
  user: User | null;
  activeTab: 'scheduled' | 'drafts' | 'sent' | 'telemetry';
  onTabChange: (tab: 'scheduled' | 'drafts' | 'sent' | 'telemetry') => void;
  onOpenCompose: () => void;
  onOpenSenders: () => void;
  onOpenSlack?: () => void;
  slackStatus?: SlackStatus | null;
  onLogout: () => void;
  scheduledCount: number;
  draftsCount: number;
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
  draftsCount,
  sentCount,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ChatGPT-style dynamic resizable width (persisted in localStorage)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('reachinbox_sidebar_width');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 200 && parsed <= 450) {
        return parsed;
      }
    }
    return 256;
  });

  const isResizingRef = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.min(Math.max(moveEvent.clientX, 200), 450);
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setSidebarWidth((w) => {
        localStorage.setItem('reachinbox_sidebar_width', String(w));
        return w;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

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
    <aside
      style={{ width: `${sidebarWidth}px` }}
      className="relative flex-shrink-0 bg-gray-50 border-r border-gray-200 min-h-screen flex flex-col p-3 select-none"
    >
      {/* Draggable resize handle on right border */}
      <div
        onMouseDown={startResizing}
        onDoubleClick={() => {
          setSidebarWidth(256);
          localStorage.setItem('reachinbox_sidebar_width', '256');
        }}
        className="absolute top-0 -right-1 w-2 h-full cursor-col-resize hover:bg-[#0b57d0]/30 transition-colors group z-30"
        title="Drag to resize sidebar (double-click to reset)"
      >
        <div className="w-0.5 h-full mx-auto group-hover:bg-[#0b57d0] transition-colors" />
      </div>

      {/* Brand Header */}
      <div className="pt-2 pb-4 px-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0b57d0] text-white flex items-center justify-center font-bold text-base shadow-xs tracking-tight">
            R
          </div>
          <div className="flex items-baseline gap-1.5 overflow-hidden">
            <span className="text-base font-semibold tracking-tight text-gray-900 truncate">ReachInbox</span>
            <span className="text-[11px] font-medium text-gray-400">Mail</span>
          </div>
        </div>
      </div>

      {/* Compose Button */}
      <div className="px-1 mb-4">
        <button
          onClick={onOpenCompose}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] text-white shadow-xs font-medium text-xs select-none active:scale-98 transition w-fit cursor-pointer"
          title="Compose new outreach"
        >
          <Pencil className="w-3.5 h-3.5 stroke-[2.2]" />
          <span>Compose</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="space-y-0.5">
        {/* Scheduled tab */}
        <button
          onClick={() => onTabChange('scheduled')}
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'scheduled'
              ? 'bg-blue-50 text-[#0b57d0] font-semibold'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Clock
              className={`w-4 h-4 flex-shrink-0 ${
                activeTab === 'scheduled' ? 'text-[#0b57d0]' : 'text-gray-400'
              }`}
            />
            <span className="truncate">Scheduled</span>
          </div>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              activeTab === 'scheduled'
                ? 'text-[#0b57d0] bg-blue-100/70'
                : 'text-gray-500 bg-gray-200/60'
            }`}
          >
            {scheduledCount}
          </span>
        </button>

        {/* Drafts tab */}
        <button
          onClick={() => onTabChange('drafts')}
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'drafts'
              ? 'bg-blue-50 text-[#0b57d0] font-semibold'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <FileText
              className={`w-4 h-4 flex-shrink-0 ${
                activeTab === 'drafts' ? 'text-[#0b57d0]' : 'text-gray-400'
              }`}
            />
            <span className="truncate">Drafts</span>
          </div>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              activeTab === 'drafts'
                ? 'text-[#0b57d0] bg-blue-100/70'
                : 'text-gray-500 bg-gray-200/60'
            }`}
          >
            {draftsCount}
          </span>
        </button>

        {/* Sent tab */}
        <button
          onClick={() => onTabChange('sent')}
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'sent'
              ? 'bg-blue-50 text-[#0b57d0] font-semibold'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Send
              className={`w-4 h-4 flex-shrink-0 ${
                activeTab === 'sent' ? 'text-[#0b57d0]' : 'text-gray-400'
              }`}
            />
            <span className="truncate">Sent</span>
          </div>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              activeTab === 'sent'
                ? 'text-[#0b57d0] bg-blue-100/70'
                : 'text-gray-500 bg-gray-200/60'
            }`}
          >
            {sentCount}
          </span>
        </button>

        {/* BullMQ Telemetry tab */}
        <button
          onClick={() => onTabChange('telemetry')}
          className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'telemetry'
              ? 'bg-blue-50 text-[#0b57d0] font-semibold'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Activity
              className={`w-4 h-4 flex-shrink-0 ${
                activeTab === 'telemetry' ? 'text-[#0b57d0]' : 'text-gray-400'
              }`}
            />
            <span className="truncate">Queue Telemetry</span>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </button>
      </div>

      {/* Divider */}
      <div className="my-3 border-t border-gray-200 mx-2" />

      {/* Integrations Section */}
      <div className="space-y-1">
        <div className="px-3.5 pb-1 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
          Integrations
        </div>

        {/* Slack Alerts */}
        <button
          onClick={onOpenSlack}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          title="Configure Slack live alerts for rate limiting"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-4 h-4 rounded bg-[#4a154b] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0">
              #
            </div>
            <span className="font-medium text-gray-800 truncate">Slack Alerts</span>
          </div>
          {slackStatus?.connected ? (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              #{slackStatus.channelName || 'alerts'}
            </span>
          ) : (
            <span className="text-[10px] bg-gray-200/70 text-gray-600 font-medium px-2 py-0.5 rounded-full hover:bg-gray-300 flex-shrink-0">
              Connect
            </span>
          )}
        </button>

        {/* SMTP Senders */}
        <button
          onClick={onOpenSenders}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          title="Manage Ethereal and outbound SMTP senders"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Mail className="w-4 h-4 text-[#0b57d0] flex-shrink-0" />
            <span className="font-medium text-gray-800 truncate">SMTP Senders</span>
          </div>
          <span className="text-[10px] bg-blue-50 text-[#0b57d0] font-semibold border border-blue-200 px-2 py-0.5 rounded-full flex-shrink-0">
            Manage
          </span>
        </button>
      </div>

      {/* User Card Profile & Popover at Bottom Left */}
      <div className="mt-auto pt-3 border-t border-gray-200 relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 transition text-left group cursor-pointer"
          title="Account and settings"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-gray-200 flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayEmail}`;
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-gray-900 truncate">{displayName}</div>
              <div className="text-[11px] text-gray-500 truncate">{displayEmail}</div>
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition flex-shrink-0 ml-1 ${
              menuOpen ? 'rotate-180 text-[#0b57d0]' : ''
            }`}
          />
        </button>

        {/* Account Card Popover */}
        {menuOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-[280px] bg-white rounded-xl border border-gray-200 shadow-lg z-50 p-4 text-gray-800 animate-in fade-in zoom-in-95 duration-150 select-none">
            {/* Header: User Profile */}
            <div className="flex flex-col items-center text-center pb-3 border-b border-gray-100">
              <div className="relative mb-2">
                <img
                  src={displayAvatar}
                  alt={displayName}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayEmail}`;
                  }}
                />
              </div>
              <div className="font-semibold text-xs text-gray-900">{displayName}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{displayEmail}</div>
              <div className="mt-2">
                <span className="text-[10px] bg-blue-50 text-[#0b57d0] font-medium border border-blue-200 px-2 py-0.5 rounded-full">
                  Authenticated User
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="py-2 space-y-0.5">
              <button
                onClick={() => {
                  onOpenSenders();
                  setMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#0b57d0]" />
                  <span>Outbound SMTP Senders</span>
                </div>
                <span className="text-[10px] text-gray-400">Manage</span>
              </button>

              <button
                onClick={() => {
                  if (onOpenSlack) onOpenSlack();
                  setMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-[#4a154b]" />
                  <span>Slack Live Alerting</span>
                </div>
                {slackStatus?.connected ? (
                  <span className="text-[10px] text-emerald-600 font-medium">Active</span>
                ) : (
                  <span className="text-[10px] text-gray-400">Setup</span>
                )}
              </button>

              <button
                onClick={() => {
                  onTabChange('telemetry');
                  setMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  <span>BullMQ Telemetry</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">Live</span>
              </button>
            </div>

            {/* Sign Out Button */}
            <div className="pt-2 border-t border-gray-100 flex flex-col items-center">
              <button
                onClick={() => {
                  onLogout();
                  setMenuOpen(false);
                }}
                className="w-full py-1.5 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-gray-500" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
