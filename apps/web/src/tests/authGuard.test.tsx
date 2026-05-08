import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

// Simple RequireAuth mirror
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

describe('Auth guard', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('redirects to /login when not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/pos']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/pos"
            element={
              <RequireAuth>
                <div>POS Page</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Login Page')).toBeDefined();
  });

  it('renders protected route when authenticated', () => {
    useAuthStore.setState({
      accessToken: 'fake-token',
      user: {
        id: 'u1',
        business_id: 'b1',
        phone: '+923001234567',
        name: 'Test User',
        role: 'owner',
        pin: null,
        branch_id: null,
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      business: null,
      refreshToken: null,
    });

    render(
      <MemoryRouter initialEntries={['/pos']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/pos"
            element={
              <RequireAuth>
                <div>POS Page</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('POS Page')).toBeDefined();
  });
});
