import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../theme';

export default function HistoryScreen() {
  const router = useRouter();
  const { dealsHistory, clearHistory, removeDealFromHistory } = useAppStore();

  const handleCopy = async (url: string) => {
    if (url) {
      await Clipboard.setStringAsync(url);
    }
  };

  const handleShare = (title: string, url: string) => {
    Share.share({
      message: `${title} 👉 ${url}`,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="archive-outline" size={18} color={theme.colors.primaryLight} />
          <Text style={styles.title}>Vault History</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{dealsHistory.length}</Text>
          </View>
        </View>

        {dealsHistory.length > 0 && (
          <TouchableOpacity onPress={clearHistory} style={styles.clearBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={14} color={theme.colors.accentDanger} />
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {dealsHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cube-outline" size={42} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Vault is Empty</Text>
          <Text style={styles.emptySub}>
            Paste an Amazon, Flipkart, or Myntra link in the Generator to syndicate your first deal.
          </Text>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() => router.push('/')}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.ctaBtnText}>Create Multi-Channel Deal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {dealsHistory.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.badgesRow}>
                  <View
                    style={[
                      styles.categoryBadge,
                      item.category === 'fashion'
                        ? { backgroundColor: theme.colors.secondaryGlow, borderColor: theme.colors.secondary }
                        : { backgroundColor: theme.colors.primaryGlow, borderColor: theme.colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        { color: item.category === 'fashion' ? theme.colors.secondaryLight : theme.colors.primaryLight },
                      ]}
                    >
                      {item.category === 'fashion' ? '👔 FASHION PIN' : '⚡ TECH DEAL'}
                    </Text>
                  </View>

                  <View style={styles.platformBadge}>
                    <Text style={styles.platformBadgeText}>
                      {(item.product.platform || 'DEAL').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.dateText}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <Text style={styles.productTitle} numberOfLines={2}>
                {item.product.title}
              </Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceText}>
                  {item.product.currentPrice && /\d/.test(item.product.currentPrice)
                    ? item.product.currentPrice
                    : '₹1,499'}
                </Text>
                {item.product.originalPrice && /\d/.test(item.product.originalPrice) ? (
                  <Text style={styles.originalPriceText}>{item.product.originalPrice}</Text>
                ) : null}
                {item.product.discountPercent ? (
                  <View style={styles.discountPill}>
                    <Text style={styles.discountPillText}>{item.product.discountPercent}</Text>
                  </View>
                ) : null}
              </View>

              {/* Action Toolbar */}
              <View style={styles.actionToolbar}>
                <TouchableOpacity
                  style={styles.toolBtn}
                  onPress={() => handleCopy(item.product.affiliateUrl)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.toolBtnText}>Copy Link</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toolBtn}
                  onPress={() => handleShare(item.product.title, item.product.affiliateUrl)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social-outline" size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.toolBtnText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toolBtn, styles.deleteToolBtn]}
                  onPress={() => removeDealFromHistory(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={14} color={theme.colors.accentDanger} />
                  <Text style={styles.deleteBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.base,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  countBadge: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  countText: {
    color: theme.colors.primaryLight,
    fontSize: theme.typography.sizes.xxs,
    fontWeight: '700',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearBtnText: {
    color: theme.colors.accentDanger,
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radii.md,
    ...theme.shadows.glowPrimary,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: theme.typography.sizes.sm,
  },
  listContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  platformBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  platformBadgeText: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xxs,
  },
  productTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  priceText: {
    color: theme.colors.accentDeal,
    fontSize: theme.typography.sizes.base,
    fontWeight: '800',
  },
  originalPriceText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    textDecorationLine: 'line-through',
  },
  discountPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  discountPillText: {
    color: theme.colors.accentWarning,
    fontSize: 10,
    fontWeight: '700',
  },
  actionToolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: 10,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  toolBtnText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xxs,
    fontWeight: '600',
  },
  deleteToolBtn: {
    marginLeft: 4,
  },
  deleteBtnText: {
    color: theme.colors.accentDanger,
    fontSize: theme.typography.sizes.xxs,
    fontWeight: '600',
  },
});