import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { AppSettings, DealCategory, DealRecord, ProductMetadata, GeneratedContent, BulkQueueItem } from '../types';
import { DEFAULT_BLOGGER_WEBHOOK } from '../services/bloggerApi';

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
  
  // Bulk Syndication Queue
  bulkQueue: BulkQueueItem[];
  setBulkQueue: (queue: BulkQueueItem[]) => void;
  updateBulkQueueItem: (id: string, partial: Partial<BulkQueueItem>) => void;
  removeBulkQueueItem: (id: string) => void;
  clearBulkQueue: () => void;

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
  bloggerWebhookUrl: DEFAULT_BLOGGER_WEBHOOK,
  bloggerEmail: '',
  telegramBotToken: '',
  telegramChannelId: '',
  pinterestBoardId: 'https://in.pinterest.com/aadarshlokhande/f%ce%b1%d1%95%d0%bd%ce%b9%cf%83%d0%b8/',
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

      bulkQueue: [],
      setBulkQueue: (queue) => set({ bulkQueue: queue }),
      updateBulkQueueItem: (id, partial) =>
        set((state) => ({
          bulkQueue: state.bulkQueue.map((item) =>
            item.id === id ? { ...item, ...partial } : item
          ),
        })),
      removeBulkQueueItem: (id) =>
        set((state) => ({
          bulkQueue: state.bulkQueue.filter((item) => item.id !== id),
        })),
      clearBulkQueue: () => set({ bulkQueue: [] }),

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
        bulkQueue: state.bulkQueue,
      }),
    }
  )
);