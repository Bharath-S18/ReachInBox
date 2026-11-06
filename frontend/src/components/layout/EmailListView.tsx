import React, { useState } from 'react';
import {
  Clock,
  Star,
  ExternalLink,
  Trash2,
  Archive,
  Mail,
  AlertOctagon,
  FolderInput,
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Paperclip,
  CheckSquare,
  Square,
  MinusSquare,
  RotateCw,
} from 'lucide-react';
import { ScheduledEmailJob, SentEmailJob } from '../../types';

interface EmailListViewProps {
  type: 'scheduled' | 'sent';
  scheduledJobs: ScheduledEmailJob[];
  sentJobs: SentEmailJob[];
  onSelectEmail: (email: ScheduledEmailJob | SentEmailJob, type: 'scheduled' | 'sent') => void;
  onCancelScheduled?: (id: string) => void;
  onDeleteSelected?: (ids: string[]) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const EmailListView: React.FC<EmailListViewProps> = ({
  type,
  scheduledJobs,
  sentJobs,
  onSelectEmail,
  onCancelScheduled,
  onDeleteSelected,
  onRefresh,
  isLoading,
}) => {
  const [starredIds, setStarredIds] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMenuOpen, setSelectMenuOpen] = useState(false);
  const [isAllConversationsSelected, setIsAllConversationsSelected] = useState(false);

  const currentJobs = type === 'scheduled' ? scheduledJobs : sentJobs;

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

  const isAllSelected = currentJobs.length > 0 && selectedIds.size === currentJobs.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < currentJobs.length;

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
      {/* 1. Gmail Top Action Bar (Screenshot 3) */}
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

