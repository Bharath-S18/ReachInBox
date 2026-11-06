import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Paperclip,
  Clock,
  Link as LinkIcon,
  MoreVertical,
  Trash2,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Calendar,
  Check,
  Upload,
} from 'lucide-react';
import { SenderAccount, User } from '../../types';
import { emailApi } from '../../services/api';

interface RecipientChip {
  id: string;
  email: string;
  name: string;
  avatarLetter: string;
  avatarColor: string;
}

const AVATAR_COLORS = [
  '#e65100', // deep orange (matches user screenshot)
  '#1a73e8', // google blue
  '#0f9d58', // google green
  '#a142f4', // google purple
  '#d93025', // google red
  '#00897b', // teal
  '#e91e63', // pink
];

function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function createRecipientChip(
  raw: string,
  currentUser?: User | null,
  senders: SenderAccount[] = []
): RecipientChip | null {
  const trimmed = raw.trim().replace(/^[,\s;]+|[,\s;]+$/g, '');
  if (!trimmed) return null;

  const angleMatch = trimmed.match(/^([^<]*)<([^>]+)>$/);
  let name = '';
  let email = '';

  if (angleMatch) {
    name = angleMatch[1].trim();
    email = angleMatch[2].trim();
  } else if (trimmed.includes('@')) {
    email = trimmed;
    name = trimmed; // Retain full email so the user's email address is never stripped or hidden
  } else {
    // User typed a name or keyword without '@' (e.g. "Bharath" or "me")
    const lower = trimmed.toLowerCase();
    if (
      currentUser?.email &&
      (lower === 'me' ||
        lower === 'myself' ||
        (currentUser.name && currentUser.name.toLowerCase().includes(lower)))
    ) {
      name = currentUser.name || trimmed;
      email = currentUser.email;
    } else {
      // Check if it matches any configured SMTP sender account
      const matched = senders.find(
        (s) =>
          (s.name && s.name.toLowerCase().includes(lower)) ||
          s.email.toLowerCase().includes(lower)
      );
      if (matched) {
        name = matched.name || trimmed;
        email = matched.email;
      } else {
        return null;
      }
    }
  }

  // Ensure email has valid format with @ and a domain
  if (!email || !email.includes('@') || !email.includes('.')) {
    return null;
  }

  // Derive initial letter (e.g. 'B' from 'bharath.s06101968@gmail.com')
  const initialSource = (name && name !== email) ? name : email;
  const avatarLetter = (initialSource || 'U').charAt(0).toUpperCase();
  const avatarColor = getAvatarColor(email || name);

  return {
    id: `${email}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email,
    name: name || email,
    avatarLetter,
    avatarColor,
  };
}

interface ComposeViewProps {
  senders: SenderAccount[];
  currentUser?: User | null;
  onBack: () => void;
  onSuccess: () => void;
}

export const ComposeView: React.FC<ComposeViewProps> = ({
  senders,
  currentUser,
  onBack,
  onSuccess,
}) => {
  // Window dock / maximize state
  const [windowState, setWindowState] = useState<'normal' | 'minimized' | 'maximized'>('normal');

  // Form Fields
  const [senderId, setSenderId] = useState<string>(senders[0]?.id || '');

  // Multi-recipient chip states
  const [recipients, setRecipients] = useState<RecipientChip[]>([]);
  const [toInputValue, setToInputValue] = useState<string>('');
  const toInputRef = useRef<HTMLInputElement>(null);

  const [showCc, setShowCc] = useState<boolean>(false);
  const [showBcc, setShowBcc] = useState<boolean>(false);
  const [ccRecipients, setCcRecipients] = useState<RecipientChip[]>([]);
  const [ccInputValue, setCcInputValue] = useState<string>('');
  const ccInputRef = useRef<HTMLInputElement>(null);

  const [bccRecipients, setBccRecipients] = useState<RecipientChip[]>([]);
  const [bccInputValue, setBccInputValue] = useState<string>('');
  const bccInputRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState<string>('');
  const [delaySec, setDelaySec] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);

  // ContentEditable Editor ref & HTML string ref (avoids continuous re-renders)
  const editorRef = useRef<HTMLDivElement>(null);
  const bodyHtmlRef = useRef<string>('');

  // Formatting Toolbar Toggle & Active States
  const [showFormattingBar, setShowFormattingBar] = useState<boolean>(true);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [currentFont, setCurrentFont] = useState<string>('Sans Serif');
  const [currentSize, setCurrentSize] = useState<string>('Normal');
  const [showFontMenu, setShowFontMenu] = useState<boolean>(false);
  const [showSizeMenu, setShowSizeMenu] = useState<boolean>(false);
  const [showColorMenu, setShowColorMenu] = useState<boolean>(false);
  const [showAlignMenu, setShowAlignMenu] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  // Send Later Popover state
  const [showSendLater, setShowSendLater] = useState<boolean>(false);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const sendLaterRef = useRef<HTMLDivElement>(null);

  // File Attachments & CSV leads
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedLeadCount, setParsedLeadCount] = useState<number>(0);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default sender if senders load
  useEffect(() => {
    if (senders.length > 0 && !senderId) {
      setSenderId(senders[0].id);
    }
  }, [senders, senderId]);

  // Sync active format states strictly when caret is inside the editor
  const checkActiveFormats = () => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const anchor = sel.anchorNode;
    if (!anchor || !editorRef.current.contains(anchor)) {
      // Cursor or selection is outside the editor (e.g. in Subject), do not interfere!
      return;
    }

    try {
      const bold = document.queryCommandState('bold');
      const italic = document.queryCommandState('italic');
      const underline = document.queryCommandState('underline');

      setIsBold((prev) => (prev !== bold ? bold : prev));
      setIsItalic((prev) => (prev !== italic ? italic : prev));
      setIsUnderline((prev) => (prev !== underline ? underline : prev));
    } catch {
      // ignore in environments without command support
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sendLaterRef.current && !sendLaterRef.current.contains(target)) {
        setShowSendLater((prev) => (prev ? false : prev));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format command exec helper
  const execCmd = (cmd: string, value: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(cmd, false, value);
    checkActiveFormats();
    if (editorRef.current) {
      bodyHtmlRef.current = editorRef.current.innerHTML;
    }
  };

  // Font family selector
  const selectFont = (fontName: string) => {
    setCurrentFont(fontName);
    execCmd('fontName', fontName);
    setShowFontMenu(false);
  };

  // Font size selector
  const selectSize = (label: string, cmdVal: string) => {
    setCurrentSize(label);
    execCmd('fontSize', cmdVal);
    setShowSizeMenu(false);
  };

  // Color selector
  const selectColor = (type: 'foreColor' | 'hiliteColor', color: string) => {
    execCmd(type, color);
    setShowColorMenu(false);
  };

  // Link helper
  const handleInsertLink = () => {
    const url = prompt('Enter the destination URL:', 'https://');
    if (url) {
      execCmd('createLink', url);
    }
  };

  // Recipient chip helpers
  const addRecipientsFromText = (
    text: string,
    listSetter: React.Dispatch<React.SetStateAction<RecipientChip[]>>,
    inputSetter: (v: string) => void
  ) => {
    const parts = text.split(/[,\n;]+/).map((p) => p.trim()).filter(Boolean);
    const newChips: RecipientChip[] = [];
    let hasInvalid = false;

    for (const part of parts) {
      const chip = createRecipientChip(part, currentUser, senders);
      if (chip) {
        newChips.push(chip);
      } else {
        hasInvalid = true;
      }
    }

    if (hasInvalid && newChips.length === 0) {
      setErrorMsg(`"${text.trim()}" is not a valid email address. Please enter a valid email (e.g. name@domain.com)`);
    } else if (hasInvalid) {
      setErrorMsg('Some invalid email addresses were skipped. Ensure all recipients have @ and a domain.');
    }

    if (newChips.length > 0) {
      listSetter((prev) => {
        const existingEmails = new Set(prev.map((r) => r.email.toLowerCase()));
        const filtered = newChips.filter((c) => !existingEmails.has(c.email.toLowerCase()));
        return [...prev, ...filtered];
      });
    }
    inputSetter('');
  };

  const handleRecipientKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: string,
    recipientsList: RecipientChip[],
    listSetter: React.Dispatch<React.SetStateAction<RecipientChip[]>>,
    inputSetter: (v: string) => void
  ) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      if (currentValue.trim()) {
        addRecipientsFromText(currentValue, listSetter, inputSetter);
      }
    } else if (e.key === 'Backspace' && !currentValue && recipientsList.length > 0) {
      listSetter((prev) => prev.slice(0, -1));
    }
  };

  // Quick presets for Send Later
  const applyPreset = (preset: 'tomorrow_morning' | 'tomorrow_afternoon' | 'monday_morning') => {
    const now = new Date();
    const target = new Date(now);

    if (preset === 'tomorrow_morning') {
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    } else if (preset === 'tomorrow_afternoon') {
      target.setDate(target.getDate() + 1);
      target.setHours(13, 0, 0, 0);
    } else if (preset === 'monday_morning') {
      const daysUntilMonday = ((1 + 7 - target.getDay()) % 7) || 7;
      target.setDate(target.getDate() + daysUntilMonday);
      target.setHours(8, 0, 0, 0);
    }

    const tzOffset = target.getTimezoneOffset() * 60000;
    const localISOTime = new Date(target.getTime() - tzOffset).toISOString().slice(0, 16);
    setScheduledAt(localISOTime);
  };

  // File & CSV handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const csv = files.find((f) => f.name.endsWith('.csv') || f.name.endsWith('.txt'));
    if (csv) {
      setCsvFile(csv);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        const unique = Array.from(new Set(emails));
        setParsedLeadCount(unique.length);
        addRecipientsFromText(unique.join(', '), setRecipients, setToInputValue);
      };
      reader.readAsText(csv);
    }

    setAttachedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit / Send / Schedule
  const handleSendOrSchedule = async () => {
    const currentEditorContent = editorRef.current?.innerHTML || bodyHtmlRef.current;

    if (!subject.trim()) {
      setErrorMsg('Please enter a Subject line');
      return;
    }
    if (!currentEditorContent.trim() || currentEditorContent === '<br>') {
      setErrorMsg('Please write an email body');
      return;
    }

    const allTo = [
      ...recipients.map((r) => r.email),
      ...(toInputValue.trim() ? [toInputValue.trim()] : []),
    ];
    const combinedTo = allTo.join(', ');

    if (!combinedTo && !csvFile) {
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
        formData.append('body', currentEditorContent);
        formData.append('interEmailDelayMs', String(delaySec * 1000));
        formData.append('hourlyLimit', String(hourlyLimit));
        if (combinedTo) formData.append('recipients', combinedTo);
        if (senderId) formData.append('senderId', senderId);
        if (scheduledAt) formData.append('startTime', new Date(scheduledAt).toISOString());

        await emailApi.schedule(formData);
      } else {
        await emailApi.schedule({
          subject: subject.trim(),
          body: currentEditorContent,
          recipients: combinedTo,
          interEmailDelayMs: delaySec * 1000,
          hourlyLimit,
          senderId: senderId || undefined,
          startTime: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error('Schedule error:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to dispatch email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSender = senders.find((s) => s.id === senderId) || senders[0];
  const senderDisplayEmail = selectedSender?.email || currentUser?.email || 'sender@reachinbox.ai';

  // 1. Minimized View (Floating tab at bottom right)
  if (windowState === 'minimized') {
    return (
      <div className="fixed bottom-0 right-8 z-50 w-72 h-11 bg-[#f2f6fc] border border-gray-300 rounded-t-xl shadow-xl flex items-center justify-between px-3 cursor-pointer hover:bg-gray-200/80 transition-colors">
        <div
          onClick={() => setWindowState('normal')}
          className="flex-1 text-xs font-semibold text-gray-800 truncate pr-2"
        >
          {subject.trim() || 'New Message'}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWindowState('normal')}
            className="p-1 hover:bg-gray-300 rounded text-gray-600"
            title="Expand"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onBack}
            className="p-1 hover:bg-gray-300 rounded text-gray-600"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Normal or Maximized Window
  const containerClasses =
    windowState === 'maximized'
      ? 'fixed inset-3 sm:inset-6 z-50 bg-white rounded-2xl border border-gray-300 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150'
      : 'fixed bottom-0 right-4 sm:right-10 z-50 w-[620px] max-w-[calc(100vw-32px)] h-[580px] max-h-[90vh] bg-white rounded-t-2xl border border-gray-300 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-150';

  return (
    <div className={containerClasses}>
      {/* Window Header Bar (Matches screenshot with title, -, ⤢, ✕) */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#f2f6fc] border-b border-gray-200 select-none">
        <span className="text-sm font-semibold text-gray-800 truncate pr-4">
          {subject.trim() || 'New Message'}
        </span>
        <div className="flex items-center gap-1.5 text-gray-600">
          <button
            onClick={() => setWindowState('minimized')}
            className="p-1 rounded hover:bg-gray-200/80 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <button
            onClick={() => setWindowState(windowState === 'maximized' ? 'normal' : 'maximized')}
            className="p-1 rounded hover:bg-gray-200/80 transition-colors"
            title={windowState === 'maximized' ? 'Restore down' : 'Maximize'}
          >
            {windowState === 'maximized' ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={onBack}
            className="p-1 rounded hover:bg-gray-200/80 transition-colors text-gray-700 hover:text-[#0b57d0]"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="mx-4 mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* From Sender Row */}
      <div className="flex items-center px-4 py-1.5 border-b border-gray-100 text-xs bg-gray-50/60">
        <span className="text-gray-500 w-12 font-medium">From</span>
        <div className="relative flex-1">
          <select
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
            className="w-full bg-transparent text-gray-800 font-medium focus:outline-none cursor-pointer pr-6 appearance-none"
          >
            {senders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ? `${s.name} <${s.email}>` : s.email} (Limit: {s.hourlyLimit}/hr)
              </option>
            ))}
            {senders.length === 0 && <option value="">{senderDisplayEmail}</option>}
          </select>
          <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* To Row with Multi-Recipient Chips (Matches screenshot exactly!) */}
      <div
        onClick={() => toInputRef.current?.focus()}
        className="flex items-start px-4 py-2 border-b border-gray-100 text-sm cursor-text min-h-[44px]"
      >
        <span className="text-gray-500 w-10 pt-1 font-normal select-none shrink-0">To</span>

        <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
          {recipients.map((chip) => (
            <div
              key={chip.id}
              className="border border-gray-400/90 rounded-full pl-0.5 pr-2.5 py-0.5 inline-flex items-center gap-1.5 bg-white text-gray-800 text-xs sm:text-sm select-none hover:bg-gray-50 transition-all shadow-2xs"
            >
              <div
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full text-white text-[11px] sm:text-xs font-bold flex items-center justify-center shrink-0"
                style={{ backgroundColor: chip.avatarColor }}
              >
                {chip.avatarLetter}
              </div>
              <span className="font-medium text-gray-900 truncate max-w-[200px] sm:max-w-[300px]" title={chip.email}>
                {chip.name && chip.name !== chip.email ? `${chip.name} <${chip.email}>` : chip.email}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRecipients((prev) => prev.filter((r) => r.id !== chip.id));
                }}
                className="text-gray-400 hover:text-gray-800 transition-colors ml-0.5 p-0.5"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <input
            ref={toInputRef}
            type="text"
            value={toInputValue}
            onChange={(e) => setToInputValue(e.target.value)}
            onKeyDown={(e) =>
              handleRecipientKeyDown(
                e,
                toInputValue,
                recipients,
                setRecipients,
                setToInputValue
              )
            }
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData('text');
              addRecipientsFromText(pasted, setRecipients, setToInputValue);
            }}
            onBlur={() => {
              if (toInputValue.trim()) {
                addRecipientsFromText(toInputValue, setRecipients, setToInputValue);
              }
            }}
            placeholder={recipients.length === 0 ? 'Recipients...' : ''}
            className="flex-1 min-w-[140px] bg-transparent border-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none py-1"
          />
        </div>

        <div className="flex items-center gap-2 select-none text-xs text-gray-500 font-medium ml-2 pt-1 shrink-0">
          {parsedLeadCount > 0 && (
            <span className="bg-blue-50 text-[#0b57d0] px-2 py-0.5 rounded-full text-[11px] font-semibold">
              {parsedLeadCount} Leads
            </span>
          )}
          {!showCc && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCc(true);
              }}
              className="hover:text-gray-900 transition-colors"
            >
              Cc
            </button>
          )}
          {!showBcc && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowBcc(true);
              }}
              className="hover:text-gray-900 transition-colors"
            >
              Bcc
            </button>
          )}
        </div>
      </div>

      {/* Optional Cc Row with Chips */}
      {showCc && (
        <div
          onClick={() => ccInputRef.current?.focus()}
          className="flex items-start px-4 py-1.5 border-b border-gray-100 text-sm cursor-text min-h-[38px] animate-in fade-in duration-100"
        >
          <span className="text-gray-500 w-10 pt-1 font-normal select-none shrink-0">Cc</span>
          <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
            {ccRecipients.map((chip) => (
              <div
                key={chip.id}
                className="border border-gray-400/90 rounded-full pl-0.5 pr-2.5 py-0.5 inline-flex items-center gap-1.5 bg-white text-gray-800 text-xs select-none hover:bg-gray-50"
              >
                <div
                  className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: chip.avatarColor }}
                >
                  {chip.avatarLetter}
                </div>
                <span className="font-medium text-gray-900 truncate max-w-[200px]" title={chip.email}>
                  {chip.name && chip.name !== chip.email ? `${chip.name} <${chip.email}>` : chip.email}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCcRecipients((prev) => prev.filter((r) => r.id !== chip.id));
                  }}
                  className="text-gray-400 hover:text-gray-800 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <input
              ref={ccInputRef}
              type="text"
              value={ccInputValue}
              onChange={(e) => setCcInputValue(e.target.value)}
              onKeyDown={(e) =>
                handleRecipientKeyDown(
                  e,
                  ccInputValue,
                  ccRecipients,
                  setCcRecipients,
                  setCcInputValue
                )
              }
              onPaste={(e) => {
                e.preventDefault();
                const pasted = e.clipboardData.getData('text');
                addRecipientsFromText(pasted, setCcRecipients, setCcInputValue);
              }}
              onBlur={() => {
                if (ccInputValue.trim()) {
                  addRecipientsFromText(ccInputValue, setCcRecipients, setCcInputValue);
                }
              }}
              className="flex-1 min-w-[100px] bg-transparent border-0 text-sm text-gray-900 focus:outline-none py-0.5"
            />
          </div>
          <button
            onClick={() => setShowCc(false)}
            className="text-gray-400 hover:text-gray-600 pt-1 shrink-0 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Optional Bcc Row with Chips */}
      {showBcc && (
        <div
          onClick={() => bccInputRef.current?.focus()}
          className="flex items-start px-4 py-1.5 border-b border-gray-100 text-sm cursor-text min-h-[38px] animate-in fade-in duration-100"
        >
          <span className="text-gray-500 w-10 pt-1 font-normal select-none shrink-0">Bcc</span>
          <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
            {bccRecipients.map((chip) => (
              <div
                key={chip.id}
                className="border border-gray-400/90 rounded-full pl-0.5 pr-2.5 py-0.5 inline-flex items-center gap-1.5 bg-white text-gray-800 text-xs select-none hover:bg-gray-50"
              >
                <div
                  className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: chip.avatarColor }}
                >
                  {chip.avatarLetter}
                </div>
                <span className="font-medium text-gray-900 truncate max-w-[200px]" title={chip.email}>
                  {chip.name && chip.name !== chip.email ? `${chip.name} <${chip.email}>` : chip.email}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBccRecipients((prev) => prev.filter((r) => r.id !== chip.id));
                  }}
                  className="text-gray-400 hover:text-gray-800 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <input
              ref={bccInputRef}
              type="text"
              value={bccInputValue}
              onChange={(e) => setBccInputValue(e.target.value)}
              onKeyDown={(e) =>
                handleRecipientKeyDown(
                  e,
                  bccInputValue,
                  bccRecipients,
                  setBccRecipients,
                  setBccInputValue
                )
              }
              onPaste={(e) => {
                e.preventDefault();
                const pasted = e.clipboardData.getData('text');
                addRecipientsFromText(pasted, setBccRecipients, setBccInputValue);
              }}
              onBlur={() => {
                if (bccInputValue.trim()) {
                  addRecipientsFromText(bccInputValue, setBccRecipients, setBccInputValue);
                }
              }}
              className="flex-1 min-w-[100px] bg-transparent border-0 text-sm text-gray-900 focus:outline-none py-0.5"
            />
          </div>
          <button
            onClick={() => setShowBcc(false)}
            className="text-gray-400 hover:text-gray-600 pt-1 shrink-0 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Subject Row (Matches screenshot: border-b with "jd" / placeholder) */}
      <div className="flex items-center px-4 py-2 border-b border-gray-100 text-sm">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="w-full bg-transparent border-0 text-sm font-normal text-gray-900 placeholder-gray-400 focus:outline-none select-text cursor-text"
          style={{ userSelect: 'text' }}
        />
      </div>

      {/* Email Body - Real Rich Text Editor (contentEditable) */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto relative min-h-[140px]">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => {
            if (editorRef.current) {
              bodyHtmlRef.current = editorRef.current.innerHTML;
            }
          }}
          onKeyUp={checkActiveFormats}
          onMouseUp={checkActiveFormats}
          className="flex-1 outline-none text-sm text-gray-900 leading-relaxed font-sans min-h-[140px] select-text cursor-text empty:before:content-['Type_your_message_here...'] empty:before:text-gray-400 empty:before:pointer-events-none"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text' }}
        />

        {/* Attached Files Chips */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 mt-2">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200/70 border border-gray-200 px-2.5 py-1 rounded-full text-xs text-gray-700"
              >
                <Paperclip className="w-3 h-3 text-gray-500" />
                <span className="max-w-[140px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="hover:text-[#0b57d0] ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POP-UP / FLOATING FORMATTING TOOLBAR (Appears above the bottom bar when Aa is clicked!) */}
      {showFormattingBar && (
        <div className="px-4 pb-2 animate-in fade-in slide-in-from-bottom-2 duration-100">
          <div className="bg-[#edf2fa] border border-[#d3e3fd]/70 rounded-2xl px-2 py-1 flex items-center gap-1 shadow-sm text-gray-700 text-xs">
            {/* Undo & Redo */}
            <button
              type="button"
              onClick={() => execCmd('undo')}
              className="p-1.5 rounded-lg hover:bg-gray-200/70 text-gray-600 transition"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('redo')}
              className="p-1.5 rounded-lg hover:bg-gray-200/70 text-gray-600 transition"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-gray-300 mx-0.5" />

            {/* Font Family Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFontMenu(!showFontMenu)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-200/70 text-xs font-medium text-gray-800 transition"
              >
                <span>{currentFont}</span>
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </button>
              {showFontMenu && (
                <div className="absolute bottom-full mb-1 left-0 w-36 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50 text-xs">
                  {[
                    'Sans Serif',
                    'Serif',
                    'Fixed Width',
                    'Wide',
                    'Garamond',
                    'Georgia',
                    'Tahoma',
                    'Verdana',
                  ].map((font) => (
                    <button
                      key={font}
                      type="button"
                      onClick={() => selectFont(font)}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-gray-800 hover:text-blue-600 flex items-center justify-between"
                    >
                      <span style={{ fontFamily: font }}>{font}</span>
                      {currentFont === font && <Check className="w-3 h-3 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Font Size Dropdown (TT ▾) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSizeMenu(!showSizeMenu)}
                className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg hover:bg-gray-200/70 text-xs font-bold text-gray-800 transition"
                title="Font size"
              >
                <span className="tracking-tighter">TT</span>
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </button>
              {showSizeMenu && (
                <div className="absolute bottom-full mb-1 left-0 w-28 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50 text-xs">
                  {[
                    { label: 'Small', cmd: '1' },
                    { label: 'Normal', cmd: '3' },
                    { label: 'Large', cmd: '5' },
                    { label: 'Huge', cmd: '7' },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => selectSize(s.label, s.cmd)}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-gray-800 hover:text-blue-600 flex items-center justify-between"
                    >
                      <span>{s.label}</span>
                      {currentSize === s.label && <Check className="w-3 h-3 text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bold Button (B) - Changes color when active! */}
            <button
              type="button"
              onClick={() => execCmd('bold')}
              className={`px-2 py-1 rounded-lg font-bold transition-all ${
                isBold
                  ? 'bg-[#d3e3fd] text-[#041e49] shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200/70'
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* Italic Button (I) - Changes color when active! */}
            <button
              type="button"
              onClick={() => execCmd('italic')}
              className={`px-2 py-1 rounded-lg font-serif italic transition-all ${
                isItalic
                  ? 'bg-[#d3e3fd] text-[#041e49] shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200/70'
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            {/* Underline Button (U) - Changes color when active! */}
            <button
              type="button"
              onClick={() => execCmd('underline')}
              className={`px-2 py-1 rounded-lg transition-all ${
                isUnderline
                  ? 'bg-[#d3e3fd] text-[#041e49] shadow-sm'
                  : 'text-gray-700 hover:bg-gray-200/70'
              }`}
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>

            {/* Color & Highlight Dropdown (A ▾) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorMenu(!showColorMenu)}
                className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg hover:bg-gray-200/70 text-xs font-semibold text-gray-800 transition"
                title="Text color & highlight"
              >
                <span className="underline decoration-black decoration-2">A</span>
                <ChevronDown className="w-2.5 h-2.5 text-gray-500" />
              </button>
              {showColorMenu && (
                <div className="absolute bottom-full mb-1 left-0 w-44 bg-white border border-gray-200 rounded-xl shadow-xl p-2.5 z-50 text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Text Color
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      '#000000',
                      '#5f6368',
                      '#1a73e8',
                      '#d93025',
                      '#188038',
                      '#f29900',
                      '#a142f4',
                    ].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => selectColor('foreColor', col)}
                        style={{ backgroundColor: col }}
                        className="w-5 h-5 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                      />
                    ))}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Highlight
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'None', val: 'transparent' },
                      { name: 'Yellow', val: '#fef08a' },
                      { name: 'Green', val: '#86efac' },
                      { name: 'Cyan', val: '#bae6fd' },
                      { name: 'Pink', val: '#fbcfe8' },
                    ].map((bg) => (
                      <button
                        key={bg.name}
                        type="button"
                        onClick={() => selectColor('hiliteColor', bg.val)}
                        style={{ backgroundColor: bg.val === 'transparent' ? '#ffffff' : bg.val }}
                        className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform text-[9px] flex items-center justify-center font-bold text-gray-500"
                        title={bg.name}
                      >
                        {bg.val === 'transparent' && '✕'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Align & Lists Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAlignMenu(!showAlignMenu)}
                className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg hover:bg-gray-200/70 text-gray-700 transition"
                title="Alignment & lists"
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <ChevronDown className="w-2.5 h-2.5 text-gray-500" />
              </button>
              {showAlignMenu && (
                <div className="absolute bottom-full mb-1 left-0 w-36 bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-50 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      execCmd('justifyLeft');
                      setShowAlignMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <AlignLeft className="w-3.5 h-3.5" /> Align Left
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      execCmd('justifyCenter');
                      setShowAlignMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <AlignCenter className="w-3.5 h-3.5" /> Center
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      execCmd('justifyRight');
                      setShowAlignMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <AlignRight className="w-3.5 h-3.5" /> Align Right
                  </button>
                  <div className="h-px bg-gray-100 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      execCmd('insertUnorderedList');
                      setShowAlignMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <List className="w-3.5 h-3.5" /> Bulleted List
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      execCmd('insertOrderedList');
                      setShowAlignMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <ListOrdered className="w-3.5 h-3.5" /> Numbered List
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM ACTION TOOLBAR (Matches screenshot with Send Split Button, AI compose, Aa, Paperclip, etc.) */}
      <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-white relative">
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Send Split Button in Deep Primary Blue (Image 6) */}
          <div className="relative inline-flex items-stretch rounded-full bg-[#0b57d0] hover:bg-[#0842a0] text-white shadow-sm transition">
            <button
              type="button"
              onClick={handleSendOrSchedule}
              disabled={isSubmitting}
              className="pl-5 pr-3 py-1.5 text-xs sm:text-sm font-semibold tracking-wide disabled:opacity-50 select-none flex items-center gap-1.5"
            >
              {isSubmitting ? 'Sending...' : scheduledAt ? 'Schedule' : 'Send'}
            </button>
            <div className="w-px bg-white/30 my-1.5" />
            <button
              type="button"
              onClick={() => setShowSendLater(!showSendLater)}
              className="pl-2 pr-3 py-1.5 hover:bg-white/10 rounded-r-full flex items-center transition"
              title="Schedule send options"
            >
              <ChevronDown className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            </button>

            {/* Schedule Send Popover (Send Later + Delays + Hourly Limit) */}
            {showSendLater && (
              <div
                ref={sendLaterRef}
                className="absolute left-0 bottom-full mb-2 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl z-50 text-gray-800 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
                  <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#0b57d0]" /> Schedule Send
                  </div>
                  {scheduledAt && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="space-y-1 mb-3">
                  <button
                    type="button"
                    onClick={() => applyPreset('tomorrow_morning')}
                    className="w-full text-left py-1.5 px-2 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  >
                    Tomorrow morning, 9:00 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('tomorrow_afternoon')}
                    className="w-full text-left py-1.5 px-2 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  >
                    Tomorrow afternoon, 1:00 PM
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('monday_morning')}
                    className="w-full text-left py-1.5 px-2 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  >
                    Monday morning, 8:00 AM
                  </button>
                </div>

                {/* Custom Date & Time Picker */}
                <div className="mb-3 pt-2 border-t border-gray-100">
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                    Select custom date & time
                  </label>
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50/50">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full text-xs text-gray-800 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Throttling: Delay & Hourly Limit */}
                <div className="grid grid-cols-2 gap-2 mb-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 block">
                      Delay between emails
                    </label>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        min={0}
                        value={delaySec}
                        onChange={(e) => setDelaySec(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-16 px-2 py-1 text-xs font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[11px] text-gray-500">sec</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 block">
                      Hourly rate cap
                    </label>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        min={1}
                        value={hourlyLimit}
                        onChange={(e) =>
                          setHourlyLimit(Math.max(1, parseInt(e.target.value, 10) || 1))
                        }
                        className="w-16 px-2 py-1 text-xs font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[11px] text-gray-500">/hr</span>
                    </div>
                  </div>
                </div>

                {/* Popover Action Buttons */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduledAt('');
                      setShowSendLater(false);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSendLater(false)}
                    className="px-4 py-1.5 rounded-full bg-[#0b57d0] hover:bg-[#0842a0] text-white text-xs font-semibold transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Aa Toggle Button (Changes color when active, opens floating formatting bar above!) */}
          <button
            type="button"
            onClick={() => setShowFormattingBar(!showFormattingBar)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              showFormattingBar
                ? 'bg-[#d3e3fd] text-[#0b57d0] shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Formatting options"
          >
            Aa
          </button>

          {/* Paperclip File Upload (Located right here next to Aa, NOT top right!) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition relative"
            title="Attach files or CSV leads list"
          >
            <Paperclip className="w-4 h-4" />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.txt,.pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
          </button>

          {/* Link Button */}
          <button
            type="button"
            onClick={handleInsertLink}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition"
            title="Insert link (Ctrl+K)"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          {/* Three dots (More Options) with blue dot */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition relative"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full absolute top-1.5 right-1.5" />
            </button>

            {showMoreMenu && (
              <div className="absolute left-0 bottom-full mb-2 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl z-50 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-gray-50 rounded-lg flex items-center gap-2 text-gray-700"
                >
                  <Upload className="w-3.5 h-3.5 text-gray-500" /> Upload CSV Leads
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSendLater(true);
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-gray-50 rounded-lg flex items-center gap-2 text-gray-700"
                >
                  <Clock className="w-3.5 h-3.5 text-gray-500" /> Throttling & Delay
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Far Right: Discard Draft Trash Button */}
        <div>
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-gray-500 hover:text-[#0b57d0] hover:bg-blue-50 transition"
            title="Discard draft"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
