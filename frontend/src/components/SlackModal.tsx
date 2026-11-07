import React, { useState } from 'react';
import {
  Bell,
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
    } catch (err: any) {
      alert(`Failed to disconnect: ${err.message}`);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#4a154b] p-2.5 text-white shadow-xs">
              <Hash className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span>Slack Alert Integration</span>
                <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded-full border border-purple-200">
                  OAuth 2.0
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time Slack webhooks when hourly dispatch caps are breached
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            title="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          {/* Status Box */}
          <div className="rounded-2xl border border-gray-100 bg-[#f8fafc] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Connection Status
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  status?.connected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    status?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                  }`}
                />
                {status?.connected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            {status?.connected && (
              <div className="mt-3 pt-3 border-t border-gray-200/80 flex items-center justify-between text-xs">
                <span className="text-gray-500">Target Notification Channel:</span>
                <span className="text-gray-900 font-bold bg-white px-2.5 py-0.5 rounded-lg border border-gray-200">
                  #{status.channelName || 'alerts'}
                </span>
              </div>
            )}
          </div>

          {/* Test Alert Banner / Output */}
          {testResult && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-[#041e49] animate-in fade-in duration-100">
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-[#0b57d0] shrink-0" />
                <span className="font-medium">{testResult}</span>
              </div>
            </div>
          )}

          {/* How It Works Card */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-900">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">Automated Rate Limit Protection</p>
                <p className="mt-1 text-amber-800 leading-relaxed text-[11px]">
                  When any SMTP sender account reaches its hourly dispatch threshold (e.g. 50 emails/hour),
                  BullMQ automatically reschedules pending jobs to the next hour window and sends an instant
                  alert card to your designated Slack channel.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2">
            {!status?.connected ? (
              <button
                onClick={handleConnect}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0b57d0] py-3 text-sm font-semibold text-white transition hover:bg-[#0842a0] shadow-sm active:scale-98 cursor-pointer"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Connect Slack Workspace</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleTestAlert}
                  disabled={testing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0b57d0] py-2.5 text-xs font-semibold text-white hover:bg-[#0842a0] transition shadow-xs disabled:opacity-50 active:scale-98 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{testing ? 'Dispatching...' : 'Dispatch Test Alert'}</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-50 active:scale-98 cursor-pointer"
                >
                  <Link2Off className="h-3.5 w-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
