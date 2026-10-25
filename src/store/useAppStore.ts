import { create } from 'zustand';
import { AppSettings, DealCategory, DealRecord, ProductMetadata, GeneratedContent } from '../types';

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
  telegramBotToken: '',
  telegramChannelId: '',
  pinterestBoardId: '',
};

export const useAppStore = create<AppState>((set) => ({
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
}));