import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BadgeLevel } from '../hooks/useStreak';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';

interface StreakBadgeProps {
  count: number;
  badge: BadgeLevel;
  compact?: boolean;
}

const BADGE_CONFIG = {
  gold: { color: Colors.gold2, label: 'Gold', emoji: '🥇' },
  silver: { color: Colors.silver, label: 'Silver', emoji: '🥈' },
  bronze: { color: Colors.bronze, label: 'Bronze', emoji: '🥉' },
};

export function StreakBadge({ count, badge, compact = false }: StreakBadgeProps) {
  if (count === 0) return null;

  const config = badge ? BADGE_CONFIG[badge] : null;

  if (compact) {
    return (
      <View style={styles.compact}>
        <Text style={styles.flame}>🔥</Text>
        <Text style={styles.compactCount}>{count}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.flame}>🔥</Text>
        <View>
          <Text style={styles.streakLabel}>{count}-day streak!</Text>
          {config && (
            <Text style={[styles.badgeLabel, { color: config.color }]}>
              {config.emoji} {config.label} Badge
            </Text>
          )}
        </View>
      </View>
      {!config && count > 0 && (
        <Text style={styles.nextBadge}>
          {count < 3 ? `${3 - count} days to Bronze 🥉` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: Theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flame: {
    fontSize: 24,
  },
  streakLabel: {
    color: Colors.gold,
    fontWeight: Theme.fontWeight.bold,
    fontSize: Theme.fontSize.md,
  },
  badgeLabel: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
    marginTop: 2,
  },
  nextBadge: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.xs,
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: Theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compactCount: {
    color: Colors.gold,
    fontWeight: Theme.fontWeight.bold,
    fontSize: Theme.fontSize.sm,
  },
});
