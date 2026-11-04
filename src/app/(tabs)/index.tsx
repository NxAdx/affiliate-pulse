import React, { useState, useRef, useEffect } from 'react';
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
import { PinCardView } from '../../components/PinCardView';
import { DealHunterService } from '../../services/dealHunter';
import { DealCategory } from '../../types';

export default function GeneratorScreen() {
  const [inputUrl, setInputUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Flexible Search & Discount Filters
  const [huntKeyword, setHuntKeyword] = useState('');
  const [minDiscountFilter, setMinDiscountFilter] = useState(40);

  // Editable deal tuning fields
  const [customTitle, setCustomTitle] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customMrp, setCustomMrp] = useState('');
  const [customDiscount, setCustomDiscount] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isTuningVisible, setIsTuningVisible] = useState(false);

  // Universal Channel Switcher (Buffer / Publer Inspiration)
  const [activeChannelTab, setActiveChannelTab] = useState<
    'all' | 'telegram' | 'whatsapp' | 'blogger' | 'pinterest' | 'x'
  >('all');

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
    dealsHistory,
  } = useAppStore();

  const [isHunting, setIsHunting] = useState(false);
  const sessionHuntedAsinsRef = useRef<Set<string>>(new Set());

  // Synchronize customizer fields when activeProduct changes
  useEffect(() => {
    if (activeProduct) {
      setCustomTitle(activeProduct.title || '');
      setCustomPrice(activeProduct.currentPrice || '');
      setCustomMrp(activeProduct.originalPrice || '');
      setCustomDiscount(activeProduct.discountPercent || '');
      setCustomImageUrl(activeProduct.imageUrl || '');
      setInputUrl(activeProduct.originalUrl || activeProduct.affiliateUrl || '');
    }
  }, [activeProduct]);

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

  /**
   * Universal URL Processing:
   * Uses REA-calibrated scraping to extract exact price, strike MRP, mathematical discount,
   * and 2000px crystal-clear uncompressed studio product imagery.
   * Feeds into Gemini for all 5 syndication channels!
   */
  const handleGenerate = async () => {
    if (!inputUrl.trim()) {
      setStatusMessage('Please paste an Amazon, Flipkart or Myntra link');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Resolving link & extracting accurate pricing, MRP & HD image...');

    try {
      const product = await ProductScraper.parseProductUrl(inputUrl.trim(), {
        amazon: settings.amazonAffiliateTag,
        flipkart: settings.flipkartAffiliateTag,
        earnkaro: settings.earnkaroToken,
      });

      // Synchronize editable states
      setCustomTitle(product.title);
      setCustomPrice(product.currentPrice);
      setCustomMrp(product.originalPrice || '₹2,999');
      setCustomDiscount(product.discountPercent || '40% OFF');
      setCustomImageUrl(product.imageUrl);
      setActiveProduct(product);

      setStatusMessage('Generating promotional copy for all 5 platforms...');
      const gemini = new GeminiAiService(settings.geminiApiKey);
      const content = await gemini.generateOmnichannelDeal(product, selectedCategory);
      setActiveContent(content);

      addDealToHistory({
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        category: selectedCategory,
        product,
        content,
        status: {},
      });

      setStatusMessage('Universal deal ready across all 5 distribution channels!');
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.message || 'Failed to process product'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Universal Deal Hunter:
   * Flexible product discovery by custom keyword or category, with selectable discount tier.
   */
  const handleAutoHuntDeal = async () => {
    setIsHunting(true);
    const searchTarget = huntKeyword.trim()
      ? `"${huntKeyword.trim()}"`
      : `${selectedCategory.toUpperCase()} deals`;

    setStatusMessage(`🔍 Hunting Amazon India for ${searchTarget} (≥${minDiscountFilter}% OFF)...`);

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
        selectedCategory,
        huntKeyword.trim() || undefined,
        minDiscountFilter
      );

      if (!deal) {
        setStatusMessage('No new unseen deals found meeting discount threshold right now.');
        Alert.alert(
          'Deal Hunt Complete',
          `No unseen deals found matching ${minDiscountFilter}%+ OFF right now. Try lowering the discount filter or searching another keyword!`
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

      setStatusMessage(`✨ Found ${deal.discount} OFF: ${deal.title.substring(0, 35)}... Generating copy!`);

      const product = {
        originalUrl: deal.affiliateUrl,
        canonicalUrl: deal.affiliateUrl,
        affiliateUrl: deal.affiliateUrl,
        platform: 'amazon' as const,
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

      const gemini = new GeminiAiService(settings.geminiApiKey);
      const content = await gemini.generateOmnichannelDeal(product, selectedCategory);
      setActiveContent(content);

      addDealToHistory({
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        category: selectedCategory,
        product,
        content,
        status: {},
      });

      setStatusMessage(`🎯 Discovered ${deal.discount} deal! Ready to share across all channels.`);
    } catch (err: any) {
      setStatusMessage(`Hunting error: ${err?.message || 'Network issue'}`);
    } finally {
      setIsHunting(false);
    }
  };

  /**
   * Re-sync copy when user customizes price, MRP, image, or title
   * Automatically recalculates mathematical discount percentage!
   */
  const handleApplyCustomTuning = () => {
    if (!activeProduct) return;

    const pClean = customPrice.trim().startsWith('₹') ? customPrice.trim() : `₹${customPrice.trim()}`;
    const mClean = customMrp.trim().startsWith('₹') ? customMrp.trim() : `₹${customMrp.trim()}`;

    // Mathematical discount recalculation
    let computedDiscount = customDiscount.trim();
    const pNum = parseInt(pClean.replace(/[^0-9]/g, ''), 10);
    const mNum = parseInt(mClean.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(pNum) && !isNaN(mNum) && mNum > pNum) {
      computedDiscount = `${Math.round(((mNum - pNum) / mNum) * 100)}% OFF`;
      setCustomDiscount(computedDiscount);
    }

    const updatedProduct = {
      ...activeProduct,
      title: customTitle.trim() || activeProduct.title,
      imageUrl: customImageUrl.trim() || activeProduct.imageUrl,
      currentPrice: pClean,
      originalPrice: mClean,
      discountPercent: computedDiscount || activeProduct.discountPercent,
    };

    setActiveProduct(updatedProduct);

    if (activeContent) {
      const gemini = new GeminiAiService(settings.geminiApiKey);
      const refreshed = gemini.generateFallbackOmnichannel(updatedProduct, selectedCategory);
      setActiveContent({
        ...activeContent,
        bloggerTitle: `${updatedProduct.title} Review & Lowest Price Deal (2026)`,
        bloggerHtmlBody: refreshed.bloggerHtmlBody,
        telegramMarkdown: refreshed.telegramMarkdown,
        whatsappMessage: refreshed.whatsappMessage,
        tweetText: refreshed.tweetText,
        pinterestTitle: `Top Pick 2026: ${updatedProduct.title.slice(0, 40)} | ${updatedProduct.discountPercent}`,
        pinPriceTag: updatedProduct.currentPrice,
      });
    }

    setStatusMessage('Updated price, HD image & discount across all 5 channels!');
  };

  /**
   * Pinterest 2:3 Pin Graphic Export (1000x1500) via react-native-view-shot
   */
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
      },
      settings.bloggerWebhookUrl
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

  const CATEGORY_TABS: { key: DealCategory; label: string; icon: any }[] = [
    { key: 'all', label: 'All Products', icon: 'globe-outline' },
    { key: 'electronics', label: 'Tech & Gadgets', icon: 'hardware-chip-outline' },
    { key: 'fashion', label: 'Fashion', icon: 'shirt-outline' },
    { key: 'home', label: 'Home & Kitchen', icon: 'home-outline' },
    { key: 'beauty', label: 'Beauty & Care', icon: 'sparkles-outline' },
    { key: 'fitness', label: 'Fitness', icon: 'barbell-outline' },
    { key: 'books', label: 'Books', icon: 'book-outline' },
  ];

  const DISCOUNT_TIERS = [30, 40, 50, 60, 70];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      

      {/* Universal Flexible Deal Hunter Card */}
      <View style={styles.autoHunterCard}>
        <View style={styles.autoHunterHeader}>
          <View style={styles.autoHunterTitleRow}>
            <Ionicons name="compass-outline" size={18} color={theme.colors.primaryLight} />
            <Text style={styles.autoHunterTitle}>Deal Discovery</Text>
          </View>
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityBadgeText}>
              {minDiscountFilter}%+ OFF
            </Text>
          </View>
        </View>

        {/* Custom Keyword Search Input */}
        <View style={styles.searchKeywordWrap}>
          <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchKeywordInput}
            placeholder="Search keyword (e.g. Air Fryer, Smartwatch, Sneakers...)"
            placeholderTextColor={theme.colors.textMuted}
            value={huntKeyword}
            onChangeText={setHuntKeyword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {huntKeyword ? (
            <TouchableOpacity onPress={() => setHuntKeyword('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Horizontal Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORY_TABS.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isActive ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Minimum Discount Filter Chips */}
        <View style={styles.discountRow}>
          <Text style={styles.discountRowLabel}>Min Discount:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            {DISCOUNT_TIERS.map((tier) => {
              const isSelected = minDiscountFilter === tier;
              return (
                <TouchableOpacity
                  key={tier}
                  style={[styles.discountChip, isSelected && styles.discountChipActive]}
                  onPress={() => setMinDiscountFilter(tier)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.discountChipText, isSelected && styles.discountChipTextActive]}>
                    {tier}%+ OFF
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 1-Tap Auto-Hunt Trigger */}
        <TouchableOpacity
          style={[styles.autoHunterBtn, isHunting && styles.buttonDisabled]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleAutoHuntDeal();
          }}
          disabled={isHunting || isProcessing}
          activeOpacity={0.85}
        >
          {isHunting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.autoHunterBtnInner}>
              <Ionicons name="search" size={15} color="#FFFFFF" />
              <Text style={styles.autoHunterBtnText}>
                {huntKeyword.trim()
                  ? `Find "${huntKeyword.trim()}" Deals`
                  : `Find ${selectedCategory === 'all' ? 'Top' : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Deals`}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Direct URL Input Box (Accepts Amazon, Flipkart, Myntra) */}
      <View style={styles.inputCard}>
        <View style={styles.inputLabelRow}>
          <Text style={styles.inputLabel}>Direct Product Link</Text>
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
          style={[styles.secondaryActionButton, isProcessing && styles.buttonDisabled]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleGenerate();
          }}
          disabled={isProcessing}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator color={theme.colors.primaryLight} size="small" />
          ) : (
            <View style={styles.secondaryActionButtonInner}>
              <Ionicons name="layers-outline" size={15} color={theme.colors.primaryLight} />
              <Text style={styles.secondaryActionButtonText}>Generate Omnichannel Pack</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Real-time Status feedback */}
      {statusMessage ? (
        <View style={styles.statusBox}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.primaryLight} />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : null}

      {/* Interactive Deal Customizer / Price & Image Tuning Box */}
      {activeProduct && (
        <View style={styles.tuningCard}>
          <TouchableOpacity
            style={styles.tuningHeader}
            onPress={() => setIsTuningVisible(!isTuningVisible)}
            activeOpacity={0.7}
          >
            <View style={styles.tuningHeaderTitleRow}>
              <Ionicons name="options-outline" size={16} color={theme.colors.accentDeal} />
              <Text style={styles.tuningTitle}>Deal Details, HD Image & Price Tuning</Text>
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
                <Text style={styles.tuneLabel}>HD Product Image URL (Uncompressed)</Text>
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
                <Text style={styles.tuneApplyBtnText}>Apply & Sync All 5 Channels</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Deal Score / Discount Quality Banner */}
      {activeProduct?.dealScore && (
        <View style={styles.dealScoreBanner}>
          <Ionicons name="flame" size={16} color="#EF4444" />
          <Text style={styles.dealScoreText}>{activeProduct.dealScore}</Text>
        </View>
      )}

      {/* Universal Omnichannel Syndication Studio */}
      {activeContent && (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeadingRow}>
            <Ionicons name="layers-outline" size={18} color={theme.colors.primaryLight} />
            <Text style={styles.previewHeading}>Omnichannel Syndication Studio</Text>
          </View>

          {/* Universal Channel Switcher Bar (All 5 Destinations Available) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.channelScroll}>
            <View style={styles.channelTabBar}>
              <TouchableOpacity
                style={[styles.channelTab, activeChannelTab === 'all' && styles.channelTabActive]}
                onPress={() => setActiveChannelTab('all')}
              >
                <Text style={[styles.channelTabText, activeChannelTab === 'all' && styles.channelTabTextActive]}>
                  All (Overview)
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
                style={[styles.channelTab, activeChannelTab === 'whatsapp' && styles.channelTabActive]}
                onPress={() => setActiveChannelTab('whatsapp')}
              >
                <Ionicons name="logo-whatsapp" size={12} color={theme.colors.whatsapp} />
                <Text style={[styles.channelTabText, activeChannelTab === 'whatsapp' && styles.channelTabTextActive]}>
                  WhatsApp
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
                style={[styles.channelTab, activeChannelTab === 'pinterest' && styles.channelTabActive]}
                onPress={() => setActiveChannelTab('pinterest')}
              >
                <Ionicons name="logo-pinterest" size={12} color={theme.colors.pinterest} />
                <Text style={[styles.channelTabText, activeChannelTab === 'pinterest' && styles.channelTabTextActive]}>
                  Pinterest Pin
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
          </ScrollView>

          {/* Destination 1: Telegram Deal Alert */}
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
              <Text style={styles.previewCopyText} numberOfLines={5}>
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
                    handleShareSystem(activeContent.telegramMarkdown || '', 'Telegram Deal Alert')
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-outline" size={15} color={theme.colors.telegram} />
                  <Text style={styles.secondaryActionBtnText}>Share to Any App</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Destination 2: WhatsApp Deal Message */}
          {(activeChannelTab === 'all' || activeChannelTab === 'whatsapp') && (
            <View style={styles.channelCard}>
              <View style={styles.channelCardHeader}>
                <View style={styles.channelTitleRow}>
                  <Ionicons name="logo-whatsapp" size={18} color={theme.colors.whatsapp} />
                  <Text style={styles.channelTitle}>WhatsApp Channel / Chat</Text>
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

          {/* Destination 3: Pinterest 2:3 Pin Studio (Universal for all products!) */}
          {(activeChannelTab === 'all' || activeChannelTab === 'pinterest') && (
            <View style={styles.channelCard}>
              <View style={styles.channelCardHeader}>
                <View style={styles.channelTitleRow}>
                  <Ionicons name="logo-pinterest" size={18} color={theme.colors.pinterest} />
                  <Text style={styles.channelTitle}>Pinterest 2:3 Pin Studio</Text>
                </View>
                <View style={[styles.badgePill, { backgroundColor: 'rgba(230, 0, 35, 0.15)', borderColor: theme.colors.pinterest }]}>
                  <Text style={[styles.badgePillText, { color: theme.colors.pinterest }]}>1000x1500 HD</Text>
                </View>
              </View>

              {/* Pin Graphic Preview */}
              <View style={styles.pinCenterWrap}>
                <PinCardView
                  ref={pinCardRef}
                  title={customTitle || activeContent.pinterestTitle || activeProduct?.title || ''}
                  badgeText={activeContent.pinBadgeText || 'HOT DEAL'}
                  priceTag={customPrice || activeContent.pinPriceTag || activeProduct?.currentPrice || '₹1,499'}
                  originalPrice={customMrp || activeProduct?.originalPrice}
                  discountPercent={customDiscount || activeProduct?.discountPercent}
                  imageUrl={customImageUrl || activeProduct?.imageUrl || ''}
                  platform={activeProduct?.platform}
                  ctaText="TAP TO GRAB DEAL →"
                />
              </View>

              {/* Pin Actions */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.colors.pinterest }]}
                onPress={handleExportPin}
                activeOpacity={0.85}
                disabled={isProcessing}
              >
                <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Export & Share 2:3 Graphic Pin</Text>
              </TouchableOpacity>

              <View style={[styles.dualActionRow, { marginTop: 8 }]}>
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
                    handleCopyText(desc, 'pinDesc', 'Pin title, description & tags copied!');
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={copiedKey === 'pinDesc' ? 'checkmark' : 'copy-outline'}
                    size={15}
                    color={theme.colors.secondaryLight}
                  />
                  <Text style={styles.secondaryActionBtnText}>
                    {copiedKey === 'pinDesc' ? 'Copied SEO' : 'Copy Pin Copy & SEO'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.secondaryActionBtn, { width: '100%', marginTop: 8 }]}
                onPress={handleOpenPinterest}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-pinterest" size={16} color={theme.colors.pinterest} />
                <Text style={styles.secondaryActionBtnText}>Open Pinterest App / Web</Text>
              </TouchableOpacity>

              {activeContent.pinterestTags && (
                <View style={styles.tagWrap}>
                  <Text style={styles.tagsText}>{activeContent.pinterestTags.join(' ')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Destination 4: Google Blogger (Blogspot 1200+ Word Review) */}
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

          {/* Destination 5: X / Twitter Hook */}
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
  autoHunterCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radii.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 16,
    ...theme.shadows.card,
  },
  autoHunterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  autoHunterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoHunterTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  priorityBadge: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.accentDeal,
  },
  priorityBadgeText: {
    color: theme.colors.accentDeal,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  searchKeywordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchKeywordInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    padding: 0,
  },
  categoryScroll: {
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  categoryChipText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  discountRowLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  discountChip: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginRight: 6,
  },
  discountChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: theme.colors.accentWarning,
  },
  discountChipText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  discountChipTextActive: {
    color: theme.colors.accentWarning,
  },
  autoHunterBtn: {
    backgroundColor: '#0F766E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  autoHunterBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoHunterBtnText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  inputCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
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
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pasteBtnText: {
    color: theme.colors.primaryLight,
    fontSize: theme.typography.sizes.xxs,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    paddingVertical: 10,
  },
  clearBtn: {
    padding: 4,
  },
  secondaryActionButton: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderActive,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryActionButtonText: {
    color: theme.colors.primaryLight,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 13,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.glowPrimary,
  },
  primaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.sm,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.primaryGlow,
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    flex: 1,
    lineHeight: 18,
  },
  tuningCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 16,
    overflow: 'hidden',
  },
  tuningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: theme.colors.surfaceElevated,
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
  },
  tuningBody: {
    padding: 14,
    gap: 12,
  },
  tuneField: {
    gap: 4,
  },
  tuneLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xxs,
    fontWeight: '600',
  },
  tuneInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  imageTuneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tuneThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  tuneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tuneCol: {
    flex: 1,
    gap: 4,
  },
  tuneApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 9,
    borderRadius: theme.radii.sm,
    marginTop: 4,
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.radii.md,
    marginBottom: 16,
  },
  dealScoreText: {
    color: '#EF4444',
    fontSize: theme.typography.sizes.xs,
    fontWeight: '800',
  },
  previewContainer: {
    gap: 16,
  },
  previewHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewHeading: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.base,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  channelScroll: {
    marginBottom: 4,
  },
  channelTabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 4,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    gap: 4,
  },
  channelTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radii.sm,
  },
  channelTabActive: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
  },
  channelTabText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  channelTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  channelCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
  },
  channelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  copySmallBtnText: {
    color: theme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
  },
  previewCopyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    lineHeight: 19,
    marginBottom: 14,
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  previewArticleTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.radii.md,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.3,
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
    backgroundColor: theme.colors.surfaceElevated,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  secondaryActionBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  pinCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  tagWrap: {
    marginTop: 10,
    padding: 10,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  tagsText: {
    color: '#F472B6',
    fontSize: 11,
    lineHeight: 18,
    fontWeight: '600',
  },
  badgePill: {
    backgroundColor: 'rgba(245, 125, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.blogger,
  },
  badgePillText: {
    color: theme.colors.blogger,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bloggerActionCol: {
    gap: 4,
  },
});
