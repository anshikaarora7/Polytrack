import axios, { AxiosInstance } from 'axios';
import {
  AuthResponse,
  LoginCredentials,
  DashboardStats,
  Activity,
  ProjectProgress,
  Deadline,
} from './types';

// Normalize API base URL: ensure no trailing slash, ensure /api suffix
export const getApiBaseUrl = (): string => {
  // If running in browser and accessed via LAN IP (e.g. 192.168.x.x) or non-localhost host
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return `${window.location.protocol}//${window.location.hostname}:5030/api`;
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl) {
    return 'http://localhost:5030/api';
  }
  const clean = envUrl.trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

// Root server URL without /api (for display, health checks, or root downloads)
export const getApiServerUrl = (): string => {
  return getApiBaseUrl().replace(/\/api$/, '');
};

const API_BASE_URL = getApiBaseUrl();

// ── Cold-Start Server Health Tracker ────────────────────────
type ServerHealthListener = (isWakingUp: boolean) => void;

class ServerHealthTracker {
  private isWakingUp = false;
  private listeners: Set<ServerHealthListener> = new Set();

  public setWakingUp(val: boolean) {
    if (this.isWakingUp !== val) {
      this.isWakingUp = val;
      this.notify();
    }
  }

  public getIsWakingUp() {
    return this.isWakingUp;
  }

  public subscribe(fn: ServerHealthListener): () => void {
    this.listeners.add(fn);
    fn(this.isWakingUp);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try { fn(this.isWakingUp); } catch { }
    });
  }
}

