import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { authApi } from '../../services/api';
import { User } from '../../types';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Mail,
  ShieldCheck,
  AlertCircle,
  Hash,
  Menu,
  X,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface LandingPageProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // High-Fidelity Mockup Tab State
  const [activeMockTab, setActiveMockTab] = useState<'scheduled' | 'drafts' | 'sent' | 'telemetry'>('scheduled');

  // Authenticate exclusively via Google OAuth 2.0
  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await authApi.googleLogin(tokenResponse.access_token);
        if (!data || !data.token || !data.user) {
          throw new Error('Google OAuth succeeded but received invalid session from backend');
        }
        localStorage.setItem('reachinbox_token', data.token);
        localStorage.setItem('reachinbox_user', JSON.stringify(data.user));
        onLoginSuccess(data.user, data.token);
      } catch (err: any) {
        console.error('Google OAuth verification failed:', err);
        setErrorMsg(
          err.response?.data?.error ||
          err.message ||
          'Google authentication failed. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    },
    onError: (err: any) => {
      console.warn('Google OAuth prompt dismissed or cancelled:', err);
      if (err?.error && err.error !== 'popup_closed_by_user') {
        setErrorMsg('Google login popup was closed or encountered an error. Please try again.');
      }
    },
  });

  return (
    <div className="relative min-h-screen w-full bg-white text-gray-900 font-sans selection:bg-[#c2e7ff] selection:text-[#041e49] overflow-x-hidden">
      {/* Ambient Gradient Glow Background Orbs (Linear/Stripe style) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-32 left-1/4 w-[480px] h-[480px] rounded-full bg-blue-400/15 blur-[120px] animate-pulse-glow" />
        <div className="absolute -top-20 right-1/4 w-[420px] h-[420px] rounded-full bg-indigo-400/12 blur-[100px] animate-pulse-glow" />
        <div className="absolute top-48 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-[#0b57d0]/10 blur-[140px]" />
      </div>

      {/* 1. Glassmorphic Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#0b57d0] text-white flex items-center justify-center font-bold text-base shadow-xs tracking-tight">
              R
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tracking-tight text-gray-900">ReachInbox</span>
              <span className="text-[11px] font-semibold text-[#0b57d0] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Mail
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-gray-600">
            <a href="#preview" className="hover:text-gray-900 transition">Product Preview</a>
            <a href="#features" className="hover:text-gray-900 transition">Features</a>
            <a href="#architecture" className="hover:text-gray-900 transition">BullMQ Queue</a>
            <a href="#senders" className="hover:text-gray-900 transition">Multi-Sender</a>
            <a href="#telemetry" className="hover:text-gray-900 transition">Telemetry</a>
          </nav>

          {/* Desktop Action & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => triggerGoogleLogin()}
              disabled={loading}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-semibold transition shadow-xs hover:border-gray-400 cursor-pointer active:scale-98 disabled:opacity-60"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>{loading ? 'Connecting...' : 'Sign In with Google'}</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 border-b border-gray-200 px-5 pt-3 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-150">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-gray-700">
              <a
                href="#preview"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                Product Preview
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                Features
              </a>
              <a
                href="#architecture"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                BullMQ Queue Engine
              </a>
              <a
                href="#senders"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                Multi-Sender SMTP Rotation
              </a>
              <a
                href="#telemetry"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                Queue Telemetry
              </a>
            </nav>

            <div className="pt-2">
              <button
                onClick={() => triggerGoogleLogin()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#ffffff" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                  <path fill="#ffffff" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                  <path fill="#ffffff" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z" />
                  <path fill="#ffffff" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                </svg>
                <span>{loading ? 'Connecting...' : 'Sign In with Google'}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Error Alert Banner */}
      {errorMsg && (
        <div className="bg-red-50 border-b border-red-200 py-3 px-4 text-center text-xs font-medium text-red-700 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Hero Section */}
      <section className="pt-16 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Floating Announcement Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/80 border border-blue-200 text-[#0b57d0] text-xs font-semibold mb-6 shadow-2xs hover:bg-blue-100/70 transition cursor-default">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>BullMQ Redis 7 Active Engine</span>
          <span className="text-blue-300">&bull;</span>
          <span className="hidden sm:inline">100% Guaranteed Queue Idempotency</span>
        </div>

        {/* Dynamic Gradient Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
          <span className="bg-gradient-to-r from-gray-950 via-gray-800 to-[#0b57d0] bg-clip-text text-transparent">
            Distributed Cold Outreach & Enterprise Email Scheduling
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Scale outreach campaigns with intelligent hourly rate throttling, automatic multi-sender SMTP rotation, real-time BullMQ queue telemetry, and Slack rate alerts.
        </p>

        {/* Hero CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            onClick={() => triggerGoogleLogin()}
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] text-white text-sm font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-98 disabled:opacity-60 hover:-translate-y-0.5 duration-200"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#ffffff" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
              <path fill="#ffffff" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
              <path fill="#ffffff" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z" />
              <path fill="#ffffff" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
            </svg>
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="#preview"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-semibold transition hover:-translate-y-0.5 duration-200"
          >
            <span>Explore Dashboard Preview</span>
          </a>
        </div>

        {/* 3. Product Showcase Browser Frame */}
        <div id="preview" className="mt-14 max-w-5xl mx-auto rounded-2xl border border-gray-200/90 bg-gray-50/70 p-2 sm:p-4 shadow-xl hover:shadow-2xl transition-all duration-300">
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
            {/* Browser Header Bar */}
            <div className="h-11 border-b border-gray-200 bg-gray-50/90 px-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">reachinbox.mail</span>
                <span className="text-gray-400">&bull;</span>
                <span>BullMQ Cluster (5 Worker Threads)</span>
              </div>
              <div className="text-xs font-semibold text-[#0b57d0]">
                2,000ms Throttling
              </div>
            </div>

            {/* Tab Switcher inside Mockup */}
            <div className="px-4 pt-3 border-b border-gray-100 flex items-center justify-between bg-white overflow-x-auto scrollbar-chatgpt">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setActiveMockTab('scheduled')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
                    activeMockTab === 'scheduled'
                      ? 'border-[#0b57d0] text-[#0b57d0] bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Scheduled (1)</span>
                </button>

                <button
                  onClick={() => setActiveMockTab('drafts')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
                    activeMockTab === 'drafts'
                      ? 'border-[#0b57d0] text-[#0b57d0] bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Drafts (1)</span>
                </button>

                <button
                  onClick={() => setActiveMockTab('sent')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
                    activeMockTab === 'sent'
                      ? 'border-[#0b57d0] text-[#0b57d0] bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sent (2)</span>
                </button>

                <button
                  onClick={() => setActiveMockTab('telemetry')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
                    activeMockTab === 'telemetry'
                      ? 'border-[#0b57d0] text-[#0b57d0] bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Telemetry (Live)</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-400 font-mono pr-2">
                <span>ZSET Idempotency: 100%</span>
              </div>
            </div>

            {/* Dynamic Tab Content with Smooth Transition */}
            <div className="p-4 sm:p-5 text-left min-h-[190px]">
              {/* Tab 1: Scheduled View */}
              {activeMockTab === 'scheduled' && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px]">
                        OB
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          oliver.brown@enterprise.io
                        </div>
                        <div className="text-gray-500 text-[11px]">
                          ReachInbox Enterprise Demo &bull; 2,000ms Throttle Preserved
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">Scheduled: Nov 7, 12:00 PM</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-semibold text-[11px] border border-sky-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-sky-500" />
                        Delayed
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Drafts View */}
              {activeMockTab === 'drafts' && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-[10px]">
                        D
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600 font-bold text-xs">Draft</span>
                          <span className="font-semibold text-gray-900">sarah.connor@acme.org</span>
                        </div>
                        <div className="text-gray-500 text-[11px] truncate max-w-md">
                          Follow up on distributed queuing benchmarks &bull; Auto-saved in database
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-600 font-medium text-[11px]">Auto-saved 1m ago</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium text-[11px] border border-gray-200">
                        Draft
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Sent View */}
              {activeMockTab === 'sent' && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-[#0b57d0] font-bold flex items-center justify-center text-[10px]">
                        BS
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">bharath.s06101968@gmail.com</div>
                        <div className="text-gray-500 text-[11px]">
                          Q4 Cold Outreach Partnership &bull; Ethereal Preview Generated
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">Nov 7, 10:45 AM</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
                        Dispatched
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Queue Telemetry View */}
              {activeMockTab === 'telemetry' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/70">
                      <div className="text-gray-500 text-[11px]">Worker Concurrency</div>
                      <div className="text-lg font-bold text-gray-900 mt-0.5">5 Threads</div>
                    </div>
                    <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/70">
                      <div className="text-gray-500 text-[11px]">ESP Throttling</div>
                      <div className="text-lg font-bold text-[#0b57d0] mt-0.5">2,000 ms</div>
                    </div>
                    <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/70">
                      <div className="text-gray-500 text-[11px]">Redis Cluster</div>
                      <div className="text-lg font-bold text-emerald-700 mt-0.5">Connected</div>
                    </div>
                    <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/70">
                      <div className="text-gray-500 text-[11px]">Hourly Cap</div>
                      <div className="text-lg font-bold text-gray-900 mt-0.5">50 / sender</div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-[#0b57d0] flex items-center justify-between">
                    <span>Bull-Board UI Active on port 5000 &bull; Idempotency 100% Enforced</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Enterprise Architecture & Feature Pillars */}
      <section id="features" className="py-20 bg-gray-50/60 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold text-[#0b57d0] uppercase tracking-wider">
              Architecture & Reliability
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
              Engineered for Cold Outreach Deliverability
            </p>
            <p className="mt-3 text-sm text-gray-600">
              Every outreach email is backed by distributed BullMQ workers, database persistence, and hourly rate preservation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div id="architecture" className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs hover:-translate-y-1 hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#0b57d0] flex items-center justify-center mb-4 shadow-2xs">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                  BullMQ & Redis 7
                </h3>
                <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                  Persistent Redis ZSET delayed queue. Jobs survive process restarts, node crashes, and network blips with strict idempotency keys.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] font-semibold text-[#0b57d0] flex items-center gap-1">
                <span>5-Worker Thread Pool</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>

            {/* Pillar 2 */}
            <div id="senders" className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs hover:-translate-y-1 hover:shadow-xl hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-2xs">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                  Multi-Sender SMTP Rotation
                </h3>
                <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                  Register custom and Ethereal transporters. The scheduler enforces an hourly quota (e.g. 50 emails/hr) and 2,000ms inter-email sleep.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                <span>ESP Throttling Guard</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs hover:-translate-y-1 hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-2xs">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                  Gmail-Style Database Drafts
                </h3>
                <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                  Real-time auto-saving as you type into PostgreSQL. Resuming unsent outreach is instant with dedicated sidebar counts.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <span>Auto-Saving & Click-to-Resume</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>

            {/* Pillar 4 */}
            <div id="telemetry" className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs hover:-translate-y-1 hover:shadow-xl hover:border-purple-300 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-[#4a154b] flex items-center justify-center mb-4 shadow-2xs">
                  <Hash className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                  Queue Telemetry & Slack
                </h3>
                <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                  Real-time Bull-Board monitoring and automatic Slack webhook alerts whenever hourly transporter rate limits are approached.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] font-semibold text-[#4a154b] flex items-center gap-1">
                <span>OAuth & Webhook Alerts</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bottom Call to Action Banner */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="rounded-3xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-8 sm:p-14 shadow-sm hover:shadow-md transition">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Ready to schedule outreach with guaranteed delivery?
          </h2>
          <p className="mt-3 text-sm text-gray-600 max-w-xl mx-auto">
            Sign in with your Google account. Zero passwords, instant database provisioning, and immediate access to your queues.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => triggerGoogleLogin()}
              disabled={loading}
              className="inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] text-white text-sm font-semibold transition shadow-sm hover:shadow cursor-pointer active:scale-98 disabled:opacity-60 hover:-translate-y-0.5 duration-200"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#ffffff" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                <path fill="#ffffff" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#ffffff" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z" />
                <path fill="#ffffff" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>{loading ? 'Connecting...' : 'Sign In with Google to Launch'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="border-t border-gray-100 py-8 px-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>OAuth 2.0 Identity &bull; BullMQ 5 &bull; Redis 7 &bull; PostgreSQL Prisma ORM</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} ReachInbox Scheduler Monorepo. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
