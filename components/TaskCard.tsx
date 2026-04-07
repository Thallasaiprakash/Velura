import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Task } from '../services/taskService';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';

interface TaskCardProps {
  task: Task;
  index: number;
}

const PRIORITY_COLORS = {
  urgent: Colors.urgent,
  normal: Colors.primary,
  low: Colors.low,
};

export function TaskCard({ task, index }: TaskCardProps) {
  const translateX = useSharedValue(120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 150;
    translateX.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 120 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
  }, [index]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const dotColor = PRIORITY_COLORS[task.priority] || Colors.primary;

  return (
    <Animated.View style={[styles.card, task.completed && styles.cardDone, animStyle]}>
      {/* Priority dot */}
      <View
        style={[
          styles.dot,
          {
            backgroundColor: task.completed ? Colors.textUltraMuted : dotColor,
            shadowColor: task.completed ? 'transparent' : dotColor,
          },
        ]}
      />
      <View style={styles.content}>
        <Text style={[styles.taskText, task.completed && styles.taskTextDone]}>
          {task.text}
        </Text>
        {task.timeTag && (
          <Text style={styles.timeTag}>{task.timeTag}</Text>
        )}
        {task.priority === 'urgent' && !task.completed && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
        )}
      </View>
      {task.completed && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSurface,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.15)',
  },
  cardDone: {
    opacity: 0.55,
    borderColor: 'rgba(167,139,250,0.08)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  taskText: {
    color: Colors.textPrimary,
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.medium,
    flex: 1,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  timeTag: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.xs,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  urgentBadge: {
    backgroundColor: 'rgba(248,113,113,0.2)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  urgentText: {
    color: Colors.danger,
    fontSize: 9,
    fontWeight: Theme.fontWeight.bold,
    letterSpacing: 0.8,
  },
  checkmark: {
    color: Colors.success,
    fontSize: 16,
    marginLeft: 8,
  },
});
