import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../theme';

export default function HistoryScreen() {
  const { dealsHistory, clearHistory, removeDealFromHistory } = useAppStore();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.subTitle}>Recent Generated Deals ({dealsHistory.length})</Text>
        {dealsHistory.length > 0 && (
          <TouchableOpacity onPress={clearHistory}>
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {dealsHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No deals generated yet</Text>
          <Text style={styles.emptySub}>
            Paste a product link in the Generator or share from Amazon/Flipkart to start.
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {dealsHistory.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.categoryBadge,
                    item.category === 'fashion'
                      ? { backgroundColor: theme.colors.secondary }
                      : { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={styles.categoryBadgeText}>
                    {item.category.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.dateText}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <Text style={styles.productTitle} numberOfLines={2}>
                {item.product.title}
              </Text>
              <Text style={styles.priceText}>{item.product.currentPrice}</Text>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => removeDealFromHistory(item.id)}
              >
                <Text style={styles.deleteBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subTitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  clearBtnText: {
    color: theme.colors.accentDanger,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    marginBottom: 8,
  },
  emptySub: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.sm,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.black,
  },
  dateText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
  },
  productTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    marginBottom: 6,
  },
  priceText: {
    color: theme.colors.accentDeal,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    marginBottom: 10,
  },
  deleteBtn: {
    alignSelf: 'flex-end',
  },
  deleteBtnText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
  },
});