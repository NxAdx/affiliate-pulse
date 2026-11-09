import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../theme';
import { PinCardView } from './PinCardView';
import {
  CinematicStudioService,
  CINEMATIC_PRESETS,
  CinematicPresetKey,
} from '../services/cinematicStudio';

interface PinterestStudioCardProps {
  pinCardRef: React.RefObject<any>;
  title: string;
  price: string;
  originalPrice?: string;
  discountPercent?: string;
  imageUrl: string;
  affiliateUrl: string;
  platform: 'amazon' | 'flipkart' | 'myntra' | 'other';
  selectedPresetKey: CinematicPresetKey;
  onSelectPreset: (key: CinematicPresetKey) => void;
  targetBoardUrl: string;
  onImageChanged: (newUrl: string) => void;
  onExportGraphic: () => void;
  statusMessage?: string;
}

export const PinterestStudioCard: React.FC<PinterestStudioCardProps> = ({
  pinCardRef,
  title,
  price,
  originalPrice,
  discountPercent,
  imageUrl,
  affiliateUrl,
  platform,
  selectedPresetKey,
  onSelectPreset,
  targetBoardUrl,
  onImageChanged,
  onExportGraphic,
  statusMessage,
}) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [isPastedImage, setIsPastedImage] = React.useState(false);

  const handleCopyText = async (text: string, key: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCreateClickablePin = async () => {
    if (!affiliateUrl) {
      Alert.alert('No Affiliate URL', 'Please enter a valid product link first.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await CinematicStudioService.openPinterestPinBuilder(
      affiliateUrl,
      imageUrl,
      title,
      `${discountPercent || 'Best Deal'} • Direct Affiliate Link`
    );
  };

  const handleCopyChatGptPrompt = () => {
    const prompt = CinematicStudioService.buildReferencePrompt(title, selectedPresetKey);
    handleCopyText(prompt, 'chatgpt');
  };

  const handleCopyProductImage = () => {
    if (imageUrl) {
      handleCopyText(imageUrl, 'image');
    }
  };

  const handlePasteImageFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const clean = (text || '').trim();
      if (clean && (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:image'))) {
        onImageChanged(clean);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsPastedImage(true);
        setTimeout(() => setIsPastedImage(false), 2500);
      } else {
        Alert.alert(
          'Clipboard Empty or Invalid',
          'Please copy a valid image link (http... or data:image) before tapping paste.'
        );
      }
    } catch {
      // Ignore
    }
  };

  return (
    <View style={styles.card}>
      {/* Header with Board Link */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="logo-pinterest" size={18} color={theme.colors.pinterest} />
          <Text style={styles.cardTitle}>Pinterest Cinematic Studio</Text>
        </View>

        <TouchableOpacity
          style={styles.boardLinkBtn}
          onPress={() => CinematicStudioService.openBoard(targetBoardUrl)}
          activeOpacity={0.7}
        >
          <Ionicons name="open-outline" size={11} color={theme.colors.pinterest} />
          <Text style={styles.boardLinkText}>Fashion Board</Text>
        </TouchableOpacity>
      </View>

      {/* Cinematic Aesthetic Direction Chips */}
      <View style={styles.presetsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
          {Object.values(CINEMATIC_PRESETS).map((preset) => {
            const active = selectedPresetKey === preset.key;
            return (
              <TouchableOpacity
                key={preset.key}
                style={[styles.presetChip, active && styles.presetChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectPreset(preset.key);
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={preset.icon as any}
                  size={12}
                  color={active ? '#FFFFFF' : theme.colors.textSecondary}
                />
                <Text style={[styles.presetText, active && styles.presetTextActive]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Pin Graphic Preview (2:3 Ratio) */}
      <View style={styles.pinCenterWrap}>
        <PinCardView
          ref={pinCardRef}
          title={title}
          badgeText={discountPercent || 'HOT DEAL'}
          priceTag={price}
          originalPrice={originalPrice}
          discountPercent={discountPercent}
          imageUrl={imageUrl}
          platform={platform}
          ctaText="TAP TO GRAB DEAL →"
        />
      </View>

      {/* Primary Action: 1-Tap Clickable Pin */}
      <TouchableOpacity
        style={styles.primaryPinBtn}
        onPress={handleCreateClickablePin}
        activeOpacity={0.85}
      >
        <Ionicons name="logo-pinterest" size={18} color="#FFFFFF" />
        <Text style={styles.primaryPinBtnText}>Create Clickable Pin (1-Tap)</Text>
      </TouchableOpacity>

      {/* Studio Utility Actions (2x2 Balanced Grid) */}
      <View style={styles.utilityGrid}>
        {/* Row 1: AI Prompt & Image Update */}
        <View style={styles.utilityRow}>
          <TouchableOpacity
            style={[styles.utilityBtn, copiedKey === 'chatgpt' && styles.utilityBtnSuccess]}
            onPress={handleCopyChatGptPrompt}
            activeOpacity={0.75}
          >
            <Ionicons
              name={copiedKey === 'chatgpt' ? 'checkmark-circle' : 'sparkles'}
              size={13}
              color={copiedKey === 'chatgpt' ? theme.colors.accentDeal : theme.colors.primaryLight}
            />
            <Text
              style={[
                styles.utilityBtnText,
                copiedKey === 'chatgpt' && styles.utilityBtnTextSuccess,
              ]}
              numberOfLines={1}
            >
              {copiedKey === 'chatgpt' ? 'Prompt Copied!' : 'Copy AI Prompt'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.utilityBtn, isPastedImage && styles.utilityBtnSuccess]}
            onPress={handlePasteImageFromClipboard}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isPastedImage ? 'checkmark-circle' : 'clipboard-outline'}
              size={13}
              color={isPastedImage ? theme.colors.accentDeal : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.utilityBtnText,
                isPastedImage && styles.utilityBtnTextSuccess,
              ]}
              numberOfLines={1}
            >
              {isPastedImage ? 'Image Pasted!' : 'Paste New Image'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: Asset Management & Export */}
        <View style={styles.utilityRow}>
          <TouchableOpacity
            style={[styles.utilityBtn, copiedKey === 'image' && styles.utilityBtnSuccess]}
            onPress={handleCopyProductImage}
            activeOpacity={0.75}
          >
            <Ionicons
              name={copiedKey === 'image' ? 'checkmark-circle' : 'image-outline'}
              size={13}
              color={copiedKey === 'image' ? theme.colors.accentDeal : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.utilityBtnText,
                copiedKey === 'image' && styles.utilityBtnTextSuccess,
              ]}
              numberOfLines={1}
            >
              {copiedKey === 'image' ? 'Link Copied!' : 'Copy Image Link'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilityBtn}
            onPress={onExportGraphic}
            activeOpacity={0.75}
          >
            <Ionicons name="share-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={styles.utilityBtnText} numberOfLines={1}>
              Export Pin Graphic
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Status feedback */}
      {statusMessage ? (
        <View style={styles.statusWrap}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : null}
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
    marginBottom: 12,
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
  boardLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 0, 35, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230, 0, 35, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderCurve: 'continuous',
    gap: 4,
  },
  boardLinkText: {
    color: theme.colors.pinterest,
    fontSize: 11,
    fontWeight: theme.typography.weights.semibold,
  },
  presetsWrapper: {
    marginBottom: 12,
  },
  presetsScroll: {
    gap: 6,
  },
  presetChip: {
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
  presetChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  presetText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: theme.typography.weights.medium,
  },
  presetTextActive: {
    color: '#FFFFFF',
    fontWeight: theme.typography.weights.semibold,
  },
  pinCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  primaryPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.pinterest,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    marginTop: 12,
    gap: 8,
  },
  primaryPinBtnText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
  },
  utilityGrid: {
    marginTop: 10,
    gap: 8,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  statusWrap: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderCurve: 'continuous',
    alignSelf: 'center',
    marginTop: 8,
  },
  statusText: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
});

