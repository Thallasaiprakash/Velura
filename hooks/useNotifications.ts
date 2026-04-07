import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  requestNotificationPermissions,
  scheduleMorningGreeting,
  scheduleWeeklyPlannerReminder,
  cancelAllNotifications,
} from '../services/notificationService';

export function useNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const router = useRouter();

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const granted = await requestNotificationPermissions();
    setPermissionGranted(granted);
    return granted;
  }, []);

  const scheduleGreeting = useCallback(
    async (userName: string, hour: number, minute: number, days: number[] = [0, 1, 2, 3, 4, 5, 6]) => {
      await scheduleMorningGreeting(userName, hour, minute, days);
    },
    []
  );

  const scheduleWeekly = useCallback(async (userName: string) => {
    await scheduleWeeklyPlannerReminder(userName);
  }, []);

  const cancelAll = useCallback(async () => {
    await cancelAllNotifications();
  }, []);

  // Handle notification response (when user taps notification)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { type?: string };

      if (data?.type === 'morning_unlock') {
        router.push('/unlock-overlay');
      } else if (data?.type === 'weekly_planner') {
        router.push('/(tabs)/planner');
      } else if (data?.type === 'night_reminder' || data?.type === 'night_check') {
        router.push('/(tabs)/');
      }
    });

    return () => subscription.remove();
  }, [router]);

  // Background notification listener (app is in foreground)
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as { type?: string };
      // Foreground: could show in-app toast, or ignore depending on type
    });

    return () => subscription.remove();
  }, []);

  return {
    permissionGranted,
    requestPermissions,
    scheduleGreeting,
    scheduleWeekly,
    cancelAll,
  };
}
