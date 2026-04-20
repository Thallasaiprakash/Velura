import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { Task } from '../services/taskService';
import { Colors } from '../constants/colors';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface FlowTunnelModalProps {
  task: Task | null;
  visible: boolean;
  onClose: (completeTask: boolean) => void;
}

export function FlowTunnelModal({ task, visible, onClose }: FlowTunnelModalProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.1);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    if (visible && task) {
      // 4-7-8 Breathing Scale Animation (Simplified to a rhythmic pulse)
      // In a real app we'd map to exactly 4s, 7s, 8s, but here we do a smooth hypnotic pulse
      scale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.6, { duration: 7000, easing: Easing.linear }),
          withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      opacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 4000 }),
          withTiming(0.5, { duration: 7000 }),
          withTiming(0.1, { duration: 8000 })
        ),
        -1,
        false
      );

      // Play Binaural Beat / Pink Noise (Simulated with a built-in or online steady tone)
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // Load a remote ambient noise asset
      const playFocusSound = async () => {
        try {
          const { sound: newSound } = await Audio.Sound.createAsync(
            {uri: 'https://cdn.freesound.org/previews/140/140665_2526549-lq.mp3'},
            { shouldPlay: true, isLooping: true, volume: 0.5 }
          );
          setSound(newSound);
          await newSound.playAsync();
        } catch (e) {
          console.error("Audio play failed", e);
        }
      };
      playFocusSound();
    } else {
      scale.value = 1;
      opacity.value = 0.1;
      if (sound) {
        sound.stopAsync();
      }
    }
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [visible, task]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible || !task) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onClose(false)}>
      <View style={styles.container}>
        {/* Breathing Orb */}
        <Animated.View style={[styles.orb, animatedStyle]} />
        
        {/* Content */}
        <Text style={styles.tunnelText}>FLOW TUNNEL ACTIVE</Text>
        <Text style={styles.taskText}>{task.text}</Text>

        {/* Complete Or Abort */}
        <View style={styles.actions}>
           <TouchableOpacity 
             style={styles.actionBtn} 
             onPress={() => {
               Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
               onClose(false); 
             }}>
             <Text style={styles.abortText}>ABORT</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             style={[styles.actionBtn, styles.completeBtn]} 
             onPress={() => {
               Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
               onClose(true); 
             }}>
             <Text style={styles.completeBtnText}>COMPLETE</Text>
           </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Pitch black
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  orb: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: Colors.primary,
    filter: 'blur(30px)' as any,
  },
  tunnelText: {
    color: Colors.textUltraMuted,
    letterSpacing: 6,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 40,
    zIndex: 10,
  },
  taskText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 36,
    zIndex: 10,
  },
  actions: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 60,
    gap: 20,
    zIndex: 10,
  },
  actionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  abortText: {
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 1,
  },
  completeBtn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  completeBtnText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
  }
});
