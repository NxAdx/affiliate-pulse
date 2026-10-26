import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../theme';

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
  const [telegramToken, setTelegramToken] = useState(settings.telegramBotToken);
  const [telegramChannel, setTelegramChannel] = useState(settings.telegramChannelId);

  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    setGeminiApiKey(settings.geminiApiKey);
    setAmazonTag(settings.amazonAffiliateTag);
    setFlipkartTag(settings.flipkartAffiliateTag);
    setEarnkaroToken(settings.earnkaroToken);
    setBloggerBlogId(settings.bloggerBlogId);
    setBloggerToken(settings.bloggerAccessToken);
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
      telegramBotToken: telegramToken.trim(),
      telegramChannelId: telegramChannel.trim(),
    });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3500);
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
            <Text style={styles.cardTitle}>AI & Intelligence</Text>
          </View>
          <PortalLink
            label="Get Gemini Key"
            url="https://aistudio.google.com/app/apikey"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Google Gemini API Key</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="key-outline" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Paste AIzaSy... key"
              placeholderTextColor={theme.colors.textMuted}
              value={geminiApiKey}
              onChangeText={setGeminiApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>
          <Text style={styles.helperText}>Used for generating 500-word SEO articles & deal copy.</Text>
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
              placeholder="e.g. 84930219481029384"
              placeholderTextColor={theme.colors.textMuted}
              value={bloggerBlogId}
              onChangeText={setBloggerBlogId}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Blogger OAuth Access Token</Text>
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
            Google OAuth tokens expire after 60 min. You can always tap "Copy HTML" in the Generator to paste directly into your Blogger dashboard!
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
              placeholder="123456789:ABCdefGhIJKlmNoPQRs..."
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
            <Text style={styles.label}>Channel Username or ID</Text>
            <PortalLink label="Find Channel ID" url="https://t.me/username_to_id_bot" />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="megaphone-outline" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputWithIcon}
              placeholder="@yourdealschannel or -100123456789"
              placeholderTextColor={theme.colors.textMuted}
              value={telegramChannel}
              onChangeText={setTelegramChannel}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>
      </View>

      {/* Primary Save Action */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
        <Ionicons name="save-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={styles.saveBtnText}>Save All Credentials to Vault</Text>
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
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radii.md,
    padding: 12,
    marginBottom: 16,
  },
  vaultIconWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.accentDeal,
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
    backgroundColor: theme.colors.accentDeal,
    padding: 12,
    borderRadius: theme.radii.md,
    marginBottom: 16,
    gap: 8,
  },
  feedbackText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: theme.typography.sizes.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radii.lg,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    paddingBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  portalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  portalLinkText: {
    color: theme.colors.primaryLight,
    fontSize: theme.typography.sizes.xxs,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    marginBottom: 4,
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
    fontSize: theme.typography.sizes.sm,
  },
  helperText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xxs,
    marginTop: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...theme.shadows.glowPrimary,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: theme.typography.sizes.base,
    letterSpacing: 0.3,
  },
});