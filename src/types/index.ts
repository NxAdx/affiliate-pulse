export type DealCategory = 'electronics' | 'fashion' | 'general';

export interface ProductMetadata {
  originalUrl: string;
  canonicalUrl: string;
  affiliateUrl: string;
  platform: 'amazon' | 'flipkart' | 'myntra' | 'other';
  title: string;
  description: string;
  imageUrl: string;
  currentPrice: string;
  originalPrice?: string;
  discountPercent?: string;
  rating?: string;
  reviewsCount?: string;
  features: string[];
}

export interface GeneratedContent {
  category: DealCategory;
  // Funnel A: Electronics
  bloggerTitle?: string;
  bloggerHtmlBody?: string;
  telegramMarkdown?: string;
  whatsappMessage?: string;
  tweetText?: string;
  
  // Funnel B: Fashion
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
  bloggerAccessToken: string;
  telegramBotToken: string;
  telegramChannelId: string;
  pinterestBoardId: string;
}