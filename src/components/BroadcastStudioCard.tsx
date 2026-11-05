import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../theme';

interface BroadcastStudioCardProps {
  platform: 'telegram' | 'whatsapp' | 'x';
  title: string;
  copyText?: string;
  isBroadcasting?: boolean;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  onSystemShare?: () => void;
}

export const BroadcastStudioCard: React.FC<BroadcastStudioCardProps> = ({
  platform,
  title,
  copyText,
  isBroadcasting,
  onPrimaryAction,
  onSecondaryAction,
  onSystemShare,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const brandColor =
    platform === 'telegram'
      ? theme.colors.telegram
      : platform === 'whatsapp'
      ? theme.colors.whatsapp
      : theme.colors.primaryLight;

  const brandIcon =
    platform === 'telegram'
      ? 'paper-plane'
      : platform === 'whatsapp'
      ? 'logo-whatsapp'
      : 'logo-twitter';

  const brandLabel =
    platform === 'telegram'
      ? 'Broadcast to Telegram Channel'
      : platform === 'whatsapp'
      ? 'Share to WhatsApp'
      : 'Post to X (Twitter)';

  const handleCopy = async () => {
    if (!copyText) return;
    await Clipboard.setStringAsync(copyText);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name={brandIcon as any} size={18} color={brandColor} />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>

        <TouchableOpacity
          style={styles.copyPill}
          onPress={handleCopy}
          disabled={!copyText}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isCopied ? 'checkmark' : 'copy-outline'}
            size={12}
            color={isCopied ? theme.colors.accentDeal : theme.colors.textSecondary}
          />
          <Text style={[styles.copyPillText, isCopied && { color: theme.colors.accentDeal }]}>
            {isCopied ? 'Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Copy Preview Box */}
      <View style={styles.previewBox}>
        <Text style={styles.previewText} numberOfLines={4}>
          {copyText || 'Generate content to preview formatted deal alert...'}
        </Text>
      </View>

      {/* Primary Action Button */}
      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { backgroundColor: brandColor },
          (!copyText || isBroadcasting) && styles.primaryBtnDisabled,
        ]}
        onPress={onPrimaryAction}
        disabled={!copyText || isBroadcasting}
        activeOpacity={0.85}
      >
        {isBroadcasting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name={brandIcon as any} size={16} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>{brandLabel}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Secondary Actions */}
      <View style={styles.utilityRow}>
        {onSecondaryAction ? (
          <TouchableOpacity
            style={styles.utilityBtn}
            onPress={onSecondaryAction}
            disabled={!copyText}
            activeOpacity={0.7}
          >
            <Ionicons name="share-social-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={styles.utilityBtnText}>Direct App Share</Text>
          </TouchableOpacity>
        ) : null}

        {onSystemShare ? (
          <TouchableOpacity
            style={styles.utilityBtn}
            onPress={onSystemShare}
            disabled={!copyText}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={styles.utilityBtnText}>Share to Any App</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderCurve: 'continuous',
    gap: 4,
  },
  copyPillText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
  },
  previewBox: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 10,
    marginBottom: 10,
  },
  previewText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    gap: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  utilityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    height: 36,
    borderRadius: 8,
    borderCurve: 'continuous',
    gap: 4,
  },
  utilityBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
  },
});
