import axios from 'axios';
import type { AxiosInstance } from 'axios';

const API_BASE_URL = '/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // Automatically include cookies in requests
});

// Auto-redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

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
  
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
  
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// ─── Documents ────────────────────────────────────────────────────────────────

/** Shape returned by GET /documents/ (DocumentListItem from backend) */
export interface Document {
  id: string;
  filename: string;           // backend field name
  status: 'uploading' | 'extracting' | 'chunking' | 'indexing' | 'ready' | 'failed';
  category: string;
  uploader: string;
  page_count: number;
  chunk_count: number;
  file_size_bytes: number;
  created_at: string;         // ISO datetime string
}

/** Shape returned by GET /documents/{id}/status */
export interface DocumentStatus {
  document_id: string;
  status: string;
  page_count: number;
  chunk_count: number;
  error_message: string | null;
  updated_at: string;
}

/** Shape returned by POST /documents/upload */
export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  status: string;
  message: string;
}

export const documentsAPI = {
  upload: async (file: File, category: string): Promise<DocumentUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    const response = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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

  updateCategory: async (documentId: string, category: string): Promise<void> => {
    await api.patch(`/documents/${documentId}/category`, { category });
  },
};

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface Citation {
  id?: string;
  document: string;
  page?: number;
  chunk_id?: string;
  excerpt: string;
  score?: number;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  allowed_categories?: string[];
}

export const chatAPI = {
  /**
   * Opens an EventSource for SSE streaming.
   * The backend expects: GET /chat/stream?message=...&session_id=...&token=...
   * Token is passed in query params since EventSource can't set Authorization headers.
   */
  streamChat: (
    request: ChatRequest,
    onCitation: (citations: Citation[]) => void,
    onToken: (token: string) => void,
    onDone: (totalTokens: number) => void,
    onError: (error: string) => void,
    onReplace?: (content: string) => void,
    onStatus?: (status: string) => void
  ): EventSource => {
    const params = new URLSearchParams();
    params.append('message', request.message);
    params.append('session_id', request.session_id || `session-${Date.now()}`);
    if (request.allowed_categories) {
      request.allowed_categories.forEach(cat => params.append('allowed_categories', cat));
    }
    // Note: HTTP-only cookies are automatically sent by the browser for same-origin requests
    // No need to pass token in query params anymore

    const eventSource = new EventSource(`/api/chat/stream?${params.toString()}`);

    eventSource.addEventListener('message', (e: MessageEvent) => {
      if (e.data === '[DONE]') {
        eventSource.close();
        return;
      }
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'status') { onStatus?.(data.content || ''); }
        else if (data.type === 'citations') onCitation(data.citations || []);
        else if (data.type === 'token') onToken(data.content || '');
        else if (data.type === 'done') { onDone(data.total_tokens || 0); eventSource.close(); }
        else if (data.type === 'error') { onError(data.content || 'An error occurred'); eventSource.close(); }
        else if (data.type === 'replace' && onReplace) onReplace(data.content || '');
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

  getHistory: async (sessionId: string) => {
    const response = await api.get(`/chat/history/${sessionId}`);
    return response.data;
  },

  clearHistory: async (sessionId: string): Promise<void> => {
    await api.delete(`/chat/history/${sessionId}`);
  },
};

// ─── Admin ────────────────────────────────────────────────────────────────────

/** Single audit log entry as returned by backend */
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
  details?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  success: boolean;
}

/** Backend response shape for GET /admin/audit */
export interface AuditLogsResponse {
  items: AuditLog[];
  total: number;
  page: number;
  page_size: number;
}

/** Single user usage summary as returned by GET /admin/usage */
export interface UserUsageSummary {
  username: string;
  role?: string;
  total_tokens: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_queries?: number;
  estimated_cost_usd: number;
  last_activity?: string;
}

/** Backend response shape for GET /admin/usage */
export interface AdminUsageResponse {
  users: UserUsageSummary[];
  total_users: number;
}

export const adminAPI = {
  getAuditLogs: async (
    username?: string,
    action?: string,
    role?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<AuditLogsResponse> => {
    const params = new URLSearchParams();
    if (username) params.append('username', username);
    if (action) params.append('action', action);
    if (role) params.append('role', role);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    const response = await api.get(`/admin/audit?${params.toString()}`);
    return response.data;
  },

  exportAuditLogs: async (format: 'csv' | 'json' = 'csv'): Promise<Blob> => {
    const response = await api.get(`/admin/audit/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getUsageStats: async (): Promise<AdminUsageResponse> => {
    const response = await api.get('/admin/usage');
    return response.data;
  },

  listUsers: async (): Promise<UserProfile[]> => {
    const response = await api.get('/admin/users');
    return response.data;
  },
};

// ─── Usage ────────────────────────────────────────────────────────────────────

/** Single period usage summary as returned inside GET /usage/me */
export interface PeriodUsage {
  total_tokens: number;
  total_queries: number;
  prompt_tokens?: number;
  completion_tokens?: number;
}

/** Backend response shape for GET /usage/me */
export interface MyUsageResponse {
  username: string;
  role: string;
  periods: {
    daily: PeriodUsage;
    weekly: PeriodUsage;
    monthly: PeriodUsage;
    all_time: PeriodUsage;
  };
}

/** Single recent query as returned inside GET /usage/me/recent-queries */
export interface RecentQuery {
  timestamp: string;
  action: string;
  details?: string;
  total_tokens?: number;
  session_id?: string;
  success: boolean;
}

/** Backend response shape for GET /usage/me/recent-queries */
export interface RecentQueriesResponse {
  username: string;
  queries: RecentQuery[];
}

export const usageAPI = {
  getPersonalUsage: async (): Promise<MyUsageResponse> => {
    const response = await api.get('/usage/me');
    return response.data;
  },

  getRecentQueries: async (limit: number = 10): Promise<RecentQueriesResponse> => {
    const response = await api.get(`/usage/me/recent-queries?limit=${limit}`);
    return response.data;
  },
};

export default api;
