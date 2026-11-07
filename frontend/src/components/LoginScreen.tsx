import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { authApi } from '../services/api';
import { User } from '../types';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Authenticate exclusively via Google OAuth 2.0
  // Google automatically handles both Sign-In (existing users) and Sign-Up (new users)
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
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4 select-none font-sans">
      <div className="w-full max-w-[400px] rounded-2xl border border-gray-200 bg-white p-8 sm:p-10 shadow-lg shadow-gray-200/50">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#0b57d0] text-white flex items-center justify-center font-bold text-2xl shadow-xs mb-3 tracking-tight">
            R
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            ReachInbox Mail
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
            Sign in with your Google Account to manage scheduled outreach, multi-sender dispatch, and queue telemetry.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">{errorMsg}</div>
          </div>
        )}

        {/* Exclusive Google OAuth Action */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => triggerGoogleLogin()}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold transition shadow-xs hover:border-gray-400 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
          >
            {/* Authentic Google 4-Color Icon */}
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>
              {loading ? 'Connecting to Google...' : 'Continue with Google'}
            </span>
          </button>
        </div>

        {/* Security & Architecture Trust Badge */}
        <div className="mt-8 pt-5 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] text-gray-500 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>OAuth 2.0 Single Sign-On (SSO) Enforced</span>
        </div>
      </div>
    </div>
  );
};
