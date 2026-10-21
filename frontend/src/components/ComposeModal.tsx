import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Mail,
  Send,
  UploadCloud,
  UserCheck,
  X,
} from 'lucide-react';
import { SenderAccount } from '../types';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: SenderAccount[];
  onSubmit: (formData: FormData) => Promise<void>;
  isSubmitting: boolean;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  senders,
  onSubmit,
  isSubmitting,
}) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(
    'Hi {{name}},\n\nI came across your profile and wanted to reach out regarding our new developer platform.\n\nBest regards,\nReachInbox Outreach Team'
  );
  const [senderId, setSenderId] = useState(senders[0]?.id || '');
  // Default scheduled time 5 minutes in future
  const defaultTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
  const [scheduledTime, setScheduledTime] = useState(defaultTime);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<{ total: number; valid: number; preview: string[] } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const selectedSender = senders.find((s) => s.id === senderId) || senders[0];
  const hourlyLimit = selectedSender?.hourlyLimit || 50;

  const handleFileChange = (file: File) => {
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emails: string[] = [];
      let valid = 0;

      lines.forEach((line, idx) => {
        // Skip header if first line looks like header
        if (idx === 0 && line.toLowerCase().includes('email')) return;
        const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        const foundEmail = parts.find((p) => emailRegex.test(p));
        if (foundEmail) {
          valid++;
          if (emails.length < 5) emails.push(foundEmail);
        }
      });

      setParsedPreview({
        total: lines.length > 0 ? (lines[0].toLowerCase().includes('email') ? lines.length - 1 : lines.length) : 0,
        valid,
        preview: emails,
      });
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      alert('Please enter an email subject');
      return;
    }
    if (!csvFile) {
      alert('Please upload a CSV file containing recipient leads');
      return;
    }

    const formData = new FormData();
    formData.append('csvFile', csvFile);
    formData.append('subject', subject);
    formData.append('body', body);
    formData.append('scheduledTime', new Date(scheduledTime).toISOString());
    if (senderId) {
      formData.append('senderAccountId', senderId);
    }

    await onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border-card bg-surface-card shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border-card px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg border border-border-card bg-surface-container p-2 text-border-highlight">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white tracking-tight">
                Schedule Email Campaign
              </h3>
              <p className="font-mono text-[11px] text-text-muted">
                BullMQ delayed dispatch with multi-sender rotation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-transparent p-1.5 text-text-muted transition-colors hover:border-border-card hover:bg-surface-container hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6 space-y-5">
          {/* Sender Account & Scheduled Time */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-mono text-xs text-text-muted">
                Outbound Sender Account
              </label>
              <select
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                className="w-full rounded-lg border border-border-card bg-surface-container px-3 py-2 font-mono text-xs text-white focus:border-border-highlight focus:outline-none"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.email} (Limit: {s.hourlyLimit}/hr)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-xs text-text-muted">
                Scheduled Send Window
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full rounded-lg border border-border-card bg-surface-container px-3 py-2 font-mono text-xs text-white focus:border-border-highlight focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="mb-1.5 block font-mono text-xs text-text-muted">
              Campaign Subject Line
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Partnership Proposal for Q4"
              className="w-full rounded-lg border border-border-card bg-surface-container px-3 py-2 font-sans text-xs text-white placeholder:text-text-muted focus:border-border-highlight focus:outline-none"
            />
          </div>

          {/* CSV File Upload Dropzone */}
          <div>
            <label className="mb-1.5 block font-mono text-xs text-text-muted">
              Recipient Lead File (.csv)
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                dragActive
                  ? 'border-border-highlight bg-sky-950/20 shadow-glow-cyan'
                  : 'border-border-card bg-surface-container/50 hover:border-slate-600'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full border border-border-card bg-surface-card p-3 text-border-highlight">
                  <UploadCloud className="h-5 w-5" />
                </div>
                {csvFile ? (
                  <div>
                    <p className="font-mono text-xs font-semibold text-white">{csvFile.name}</p>
                    <p className="font-mono text-[11px] text-emerald-400">
                      {(csvFile.size / 1024).toFixed(1)} KB uploaded
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-sans text-xs font-medium text-white">
                      Drop CSV lead file here, or click to browse
                    </p>
                    <p className="font-mono text-[10px] text-text-muted mt-1">
                      Expected column: "email" (or comma-separated emails)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Parsed Preview Indicator */}
            {parsedPreview && (
              <div className="mt-2.5 rounded-lg border border-border-card bg-surface-container p-3 font-mono text-xs">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="flex items-center gap-1.5 text-white">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{parsedPreview.valid} Valid Leads Detected</span>
                  </span>
                  <span className="text-[11px]">
                    Total Rows: {parsedPreview.total}
                  </span>
                </div>
                {parsedPreview.preview.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {parsedPreview.preview.map((em, i) => (
                      <span
                        key={i}
                        className="rounded border border-border-card bg-surface-card px-2 py-0.5 text-[10px] text-slate-300"
                      >
                        {em}
                      </span>
                    ))}
                    {parsedPreview.valid > parsedPreview.preview.length && (
                      <span className="rounded border border-border-card bg-surface-card px-2 py-0.5 text-[10px] text-text-muted">
                        +{parsedPreview.valid - parsedPreview.preview.length} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rate Limit Safety Notice */}
          {parsedPreview && parsedPreview.valid > hourlyLimit && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 font-mono text-xs text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold uppercase tracking-wider text-[11px]">
                  Rate Limit Safety Policy Active
                </p>
                <p className="text-[11px] text-amber-200/80 mt-0.5 font-sans">
                  Your batch has {parsedPreview.valid} leads, exceeding the sender's hourly limit of {hourlyLimit}.
                  The BullMQ rate limiter will dispatch {hourlyLimit} immediately in this window and defer the remaining {parsedPreview.valid - hourlyLimit} jobs to the next hour without dropping any emails. A live alert will fire to Slack.
                </p>
              </div>
            </div>
          )}

          {/* Email Body */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="font-mono text-xs text-text-muted">
                Email Content (HTML or Plaintext)
              </label>
              <span className="font-mono text-[10px] text-text-muted">
                Supports {'{{name}}'}, {'{{email}}'}
              </span>
            </div>
            <textarea
              rows={5}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-border-card bg-surface-container p-3 font-mono text-xs text-white placeholder:text-text-muted focus:border-border-highlight focus:outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-card">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-border-card bg-surface-container px-4 py-2 font-mono text-xs text-text-muted transition-all hover:bg-surface-card hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-white px-5 py-2 font-display text-xs font-semibold text-black shadow-glow-white transition-all hover:bg-slate-200 active:scale-95 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Enqueuing Jobs...' : 'Schedule Campaign'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
