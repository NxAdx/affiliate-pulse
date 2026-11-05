import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { BulkQueueItem, BulkExecutionProgress, DealCategory } from '../types';
import { BulkSyndicationService } from '../services/bulkSyndication';

const CATEGORY_CHIPS: { key: DealCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'Universal', icon: 'sparkles-outline' },
  { key: 'electronics', label: 'Tech & Gadgets', icon: 'hardware-chip-outline' },
  { key: 'fashion', label: 'Fashion', icon: 'shirt-outline' },
  { key: 'home', label: 'Home & Kitchen', icon: 'home-outline' },
  { key: 'beauty', label: 'Grooming', icon: 'color-palette-outline' },
];

const DISCOUNT_PRESETS = [30, 40, 50, 60];

export default function BulkSyndicationView() {
  const {
    bulkQueue,
    setBulkQueue,
    updateBulkQueueItem,
    removeBulkQueueItem,
    clearBulkQueue,
    addDealToHistory,
    settings,
    dealsHistory,
  } = useAppStore();

  // Harvesting Configuration
  const [harvestCount, setHarvestCount] = useState<5 | 10>(5);
  const [selectedCategory, setSelectedCategory] = useState<DealCategory>('all');
  const [minDiscount, setMinDiscount] = useState<number>(40);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isHarvesting, setIsHarvesting] = useState<boolean>(false);

  // Multi-URL Paste Box
  const [isPasteExpanded, setIsPasteExpanded] = useState<boolean>(false);
  const [pastedUrls, setPastedUrls] = useState<string>('');

  // Bulk Execution State
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [progress, setProgress] = useState<BulkExecutionProgress | null>(null);
  const abortRef = useRef<boolean>(false);

  const selectedCount = bulkQueue.filter((item) => item.selected && item.status !== 'done').length;
  const completedCount = bulkQueue.filter((item) => item.status === 'done').length;

  // 1. Auto-Harvest from Amazon Deals
  const handleAutoHarvest = async () => {
    setIsHarvesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const postedAsins = dealsHistory
        .map((d) => d.product?.asin)
        .filter((a): a is string => Boolean(a));

      const newItems = await BulkSyndicationService.harvestDeals({
        count: harvestCount,
        category: selectedCategory,
        minDiscount,
        query: searchKeyword.trim() || undefined,
        associateTag: settings.amazonAffiliateTag || 'dealhunter-21',
        postedAsins,
      });

      if (newItems.length === 0) {
        Alert.alert('No Fresh Deals Found', 'Try adjusting your search keyword or lowering the minimum discount threshold.');
      } else {
        // Merge into existing queue (avoid duplicate ASINs)
        const existingAsins = new Set(bulkQueue.map((item) => item.asin).filter(Boolean));
        const filteredNew = newItems.filter((item) => !item.asin || !existingAsins.has(item.asin));

        setBulkQueue([...filteredNew, ...bulkQueue]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      Alert.alert('Harvesting Error', err?.message || 'Failed to harvest deals. Check network connection.');
    } finally {
      setIsHarvesting(false);
    }
  };

  // 2. Queue Multiple Pasted URLs
  const handleQueuePastedUrls = () => {
    if (!pastedUrls.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const parsed = BulkSyndicationService.parseRawUrls(pastedUrls, selectedCategory);

    if (parsed.length === 0) {
      Alert.alert('Invalid URLs', 'No valid product URLs detected in pasted text.');
      return;
    }

    setBulkQueue([...parsed, ...bulkQueue]);
    setPastedUrls('');
    setIsPasteExpanded(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // 3. Selection Helpers
  const handleToggleSelectAll = (select: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBulkQueue(bulkQueue.map((item) => ({ ...item, selected: select })));
  };

  const handleToggleItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const item = bulkQueue.find((i) => i.id === id);
    if (item) {
      updateBulkQueueItem(id, { selected: !item.selected });
    }
  };

  // 4. Execute 1-Tap Bulk Syndication
  const handleStartBulkSyndication = async () => {
    if (selectedCount === 0) {
      Alert.alert('No Deals Selected', 'Please select at least 1 deal to syndicate.');
      return;
    }

    setIsExecuting(true);
    abortRef.current = false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      await BulkSyndicationService.executeBatch(
        bulkQueue,
        settings,
        {
          onProgress: (p) => setProgress(p),
          onItemUpdate: (updatedItem, record) => {
            updateBulkQueueItem(updatedItem.id, updatedItem);
            if (record) {
              addDealToHistory(record);
            }
          },
          isAborted: () => abortRef.current,
          delayBetweenDealsMs: 3000,
        }
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Batch Execution Error', err?.message || 'An error occurred during bulk syndication.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStopExecution = () => {
    abortRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  return (
    <View style={styles.container}>
      {/* SECTION 1: Batch Harvester Header & Controls */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="flash-outline" size={17} color={theme.colors.accentDeal} />
            <Text style={styles.cardTitle}>Auto-Harvester</Text>
          </View>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>{minDiscount}%+ OFF</Text>
          </View>
        </View>

        {/* Custom Keyword Filter */}
        <View style={styles.searchKeywordWrap}>
          <Ionicons name="search-outline" size={15} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchKeywordInput}
            placeholder="Search keyword (e.g. Air Fryer, Smartwatch...)"
            placeholderTextColor={theme.colors.textMuted}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchKeyword ? (
            <TouchableOpacity onPress={() => setSearchKeyword('')}>
              <Ionicons name="close-circle" size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Horizontal Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORY_CHIPS.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cat.icon}
                  size={13}
                  color={isActive ? theme.colors.primaryLight : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Batch Quota & Discount Threshold */}
        <View style={styles.controlsRow}>
          {/* Quota picker */}
          <View style={styles.quotaPillGroup}>
            <TouchableOpacity
              style={[styles.quotaPill, harvestCount === 5 && styles.quotaPillActive]}
              onPress={() => setHarvestCount(5)}
              activeOpacity={0.75}
            >
              <Text style={[styles.quotaPillText, harvestCount === 5 && styles.quotaPillTextActive]}>
                5 Deals
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quotaPill, harvestCount === 10 && styles.quotaPillActive]}
              onPress={() => setHarvestCount(10)}
              activeOpacity={0.75}
            >
              <Text style={[styles.quotaPillText, harvestCount === 10 && styles.quotaPillTextActive]}>
                10 Deals
              </Text>
            </TouchableOpacity>
          </View>

          {/* Discount chips */}
          <View style={styles.discountPillGroup}>
            {DISCOUNT_PRESETS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.discountPill, minDiscount === d && styles.discountPillActive]}
                onPress={() => setMinDiscount(d)}
                activeOpacity={0.75}
              >
                <Text style={[styles.discountPillText, minDiscount === d && styles.discountPillTextActive]}>
                  {d}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Primary Action Button: Harvest Fresh Deals */}
        <TouchableOpacity
          style={[styles.harvestButton, isHarvesting && styles.buttonDisabled]}
          onPress={handleAutoHarvest}
          disabled={isHarvesting}
          activeOpacity={0.85}
        >
          {isHarvesting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.harvestButtonInner}>
              <Ionicons name="sparkles" size={15} color="#FFFFFF" />
              <Text style={styles.harvestButtonText}>
                Harvest {harvestCount} Deals (≥{minDiscount}% Off)
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Expandable Multi-URL Importer */}
        <TouchableOpacity
          style={styles.pasteToggleBtn}
          onPress={() => setIsPasteExpanded(!isPasteExpanded)}
          activeOpacity={0.75}
        >
          <Ionicons
            name={isPasteExpanded ? 'chevron-up' : 'duplicate-outline'}
            size={14}
            color={theme.colors.primaryLight}
          />
          <Text style={styles.pasteToggleText}>
            {isPasteExpanded ? 'Hide URL Importer' : 'Paste Multiple URLs at Once'}
          </Text>
        </TouchableOpacity>

        {isPasteExpanded && (
          <View style={styles.pasteBox}>
            <TextInput
              style={styles.pasteInput}
              placeholder="Paste Amazon, Flipkart, or Myntra links (one URL per line)..."
              placeholderTextColor={theme.colors.textMuted}
              value={pastedUrls}
              onChangeText={setPastedUrls}
              multiline
              numberOfLines={4}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.pasteQueueBtn}
              onPress={handleQueuePastedUrls}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={14} color="#FFFFFF" />
              <Text style={styles.pasteQueueBtnText}>Add URLs to Queue</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* SECTION 2: Queued Deals Staging Area */}
      <View style={styles.queueHeader}>
        <View style={styles.queueTitleRow}>
          <Text style={styles.queueTitle}>Staging Queue</Text>
          <View style={styles.queueCountPill}>
            <Text style={styles.queueCountText}>
              {bulkQueue.length} {bulkQueue.length === 1 ? 'deal' : 'deals'}
            </Text>
          </View>
        </View>

        {bulkQueue.length > 0 && (
          <View style={styles.queueActionRow}>
            <TouchableOpacity onPress={() => handleToggleSelectAll(true)}>
              <Text style={styles.queueActionText}>Select All</Text>
            </TouchableOpacity>
            <Text style={styles.actionDivider}>•</Text>
            <TouchableOpacity onPress={() => handleToggleSelectAll(false)}>
              <Text style={styles.queueActionText}>Deselect</Text>
            </TouchableOpacity>
            <Text style={styles.actionDivider}>•</Text>
            <TouchableOpacity onPress={clearBulkQueue}>
              <Text style={[styles.queueActionText, { color: theme.colors.accentDanger }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {bulkQueue.length === 0 ? (
        <View style={styles.emptyQueueCard}>
          <Ionicons name="layers-outline" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Queue is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Tap "Harvest Deals" above or paste URLs to stage a batch of products for 1-tap syndication.
          </Text>
        </View>
      ) : (
        <View style={styles.queueList}>
          {bulkQueue.map((item) => {
            const isDone = item.status === 'done';
            const isFailed = item.status === 'failed';
            const isProcessing = item.status === 'generating' || item.status === 'scraping' || item.status === 'publishing';

            return (
              <View
                key={item.id}
                style={[
                  styles.queueCard,
                  item.selected && styles.queueCardSelected,
                  isDone && styles.queueCardDone,
                ]}
              >
                {/* Selection Checkbox */}
                <TouchableOpacity
                  style={[styles.checkbox, item.selected && styles.checkboxActive]}
                  onPress={() => handleToggleItem(item.id)}
                  activeOpacity={0.8}
                >
                  {item.selected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                </TouchableOpacity>

                {/* Thumbnail Image */}
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.itemImage, styles.placeholderImage]}>
                    <Ionicons name="pricetag-outline" size={18} color={theme.colors.textMuted} />
                  </View>
                )}

                {/* Content Info */}
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={styles.itemMetaRow}>
                    <Text style={styles.itemPrice}>{item.price}</Text>
                    {item.mrp && <Text style={styles.itemMrp}>{item.mrp}</Text>}
                    <View style={styles.discountPillMini}>
                      <Text style={styles.discountTextMini}>{item.discount}</Text>
                    </View>
                  </View>

                  {/* Item Status */}
                  <View style={styles.itemStatusRow}>
                    {isProcessing && (
                      <View style={styles.statusProcessingPill}>
                        <ActivityIndicator size="small" color={theme.colors.primaryLight} style={{ transform: [{ scale: 0.7 }] }} />
                        <Text style={styles.statusProcessingText}>Syndicating...</Text>
                      </View>
                    )}

                    {isDone && (
                      <View style={styles.statusDonePill}>
                        <Ionicons name="checkmark-circle" size={12} color={theme.colors.accentDeal} />
                        <Text style={styles.statusDoneText}>Syndicated</Text>
                        {item.bloggerUrl && (
                          <TouchableOpacity onPress={() => Linking.openURL(item.bloggerUrl!)}>
                            <Ionicons name="open-outline" size={11} color={theme.colors.blogger} style={{ marginLeft: 4 }} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {isFailed && (
                      <View style={styles.statusFailedPill}>
                        <Ionicons name="alert-circle" size={12} color={theme.colors.accentDanger} />
                        <Text style={styles.statusFailedText} numberOfLines={1}>
                          {item.errorMessage || 'Failed'}
                        </Text>
                      </View>
                    )}

                    {!isProcessing && !isDone && !isFailed && (
                      <View style={styles.statusIdlePill}>
                        <Text style={styles.statusIdleText}>Queued</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Delete Item */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => removeBulkQueueItem(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={15} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* SECTION 3: Sticky Bulk Action Dock */}
      {bulkQueue.length > 0 && (
        <View style={styles.bottomDock}>
          <TouchableOpacity
            style={[
              styles.bulkSyndicateBtn,
              (selectedCount === 0 || isExecuting) && styles.buttonDisabled,
            ]}
            onPress={handleStartBulkSyndication}
            disabled={selectedCount === 0 || isExecuting}
            activeOpacity={0.85}
          >
            {isExecuting ? (
              <View style={styles.bulkBtnInner}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.bulkSyndicateBtnText}>
                  Syndicating ({progress?.completed || 0}/{progress?.total || selectedCount})...
                </Text>
              </View>
            ) : (
              <View style={styles.bulkBtnInner}>
                <Ionicons name="paper-plane" size={17} color="#FFFFFF" />
                <Text style={styles.bulkSyndicateBtnText}>
                  Bulk Syndicate {selectedCount} {selectedCount === 1 ? 'Deal' : 'Deals'} (1-Tap)
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* SECTION 4: Live Execution Modal HUD */}
      <Modal visible={isExecuting} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="cloud-upload" size={20} color={theme.colors.primaryLight} />
              </View>
              <View style={styles.modalHeaderTexts}>
                <Text style={styles.modalTitle}>Automated Syndication Active</Text>
                <Text style={styles.modalSubtitle}>Posting directly to Blogger & Telegram Channel</Text>
              </View>
            </View>

            {/* Current Deal Title */}
            <View style={styles.currentDealCard}>
              <Text style={styles.currentDealLabel}>Currently Processing:</Text>
              <Text style={styles.currentDealTitle} numberOfLines={2}>
                {progress?.currentTitle || 'Initializing...'}
              </Text>
            </View>

            {/* Progress Count & Tabular Numeral Bar */}
            <View style={styles.progressStatsRow}>
              <Text style={styles.progressStatText}>
                {progress?.completed || 0} of {progress?.total || 0} completed
              </Text>
              <Text style={styles.progressStatPercent}>
                {progress?.total ? Math.round(((progress.completed || 0) / progress.total) * 100) : 0}%
              </Text>
            </View>

            {/* Progress Bar Track */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${
                      progress?.total
                        ? Math.round(((progress.completed || 0) / progress.total) * 100)
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>

            {/* Status Counters */}
            <View style={styles.hudCountersRow}>
              <View style={styles.hudCounterPill}>
                <Ionicons name="checkmark-circle" size={13} color={theme.colors.accentDeal} />
                <Text style={styles.hudCounterText}>{progress?.successful || 0} Published</Text>
              </View>
              <View style={styles.hudCounterPill}>
                <Ionicons name="alert-circle" size={13} color={theme.colors.accentDanger} />
                <Text style={styles.hudCounterText}>{progress?.failed || 0} Failed</Text>
              </View>
            </View>

            {/* Pause/Cancel Button */}
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopExecution}
              activeOpacity={0.8}
            >
              <Ionicons name="pause-circle-outline" size={16} color={theme.colors.accentDanger} />
              <Text style={styles.stopButtonText}>Stop Syndication</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 14,
    marginBottom: 16,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badgePill: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.xs,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.accentDeal,
  },
  badgePillText: {
    color: theme.colors.accentDeal,
    fontSize: 10,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  searchKeywordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  searchKeywordInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    padding: 0,
  },
  categoryScroll: {
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: theme.colors.primaryLight,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quotaPillGroup: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.sm,
    borderCurve: 'continuous',
    padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  quotaPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.xs,
    borderCurve: 'continuous',
  },
  quotaPillActive: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  quotaPillText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  quotaPillTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  discountPillGroup: {
    flexDirection: 'row',
    gap: 5,
  },
  discountPill: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: theme.radii.xs,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  discountPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: theme.colors.accentDeal,
  },
  discountPillText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  discountPillTextActive: {
    color: theme.colors.accentDeal,
    fontWeight: '700',
  },
  harvestButton: {
    backgroundColor: theme.colors.accentDeal,
    paddingVertical: 12,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  harvestButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  harvestButtonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pasteToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    marginTop: 8,
  },
  pasteToggleText: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  pasteBox: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  pasteInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
    padding: 10,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  pasteQueueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.sm,
    borderCurve: 'continuous',
    paddingVertical: 9,
    marginTop: 8,
  },
  pasteQueueBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  queueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
  },
  queueCountPill: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radii.xs,
    borderCurve: 'continuous',
  },
  queueCountText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  queueActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  queueActionText: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  actionDivider: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  emptyQueueCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.xs,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 260,
  },
  queueList: {
    gap: 10,
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 10,
    gap: 10,
  },
  queueCardSelected: {
    borderColor: theme.colors.borderActive,
    backgroundColor: theme.colors.surfaceElevated,
  },
  queueCardDone: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: theme.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.sm,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.background,
  },
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 4,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  itemPrice: {
    color: theme.colors.accentDeal,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  itemMrp: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textDecorationLine: 'line-through',
    fontVariant: ['tabular-nums'],
  },
  discountPillMini: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderCurve: 'continuous',
  },
  discountTextMini: {
    color: theme.colors.accentDeal,
    fontSize: 9,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  itemStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusProcessingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryGlow,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  statusProcessingText: {
    color: theme.colors.primaryLight,
    fontSize: 9,
    fontWeight: '600',
  },
  statusDonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  statusDoneText: {
    color: theme.colors.accentDeal,
    fontSize: 9,
    fontWeight: '700',
  },
  statusFailedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 3,
    maxWidth: 160,
  },
  statusFailedText: {
    color: theme.colors.accentDanger,
    fontSize: 9,
    fontWeight: '600',
  },
  statusIdlePill: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  statusIdleText: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 6,
  },
  bottomDock: {
    marginTop: 16,
  },
  bulkSyndicateBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radii.lg,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.glowPrimary,
  },
  bulkBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkSyndicateBtnText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.sm,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 20,
    ...theme.shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTexts: {
    flex: 1,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  currentDealCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: 10,
    marginBottom: 16,
  },
  currentDealLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 3,
  },
  currentDealTitle: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressStatText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  progressStatPercent: {
    color: theme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 6,
    backgroundColor: theme.colors.background,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  hudCountersRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  hudCounterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: theme.radii.xs,
    borderCurve: 'continuous',
  },
  hudCounterText: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  stopButtonText: {
    color: theme.colors.accentDanger,
    fontSize: 12,
    fontWeight: '700',
  },
});
