import React, { forwardRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { theme } from '../theme';

export interface PinCardViewProps {
  title: string;
  badgeText?: string;
  priceTag: string;
  originalPrice?: string;
  discountPercent?: string;
  imageUrl: string;
  platform?: 'amazon' | 'flipkart' | 'myntra' | 'other';
  width?: number;
  height?: number;
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
      platform = 'other',
      width = 320,
      height = 480, // Strict 2:3 aspect ratio (320x480 default -> scales cleanly)
    },
    ref
  ) => {
    // Format numeric price
    const cleanPrice = priceTag.replace(/[^0-9,]/g, '') || priceTag;
    const platformLabel = platform === 'myntra' ? 'MYNTRA' : platform === 'amazon' ? 'AMAZON' : platform === 'flipkart' ? 'FLIPKART' : 'STORE';

    return (
      <View
        ref={ref}
        style={[styles.cardContainer, { width, height }]}
        collapsable={false}
      >
        {/* Full-bleed Product Image */}
        <Image
          source={{ uri: imageUrl }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />

        {/* Top Floating Badges Bar */}
        <View style={styles.topBadgeRow}>
          {/* Trend / Style Vibe Badge */}
          <View style={styles.vibeBadge}>
            <Text style={styles.vibeBadgeText}>✨ {badgeText.toUpperCase()}</Text>
          </View>

          {/* Retailer / Platform Tag */}
          <View style={styles.platformBadge}>
            <Text style={styles.platformBadgeText}>{platformLabel}</Text>
          </View>
        </View>

        {/* Bottom Editorial Scrim & Price Overlay */}
        <View style={styles.bottomOverlay}>
          {/* Price & Discount Row */}
          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <Text style={styles.priceValue}>{cleanPrice}</Text>
            </View>

            {originalPrice ? (
              <Text style={styles.originalPriceText}>{originalPrice}</Text>
            ) : null}

            {discountPercent ? (
              <View style={styles.discountPill}>
                <Text style={styles.discountText}>{discountPercent.toUpperCase()}</Text>
              </View>
            ) : null}
          </View>

          {/* Pin Headline / Styling Hook */}
          <Text style={styles.titleText} numberOfLines={2}>
            {title}
          </Text>

          {/* High-Converting CTA Button */}
          <View style={styles.ctaBar}>
            <Text style={styles.ctaText}>TAP TO SHOP THE LOOK &rarr;</Text>
          </View>
        </View>
      </View>
    );
  }
);

PinCardView.displayName = 'PinCardView';

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: theme.radii.xl,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...theme.shadows.card,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  topBadgeRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  vibeBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.6)', // Accent Magenta border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  vibeBadgeText: {
    color: '#F472B6',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.black,
    letterSpacing: 0.6,
  },
  platformBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  platformBadgeText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    letterSpacing: 0.8,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
    backgroundColor: 'rgba(11, 15, 23, 0.92)',
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    color: theme.colors.accentDeal,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.black,
    marginRight: 1,
  },
  priceValue: {
    color: theme.colors.accentDeal,
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.black,
    letterSpacing: -0.5,
  },
  originalPriceText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    textDecorationLine: 'line-through',
    fontWeight: theme.typography.weights.medium,
  },
  discountPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.sm,
  },
  discountText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: theme.typography.weights.black,
    letterSpacing: 0.4,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    lineHeight: 20,
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  ctaBar: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.black,
    letterSpacing: 1,
  },
});