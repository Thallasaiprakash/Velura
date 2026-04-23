import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Task } from '../services/taskService';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';
import { isTimeInBioDip, getCurrentEnergyState } from '../services/auraService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Chronotype } from '../services/taskService';

interface TaskRowProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onDeconstruct?: (taskId: string, text: string) => void;
  isAuraMatched?: boolean;
  chronotype?: Chronotype;
}

const PRIORITY_COLORS = {
  urgent: Colors.urgent,
  normal: Colors.primary,
  low: Colors.low,
};

export function TaskRow({ task, onToggle, onDelete, onDeconstruct, isAuraMatched, chronotype }: TaskRowProps) {
  const checkScale = useSharedValue(1);
  const rowOpacity = useSharedValue(1);
  const driftX = useSharedValue(0);

  const isBioDip = React.useMemo(() => {
    if (!task.timeTag || !chronotype) return false;
    return isTimeInBioDip(chronotype, task.timeTag);
  }, [task.timeTag, chronotype]);

  const isMatched = React.useMemo(() => {
    if (!chronotype) return false;
    const energy = getCurrentEnergyState(chronotype);
    if (energy === 'force' && task.priority === 'urgent') return true;
    if (energy === 'flow' && task.priority === 'normal') return true;
    if (energy === 'fade' && task.priority === 'low') return true;
    return false;
  }, [chronotype, task.priority]);

  const isOverdue = React.useMemo(() => {
    if (!task.timeTag || task.completed) return false;
    
    // Simple overdue check: if current time > task time
    const match = task.timeTag.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return false;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const ampm = match[3];
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
      if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    }
    const now = new Date();
    const taskTime = new Date();
    taskTime.setHours(h, m, 0, 0);
    return now.getTime() > taskTime.getTime();
  }, [task.timeTag, task.completed]);

  React.useEffect(() => {
    if (isOverdue) {
      // Start drifting animation
      driftX.value = withSequence(
        withTiming(-5, { duration: 2000 }),
        withTiming(5, { duration: 3000 }),
        withTiming(0, { duration: 2000 })
      );
      // Continuous loop if possible or just once
      const interval = setInterval(() => {
        driftX.value = withSequence(
          withTiming(-4, { duration: 2500 }),
          withTiming(4, { duration: 3500 }),
          withTiming(0, { duration: 2500 })
        );
      }, 8500);
      return () => clearInterval(interval);
    } else {
      driftX.value = withSpring(0);
    }
  }, [isOverdue]);

  const handleToggle = useCallback(async () => {
    // Spring animation on checkbox
    checkScale.value = withSequence(
      withSpring(0.8, { damping: 10, stiffness: 300 }),
      withSpring(1.2, { damping: 8, stiffness: 300 }),
      withSpring(1.0, { damping: 12, stiffness: 200 })
    );

    // Haptic feedback
    if (!task.completed) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.selectionAsync();
    }

    onToggle(task.id);
  }, [task.completed, task.id, onToggle]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const rowStyle = useAnimatedStyle(() => ({
    opacity: rowOpacity.value,
    transform: [{ translateX: driftX.value }],
  }));

  const dotColor = PRIORITY_COLORS[task.priority] || Colors.primary;

  return (
    <Animated.View style={[
      styles.rowContainer, 
      rowStyle, 
      isAuraMatched && !task.completed ? styles.rowAuraMatched : null,
      isOverdue && !task.completed ? styles.overdueDrift : null
    ]}>
      <BlurView intensity={20} tint="dark" style={styles.blurWrapper}>
        <View style={styles.innerRow}>
          {/* Priority dot */}
          <View
            style={[
              styles.priorityDot,
              { backgroundColor: task.completed ? Colors.textUltraMuted : dotColor },
            ]}
          />

          {/* Checkbox */}
          <TouchableOpacity onPress={handleToggle} activeOpacity={0.7}>
            <Animated.View
              style={[
                styles.checkbox,
                task.completed && styles.checkboxChecked,
                checkStyle,
              ]}
            >
              {task.completed && <Text style={styles.checkmark}>✓</Text>}
            </Animated.View>
          </TouchableOpacity>

          {/* Task content */}
          <View style={styles.content}>
            <Text
              style={[styles.taskText, task.completed && styles.taskTextDone]}
              numberOfLines={2}
            >
              {task.text}
              {task.carriedForward && (
                <Text style={styles.carriedTag}> ↩</Text>
              )}
            </Text>
            <View style={styles.meta}>
              {task.timeTag && (
                <Text style={styles.timeTag}>⏰ {task.timeTag}</Text>
              )}
              {task.priority === 'urgent' && !task.completed && (
                <View style={styles.urgentPill}>
                  <Text style={styles.urgentText}>URGENT</Text>
                </View>
              )}
              {isMatched && !task.completed && (
                <View style={styles.matchPill}>
                    <Text style={styles.matchText}>✨ PERFECT ALIGNMENT</Text>
                </View>
              )}
              {isBioDip && !task.completed && (
                <View style={styles.bioSyncPill}>
                  <Text style={styles.bioSyncText}>⚡ BIO-DIP ZONE</Text>
                </View>
              )}
            </View>
          </View>

          {/* AI Deconstruct button */}
          {!task.completed && onDeconstruct && (
            <TouchableOpacity
              onPress={async () => {
                 await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                 onDeconstruct(task.id, task.text);
              }}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIconStar}>✨</Text>
            </TouchableOpacity>
          )}

          {/* Delete button */}
          {onDelete && (
            <TouchableOpacity
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onDelete(task.id);
              }}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteIcon}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    marginVertical: 4,
    borderRadius: Theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.1)',
  },
  blurWrapper: {
    borderRadius: Theme.radius.md,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  overdueDrift: {
    borderColor: 'rgba(244, 63, 94, 0.3)',
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
  },
  rowAuraMatched: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(167,139,250,0.12)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  taskText: {
    color: Colors.textPrimary,
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.medium,
    lineHeight: 20,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  timeTag: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.xs,
  },
  urgentPill: {
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  urgentText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  matchPill: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  matchText: {
    color: '#FFD700',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bioSyncPill: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  bioSyncText: {
    color: '#fbbf24',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  carriedTag: {
    color: Colors.gold,
    fontSize: 12,
  },
  actionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  actionIconStar: {
    fontSize: 16,
  },
  deleteIcon: {
    color: Colors.textMuted,
    fontSize: 22,
    lineHeight: 22,
  },
});
