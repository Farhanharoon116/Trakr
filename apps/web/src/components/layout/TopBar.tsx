import { Menu, Globe, LogOut, ChevronDown, GitBranch } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useUIStore } from '../../store/ui.store';
import { OfflineBadge } from '../shared/OfflineBadge';
import { useBranches } from '../../hooks/useBranches';

function BranchSwitcher() {
  const { data: branches } = useBranches();
  const { selectedBranchId, setSelectedBranchId } = useUIStore();
  const { user } = useAuthStore();

  if (!branches || branches.length <= 1 || (user?.role !== 'owner' && user?.role !== 'manager')) {
    return null;
  }

  const selected = branches.find((b) => b.id === selectedBranchId);

  return (
    <div className="relative flex items-center gap-1">
      <GitBranch className="h-4 w-4 text-slate-400" />
      <select
        value={selectedBranchId ?? ''}
        onChange={(e) => setSelectedBranchId(e.target.value || null)}
        className="rounded-lg border border-border bg-transparent py-1 pl-1 pr-6 text-sm text-slate-700 focus:border-primary focus:outline-none"
        aria-label="Select branch"
      >
        <option value="">All Branches</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      {selected && (
        <button
          onClick={() => setSelectedBranchId(null)}
          className="absolute right-1 top-1 text-slate-400 hover:text-slate-600"
          aria-label="Clear branch filter"
        />
      )}
    </div>
  );
}

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

        <BranchSwitcher />

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
