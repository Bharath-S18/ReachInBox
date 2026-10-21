import React, { useState } from 'react';
import { Mail, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border-card bg-surface-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-card pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-border-card bg-surface-container p-2 text-border-highlight">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white tracking-tight">
                Outbound Sender Accounts
              </h3>
              <p className="font-mono text-[11px] text-text-muted">
                Multi-sender SMTP credentials and hourly dispatch rate boundaries
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

        {/* Sender List */}
        <div className="mt-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
              Active Transporters ({senders.length})
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 rounded bg-surface-container border border-border-card px-2.5 py-1 font-mono text-xs text-text-muted hover:border-border-highlight hover:text-white"
            >
              <Plus className="h-3 w-3" />
              <span>{showAddForm ? 'Cancel' : 'Add SMTP Sender'}</span>
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <form onSubmit={handleCreate} className="rounded-xl border border-border-highlight/30 bg-surface-container p-4 space-y-3 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-text-muted block mb-1">Account Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Primary Mailer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded border border-border-card bg-surface-card px-2.5 py-1.5 text-white focus:border-border-highlight focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-text-muted block mb-1">Sender Email</label>
                  <input
                    type="email"
                    required
                    placeholder="sender@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded border border-border-card bg-surface-card px-2.5 py-1.5 text-white focus:border-border-highlight focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-text-muted block mb-1">SMTP Host</label>
                  <input
                    type="text"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="w-full rounded border border-border-card bg-surface-card px-2.5 py-1.5 text-white focus:border-border-highlight focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-text-muted block mb-1">Port</label>
                  <input
                    type="number"
                    required
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full rounded border border-border-card bg-surface-card px-2.5 py-1.5 text-white focus:border-border-highlight focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-text-muted block mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    className="w-full rounded border border-border-card bg-surface-card px-2.5 py-1.5 text-white focus:border-border-highlight focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-text-muted block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    className="w-full rounded border border-border-card bg-surface-card px-2.5 py-1.5 text-white focus:border-border-highlight focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-text-muted block mb-1">Hourly Limit</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={hourlyLimit}
                    onChange={(e) => setHourlyLimit(Number(e.target.value))}
                    className="w-full rounded border border-border-card bg-surface-card px-2.5 py-1.5 text-white focus:border-border-highlight focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded bg-white px-4 py-1.5 font-display font-semibold text-black hover:bg-slate-200"
                >
                  {isSubmitting ? 'Registering...' : 'Save Transporter'}
                </button>
              </div>
            </form>
          )}

          {/* List */}
          <div className="space-y-2.5">
            {senders.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-border-card bg-surface-container p-3.5 transition-colors hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-border-card bg-surface-card p-2 text-white">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-white">{s.email}</span>
                      {s.name && (
                        <span className="rounded border border-border-card bg-code-badge-bg px-1.5 py-0.2 font-mono text-[10px] text-border-highlight">
                          {s.name}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-text-muted mt-0.5">
                      Host: {s.host}:{s.port} | Hourly Rate Limit: <strong className="text-amber-400">{s.hourlyLimit} emails/hr</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(s.id)}
                  title="Delete Transporter"
                  className="rounded p-1.5 text-text-muted hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
