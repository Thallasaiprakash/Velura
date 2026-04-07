import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { playVoicePreview, VoiceStyle, VOICE_SAMPLES } from '../../services/speechService';
import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';

export const VOICE_STYLE_KEY = 'velura_voice_style';

const VOICE_OPTIONS: { style: VoiceStyle; emoji: string; label: string; description: string }[] = [
  { style: 'calm', emoji: '🌙', label: 'Calm', description: 'Soft, gentle, soothing tone' },
  { style: 'energetic', emoji: '⚡', label: 'Energetic', description: 'Upbeat, motivating, high-energy' },
  { style: 'formal', emoji: '👔', label: 'Formal', description: 'Professional, clear, precise' },
];

function VoiceCard({
  option,
  isSelected,
  onSelect,
  onPreview,
}: {
  option: typeof VOICE_OPTIONS[0];
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(isSelected ? 1 : 0.15);

  React.useEffect(() => {
    scale.value = withSpring(isSelected ? 1.02 : 1.0, { damping: 12 });
    borderOpacity.value = withTiming(isSelected ? 1 : 0.15, { duration: 200 });
  }, [isSelected]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: `rgba(167,139,250,${borderOpacity.value})`,
  }));

  return (
    <Animated.View style={[styles.card, isSelected && styles.cardSelected, cardStyle]}>
      <TouchableOpacity style={styles.cardInner} onPress={onSelect} activeOpacity={0.8}>
        <Text style={styles.emoji}>{option.emoji}</Text>
        <View style={styles.cardText}>
          <Text style={[styles.voiceLabel, isSelected && styles.voiceLabelSelected]}>
            {option.label}
          </Text>
          <Text style={styles.voiceDescription}>{option.description}</Text>
        </View>
        <TouchableOpacity style={styles.previewBtn} onPress={onPreview} activeOpacity={0.7}>
          <Text style={styles.previewText}>▶ Try</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function StepVoice() {
  const router = useRouter();
  const [selected, setSelected] = useState<VoiceStyle>('calm');

  const handlePreview = async (style: VoiceStyle) => {
    await playVoicePreview(style);
  };

  const handleContinue = async () => {
    await AsyncStorage.setItem(VOICE_STYLE_KEY, selected);
    router.push('/onboarding/step-permissions');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bgPrimary} />
      
      <Text style={styles.stepLabel}>Step 2 of 4</Text>
      <Text style={styles.title}>Choose your{'\n'}voice style</Text>
      <Text style={styles.subtitle}>Tap "Try" to hear a preview</Text>

      <View style={styles.cards}>
        {VOICE_OPTIONS.map((option) => (
          <VoiceCard
            key={option.style}
            option={option}
            isSelected={selected === option.style}
            onSelect={() => setSelected(option.style)}
            onPreview={() => handlePreview(option.style)}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleContinue} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Continue →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  stepLabel: {
    color: Colors.textUltraMuted,
    fontSize: Theme.fontSize.xs,
    fontWeight: Theme.fontWeight.medium,
    letterSpacing: Theme.letterSpacing.wide,
    marginBottom: 12,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Theme.fontSize.xxl,
    fontWeight: Theme.fontWeight.bold,
    lineHeight: 40,
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.sm,
    marginBottom: 32,
  },
  cards: {
    gap: 14,
    marginBottom: 36,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: Theme.radius.lg,
    backgroundColor: Colors.bgSurface,
    overflow: 'hidden',
  },
  cardSelected: {
    backgroundColor: 'rgba(167,139,250,0.12)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  emoji: {
    fontSize: 28,
  },
  cardText: {
    flex: 1,
  },
  voiceLabel: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
    marginBottom: 3,
  },
  voiceLabelSelected: {
    color: Colors.primary,
  },
  voiceDescription: {
    color: Colors.textUltraMuted,
    fontSize: Theme.fontSize.sm,
  },
  previewBtn: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderRadius: Theme.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  previewText: {
    color: Colors.primary,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Theme.radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
  },
});
