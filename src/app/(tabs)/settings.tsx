import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../theme';

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

  const handleSave = () => {
    updateSettings({
      geminiApiKey,
      amazonAffiliateTag: amazonTag,
      flipkartAffiliateTag: flipkartTag,
      earnkaroToken,
      bloggerBlogId,
      bloggerAccessToken: bloggerToken,
      telegramBotToken: telegramToken,
      telegramChannelId: telegramChannel,
    });
    Alert.alert('Settings Saved', 'Your affiliate tags and API credentials have been saved.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>AI & Intelligence</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Gemini API Key</Text>
        <TextInput
          style={styles.input}
          placeholder="AIzaSy..."
          placeholderTextColor={theme.colors.textMuted}
          value={geminiApiKey}
          onChangeText={setGeminiApiKey}
          secureTextEntry
        />
      </View>

      <Text style={styles.sectionHeader}>Affiliate Tracking Tags</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amazon Associate Tag</Text>
        <TextInput
          style={styles.input}
          placeholder="yourtag-21"
          placeholderTextColor={theme.colors.textMuted}
          value={amazonTag}
          onChangeText={setAmazonTag}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Flipkart Affiliate ID</Text>
        <TextInput
          style={styles.input}
          placeholder="affiliate_id"
          placeholderTextColor={theme.colors.textMuted}
          value={flipkartTag}
          onChangeText={setFlipkartTag}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>EarnKaro / Cuelinks Token</Text>
        <TextInput
          style={styles.input}
          placeholder="Optional token..."
          placeholderTextColor={theme.colors.textMuted}
          value={earnkaroToken}
          onChangeText={setEarnkaroToken}
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.sectionHeader}>Google Blogger (Blogspot)</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Blogger Blog ID</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 84930219481029384"
          placeholderTextColor={theme.colors.textMuted}
          value={bloggerBlogId}
          onChangeText={setBloggerBlogId}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Blogger OAuth Access Token</Text>
        <TextInput
          style={styles.input}
          placeholder="ya29.a0..."
          placeholderTextColor={theme.colors.textMuted}
          value={bloggerToken}
          onChangeText={setBloggerToken}
          secureTextEntry
        />
      </View>

      <Text style={styles.sectionHeader}>Telegram Channel</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Telegram Bot Token</Text>
        <TextInput
          style={styles.input}
          placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
          placeholderTextColor={theme.colors.textMuted}
          value={telegramToken}
          onChangeText={setTelegramToken}
          secureTextEntry
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Telegram Channel Username / ID</Text>
        <TextInput
          style={styles.input}
          placeholder="@yourdealschannel"
          placeholderTextColor={theme.colors.textMuted}
          value={telegramChannel}
          onChangeText={setTelegramChannel}
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save All Settings</Text>
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
    paddingBottom: 40,
  },
  sectionHeader: {
    color: theme.colors.primaryLight,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    padding: 12,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    fontSize: theme.typography.sizes.sm,
  },
  saveBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    marginTop: 24,
    ...theme.shadows.glowPrimary,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.bold,
    fontSize: theme.typography.sizes.base,
  },
});