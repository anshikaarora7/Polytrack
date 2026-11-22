import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthResponse } from './types';
import { apiClient } from './api-client';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearError: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: AuthResponse = await apiClient.login({ email, password });

          // Store both tokens
          apiClient.setAuthToken(response.accessToken);
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);
          }

          set({
            token: response.accessToken,
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Login failed';
          set({
            error: errorMessage,
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await apiClient.logout();
        } finally {
          apiClient.clearAuth();
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('auth-storage');
          }
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      setUser: (user: User | null) => {
        set({ user });
      },

      setToken: (token: string | null) => {
        set({ token, isAuthenticated: !!token });
        if (token) {
          apiClient.setAuthToken(token);
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', token);
          }
        } else {
          apiClient.clearAuth();
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('auth-storage');
          }
        }
      },

      clearError: () => {
        set({ error: null });
      },

      hydrate: () => {
        let token: string | null = null;
        if (typeof window !== 'undefined') {
          token = localStorage.getItem('accessToken');
          if (!token) {
            try {
              const authStorage = localStorage.getItem('auth-storage');
              if (authStorage) {
                const parsed = JSON.parse(authStorage);
                token = parsed?.state?.token || null;
              }
            } catch (e) {
              // ignore
            }
          }
        }
        if (token) {
          apiClient.setAuthToken(token);
          set({ token, isAuthenticated: true });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);