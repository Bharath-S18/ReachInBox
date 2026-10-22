import React, { useState } from 'react';
import { ArrowLeft, Star, Archive, Trash2, ExternalLink, ChevronDown } from 'lucide-react';
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
  const senderName = 'Amanda Clark';
  const senderEmail = (email as any).sender?.email || (email as any).senderAccount?.email || 'sender@example.com';
  const recipientName = email.recipientEmail ? email.recipientEmail.split('@')[0] : 'Oliver';
  const previewUrl = (email as SentEmailJob).previewUrl || (email as any).etherealMessageUrl;

  const formatDate = () => {
    try {
      const dateVal = (email as SentEmailJob).sentAt || (email as ScheduledEmailJob).scheduledTime || (email as any).createdAt;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'Nov 3, 10:23 AM';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Nov 3, 10:23 AM';
    }
  };

  const initial = senderName.charAt(0).toUpperCase();

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Top Header Bar (Image 4) */}
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
            {email.subject || 'Oliver, hello there! | MJWYT44 BM#52W01'}
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
          <button
            className="p-2 rounded-full hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
            title="Archive"
          >
            <Archive className="w-4 h-4" />
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(email.id)}
              className="p-2 rounded-full hover:bg-red-50 transition text-gray-400 hover:text-red-500"
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
            {/* Green initial circle */}
            <div className="w-10 h-10 rounded-full bg-[#00a854] text-white flex items-center justify-center font-bold text-base flex-shrink-0 shadow-sm">
              {initial}
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-gray-900">{senderName}</span>
                <span className="text-xs text-gray-400">&lt;{senderEmail}&gt;</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 cursor-pointer hover:text-gray-700">
                <span>to me</span>
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
          <div className="mb-6 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-medium">
              This email was dispatched via Ethereal SMTP with a live preview.
            </span>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#00a854] hover:underline"
            >
              <span>Open in Ethereal Sandbox</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Email Body Copy */}
        <div className="space-y-4 text-sm text-gray-800 leading-relaxed font-sans">
          <p>Hey {recipientName},</p>
          <p>You've just RECEIVED something</p>

          {/* Highlighted Yellow Callout Box (as shown in Image 4) */}
          <div className="my-6 p-4 rounded-r-xl border-l-4 border-amber-400 bg-[#fffbeb] text-xs sm:text-sm text-gray-800 space-y-2">
            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment</span>
              <span>⚡</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>⚡</span>
              <span>
                To explore securing your private transformation, simply reply right now with{' '}
                <strong className="text-gray-900 font-bold">"FLY OUT FIX"</strong>.
              </span>
            </div>
          </div>

          {/* Additional text or custom body content */}
          {email.body && !email.body.includes('FLY OUT FIX') && (
            <div
              className="py-2 text-gray-700"
              dangerouslySetInnerHTML={{ __html: email.body }}
            />
          )}

          <p className="pt-2">Your coach for world-class performance,</p>
          <p className="font-semibold text-gray-900">Grant</p>
          <p className="italic text-xs text-gray-500 pt-2">
            P.S. Always remember that you can develop world class technique!
          </p>
        </div>

        {/* Attachments Section (Image 4) */}
        <div className="mt-10 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            {/* Attachment Card 1 */}
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow transition">
              <div className="h-32 bg-sky-600 relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=600&q=80"
                  alt="Tennis Coach Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold text-gray-900 truncate">
                  Tennis_Coach_Profile.png
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">1.2 MB</div>
              </div>
            </div>

            {/* Attachment Card 2 */}
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow transition">
              <div className="h-32 bg-sky-600 relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=600&q=80"
                  alt="Tennis Coach Profile 2"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold text-gray-900 truncate">
                  Tennis_Coach_Profile2.png
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">1.2 MB</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
