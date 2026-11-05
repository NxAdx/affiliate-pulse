import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../theme';
import { DealCategory } from '../types';

interface DealInputBarProps {
  inputUrl: string;
  onChangeUrl: (url: string) => void;
  onGenerate: () => void;
  onAutoHunt: (category: DealCategory, minDiscount: number, keyword?: string) => void;
  isProcessing: boolean;
  statusMessage?: string;
}

const CATEGORIES: { key: DealCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All Deals', icon: 'flame-outline' },
  { key: 'electronics', label: 'Tech & Gadgets', icon: 'laptop-outline' },
  { key: 'fashion', label: "Men's Fashion", icon: 'watch-outline' },
  { key: 'home', label: 'Home & Kitchen', icon: 'home-outline' },
  { key: 'beauty', label: 'Personal Care', icon: 'sparkles-outline' },
  { key: 'fitness', label: 'Fitness & Gear', icon: 'barbell-outline' },
];

const DISCOUNT_STEPS = [40, 50, 60, 70];

export const DealInputBar: React.FC<DealInputBarProps> = ({
  inputUrl,
  onChangeUrl,
  onGenerate,
  onAutoHunt,
  isProcessing,
  statusMessage,
}) => {
  const [isHuntFiltersOpen, setIsHuntFiltersOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DealCategory>('all');
  const [minDiscount, setMinDiscount] = useState(40);
  const [huntKeyword, setHuntKeyword] = useState('');

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim().startsWith('http')) {
        onChangeUrl(text.trim());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch {
      // Ignore
    }
  };

  const handleTriggerHunt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAutoHunt(selectedCategory, minDiscount, huntKeyword.trim() || undefined);
  };

  return (
    <View style={styles.container}>
      {/* Primary Input Container */}
      <View style={styles.inputWrapper}>
        <Ionicons name="link-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={inputUrl}
          onChangeText={onChangeUrl}
          placeholder="Paste Amazon, Flipkart or Myntra link..."
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={onGenerate}
        />
        {inputUrl.length > 0 ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => {
              onChangeUrl('');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.pasteBtn}
            onPress={handlePaste}
            activeOpacity={0.7}
          >
            <Ionicons name="clipboard-outline" size={14} color={theme.colors.primaryLight} />
            <Text style={styles.pasteText}>Paste</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Row: Primary Generate Button + Auto-Hunt Toggle */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.generateBtn,
            (!inputUrl.trim() || isProcessing) && styles.generateBtnDisabled,
          ]}
          onPress={onGenerate}
          disabled={!inputUrl.trim() || isProcessing}
          activeOpacity={0.85}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="sparkles" size={15} color="#FFFFFF" />
              <Text style={styles.generateBtnText}>Generate Content</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.huntToggleBtn,
            isHuntFiltersOpen && styles.huntToggleBtnActive,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsHuntFiltersOpen(!isHuntFiltersOpen);
          }}
          activeOpacity={0.75}
        >
          <Ionicons
            name={isHuntFiltersOpen ? 'chevron-up' : 'search'}
            size={14}
            color={isHuntFiltersOpen ? theme.colors.primaryLight : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.huntToggleText,
              isHuntFiltersOpen && styles.huntToggleTextActive,
            ]}
          >
            Auto-Hunt
          </Text>
        </TouchableOpacity>
      </View>

      {/* Collapsible Auto-Hunt Filter Tray */}
      {isHuntFiltersOpen && (
        <View style={styles.huntTray}>
          {/* Custom Search Keyword */}
          <View style={styles.searchKeywordRow}>
            <Ionicons name="search-outline" size={14} color={theme.colors.textMuted} />
            <TextInput
              style={styles.keywordInput}
              value={huntKeyword}
              onChangeText={setHuntKeyword}
              placeholder="Filter keyword (e.g. Fossil, Tissot, Sony, Nike)..."
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          {/* Category Horizontal Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(cat.key);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={12}
                    color={active ? '#FFFFFF' : theme.colors.textSecondary}
                  />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Discount Stepper Chips + Trigger Hunt */}
          <View style={styles.discountHuntRow}>
            <View style={styles.discountChips}>
              {DISCOUNT_STEPS.map((disc) => {
                const active = minDiscount === disc;
                return (
                  <TouchableOpacity
                    key={disc}
                    style={[styles.discountChip, active && styles.discountChipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMinDiscount(disc);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.discountText,
                        active && styles.discountTextActive,
                      ]}
                    >
                      {disc}%+
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.huntTriggerBtn}
              onPress={handleTriggerHunt}
              disabled={isProcessing}
              activeOpacity={0.85}
            >
              <Ionicons name="flame" size={13} color="#FFFFFF" />
              <Text style={styles.huntTriggerText}>Hunt 1 Deal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Subtle Micro-Status Pill */}
      {statusMessage ? (
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText} numberOfLines={1}>
            {statusMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.regular,
  },
  clearBtn: {
    padding: 4,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderCurve: 'continuous',
    gap: 4,
  },
  pasteText: {
    color: theme.colors.primaryLight,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  generateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    gap: 6,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  huntToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderCurve: 'continuous',
    gap: 6,
  },
  huntToggleBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  huntToggleText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.medium,
  },
  huntToggleTextActive: {
    color: theme.colors.primaryLight,
    fontWeight: theme.typography.weights.semibold,
  },
  huntTray: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 12,
    marginTop: 8,
  },
  searchKeywordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: 8,
    borderCurve: 'continuous',
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
    marginBottom: 8,
  },
  keywordInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.xs,
  },
  chipsScroll: {
    gap: 6,
    paddingBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderCurve: 'continuous',
    gap: 5,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.semibold,
  },
  discountHuntRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  discountChips: {
    flexDirection: 'row',
    gap: 4,
  },
  discountChip: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderCurve: 'continuous',
  },
  discountChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: theme.colors.accentWarning,
  },
  discountText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
    fontVariant: ['tabular-nums'],
  },
  discountTextActive: {
    color: theme.colors.accentWarning,
    fontWeight: theme.typography.weights.bold,
  },
  huntTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentWarning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderCurve: 'continuous',
    gap: 5,
  },
  huntTriggerText: {
    color: '#070A10',
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderCurve: 'continuous',
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primaryLight,
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
  },
});
