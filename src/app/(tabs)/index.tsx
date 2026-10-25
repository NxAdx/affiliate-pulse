import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Share,
} from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../theme';
import { ProductScraper } from '../../services/productScraper';
import { GeminiAiService } from '../../services/geminiAi';
import { BloggerService } from '../../services/bloggerApi';
import { TelegramService } from '../../services/telegramBot';
import { PinCardView } from '../../components/PinCardView';
import { DealCategory } from '../../types';

export default function GeneratorScreen() {
  const [inputUrl, setInputUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const {
    selectedCategory,
    setSelectedCategory,
    activeProduct,
    setActiveProduct,
    activeContent,
    setActiveContent,
    isProcessing,
    setIsProcessing,
    settings,
    addDealToHistory,
  } = useAppStore();

  const handleGenerate = async () => {
    if (!inputUrl.trim()) {
      setStatusMessage('Please paste an Amazon, Flipkart or Myntra link');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Resolving link & extracting metadata...');

    try {
      // 1. Scrape & resolve URL
      const product = await ProductScraper.parseProductUrl(inputUrl.trim(), {
        amazon: settings.amazonAffiliateTag,
        flipkart: settings.flipkartAffiliateTag,
        earnkaro: settings.earnkaroToken,
      });
      setActiveProduct(product);

      // 2. Feed into Gemini AI
      setStatusMessage('Gemini AI generating multi-channel copy...');
      const gemini = new GeminiAiService(settings.geminiApiKey);

      let content;
      if (selectedCategory === 'electronics') {
        content = await gemini.generateElectronicsDeal(product);
      } else {
        content = await gemini.generateFashionPin(product);
      }
      setActiveContent(content);

      // 3. Save to History
      addDealToHistory({
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        category: selectedCategory,
        product,
        content,
        status: {},
      });

      setStatusMessage('Deal generated successfully!');
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.message || 'Failed to process product'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublishBlogger = async () => {
    if (!activeContent?.bloggerHtmlBody || !activeContent.bloggerTitle) return;
    setStatusMessage('Publishing to Blogger...');
    const result = await BloggerService.publishPost(
      settings.bloggerBlogId,
      settings.bloggerAccessToken,
      {
        title: activeContent.bloggerTitle,
        content: activeContent.bloggerHtmlBody,
      }
    );
    if (result.success) {
      setStatusMessage(`Published to Blogger: ${result.url || 'Live'}`);
    } else {
      setStatusMessage(`Blogger Error: ${result.error}`);
    }
  };

  const handleBroadcastTelegram = async () => {
    if (!activeContent?.telegramMarkdown) return;
    setStatusMessage('Broadcasting to Telegram...');
    const result = await TelegramService.broadcastDeal(
      settings.telegramBotToken,
      settings.telegramChannelId,
      activeContent.telegramMarkdown,
      activeProduct?.imageUrl
    );
    if (result.success) {
      setStatusMessage('Broadcast to Telegram Channel successfully!');
    } else {
      setStatusMessage(`Telegram Error: ${result.error}`);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Category Pill Switcher */}
      <View style={styles.categoryRow}>
        <TouchableOpacity
          style={[
            styles.categoryPill,
            selectedCategory === 'electronics' && styles.categoryPillActive,
          ]}
          onPress={() => setSelectedCategory('electronics')}
        >
          <Text
            style={[
              styles.categoryPillText,
              selectedCategory === 'electronics' && styles.categoryPillTextActive,
            ]}
          >
            ⚡ Tech & Electronics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.categoryPill,
            selectedCategory === 'fashion' && styles.categoryPillFashionActive,
          ]}
          onPress={() => setSelectedCategory('fashion')}
        >
          <Text
            style={[
              styles.categoryPillText,
              selectedCategory === 'fashion' && styles.categoryPillTextActive,
            ]}
          >
            👔 Men's Fashion (Pinterest)
          </Text>
        </TouchableOpacity>
      </View>

      {/* URL Input Box */}
      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>Product URL (Amazon / Flipkart / Myntra)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Paste deal link or shortlink here..."
          placeholderTextColor={theme.colors.textMuted}
          value={inputUrl}
          onChangeText={setInputUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Generate Multi-Channel Deal</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Status feedback */}
      {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}

      {/* Live Preview Area */}
      {activeContent && (
        <View style={styles.previewContainer}>
          {selectedCategory === 'fashion' ? (
            <View style={styles.fashionPreview}>
              <Text style={styles.previewHeading}>Pinterest 2:3 Pin Preview</Text>
              <View style={styles.pinCenterWrap}>
                <PinCardView
                  title={activeContent.pinterestTitle || activeProduct?.title || ''}
                  badgeText={activeContent.pinBadgeText || 'MUST HAVE'}
                  priceTag={activeContent.pinPriceTag || activeProduct?.currentPrice || '₹999'}
                  originalPrice={activeProduct?.originalPrice}
                  discountPercent={activeProduct?.discountPercent}
                  imageUrl={activeProduct?.imageUrl || ''}
                  platform={activeProduct?.platform}
                />
              </View>
              <Text style={styles.tagsText}>
                {activeContent.pinterestTags?.join(' ')}
              </Text>
            </View>
          ) : (
            <View style={styles.electronicsPreview}>
              <Text style={styles.previewHeading}>SEO Review & Deal Channels</Text>
              <Text style={styles.previewTitle}>{activeContent.bloggerTitle}</Text>

              {/* Action Buttons */}
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.blogger }]}
                  onPress={handlePublishBlogger}
                >
                  <Text style={styles.actionBtnText}>Publish to Blogspot</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.telegram }]}
                  onPress={handleBroadcastTelegram}
                >
                  <Text style={styles.actionBtnText}>Broadcast to Telegram</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.whatsapp }]}
                  onPress={handleShareWhatsApp}
                >
                  <Text style={styles.actionBtnText}>Share to WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.x }]}
                  onPress={handleShareX}
                >
                  <Text style={styles.actionBtnText}>Share on X</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  categoryPill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    alignItems: 'center',
  },
  categoryPillActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryLight,
  },
  categoryPillFashionActive: {
    backgroundColor: '#9D174D',
    borderColor: theme.colors.secondary,
  },
  categoryPillText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  inputCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    marginBottom: 16,
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    marginBottom: 8,
    fontWeight: theme.typography.weights.medium,
  },
  textInput: {
    backgroundColor: theme.colors.background,
    color: theme.colors.textPrimary,
    padding: 12,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    fontSize: theme.typography.sizes.base,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    ...theme.shadows.glowPrimary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
  },
  statusText: {
    color: theme.colors.accentWarning,
    textAlign: 'center',
    marginBottom: 16,
    fontSize: theme.typography.sizes.sm,
  },
  previewContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  previewHeading: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  fashionPreview: {
    alignItems: 'center',
  },
  pinCenterWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  tagsText: {
    color: theme.colors.secondary,
    fontSize: theme.typography.sizes.xs,
    marginTop: 8,
    textAlign: 'center',
  },
  electronicsPreview: {},
  previewTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    marginBottom: 16,
  },
  actionGrid: {
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: theme.radii.md,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.base,
  },
});