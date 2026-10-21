import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Mail, Plus, Search, Settings2, X } from 'lucide-react';

type EmailStatus = 'Scheduled' | 'Sent' | 'Failed';

type EmailRow = {
  recipient: string;
  subject: string;
  time: string;
  status: EmailStatus;
};

const initialScheduled: EmailRow[] = [
  { recipient: 'alex.johnson@example.com', subject: 'Partnership opportunity', time: 'Today, 4:30 PM', status: 'Scheduled' },
  { recipient: 'sarah.lee@example.com', subject: 'Quick question about your team', time: 'Today, 4:32 PM', status: 'Scheduled' },
  { recipient: 'michael.chen@example.com', subject: 'Following up on our conversation', time: 'Tomorrow, 9:00 AM', status: 'Scheduled' },
];

const initialSent: EmailRow[] = [
  { recipient: 'jordan.williams@example.com', subject: 'Introduction from ReachInbox', time: 'Oct 14, 2026, 11:24 AM', status: 'Sent' },
  { recipient: 'taylor.brown@example.com', subject: 'A better way to manage outreach', time: 'Oct 14, 2026, 10:08 AM', status: 'Sent' },
];

function StatusBadge({ status }: { status: EmailStatus }) {
  const styles = {
    Scheduled: 'bg-blue-50 text-blue-700',
    Sent: 'bg-emerald-50 text-emerald-700',
    Failed: 'bg-red-50 text-red-700',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{status}</span>;
}

function App() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [query, setQuery] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [subject, setSubject] = useState('');
  const [scheduled, setScheduled] = useState(initialScheduled);
  const rows = activeTab === 'scheduled' ? scheduled : initialSent;
  const filteredRows = useMemo(
    () => rows.filter((row) => `${row.recipient} ${row.subject}`.toLowerCase().includes(query.toLowerCase())),
    [query, rows],
  );

  function scheduleEmail() {
    if (!subject.trim()) return;
    setScheduled((current) => [
      ...current,
      { recipient: 'your-first-lead@example.com', subject: subject.trim(), time: 'Today, 5:00 PM', status: 'Scheduled' },
    ]);
    setSubject('');
    setShowCompose(false);
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2 text-white"><Mail size={20} /></div>
            <div><h1 className="text-lg font-bold tracking-tight">ReachInbox</h1><p className="text-xs text-slate-500">Email scheduler</p></div>
          </div>
          <div className="flex items-center gap-4">
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Settings"><Settings2 size={19} /></button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">JD</div>
              <div className="hidden sm:block"><p className="text-sm font-semibold">Jordan Davis</p><p className="text-xs text-slate-500">jordan@example.com</p></div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="mb-2 text-sm font-medium text-indigo-600">Workspace overview</p><h2 className="text-3xl font-bold tracking-tight">Email campaigns</h2><p className="mt-2 text-slate-500">Schedule, manage, and track your outreach in one place.</p></div>
          <button onClick={() => setShowCompose(true)} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><Plus size={18} /> Compose email</button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Stat icon={<CalendarClock size={19} />} label="Scheduled" value={String(scheduled.length)} tone="indigo" />
          <Stat icon={<CheckCircle2 size={19} />} label="Sent this month" value="128" tone="emerald" />
          <Stat icon={<Clock3 size={19} />} label="Next send" value="Today, 4:30 PM" tone="amber" />
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-6">
              {(['scheduled', 'sent'] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`border-b-2 pb-4 text-sm font-semibold capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>{tab} emails</button>)}
            </div>
            <label className="relative mb-3 sm:mb-0"><Search size={16} className="absolute left-3 top-2.5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search emails..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 sm:w-64" /></label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3 font-semibold">Recipient</th><th className="px-6 py-3 font-semibold">Subject</th><th className="px-6 py-3 font-semibold">{activeTab === 'scheduled' ? 'Scheduled for' : 'Sent at'}</th><th className="px-6 py-3 font-semibold">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRows.map((row) => <tr key={`${row.recipient}-${row.subject}`} className="hover:bg-slate-50"><td className="px-6 py-4 font-medium">{row.recipient}</td><td className="px-6 py-4 text-slate-600">{row.subject}</td><td className="px-6 py-4 text-slate-500">{row.time}</td><td className="px-6 py-4"><StatusBadge status={row.status} /></td></tr>)}</tbody></table>
            {!filteredRows.length && <div className="px-6 py-12 text-center text-sm text-slate-500">No emails match your search.</div>}
          </div>
        </section>
      </main>

      {showCompose && <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"><div className="mb-5 flex items-center justify-between"><h3 className="text-lg font-bold">Compose email</h3><button onClick={() => setShowCompose(false)} aria-label="Close compose dialog"><X size={19} /></button></div><label className="mb-4 block text-sm font-medium">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Enter a subject" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-indigo-500" /></label><div className="mb-5 rounded-lg border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Drop your CSV lead file here<br /><span className="text-xs">or choose a file from your computer</span></div><div className="flex justify-end gap-3"><button onClick={() => setShowCompose(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button onClick={scheduleEmail} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Schedule email</button></div></div></div>}
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'indigo' | 'emerald' | 'amber' }) {
  const colors = { indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600' };
  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`mb-4 inline-flex rounded-lg p-2 ${colors[tone]}`}>{icon}</div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>;
}

export default App;
