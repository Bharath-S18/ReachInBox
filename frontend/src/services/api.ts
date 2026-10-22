import axios from 'axios';
import {
  EmailStats,
  ScheduledEmailJob,
  SearchResult,
  SenderAccount,
  SentEmailJob,
  SlackStatus,
  User,
} from '../types';

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  async googleLogin(idToken: string): Promise<{ token: string; user: User }> {
    const res = await api.post('/api/auth/google', { credential: idToken, idToken });
    return res.data;
  },

  async demoLogin(): Promise<{ token: string; user: User }> {
    const res = await api.post('/api/auth/demo');
    return res.data;
  },

  async getMe(): Promise<{ user: User }> {
    const res = await api.get('/api/auth/me');
    return res.data;
  },
};

export const emailApi = {
  async getScheduled(page = 1, limit = 50): Promise<{
    jobs: ScheduledEmailJob[];
    total: number;
    pagination?: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await api.get('/api/emails/scheduled', {
      params: { page, limit },
    });
    const jobs = (res.data.data || res.data.jobs || []) as ScheduledEmailJob[];
    const total = res.data.total ?? jobs.length;
    return {
      jobs,
      total,
      pagination: {
        total,
        page: res.data.page ?? page,
        limit: res.data.limit ?? limit,
        totalPages: res.data.totalPages ?? 1,
      },
    };
  },

  async getSent(page = 1, limit = 50): Promise<{
    jobs: SentEmailJob[];
    total: number;
    pagination?: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await api.get('/api/emails/sent', {
      params: { page, limit },
    });
    const jobs = (res.data.data || res.data.jobs || []) as SentEmailJob[];
    const total = res.data.total ?? jobs.length;
    return {
      jobs,
      total,
      pagination: {
        total,
        page: res.data.page ?? page,
        limit: res.data.limit ?? limit,
        totalPages: res.data.totalPages ?? 1,
      },
    };
  },

  async getStats(): Promise<EmailStats> {
    const res = await api.get('/api/emails/stats');
    return res.data.stats || { total: 0, scheduled: 0, sent: 0, failed: 0, rescheduled: 0 };
  },

  async search(query: string): Promise<{ source: string; query: string; total: number; results: SearchResult[] }> {
    const res = await api.get('/api/emails/search', {
      params: { q: query },
    });
    return res.data;
  },

  async schedule(payload: FormData | {
    subject: string;
    body: string;
    recipients: string;
    startTime?: string;
    scheduledAt?: string;
    interEmailDelayMs?: number;
    hourlyLimit?: number;
    senderId?: string;
  }): Promise<{
    success: boolean;
    totalLeads: number;
    invalidCount: number;
    staggerDelayMs: number;
  }> {
    if (payload instanceof FormData) {
      const res = await api.post('/api/emails/schedule', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    }
    const res = await api.post('/api/emails/schedule', payload);
    return res.data;
  },

  async cancel(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/api/emails/scheduled/${id}`);
    return res.data;
  },
};

export const senderApi = {
  async list(): Promise<{ senders: SenderAccount[] }> {
    const res = await api.get('/api/senders');
    return res.data;
  },

  async create(data: {
    email: string;
    host: string;
    port: number;
    user: string;
    pass: string;
    hourlyLimit?: number;
    name?: string;
  }): Promise<{ sender: SenderAccount }> {
    const res = await api.post('/api/senders', data);
    return res.data;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const res = await api.delete(`/api/senders/${id}`);
    return res.data;
  },
};

export const slackApi = {
  async getStatus(): Promise<SlackStatus> {
    const res = await api.get('/api/slack/status');
    return res.data;
  },

  async getAuthorizeUrl(): Promise<{ authUrl: string }> {
    const res = await api.get('/api/slack/authorize');
    return res.data;
  },

  async disconnect(): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/api/slack/disconnect');
    return res.data;
  },

  async sendTestAlert(): Promise<{ success: boolean; message: string }> {
    const res = await api.post('/api/slack/test-alert');
    return res.data;
  },
};

export default api;
