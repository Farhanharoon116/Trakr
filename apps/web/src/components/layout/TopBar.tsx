import { Menu, Globe, LogOut, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useUIStore } from '../../store/ui.store';
import { OfflineBadge } from '../shared/OfflineBadge';

export function TopBar() {
  const { user, business, logout } = useAuthStore();
  const { toggleSidebar, language, toggleLanguage } = useUIStore();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold text-slate-900">{business?.name ?? 'BizOS'}</span>
      </div>

      <div className="flex items-center gap-3">
        <OfflineBadge />

        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          aria-label="Toggle language"
        >
          <Globe className="h-4 w-4" />
          <span>{language === 'en' ? 'EN' : 'UR'}</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <span className="hidden text-sm font-medium text-slate-700 sm:block">
            {user?.name}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </div>

        <button
          onClick={logout}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
