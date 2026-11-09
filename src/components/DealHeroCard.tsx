import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';
import { ProductMetadata } from '../types';

interface DealHeroCardProps {
  product: ProductMetadata;
  customPrice?: string;
  customMrp?: string;
  customDiscount?: string;
  customTitle?: string;
  customImageUrl?: string;
  onOpenTuning: () => void;
  onCopyAffiliateUrl: () => void;
  onRemove?: () => void;
  onClear?: () => void;
  isCopiedUrl?: boolean;
}

export const DealHeroCard: React.FC<DealHeroCardProps> = ({
  product,
  customPrice,
  customMrp,
  customDiscount,
  customTitle,
  customImageUrl,
  onOpenTuning,
  onCopyAffiliateUrl,
  onRemove,
  onClear,
  isCopiedUrl,
}) => {
  const displayTitle = customTitle || product.title;
  const displayImage = customImageUrl || product.imageUrl;
  const displayPrice = customPrice || product.currentPrice;
  const displayMrp = customMrp || product.originalPrice;
  const displayDiscount = customDiscount || product.discountPercent;

  return (
    <View style={styles.card}>
      {/* Top Meta Row */}
      <View style={styles.metaRow}>
        <View style={styles.platformBadge}>
          <Text style={styles.platformText}>{product.platform.toUpperCase()}</Text>
        </View>

        {product.dealScore ? (
          <View style={styles.scoreBadge}>
            <Ionicons name="shield-checkmark" size={11} color={theme.colors.accentDeal} />
            <Text style={styles.scoreText} numberOfLines={1}>
              {product.dealScore.startsWith('SCORE:') ? product.dealScore : `SCORE: ${product.dealScore}`}
            </Text>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        {/* Action Buttons: Edit & Clear/Remove */}
        <View style={styles.metaActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenTuning();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>

          {(onRemove || onClear) && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (onClear) onClear();
                else if (onRemove) onRemove();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={12} color={theme.colors.accentDanger} />
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Layout: Image + Details */}
      <View style={styles.contentRow}>
        {displayImage ? (
          <Image
            source={{ uri: displayImage }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="image-outline" size={24} color={theme.colors.textMuted} />
          </View>
        )}

        <View style={styles.detailsCol}>
          <Text style={styles.title} numberOfLines={2}>
            {displayTitle}
          </Text>

          {/* Pricing Row with Tabular Numerals */}
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>{displayPrice}</Text>
            {displayMrp ? (
              <Text style={styles.originalPrice}>{displayMrp}</Text>
            ) : null}
            {displayDiscount ? (
              <View style={styles.discountPill}>
                <Text style={styles.discountText}>{displayDiscount}</Text>
              </View>
            ) : null}
          </View>

          {/* Actions Row: Copy Link & Remove */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.affiliateUrlBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCopyAffiliateUrl();
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isCopiedUrl ? 'checkmark-circle' : 'link-outline'}
                size={13}
                color={isCopiedUrl ? theme.colors.accentDeal : theme.colors.primaryLight}
              />
              <Text
                style={[
                  styles.affiliateUrlText,
                  isCopiedUrl && { color: theme.colors.accentDeal },
                ]}
                numberOfLines={1}
              >
                {isCopiedUrl ? 'Copied Link!' : 'Copy Clean Link'}
              </Text>
            </TouchableOpacity>

            {(onRemove || onClear) && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (onClear) onClear();
                  else if (onRemove) onRemove();
                }}
                activeOpacity={0.7}
                accessibilityLabel="Remove deal"
              >
                <Ionicons name="trash-outline" size={12} color={theme.colors.accentDanger} />
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  platformBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderCurve: 'continuous',
  },
  platformText: {
    color: theme.colors.primaryLight,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.5,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderCurve: 'continuous',
    gap: 4,
    flexShrink: 1,
  },
  scoreText: {
    color: theme.colors.accentDeal,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
  },
  metaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderCurve: 'continuous',
    gap: 4,
  },
  editText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderCurve: 'continuous',
    gap: 4,
  },
  clearText: {
    color: theme.colors.accentDanger,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surfaceElevated,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: theme.typography.weights.semibold,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 4,
  },
  currentPrice: {
    color: theme.colors.accentDeal,
    fontSize: 17,
    fontWeight: theme.typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  originalPrice: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  discountPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderCurve: 'continuous',
  },
  discountText: {
    color: theme.colors.accentWarning,
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  affiliateUrlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  affiliateUrlText: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  removeText: {
    color: theme.colors.accentDanger,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
  },
});

