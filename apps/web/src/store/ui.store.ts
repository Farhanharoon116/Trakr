import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'en' | 'ur';

interface UIState {
  sidebarOpen: boolean;
  language: Language;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleLanguage: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      language: 'en',
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleLanguage: () =>
        set({ language: get().language === 'en' ? 'ur' : 'en' }),
    }),
    { name: 'bizos-ui' }
  )
);
