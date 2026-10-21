import { useEffect, useRef, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ComposeModal } from './components/ComposeModal';
import { EmailTable } from './components/EmailTable';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { SendersModal } from './components/SendersModal';
import { SlackModal } from './components/SlackModal';
import { StatsCards } from './components/StatsCards';
import { authApi, emailApi, senderApi, slackApi } from './services/api';
import {
  EmailStats,
  ScheduledEmailJob,
  SearchResult,
  SenderAccount,
  SentEmailJob,
  SlackStatus,
  User,
} from './types';

// Google OAuth client ID (supports environment override or fallback demo placeholder)
const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '102938475610-exampleclientid123456789.apps.googleusercontent.com';

export function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [stats, setStats] = useState<EmailStats | null>(null);
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledEmailJob[]>([]);
  const [sentJobs, setSentJobs] = useState<SentEmailJob[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchSource, setSearchSource] = useState<string | null>(null);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const [isSendersModalOpen, setIsSendersModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchDebounceRef = useRef<any>(null);

  // Check existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('reachinbox_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    authApi
      .getMe()
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('reachinbox_token');
        setUser(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  // Fetch dashboard telemetry
  const loadDashboardData = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    setIsRefreshing(true);

    try {
      const [statsRes, sendersRes, slackRes] = await Promise.all([
        emailApi.getStats().catch(() => null),
        senderApi.list().catch(() => ({ senders: [] })),
        slackApi.getStatus().catch(() => ({ connected: false })),
      ]);

      if (statsRes) setStats(statsRes);
      if (sendersRes?.senders) setSenders(sendersRes.senders);
      if (slackRes) setSlackStatus(slackRes);

      if (activeTab === 'scheduled') {
        const schedRes = await emailApi.getScheduled(page, 20);
        setScheduledJobs(schedRes.jobs || []);
        setTotalPages(schedRes.pagination?.totalPages || 1);
      } else {
        const sentRes = await emailApi.getSent(page, 20);
        setSentJobs(sentRes.jobs || []);
        setTotalPages(sentRes.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, activeTab, page]);

  // Periodic polling every 15 seconds to update worker queue progress
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [user, activeTab, page]);

  // Handle Debounced Full-Text Search
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!q.trim()) {
      setSearchResults(null);
      setSearchSource(null);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await emailApi.search(q);
        setSearchResults(res.results || []);
        setSearchSource(res.source || 'dual-engine');
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchSource(null);
  };

  // Keyboard shortcut listener (/ to focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Schedule Submit
  const handleScheduleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      const res = await emailApi.schedule(formData);
      alert(`Successfully scheduled ${res.totalLeads} email(s) into BullMQ queue!`);
      loadDashboardData();
    } catch (err: any) {
      alert(`Scheduling error: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel Job
  const handleCancelJob = async (id: string) => {
    if (!confirm('Cancel this scheduled email dispatch?')) return;
    try {
      await emailApi.cancel(id);
      loadDashboardData();
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('reachinbox_token');
    setUser(null);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-canvas font-mono text-xs text-border-highlight">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-border-highlight animate-ping" />
          <span>INITIALIZING REACHINBOX PRO...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onLoginSuccess={(loggedUser) => {
          setUser(loggedUser);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface-canvas text-on-surface antialiased bg-grid-tech selection:bg-white selection:text-black">
      {/* Ambient Top Light Halo */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-sky-400/10 via-purple-500/5 to-transparent blur-3xl -z-10" />

      {/* Header */}
      <Header
        user={user}
        slackStatus={slackStatus}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenSlackModal={() => setIsSlackModalOpen(true)}
        onOpenSendersModal={() => setIsSendersModalOpen(true)}
        onRefresh={() => loadDashboardData()}
        onLogout={handleLogout}
        isRefreshing={isRefreshing}
      />

      {/* Main Dashboard Canvas */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Workspace Title & Stats Row */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 font-mono text-xs text-border-highlight uppercase tracking-wider">
            <span>Workspace Overview</span>
            <span className="text-text-muted">•</span>
            <span className="text-text-muted">BullMQ Cluster Active</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Email Outreach Operations
            </h2>
            <button
              onClick={() => setIsComposeOpen(true)}
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 font-display text-xs font-semibold text-black shadow-glow-white transition-all hover:bg-slate-200 active:scale-95 sm:self-auto self-start"
            >
              <span>+ New Outreach Campaign</span>
            </button>
          </div>
        </div>

        {/* 4 Vengeance UI Stat Cards */}
        <StatsCards stats={stats} loading={loading} />

        {/* Email Jobs Telemetry Table */}
        <EmailTable
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setPage(1);
          }}
          scheduledJobs={scheduledJobs}
          sentJobs={sentJobs}
          searchResults={searchResults}
          searchQuery={searchQuery}
          onClearSearch={handleClearSearch}
          searchSource={searchSource}
          loading={loading}
          onCancelJob={handleCancelJob}
          page={page}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </main>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        senders={senders}
        onSubmit={handleScheduleSubmit}
        isSubmitting={isSubmitting}
      />

      <SlackModal
        isOpen={isSlackModalOpen}
        onClose={() => setIsSlackModalOpen(false)}
        status={slackStatus}
        onStatusUpdated={() => loadDashboardData(true)}
      />

      <SendersModal
        isOpen={isSendersModalOpen}
        onClose={() => setIsSendersModalOpen(false)}
        senders={senders}
        onSenderCreated={() => loadDashboardData(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}
