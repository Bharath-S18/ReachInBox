import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  ChevronDown,
  Calendar,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Indent,
  Outdent,
  Upload,
} from 'lucide-react';
import { SenderAccount } from '../../types';
import { emailApi } from '../../services/api';

interface ComposeViewProps {
  senders: SenderAccount[];
  onBack: () => void;
  onSuccess: () => void;
}

export const ComposeView: React.FC<ComposeViewProps> = ({
  senders,
  onBack,
  onSuccess,
}) => {
  const [senderId, setSenderId] = useState<string>(senders[0]?.id || '');
  const [toInput, setToInput] = useState<string>('recipient@example.com');
  const [subject, setSubject] = useState<string>('');
  const [delaySec, setDelaySec] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);
  const [body, setBody] = useState<string>('');

  // Send Later Popover state (Image 5)
  const [showSendLater, setShowSendLater] = useState<boolean>(false);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // CSV Lead Upload toggle state
  const [showCsvUpload, setShowCsvUpload] = useState<boolean>(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedLeadCount, setParsedLeadCount] = useState<number>(0);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close Send Later popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowSendLater(false);
      }
    };
    if (showSendLater) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSendLater]);

  // Set default sender if senders load
  useEffect(() => {
    if (senders.length > 0 && !senderId) {
      setSenderId(senders[0].id);
    }
  }, [senders, senderId]);

  // Handle Quick Presets for "Send Later"
  const applyPreset = (preset: 'tomorrow' | '10am' | '11am' | '3pm') => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (preset === 'tomorrow') {
      tomorrow.setHours(9, 0, 0, 0);
    } else if (preset === '10am') {
      tomorrow.setHours(10, 0, 0, 0);
    } else if (preset === '11am') {
      tomorrow.setHours(11, 0, 0, 0);
    } else if (preset === '3pm') {
      tomorrow.setHours(15, 0, 0, 0);
    }

    // Convert to datetime-local format YYYY-MM-DDTHH:mm
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    setScheduledAt(localISOTime);
  };

  // CSV parsing
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      const unique = Array.from(new Set(emails));
      setParsedLeadCount(unique.length);
      setToInput(unique.join(', '));
    };
    reader.readAsText(file);
  };

  const handleSendOrSchedule = async () => {
    if (!subject.trim()) {
      setErrorMsg('Please enter a Subject line');
      return;
    }
    if (!body.trim()) {
      setErrorMsg('Please write an email body');
      return;
    }
    if (!toInput.trim() && !csvFile) {
      setErrorMsg('Please enter at least one recipient email address');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (csvFile) {
        const formData = new FormData();
        formData.append('file', csvFile);
        formData.append('subject', subject.trim());
        formData.append('body', body);
        formData.append('interEmailDelayMs', String(delaySec * 1000));
        formData.append('hourlyLimit', String(hourlyLimit));
        if (senderId) formData.append('senderId', senderId);
        if (scheduledAt) formData.append('startTime', new Date(scheduledAt).toISOString());

        await emailApi.schedule(formData);
      } else {
        await emailApi.schedule({
          subject: subject.trim(),
          body,
          recipients: toInput.trim(),
          interEmailDelayMs: delaySec * 1000,
          hourlyLimit,
          senderId: senderId || undefined,
          startTime: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error('Schedule error:', err);
      setErrorMsg(
        err.response?.data?.error || err.message || 'Failed to schedule campaign'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSender = senders.find((s) => s.id === senderId) || senders[0];
  const senderDisplayEmail = selectedSender?.email || 'oliver.brown@domain.io';

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto relative">
      {/* Top Header Bar (Image 5) */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 text-gray-700 transition"
            title="Cancel"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-gray-900">
            Compose New Email
          </h1>
        </div>

        {/* Right header actions: Attachment, Send Later clock, Send button */}
        <div className="flex items-center gap-3 relative">
          {/* Attachment Icon */}
          <label className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 cursor-pointer transition">
            <Paperclip className="w-4 h-4" />
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleCsvChange}
            />
          </label>

          {/* Clock icon: triggers "Send Later" Popover */}
          <div className="relative">
            <button
              onClick={() => setShowSendLater(!showSendLater)}
              title="Schedule / Send Later"
              className={`p-2 rounded-full hover:bg-gray-100 transition ${
                scheduledAt ? 'text-[#00a854] bg-emerald-50' : 'text-gray-500'
              }`}
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* "Send Later" Popover Card (Image 5) */}
            {showSendLater && (
              <div
                ref={popoverRef}
                className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="text-sm font-semibold text-gray-900 mb-3">
                  Send Later
                </div>

                {/* Date & Time Picker */}
                <div className="relative mb-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-1.5 text-xs text-gray-500">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full text-xs text-gray-800 bg-transparent focus:outline-none"
                    />
                    <Calendar className="w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1 mb-5">
                  <button
                    onClick={() => applyPreset('tomorrow')}
                    className="w-full text-left py-1 px-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition"
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => applyPreset('10am')}
                    className="w-full text-left py-1 px-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition"
                  >
                    Tomorrow, 10:00 AM
                  </button>
                  <button
                    onClick={() => applyPreset('11am')}
                    className="w-full text-left py-1 px-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition"
                  >
                    Tomorrow, 11:00 AM
                  </button>
                  <button
                    onClick={() => applyPreset('3pm')}
                    className="w-full text-left py-1 px-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition"
                  >
                    Tomorrow, 3:00 PM
                  </button>
                </div>

                {/* Popover Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setScheduledAt('');
                      setShowSendLater(false);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowSendLater(false)}
                    className="px-4 py-1 rounded-full border border-[#00a854] text-[#00a854] hover:bg-[#00a854] hover:text-white text-xs font-semibold transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Primary "Send" / "Schedule" green outline pill button (Image 5) */}
          <button
            onClick={handleSendOrSchedule}
            disabled={isSubmitting}
            className="py-1.5 px-6 rounded-full border border-[#00a854] text-[#00a854] hover:bg-[#00a854] hover:text-white text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-98 disabled:opacity-50"
          >
            {isSubmitting
              ? 'Sending...'
              : scheduledAt
              ? 'Schedule'
              : 'Send'}
          </button>
        </div>
      </div>

      {/* Error alert banner */}
      {errorMsg && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
          {errorMsg}
        </div>
      )}

      {/* Main Email Form Fields (Image 5) */}
      <div className="flex-1 flex flex-col px-6 py-4 max-w-4xl space-y-4">
        {/* From Row */}
        <div className="flex items-center border-b border-gray-100 pb-3">
          <label className="w-20 sm:w-28 text-xs sm:text-sm text-gray-500 font-medium">
            From
          </label>
          <div className="relative">
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="appearance-none bg-[#f4f6f5] hover:bg-gray-100 rounded-full px-4 py-1.5 pr-8 text-xs sm:text-sm font-medium text-gray-800 border-0 focus:outline-none cursor-pointer"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.email}
                </option>
              ))}
              {senders.length === 0 && (
                <option value="">{senderDisplayEmail}</option>
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* To Row */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center flex-1 min-w-0">
            <label className="w-20 sm:w-28 text-xs sm:text-sm text-gray-500 font-medium">
              To
            </label>
            <input
              type="text"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {parsedLeadCount > 0 && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {parsedLeadCount} Leads
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowCsvUpload(!showCsvUpload)}
              className="text-xs text-[#00a854] hover:underline font-medium whitespace-nowrap"
            >
              {showCsvUpload ? 'Hide CSV' : '+ Bulk CSV'}
            </button>
          </div>
        </div>

        {/* Optional CSV lead dropzone */}
        {showCsvUpload && (
          <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-center">
            <Upload className="w-6 h-6 text-gray-400 mb-2" />
            <div className="text-xs font-medium text-gray-700">
              Drag and drop leads CSV file, or browse
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Automatically parses and validates recipient email addresses.
            </p>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleCsvChange}
              className="mt-2 text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-[#00a854] hover:file:bg-emerald-100 cursor-pointer"
            />
          </div>
        )}

        {/* Subject Row */}
        <div className="flex items-center border-b border-gray-100 pb-3">
          <label className="w-20 sm:w-28 text-xs sm:text-sm text-gray-500 font-medium">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
        </div>

        {/* Parameters: Delay between 2 emails & Hourly Limit (Image 5) */}
        <div className="flex items-center gap-8 py-1">
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm text-gray-500 font-medium">
              Delay between 2 emails
            </span>
            <input
              type="number"
              min={0}
              value={delaySec}
              onChange={(e) => setDelaySec(Math.max(0, parseInt(e.target.value, 10) || 0))}
              placeholder="00"
              className="w-16 text-center py-1.5 px-2 rounded-xl bg-white border border-gray-200 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#00a854]"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm text-gray-500 font-medium">
              Hourly Limit
            </span>
            <input
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
              placeholder="00"
              className="w-16 text-center py-1.5 px-2 rounded-xl bg-white border border-gray-200 text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#00a854]"
            />
          </div>
        </div>

        {/* Email Body & Rich Formatting Toolbar (Image 5) */}
        <div className="flex-1 flex flex-col pt-3 min-h-[300px]">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type Your Reply..."
            className="w-full flex-1 p-0 border-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none leading-relaxed"
          />

          {/* Floating / Bottom Rich Text Toolbar (Image 5) */}
          <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-gray-500 overflow-x-auto pb-1">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                title="Undo"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Redo"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-gray-200 mx-1" />

              <button
                type="button"
                title="Font Style"
                className="px-2 py-1 rounded hover:bg-gray-100 text-xs font-semibold text-gray-600 flex items-center gap-1"
              >
                <span>Tt</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              <button
                type="button"
                title="Bold"
                onClick={() => setBody((prev) => prev + ' **bold**')}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition"
              >
                <Bold className="w-4 h-4" />
              </button>

              <button
                type="button"
                title="Italic"
                onClick={() => setBody((prev) => prev + ' *italic*')}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition"
              >
                <Italic className="w-4 h-4" />
              </button>

              <button
                type="button"
                title="Underline"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition"
              >
                <Underline className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-gray-200 mx-1" />

              <button
                type="button"
                title="Align"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <AlignLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                title="Bullet List"
                onClick={() => setBody((prev) => prev + '\n- ')}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <List className="w-4 h-4" />
              </button>

              <button
                type="button"
                title="Numbered List"
                onClick={() => setBody((prev) => prev + '\n1. ')}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <ListOrdered className="w-4 h-4" />
              </button>

              <button
                type="button"
                title="Indent"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <Indent className="w-4 h-4" />
              </button>

              <button
                type="button"
                title="Outdent"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <Outdent className="w-4 h-4" />
              </button>

              <button
                type="button"
                title="Quote"
                onClick={() => setBody((prev) => prev + '\n> ')}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <Quote className="w-4 h-4" />
              </button>

              <button
                type="button"
                title="Strikethrough"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
              >
                <Strikethrough className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
