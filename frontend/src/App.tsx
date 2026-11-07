import { useEffect, useState, useRef } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/layout/Sidebar';
import { TopSearchBar } from './components/layout/TopSearchBar';
import { EmailListView } from './components/layout/EmailListView';
import { EmailDetailView } from './components/layout/EmailDetailView';
import { ComposeView } from './components/layout/ComposeView';
import { QueueTelemetryView } from './components/dashboard/QueueTelemetryView';
import { SendersModal } from './components/SendersModal';
import { SlackModal } from './components/SlackModal';
import { authApi, emailApi, senderApi, slackApi } from './services/api';
import {
  EmailStats,
  ScheduledEmailJob,
  SenderAccount,
  SentEmailJob,
  SlackStatus,
  User,
} from './types';

const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '725831271102-r882e5ps9o722796a745qd8is771snjk.apps.googleusercontent.com';

export function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active view & navigation
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'telemetry'>('scheduled');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<{
    email: ScheduledEmailJob | SentEmailJob;
    type: 'scheduled' | 'sent';
  } | null>(null);

  // Modals
  const [isSendersModalOpen, setIsSendersModalOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  // Data states
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledEmailJob[]>([]);
  const [sentJobs, setSentJobs] = useState<SentEmailJob[]>([]);

  // Backend connectivity status
  const [backendOnline, setBackendOnline] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchSource, setSearchSource] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const [sortMode, setSortMode] = useState<'relevant' | 'recent'>('relevant');
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const searchTimerRef = useRef<any>(null);

  // Check existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('reachinbox_token');
    const cachedUser = localStorage.getItem('reachinbox_user');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    authApi
      .getMe()
      .then((data) => {
        setUser(data.user);
        localStorage.setItem('reachinbox_user', JSON.stringify(data.user));
        setBackendOnline(true);
      })
      .catch(() => {
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch {
            localStorage.removeItem('reachinbox_token');
            localStorage.removeItem('reachinbox_user');
            setUser(null);
          }
        } else {
          localStorage.removeItem('reachinbox_token');
          setUser(null);
        }
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  // Fetch all real dashboard data from backend API
  const loadDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    setIsRefreshing(true);

    try {
      const [statsRes, sendersRes, scheduledRes, sentRes, slackRes] =
        await Promise.all([
          emailApi.getStats().catch(() => {
            setBackendOnline(false);
            return { total: 0, scheduled: 0, sent: 0, failed: 0, rescheduled: 0 };
          }),
          senderApi.list().catch(() => ({ senders: [] })),
          emailApi.getScheduled(1, 100).catch(() => {
            setBackendOnline(false);
            return { jobs: [], total: 0 };
          }),
          emailApi.getSent(1, 100).catch(() => {
            setBackendOnline(false);
            return { jobs: [], total: 0 };
          }),
          slackApi.getStatus().catch(() => ({ connected: false })),
        ]);

      setBackendOnline(true);
      setStats(statsRes);
      setSenders(sendersRes.senders || []);
      setScheduledJobs(scheduledRes.jobs || []);
      setSentJobs(sentRes.jobs || []);
      setSlackStatus(slackRes || { connected: false });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setBackendOnline(false);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Real-time polling every 8 seconds when user is authenticated
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [user]);

  // Debounced search querying Elasticsearch v8 backend for top 5 live suggestions
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchSuggestions([]);
      setIsSearching(false);
      return;
    }

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const searchRes = await emailApi.search(searchQuery.trim(), { page: 1, limit: 5 });
        setSearchSuggestions(searchRes.results.slice(0, 5));
        setSearchSource(searchRes.source || 'DATABASE_FALLBACK');
      } catch {
        const q = searchQuery.toLowerCase();
        const localMatches = [...scheduledJobs, ...sentJobs].filter(
          (j) =>
            j.recipientEmail.toLowerCase().includes(q) ||
            j.subject.toLowerCase().includes(q) ||
            (j.body && j.body.toLowerCase().includes(q))
        );
        setSearchSuggestions(localMatches.slice(0, 5));
        setSearchSource('DATABASE_FALLBACK');
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, scheduledJobs, sentJobs]);

  const handleSearchSubmit = async (query: string, page = 1) => {
    const q = query.trim();
    if (!q) {
      setActiveSearchQuery('');
      setSearchResults([]);
      return;
    }
    setActiveSearchQuery(q);
    setSearchPage(page);
    setIsSearching(true);
    try {
      const searchRes = await emailApi.search(q, { page, limit: 50 });
      setSearchResults(searchRes.results);
      setSearchTotal(searchRes.total);
      setSearchSource(searchRes.source || 'DATABASE_FALLBACK');
    } catch {
      const qLower = q.toLowerCase();
      const localMatches = [...scheduledJobs, ...sentJobs].filter(
        (j) =>
          j.recipientEmail.toLowerCase().includes(qLower) ||
          j.subject.toLowerCase().includes(qLower) ||
          (j.body && j.body.toLowerCase().includes(qLower))
      );
      setSearchResults(localMatches);
      setSearchTotal(localMatches.length);
      setSearchSource('DATABASE_FALLBACK');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearchQuery('');
    setSearchResults([]);
    setSearchSuggestions([]);
    setSearchSource(null);
  };

  const handleSelectSuggestion = (item: any) => {
    setSelectedEmail({ email: item, type: item.status === 'SENT' ? 'sent' : 'scheduled' });
  };

  const handleLogout = () => {
    localStorage.removeItem('reachinbox_token');
    localStorage.removeItem('reachinbox_user');
    setUser(null);
    setSelectedEmail(null);
    setIsComposeOpen(false);
  };

  const handleCancelScheduled = async (id: string) => {
    try {
      await emailApi.cancel(id);
      setScheduledJobs((prev) => prev.filter((j) => j.id !== id));
      if (selectedEmail?.email.id === id) {
        setSelectedEmail(null);
      }
      loadDashboardData(true);
    } catch (err: any) {
      setScheduledJobs((prev) => prev.filter((j) => j.id !== id));
    }
  };

  const handleDeleteSelected = async (ids: string[]) => {
    try {
      await emailApi.batchDelete(ids);
      setScheduledJobs((prev) => prev.filter((j) => !ids.includes(j.id)));
      setSentJobs((prev) => prev.filter((j) => !ids.includes(j.id)));
      if (selectedEmail && ids.includes(selectedEmail.email.id)) {
        setSelectedEmail(null);
      }
      loadDashboardData(true);
    } catch (err: any) {
      console.error('Batch delete error:', err);
      setScheduledJobs((prev) => prev.filter((j) => !ids.includes(j.id)));
      setSentJobs((prev) => prev.filter((j) => !ids.includes(j.id)));
      if (selectedEmail && ids.includes(selectedEmail.email.id)) {
        setSelectedEmail(null);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#0b57d0] border-t-transparent animate-spin" />
          <span className="text-xs font-medium text-gray-400">Loading ReachInbox...</span>
        </div>
      </div>
    );
  }

  // If user is not logged in: Show authentic Login Screen
  if (!user) {
    return (
      <LoginScreen
        onLoginSuccess={(loggedUser) => {
          setUser(loggedUser);
        }}
      />
    );
  }

  const scheduledCount = stats?.scheduled ?? scheduledJobs.length;
  const sentCount = stats?.sent ?? sentJobs.length;

  return (
    <div className="min-h-screen bg-white flex text-gray-900 font-sans antialiased overflow-x-hidden">
      {/* Left Sidebar */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedEmail(null);
          setIsComposeOpen(false);
          handleClearSearch();
        }}
        onOpenCompose={() => {
          setIsComposeOpen(true);
          setSelectedEmail(null);
        }}
        onOpenSenders={() => setIsSendersModalOpen(true)}
        onOpenSlack={() => setIsSlackModalOpen(true)}
        slackStatus={slackStatus}
        onLogout={handleLogout}
        scheduledCount={scheduledCount}
        sentCount={sentCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white min-h-screen">
        {/* Connection Warning Banner if Backend Offline */}
        {!backendOnline && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Backend Service Offline:</strong> Could not connect to API on port 5000. Ensure <code>npm run dev</code> is running.
              </span>
            </div>
            <button
              onClick={() => loadDashboardData()}
              className="flex items-center gap-1 font-semibold text-amber-900 hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {/* Main View Area */}
        {selectedEmail ? (
          /* Scenario 2: Email Detail Screen */
          <EmailDetailView
            email={selectedEmail.email}
            type={selectedEmail.type}
            currentUser={user}
            onBack={() => setSelectedEmail(null)}
            onDelete={(id) => {
              handleCancelScheduled(id);
              setSelectedEmail(null);
            }}
          />
        ) : activeTab === 'telemetry' ? (
          /* Scenario 3: Live BullMQ Queue Telemetry */
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
            <QueueTelemetryView
              stats={stats}
              scheduledJobs={scheduledJobs}
              sentJobs={sentJobs}
              loading={loading}
              onRefresh={() => loadDashboardData(true)}
              onCancelJob={handleCancelScheduled}
            />
          </div>
        ) : (
          /* Scenario 4: Email Inbox List */
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            <TopSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={(q) => handleSearchSubmit(q, 1)}
              onSelectSuggestion={handleSelectSuggestion}
              suggestions={searchSuggestions}
              onClear={handleClearSearch}
              onRefresh={() => {
                if (activeSearchQuery) {
                  handleSearchSubmit(activeSearchQuery, searchPage);
                } else {
                  loadDashboardData(true);
                }
              }}
              isRefreshing={isRefreshing}
              searchSource={searchSource}
              isSearching={isSearching}
            />

            <EmailListView
              type={activeSearchQuery ? 'search' : activeTab}
              scheduledJobs={scheduledJobs}
              sentJobs={sentJobs}
              searchResults={searchResults}
              highlightQuery={activeSearchQuery}
              currentPage={activeSearchQuery ? searchPage : 1}
              totalCount={
                activeSearchQuery
                  ? searchTotal
                  : activeTab === 'scheduled'
                  ? scheduledJobs.length
                  : sentJobs.length
              }
              pageSize={50}
              onPageChange={(p) => {
                if (activeSearchQuery) {
                  handleSearchSubmit(activeSearchQuery, p);
                }
              }}
              sortMode={sortMode}
              onSortModeChange={setSortMode}
              onSelectEmail={(email, type) => {
                const resolvedType: 'scheduled' | 'sent' =
                  type === 'search'
                    ? email.status === 'SENT'
                      ? 'sent'
                      : 'scheduled'
                    : type;
                setSelectedEmail({ email, type: resolvedType });
              }}
              onCancelScheduled={handleCancelScheduled}
              onDeleteSelected={handleDeleteSelected}
              onRefresh={() => {
                if (activeSearchQuery) {
                  handleSearchSubmit(activeSearchQuery, searchPage);
                } else {
                  loadDashboardData(true);
                }
              }}
              isLoading={loading || isSearching}
            />
          </div>
        )}

        {/* Floating Gmail-Style Compose Window */}
        {isComposeOpen && (
          <ComposeView
            senders={senders}
            currentUser={user}
            onBack={() => setIsComposeOpen(false)}
            onSuccess={() => {
              setIsComposeOpen(false);
              loadDashboardData(true);
            }}
          />
        )}
      </main>

      {/* Senders SMTP Management Modal */}
      <SendersModal
        isOpen={isSendersModalOpen}
        onClose={() => setIsSendersModalOpen(false)}
        senders={senders}
        onSenderCreated={() => loadDashboardData(true)}
      />

      {/* Slack Live Alerting Integration Modal */}
      <SlackModal
        isOpen={isSlackModalOpen}
        onClose={() => setIsSlackModalOpen(false)}
        status={slackStatus}
        onStatusUpdated={() => loadDashboardData(true)}
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
