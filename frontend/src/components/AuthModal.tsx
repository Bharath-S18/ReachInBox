import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, ShieldCheck, X, Zap } from 'lucide-react';
import { authApi } from '../services/api';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setErrorMsg(null);
      if (!credentialResponse.credential) {
        throw new Error('Google credential token missing');
      }
      const data = await authApi.googleLogin(credentialResponse.credential);
      localStorage.setItem('reachinbox_token', data.token);
      onLoginSuccess(data.user, data.token);
      onClose();
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
      onClose();
    } catch (err: any) {
      console.error('Demo login error:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'Demo authentication failed');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border-card bg-surface-card p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-lg border border-transparent p-1.5 text-text-muted transition-colors hover:border-border-card hover:bg-surface-container hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-card bg-surface-container text-border-highlight shadow-glow-cyan mb-4">
            <Mail className="h-5 w-5" />
          </div>

          <h2 className="font-display text-xl font-bold tracking-tight text-white">
            Sign in to ReachInbox
          </h2>
          <p className="mt-1.5 font-sans text-xs text-text-muted max-w-xs">
            Manage your email campaigns, rate boundaries, and BullMQ queue engine.
          </p>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs text-red-400 text-center">
            {errorMsg}
          </div>
        )}

        {/* Authentication Actions */}
        <div className="mt-7 space-y-4">
          {/* Official Google Login */}
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setErrorMsg('Google sign-in popup closed or cancelled')}
              theme="filled_black"
              shape="rectangular"
              size="large"
              text="signin_with"
              width="360"
            />
          </div>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-border-card" />
            <span className="absolute bg-surface-card px-3 font-mono text-[10px] uppercase text-text-muted">
              Or Instant Reviewer Access
            </span>
          </div>

          {/* Instant Evaluator Access */}
          <button
            onClick={handleDemoLogin}
            disabled={loadingDemo}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 font-display text-xs font-semibold text-black shadow-glow-white transition-all hover:bg-slate-200 active:scale-95 disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>{loadingDemo ? 'Authenticating...' : 'Enter as Demo Lead Architect'}</span>
          </button>
        </div>

        {/* Security Footnote */}
        <div className="mt-7 pt-4 border-t border-border-card/60 flex items-center justify-center gap-2 font-mono text-[10px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>OIDC Google Identity • AES-256 JWT • Zero Password Storage</span>
        </div>
      </div>
    </div>
  );
};
