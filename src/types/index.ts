export type DealCategory =
  | 'all'
  | 'electronics'
  | 'fashion'
  | 'home'
  | 'beauty'
  | 'fitness'
  | 'books'
  | 'general';

export interface ProductMetadata {
  originalUrl: string;
  canonicalUrl: string;
  affiliateUrl: string;
  platform: 'amazon' | 'flipkart' | 'myntra' | 'other';
  title: string;
  description: string;
  imageUrl: string;
  galleryImages?: string[];
  currentPrice: string;
  originalPrice?: string;
  discountPercent?: string;
  savingsAmount?: string;
  dealScore?: string;
  asin?: string;
  rating?: string;
  reviewsCount?: string;
  features: string[];
}

export interface GeneratedContent {
  category: DealCategory;
  // Channel 1: Google Blogger (In-depth 1200+ word SEO Review)
  bloggerTitle?: string;
  bloggerHtmlBody?: string;
  
  // Channel 2: Telegram Deal Channel
  telegramMarkdown?: string;
  
  // Channel 3: WhatsApp Channel / Direct Message
  whatsappMessage?: string;
  
  // Channel 4: Twitter / X
  tweetText?: string;
  
  // Channel 5: Pinterest 2:3 Pin Studio & Social Graphic (Universal for all products)
  pinterestTitle?: string;
  pinterestDescription?: string;
  pinterestTags?: string[];
  pinBadgeText?: string;
  pinPriceTag?: string;
  renderedPinUri?: string;
}

export interface ChannelPublishStatus {
  blogger?: 'idle' | 'pending' | 'success' | 'failed';
  telegram?: 'idle' | 'pending' | 'success' | 'failed';
  pinterest?: 'idle' | 'pending' | 'success' | 'failed';
  whatsapp?: 'idle' | 'pending' | 'success' | 'failed';
  x?: 'idle' | 'pending' | 'success' | 'failed';
}

export interface DealRecord {
  id: string;
  createdAt: string;
  category: DealCategory;
  product: ProductMetadata;
  content: GeneratedContent;
  status: ChannelPublishStatus;
}

export interface AppSettings {
  geminiApiKey: string;
  amazonAffiliateTag: string;
  flipkartAffiliateTag: string;
  earnkaroToken: string;
  bloggerBlogId: string;
  bloggerAccessToken?: string;
  bloggerWebhookUrl?: string;
  bloggerEmail?: string;
  telegramBotToken: string;
  telegramChannelId: string;
  pinterestBoardId: string;
}

export type BulkItemStatus = 'idle' | 'scraping' | 'generating' | 'publishing' | 'done' | 'failed';

export interface BulkQueueItem {
  id: string;
  url: string;
  asin?: string;
  title: string;
  imageUrl: string;
  price: string;
  mrp?: string;
  discount: string;
  category: DealCategory;
  platform: 'amazon' | 'flipkart' | 'myntra' | 'other';
  selected: boolean;
  status: BulkItemStatus;
  errorMessage?: string;
  bloggerUrl?: string;
  telegramMessageId?: number;
}

export interface BulkExecutionProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  currentIndex: number;
  currentTitle?: string;
  phase: 'idle' | 'running' | 'paused' | 'finished';
}
