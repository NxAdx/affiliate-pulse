import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../theme';
import { BloggerService, DEFAULT_BLOGGER_WEBHOOK } from '../../services/bloggerApi';
import { TelegramService } from '../../services/telegramBot';

interface PortalLinkProps {
  label: string;
  url: string;
}

function PortalLink({ label, url }: PortalLinkProps) {
  return (
    <TouchableOpacity
      style={styles.portalLink}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL(url);
      }}
      activeOpacity={0.7}
    >
      <Text style={styles.portalLinkText} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="arrow-forward" size={10} color={theme.colors.primaryLight} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { settings, updateSettings } = useAppStore();

  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey);
  const [amazonTag, setAmazonTag] = useState(settings.amazonAffiliateTag);
  const [flipkartTag, setFlipkartTag] = useState(settings.flipkartAffiliateTag);
  const [earnkaroToken, setEarnkaroToken] = useState(settings.earnkaroToken);
  const [bloggerBlogId, setBloggerBlogId] = useState(settings.bloggerBlogId);
  const [bloggerWebhookUrl, setBloggerWebhookUrl] = useState(
    settings.bloggerWebhookUrl?.trim() || DEFAULT_BLOGGER_WEBHOOK
  );

  const [telegramToken, setTelegramToken] = useState(settings.telegramBotToken);
  const [telegramChannel, setTelegramChannel] = useState(settings.telegramChannelId);
  const [pinterestBoard, setPinterestBoard] = useState(settings.pinterestBoardId || 'https://in.pinterest.com/aadarshlokhande/f%ce%b1%d1%95%d0%bd%ce%b9%cf%83%d0%b8/');

  const [savedFeedback, setSavedFeedback] = useState(false);
  const [isTestingBlogger, setIsTestingBlogger] = useState(false);
  const [bloggerTestResult, setBloggerTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{
    success: boolean;
    botName?: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    setGeminiApiKey(settings.geminiApiKey);
    setAmazonTag(settings.amazonAffiliateTag);
    setFlipkartTag(settings.flipkartAffiliateTag);
    setEarnkaroToken(settings.earnkaroToken);
    setBloggerBlogId(settings.bloggerBlogId);
    setBloggerWebhookUrl(settings.bloggerWebhookUrl?.trim() || DEFAULT_BLOGGER_WEBHOOK);
    setTelegramToken(settings.telegramBotToken);
    setTelegramChannel(settings.telegramChannelId);
    setPinterestBoard(settings.pinterestBoardId || 'https://in.pinterest.com/aadarshlokhande/f%ce%b1%d1%95%d0%bd%ce%b9%cf%83%d0%b8/');
  }, [settings]);

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSettings({
      geminiApiKey: geminiApiKey.trim(),
      amazonAffiliateTag: amazonTag.trim(),
      flipkartAffiliateTag: flipkartTag.trim(),
      earnkaroToken: earnkaroToken.trim(),
      bloggerBlogId: bloggerBlogId.trim(),
      bloggerWebhookUrl: bloggerWebhookUrl.trim() || DEFAULT_BLOGGER_WEBHOOK,
      telegramBotToken: telegramToken.trim(),
      telegramChannelId: telegramChannel.trim(),
      pinterestBoardId: pinterestBoard.trim(),
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3500);
  };

  const handleTestBlogger = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsTestingBlogger(true);
    setBloggerTestResult(null);
    try {
      const activeWebhook = bloggerWebhookUrl.trim() || DEFAULT_BLOGGER_WEBHOOK;
      const res = await BloggerService.testConnection(bloggerBlogId, activeWebhook);
      if (res.success) {
        setBloggerTestResult({
          success: true,
          message: `Connected: "${res.blogName}" (Ready for 1-tap publishing)`,
        });
      } else {
        setBloggerTestResult({
          success: false,
          message: res.error || 'Connection failed',
        });
      }
    } catch (err: any) {
      setBloggerTestResult({
        success: false,
        message: err?.message || 'Error testing connection',
      });
    } finally {
      setIsTestingBlogger(false);
    }
  };

  const handleTestTelegram = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsTestingTelegram(true);
    setTelegramTestResult(null);
    try {
      const res = await TelegramService.testConnection(telegramToken, telegramChannel);
      setTelegramTestResult(res);
    } catch (err: any) {
      setTelegramTestResult({
        success: false,
        message: err?.message || 'Error testing Telegram connection',
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info Banner */}
      <View style={styles.vaultBanner}>
        <View style={styles.vaultIconWrap}>
          <Ionicons name="shield-checkmark" size={18} color={theme.colors.accentDeal} />
        </View>
        <View style={styles.vaultTextWrap}>
          <Text style={styles.vaultTitle}>Encrypted Local Storage</Text>
          <Text style={styles.vaultSub}>All API credentials persisted securely in MMKV vault.</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>ACTIVE</Text>
        </View>
      </View>

      {savedFeedback && (
        <View style={styles.feedbackBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          <Text style={styles.feedbackText}>Configuration saved to offline vault</Text>
        </View>
      )}

      {/* SECTION 1: AI & Intelligence */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="sparkles-outline" size={16} color={theme.colors.primaryLight} />
            <Text style={styles.cardTitle}>AI Engine (Google Gemini)</Text>
          </View>
          <PortalLink label="Get Key" url="https://aistudio.google.com/app/apikey" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gemini API Key</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="key-outline" size={15} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Paste AI Studio Key (AIzaSy...)"
              placeholderTextColor={theme.colors.textMuted}
              value={geminiApiKey}
              onChangeText={setGeminiApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>
          <Text style={styles.helperText}>Powers automated reviews, Telegram hooks & Pinterest tags.</Text>
        </View>
      </View>

      {/* SECTION 2: Affiliate Tracking Tags */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="pricetag-outline" size={16} color={theme.colors.accentDeal} />
            <Text style={styles.cardTitle}>Affiliate Tracking Tags</Text>
          </View>
        </View>

        {/* Amazon */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label} numberOfLines={1}>Amazon Associate Tag</Text>
            <PortalLink label="Portal ↗" url="https://affiliate-program.amazon.in/" />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="logo-amazon" size={15} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="e.g. yourtag-21"
              placeholderTextColor={theme.colors.textMuted}
              value={amazonTag}
              onChangeText={setAmazonTag}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Flipkart */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label} numberOfLines={1}>Flipkart Affiliate ID</Text>
            <PortalLink label="Portal ↗" url="https://affiliate.flipkart.com/" />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="cart-outline" size={15} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="e.g. your_affiliate_id"
              placeholderTextColor={theme.colors.textMuted}
              value={flipkartTag}
              onChangeText={setFlipkartTag}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* EarnKaro */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label} numberOfLines={1}>EarnKaro / Cuelinks Token</Text>
            <PortalLink label="Profile ↗" url="https://earnkaro.com/profile" />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="link-outline" size={15} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Optional token for other merchants..."
              placeholderTextColor={theme.colors.textMuted}
              value={earnkaroToken}
              onChangeText={setEarnkaroToken}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
      </View>

      {/* SECTION 3: Google Blogger (Direct Apps Script Webhook) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="globe-outline" size={16} color={theme.colors.blogger} />
            <Text style={styles.cardTitle}>Google Blogger</Text>
          </View>
          <PortalLink label="Admin ↗" url="https://www.blogger.com/" />
        </View>

        {/* 1. Google Apps Script Webhook (Direct & Permanent 1-Tap) */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label} numberOfLines={1}>Publishing Webhook</Text>
            <PortalLink label="Console ↗" url="https://script.google.com/" />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="flash-outline" size={15} color={theme.colors.accentDeal} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="https://script.google.com/macros/s/.../exec"
              placeholderTextColor={theme.colors.textMuted}
              value={bloggerWebhookUrl}
              onChangeText={setBloggerWebhookUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.helperText}>
            Permanent 1-tap direct publishing. Bypasses 60-min OAuth expiration.
          </Text>
        </View>

        {/* 2. Numeric Blog ID */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Blogger Blog ID</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="newspaper-outline" size={15} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="e.g. 4105733030604942075"
              placeholderTextColor={theme.colors.textMuted}
              value={bloggerBlogId}
              onChangeText={setBloggerBlogId}
              keyboardType="numeric"
            />
          </View>
          <Text style={styles.helperText}>Numeric identifier from your Blogger dashboard URL.</Text>
        </View>

        {/* Test Connection Button */}
        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleTestBlogger}
          disabled={isTestingBlogger}
          activeOpacity={0.8}
        >
          {isTestingBlogger ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.testBtnInner}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#FFFFFF" />
              <Text style={styles.testBtnText}>Test Blogger Connection</Text>
            </View>
          )}
        </TouchableOpacity>

        {bloggerTestResult && (
          <View
            style={[
              styles.testResultBox,
              bloggerTestResult.success ? styles.testResultSuccess : styles.testResultError,
            ]}
          >
            <Ionicons
              name={bloggerTestResult.success ? 'checkmark-circle' : 'alert-circle'}
              size={15}
              color={bloggerTestResult.success ? theme.colors.accentDeal : '#EF4444'}
            />
            <Text style={styles.testResultText}>{bloggerTestResult.message}</Text>
          </View>
        )}
      </View>

      {/* SECTION 4: Telegram Channel */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="paper-plane-outline" size={16} color={theme.colors.telegram} />
            <Text style={styles.cardTitle}>Telegram Deal Channel</Text>
          </View>
          <PortalLink label="BotFather ↗" url="https://t.me/BotFather" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telegram Bot Token</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="hardware-chip-outline" size={15} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              placeholderTextColor={theme.colors.textMuted}
              value={telegramToken}
              onChangeText={setTelegramToken}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label} numberOfLines={1}>Telegram Channel ID</Text>
            <PortalLink label="ID Bot ↗" url="https://t.me/username_to_id_bot" />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="megaphone-outline" size={15} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="e.g. -1001234567890 or @your_deal_channel"
              placeholderTextColor={theme.colors.textMuted}
              value={telegramChannel}
              onChangeText={setTelegramChannel}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.helperText}>Make sure your bot is added as an Administrator to this channel.</Text>
        </View>

        {/* Test Telegram Connection Button */}
        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleTestTelegram}
          disabled={isTestingTelegram}
          activeOpacity={0.8}
        >
          {isTestingTelegram ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.testBtnInner}>
              <Ionicons name="paper-plane" size={14} color="#FFFFFF" />
              <Text style={styles.testBtnText}>Test Telegram Connection</Text>
            </View>
          )}
        </TouchableOpacity>

        {telegramTestResult && (
          <View
            style={[
              styles.testResultBox,
              telegramTestResult.success ? styles.testResultSuccess : styles.testResultError,
            ]}
          >
            <Ionicons
              name={telegramTestResult.success ? 'checkmark-circle' : 'alert-circle'}
              size={15}
              color={telegramTestResult.success ? theme.colors.accentDeal : '#EF4444'}
            />
            <Text style={styles.testResultText}>{telegramTestResult.message}</Text>
          </View>
        )}
      </View>

      {/* SECTION 5: Pinterest Board (Visual Search) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="logo-pinterest" size={16} color={theme.colors.pinterest} />
            <Text style={styles.cardTitle}>Pinterest Board (Visual Search)</Text>
          </View>
          <PortalLink label="Board ↗" url={pinterestBoard || 'https://pinterest.com'} />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label} numberOfLines={1}>Default Fashion / Watch Board</Text>
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="link-outline" size={15} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="https://in.pinterest.com/username/board/"
              placeholderTextColor={theme.colors.textMuted}
              value={pinterestBoard}
              onChangeText={setPinterestBoard}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.helperText}>
            Pins created in the 2:3 Pin Studio will link directly to this board.
          </Text>
        </View>
      </View>

      {/* SAVE BUTTON */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
        <Ionicons name="save-outline" size={16} color="#FFFFFF" />
        <Text style={styles.saveButtonText}>Save Configuration</Text>
      </TouchableOpacity>
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
  vaultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 14,
    gap: 10,
  },
  vaultIconWrap: {
    width: 34,
    height: 34,
    borderRadius: theme.radii.sm,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.accentDealGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultTextWrap: {
    flex: 1,
  },
  vaultTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '700',
  },
  vaultSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: theme.colors.accentDealGlow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.xs,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statusPillText: {
    color: theme.colors.accentDeal,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.accentDeal,
    padding: 12,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    marginBottom: 14,
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  portalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.primaryGlow,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: theme.radii.xs,
    borderCurve: 'continuous',
    flexShrink: 0,
  },
  portalLinkText: {
    color: theme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputWithIcon: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    paddingVertical: 10,
  },
  helperText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  testBtn: {
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    marginTop: 2,
    marginBottom: 10,
  },
  testBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testBtnText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: theme.radii.sm,
    borderCurve: 'continuous',
    marginBottom: 10,
  },
  testResultSuccess: {
    backgroundColor: theme.colors.accentDealGlow,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  testResultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  testResultText: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    paddingVertical: 14,
    marginTop: 8,
    ...theme.shadows.glowPrimary,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
  },
});
