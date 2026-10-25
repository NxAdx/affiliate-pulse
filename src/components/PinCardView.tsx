import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { theme } from '../theme';

interface PinCardViewProps {
  title: string;
  badgeText?: string;
  priceTag: string;
  originalPrice?: string;
  discountPercent?: string;
  imageUrl: string;
}

export const PinCardView = forwardRef<View, PinCardViewProps>(
  (
    {
      title,
      badgeText = 'MUST-HAVE LOOK',
      priceTag,
      originalPrice,
      discountPercent = 'HOT DEAL',
      imageUrl,
    },
    ref
  ) => {
    return (
      <View ref={ref} style={styles.cardContainer} collapsable={false}>
        {/* Product Image */}
        <Image source={{ uri: imageUrl }} style={styles.backgroundImage} resizeMode="cover" />

        {/* Top Floating Badge */}
        <View style={styles.topBadgeContainer}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{badgeText.toUpperCase()}</Text>
          </View>
        </View>

        {/* Bottom Gradient / Card Overlay */}
        <View style={styles.bottomOverlay}>
          {/* Price & Discount Row */}
          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <Text style={styles.priceValue}>{priceTag.replace(/[^0-9]/g, '')}</Text>
            </View>

            {originalPrice && (
              <Text style={styles.originalPriceText}>{originalPrice}</Text>
            )}

            <View style={styles.discountPill}>
              <Text style={styles.discountText}>{discountPercent}</Text>
            </View>
          </View>

          {/* Pin Title */}
          <Text style={styles.titleText} numberOfLines={2}>
            {title}
          </Text>

          {/* Visual CTA Bar */}
          <View style={styles.ctaBar}>
            <Text style={styles.ctaText}>TAP TO VIEW DEAL &rarr;</Text>
          </View>
        </View>
      </View>
    );
  }
);

PinCardView.displayName = 'PinCardView';

const styles = StyleSheet.create({
  cardContainer: {
    width: 320,
    height: 480, // Strict 2:3 vertical aspect ratio (320x480 -> 1000x1500 render)
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    ...theme.shadows.card,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  topBadgeContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  badgePill: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.black,
    letterSpacing: 1,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    color: theme.colors.accentDeal,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  priceValue: {
    color: theme.colors.accentDeal,
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.black,
  },
  originalPriceText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    textDecorationLine: 'line-through',
  },
  discountPill: {
    backgroundColor: theme.colors.accentWarning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.sm,
  },
  discountText: {
    color: '#000000',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  titleText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    lineHeight: 20,
    marginBottom: 12,
  },
  ctaBar: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.8,
  },
});