          {/* Action icons when items are selected */}
          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-1 ml-2 animate-in fade-in duration-100">
              <button
                className="p-1.5 rounded hover:bg-gray-100 transition text-gray-600 hover:text-gray-900"
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 rounded hover:bg-gray-100 transition text-gray-600 hover:text-gray-900"
                title="Report spam"
              >
                <AlertOctagon className="w-4 h-4" />
              </button>
              <button
                onClick={handleDeleteSelected}
                className="p-1.5 rounded hover:bg-blue-50 transition text-gray-600 hover:text-[#0b57d0]"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button
                className="p-1.5 rounded hover:bg-gray-100 transition text-gray-600 hover:text-gray-900"
                title="Mark as unread"
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 rounded hover:bg-gray-100 transition text-gray-600 hover:text-gray-900"
                title="Move to"
              >
                <FolderInput className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 rounded hover:bg-gray-100 transition text-gray-600 hover:text-gray-900"
                title="More"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 ml-1">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-1.5 rounded hover:bg-gray-100 transition text-gray-500 hover:text-gray-800"
                  title="Refresh"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Pagination Controls (Screenshot 3) */}
        <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
          <span>
            {currentJobs.length === 0
              ? '0–0 of 0'
              : `1–${currentJobs.length} of ${currentJobs.length}`}
          </span>
          <div className="flex items-center">
            <button
              disabled
              className="p-1 rounded text-gray-300 hover:text-gray-600 disabled:opacity-40 transition"
              title="Newer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled
              className="p-1 rounded text-gray-300 hover:text-gray-600 disabled:opacity-40 transition"
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
              Select all {currentJobs.length} conversations in {type === 'scheduled' ? 'Scheduled' : 'Sent'}
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
            {type === 'scheduled' ? 'No scheduled emails' : 'No sent emails yet'}
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            {type === 'scheduled'
              ? 'Click "Compose" to schedule outreach campaigns with automated queue delivery.'
              : 'Delivered emails with Ethereal SMTP live preview links will appear here.'}
          </p>
        </div>
      )}

      {/* 4. Gmail Email Rows (Screenshots 1, 2, 3) */}
      <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
        {currentJobs.map((job) => {
          const isSelected = selectedIds.has(job.id);
          const isStarred = !!starredIds[job.id];
          const timeLabel = formatGmailTime(
            (job as ScheduledEmailJob).scheduledTime || (job as SentEmailJob).sentAt || (job as any).scheduledAt || (job as any).createdAt
          );
          const recipientName = getRecipientName(job.recipientEmail);
          const cleanSnippet = (job.body || '').replace(/<[^>]*>?/gm, '').trim();

          return (
            <div
              key={job.id}
              onClick={() => onSelectEmail(job, type)}
              className={`flex items-center px-3 sm:px-4 py-2 cursor-pointer transition-colors group text-sm select-none border-b border-gray-100 ${
                isSelected
                  ? 'bg-[#c2e7ff] hover:bg-[#b3dcfb] border-b-blue-100'
                  : 'bg-white hover:bg-[#f2f6fc] hover:shadow-xs'
              }`}
            >
              {/* Left Column: Drag handle + Checkbox + Star */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0 mr-3">
                {/* 6-dot drag handle (Screenshot 2) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 -ml-1 cursor-grab">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Checkbox (Screenshot 1, 2, 3) */}
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
                    className={`w-4 h-4 ${
                      isStarred ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              </div>

              {/* Sender / Recipient Column */}
              <div
                className={`w-36 sm:w-48 shrink-0 truncate pr-2 text-sm ${
                  isSelected ? 'font-semibold text-[#041e49]' : 'font-semibold text-gray-900'
                }`}
              >
                {type === 'scheduled' ? `To: ${recipientName}` : recipientName}
              </div>

              {/* Subject & Body Snippet Column */}
              <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate pr-4 text-sm">
                <span
                  className={`font-semibold shrink-0 max-w-[280px] sm:max-w-[400px] truncate ${
                    isSelected ? 'text-[#041e49]' : 'text-gray-900'
                  }`}
                >
                  {job.subject || '(no subject)'}
                </span>
                <span className="text-gray-400 shrink-0 font-normal">-</span>
                <span className="text-gray-500 font-normal truncate">
                  {cleanSnippet || 'No preview content available'}
                </span>

                {/* Optional attachment badge pill (Screenshot 1) */}
                {(job as any).attachmentName && (
                  <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-300 bg-white text-gray-700 text-[11px] font-medium ml-2 shadow-2xs">
                    <Paperclip className="w-3 h-3 text-gray-500" />
                    <span className="max-w-[120px] truncate">{(job as any).attachmentName}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Time/Date OR Hover Quick Action Bar (Screenshot 2) */}
              <div className="shrink-0 flex items-center justify-end min-w-[90px] relative">
                {/* Default: Date/Time (e.g. 09:13 or 5 Nov) */}
                <span
                  className={`text-xs font-medium group-hover:hidden ${
                    isSelected ? 'text-[#041e49] font-bold' : 'text-gray-500'
                  }`}
                >
                  {timeLabel}
                </span>

                {/* Hover Quick Action Icons (Archive, Delete, Mark as unread, Snooze - Screenshot 2) */}
                <div className="hidden group-hover:flex items-center gap-1 text-gray-500 animate-in fade-in duration-75">
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    title="Archive"
                    className="p-1.5 rounded hover:bg-gray-200/80 text-gray-600 hover:text-gray-900 transition"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteSingle(e, job.id)}
                    title={type === 'scheduled' ? 'Cancel Scheduled Send' : 'Delete'}
                    className="p-1.5 rounded hover:bg-blue-50 text-gray-600 hover:text-[#0b57d0] transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    title="Mark as unread"
                    className="p-1.5 rounded hover:bg-gray-200/80 text-gray-600 hover:text-gray-900 transition"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    title="Snooze"
                    className="p-1.5 rounded hover:bg-gray-200/80 text-gray-600 hover:text-gray-900 transition"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>

                  {/* Ethereal preview link if available */}
                  {(job as any).previewUrl && (
                    <a
                      href={(job as any).previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Open Ethereal Preview"
                      className="p-1.5 rounded hover:bg-blue-50 text-gray-600 hover:text-[#0b57d0] transition"
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
