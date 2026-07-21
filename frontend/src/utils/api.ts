import axios from 'axios';
import type { AxiosInstance } from 'axios';

// API base URL - all API routes are prefixed with /api
const API_BASE_URL = '/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage and redirect to login
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Auth API
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  username: string;
  role: string;
}

export interface UserProfile {
  username: string;
  role: string;
}

export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// ============================================================================
// Documents API
// ============================================================================

export interface Document {
  id: string;
  name: string;
  status: 'uploading' | 'extracting' | 'chunking' | 'indexing' | 'ready' | 'failed';
  category: string;
  uploader: string;
  upload_date: string;
  page_count?: number;
  size?: string;
  error?: string;
}

export interface DocumentStatus {
  id: string;
  name: string;
  status: string;
  stage?: string;
  progress?: number;
  error?: string;
}

export const documentsAPI = {
  upload: async (file: File, category: string): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  list: async (): Promise<Document[]> => {
    const response = await api.get('/documents/');
    return response.data;
  },

  getStatus: async (documentId: string): Promise<DocumentStatus> => {
    const response = await api.get(`/documents/${documentId}/status`);
    return response.data;
  },

  delete: async (documentId: string): Promise<void> => {
    await api.delete(`/documents/${documentId}`);
  },

  updateCategory: async (documentId: string, category: string): Promise<Document> => {
    const response = await api.patch(`/documents/${documentId}/category`, { category });
    return response.data;
  },
};

// ============================================================================
// Chat API
// ============================================================================

export interface Citation {
  id?: string;
  document: string;
  page?: number;
  chunk_id?: string;
  excerpt: string;
  score?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp?: string;
  isStreaming?: boolean;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  allowed_categories?: string[];
}

export interface ChatHistoryMessage {
  role: string;
  content: string;
  timestamp: string;
  citations?: Citation[];
}

export const chatAPI = {
  /**
   * Stream chat responses using Server-Sent Events
   * Returns an EventSource that emits different event types
   */
  streamChat: (
    request: ChatRequest,
    onCitation: (citations: Citation[]) => void,
    onToken: (token: string) => void,
    onDone: (totalTokens: number) => void,
    onError: (error: string) => void,
    onReplace?: (content: string) => void
  ): EventSource => {
    const userStr = localStorage.getItem('user');
    let token = '';
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.token || '';
      } catch (e) {
        console.error('Failed to parse user token', e);
      }
    }

    // Build query params
    const params = new URLSearchParams();
    params.append('message', request.message);
    params.append('session_id', request.session_id || `session-${Date.now()}`);
    if (request.allowed_categories) {
      request.allowed_categories.forEach(cat => params.append('allowed_categories', cat));
    }
    if (token) params.append('token', token);

    const eventSource = new EventSource(`/api/chat/stream?${params.toString()}`);

    eventSource.addEventListener('message', (e: MessageEvent) => {
      if (e.data === '[DONE]') {
        eventSource.close();
        return;
      }

      try {
        const data = JSON.parse(e.data);
        
        if (data.type === 'citations') {
          onCitation(data.citations || []);
        } else if (data.type === 'token') {
          onToken(data.content || '');
        } else if (data.type === 'done') {
          onDone(data.total_tokens || 0);
          eventSource.close();
        } else if (data.type === 'error') {
          onError(data.content || 'An error occurred');
          eventSource.close();
        } else if (data.type === 'replace' && onReplace) {
          onReplace(data.content || '');
        }
      } catch (err) {
        console.error('Failed to parse SSE message', err);
      }
    });

    eventSource.onerror = () => {
      onError('Connection failed');
      eventSource.close();
    };

    return eventSource;
  },

  getHistory: async (sessionId: string): Promise<ChatHistoryMessage[]> => {
    const response = await api.get(`/chat/history/${sessionId}`);
    return response.data;
  },

  clearHistory: async (sessionId: string): Promise<void> => {
    await api.delete(`/chat/history/${sessionId}`);
  },
};

// ============================================================================
// Admin API
// ============================================================================

export interface AuditLog {
  id: string;
  timestamp: string;
  username: string;
  role: string;
  action: string;
  resource?: string;
  resource_id?: string;
  ip_address?: string;
  session_id?: string;
  details?: Record<string, any>;
  token_usage?: number;
  success: boolean;
}

export interface UsageStats {
  username: string;
  role: string;
  total_tokens: number;
  total_queries: number;
  estimated_cost_usd: number;
  last_activity?: string;
}

export const adminAPI = {
  getAuditLogs: async (
    username?: string,
    action?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ logs: AuditLog[]; total: number }> => {
    const params = new URLSearchParams();
    if (username) params.append('username', username);
    if (action) params.append('action', action);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response = await api.get(`/admin/audit?${params.toString()}`);
    return response.data;
  },

  exportAuditLogs: async (format: 'csv' | 'json' = 'csv'): Promise<Blob> => {
    const response = await api.get(`/admin/audit/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getUsageStats: async (): Promise<UsageStats[]> => {
    const response = await api.get('/admin/usage');
    return response.data;
  },

  listUsers: async (): Promise<UserProfile[]> => {
    const response = await api.get('/admin/users');
    return response.data;
  },
};

// ============================================================================
// Usage API
// ============================================================================

export interface PersonalUsage {
  period: string;
  total_tokens: number;
  total_queries: number;
  estimated_cost_usd: number;
  breakdown_by_date?: Record<string, number>;
}

export interface RecentQuery {
  timestamp: string;
  message: string;
  tokens_used: number;
  session_id: string;
}

export const usageAPI = {
  getPersonalUsage: async (period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time'): Promise<PersonalUsage> => {
    const response = await api.get(`/usage/me?period=${period}`);
    return response.data;
  },

  getRecentQueries: async (limit: number = 10): Promise<RecentQuery[]> => {
    const response = await api.get(`/usage/me/recent-queries?limit=${limit}`);
    return response.data;
  },
};

export default api;