export const serverHealth = new ServerHealthTracker();

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('accessToken');
      if (this.token) {
        this.setAuthToken(this.token);
      }
    }

    // Request interceptor — attach token and start cold-start monitor
    this.client.interceptors.request.use(
      (config) => {
        config.baseURL = getApiBaseUrl();
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }

        if (typeof window !== 'undefined') {
          const timer = setTimeout(() => {
            serverHealth.setWakingUp(true);
          }, 2500);
          (config as any)._wakeTimer = timer;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor — handle 401 with automatic refresh token rotation & cold start recovery
    let isRefreshing = false;
    let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

    this.client.interceptors.response.use(
      (response) => {
        if ((response.config as any)?._wakeTimer) {
          clearTimeout((response.config as any)._wakeTimer);
        }
        serverHealth.setWakingUp(false);
        return response;
      },
      async (error) => {
        if ((error.config as any)?._wakeTimer) {
          clearTimeout((error.config as any)._wakeTimer);
        }

        const originalRequest = error.config;
        if (!originalRequest) return Promise.reject(error);

        // Detect cold-start network / 502 / 503 / 504 errors on GET requests and retry once
        const isNetworkOrCold =
          error.code === 'ERR_NETWORK' ||
          error.code === 'ECONNABORTED' ||
          error.response?.status === 502 ||
          error.response?.status === 503 ||
          error.response?.status === 504;

        if (isNetworkOrCold && !originalRequest._coldRetry && (!originalRequest.method || originalRequest.method.toLowerCase() === 'get')) {
          originalRequest._coldRetry = true;
          serverHealth.setWakingUp(true);
          await new Promise((r) => setTimeout(r, 3000));
          try {
            const res = await this.client(originalRequest);
            serverHealth.setWakingUp(false);
            return res;
          } catch (retryErr) {
            serverHealth.setWakingUp(false);
            return Promise.reject(retryErr);
          }
        }

        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({
                resolve: (token: string) => {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                  resolve(this.client(originalRequest));
                },
                reject: (err: any) => reject(err),
              });
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
          if (refreshToken) {
            try {
              const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
              const { accessToken, refreshToken: newRefresh } = res.data;
              this.setAuthToken(accessToken);
              if (typeof window !== 'undefined' && newRefresh) {
                localStorage.setItem('refreshToken', newRefresh);
              }
              failedQueue.forEach((prom) => prom.resolve(accessToken));
              failedQueue = [];
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            } catch (refreshErr) {
              failedQueue.forEach((prom) => prom.reject(refreshErr));
              failedQueue = [];
              this.clearAuth();
              if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                window.location.href = '/login?reason=session_expired';
              }
              return Promise.reject(refreshErr);
            } finally {
              isRefreshing = false;
            }
          } else {
            this.clearAuth();
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login?reason=session_expired';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string) {
    this.token = token;
    this.client.defaults.headers.Authorization = `Bearer ${token}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  clearAuth() {
    this.token = null;
    delete this.client.defaults.headers.Authorization;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  getToken() {
    return this.token;
  }

  isAuthenticated() {
    return !!this.token;
  }

  // ── Auth ──────────────────────────────────────────────────
  async checkEmail(email: string): Promise<{ exists: boolean; name?: string; role?: string; message?: string }> {
    const response = await this.client.post('/auth/check-email', { email });
    return response.data;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  }

  async logout(): Promise<void> {
    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('refreshToken')
      : null;
    try {
      if (refreshToken) {
        await this.client.post('/auth/logout', refreshToken, {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } finally {
      this.clearAuth();
    }
  }

  // ── Dashboard ─────────────────────────────────────────────
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get<DashboardStats>('/dashboard/stats');
    return response.data;
  }

  async getDashboardActivity(projectId?: string, limit = 20): Promise<Activity[]> {
    const response = await this.client.get<Activity[]>('/dashboard/activity', {
      params: { projectId, limit },
    });
    return response.data; // plain array
  }

  async getProjectsProgress(): Promise<ProjectProgress[]> {
    const response = await this.client.get<ProjectProgress[]>('/dashboard/projects-progress');
    return response.data; // plain array
  }

  async getUpcomingDeadlines(days = 7): Promise<Deadline[]> {
    const response = await this.client.get<Deadline[]>('/dashboard/upcoming-deadlines', {
      params: { days },
    });
    return response.data; // plain array
  }

  async getRecentAssets(limit = 8) {
    const response = await this.client.get('/dashboard/recent-assets', {
      params: { limit },
    });
    return response.data; // plain array
  }

  async getTimesheets(userId?: string, week?: string) {
    const response = await this.client.get('/dashboard/timesheets', {
      params: { userId, week },
    });
    return response.data;
  }

  // ── Projects ──────────────────────────────────────────────
  async getProjects(filters?: {
    status?: string;
    priority?: string;
    projectType?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const response = await this.client.get('/projects', { params: filters });
    return response.data;
  }

  async getProjectById(id: string) {
    const response = await this.client.get(`/projects/${id}`);
    return response.data;
  }

  async createProject(data: any) {
    const response = await this.client.post('/projects', data);
    return response.data;
  }

  async updateProject(id: string, data: any) {
    const response = await this.client.put(`/projects/${id}`, data);
    return response.data;
  }

  async deleteProject(id: string) {
    const response = await this.client.delete(`/projects/${id}`);
    return response.data;
  }

  async getProjectStats(id: string) {
    const response = await this.client.get(`/projects/${id}/stats`);
    return response.data;
  }

  async getProjectMembers(id: string) {
    const response = await this.client.get(`/projects/${id}/members`);
    return response.data;
  }

  async addProjectMember(id: string, userId: string, roleInProject?: string) {
    const response = await this.client.post(`/projects/${id}/members`, {
      userId,
      roleInProject,
    });
    return response.data;
  }

  async removeProjectMember(id: string, userId: string) {
    const response = await this.client.delete(`/projects/${id}/members/${userId}`);
    return response.data;
  }

  // ── Tasks ─────────────────────────────────────────────────
  async getTasks(filters?: {
    projectId?: string;
    milestoneId?: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
    overdue?: boolean;
  }) {
    const response = await this.client.get('/tasks', { params: filters });
    return response.data;
  }

  async getTaskById(id: string) {
    const response = await this.client.get(`/tasks/${id}`);
    return response.data;
  }

  async getKanbanTasks(projectId: string) {
    const response = await this.client.get('/tasks/kanban', { params: { projectId } });
    return response.data; // { new, inProgress, review, done }
  }

  async createTask(data: any) {
    const response = await this.client.post('/tasks', data);
    return response.data;
  }

  async updateTask(id: string, data: any) {
    const response = await this.client.put(`/tasks/${id}`, data);
    return response.data;
  }

  async moveTask(taskId: string, status: string) {
    const response = await this.client.patch(`/tasks/${taskId}/move`, { status });
    return response.data;
  }

  async getTaskComments(taskId: string) {
    const response = await this.client.get(`/tasks/${taskId}/comments`);
    return response.data;
  }

  async addTaskComment(taskId: string, body: string, statusChangeTo?: string) {
    const response = await this.client.post(`/tasks/${taskId}/comments`, {
      body,
      statusChangeTo,
    });
    return response.data;
  }

  async logTime(taskId: string, date: string, hours: number, notes?: string) {
    const response = await this.client.post(`/tasks/${taskId}/time`, {
      date,
      hours,
      notes,
    });
    return response.data;
  }

  async getTaskAttachments(taskId: string) {
    const response = await this.client.get(`/tasks/${taskId}/attachments`);
    return response.data;
  }

  async uploadTaskAttachment(taskId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async deleteTaskAttachment(taskId: string, attachmentId: string) {
    const response = await this.client.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
    return response.data;
  }

  // ── Milestones ────────────────────────────────────────────
  async getMilestones(projectId: string) {
    const response = await this.client.get('/milestones', { params: { projectId } });
    return response.data; // plain array
  }

  async getMilestoneById(id: string) {
    const response = await this.client.get(`/milestones/${id}`);
    return response.data;
  }

  async createMilestone(data: any) {
    const response = await this.client.post('/milestones', data);
    return response.data;
  }

  async updateMilestone(id: string, data: any) {
    const response = await this.client.put(`/milestones/${id}`, data);
    return response.data;
  }

  async deleteMilestone(id: string) {
    const response = await this.client.delete(`/milestones/${id}`);
    return response.data;
  }

  async reorderMilestones(items: Array<{ id: string; sortOrder: number }>) {
    const response = await this.client.post('/milestones/reorder', items);
    return response.data;
  }

  async reviewMilestone(id: string, approved: boolean, notes?: string) {
    const response = await this.client.post(`/milestones/${id}/client-review`, {
      approved,
      notes,
    });
    return response.data;
  }

  async getMilestoneTasks(id: string) {
    const response = await this.client.get(`/milestones/${id}/tasks`);
    return response.data;
  }

  // ── Inquiries ─────────────────────────────────────────────
  async getInquiries(params?: { status?: string; search?: string; page?: number; pageSize?: number }) {
    const response = await this.client.get('/inquiries', { params });
    return response.data;
  }

  async getInquiryById(id: string) {
    const response = await this.client.get(`/inquiries/${id}`);
    return response.data;
  }

  async createInquiry(data: any) {
    const response = await this.client.post('/inquiries', data);
    return response.data;
  }

  async updateInquiryStatus(id: string, status: string) {
    const response = await this.client.patch(`/inquiries/${id}/status`, { status });
    return response.data;
  }

  async convertInquiry(id: string, data: { projectName?: string; projectTypeId?: string; budget?: number; projectManagerId?: string }) {
    const response = await this.client.post(`/inquiries/${id}/convert`, data);
    return response.data;
  }

  async uploadInquiryAttachment(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post(`/inquiries/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  // ── Clients ───────────────────────────────────────────────
  async getClients(params?: { search?: string; page?: number; pageSize?: number }) {
    const response = await this.client.get('/clients', { params });
    return response.data;
  }

  async getClientById(id: string) {
    const response = await this.client.get(`/clients/${id}`);
    return response.data;
  }

  async getCurrentClientProfile() {
    const response = await this.client.get('/clients/me');
    return response.data;
  }

  async createClient(data: any) {
    const response = await this.client.post('/clients', data);
    return response.data;
  }

  async updateClient(id: string, data: any) {
    const response = await this.client.put(`/clients/${id}`, data);
    return response.data;
  }

  // ── Assets ────────────────────────────────────────────────
  async searchAssets(filters?: {
    query?: string;
    projectId?: string;
    category?: string;
    status?: string;
    tag?: string;
    approvedOnly?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const response = await this.client.get('/assets/search', { params: filters });
    return response.data;
  }

  async getAssetById(id: string) {
    const response = await this.client.get(`/assets/${id}`);
    return response.data;
  }

  async createAsset(data: any) {
    const response = await this.client.post('/assets', data);
    return response.data;
  }

  async uploadAssetVersion(
    assetId: string,
    file: File,
    notes?: string | { notes?: string; polygonCount?: number; materialCount?: number }
  ) {
    const formData = new FormData();
    formData.append('file', file);
    if (typeof notes === 'string') {
      formData.append('Notes', notes);
    } else if (notes && typeof notes === 'object') {
      if (notes.notes) formData.append('Notes', notes.notes);
      if (notes.polygonCount) formData.append('PolygonCount', String(notes.polygonCount));
      if (notes.materialCount) formData.append('MaterialCount', String(notes.materialCount));
    }
    const response = await this.client.post(`/assets/${assetId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async submitAssetForReview(assetId: string) {
    const response = await this.client.post(`/assets/${assetId}/submit`);
    return response.data;
  }

  async submitAsset(assetId: string) {
    return this.submitAssetForReview(assetId);
  }

  async reviewAsset(
    assetId: string,
    optionsOrApproved: boolean | { approved: boolean; notes?: string },
    optionalNotes?: string
  ) {
    let approved = true;
    let notes: string | undefined = optionalNotes;

    if (typeof optionsOrApproved === 'boolean') {
      approved = optionsOrApproved;
    } else if (optionsOrApproved && typeof optionsOrApproved === 'object') {
      approved = optionsOrApproved.approved;
      notes = optionsOrApproved.notes;
    }

    const response = await this.client.post(`/assets/${assetId}/review`, {
      approved,
      notes,
    });
    return response.data;
  }

  async getAssetComments(assetId: string) {
    const response = await this.client.get(`/assets/${assetId}/comments`);
    return response.data;
  }

  async addAssetComment(assetId: string, body: string, statusChangeTo?: string) {
    const response = await this.client.post(`/assets/${assetId}/comments`, {
      body,
      statusChangeTo,
    });
    return response.data;
  }

  // ── Users ─────────────────────────────────────────────────
  async getUsers(filters?: { role?: string; search?: string; isActive?: boolean }) {
    const response = await this.client.get('/users', { params: filters });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  async getUserById(id: string) {
    const response = await this.client.get(`/users/${id}`);
    return response.data;
  }

  async getTeamWorkload(projectId?: string) {
    const response = await this.client.get('/users/workload', { params: { projectId } });
    return response.data; // plain array
  }

  async getNotifications(userId: string, unreadOnly = false) {
    const response = await this.client.get(`/users/${userId}/notifications`, {
      params: { unreadOnly },
    });
    return response.data;
  }

  // ── URL Helpers ────────────────────────────────────────────
  getBaseUrl(): string {
    return getApiBaseUrl();
  }

  getServerUrl(): string {
    return getApiServerUrl();
  }

  getAssetDownloadUrl(assetId: string, versionId: string): string {
    return `${this.getBaseUrl()}/assets/${assetId}/download/${versionId}`;
  }

  getAttachmentDownloadUrl(taskId: string, attachmentId: string): string {
    return `${this.getBaseUrl()}/tasks/${taskId}/attachments/${attachmentId}/download`;
  }
}

export const apiClient = new ApiClient();

// ── Standardized API Error Handling ────────────────────────────
export type ApiErrorType = 'auth' | 'forbidden' | 'not-found' | 'network' | 'server' | 'validation' | 'generic';

export interface FormattedApiError {
  type: ApiErrorType;
  title: string;
  message: string;
  statusCode?: number;
  details?: any;
}

export function formatApiError(error: any): FormattedApiError {
  if (!error) {
    return {
      type: 'generic',
      title: 'Unexpected Error',
      message: 'An unknown studio error occurred.',
    };
  }

  // Network / Connection errors (server down, CORS, timeout)
  if (error.code === 'ERR_NETWORK' || !error.response) {
    return {
      type: 'network',
      title: 'Backend Offline / Connection Failed',
      message: `Unable to reach PolyTrack API at ${getApiServerUrl()}. Please ensure the backend daemon is running and accessible.`,
      statusCode: 0,
      details: error.message || error.code,
    };
  }

  const status = error.response?.status;
  const data = error.response?.data;

  // 401 Unauthorized
  if (status === 401) {
    return {
      type: 'auth',
      title: 'Session Expired or Unauthorized',
      message: data?.message || 'Your studio session is invalid or has expired. Please sign in again.',
      statusCode: 401,
      details: data,
    };
  }

  // 403 Forbidden
  if (status === 403) {
    return {
      type: 'forbidden',
      title: 'Access Denied / Insufficient Role',
      message: data?.message || 'You do not have the required studio permissions to access this pipeline resource or perform this action.',
      statusCode: 403,
      details: data,
    };
  }

  // 404 Not Found
  if (status === 404) {
    return {
      type: 'not-found',
      title: 'Resource Not Found',
      message: data?.message || 'The requested asset, project, task, or version could not be found.',
      statusCode: 404,
      details: data,
    };
  }

  // 400 / 422 Validation Error
  if (status === 400 || status === 422) {
    let validationMsg = data?.message || 'Invalid request parameters.';
    if (data?.errors && typeof data.errors === 'object') {
      const messages = Object.entries(data.errors)
        .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
        .join('; ');
      if (messages) validationMsg = messages;
    }
    return {
      type: 'validation',
      title: 'Validation Error',
      message: validationMsg,
      statusCode: status,
      details: data?.errors || data,
    };
  }

  // 500+ Server Error
  if (status >= 500) {
    return {
      type: 'server',
      title: 'Studio Server Error',
      message: data?.message || `The backend server encountered an error (HTTP ${status}). Check server logs for details.`,
      statusCode: status,
      details: data,
    };
  }

  return {
    type: 'generic',
    title: 'Request Failed',
    message: data?.message || error.message || 'An unexpected error occurred.',
    statusCode: status,
    details: data,
  };
}