import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { theme } from '../theme';

interface DealTuningModalProps {
  visible: boolean;
  onClose: () => void;
  initialTitle: string;
  initialImageUrl: string;
  initialPrice: string;
  initialMrp: string;
  initialDiscount: string;
  onApply: (data: {
    title: string;
    imageUrl: string;
    price: string;
    mrp: string;
    discount: string;
  }) => void;
}

export const DealTuningModal: React.FC<DealTuningModalProps> = ({
  visible,
  onClose,
  initialTitle,
  initialImageUrl,
  initialPrice,
  initialMrp,
  initialDiscount,
  onApply,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [price, setPrice] = useState(initialPrice);
  const [mrp, setMrp] = useState(initialMrp);
  const [discount, setDiscount] = useState(initialDiscount);

  useEffect(() => {
    setTitle(initialTitle);
    setImageUrl(initialImageUrl);
    setPrice(initialPrice);
    setMrp(initialMrp);
    setDiscount(initialDiscount);
  }, [visible, initialTitle, initialImageUrl, initialPrice, initialMrp, initialDiscount]);

  const handlePasteImageFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const clean = (text || '').trim();
      if (clean && (clean.startsWith('http') || clean.startsWith('data:image'))) {
        setImageUrl(clean);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // Ignore
    }
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApply({
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      price: price.trim(),
      mrp: mrp.trim(),
      discount: discount.trim(),
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.sheetTitle}>Edit Deal Details</Text>
              <Text style={styles.sheetSubtitle}>Fine-tune price, image or title</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={styles.inputLabel}>Product Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter product title..."
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Image URL + Live Thumbnail */}
            <Text style={styles.inputLabel}>Image URL</Text>
            <View style={styles.imageRow}>
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
              ) : null}
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://images... (or paste link)"
                placeholderTextColor={theme.colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.pasteIconBtn}
                onPress={handlePasteImageFromClipboard}
                activeOpacity={0.7}
              >
                <Ionicons name="clipboard-outline" size={16} color={theme.colors.primaryLight} />
              </TouchableOpacity>
            </View>

            {/* Price Grid: Current Price, MRP, Discount */}
            <View style={styles.priceGrid}>
              <View style={styles.priceCol}>
                <Text style={styles.inputLabel}>Deal Price</Text>
                <TextInput
                  style={[styles.input, styles.tabularInput]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="₹999"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.priceCol}>
                <Text style={styles.inputLabel}>Original MRP</Text>
                <TextInput
                  style={[styles.input, styles.tabularInput]}
                  value={mrp}
                  onChangeText={setMrp}
                  placeholder="₹2,999"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.priceCol}>
                <Text style={styles.inputLabel}>Discount</Text>
                <TextInput
                  style={[styles.input, styles.tabularInput]}
                  value={discount}
                  onChangeText={setDiscount}
                  placeholder="65% OFF"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>
          </ScrollView>

          {/* Action Row */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>Save & Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderCurve: 'continuous',
    borderTopWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: 16,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  sheetSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    marginBottom: 16,
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: theme.typography.weights.semibold,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    height: 42,
    color: theme.colors.textPrimary,
    fontSize: 13,
    marginBottom: 12,
  },
  tabularInput: {
    fontVariant: ['tabular-nums'],
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  imagePreview: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: theme.colors.surfaceElevated,
  },
  pasteIconBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    width: 42,
    height: 42,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  priceCol: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  cancelBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: theme.typography.weights.medium,
  },
  saveBtn: {
    flex: 2,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: theme.typography.weights.bold,
  },
});
