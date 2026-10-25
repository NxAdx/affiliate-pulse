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
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../theme';
import { ProductScraper } from '../../services/productScraper';
import { GeminiAiService } from '../../services/geminiAi';
import { BloggerService } from '../../services/bloggerApi';
import { TelegramService } from '../../services/telegramBot';
import { PinCardView } from '../../components/PinCardView';

export default function GeneratorScreen() {
  const [inputUrl, setInputUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const handlePasteClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setInputUrl(text.trim());
        setStatusMessage('Pasted link from clipboard');
      }
    } catch {
      setStatusMessage('Could not read clipboard');
    }
  };

  const handleCopyText = async (text: string, key: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

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

      // 3. Save to History (persisted via MMKV)
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
      {/* Top Engine Status Pill */}
      <View style={styles.topBar}>
        <View style={styles.engineBadge}>
          <Ionicons
            name={settings.geminiApiKey ? 'sparkles' : 'flash-outline'}
            size={13}
            color={settings.geminiApiKey ? theme.colors.primaryLight : theme.colors.accentWarning}
          />
          <Text style={styles.engineBadgeText}>
            {settings.geminiApiKey ? 'GEMINI 1.5 PRO' : 'SMART OFFLINE ENGINE'}
          </Text>
        </View>
        <View style={styles.vaultPill}>
          <Ionicons name="lock-closed" size={11} color={theme.colors.accentDeal} />
          <Text style={styles.vaultPillText}>MMKV VAULT</Text>
        </View>
      </View>

      {/* Category Pill Switcher */}
      <View style={styles.categoryRow}>
        <TouchableOpacity
          style={[
            styles.categoryPill,
            selectedCategory === 'electronics' && styles.categoryPillActive,
          ]}
          onPress={() => setSelectedCategory('electronics')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="hardware-chip-outline"
            size={16}
            color={selectedCategory === 'electronics' ? '#FFFFFF' : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.categoryPillText,
              selectedCategory === 'electronics' && styles.categoryPillTextActive,
            ]}
          >
            Tech & Deals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.categoryPill,
            selectedCategory === 'fashion' && styles.categoryPillFashionActive,
          ]}
          onPress={() => setSelectedCategory('fashion')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="shirt-outline"
            size={16}
            color={selectedCategory === 'fashion' ? '#FFFFFF' : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.categoryPillText,
              selectedCategory === 'fashion' && styles.categoryPillTextActive,
            ]}
          >
            Men's Fashion (Pin)
          </Text>
        </TouchableOpacity>
      </View>

      {/* URL Input Box */}
      <View style={styles.inputCard}>
        <View style={styles.inputLabelRow}>
          <Text style={styles.inputLabel}>Product URL / Deal Shortlink</Text>
          <TouchableOpacity onPress={handlePasteClipboard} style={styles.pasteBtn} activeOpacity={0.7}>
            <Ionicons name="clipboard-outline" size={13} color={theme.colors.primaryLight} />
            <Text style={styles.pasteBtnText}>Paste</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="link-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Paste amzn.to, fkrt.it, Amazon, Flipkart..."
            placeholderTextColor={theme.colors.textMuted}
            value={inputUrl}
            onChangeText={setInputUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {inputUrl ? (
            <TouchableOpacity onPress={() => setInputUrl('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={isProcessing}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.primaryButtonInner}>
              <Ionicons name="flash" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Generate Multi-Channel Deal</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Status feedback */}
      {statusMessage ? (
        <View style={styles.statusBox}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.primaryLight} />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : null}

      {/* Live Preview Area */}
      {activeContent && (
        <View style={styles.previewContainer}>
          {selectedCategory === 'fashion' ? (
            <View style={styles.fashionPreview}>
              <View style={styles.previewHeadingRow}>
                <Ionicons name="logo-pinterest" size={18} color={theme.colors.pinterest} />
                <Text style={styles.previewHeading}>Pinterest 2:3 Pin Preview</Text>
              </View>

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

              <View style={styles.tagWrap}>
                <Text style={styles.tagsText}>
                  {activeContent.pinterestTags?.join(' ')}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.electronicsPreview}>
              <View style={styles.previewHeadingRow}>
                <Ionicons name="layers-outline" size={18} color={theme.colors.primaryLight} />
                <Text style={styles.previewHeading}>Multi-Channel Syndication Ready</Text>
              </View>

              {/* Card 1: WhatsApp Channel Alert */}
              <View style={styles.channelCard}>
                <View style={styles.channelCardHeader}>
                  <View style={styles.channelTitleRow}>
                    <Ionicons name="logo-whatsapp" size={18} color={theme.colors.whatsapp} />
                    <Text style={styles.channelTitle}>WhatsApp Channel Message</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copySmallBtn}
                    onPress={() => handleCopyText(activeContent.whatsappMessage || '', 'whatsapp')}
                  >
                    <Ionicons
                      name={copiedKey === 'whatsapp' ? 'checkmark' : 'copy-outline'}
                      size={13}
                      color={theme.colors.primaryLight}
                    />
                    <Text style={styles.copySmallBtnText}>
                      {copiedKey === 'whatsapp' ? 'Copied' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.previewCopyText}>{activeContent.whatsappMessage}</Text>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.whatsapp }]}
                  onPress={handleShareWhatsApp}
                  activeOpacity={0.85}
                >
                  <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Share to WhatsApp</Text>
                </TouchableOpacity>
              </View>

              {/* Card 2: Telegram Deal Channel */}
              <View style={styles.channelCard}>
                <View style={styles.channelCardHeader}>
                  <View style={styles.channelTitleRow}>
                    <Ionicons name="paper-plane-outline" size={18} color={theme.colors.telegram} />
                    <Text style={styles.channelTitle}>Telegram Channel Alert</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copySmallBtn}
                    onPress={() => handleCopyText(activeContent.telegramMarkdown || '', 'telegram')}
                  >
                    <Ionicons
                      name={copiedKey === 'telegram' ? 'checkmark' : 'copy-outline'}
                      size={13}
                      color={theme.colors.primaryLight}
                    />
                    <Text style={styles.copySmallBtnText}>
                      {copiedKey === 'telegram' ? 'Copied' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.previewCopyText} numberOfLines={4}>
                  {activeContent.telegramMarkdown}
                </Text>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.telegram }]}
                  onPress={handleBroadcastTelegram}
                  activeOpacity={0.85}
                >
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Broadcast to Telegram Channel</Text>
                </TouchableOpacity>
              </View>

              {/* Card 3: Google Blogger (Blogspot) */}
              <View style={styles.channelCard}>
                <View style={styles.channelCardHeader}>
                  <View style={styles.channelTitleRow}>
                    <Ionicons name="newspaper-outline" size={18} color={theme.colors.blogger} />
                    <Text style={styles.channelTitle}>SEO 500-Word Article</Text>
                  </View>
                </View>
                <Text style={styles.previewArticleTitle}>{activeContent.bloggerTitle}</Text>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.blogger }]}
                  onPress={handlePublishBlogger}
                  activeOpacity={0.85}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Publish to Blogspot</Text>
                </TouchableOpacity>
              </View>

              {/* Card 4: X / Twitter */}
              <View style={styles.channelCard}>
                <View style={styles.channelCardHeader}>
                  <View style={styles.channelTitleRow}>
                    <Ionicons name="logo-twitter" size={18} color={theme.colors.primaryLight} />
                    <Text style={styles.channelTitle}>X (Twitter) Deal Hook</Text>
                  </View>
                </View>
                <Text style={styles.previewCopyText}>{activeContent.tweetText}</Text>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#1E293B', borderWidth: 1, borderColor: theme.colors.borderSubtle }]}
                  onPress={handleShareX}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-twitter" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Post to X</Text>
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
    paddingBottom: 48,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  engineBadgeText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xxs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  vaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.accentDealGlow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  vaultPillText: {
    color: theme.colors.accentDeal,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  categoryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radii.md,
    paddingVertical: 12,
  },
  categoryPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
    ...theme.shadows.glowPrimary,
  },
  categoryPillFashionActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondaryLight,
    ...theme.shadows.glowSecondary,
  },
  categoryPillText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.card,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.xs,
  },
  pasteBtnText: {
    color: theme.colors.primaryLight,
    fontSize: theme.typography.sizes.xxs,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    paddingVertical: 12,
    fontSize: theme.typography.sizes.sm,
  },
  clearBtn: {
    padding: 4,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.glowPrimary,
  },
  primaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 16,
  },
  statusText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '500',
    flex: 1,
  },
  previewContainer: {
    marginTop: 8,
  },
  fashionPreview: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 16,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  previewHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  previewHeading: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pinCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  tagWrap: {
    marginTop: 12,
    backgroundColor: theme.colors.background,
    padding: 10,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    width: '100%',
  },
  tagsText: {
    color: theme.colors.secondaryLight,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  electronicsPreview: {
    gap: 14,
  },
  channelCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 16,
    ...theme.shadows.card,
  },
  channelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
  },
  copySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.xs,
  },
  copySmallBtnText: {
    color: theme.colors.primaryLight,
    fontSize: theme.typography.sizes.xxs,
    fontWeight: '700',
  },
  previewCopyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    lineHeight: 18,
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 12,
  },
  previewArticleTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: theme.radii.md,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: theme.typography.sizes.sm,
    letterSpacing: 0.2,
  },
});