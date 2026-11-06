import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { authApi } from '../services/api';
import { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Authenticate via Google OAuth (Handles both Sign In and Sign Up automatically)
  const googleLoginTrigger = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await authApi.googleLogin(tokenResponse.access_token);
        localStorage.setItem('reachinbox_token', data.token);
        localStorage.setItem('reachinbox_user', JSON.stringify(data.user));
        onLoginSuccess(data.user, data.token);
      } catch (err: any) {
        console.error('Google OAuth verification failed:', err);
        setErrorMsg(err.response?.data?.error || err.message || 'Google authentication failed');
      } finally {
        setLoading(false);
      }
    },
    onError: (err: any) => {
      console.warn('Google OAuth prompt dismissed or cancelled:', err);
      if (err?.error && err.error !== 'popup_closed_by_user') {
        setErrorMsg('Google login encountered an issue. Please try again.');
      }
    },
  });

  const handleEmailAuth = async () => {
    if (!emailInput.trim()) {
      setErrorMsg('Please enter an email address');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    const cleanEmail = emailInput.trim().toLowerCase();
    const rawName = nameInput.trim() || cleanEmail.split('@')[0];
    const formattedName = rawName
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    try {
      const data = await authApi.demoLogin(cleanEmail, formattedName);
      if (data && data.user && data.token) {
        localStorage.setItem('reachinbox_token', data.token);
        localStorage.setItem('reachinbox_user', JSON.stringify(data.user));
        onLoginSuccess(data.user, data.token);
        return;
      }
      throw new Error('Authentication failed');
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleEmailAuth();
  };

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] rounded-2xl border border-gray-100 bg-white p-8 sm:p-10 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        {/* Title */}
        <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 text-center tracking-tight mb-8">
          {isSignUp ? 'Create an Account' : 'Login'}
        </h1>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-600 text-center">
            {errorMsg}
          </div>
        )}

        {/* Google OAuth Login Button */}
        <button
          type="button"
          onClick={() => googleLoginTrigger()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-[#e6f4ea] hover:bg-[#d8edd9] text-gray-800 text-sm font-medium transition-colors mb-6 shadow-sm disabled:opacity-60 cursor-pointer"
        >
          {/* Authentic Google G Icon */}
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
            {loading
              ? 'Connecting...'
              : isSignUp
              ? 'Sign up with Google'
              : 'Login with Google'}
          </span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-full border-t border-gray-200" />
          <span className="absolute bg-white px-3 text-xs text-gray-400">
            {isSignUp ? 'or register with email' : 'or sign up through email'}
          </span>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Full Name"
                className="w-full rounded-xl bg-[#f4f6f5] border-0 px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0b57d0] transition"
              />
            </div>
          )}

          <div>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Email ID"
              required
              className="w-full rounded-xl bg-[#f4f6f5] border-0 px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0b57d0] transition"
            />
          </div>

          <div>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl bg-[#f4f6f5] border-0 px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0b57d0] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Authenticating...' : isSignUp ? 'Create Account' : 'Login'}
          </button>
        </form>

        {/* Toggle between Sign In and Sign Up */}
        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
              }}
              className="font-semibold text-[#0b57d0] hover:underline cursor-pointer ml-1"
            >
              {isSignUp ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
