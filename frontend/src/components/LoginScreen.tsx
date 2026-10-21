import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { CheckCircle2, Mail, Zap } from 'lucide-react';
import { authApi } from '../services/api';
import { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setErrorMsg(null);
      if (!credentialResponse.credential) {
        throw new Error('Google credential token missing');
      }
      const data = await authApi.googleLogin(credentialResponse.credential);
      localStorage.setItem('reachinbox_token', data.token);
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      console.error('Google login error:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'Google authentication failed');
    }
  };

  const handleDemoLogin = async () => {
    setLoadingDemo(true);
    setErrorMsg(null);
    try {
      const data = await authApi.demoLogin();
      localStorage.setItem('reachinbox_token', data.token);
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      console.error('Demo login error:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'Demo authentication failed');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-surface-canvas text-white flex flex-col justify-center items-center px-4 overflow-hidden bg-grid-tech">
      {/* Ambient Radial Halo from Vengeance UI */}
      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-sky-400/10 via-indigo-500/5 to-transparent blur-3xl -z-10" />

      {/* Main Authentication Card */}
      <div className="w-full max-w-md rounded-2xl border border-border-card bg-surface-card p-8 shadow-2xl relative">
        {/* Brand Icon Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-card bg-surface-container text-border-highlight shadow-glow-cyan mb-4">
            <Mail className="h-6 w-6" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border-card bg-surface-container px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-border-highlight mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-border-highlight animate-pulse" />
            <span>High-Performance Outreach Engine</span>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            REACHINBOX PRO
          </h1>
          <p className="mt-2 font-sans text-xs text-text-muted max-w-xs">
            Idempotent delayed email queue with BullMQ, Redis rate limiting, Slack alerting, and multi-sender SMTP.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs text-red-400 text-center">
            {errorMsg}
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-8 space-y-4">
          {/* Google OAuth Button Container */}
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setErrorMsg('Google login popup cancelled or blocked')}
              theme="filled_black"
              shape="rectangular"
              size="large"
              text="continue_with"
              width="360"
            />
          </div>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-border-card" />
            <span className="absolute bg-surface-card px-3 font-mono text-[10px] uppercase text-text-muted">
              Or Instant Reviewer Access
            </span>
          </div>

          {/* 1-Click Demo Login */}
          <button
            onClick={handleDemoLogin}
            disabled={loadingDemo}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 font-display text-xs font-semibold text-black shadow-glow-white transition-all hover:bg-slate-200 active:scale-95 disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{loadingDemo ? 'Authenticating...' : 'Enter as Demo Lead Architect'}</span>
          </button>
        </div>

        {/* Tech Stack Pills Footer */}
        <div className="mt-8 pt-5 border-t border-border-card/60">
          <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-text-muted">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>BullMQ & Redis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>Slack OAuth & Alerts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>Elasticsearch & Postgres</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>Ethereal Multi-SMTP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
