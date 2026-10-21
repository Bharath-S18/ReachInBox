import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  ExternalLink,
  Hash,
  Link2Off,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react';
import { slackApi } from '../services/api';
import { SlackStatus } from '../types';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SlackStatus | null;
  onStatusUpdated: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  status,
  onStatusUpdated,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async () => {
    try {
      const res = await slackApi.getAuthorizeUrl();
      if (res.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err: any) {
      alert(`Failed to initiate Slack OAuth: ${err.message}`);
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await slackApi.sendTestAlert();
      setTestResult(res.message || 'Rate limit alert dispatched to Slack channel successfully.');
      onStatusUpdated();
    } catch (err: any) {
      setTestResult(`Alert failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Slack alerting?')) return;
    setDisconnecting(true);
    try {
      await slackApi.disconnect();
      onStatusUpdated();
      setTestResult('Slack disconnected.');
    } catch (err: any) {
      alert(`Disconnect failed: ${err.message}`);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border-card bg-surface-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-card pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-border-card bg-surface-container p-2 text-border-highlight">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white tracking-tight">
                Slack Live Alert Integration
              </h3>
              <p className="font-mono text-[11px] text-text-muted">
                OAuth 2.0 Real-time rate limit notifications
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

        {/* Content */}
        <div className="mt-6 space-y-5">
          {/* Status Box */}
          <div className="rounded-xl border border-border-card bg-surface-container p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
                Connection Status
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
                  status?.connected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    status?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                {status?.connected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            {status?.connected && (
              <div className="mt-3 pt-3 border-t border-border-card/60 flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Target Channel:</span>
                <span className="text-white font-semibold">#{status.channelName || 'alerts'}</span>
              </div>
            )}
          </div>

          {/* Test Alert Banner / Output */}
          {testResult && (
            <div className="rounded-lg border border-border-highlight/30 bg-sky-950/20 p-3 font-mono text-xs text-border-highlight">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5" />
                <span>{testResult}</span>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="flex items-start gap-3 rounded-lg border border-border-card bg-surface-container/50 p-3.5 font-sans text-xs text-text-muted">
            <ShieldAlert className="h-4 w-4 shrink-0 text-border-highlight mt-0.5" />
            <p>
              When a sender account reaches its hourly limit, ReachInbox posts a formatted Block Kit notification into your Slack channel detailing the sender, the exact threshold count, and the deferred jobs.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2.5">
            {status?.connected ? (
              <>
                <button
                  onClick={handleTestAlert}
                  disabled={testing}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 font-display text-xs font-semibold text-black shadow-glow-white transition-all hover:bg-slate-200 active:scale-95 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{testing ? 'Sending Block Kit...' : 'Send Test Rate Limit Alert'}</span>
                </button>

                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 font-mono text-xs text-red-400 transition-all hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
                >
                  <Link2Off className="h-3.5 w-3.5" />
                  <span>{disconnecting ? 'Disconnecting...' : 'Disconnect Slack'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 font-display text-xs font-semibold text-black shadow-sm transition-all hover:bg-emerald-400 active:scale-95"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Connect Slack Workspace (OAuth)</span>
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
