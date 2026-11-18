import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';

export interface OmnichannelSyndicateBarProps {
  onSyndicateAll: () => void;
  isSyndicating: boolean;
  telegramStatus: 'idle' | 'publishing' | 'success' | 'failed';
  bloggerStatus: 'idle' | 'publishing' | 'success' | 'failed';
  telegramError?: string;
  bloggerError?: string;
  autoSyndicateEnabled: boolean;
  onToggleAutoSyndicate: () => void;
  hasContent: boolean;
}

export const OmnichannelSyndicateBar: React.FC<OmnichannelSyndicateBarProps> = ({
  onSyndicateAll,
  isSyndicating,
  telegramStatus,
  bloggerStatus,
  telegramError,
  bloggerError,
  autoSyndicateEnabled,
  onToggleAutoSyndicate,
  hasContent,
}) => {
  const isAllSuccess = telegramStatus === 'success' && bloggerStatus === 'success';

  const showStatusAlert = (platform: 'Telegram' | 'Blogger', error?: string) => {
    if (error) {
      Alert.alert(`${platform} Status`, error);
    } else {
      Alert.alert(`${platform} Status`, `Successfully published to ${platform}!`);
    }
  };

  return (
    <View style={styles.card}>
      {/* Top Header: Title + Auto-Publish Toggle */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconCircle}>
            <Ionicons name="flash" size={14} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Omnichannel Autopilot</Text>
            <Text style={styles.cardSubtitle}>1-Tap sync to Telegram & Blogger</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.autoPill, autoSyndicateEnabled && styles.autoPillActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleAutoSyndicate();
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={autoSyndicateEnabled ? 'flash' : 'flash-outline'}
            size={11}
            color={autoSyndicateEnabled ? '#FFFFFF' : theme.colors.textMuted}
          />
          <Text
            style={[styles.autoPillText, autoSyndicateEnabled && styles.autoPillTextActive]}
          >
            {autoSyndicateEnabled ? 'Auto-Post: ON' : 'Auto-Post: OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Primary Action Button: 1-Tap Syndicate Everywhere */}
      <TouchableOpacity
        style={[
          styles.syndicateBtn,
          (!hasContent || isSyndicating) && styles.syndicateBtnDisabled,
          isAllSuccess && styles.syndicateBtnSuccess,
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onSyndicateAll();
        }}
        disabled={!hasContent || isSyndicating}
        activeOpacity={0.85}
      >
        {isSyndicating ? (
          <View style={styles.btnInner}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.syndicateBtnText}>Syndicating Everywhere...</Text>
          </View>
        ) : isAllSuccess ? (
          <View style={styles.btnInner}>
            <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" />
            <Text style={styles.syndicateBtnText}>Syndicated to All Channels!</Text>
          </View>
        ) : (
          <View style={styles.btnInner}>
            <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
            <Text style={styles.syndicateBtnText}>
              Syndicate Everywhere (Telegram + Blogger)
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Live Channel Status Grid */}
      <View style={styles.statusGrid}>
        {/* Telegram Status Chip */}
        <TouchableOpacity
          style={[
            styles.statusChip,
            telegramStatus === 'success' && styles.statusChipSuccess,
            telegramStatus === 'failed' && styles.statusChipFailed,
          ]}
          onPress={() => {
            if (telegramStatus !== 'idle') showStatusAlert('Telegram', telegramError);
          }}
          activeOpacity={0.75}
        >
          {telegramStatus === 'publishing' ? (
            <ActivityIndicator size="small" color={theme.colors.telegram} />
          ) : (
            <Ionicons
              name={
                telegramStatus === 'success'
                  ? 'checkmark-circle'
                  : telegramStatus === 'failed'
                  ? 'alert-circle'
                  : 'paper-plane-outline'
              }
              size={13}
              color={
                telegramStatus === 'success'
                  ? theme.colors.accentDeal
                  : telegramStatus === 'failed'
                  ? theme.colors.accentDanger
                  : theme.colors.telegram
              }
            />
          )}
          <Text
            style={[
              styles.statusChipText,
              telegramStatus === 'success' && styles.statusTextSuccess,
              telegramStatus === 'failed' && styles.statusTextFailed,
            ]}
            numberOfLines={1}
          >
            {telegramStatus === 'publishing'
              ? 'Broadcasting...'
              : telegramStatus === 'success'
              ? 'Telegram: Sent'
              : telegramStatus === 'failed'
              ? 'Telegram: Failed'
              : 'Telegram: Ready'}
          </Text>
        </TouchableOpacity>

        {/* Blogger Status Chip */}
        <TouchableOpacity
          style={[
            styles.statusChip,
            bloggerStatus === 'success' && styles.statusChipSuccess,
            bloggerStatus === 'failed' && styles.statusChipFailed,
          ]}
          onPress={() => {
            if (bloggerStatus !== 'idle') showStatusAlert('Blogger', bloggerError);
          }}
          activeOpacity={0.75}
        >
          {bloggerStatus === 'publishing' ? (
            <ActivityIndicator size="small" color={theme.colors.blogger} />
          ) : (
            <Ionicons
              name={
                bloggerStatus === 'success'
                  ? 'checkmark-circle'
                  : bloggerStatus === 'failed'
                  ? 'alert-circle'
                  : 'newspaper-outline'
              }
              size={13}
              color={
                bloggerStatus === 'success'
                  ? theme.colors.accentDeal
                  : bloggerStatus === 'failed'
                  ? theme.colors.accentDanger
                  : theme.colors.blogger
              }
            />
          )}
          <Text
            style={[
              styles.statusChipText,
              bloggerStatus === 'success' && styles.statusTextSuccess,
              bloggerStatus === 'failed' && styles.statusTextFailed,
            ]}
            numberOfLines={1}
          >
            {bloggerStatus === 'publishing'
              ? 'Publishing...'
              : bloggerStatus === 'success'
              ? 'Blogger: Live'
              : bloggerStatus === 'failed'
              ? 'Blogger: Failed'
              : 'Blogger: Ready'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Helpful diagnostic tip if Blogger failed */}
      {bloggerStatus === 'failed' && bloggerError && (
        <View style={styles.errorNotice}>
          <Ionicons name="information-circle" size={14} color={theme.colors.accentDanger} />
          <Text style={styles.errorNoticeText}>
            {bloggerError.includes('403') || bloggerError.includes('Access Denied')
              ? 'Blogger Webhook returned 403. Set "Who has access" to "Anyone" in script.google.com -> Manage Deployments.'
              : bloggerError}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: theme.typography.weights.bold,
  },
  cardSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  autoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  autoPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  autoPillText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textMuted,
  },
  autoPillTextActive: {
    color: '#FFFFFF',
  },
  syndicateBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  syndicateBtnDisabled: {
    opacity: 0.5,
  },
  syndicateBtnSuccess: {
    backgroundColor: theme.colors.accentDeal,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syndicateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.3,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  statusChipSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusChipFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  statusTextSuccess: {
    color: theme.colors.accentDeal,
    fontWeight: theme.typography.weights.semibold,
  },
  statusTextFailed: {
    color: theme.colors.accentDanger,
    fontWeight: theme.typography.weights.semibold,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderCurve: 'continuous',
    marginTop: 8,
  },
  errorNoticeText: {
    flex: 1,
    color: theme.colors.accentDanger,
    fontSize: 10,
    lineHeight: 14,
  },
});
