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
    const res = await api.post('/api/auth/google', { idToken });
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
  async getScheduled(page = 1, limit = 20): Promise<{
    jobs: ScheduledEmailJob[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await api.get('/api/emails/scheduled', {
      params: { page, limit },
    });
    return res.data;
  },

  async getSent(page = 1, limit = 20): Promise<{
    jobs: SentEmailJob[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const res = await api.get('/api/emails/sent', {
      params: { page, limit },
    });
    return res.data;
  },

  async getStats(): Promise<EmailStats> {
    const res = await api.get('/api/emails/stats');
    return res.data.stats;
  },

  async search(query: string): Promise<{ source: string; query: string; total: number; results: SearchResult[] }> {
    const res = await api.get('/api/emails/search', {
      params: { q: query },
    });
    return res.data;
  },

  async schedule(formData: FormData): Promise<{
    success: boolean;
    totalLeads: number;
    invalidCount: number;
    staggerDelayMs: number;
  }> {
    const res = await api.post('/api/emails/schedule', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
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
