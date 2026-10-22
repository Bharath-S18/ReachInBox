import React, { useState } from 'react';
import { Mail, Plus, Trash2, X } from 'lucide-react';
import { senderApi } from '../services/api';
import { SenderAccount } from '../types';

interface SendersModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: SenderAccount[];
  onSenderCreated: () => void;
}

export const SendersModal: React.FC<SendersModalProps> = ({
  isOpen,
  onClose,
  senders,
  onSenderCreated,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState('');
  const [host, setHost] = useState('smtp.ethereal.email');
  const [port, setPort] = useState(587);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await senderApi.create({
        email,
        host,
        port: Number(port),
        user,
        pass,
        hourlyLimit: Number(hourlyLimit),
        name: name || undefined,
      });
      setShowAddForm(false);
      setEmail('');
      setUser('');
      setPass('');
      setName('');
      onSenderCreated();
    } catch (err: any) {
      alert(`Failed to add sender: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this sender account?')) return;
    try {
      await senderApi.delete(id);
      onSenderCreated();
    } catch (err: any) {
      alert(`Failed to delete sender: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[#00a854]">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight">
                Outbound SMTP Senders
              </h3>
              <p className="text-xs text-gray-500">
                Manage multi-sender rotating dispatch credentials & hourly limits
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Active Senders List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Configured Transporters ({senders.length})
              </span>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 rounded-full border border-[#00a854] bg-[#e8f5e9] px-3 py-1 text-xs font-semibold text-[#00a854] hover:bg-[#dcedc8] transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add SMTP Account</span>
                </button>
              )}
            </div>

            <div className="grid gap-2.5">
              {senders.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-[#f9fafb] p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-2 w-2 rounded-full bg-[#00a854]" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {s.name || s.email}
                        </span>
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-700">
                          {s.hourlyLimit}/hr
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {s.email} &bull; {s.host}:{s.port}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Remove Sender"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {senders.length === 0 && (
                <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                  No custom sender accounts configured yet. Ethereal demo accounts will provision on-demand.
                </div>
              )}
            </div>
          </div>

          {/* Add Sender Form */}
          {showAddForm && (
            <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-xs font-bold text-gray-900 uppercase">
                  Register SMTP Account
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600">Sender Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Outreach Team"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#00a854]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600">Sender Email</label>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#00a854]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-gray-600">SMTP Host</label>
                  <input
                    type="text"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#00a854]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600">Port</label>
                  <input
                    type="number"
                    required
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#00a854]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-600">SMTP Username</label>
                  <input
                    type="text"
                    required
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#00a854]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-600">SMTP Password</label>
                  <input
                    type="password"
                    required
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#00a854]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600">Hourly Limit (Rate Cap)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#00a854]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#00a854] hover:bg-[#009249] text-white text-xs font-semibold transition shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying & Saving...' : 'Save Transporter'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
