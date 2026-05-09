import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Business } from '@bizos/shared';

interface AuthState {
  user: User | null;
  business: Business | null;
  accessToken: string | null;
  refreshToken: string | null;

  setAuth: (params: {
    user: User;
    business: Business;
    accessToken: string;
    refreshToken: string;
  }) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

const BASE_URL = typeof window !== 'undefined'
  ? (import.meta.env['VITE_API_URL'] as string ?? 'http://localhost:3001')
  : 'http://localhost:3001';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      business: null,
      accessToken: null,
      refreshToken: null,

      setAuth: ({ user, business, accessToken, refreshToken }) => {
        set({ user, business, accessToken, refreshToken });
      },

      setAccessToken: (token) => set({ accessToken: token }),

      logout: () => {
        set({ user: null, business: null, accessToken: null, refreshToken: null });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;
        try {
          const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          if (!res.ok) {
            set({ user: null, business: null, accessToken: null, refreshToken: null });
            return false;
          }
          const data = (await res.json()) as { access_token: string };
          set({ accessToken: data.access_token });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'bizos-auth',
      partialize: (state) => ({
        user: state.user,
        business: state.business,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
