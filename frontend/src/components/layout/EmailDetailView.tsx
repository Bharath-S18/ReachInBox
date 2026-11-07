import React, { useState } from 'react';
import { ArrowLeft, Star, Trash2, ExternalLink, ChevronDown } from 'lucide-react';
import { ScheduledEmailJob, SentEmailJob, User } from '../../types';

interface EmailDetailViewProps {
  email: ScheduledEmailJob | SentEmailJob;
  type: 'scheduled' | 'sent';
  currentUser: User | null;
  onBack: () => void;
  onDelete?: (id: string) => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({
  email,
  type: _type,
  currentUser,
  onBack,
  onDelete,
}) => {
  const [isStarred, setIsStarred] = useState(false);

  // Determine sender and recipient info
  const senderName =
    (email as any).sender?.name ||
    (email as any).senderAccount?.name ||
    (email as any).sender?.email ||
    (email as any).senderAccount?.email ||
    'Sender';
  const senderEmail =
    (email as any).sender?.email ||
    (email as any).senderAccount?.email ||
    'sender@domain.com';
  const recipientEmail = email.recipientEmail || 'recipient@domain.com';
  const previewUrl =
    (email as SentEmailJob).previewUrl || (email as any).etherealMessageUrl;

  const formatDate = () => {
    try {
      const dateVal =
        (email as SentEmailJob).sentAt ||
        (email as ScheduledEmailJob).scheduledTime ||
        (email as any).scheduledAt ||
        (email as any).createdAt;
      if (!dateVal) return 'Recent';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'Recent';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Recent';
    }
  };

  const initial = senderName.charAt(0).toUpperCase();

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition"
            title="Back to inbox"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
            {email.subject || '(No Subject)'}
          </h1>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 sm:gap-2 text-gray-500">
          <button
            onClick={() => setIsStarred(!isStarred)}
            className="p-2 rounded-full hover:bg-gray-100 transition"
            title="Star email"
          >
            <Star
              className={`w-4 h-4 ${
                isStarred ? 'fill-amber-400 text-amber-400' : 'text-gray-400'
              }`}
            />
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(email.id)}
              className="p-2 rounded-full hover:bg-red-50 transition text-gray-500 hover:text-red-600"
              title="Delete email"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <div className="w-7 h-7 rounded-full overflow-hidden ml-2 ring-1 ring-gray-200">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80'}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Main Email Message Content */}
      <div className="flex-1 p-6 sm:p-10 max-w-4xl">
        {/* Sender details row */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0b57d0] text-white flex items-center justify-center font-bold text-base flex-shrink-0 shadow-sm">
              {initial}
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-gray-900">{senderName}</span>
                <span className="text-xs text-gray-400">&lt;{senderEmail}&gt;</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 cursor-pointer hover:text-gray-700">
                <span>to {recipientEmail}</span>
                <ChevronDown className="w-3 h-3" />
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400 whitespace-nowrap pt-1">
            {formatDate()}
          </div>
        </div>

        {/* Ethereal preview button if delivered */}
        {previewUrl && (
          <div className="mb-6 p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
            <span className="text-xs text-[#041e49] font-medium">
              This email was dispatched via Ethereal SMTP with a live preview.
            </span>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b57d0] hover:underline"
            >
              <span>Open in Ethereal Sandbox</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Email Body Copy */}
        <div className="space-y-4 text-sm text-gray-800 leading-relaxed font-sans">
          {email.body ? (
            <div
              className="py-2 text-gray-700 whitespace-pre-wrap leading-relaxed"
              dangerouslySetInnerHTML={{ __html: email.body }}
            />
          ) : (
            <p className="italic text-gray-400 py-4">No content body in this message.</p>
          )}
        </div>
      </div>
    </div>
  );
};
