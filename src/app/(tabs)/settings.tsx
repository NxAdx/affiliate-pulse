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
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../theme';
import { BloggerService } from '../../services/bloggerApi';
import { TelegramService } from '../../services/telegramBot';

interface PortalLinkProps {
  label: string;
  url: string;
}

function PortalLink({ label, url }: PortalLinkProps) {
  return (
    <TouchableOpacity
      style={styles.portalLink}
      onPress={() => Linking.openURL(url)}
      activeOpacity={0.7}
    >
      <Text style={styles.portalLinkText}>{label}</Text>
      <Ionicons name="open-outline" size={12} color={theme.colors.primaryLight} />
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
  const [bloggerToken, setBloggerToken] = useState(settings.bloggerAccessToken);
  const [bloggerEmail, setBloggerEmail] = useState(settings.bloggerEmail || '');
  const [telegramToken, setTelegramToken] = useState(settings.telegramBotToken);
  const [telegramChannel, setTelegramChannel] = useState(settings.telegramChannelId);

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
    setBloggerToken(settings.bloggerAccessToken);
    setBloggerEmail(settings.bloggerEmail || '');
    setTelegramToken(settings.telegramBotToken);
    setTelegramChannel(settings.telegramChannelId);
  }, [settings]);

  const handleSave = () => {
    updateSettings({
      geminiApiKey: geminiApiKey.trim(),
      amazonAffiliateTag: amazonTag.trim(),
      flipkartAffiliateTag: flipkartTag.trim(),
      earnkaroToken: earnkaroToken.trim(),
      bloggerBlogId: bloggerBlogId.trim(),
      bloggerAccessToken: bloggerToken.trim(),
      bloggerEmail: bloggerEmail.trim(),
      telegramBotToken: telegramToken.trim(),
      telegramChannelId: telegramChannel.trim(),
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3500);
  };

  const handleTestBlogger = async () => {
    setIsTestingBlogger(true);
    setBloggerTestResult(null);
    try {
      const res = await BloggerService.testConnection(bloggerBlogId, bloggerToken);
      if (res.success) {
        setBloggerTestResult({
          success: true,
          message: `Connected: "${res.blogName}" (${res.blogUrl || 'Ready to publish!'})`,
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
          <Ionicons name="shield-checkmark" size={20} color={theme.colors.accentDeal} />
        </View>
        <View style={styles.vaultTextWrap}>
          <Text style={styles.vaultTitle}>Encrypted Local Storage</Text>
          <Text style={styles.vaultSub}>Credentials are persisted offline via MMKV vault.</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>MMKV ACTIVE</Text>
        </View>
      </View>

      {savedFeedback && (
        <View style={styles.feedbackBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.feedbackText}>Settings saved to secure vault!</Text>
        </View>
      )}

      {/* SECTION 1: AI & Intelligence */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="sparkles" size={18} color={theme.colors.primaryLight} />
            <Text style={styles.cardTitle}>AI Engine (Google Gemini)</Text>
          </View>
          <PortalLink label="Get Gemini Key" url="https://aistudio.google.com/app/apikey" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gemini API Key</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="key-outline" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Paste AI Studio API Key (AIzaSy...)"
              placeholderTextColor={theme.colors.textMuted}
              value={geminiApiKey}
              onChangeText={setGeminiApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>
          <Text style={styles.helperText}>Used for generating 1200+ word SEO articles, Telegram alerts & Pinterest styling.</Text>
        </View>
      </View>

      {/* SECTION 2: Affiliate Tracking Tags */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="pricetag" size={18} color={theme.colors.accentDeal} />
            <Text style={styles.cardTitle}>Affiliate Tracking Tags</Text>
          </View>
        </View>

        {/* Amazon */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Amazon Associate Tag</Text>
            <PortalLink label="Amazon Associates Portal" url="https://affiliate-program.amazon.in/" />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="logo-amazon" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
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
            <Text style={styles.label}>Flipkart Affiliate ID</Text>
            <PortalLink label="Flipkart Portal" url="https://affiliate.flipkart.com/" />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="cart-outline" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
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
            <Text style={styles.label}>EarnKaro / Cuelinks Token (Fallback)</Text>
            <PortalLink label="EarnKaro Profile" url="https://earnkaro.com/profile" />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="link-outline" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
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

      {/* SECTION 3: Google Blogger (Blogspot) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="globe-outline" size={18} color={theme.colors.blogger} />
            <Text style={styles.cardTitle}>Google Blogger (Blogspot)</Text>
          </View>
          <PortalLink label="Blogger Admin" url="https://www.blogger.com/" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Blogger Blog ID</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="newspaper-outline" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Numeric Blog ID from URL (e.g. 849302194810)"
              placeholderTextColor={theme.colors.textMuted}
              value={bloggerBlogId}
              onChangeText={setBloggerBlogId}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Blogger OAuth Access Token (API Publishing)</Text>
            <PortalLink label="OAuth Playground" url="https://developers.google.com/oauthplayground/" />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Paste ya29.a0... OAuth token"
              placeholderTextColor={theme.colors.textMuted}
              value={bloggerToken}
              onChangeText={setBloggerToken}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>
          <Text style={styles.helperText}>
            Requires Blogger v3 OAuth token (starts with ya29). Expires in 60 min.
          </Text>
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
              <Ionicons name="shield-checkmark-outline" size={15} color="#FFFFFF" />
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
              size={16}
              color={bloggerTestResult.success ? theme.colors.accentDeal : '#EF4444'}
            />
            <Text style={styles.testResultText}>{bloggerTestResult.message}</Text>
          </View>
        )}

        {/* Zero-OAuth Fallback: Secret Post Email */}
        <View style={[styles.inputGroup, { marginTop: 14 }]}>
          <Text style={styles.label}>Blogger Secret Post Email (Zero-OAuth Alternative)</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="yourblog.secretword@blogger.com"
              placeholderTextColor={theme.colors.textMuted}
              value={bloggerEmail}
              onChangeText={setBloggerEmail}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.helperText}>
            Found in Blogger Settings → Email → "Post using email". Never expires!
          </Text>
        </View>
      </View>

      {/* SECTION 4: Telegram Channel */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="paper-plane-outline" size={18} color={theme.colors.telegram} />
            <Text style={styles.cardTitle}>Telegram Deal Channel</Text>
          </View>
          <PortalLink label="BotFather" url="https://t.me/BotFather" />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Telegram Bot Token</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="hardware-chip-outline" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
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
            <Text style={styles.label}>Telegram Channel ID</Text>
            <PortalLink label="Channel ID Bot" url="https://t.me/username_to_id_bot" />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="megaphone-outline" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
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
              <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
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
              size={16}
              color={telegramTestResult.success ? theme.colors.accentDeal : '#EF4444'}
            />
            <Text style={styles.testResultText}>{telegramTestResult.message}</Text>
          </View>
        )}
      </View>

      {/* SAVE BUTTON */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
        <Ionicons name="save-outline" size={18} color="#FFFFFF" />
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
    padding: 14,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 16,
    ...theme.shadows.glowDeal,
  },
  vaultIconWrap: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accentDealGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vaultTextWrap: {
    flex: 1,
  },
  vaultTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
  },
  vaultSub: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xxs,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: theme.colors.accentDealGlow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
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
    marginBottom: 16,
    ...theme.shadows.glowDeal,
  },
  feedbackText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
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
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  },
  portalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.xs,
  },
  portalLinkText: {
    color: theme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
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
    paddingVertical: 10,
    fontSize: theme.typography.sizes.xs,
  },
  helperText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 5,
    lineHeight: 15,
  },
  testBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  testBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  testBtnText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '700',
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: theme.radii.sm,
    marginTop: 10,
    borderWidth: 1,
  },
  testResultSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  testResultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  testResultText: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    paddingVertical: 14,
    marginTop: 6,
    ...theme.shadows.glowPrimary,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
  },
});