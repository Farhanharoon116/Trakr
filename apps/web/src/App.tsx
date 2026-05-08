import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/auth/LoginPage';
import { SetupPage } from './pages/auth/SetupPage';
import { POSPage } from './pages/pos/POSPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { EmployeesPage } from './pages/hr/EmployeesPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { ShiftsPage } from './pages/shifts/ShiftsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { useAuthStore } from './store/auth.store';
import { LoadingSkeleton } from './components/shared/LoadingSkeleton';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: string[];
}) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    // Cashier fallback → POS
    if (user.role === 'cashier') return <Navigate to="/pos" replace />;
    return <Navigate to="/pos" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSkeleton className="h-screen w-full" />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<SetupPage />} />

          {/* Protected routes */}
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/pos" replace />} />
            <Route
              path="/pos"
              element={
                <RequireRole roles={['owner', 'manager', 'cashier']}>
                  <POSPage />
                </RequireRole>
              }
            />
            <Route
              path="/dashboard"
              element={
                <RequireRole roles={['owner', 'manager']}>
                  <DashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="/products"
              element={
                <RequireRole roles={['owner', 'manager']}>
                  <ProductsPage />
                </RequireRole>
              }
            />
            <Route
              path="/inventory"
              element={
                <RequireRole roles={['owner', 'manager']}>
                  <InventoryPage />
                </RequireRole>
              }
            />
            <Route
              path="/employees"
              element={
                <RequireRole roles={['owner', 'manager']}>
                  <EmployeesPage />
                </RequireRole>
              }
            />
            <Route
              path="/attendance"
              element={
                <RequireRole roles={['owner', 'manager']}>
                  <AttendancePage />
                </RequireRole>
              }
            />
            <Route
              path="/shifts"
              element={
                <RequireRole roles={['owner', 'manager', 'cashier']}>
                  <ShiftsPage />
                </RequireRole>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
