export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  createdAt: string;
}

export interface SenderAccount {
  id: string;
  email: string;
  host: string;
  port: number;
  user: string;
  hourlyLimit: number;
  name?: string;
  createdAt: string;
}

export interface ScheduledEmailJob {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledTime: string;
  status?: string;
  senderAccount: {
    id: string;
    email: string;
    hourlyLimit: number;
  };
  createdAt: string;
}

export interface SentEmailJob {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: 'SENT' | 'FAILED';
  sentAt: string | null;
  previewUrl: string | null;
  senderAccount: {
    id: string;
    email: string;
  };
  errorMessage?: string | null;
}

export interface EmailStats {
  total: number;
  scheduled: number;
  sent: number;
  failed: number;
  rescheduled: number;
}

export interface SlackStatus {
  connected: boolean;
  channelName?: string;
  mode?: string;
}

export interface SearchResult {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledTime: string;
  sentAt?: string | null;
  previewUrl?: string | null;
}
