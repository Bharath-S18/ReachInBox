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
        username: user,
        password: pass,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-2.5 text-[#0b57d0]">
              <Mail className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span>Outbound SMTP Transporters</span>
                <span className="text-[10px] bg-blue-50 text-[#0b57d0] font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                  Multi-Sender
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage Ethereal and custom SMTP accounts with dedicated hourly rate caps
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
        <div className="mt-5 space-y-5 max-h-[68vh] overflow-y-auto pr-1">
          {/* Active Senders List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Configured Transporters ({senders.length})
              </span>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 rounded-full border border-[#0b57d0] bg-blue-50 px-3.5 py-1 text-xs font-semibold text-[#0b57d0] hover:bg-[#d3e3fd] transition active:scale-98 shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Add SMTP Account</span>
                </button>
              )}
            </div>

            <div className="grid gap-2.5">
              {senders.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-200/80 bg-[#f8fafc] p-4 transition hover:border-gray-300"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ring-4 ring-emerald-50" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {s.name || s.email}
                        </span>
                        <span className="rounded-full bg-blue-100 text-[#0b57d0] px-2 py-0.5 text-[10px] font-bold">
                          {s.hourlyLimit} emails/hr
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {s.email} &bull; {s.host}:{s.port}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
                    title="Remove Transporter"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {senders.length === 0 && (
                <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  No custom sender accounts configured yet. Ethereal test accounts provision automatically when you schedule an outreach.
                </div>
              )}
            </div>
          </div>

          {/* Add Sender Form */}
          {showAddForm && (
            <form onSubmit={handleCreate} className="rounded-2xl border border-gray-200 bg-[#f8fafc] p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Register New Transporter
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-700">Sender Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Outreach Alpha"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#0b57d0] focus:ring-2 focus:ring-[#0b57d0]/15"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-700">Sender From Email</label>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#0b57d0] focus:ring-2 focus:ring-[#0b57d0]/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-gray-700">SMTP Host</label>
                  <input
                    type="text"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#0b57d0] focus:ring-2 focus:ring-[#0b57d0]/15"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-700">Port</label>
                  <input
                    type="number"
                    required
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#0b57d0] focus:ring-2 focus:ring-[#0b57d0]/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-700">SMTP Username</label>
                  <input
                    type="text"
                    required
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#0b57d0] focus:ring-2 focus:ring-[#0b57d0]/15"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-700">SMTP Password</label>
                  <input
                    type="password"
                    required
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#0b57d0] focus:ring-2 focus:ring-[#0b57d0]/15"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700">Hourly Rate Limit (Max Emails / Hour)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#0b57d0] focus:ring-2 focus:ring-[#0b57d0]/15"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-2xl bg-[#0b57d0] hover:bg-[#0842a0] text-white text-xs font-bold transition shadow-xs disabled:opacity-50 active:scale-98 cursor-pointer"
              >
                {isSubmitting ? 'Verifying & Saving...' : 'Save Outbound Transporter'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
