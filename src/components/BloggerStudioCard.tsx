import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../theme';

interface BloggerStudioCardProps {
  title?: string;
  htmlContent?: string;
  isPublishing: boolean;
  publishSuccessUrl?: string | null;
  onPublish: () => void;
  blogId?: string;
}

export const BloggerStudioCard: React.FC<BloggerStudioCardProps> = ({
  title,
  htmlContent,
  isPublishing,
  publishSuccessUrl,
  onPublish,
  blogId,
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCopiedHtml, setIsCopiedHtml] = useState(false);

  const handleCopyHtml = async () => {
    if (!htmlContent) return;
    await Clipboard.setStringAsync(htmlContent);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsCopiedHtml(true);
    setTimeout(() => setIsCopiedHtml(false), 2500);
  };

  const handleOpenDashboard = () => {
    const url = blogId
      ? `https://www.blogger.com/blog/posts/${blogId}`
      : 'https://www.blogger.com';
    Linking.openURL(url);
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="newspaper-outline" size={18} color={theme.colors.blogger} />
          <Text style={styles.cardTitle}>Google Blogger Review Studio</Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>SEO 1200+ WORDS</Text>
        </View>
      </View>

      {/* Article Title Preview */}
      <View style={styles.titleBox}>
        <Text style={styles.articleTitle} numberOfLines={2}>
          {title || 'Generate a deal to preview the in-depth SEO review...'}
        </Text>
      </View>

      {/* Published Live Link Banner */}
      {publishSuccessUrl ? (
        <TouchableOpacity
          style={styles.successBanner}
          onPress={() => Linking.openURL(publishSuccessUrl)}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={16} color={theme.colors.accentDeal} />
          <Text style={styles.successText} numberOfLines={1}>
            Live on GadgetNX: Tap to view article ↗
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Primary Action: 1-Tap Publish */}
      <TouchableOpacity
        style={[
          styles.publishBtn,
          (!htmlContent || isPublishing) && styles.publishBtnDisabled,
        ]}
        onPress={onPublish}
        disabled={!htmlContent || isPublishing}
        activeOpacity={0.85}
      >
        {isPublishing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="cloud-upload" size={17} color="#FFFFFF" />
            <Text style={styles.publishBtnText}>Publish to GadgetNX (1-Tap)</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Secondary Clean Utility Row */}
      <View style={styles.utilityRow}>
        <TouchableOpacity
          style={styles.utilityBtn}
          onPress={() => setIsPreviewOpen(true)}
          disabled={!htmlContent}
          activeOpacity={0.7}
        >
          <Ionicons name="eye-outline" size={13} color={theme.colors.textSecondary} />
          <Text style={styles.utilityBtnText}>Preview HTML</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.utilityBtn, isCopiedHtml && styles.utilityBtnSuccess]}
          onPress={handleCopyHtml}
          disabled={!htmlContent}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isCopiedHtml ? 'checkmark-circle' : 'copy-outline'}
            size={13}
            color={isCopiedHtml ? theme.colors.accentDeal : theme.colors.textSecondary}
          />
          <Text style={[styles.utilityBtnText, isCopiedHtml && styles.utilityBtnTextSuccess]}>
            {isCopiedHtml ? 'HTML Copied!' : 'Copy HTML'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.utilityBtn}
          onPress={handleOpenDashboard}
          activeOpacity={0.7}
        >
          <Ionicons name="open-outline" size={13} color={theme.colors.textSecondary} />
          <Text style={styles.utilityBtnText}>Dashboard ↗</Text>
        </TouchableOpacity>
      </View>

      {/* Full-Screen HTML Preview Modal */}
      <Modal
        visible={isPreviewOpen}
        animationType="slide"
        onRequestClose={() => setIsPreviewOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Blogger Post HTML</Text>
            <TouchableOpacity
              onPress={() => setIsPreviewOpen(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.htmlCodeText} selectable>
              {htmlContent}
            </Text>
          </ScrollView>
        </View>
      </Modal>
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
  badge: {
    backgroundColor: 'rgba(245, 125, 0, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderCurve: 'continuous',
  },
  badgeText: {
    color: theme.colors.blogger,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
  },
  titleBox: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 10,
    marginBottom: 10,
  },
  articleTitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  successText: {
    color: theme.colors.accentDeal,
    fontSize: 12,
    fontWeight: theme.typography.weights.semibold,
    flex: 1,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.blogger,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    gap: 8,
  },
  publishBtnDisabled: {
    opacity: 0.5,
  },
  publishBtnText: {
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
    height: 38,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 8,
    gap: 6,
  },
  utilityBtnSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  utilityBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
  },
  utilityBtnTextSuccess: {
    color: theme.colors.accentDeal,
    fontWeight: theme.typography.weights.semibold,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  htmlCodeText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: theme.typography.fontFamilies.mono,
    lineHeight: 16,
  },
});

