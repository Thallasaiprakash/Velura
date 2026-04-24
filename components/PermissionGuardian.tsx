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
    overlay: true,
  });

  const checkPermissions = async () => {
    if (Platform.OS !== 'android') return;
    
    // Safety check: Ensure the native module is actually linked/available
    if (!NativeModules.VeluraAlarmModule) {
      console.warn('[PermissionGuardian] VeluraAlarmModule not found. Skipping native checks.');
      return;
    }

    const mod = NativeModules.VeluraAlarmModule;

    try {
      // Use defensive checks for each method
      const exactAlarm = mod.canScheduleExactAlarms ? await mod.canScheduleExactAlarms() : true;
      const batteryOptimization = mod.isIgnoringBatteryOptimizations ? await mod.isIgnoringBatteryOptimizations() : true;
      const overlay = mod.canDrawOverlays ? await mod.canDrawOverlays() : true;
      const xiaomi = mod.isXiaomiDevice ? await mod.isXiaomiDevice() : false;

      setIsXiaomi(xiaomi);
      setPermissions({ exactAlarm, batteryOptimization, overlay });

      // Show modal if critical permissions for Xiaomi/Android 14 are missing
      if (!exactAlarm || !overlay) {
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
    if (VeluraAlarmModule?.openAlarmSettings) {
      VeluraAlarmModule.openAlarmSettings();
    }
  };

  const handleOpenBatterySettings = () => {
    if (VeluraAlarmModule?.openBatteryOptimizationSettings) {
      VeluraAlarmModule.openBatteryOptimizationSettings();
    }
  };

  const handleOpenOverlaySettings = () => {
    if (VeluraAlarmModule?.openOverlaySettings) {
      VeluraAlarmModule.openOverlaySettings();
    }
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
              To ensure your voice notifications fire exactly on time, we need to bypass Xiaomi's power management.
            </Text>

            {!permissions.exactAlarm && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="alarm-outline" size={20} color={Colors.textPrimary} />
                  <Text style={styles.cardTitle}>Alarms & Reminders</Text>
                </View>
                <Text style={styles.cardText}>
                  Mandatory for Android 14. Allows VELURA to wake up for your voice briefing.
                </Text>
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={handleOpenAlarmSettings}
                >
                  <Text style={styles.buttonText}>Enable in Settings</Text>
                </TouchableOpacity>
              </View>
            )}

            {!permissions.overlay && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="copy-outline" size={20} color={Colors.textPrimary} />
                  <Text style={styles.cardTitle}>Display Over Other Apps</Text>
                </View>
                <Text style={styles.cardText}>
                  Allows VELURA to wake the lock screen for voice reminders.
                </Text>
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={handleOpenOverlaySettings}
                >
                  <Text style={styles.buttonText}>Enable Overlay Access</Text>
                </TouchableOpacity>
              </View>
            )}

            {isXiaomi && (
              <View style={[styles.card, { borderColor: '#f59e0b' }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="flash-outline" size={20} color="#f59e0b" />
                  <Text style={[styles.cardTitle, { color: '#f59e0b' }]}>Xiaomi Critical Fix</Text>
                </View>
                <Text style={styles.cardText}>
                  1. Long press app icon → App Info.{"\n"}
                  2. Set <Text style={{fontWeight: 'bold'}}>Battery Saver</Text> to <Text style={{fontWeight: 'bold', color: '#f59e0b'}}>"No Restrictions"</Text>.{"\n"}
                  3. Turn <Text style={{fontWeight: 'bold'}}>"Autostart"</Text> ON.
                </Text>
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: '#f59e0b' }]} 
                  onPress={handleOpenBatterySettings}
                >
                  <Text style={styles.buttonText}>Open App Info</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setShowModal(false)}
          >
            <Text style={styles.closeButtonText}>I've completed these steps</Text>
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
    color: Colors.textMuted,
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
    color: Colors.textMuted,
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
    color: Colors.textMuted,
    fontSize: 14,
  }
});
