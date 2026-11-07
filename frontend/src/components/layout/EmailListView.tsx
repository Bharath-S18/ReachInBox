import React, { useState, useRef, useEffect } from 'react';
import {
  Clock,
  Star,
  ExternalLink,
  Trash2,
  RotateCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Paperclip,
  CheckSquare,
  Square,
  MinusSquare,
  Eye,
} from 'lucide-react';
import { ScheduledEmailJob, SentEmailJob } from '../../types';

interface EmailListViewProps {
  type: 'scheduled' | 'sent' | 'search';
  scheduledJobs: ScheduledEmailJob[];
  sentJobs: SentEmailJob[];
  searchResults?: any[];
  onSelectEmail: (email: ScheduledEmailJob | SentEmailJob | any, type: 'scheduled' | 'sent' | 'search') => void;
  onCancelScheduled?: (id: string) => void;
  onDeleteSelected?: (ids: string[]) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  highlightQuery?: string;
  currentPage?: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange?: (newPage: number) => void;
  sortMode?: 'relevant' | 'recent';
  onSortModeChange?: (mode: 'relevant' | 'recent') => void;
}

export const EmailListView: React.FC<EmailListViewProps> = ({
  type,
  scheduledJobs,
  sentJobs,
  searchResults = [],
  onSelectEmail,
  onCancelScheduled,
  onDeleteSelected,
  onRefresh,
  isLoading,
  highlightQuery = '',
  currentPage = 1,
  totalCount = 0,
  pageSize = 50,
  onPageChange,
  sortMode = 'relevant',
  onSortModeChange,
}) => {
  const [starredIds, setStarredIds] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMenuOpen, setSelectMenuOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [isAllConversationsSelected, setIsAllConversationsSelected] = useState(false);

  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Close sort menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentJobs: any[] =
    type === 'search' ? searchResults : type === 'scheduled' ? scheduledJobs : sentJobs;

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectOne = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setIsAllConversationsSelected(false);
  };

  const handleSelectAllOnPage = () => {
    if (selectedIds.size === currentJobs.length && currentJobs.length > 0) {
      setSelectedIds(new Set());
      setIsAllConversationsSelected(false);
    } else {
      setSelectedIds(new Set(currentJobs.map((j) => j.id)));
    }
    setSelectMenuOpen(false);
  };

  const handleSelectFilter = (filter: 'all' | 'none' | 'starred' | 'unstarred') => {
    setSelectMenuOpen(false);
    setIsAllConversationsSelected(false);
    if (filter === 'none') {
      setSelectedIds(new Set());
    } else if (filter === 'all') {
      setSelectedIds(new Set(currentJobs.map((j) => j.id)));
    } else if (filter === 'starred') {
      setSelectedIds(new Set(currentJobs.filter((j) => !!starredIds[j.id]).map((j) => j.id)));
    } else if (filter === 'unstarred') {
      setSelectedIds(new Set(currentJobs.filter((j) => !starredIds[j.id]).map((j) => j.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (onDeleteSelected) {
      onDeleteSelected(ids);
    } else if (onCancelScheduled) {
      ids.forEach((id) => onCancelScheduled(id));
    }
    setSelectedIds(new Set());
    setIsAllConversationsSelected(false);
  };

  const handleDeleteSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onDeleteSelected) {
      onDeleteSelected([id]);
    } else if (onCancelScheduled) {
      onCancelScheduled(id);
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const formatGmailTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const getRecipientName = (email: string) => {
    if (!email) return 'Unknown';
    const raw = email.split('@')[0];
    const parts = raw.split(/[._-]/);
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  };

  // Yellow highlighter component (Screenshot 4)
  const renderHighlighted = (text: string, query: string) => {
    if (!query || !query.trim() || !text) return text;
    const trimmed = query.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === trimmed.toLowerCase() ? (
        <mark
          key={i}
          className="bg-[#fef08a] text-[#713f12] font-semibold px-0.5 rounded-xs"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const isAllSelected = currentJobs.length > 0 && selectedIds.size === currentJobs.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < currentJobs.length;

  // Pagination calculation (Screenshot 4: 1-50 of many / total)
  const effectiveTotal = totalCount > 0 ? totalCount : currentJobs.length;
  const startIndex = effectiveTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, effectiveTotal);
  const paginationText =
    effectiveTotal === 0
      ? '0–0 of 0'
      : `${startIndex}–${endIndex} of ${effectiveTotal > 500 ? 'many' : effectiveTotal}`;

  if (isLoading) {
    return (
      <div className="flex-1 p-6 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-10 bg-gray-100/70 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* 1. Gmail Top Action Bar (Screenshot 3 & Screenshot 4) */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 text-gray-600 bg-white select-none">
        {/* Left Action Controls */}
        <div className="flex items-center gap-1">
          {/* Select Checkbox with dropdown */}
          <div className="relative flex items-center">
            <button
              onClick={handleSelectAllOnPage}
              className="p-1.5 rounded hover:bg-gray-100 transition text-gray-600 flex items-center"
              title="Select"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-[#0b57d0]" />
              ) : isPartiallySelected ? (
                <MinusSquare className="w-4 h-4 text-[#0b57d0]" />
              ) : (
                <Square className="w-4 h-4 text-gray-500" />
              )}
            </button>
            <button
              onClick={() => setSelectMenuOpen(!selectMenuOpen)}
              className="p-1 rounded hover:bg-gray-100 transition text-gray-500"
              title="Select options"
            >
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Select options dropdown */}
            {selectMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 text-xs text-gray-700 animate-in fade-in duration-100">
                <button
                  onClick={() => handleSelectFilter('all')}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                >
                  All
                </button>
                <button
                  onClick={() => handleSelectFilter('none')}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                >
                  None
                </button>
                <button
                  onClick={() => handleSelectFilter('starred')}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                >
                  Starred
                </button>
                <button
                  onClick={() => handleSelectFilter('unstarred')}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                >
                  Unstarred
                </button>
              </div>
            )}
          </div>

          {/* Working Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-full hover:bg-gray-100 transition text-gray-500 hover:text-gray-900 ml-1"
              title="Refresh messages"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Real, Functional Action Icons when items are selected */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 ml-2 animate-in fade-in duration-100">
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition text-xs font-semibold shadow-2xs border border-red-200"
                title={`Delete ${selectedIds.size} selected email(s)`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedIds.size})</span>
              </button>
            </div>
          )}
        </div>

        {/* Middle: Showing most relevant dropdown pill (Screenshot 4) */}
        <div className="flex items-center gap-2">
          {type === 'search' && (
            <div className="relative" ref={sortMenuRef}>
              <button
                type="button"
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className="px-3 py-1 rounded-full bg-gray-100/90 hover:bg-gray-200 text-gray-700 text-xs font-medium flex items-center gap-1.5 transition border border-gray-200"
              >
                <span>Showing {sortMode === 'relevant' ? 'most relevant' : 'most recent'}</span>
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </button>

              {sortDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 text-xs text-gray-700 animate-in fade-in duration-100">
                  <button
                    onClick={() => {
                      onSortModeChange?.('relevant');
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center justify-between ${sortMode === 'relevant' ? 'font-bold text-[#0b57d0]' : ''
                      }`}
                  >
                    <span>Most relevant</span>
                    {sortMode === 'relevant' && <span>✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      onSortModeChange?.('recent');
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center justify-between ${sortMode === 'recent' ? 'font-bold text-[#0b57d0]' : ''
                      }`}
                  >
                    <span>Most recent</span>
                    {sortMode === 'recent' && <span>✓</span>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Pagination Controls (Screenshot 3 & Screenshot 4) */}
        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
          <span>{paginationText}</span>
          <div className="flex items-center">
            <button
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
              title="Newer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              disabled={currentPage * pageSize >= effectiveTotal}
              className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
              title="Older"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Select All Banner (Screenshot 3) */}
      {isAllSelected && (
        <div className="py-2 px-4 bg-[#f2f6fc] text-xs text-gray-700 text-center border-b border-gray-200 select-none animate-in fade-in duration-100">
          <span>All {selectedIds.size} conversations on this page are selected. </span>
          {!isAllConversationsSelected ? (
            <button
              onClick={() => setIsAllConversationsSelected(true)}
              className="text-[#0b57d0] font-semibold hover:underline ml-1"
            >
              Select all {effectiveTotal} conversations
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedIds(new Set());
                setIsAllConversationsSelected(false);
              }}
              className="text-[#0b57d0] font-semibold hover:underline ml-1"
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      {/* 3. Empty State */}
      {currentJobs.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
          <Clock className="w-10 h-10 text-gray-300 mb-3 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-gray-700">
            {type === 'search'
              ? 'No matching emails found'
              : type === 'scheduled'
                ? 'No scheduled emails'
                : 'No sent emails yet'}
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            {type === 'search'
              ? 'Try searching with another keyword, recipient address, or subject line.'
              : type === 'scheduled'
                ? 'Click "Compose" to schedule outreach campaigns with automated queue delivery.'
                : 'Delivered emails with Ethereal SMTP live preview links will appear here.'}
          </p>
        </div>
      )}

      {/* 4. Gmail Email Rows (Screenshots 1, 2, 3, 4) */}
      <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
        {currentJobs.map((job) => {
          const isSelected = selectedIds.has(job.id);
          const isStarred = !!starredIds[job.id];
          const timeLabel = formatGmailTime(
            job.scheduledTime || job.sentAt || job.scheduledAt || job.createdAt
          );
          const recipientName = getRecipientName(job.recipientEmail);
          const cleanSnippet = (job.body || '').replace(/<[^>]*>?/gm, '').trim();

          return (
            <div
              key={job.id}
              onClick={() => onSelectEmail(job, type)}
              className={`flex items-center px-3 sm:px-4 py-2 cursor-pointer transition-colors group text-sm select-none border-b border-gray-100 ${isSelected
                  ? 'bg-[#c2e7ff] hover:bg-[#b3dcfb] border-b-blue-100'
                  : 'bg-white hover:bg-[#f2f6fc] hover:shadow-xs'
                }`}
            >
              {/* Left Column: Drag handle + Checkbox + Star */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0 mr-3">
                {/* 6-dot drag handle (Screenshot 2 & 4) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 -ml-1 cursor-grab">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Checkbox (Screenshot 1, 2, 3, 4) */}
                <button
                  type="button"
                  onClick={(e) => toggleSelectOne(e, job.id)}
                  className="p-1 rounded hover:bg-gray-200/60 transition text-gray-400 hover:text-gray-700"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#0b57d0]" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Star icon */}
                <button
                  type="button"
                  onClick={(e) => toggleStar(e, job.id)}
                  className="p-1 rounded text-gray-300 hover:text-amber-400 transition"
                  title={isStarred ? 'Starred' : 'Not starred'}
                >
                  <Star
                    className={`w-4 h-4 ${isStarred ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                      }`}
                  />
                </button>
              </div>

              {/* Sender / Recipient Column */}
              <div
                className={`w-36 sm:w-48 shrink-0 truncate pr-2 text-sm ${isSelected ? 'font-semibold text-[#041e49]' : 'font-semibold text-gray-900'
                  }`}
              >
                {type === 'scheduled' ? `To: ${recipientName}` : recipientName}
              </div>

              {/* Subject & Body Snippet Column (Screenshot 4 with yellow highlight) */}
              <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate pr-4 text-sm">
                {/* Category Pill: "Inbox" / "Scheduled" / "Sent" (Screenshot 4) */}
                <span className="shrink-0 text-[11px] font-medium text-gray-600 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded mr-1">
                  {type === 'search'
                    ? job.status === 'SENT'
                      ? 'Sent'
                      : 'Scheduled'
                    : type === 'scheduled'
                      ? 'Scheduled'
                      : 'Sent'}
                </span>

                <span
                  className={`font-semibold shrink-0 max-w-[280px] sm:max-w-[400px] truncate ${isSelected ? 'text-[#041e49]' : 'text-gray-900'
                    }`}
                >
                  {renderHighlighted(job.subject || '(no subject)', highlightQuery)}
                </span>
                <span className="text-gray-400 shrink-0 font-normal">-</span>
                <span className="text-gray-500 font-normal truncate">
                  {renderHighlighted(cleanSnippet || 'No preview content available', highlightQuery)}
                </span>

                {/* Optional attachment badge pill (Screenshot 1 & 4) */}
                {job.attachmentName && (
                  <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-300 bg-white text-gray-700 text-[11px] font-medium ml-2 shadow-2xs">
                    <Paperclip className="w-3 h-3 text-gray-500" />
                    <span className="max-w-[120px] truncate">{job.attachmentName}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Time/Date OR Hover Quick Action Bar (Screenshot 2 & 4) */}
              <div className="shrink-0 flex items-center justify-end min-w-[90px] relative">
                {/* Default: Date/Time (e.g. 09:13, 22 Oct, 2 Nov) */}
                <span
                  className={`text-xs font-medium group-hover:hidden ${isSelected ? 'text-[#041e49] font-bold' : 'text-gray-500'
                    }`}
                >
                  {timeLabel}
                </span>

                {/* Hover Quick Action Icons - Only real, working actions */}
                <div className="hidden group-hover:flex items-center gap-1 text-gray-500 animate-in fade-in duration-75">
                  <button
                    type="button"
                    onClick={() => onSelectEmail(job, type)}
                    title="View email details"
                    className="p-1.5 rounded-full hover:bg-gray-200/80 text-gray-600 hover:text-gray-900 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteSingle(e, job.id)}
                    title={type === 'scheduled' ? 'Cancel Scheduled Email' : 'Delete Email'}
                    className="p-1.5 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Ethereal preview link if available */}
                  {(job.previewUrl || job.etherealMessageUrl) && (
                    <a
                      href={job.previewUrl || job.etherealMessageUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Open Live Ethereal Message"
                      className="p-1.5 rounded-full hover:bg-blue-50 text-gray-600 hover:text-[#0b57d0] transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
