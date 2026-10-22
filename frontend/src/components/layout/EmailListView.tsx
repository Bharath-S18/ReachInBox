import React, { useState } from 'react';
import { Clock, Star, ExternalLink, Trash2 } from 'lucide-react';
import { ScheduledEmailJob, SentEmailJob } from '../../types';

interface EmailListViewProps {
  type: 'scheduled' | 'sent';
  scheduledJobs: ScheduledEmailJob[];
  sentJobs: SentEmailJob[];
  onSelectEmail: (email: ScheduledEmailJob | SentEmailJob, type: 'scheduled' | 'sent') => void;
  onCancelScheduled?: (id: string) => void;
  isLoading?: boolean;
}

export const EmailListView: React.FC<EmailListViewProps> = ({
  type,
  scheduledJobs,
  sentJobs,
  onSelectEmail,
  onCancelScheduled,
  isLoading,
}) => {
  const [starredIds, setStarredIds] = useState<Record<string, boolean>>({});

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatScheduledTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Upcoming';
      const day = d.toLocaleDateString('en-US', { weekday: 'short' });
      const time = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      return `${day} ${time}`;
    } catch {
      return dateStr;
    }
  };

  const getRecipientName = (email: string) => {
    if (!email) return 'Unknown';
    // If it looks like firstName.lastName or has name formatting
    const raw = email.split('@')[0];
    const parts = raw.split(/[._-]/);
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // Scheduled Jobs View (Image 2)
  if (type === 'scheduled') {
    if (scheduledJobs.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
          <Clock className="w-10 h-10 text-gray-300 mb-3 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-gray-700">No scheduled emails</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            Click "Compose" to draft a campaign and schedule delayed outreach.
          </p>
        </div>
      );
    }

    return (
      <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
        {scheduledJobs.map((job) => {
          const isStarred = !!starredIds[job.id];
          const timeLabel = formatScheduledTime(job.scheduledTime);
          const recipientName = getRecipientName(job.recipientEmail);

          return (
            <div
              key={job.id}
              onClick={() => onSelectEmail(job, 'scheduled')}
              className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/80 cursor-pointer transition group"
            >
              {/* Left & Middle Info */}
              <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
                {/* Recipient */}
                <div className="w-36 sm:w-44 flex-shrink-0 text-sm font-medium text-gray-900 truncate">
                  To: {recipientName}
                </div>

                {/* Orange Scheduled Badge (Image 2) */}
                <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fff7ed] border border-[#ffedd5] text-[#ea580c] text-xs font-medium">
                  <Clock className="w-3 h-3 text-[#ea580c]" />
                  <span>{timeLabel}</span>
                </div>

                {/* Subject & Snippet */}
                <div className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-semibold text-gray-900">{job.subject}</span>
                  <span className="text-gray-400 font-normal ml-1">
                    - {job.body.replace(/<[^>]*>?/gm, '').slice(0, 80)}...
                  </span>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {onCancelScheduled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelScheduled(job.id);
                    }}
                    title="Cancel Scheduled Send"
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={(e) => toggleStar(e, job.id)}
                  className="p-1 rounded text-gray-300 hover:text-amber-400 transition"
                >
                  <Star
                    className={`w-4 h-4 ${
                      isStarred ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Sent Jobs View (Image 3)
  if (sentJobs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
        <Clock className="w-10 h-10 text-gray-300 mb-3 stroke-[1.5]" />
        <h3 className="text-sm font-semibold text-gray-700">No sent emails yet</h3>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">
          Delivered emails with Ethereal SMTP preview links will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
      {sentJobs.map((job) => {
        const isStarred = !!starredIds[job.id];
        const recipientName = getRecipientName(job.recipientEmail);
        const isFailed = job.status === 'FAILED';

        return (
          <div
            key={job.id}
            onClick={() => onSelectEmail(job, 'sent')}
            className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/80 cursor-pointer transition group"
          >
            {/* Left & Middle Info */}
            <div className="flex items-center gap-4 min-w-0 flex-1 pr-4">
              {/* Recipient */}
              <div className="w-36 sm:w-44 flex-shrink-0 text-sm font-medium text-gray-900 truncate">
                To: {recipientName}
              </div>

              {/* Gray Sent Badge (Image 3) */}
              <div
                className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isFailed
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-[#f4f6f5] text-gray-600'
                }`}
              >
                <span>{isFailed ? 'Failed' : 'Sent'}</span>
              </div>

              {/* Subject & Snippet */}
              <div className="min-w-0 flex-1 truncate text-sm">
                <span className="font-semibold text-gray-900">{job.subject}</span>
                <span className="text-gray-400 font-normal ml-1">
                  - {job.body.replace(/<[^>]*>?/gm, '').slice(0, 80)}...
                </span>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {job.previewUrl && (
                <a
                  href={job.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open Ethereal Preview"
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-[#00a854] transition flex items-center gap-1 text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </a>
              )}

              <button
                onClick={(e) => toggleStar(e, job.id)}
                className="p-1 rounded text-gray-300 hover:text-amber-400 transition"
              >
                <Star
                  className={`w-4 h-4 ${
                    isStarred ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                  }`}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
