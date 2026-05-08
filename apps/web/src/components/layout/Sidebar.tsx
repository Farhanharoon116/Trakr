import { NavLink } from 'react-router-dom';
import {
  ShoppingCart,
  LayoutDashboard,
  Package,
  Users,
  Settings,
  BarChart3,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useUIStore } from '../../store/ui.store';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { to: '/pos', label: 'POS', icon: ShoppingCart, roles: ['owner', 'manager', 'cashier'] },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['owner', 'manager'] },
  { to: '/products', label: 'Products', icon: Package, roles: ['owner', 'manager'] },
  { to: '/employees', label: 'Employees', icon: Users, roles: ['owner'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['owner', 'manager'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['owner'] },
];

export function Sidebar() {
  const { user } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const role = user?.role ?? 'cashier';

  const allowed = navItems.filter((item) => item.roles.includes(role));

  if (!sidebarOpen) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-20 bg-black/40 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />
      <aside className="fixed left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-border bg-surface lg:relative lg:z-auto">
        <div className="flex h-14 items-center justify-between px-4">
          <span className="text-lg font-bold text-primary">BizOS</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {allowed.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
