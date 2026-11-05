import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../theme';
import { ProductScraper } from '../../services/productScraper';
import { GeminiAiService } from '../../services/geminiAi';
import { BloggerService } from '../../services/bloggerApi';
import { TelegramService } from '../../services/telegramBot';
import { DealHunterService } from '../../services/dealHunter';
import { DealCategory, ProductMetadata, GeneratedContent } from '../../types';
import BulkSyndicationView from '../../components/BulkSyndicationView';
import { DealInputBar } from '../../components/DealInputBar';
import { DealHeroCard } from '../../components/DealHeroCard';
import { DealTuningModal } from '../../components/DealTuningModal';
import { PinterestStudioCard } from '../../components/PinterestStudioCard';
import { BloggerStudioCard } from '../../components/BloggerStudioCard';
import { BroadcastStudioCard } from '../../components/BroadcastStudioCard';
import { CinematicPresetKey } from '../../services/cinematicStudio';

type ChannelTab = 'pinterest' | 'blogger' | 'telegram' | 'whatsapp' | 'x';

export default function GeneratorScreen() {
  const [generatorMode, setGeneratorMode] = useState<'single' | 'bulk'>('single');
  const [inputUrl, setInputUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isCopiedAffiliateUrl, setIsCopiedAffiliateUrl] = useState(false);

  // Active Deal Data
  const [activeProduct, setActiveProduct] = useState<ProductMetadata | null>(null);
  const [activeContent, setActiveContent] = useState<GeneratedContent | null>(null);

  // Custom Tuning State
  const [customTitle, setCustomTitle] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customMrp, setCustomMrp] = useState('');
  const [customDiscount, setCustomDiscount] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isTuningModalVisible, setIsTuningModalVisible] = useState(false);

  // Channel Tabs & Pinterest State
  const [activeChannelTab, setActiveChannelTab] = useState<ChannelTab>('pinterest');
  const [selectedPresetKey, setSelectedPresetKey] = useState<CinematicPresetKey>('dark_luxury_watch');
  const [pinterestStatusMsg, setPinterestStatusMsg] = useState('');

  // Publishing State
  const [isPublishingBlogger, setIsPublishingBlogger] = useState(false);
  const [bloggerSuccessUrl, setBloggerSuccessUrl] = useState<string | null>(null);
  const [isBroadcastingTelegram, setIsBroadcastingTelegram] = useState(false);

  const pinCardRef = useRef<any>(null);
  const sessionHuntedAsinsRef = useRef<Set<string>>(new Set());

  const { settings, dealsHistory, addDealToHistory, bulkQueue } = useAppStore();

  // Load latest deal on mount if available
  useEffect(() => {
    if (dealsHistory.length > 0 && !activeProduct) {
      const latest = dealsHistory[0];
      setActiveProduct(latest.product);
      setActiveContent(latest.content);
      setCustomTitle(latest.product.title);
      setCustomPrice(latest.product.currentPrice);
      setCustomMrp(latest.product.originalPrice || '');
      setCustomDiscount(latest.product.discountPercent || '');
      setCustomImageUrl(latest.product.imageUrl || '');
      setInputUrl(latest.product.originalUrl || latest.product.affiliateUrl || '');
    }
  }, []);

  // --- Handlers ---

  const handleGenerate = async () => {
    if (!inputUrl.trim()) {
      setStatusMessage('Please paste an Amazon, Flipkart or Myntra link');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Extracting pricing, HD image & generating promotional copy...');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const product = await ProductScraper.parseProductUrl(inputUrl.trim(), {
        amazon: settings.amazonAffiliateTag,
        flipkart: settings.flipkartAffiliateTag,
        earnkaro: settings.earnkaroToken,
      });

      setCustomTitle(product.title);
      setCustomPrice(product.currentPrice);
      setCustomMrp(product.originalPrice || '₹2,999');
      setCustomDiscount(product.discountPercent || '40% OFF');
      setCustomImageUrl(product.imageUrl);
      setActiveProduct(product);
      setBloggerSuccessUrl(null);

      const gemini = new GeminiAiService(settings.geminiApiKey);
      const content = await gemini.generateOmnichannelDeal(product, 'all');
      setActiveContent(content);

      addDealToHistory({
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        category: 'all',
        product,
        content,
        status: {},
      });

      setStatusMessage('Omnichannel deal ready for all platforms!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.message || 'Failed to process product'}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoHunt = async (
    category: DealCategory,
    minDiscount: number,
    keyword?: string
  ) => {
    setIsProcessing(true);
    const searchTarget = keyword ? `"${keyword}"` : `${category.toUpperCase()} deals`;
    setStatusMessage(`Hunting Amazon India for ${searchTarget} (≥${minDiscount}% OFF)...`);

    try {
      const historyAsins = (dealsHistory || [])
        .map((d) => d.product.asin)
        .filter((a): a is string => Boolean(a));

      const excludedAsins = Array.from(
        new Set([
          ...historyAsins,
          ...Array.from(sessionHuntedAsinsRef.current),
          activeProduct?.asin,
        ].filter((a): a is string => Boolean(a)))
      );

      const deal = await DealHunterService.huntTopDeal(
        excludedAsins,
        settings.amazonAffiliateTag || 'dealhunter-21',
        category,
        keyword,
        minDiscount
      );

      if (!deal) {
        setStatusMessage('No unseen deals found matching discount threshold.');
        Alert.alert(
          'Deal Hunt Complete',
          `No unseen deals found matching ${minDiscount}%+ OFF right now. Try lowering the discount filter!`
        );
        return;
      }

      sessionHuntedAsinsRef.current.add(deal.asin);

      setInputUrl(deal.affiliateUrl);
      setCustomTitle(deal.title);
      setCustomPrice(deal.price);
      setCustomMrp(deal.mrp || '');
      setCustomDiscount(deal.discount);
      setCustomImageUrl(deal.imageUrl);

      const product: ProductMetadata = {
        originalUrl: deal.affiliateUrl,
        canonicalUrl: deal.affiliateUrl,
        affiliateUrl: deal.affiliateUrl,
        platform: 'amazon',
        title: deal.title,
        description: `${deal.title} - ${deal.discount} OFF on Amazon`,
        imageUrl: deal.imageUrl,
        currentPrice: deal.price,
        originalPrice: deal.mrp,
        discountPercent: deal.discount,
        asin: deal.asin,
        features: [`${deal.discount} Discount Deal`, 'Verified Top Rated Item'],
      };

      setActiveProduct(product);
      setBloggerSuccessUrl(null);

      setStatusMessage(`Found ${deal.discount} OFF: Generating copy...`);
      const gemini = new GeminiAiService(settings.geminiApiKey);
      const content = await gemini.generateOmnichannelDeal(product, category);
      setActiveContent(content);

      addDealToHistory({
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        category,
        product,
        content,
        status: {},
      });

      setStatusMessage('Deal captured & syndicated!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setStatusMessage(`Hunt error: ${err?.message || 'Failed'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyAffiliateUrl = async () => {
    const url = activeProduct?.affiliateUrl || inputUrl;
    if (url) {
      await Clipboard.setStringAsync(url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsCopiedAffiliateUrl(true);
      setTimeout(() => setIsCopiedAffiliateUrl(false), 2500);
    }
  };

  const handlePublishBlogger = async () => {
    if (!activeContent?.bloggerHtmlBody || !activeContent.bloggerTitle) return;
    setIsPublishingBlogger(true);
    setStatusMessage('Publishing to Blogger...');
    try {
      const result = await BloggerService.publishPost(
        settings.bloggerBlogId,
        {
          title: activeContent.bloggerTitle,
          content: activeContent.bloggerHtmlBody,
        },
        settings.bloggerWebhookUrl
      );
      if (result.success) {
        setBloggerSuccessUrl(result.url || null);
        setStatusMessage('Published article to GadgetNX!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setStatusMessage(`Blogger: ${result.error || 'Failed'}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e: any) {
      setStatusMessage(`Blogger error: ${e?.message || 'Failed'}`);
    } finally {
      setIsPublishingBlogger(false);
    }
  };

  const handleBroadcastTelegram = async () => {
    if (!activeContent?.telegramMarkdown) return;
    if (!settings.telegramBotToken?.trim() || !settings.telegramChannelId?.trim()) {
      Alert.alert(
        'Telegram Setup Required',
        'Please enter your Telegram Bot Token & Channel ID in Settings first.'
      );
      return;
    }

    setIsBroadcastingTelegram(true);
    setStatusMessage('Broadcasting to Telegram...');
    try {
      const result = await TelegramService.broadcastDeal(
        settings.telegramBotToken,
        settings.telegramChannelId,
        activeContent.telegramMarkdown,
        customImageUrl || activeProduct?.imageUrl
      );
      if (result.success) {
        setStatusMessage('Broadcast to Telegram Channel successfully!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setStatusMessage(`Telegram Error: ${result.error}`);
        Alert.alert('Telegram Error', result.error || 'Failed');
      }
    } finally {
      setIsBroadcastingTelegram(false);
    }
  };

  const handleExportPin = async () => {
    if (!pinCardRef.current) return;
    try {
      setIsProcessing(true);
      setStatusMessage('Exporting high-res 2:3 Pin Graphic (1000x1500)...');
      const uri = await captureRef(pinCardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Pin Graphic',
        });
      }
      setStatusMessage('Pin graphic exported!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setStatusMessage(`Export error: ${err?.message || 'Failed'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!activeContent?.whatsappMessage) return;
    const url = `whatsapp://send?text=${encodeURIComponent(activeContent.whatsappMessage)}`;
    Linking.openURL(url).catch(() => {
      Share.share({ message: activeContent.whatsappMessage || '' });
    });
  };

  const handleShareX = () => {
    if (!activeContent?.tweetText) return;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(activeContent.tweetText)}`;
    Linking.openURL(url);
  };

  const handleShareTelegramDirect = async () => {
    if (!activeContent?.telegramMarkdown) return;
    const url = `https://t.me/share/url?url=${encodeURIComponent(
      activeProduct?.affiliateUrl || ''
    )}&text=${encodeURIComponent(activeContent.telegramMarkdown)}`;
    Linking.openURL(url).catch(() => {
      Share.share({ message: activeContent.telegramMarkdown || '' });
    });
  };

  const CHANNEL_TABS: { key: ChannelTab; label: string; icon: string }[] = [
    { key: 'pinterest', label: 'Pinterest', icon: 'logo-pinterest' },
    { key: 'blogger', label: 'Blogger', icon: 'newspaper-outline' },
    { key: 'telegram', label: 'Telegram', icon: 'paper-plane-outline' },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
    { key: 'x', label: 'X (Twitter)', icon: 'logo-twitter' },
  ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.rootContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top High-Velocity Mode Segment */}
      <View style={styles.modeSegment}>
        <TouchableOpacity
          style={[styles.modeTab, generatorMode === 'single' && styles.modeTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setGeneratorMode('single');
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="flash-outline"
            size={14}
            color={generatorMode === 'single' ? '#FFFFFF' : theme.colors.textSecondary}
          />
          <Text style={[styles.modeTabText, generatorMode === 'single' && styles.modeTabTextActive]}>
            Single Deal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, generatorMode === 'bulk' && styles.modeTabActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setGeneratorMode('bulk');
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="layers-outline"
            size={14}
            color={generatorMode === 'bulk' ? '#FFFFFF' : theme.colors.textSecondary}
          />
          <Text style={[styles.modeTabText, generatorMode === 'bulk' && styles.modeTabTextActive]}>
            Bulk Syndicator
          </Text>
          {bulkQueue.length > 0 && (
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{bulkQueue.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Render Mode A: Bulk Auto-Syndicator */}
      {generatorMode === 'bulk' ? (
        <BulkSyndicationView />
      ) : (
        /* Render Mode B: Single Deal Orchestrator */
        <>
          {/* Universal Input Bar */}
          <DealInputBar
            inputUrl={inputUrl}
            onChangeUrl={setInputUrl}
            onGenerate={handleGenerate}
            onAutoHunt={handleAutoHunt}
            isProcessing={isProcessing}
            statusMessage={statusMessage}
          />

          {/* Deal Hero Preview Card */}
          {activeProduct && (
            <>
              <DealHeroCard
                product={activeProduct}
                customTitle={customTitle}
                customPrice={customPrice}
                customMrp={customMrp}
                customDiscount={customDiscount}
                customImageUrl={customImageUrl}
                onOpenTuning={() => setIsTuningModalVisible(true)}
                onCopyAffiliateUrl={handleCopyAffiliateUrl}
                isCopiedUrl={isCopiedAffiliateUrl}
              />

              {/* Clean Segmented Channel Switcher */}
              <View style={styles.channelBarWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.channelBarScroll}
                >
                  {CHANNEL_TABS.map((tab) => {
                    const active = activeChannelTab === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[styles.channelTab, active && styles.channelTabActive]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setActiveChannelTab(tab.key);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={tab.icon as any}
                          size={13}
                          color={active ? '#FFFFFF' : theme.colors.textSecondary}
                        />
                        <Text style={[styles.channelTabText, active && styles.channelTabTextActive]}>
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Dedicated Channel Studio Content (Progressive Disclosure) */}
              {activeChannelTab === 'pinterest' && (
                <PinterestStudioCard
                  pinCardRef={pinCardRef}
                  title={customTitle || activeContent?.pinterestTitle || activeProduct.title}
                  price={customPrice || activeProduct.currentPrice}
                  originalPrice={customMrp || activeProduct.originalPrice}
                  discountPercent={customDiscount || activeProduct.discountPercent}
                  imageUrl={customImageUrl || activeProduct.imageUrl}
                  affiliateUrl={activeProduct.affiliateUrl}
                  platform={activeProduct.platform}
                  selectedPresetKey={selectedPresetKey}
                  onSelectPreset={setSelectedPresetKey}
                  targetBoardUrl={settings.pinterestBoardId}
                  onImageChanged={(newUrl) => {
                    setCustomImageUrl(newUrl);
                    setPinterestStatusMsg('Applied new cinematic image!');
                  }}
                  onExportGraphic={handleExportPin}
                  statusMessage={pinterestStatusMsg}
                />
              )}

              {activeChannelTab === 'blogger' && (
                <BloggerStudioCard
                  title={activeContent?.bloggerTitle}
                  htmlContent={activeContent?.bloggerHtmlBody}
                  isPublishing={isPublishingBlogger}
                  publishSuccessUrl={bloggerSuccessUrl}
                  onPublish={handlePublishBlogger}
                  blogId={settings.bloggerBlogId}
                />
              )}

              {activeChannelTab === 'telegram' && (
                <BroadcastStudioCard
                  platform="telegram"
                  title="Telegram Channel Deal Alert"
                  copyText={activeContent?.telegramMarkdown}
                  isBroadcasting={isBroadcastingTelegram}
                  onPrimaryAction={handleBroadcastTelegram}
                  onSecondaryAction={handleShareTelegramDirect}
                  onSystemShare={() =>
                    Share.share({
                      message: activeContent?.telegramMarkdown || '',
                      title: 'Telegram Deal Alert',
                    })
                  }
                />
              )}

              {activeChannelTab === 'whatsapp' && (
                <BroadcastStudioCard
                  platform="whatsapp"
                  title="WhatsApp Deal Broadcast"
                  copyText={activeContent?.whatsappMessage}
                  onPrimaryAction={handleShareWhatsApp}
                  onSystemShare={() =>
                    Share.share({
                      message: activeContent?.whatsappMessage || '',
                      title: 'WhatsApp Deal Broadcast',
                    })
                  }
                />
              )}

              {activeChannelTab === 'x' && (
                <BroadcastStudioCard
                  platform="x"
                  title="X (Twitter) Deal Hook"
                  copyText={activeContent?.tweetText}
                  onPrimaryAction={handleShareX}
                  onSystemShare={() =>
                    Share.share({
                      message: activeContent?.tweetText || '',
                      title: 'X Deal Hook',
                    })
                  }
                />
              )}
            </>
          )}

          {/* Deal Tuning Bottom Sheet Modal */}
          <DealTuningModal
            visible={isTuningModalVisible}
            onClose={() => setIsTuningModalVisible(false)}
            initialTitle={customTitle}
            initialImageUrl={customImageUrl}
            initialPrice={customPrice}
            initialMrp={customMrp}
            initialDiscount={customDiscount}
            onApply={(data) => {
              setCustomTitle(data.title);
              setCustomImageUrl(data.imageUrl);
              setCustomPrice(data.price);
              setCustomMrp(data.mrp);
              setCustomDiscount(data.discount);
            }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  rootContent: {
    padding: 14,
    paddingBottom: 40,
  },
  modeSegment: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 3,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    borderCurve: 'continuous',
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: theme.colors.primary,
  },
  modeTabText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.semibold,
  },
  badgePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
  },
  badgePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  channelBarWrapper: {
    marginBottom: 10,
  },
  channelBarScroll: {
    gap: 6,
  },
  channelTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderCurve: 'continuous',
    gap: 6,
  },
  channelTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  channelTabText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
  },
  channelTabTextActive: {
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.semibold,
  },
});
