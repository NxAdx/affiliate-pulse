import {
  BulkQueueItem,
  BulkExecutionProgress,
  BulkItemStatus,
  DealCategory,
  AppSettings,
  DealRecord,
  ProductMetadata,
  ChannelPublishStatus,
} from '../types';
import { DealHunterService, HuntedDeal } from './dealHunter';
import { ProductScraper } from './productScraper';
import { GeminiAiService } from './geminiAi';
import { BloggerService } from './bloggerApi';
import { TelegramService } from './telegramBot';

export class BulkSyndicationService {
  /**
   * Generates a unique collision-free ID for queue items
   */
  static generateId(): string {
    return 'bulk_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  }

  /**
   * Harvests fresh deals using DealHunterService and wraps them into BulkQueueItems
   */
  static async harvestDeals(options: {
    count: number;
    category?: DealCategory;
    minDiscount?: number;
    query?: string;
    associateTag?: string;
    postedAsins?: string[];
  }): Promise<BulkQueueItem[]> {
    const deals: HuntedDeal[] = await DealHunterService.huntTopDeals({
      count: options.count,
      category: options.category || 'all',
      minDiscount: options.minDiscount || 40,
      query: options.query,
      associateTag: options.associateTag || 'dealhunter-21',
      postedAsins: options.postedAsins || [],
    });

    return deals.map((deal) => ({
      id: this.generateId(),
      url: deal.affiliateUrl,
      asin: deal.asin,
      title: deal.title,
      imageUrl: deal.imageUrl,
      price: deal.price,
      mrp: deal.mrp,
      discount: deal.discount,
      category: deal.category,
      platform: 'amazon',
      selected: true,
      status: 'idle' as BulkItemStatus,
    }));
  }

  /**
   * Parses multiple raw URLs from a multi-line or comma-separated string
   */
  static parseRawUrls(rawText: string, defaultCategory: DealCategory = 'general'): BulkQueueItem[] {
    if (!rawText || !rawText.trim()) return [];

    const urlRegex = /(https?:\/\/[^\s"'<>]+)/gi;
    const matches = rawText.match(urlRegex) || [];
    const uniqueUrls = [...new Set(matches)];

    return uniqueUrls.map((url) => {
      let platform: 'amazon' | 'flipkart' | 'myntra' | 'other' = 'other';
      const lower = url.toLowerCase();
      if (lower.includes('amazon') || lower.includes('amzn.to')) platform = 'amazon';
      else if (lower.includes('flipkart') || lower.includes('fkrt.it')) platform = 'flipkart';
      else if (lower.includes('myntra')) platform = 'myntra';

      // Extract ASIN if Amazon
      const asinMatch = url.match(/(?:dp|gp\/product|\/d\/)\/([A-Z0-9]{10})/i);
      const asin = asinMatch ? asinMatch[1] : undefined;

      return {
        id: this.generateId(),
        url: url.trim(),
        asin,
        title: asin ? `Amazon Product (${asin})` : `Imported Deal (${platform})`,
        imageUrl: asin ? `https://m.media-amazon.com/images/P/${asin}.jpg` : '',
        price: '₹--',
        discount: 'Deal Alert',
        category: defaultCategory,
        platform,
        selected: true,
        status: 'idle' as BulkItemStatus,
      };
    });
  }

  /**
   * Processes a single queue item through the complete syndication pipeline
   */
  static async syndicateItem(
    item: BulkQueueItem,
    settings: AppSettings
  ): Promise<{
    success: boolean;
    record?: DealRecord;
    bloggerUrl?: string;
    telegramMessageId?: number;
    error?: string;
  }> {
    try {
      // 1. Scrape & Enrich Metadata
      let product: ProductMetadata;
      try {
        product = await ProductScraper.parseProductUrl(item.url, {
          amazon: settings.amazonAffiliateTag,
          flipkart: settings.flipkartAffiliateTag,
          earnkaro: settings.earnkaroToken,
        });
      } catch (err: any) {
        // Fallback to minimal metadata from queue item if live scraping hits a network issue
        product = {
          originalUrl: item.url,
          canonicalUrl: item.url,
          affiliateUrl: item.url,
          platform: item.platform,
          title: item.title,
          description: item.title,
          imageUrl: item.imageUrl,
          currentPrice: item.price !== '₹--' ? item.price : '₹999',
          originalPrice: item.mrp,
          discountPercent: item.discount,
          features: [],
        };
      }

      // 2. Generate Multi-Channel Copy via Gemini AI
      const gemini = new GeminiAiService(settings.geminiApiKey);
      const content = await gemini.generateOmnichannelDeal(product, item.category);

      const publishStatus: ChannelPublishStatus = {
        blogger: 'idle',
        telegram: 'idle',
        whatsapp: 'idle',
        pinterest: 'idle',
        x: 'idle',
      };

      let liveBloggerUrl: string | undefined;
      let telegramMessageId: number | undefined;

      // 3. Publish to Google Blogger (via Apps Script Webhook)
      if (content.bloggerHtmlBody && content.bloggerTitle) {
        publishStatus.blogger = 'pending';
        try {
          const blogRes = await BloggerService.publishPost(
            settings.bloggerBlogId,
            {
              title: content.bloggerTitle,
              content: content.bloggerHtmlBody,
              labels: [item.category, 'Product Review', 'Deals', 'Lowest Price'],
            },
            settings.bloggerWebhookUrl
          );

          if (blogRes.success) {
            publishStatus.blogger = 'success';
            liveBloggerUrl = blogRes.url;
          } else {
            publishStatus.blogger = 'failed';
          }
        } catch {
          publishStatus.blogger = 'failed';
        }
      }

      // 4. Broadcast to Telegram Deal Channel (if configured)
      if (
        settings.telegramBotToken?.trim() &&
        settings.telegramChannelId?.trim() &&
        content.telegramMarkdown
      ) {
        publishStatus.telegram = 'pending';
        try {
          const tgRes = await TelegramService.broadcastDeal(
            settings.telegramBotToken,
            settings.telegramChannelId,
            content.telegramMarkdown,
            product.imageUrl
          );

          if (tgRes.success) {
            publishStatus.telegram = 'success';
            telegramMessageId = tgRes.messageId;
          } else {
            publishStatus.telegram = 'failed';
          }
        } catch {
          publishStatus.telegram = 'failed';
        }
      }

      // 5. Create Deal Record for History
      const dealRecord: DealRecord = {
        id: this.generateId(),
        createdAt: new Date().toISOString(),
        category: item.category,
        product,
        content,
        status: publishStatus,
      };

      const overallSuccess =
        publishStatus.blogger === 'success' || publishStatus.telegram === 'success';

      return {
        success: overallSuccess,
        record: dealRecord,
        bloggerUrl: liveBloggerUrl,
        telegramMessageId,
        error: overallSuccess
          ? undefined
          : 'Neither Blogger nor Telegram published successfully.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Syndication failed',
      };
    }
  }

  /**
   * Helper delay promise for rate limiting
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Executes the batch queue sequentially with pacing and progress updates
   */
  static async executeBatch(
    queue: BulkQueueItem[],
    settings: AppSettings,
    callbacks: {
      onProgress: (progress: BulkExecutionProgress) => void;
      onItemUpdate: (updatedItem: BulkQueueItem, record?: DealRecord) => void;
      isAborted: () => boolean;
      delayBetweenDealsMs?: number;
    }
  ): Promise<BulkExecutionProgress> {
    const selectedItems = queue.filter((item) => item.selected && item.status !== 'done');
    const delay = callbacks.delayBetweenDealsMs ?? 3500;

    let successful = 0;
    let failed = 0;
    let completed = 0;

    const progress: BulkExecutionProgress = {
      total: selectedItems.length,
      completed: 0,
      successful: 0,
      failed: 0,
      currentIndex: 0,
      phase: 'running',
    };

    callbacks.onProgress({ ...progress });

    for (let i = 0; i < selectedItems.length; i++) {
      if (callbacks.isAborted()) {
        progress.phase = 'paused';
        callbacks.onProgress({ ...progress });
        break;
      }

      const item = selectedItems[i];
      progress.currentIndex = i + 1;
      progress.currentTitle = item.title;
      callbacks.onProgress({ ...progress });

      // Mark running
      callbacks.onItemUpdate({ ...item, status: 'generating' });

      // Syndicate
      const result = await this.syndicateItem(item, settings);

      if (result.success) {
        successful++;
        completed++;
        callbacks.onItemUpdate(
          {
            ...item,
            status: 'done',
            bloggerUrl: result.bloggerUrl,
            telegramMessageId: result.telegramMessageId,
            errorMessage: undefined,
          },
          result.record
        );
      } else {
        failed++;
        completed++;
        callbacks.onItemUpdate({
          ...item,
          status: 'failed',
          errorMessage: result.error,
        });
      }

      progress.completed = completed;
      progress.successful = successful;
      progress.failed = failed;
      callbacks.onProgress({ ...progress });

      // Pacing delay before next deal (only if more items remain and not aborted)
      if (i < selectedItems.length - 1 && !callbacks.isAborted()) {
        await this.sleep(delay);
      }
    }

    progress.phase = 'finished';
    callbacks.onProgress({ ...progress });
    return progress;
  }
}
