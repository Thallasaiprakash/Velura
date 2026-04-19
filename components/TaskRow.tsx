import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

interface TaskRowProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onDeconstruct?: (taskId: string, text: string) => void;
  isAuraMatched?: boolean;
}

const PRIORITY_COLORS = {
  urgent: Colors.urgent,
  normal: Colors.primary,
  low: Colors.low,
};

export function TaskRow({ task, onToggle, onDelete, onDeconstruct, isAuraMatched }: TaskRowProps) {
  const checkScale = useSharedValue(1);
  const rowOpacity = useSharedValue(1);

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
  }));

  const dotColor = PRIORITY_COLORS[task.priority] || Colors.primary;

  return (
    <Animated.View style={[
      styles.row, 
      rowStyle, 
      isAuraMatched && !task.completed ? styles.rowAuraMatched : null
    ]}>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSurface,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.1)',
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
    color: Colors.danger,
    fontSize: 9,
    fontWeight: '700',
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
