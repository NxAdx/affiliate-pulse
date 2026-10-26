import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { AppSettings, DealCategory, DealRecord, ProductMetadata, GeneratedContent } from '../types';

let mmkvInstance: MMKV | null = null;
try {
  mmkvInstance = new MMKV({ id: 'affiliate-pulse-storage' });
} catch {
  // Graceful fallback for headless/test environments
}

const memoryStore = new Map<string, string>();

const mmkvStorage: StateStorage = {
  setItem: (name, value) => {
    if (mmkvInstance) {
      mmkvInstance.set(name, value);
    } else {
      memoryStore.set(name, value);
    }
  },
  getItem: (name) => {
    if (mmkvInstance) {
      return mmkvInstance.getString(name) ?? null;
    }
    return memoryStore.get(name) ?? null;
  },
  removeItem: (name) => {
    if (mmkvInstance) {
      mmkvInstance.delete(name);
    } else {
      memoryStore.delete(name);
    }
  },
};

interface AppState {
  // Active Workspace State
  selectedCategory: DealCategory;
  setSelectedCategory: (category: DealCategory) => void;
  
  // Current In-Progress Deal
  activeProduct: ProductMetadata | null;
  setActiveProduct: (product: ProductMetadata | null) => void;
  
  activeContent: GeneratedContent | null;
  setActiveContent: (content: GeneratedContent | null) => void;
  
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
  
  // Historical Records
  dealsHistory: DealRecord[];
  addDealToHistory: (deal: DealRecord) => void;
  removeDealFromHistory: (id: string) => void;
  clearHistory: () => void;
  
  // App Settings & Credentials
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  amazonAffiliateTag: '',
  flipkartAffiliateTag: '',
  earnkaroToken: '',
  bloggerBlogId: '',
  bloggerAccessToken: '',
  bloggerEmail: '',
  telegramBotToken: '',
  telegramChannelId: '',
  pinterestBoardId: '',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedCategory: 'electronics',
      setSelectedCategory: (category) => set({ selectedCategory: category }),

      activeProduct: null,
      setActiveProduct: (product) => set({ activeProduct: product }),

      activeContent: null,
      setActiveContent: (content) => set({ activeContent: content }),

      isProcessing: false,
      setIsProcessing: (val) => set({ isProcessing: val }),

      dealsHistory: [],
      addDealToHistory: (deal) =>
        set((state) => ({ dealsHistory: [deal, ...state.dealsHistory] })),
      removeDealFromHistory: (id) =>
        set((state) => ({
          dealsHistory: state.dealsHistory.filter((item) => item.id !== id),
        })),
      clearHistory: () => set({ dealsHistory: [] }),

      settings: DEFAULT_SETTINGS,
      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
    }),
    {
      name: 'affiliate-pulse-vault',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        settings: state.settings,
        dealsHistory: state.dealsHistory,
        selectedCategory: state.selectedCategory,
      }),
    }
  )
);