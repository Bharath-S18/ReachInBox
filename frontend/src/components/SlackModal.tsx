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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-2.5 text-purple-600">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight">
                Slack Live Alert Integration
              </h3>
              <p className="text-xs text-gray-500">
                OAuth 2.0 Real-time rate limit notifications
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          {/* Status Box */}
          <div className="rounded-xl border border-gray-100 bg-[#f9fafb] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Connection Status
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  status?.connected
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    status?.connected ? 'bg-[#0b57d0] animate-pulse' : 'bg-gray-400'
                  }`}
                />
                {status?.connected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            {status?.connected && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
                <span className="text-gray-500">Target Channel:</span>
                <span className="text-gray-900 font-semibold">#{status.channelName || 'alerts'}</span>
              </div>
            )}
          </div>

          {/* Test Alert Banner / Output */}
          {testResult && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-[#041e49]">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#0b57d0]" />
                <span>{testResult}</span>
              </div>
            </div>
          )}

          {/* Explanation Banner */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Automated Threshold Alerting</p>
                <p className="mt-1 text-amber-800 leading-relaxed text-[11px]">
                  When any sender account reaches its hourly dispatch threshold, the BullMQ worker
                  immediately reschedules the job and dispatches a formatted alert into your Slack channel.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            {!status?.connected ? (
              <button
                onClick={handleConnect}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b57d0] py-2.5 text-sm font-semibold text-white transition hover:bg-[#0842a0] shadow-sm"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Connect Slack Workspace</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestAlert}
                  disabled={testing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#0b57d0] bg-blue-50 py-2.5 text-xs font-semibold text-[#0b57d0] hover:bg-[#d3e3fd] transition disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{testing ? 'Dispatching...' : 'Dispatch Test Alert'}</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-50"
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
