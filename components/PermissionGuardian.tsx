import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Platform, 
  NativeModules, 
  AppState,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const { VeluraAlarmModule } = NativeModules;

export const PermissionGuardian: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [isXiaomi, setIsXiaomi] = useState(false);
  const [permissions, setPermissions] = useState({
    exactAlarm: true,
    batteryOptimization: true,
  });

  const checkPermissions = async () => {
    if (Platform.OS !== 'android' || !VeluraAlarmModule) return;

    try {
      const exactAlarm = await VeluraAlarmModule.canScheduleExactAlarms();
      const batteryOptimization = await VeluraAlarmModule.isIgnoringBatteryOptimizations();
      const xiaomi = await VeluraAlarmModule.isXiaomiDevice();

      setIsXiaomi(xiaomi);
      setPermissions({ exactAlarm, batteryOptimization });

      // Only show modal if a critical permission (Exact Alarm) is missing
      // Battery optimization is recommended but Exact Alarm is mandatory for Android 14
      if (!exactAlarm) {
        setShowModal(true);
      }
    } catch (e) {
      console.warn('[PermissionGuardian] Check failed:', e);
    }
  };

  useEffect(() => {
    checkPermissions();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });

    return () => subscription.remove();
  }, []);

  const handleOpenAlarmSettings = () => {
    VeluraAlarmModule.openAlarmSettings();
  };

  const handleOpenBatterySettings = () => {
    VeluraAlarmModule.openBatteryOptimizationSettings();
  };

  if (!showModal) return null;

  return (
    <Modal visible={showModal} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Ionicons name="shield-checkmark" size={32} color={Colors.primary} />
            <Text style={styles.title}>Reliability Check</Text>
          </View>

          <ScrollView style={styles.scroll}>
            <Text style={styles.description}>
              To ensure your voice notifications fire exactly on time, we need a few Android permissions.
            </Text>

            {!permissions.exactAlarm && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="alarm-outline" size={20} color={Colors.textPrimary} />
                  <Text style={styles.cardTitle}>Alarms & Reminders</Text>
                </View>
                <Text style={styles.cardText}>
                  Mandatory for Android 14. Allows VELURA to wake up the system for your voice briefing.
                </Text>
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={handleOpenAlarmSettings}
                >
                  <Text style={styles.buttonText}>Enable in Settings</Text>
                </TouchableOpacity>
              </View>
            )}

            {!permissions.batteryOptimization && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="battery-dead-outline" size={20} color={Colors.textPrimary} />
                  <Text style={styles.cardTitle}>Battery Optimization</Text>
                </View>
                <Text style={styles.cardText}>
                  Xiaomi devices often kill background apps. Setting this to "Don't Optimize" prevents this.
                </Text>
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary }]} 
                  onPress={handleOpenBatterySettings}
                >
                  <Text style={[styles.buttonText, { color: Colors.primary }]}>Fix Battery Saver</Text>
                </TouchableOpacity>
              </View>
            )}

            {isXiaomi && (
              <View style={[styles.card, { borderColor: '#f59e0b' }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="warning-outline" size={20} color="#f59e0b" />
                  <Text style={[styles.cardTitle, { color: '#f59e0b' }]}>Xiaomi Autostart</Text>
                </View>
                <Text style={styles.cardText}>
                  Xiaomi requires you to manually allow "Autostart" in App Settings for background tasks.
                </Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setShowModal(false)}
          >
            <Text style={styles.closeButtonText}>I'll do it later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  scroll: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cardText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    alignItems: 'center',
    padding: 8,
  },
  closeButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
  }
});
