import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'ur';

interface UIState {
  sidebarOpen: boolean;
  language: Language;
  selectedBranchId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleLanguage: () => void;
  setSelectedBranchId: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      language: 'en',
      selectedBranchId: null,
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleLanguage: () =>
        set({ language: get().language === 'en' ? 'ur' : 'en' }),
      setSelectedBranchId: (id) => set({ selectedBranchId: id }),
    }),
    { name: 'bizos-ui' }
  )
);
