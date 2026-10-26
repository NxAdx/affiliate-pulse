import React, { useState, useRef } from 'react';
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
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
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

  // Editable deal tuning fields
  const [customTitle, setCustomTitle] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customMrp, setCustomMrp] = useState('');
  const [customDiscount, setCustomDiscount] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isTuningVisible, setIsTuningVisible] = useState(false);

  // Active channel view filter (Buffer / Publer inspiration)
  const [activeChannelTab, setActiveChannelTab] = useState<'all' | 'whatsapp' | 'telegram' | 'blogger' | 'x'>('all');

  const pinCardRef = useRef<View>(null);

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

  const handleCopyText = async (text: string, key: string, label?: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedKey(key);
    setStatusMessage(label || 'Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleGenerate = async () => {
    if (!inputUrl.trim()) {
      setStatusMessage('Please paste an Amazon, Flipkart or Myntra link');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Resolving link & fetching real product image/pricing...');

    try {
      // 1. Scrape & resolve URL (uses official Amazon CDN for real product image)
      const product = await ProductScraper.parseProductUrl(inputUrl.trim(), {
        amazon: settings.amazonAffiliateTag,
        flipkart: settings.flipkartAffiliateTag,
        earnkaro: settings.earnkaroToken,
      });

      // Synchronize editable customizer states
      setCustomTitle(product.title);
      setCustomPrice(product.currentPrice);
      setCustomMrp(product.originalPrice || '₹3,999');
      setCustomDiscount(product.discountPercent || '50% OFF');
      setCustomImageUrl(product.imageUrl);
      setActiveProduct(product);

      // 2. Feed into Gemini AI for lengthy 1200+ word review and viral deal copy
      setStatusMessage('Gemini AI generating 1200+ word review & channel copy...');
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

      setStatusMessage('Deal generated successfully with real product imagery!');
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.message || 'Failed to process product'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-sync copy when user customizes price, image or title in UI
  const handleApplyCustomTuning = () => {
    if (!activeProduct) return;

    const updatedProduct = {
      ...activeProduct,
      title: customTitle.trim() || activeProduct.title,
      imageUrl: customImageUrl.trim() || activeProduct.imageUrl,
      currentPrice: customPrice.trim().startsWith('₹') ? customPrice.trim() : `₹${customPrice.trim()}`,
      originalPrice: customMrp.trim().startsWith('₹') ? customMrp.trim() : `₹${customMrp.trim()}`,
      discountPercent: customDiscount.trim() || activeProduct.discountPercent,
    };

    setActiveProduct(updatedProduct);

    // Update activeContent with new image, prices & title
    if (activeContent) {
      const gemini = new GeminiAiService(settings.geminiApiKey);
      if (selectedCategory === 'electronics') {
        const refreshed = gemini.generateFallbackElectronics(updatedProduct);
        setActiveContent({
          ...activeContent,
          bloggerTitle: `${updatedProduct.title} Review & Lowest Price Deal (2026)`,
          bloggerHtmlBody: refreshed.bloggerHtmlBody,
          telegramMarkdown: refreshed.telegramMarkdown,
          whatsappMessage: refreshed.whatsappMessage,
          tweetText: refreshed.tweetText,
        });
      } else {
        const refreshed = gemini.generateFallbackFashion(updatedProduct);
        setActiveContent({
          ...activeContent,
          pinterestTitle: `Stylist Pick: ${updatedProduct.title.slice(0, 50)}`,
          pinPriceTag: updatedProduct.currentPrice,
        });
      }
    }

    setStatusMessage('Updated real product image & pricing across all channels!');
  };

  // Pinterest 2:3 Pin Export via react-native-view-shot & expo-sharing
  const handleExportPin = async () => {
    if (!pinCardRef.current) {
      setStatusMessage('Pin card view not ready for export');
      return;
    }

    try {
      setIsProcessing(true);
      setStatusMessage('Rendering high-res 2:3 Pin Graphic (1000x1500)...');

      const uri = await captureRef(pinCardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Pin to Pinterest / Socials',
        });
        setStatusMessage('Pin graphic exported successfully!');
      } else {
        setStatusMessage(`Pin saved to: ${uri}`);
      }
    } catch (err: any) {
      setStatusMessage(`Export Error: ${err?.message || 'Failed to capture pin'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenPinterest = () => {
    Linking.openURL('pinterest://').catch(() => {
      Linking.openURL('https://pinterest.com');
    });
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
      setStatusMessage(`Blogger: ${result.error}`);
    }
  };

  const handleOpenBloggerEditor = () => {
    const url = BloggerService.getWebEditorUrl(settings.bloggerBlogId);
    Linking.openURL(url);
  };

  const handlePublishViaEmail = () => {
    if (!settings.bloggerEmail || !activeContent?.bloggerHtmlBody) return;
    const mailto = `mailto:${settings.bloggerEmail}?subject=${encodeURIComponent(
      activeContent.bloggerTitle || 'Product Review'
    )}&body=${encodeURIComponent(activeContent.bloggerHtmlBody)}`;
    Linking.openURL(mailto).catch(() => {
      setStatusMessage('Could not launch email client');
    });
  };

  const handleBroadcastTelegram = async () => {
    if (!activeContent?.telegramMarkdown) return;

    if (!settings.telegramBotToken?.trim() || !settings.telegramChannelId?.trim()) {
      Alert.alert(
        'Telegram Setup Required',
        'Please enter and save your Telegram Bot Token and Channel ID in the Settings tab first.'
      );
      setStatusMessage('Telegram Bot Token or Channel ID missing in Settings');
      return;
    }

    setStatusMessage('Broadcasting to Telegram...');
    const result = await TelegramService.broadcastDeal(
      settings.telegramBotToken,
      settings.telegramChannelId,
      activeContent.telegramMarkdown,
      customImageUrl || activeProduct?.imageUrl
    );
    if (result.success) {
      setStatusMessage('Broadcast to Telegram Channel successfully!');
      Alert.alert('Success 🎉', 'Deal alert has been broadcast to your Telegram channel!');
    } else {
      setStatusMessage(`Telegram Error: ${result.error}`);
      Alert.alert('Telegram Error', result.error || 'Failed to broadcast to Telegram.');
    }
  };

  const handleShareTelegramDirect = async () => {
    if (!activeContent?.telegramMarkdown) return;
    const text = activeContent.telegramMarkdown;
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(
      activeProduct?.affiliateUrl || ''
    )}&text=${encodeURIComponent(text)}`;

    try {
      const supported = await Linking.canOpenURL(telegramShareUrl);
      if (supported) {
        await Linking.openURL(telegramShareUrl);
      } else {
        await Share.share({ message: text, title: 'Share Deal to Telegram' });
      }
    } catch {
      await Share.share({ message: text, title: 'Share Deal to Telegram' });
    }
  };

  const handleShareSystem = async (text: string, title: string = 'Affiliate Pulse Deal') => {
    try {
      await Share.share({ message: text, title });
    } catch {
      setStatusMessage('Share cancelled');
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

      {/* Interactive Deal Customizer / Live Price & Image Tuning Box */}
      {activeProduct && (
        <View style={styles.tuningCard}>
          <TouchableOpacity
            style={styles.tuningHeader}
            onPress={() => setIsTuningVisible(!isTuningVisible)}
            activeOpacity={0.7}
          >
            <View style={styles.tuningHeaderTitleRow}>
              <Ionicons name="options-outline" size={16} color={theme.colors.accentDeal} />
              <Text style={styles.tuningTitle}>Deal Details, Image & Price Tuning</Text>
            </View>
            <Ionicons
              name={isTuningVisible ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {isTuningVisible && (
            <View style={styles.tuningBody}>
              {/* Product Title */}
              <View style={styles.tuneField}>
                <Text style={styles.tuneLabel}>Product Title</Text>
                <TextInput
                  style={styles.tuneInput}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                  placeholder="Product name"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              {/* Product Image URL with Live Thumbnail */}
              <View style={styles.tuneField}>
                <Text style={styles.tuneLabel}>Product Image URL</Text>
                <View style={styles.imageTuneRow}>
                  {customImageUrl ? (
                    <Image
                      source={{ uri: customImageUrl }}
                      style={styles.tuneThumb}
                      resizeMode="contain"
                    />
                  ) : null}
                  <TextInput
                    style={[styles.tuneInput, { flex: 1 }]}
                    value={customImageUrl}
                    onChangeText={setCustomImageUrl}
                    placeholder="https://images... (Auto-fetched from CDN)"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Price Row */}
              <View style={styles.tuneRow}>
                <View style={styles.tuneCol}>
                  <Text style={styles.tuneLabel}>Deal Price</Text>
                  <TextInput
                    style={styles.tuneInput}
                    value={customPrice}
                    onChangeText={setCustomPrice}
                    placeholder="e.g. ₹1,499"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.tuneCol}>
                  <Text style={styles.tuneLabel}>Original MRP</Text>
                  <TextInput
                    style={styles.tuneInput}
                    value={customMrp}
                    onChangeText={setCustomMrp}
                    placeholder="e.g. ₹3,999"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                <View style={styles.tuneCol}>
                  <Text style={styles.tuneLabel}>Discount</Text>
                  <TextInput
                    style={styles.tuneInput}
                    value={customDiscount}
                    onChangeText={setCustomDiscount}
                    placeholder="e.g. 62% OFF"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.tuneApplyBtn}
                onPress={handleApplyCustomTuning}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                <Text style={styles.tuneApplyBtnText}>Apply & Sync Channels</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Price History / Deal Quality Banner */}
      {activeProduct?.dealScore && (
        <View style={styles.dealScoreBanner}>
          <Ionicons name="flame" size={16} color="#EF4444" />
          <Text style={styles.dealScoreText}>{activeProduct.dealScore}</Text>
        </View>
      )}

      {/* Live Preview Area */}
      {activeContent && (
        <View style={styles.previewContainer}>
          {selectedCategory === 'fashion' ? (
            <View style={styles.fashionPreview}>
              <View style={styles.previewHeadingRow}>
                <Ionicons name="logo-pinterest" size={18} color={theme.colors.pinterest} />
                <Text style={styles.previewHeading}>Pinterest 2:3 Pin Studio</Text>
              </View>

              {/* Pin Graphic Component (Captured via view-shot with real product image) */}
              <View style={styles.pinCenterWrap}>
                <PinCardView
                  ref={pinCardRef}
                  title={customTitle || activeContent.pinterestTitle || activeProduct?.title || ''}
                  badgeText={activeContent.pinBadgeText || 'MUST HAVE'}
                  priceTag={customPrice || activeContent.pinPriceTag || activeProduct?.currentPrice || '₹1,499'}
                  originalPrice={customMrp || activeProduct?.originalPrice}
                  discountPercent={customDiscount || activeProduct?.discountPercent}
                  imageUrl={customImageUrl || activeProduct?.imageUrl || ''}
                  platform={activeProduct?.platform}
                />
              </View>

              {/* Pin Action Toolbar */}
              <View style={styles.pinActionGroup}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.pinterest }]}
                  onPress={handleExportPin}
                  activeOpacity={0.85}
                  disabled={isProcessing}
                >
                  <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Export & Share 2:3 Graphic Pin</Text>
                </TouchableOpacity>

                <View style={styles.dualActionRow}>
                  <TouchableOpacity
                    style={[styles.secondaryActionBtn, { flex: 1 }]}
                    onPress={() =>
                      handleCopyText(
                        activeProduct?.affiliateUrl || '',
                        'pinLink',
                        'Affiliate Pin link copied!'
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={copiedKey === 'pinLink' ? 'checkmark' : 'link-outline'}
                      size={15}
                      color={theme.colors.primaryLight}
                    />
                    <Text style={styles.secondaryActionBtnText}>
                      {copiedKey === 'pinLink' ? 'Copied Link' : 'Copy Pin Link'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryActionBtn, { flex: 1 }]}
                    onPress={() => {
                      const desc = `${activeContent.pinterestTitle}\n\n${activeContent.pinterestDescription || ''}\n\n${activeContent.pinterestTags?.join(' ') || ''}`;
                      handleCopyText(desc, 'pinDesc', 'Pin title & tags copied!');
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={copiedKey === 'pinDesc' ? 'checkmark' : 'copy-outline'}
                      size={15}
                      color={theme.colors.secondaryLight}
                    />
                    <Text style={styles.secondaryActionBtnText}>
                      {copiedKey === 'pinDesc' ? 'Copied Text' : 'Copy SEO Tags'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.secondaryActionBtn, { width: '100%', marginTop: 6 }]}
                  onPress={handleOpenPinterest}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-pinterest" size={16} color={theme.colors.pinterest} />
                  <Text style={styles.secondaryActionBtnText}>Open Pinterest App / Web</Text>
                </TouchableOpacity>
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

              {/* Buffer / Publer Channel Switcher Tabs */}
              <View style={styles.channelTabBar}>
                <TouchableOpacity
                  style={[styles.channelTab, activeChannelTab === 'all' && styles.channelTabActive]}
                  onPress={() => setActiveChannelTab('all')}
                >
                  <Text style={[styles.channelTabText, activeChannelTab === 'all' && styles.channelTabTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.channelTab, activeChannelTab === 'whatsapp' && styles.channelTabActive]}
                  onPress={() => setActiveChannelTab('whatsapp')}
                >
                  <Ionicons name="logo-whatsapp" size={12} color={theme.colors.whatsapp} />
                  <Text style={[styles.channelTabText, activeChannelTab === 'whatsapp' && styles.channelTabTextActive]}>
                    WhatsApp
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.channelTab, activeChannelTab === 'telegram' && styles.channelTabActive]}
                  onPress={() => setActiveChannelTab('telegram')}
                >
                  <Ionicons name="paper-plane" size={12} color={theme.colors.telegram} />
                  <Text style={[styles.channelTabText, activeChannelTab === 'telegram' && styles.channelTabTextActive]}>
                    Telegram
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.channelTab, activeChannelTab === 'blogger' && styles.channelTabActive]}
                  onPress={() => setActiveChannelTab('blogger')}
                >
                  <Ionicons name="newspaper" size={12} color={theme.colors.blogger} />
                  <Text style={[styles.channelTabText, activeChannelTab === 'blogger' && styles.channelTabTextActive]}>
                    Blogspot
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.channelTab, activeChannelTab === 'x' && styles.channelTabActive]}
                  onPress={() => setActiveChannelTab('x')}
                >
                  <Ionicons name="logo-twitter" size={12} color={theme.colors.primaryLight} />
                  <Text style={[styles.channelTabText, activeChannelTab === 'x' && styles.channelTabTextActive]}>
                    X
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Card 1: WhatsApp Channel Alert */}
              {(activeChannelTab === 'all' || activeChannelTab === 'whatsapp') && (
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
              )}

              {/* Card 2: Telegram Deal Channel */}
              {(activeChannelTab === 'all' || activeChannelTab === 'telegram') && (
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
                  {/* Primary: Broadcast to Telegram Channel (Bot API) */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.colors.telegram }]}
                    onPress={handleBroadcastTelegram}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Broadcast to Telegram Channel</Text>
                  </TouchableOpacity>

                  {/* Dual Action: Direct Share to Telegram App & Any App */}
                  <View style={[styles.dualActionRow, { marginTop: 8 }]}>
                    <TouchableOpacity
                      style={[styles.secondaryActionBtn, { flex: 1 }]}
                      onPress={handleShareTelegramDirect}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="share-social-outline" size={15} color={theme.colors.telegram} />
                      <Text style={styles.secondaryActionBtnText}>Direct Share App</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.secondaryActionBtn, { flex: 1 }]}
                      onPress={() =>
                        handleShareSystem(
                          activeContent.telegramMarkdown || '',
                          'Telegram Deal Alert'
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons name="share-outline" size={15} color={theme.colors.telegram} />
                      <Text style={styles.secondaryActionBtnText}>Share to Any App</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Card 3: Google Blogger (Blogspot) */}
              {(activeChannelTab === 'all' || activeChannelTab === 'blogger') && (
                <View style={styles.channelCard}>
                  <View style={styles.channelCardHeader}>
                    <View style={styles.channelTitleRow}>
                      <Ionicons name="newspaper-outline" size={18} color={theme.colors.blogger} />
                      <Text style={styles.channelTitle}>1200+ Word SEO Review Article</Text>
                    </View>
                    <View style={styles.badgePill}>
                      <Text style={styles.badgePillText}>HTML + IMAGES</Text>
                    </View>
                  </View>
                  <Text style={styles.previewArticleTitle}>{activeContent.bloggerTitle}</Text>

                  <View style={styles.bloggerActionCol}>
                    {/* Primary: Copy HTML Button */}
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.colors.blogger }]}
                      onPress={() =>
                        handleCopyText(
                          activeContent.bloggerHtmlBody || '',
                          'bloggerHtml',
                          'Complete SEO Review HTML copied to clipboard!'
                        )
                      }
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={copiedKey === 'bloggerHtml' ? 'checkmark' : 'copy-outline'}
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.actionBtnText}>
                        {copiedKey === 'bloggerHtml' ? 'HTML Copied to Clipboard!' : 'Copy SEO Article (HTML)'}
                      </Text>
                    </TouchableOpacity>

                    {/* Dual Action: Open Web Editor & Native Share */}
                    <View style={[styles.dualActionRow, { marginTop: 8 }]}>
                      <TouchableOpacity
                        style={[styles.secondaryActionBtn, { flex: 1 }]}
                        onPress={handleOpenBloggerEditor}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="open-outline" size={15} color={theme.colors.blogger} />
                        <Text style={styles.secondaryActionBtnText}>Open Blogger Editor</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.secondaryActionBtn, { flex: 1 }]}
                        onPress={() =>
                          handleShareSystem(
                            `${activeContent.bloggerTitle}\n\n${activeContent.bloggerHtmlBody}`,
                            'Blogspot Review Article'
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <Ionicons name="share-outline" size={15} color={theme.colors.blogger} />
                        <Text style={styles.secondaryActionBtnText}>Share to Any App</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Optional Post via Email (Zero-OAuth) */}
                    {settings.bloggerEmail ? (
                      <TouchableOpacity
                        style={[styles.secondaryActionBtn, { marginTop: 8 }]}
                        onPress={handlePublishViaEmail}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="mail-outline" size={16} color={theme.colors.accentDeal} />
                        <Text style={styles.secondaryActionBtnText}>Send Post via Email (Zero-OAuth)</Text>
                      </TouchableOpacity>
                    ) : null}

                    {/* Optional Direct API Publish Button (Only if OAuth token configured) */}
                    {settings.bloggerAccessToken ? (
                      <TouchableOpacity
                        style={[styles.secondaryActionBtn, { marginTop: 8 }]}
                        onPress={handlePublishBlogger}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.blogger} />
                        <Text style={styles.secondaryActionBtnText}>Direct API Publish</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )}

              {/* Card 4: X / Twitter */}
              {(activeChannelTab === 'all' || activeChannelTab === 'x') && (
                <View style={styles.channelCard}>
                  <View style={styles.channelCardHeader}>
                    <View style={styles.channelTitleRow}>
                      <Ionicons name="logo-twitter" size={18} color={theme.colors.primaryLight} />
                      <Text style={styles.channelTitle}>X (Twitter) Deal Hook</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.copySmallBtn}
                      onPress={() => handleCopyText(activeContent.tweetText || '', 'xText')}
                    >
                      <Ionicons
                        name={copiedKey === 'xText' ? 'checkmark' : 'copy-outline'}
                        size={13}
                        color={theme.colors.primaryLight}
                      />
                      <Text style={styles.copySmallBtnText}>
                        {copiedKey === 'xText' ? 'Copied' : 'Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.previewCopyText}>{activeContent.tweetText}</Text>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: '#1E293B',
                        borderWidth: 1,
                        borderColor: theme.colors.borderSubtle,
                      },
                    ]}
                    onPress={handleShareX}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="logo-twitter" size={18} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Post to X</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  tuningCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    padding: 14,
    marginBottom: 14,
  },
  tuningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tuningHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tuningTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tuningBody: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  tuneField: {
    marginBottom: 10,
  },
  tuneLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  tuneInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    color: theme.colors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: theme.typography.sizes.xs,
  },
  imageTuneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tuneThumb: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  tuneRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tuneCol: {
    flex: 1,
  },
  tuneApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.accentDeal,
    borderRadius: theme.radii.sm,
    paddingVertical: 10,
  },
  tuneApplyBtnText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.xs,
    fontWeight: '700',
  },
  dealScoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.md,
    marginBottom: 14,
  },
  dealScoreText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  previewContainer: {
    marginTop: 4,
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
  pinActionGroup: {
    width: '100%',
    marginTop: 14,
    gap: 8,
  },
  dualActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
  },
  secondaryActionBtnText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
  tagWrap: {
    marginTop: 14,
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
  channelTabBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  channelTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  channelTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  channelTabText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  channelTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  badgePill: {
    backgroundColor: theme.colors.primaryGlow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.xs,
  },
  badgePillText: {
    color: theme.colors.primaryLight,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  bloggerActionCol: {
    gap: 8,
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