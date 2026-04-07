import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { DayKey } from '../services/taskService';
import { Colors } from '../constants/colors';
import { Theme } from '../constants/theme';

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const TODAY_DAY_KEY = (() => {
  const idx = (new Date().getDay() + 6) % 7; // Monday=0
  return DAYS[idx]?.key;
})();

interface WeekDayTabsProps {
  selectedDay: DayKey;
  onSelectDay: (day: DayKey) => void;
  taskCounts?: Partial<Record<DayKey, { total: number; done: number }>>;
}

export function WeekDayTabs({ selectedDay, onSelectDay, taskCounts }: WeekDayTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {DAYS.map(({ key, short }) => {
        const isSelected = selectedDay === key;
        const isToday = key === TODAY_DAY_KEY;
        const counts = taskCounts?.[key];

        return (
          <TouchableOpacity
            key={key}
            style={[styles.tab, isSelected && styles.tabSelected]}
            onPress={() => onSelectDay(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
              {short}
            </Text>
            {isToday && <View style={styles.todayDot} />}
            {counts && counts.total > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {counts.done}/{counts.total}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export { DAYS };

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Theme.radius.full,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.12)',
    alignItems: 'center',
    minWidth: 56,
  },
  tabSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  dayLabel: {
    color: Colors.textMuted,
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.medium,
  },
  dayLabelSelected: {
    color: '#ffffff',
    fontWeight: Theme.fontWeight.bold,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.success,
    marginTop: 3,
  },
  countBadge: {
    marginTop: 3,
  },
  countText: {
    color: Colors.textUltraMuted,
    fontSize: 9,
    fontWeight: '500',
  },
});
