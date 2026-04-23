import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  Alert,
  StatusBar,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { BackgroundUniverse } from '../../components/BackgroundUniverse';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotifications } from '../../hooks/useNotifications';
import { useVoice } from '../../hooks/useVoice';
import { buildGreeting, playVoicePreview } from '../../services/speechService';
import { VoiceStyle } from '../../services/taskService';
import { cancelAllNotifications } from '../../services/notificationService';

import { Colors } from '../../constants/colors';
import { Theme } from '../../constants/theme';
import { USERNAME_KEY } from '../onboarding/step-name';
import { VOICE_STYLE_KEY } from '../onboarding/step-voice';
import { Chronotype } from '../../services/taskService';

const GREETING_TIME_KEY = 'velura_greeting_time';
const SMART_SILENCE_KEY = 'velura_smart_silence';
const GREETING_DAYS_KEY = 'velura_greeting_days';

const VOICE_OPTIONS: { style: VoiceStyle; emoji: string; label: string }[] = [
  { style: 'calm', emoji: '🌙', label: 'Calm' },
  { style: 'energetic', emoji: '⚡', label: 'Energetic' },
  { style: 'formal', emoji: '👔', label: 'Formal' },
  { style: 'gentleman', emoji: '🎩', label: 'Gentleman' },
];

const CHRONOTYPE_OPTIONS: { type: Chronotype; emoji: string; label: string; desc: string }[] = [
  { type: 'lion', emoji: '🦁', label: 'Lion', desc: 'Early riser, peak energy at dawn.' },
  { type: 'bear', emoji: '🐻', label: 'Bear', desc: 'Solar cycle sync, peak mid-morning.' },
  { type: 'wolf', emoji: '🐺', label: 'Wolf', desc: 'Night owl, peak energy in evening.' },
  { type: 'third-bird', emoji: '🐦', label: 'Third Bird', desc: 'Balanced, flexible daily rhythm.' },
];


const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AVATAR_EMOJIS = ['🌌', '🔮', '💫', '🌙', '⚡', '🌠', '🎯', '🦋'];

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.settingsRow}>
      <Text style={styles.settingsLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const { scheduleGreeting } = useNotifications();
  const { preview } = useVoice();

  const [userName, setUserName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>('calm');
  const [greetingHour, setGreetingHour] = useState(7);
  const [greetingMinute, setGreetingMinute] = useState(0);
  const [greetingDays, setGreetingDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [smartSilence, setSmartSilence] = useState(false);
  const [notifyOnUnlock, setNotifyOnUnlock] = useState(false);
  const [morningGreeting, setMorningGreeting] = useState(true);
  const [bedtimeSummary, setBedtimeSummary] = useState(true);
  const [voiceNotificationPreference, setVoiceNotificationPreference] = useState<'priority' | 'all'>('priority');
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [chronotype, setChronotype] = useState<Chronotype>('bear');

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempHour, setTempHour] = useState('7');
  const [tempMinute, setTempMinute] = useState('00');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const [name, style, time, silence, days] = await Promise.all([
      AsyncStorage.getItem(USERNAME_KEY),
      AsyncStorage.getItem(VOICE_STYLE_KEY),
      AsyncStorage.getItem(GREETING_TIME_KEY),
      AsyncStorage.getItem(SMART_SILENCE_KEY),
      AsyncStorage.getItem(GREETING_DAYS_KEY),
    ]);
    if (name) { setUserName(name); setNameInput(name); }
    if (style) setVoiceStyle(style as VoiceStyle);
    if (time) {
      const [h, m] = time.split(':').map(Number);
      setGreetingHour(h);
      setGreetingMinute(m);
      setTempHour(String(h));
      setTempMinute(String(m).padStart(2, '0'));
    }
    if (silence) setSmartSilence(silence === 'true');
    if (days) setGreetingDays(JSON.parse(days));

    const [unlock, morning, bedtime, voicePref] = await Promise.all([
      AsyncStorage.getItem('velura_notify_on_unlock'),
      AsyncStorage.getItem('velura_morning_greeting'),
      AsyncStorage.getItem('velura_bedtime_summary'),
      AsyncStorage.getItem('velura_voice_notification_preference'),
    ]);
    if (unlock) setNotifyOnUnlock(unlock === 'true');
    if (morning) setMorningGreeting(morning !== 'false');
    if (bedtime) setBedtimeSummary(bedtime !== 'false');
    if (voicePref) setVoiceNotificationPreference(voicePref as 'priority' | 'all');
    
    const [savedChronotype] = await Promise.all([
      AsyncStorage.getItem('velura_chronotype'),
    ]);
    if (savedChronotype) setChronotype(savedChronotype as Chronotype);
  };


  const saveName = async () => {
    if (nameInput.trim().length < 2) return;
    await AsyncStorage.setItem(USERNAME_KEY, nameInput.trim());
    setUserName(nameInput.trim());
    setEditingName(false);
  };

  const saveVoiceStyle = async (style: VoiceStyle) => {
    setVoiceStyle(style);
    await AsyncStorage.setItem(VOICE_STYLE_KEY, style);
  };

  const saveGreetingTime = async () => {
    const h = Math.min(23, Math.max(0, parseInt(tempHour) || 7));
    const m = Math.min(59, Math.max(0, parseInt(tempMinute) || 0));
    setGreetingHour(h);
    setGreetingMinute(m);
    await AsyncStorage.setItem(GREETING_TIME_KEY, `${h}:${String(m).padStart(2, '0')}`);
    await scheduleGreeting(userName, h, m, greetingDays);
    setShowTimePicker(false);
  };

  const toggleDay = async (day: number) => {
    const newDays = greetingDays.includes(day)
      ? greetingDays.filter((d) => d !== day)
      : [...greetingDays, day].sort();
    setGreetingDays(newDays);
    await AsyncStorage.setItem(GREETING_DAYS_KEY, JSON.stringify(newDays));
    await scheduleGreeting(userName, greetingHour, greetingMinute, newDays);
  };

  const toggleSmartSilence = async (value: boolean) => {
    setSmartSilence(value);
    await AsyncStorage.setItem(SMART_SILENCE_KEY, String(value));
  };

  const toggleNotifyOnUnlock = async (value: boolean) => {
    setNotifyOnUnlock(value);
    await AsyncStorage.setItem('velura_notify_on_unlock', String(value));
  };

  const toggleMorningGreeting = async (value: boolean) => {
    setMorningGreeting(value);
    await AsyncStorage.setItem('velura_morning_greeting', String(value));
  };

  const toggleBedtimeSummary = async (value: boolean) => {
    setBedtimeSummary(value);
    await AsyncStorage.setItem('velura_bedtime_summary', String(value));
  };

  const toggleVoicePreference = async (pref: 'priority' | 'all') => {
    setVoiceNotificationPreference(pref);
    await AsyncStorage.setItem('velura_voice_notification_preference', pref);
  };

  const saveChronotype = async (type: Chronotype) => {
    setChronotype(type);
    await AsyncStorage.setItem('velura_chronotype', type);
  };


  const formatTime = () => {
    const ampm = greetingHour >= 12 ? 'PM' : 'AM';
    const h = greetingHour % 12 || 12;
    return `${h}:${String(greetingMinute).padStart(2, '0')} ${ampm}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BackgroundUniverse energyState="fade" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
          <Text style={styles.pageTitle}>Settings</Text>
        </BlurView>

        {/* Profile */}
        <SectionHeader title="Profile" />
        <BlurView intensity={20} tint="dark" style={styles.card}>
          {/* Avatar */}
          <View style={styles.avatarRow}>
            {AVATAR_EMOJIS.map((emoji, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.avatarBtn, selectedAvatar === i && styles.avatarBtnSelected]}
                onPress={() => setSelectedAvatar(i)}
                activeOpacity={0.7}
              >
                <Text style={styles.avatarEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Name */}
          <SettingsRow label="Your Name">
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                  maxLength={30}
                />
                <TouchableOpacity onPress={saveName} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingName(true)} activeOpacity={0.7}>
                <Text style={styles.nameValue}>{userName} ✎</Text>
              </TouchableOpacity>
            )}
          </SettingsRow>
        </BlurView>

        {/* Voice */}
        <SectionHeader title="Voice" />
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.voiceGrid}>
            {VOICE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.style}
                style={[styles.voiceBtn, voiceStyle === opt.style && styles.voiceBtnSelected]}
                onPress={() => saveVoiceStyle(opt.style)}
                activeOpacity={0.7}
              >
                <Text style={styles.voiceEmoji}>{opt.emoji}</Text>
                <Text style={[styles.voiceBtnLabel, voiceStyle === opt.style && { color: Colors.primary }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.testVoiceBtn} onPress={() => preview(voiceStyle)} activeOpacity={0.8}>
            <Text style={styles.testVoiceText}>▶ Test voice</Text>
          </TouchableOpacity>
        </BlurView>

        {/* Bio-Sync (Chronotype) */}
        <SectionHeader title="Quantum Chrono-Sync" />
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <Text style={styles.settingsHelp}>
            Synchronize your schedule with your biological energy peaks and dips.
          </Text>
          {CHRONOTYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.type}
              style={[styles.prefOption, chronotype === opt.type && styles.prefOptionActive]}
              onPress={() => saveChronotype(opt.type)}
              activeOpacity={0.7}
            >
              <View style={styles.prefHeader}>
                <Text style={styles.prefTitle}>{opt.emoji} {opt.label}</Text>
                {chronotype === opt.type && <Text style={styles.prefCheck}>✓</Text>}
              </View>
              <Text style={styles.prefDescription}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </BlurView>

        {/* Voice Announcement Mode */}
        <SectionHeader title="Voice Announcement Mode" />
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <TouchableOpacity 
            style={[styles.prefOption, voiceNotificationPreference === 'priority' && styles.prefOptionActive]} 
            onPress={() => toggleVoicePreference('priority')}
            activeOpacity={0.7}
          >
            <View style={styles.prefHeader}>
              <Text style={styles.prefTitle}>Priority Tasks Only</Text>
              {voiceNotificationPreference === 'priority' && <Text style={styles.prefCheck}>✓</Text>}
            </View>
            <Text style={styles.prefDescription}>Only "Urgent" tasks trigger voice announcements.</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={[styles.prefOption, voiceNotificationPreference === 'all' && styles.prefOptionActive]} 
            onPress={() => toggleVoicePreference('all')}
            activeOpacity={0.7}
          >
            <View style={styles.prefHeader}>
              <Text style={styles.prefTitle}>All Scheduled Tasks</Text>
              {voiceNotificationPreference === 'all' && <Text style={styles.prefCheck}>✓</Text>}
            </View>
            <Text style={styles.prefDescription}>Every task with a time tag will be announced.</Text>
          </TouchableOpacity>
        </BlurView>

        {/* Greeting */}
        <SectionHeader title="Morning Greeting" />
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <SettingsRow label="Greeting Time">
            <TouchableOpacity style={styles.timeBtn} onPress={() => setShowTimePicker(true)} activeOpacity={0.7}>
              <Text style={styles.timeBtnText}>{formatTime()}</Text>
            </TouchableOpacity>
          </SettingsRow>
          <Text style={styles.subLabel}>Days to greet</Text>
          <View style={styles.daysRow}>
            {DAY_LABELS.map((day, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dayPill, greetingDays.includes(i) && styles.dayPillActive]}
                onPress={() => toggleDay(i)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayPillText, greetingDays.includes(i) && styles.dayPillTextActive]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </BlurView>

        {/* Automation */}
        <SectionHeader title="Automation" />
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <SettingsRow label="Notify on Unlock">
            <Switch
              value={notifyOnUnlock}
              onValueChange={toggleNotifyOnUnlock}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.primary }}
              thumbColor="#fff"
            />
          </SettingsRow>
          <Text style={styles.settingsHelp}>
            Show reminders the moment you open the app.
          </Text>

          <View style={styles.divider} />

          <SettingsRow label="Morning Agenda">
            <Switch
              value={morningGreeting}
              onValueChange={toggleMorningGreeting}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.primary }}
              thumbColor="#fff"
            />
          </SettingsRow>
          <Text style={styles.settingsHelp}>
            Speak your plan for the day automatically in the morning.
          </Text>

          <View style={styles.divider} />

          <SettingsRow label="Bedtime Push">
            <Switch
              value={bedtimeSummary}
              onValueChange={toggleBedtimeSummary}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.primary }}
              thumbColor="#fff"
            />
          </SettingsRow>
          <Text style={styles.settingsHelp}>
            Prompt to move unfinished tasks to tomorrow in the evening.
          </Text>
        </BlurView>

        {/* Behaviour */}
        <SectionHeader title="Behaviour" />
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <SettingsRow label="Smart Silence">
            <Switch
              value={smartSilence}
              onValueChange={toggleSmartSilence}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.primary }}
              thumbColor="#fff"
            />
          </SettingsRow>
          <Text style={styles.settingsHelp}>
            When all tasks are done, skip the morning greeting entirely.
          </Text>
        </BlurView>


        {/* About */}
        <SectionHeader title="About" />
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <Text style={styles.aboutText}>VELURA v1.0.0</Text>
          <Text style={styles.aboutSub}>Your day, spoken the moment you awaken your screen.</Text>
          <Text style={[styles.aboutSub, { marginTop: 8 }]}>
            Built with ❤️ using Expo + React Native
          </Text>
        </BlurView>
      </ScrollView>

      {/* Time picker modal */}
      <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerSheet}>
            <Text style={styles.modalTitle}>Set Greeting Time</Text>
            <View style={styles.timeInputRow}>
              <TextInput
                style={styles.timePartInput}
                value={tempHour}
                onChangeText={setTempHour}
                keyboardType="numeric"
                maxLength={2}
                placeholder="HH"
                placeholderTextColor={Colors.textUltraMuted}
              />
              <Text style={styles.timeSeparator}>:</Text>
              <TextInput
                style={styles.timePartInput}
                value={tempMinute}
                onChangeText={setTempMinute}
                keyboardType="numeric"
                maxLength={2}
                placeholder="MM"
                placeholderTextColor={Colors.textUltraMuted}
              />
            </View>
            <TouchableOpacity style={styles.saveTimeBtn} onPress={saveGreetingTime} activeOpacity={0.8}>
              <Text style={styles.saveTimeBtnText}>Save Time</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.cancelTimeBtn}>
              <Text style={styles.cancelTimeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingBottom: 40 },
  headerBlur: { 
    paddingTop: 56, 
    paddingHorizontal: 20, 
    paddingBottom: 24, 
    borderBottomWidth: 1.5, 
    borderBottomColor: 'rgba(167, 139, 250, 0.2)', 
    marginBottom: 12 
  },
  pageTitle: { 
    color: Colors.textPrimary, 
    fontSize: 28, 
    fontWeight: '800', 
    letterSpacing: -0.5 
  },
  sectionHeader: { 
    color: 'rgba(167, 139, 250, 0.7)', 
    fontSize: 11, 
    fontWeight: '700', 
    letterSpacing: 2, 
    marginTop: 26, 
    marginBottom: 10, 
    textTransform: 'uppercase', 
    paddingHorizontal: 20 
  },
  card: { 
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    borderRadius: 24, 
    padding: 24, 
    borderWidth: 2, 
    borderColor: 'rgba(167, 139, 250, 0.25)', 
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 5,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 4 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  settingsLabel: { color: Colors.textPrimary, fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.medium },
  settingsHelp: { color: Colors.textUltraMuted, fontSize: Theme.fontSize.xs, lineHeight: 16 },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  avatarBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', backgroundColor: Colors.bgSecondary },
  avatarBtnSelected: { borderColor: Colors.primary },
  avatarEmoji: { fontSize: 24 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { color: Colors.textPrimary, fontSize: Theme.fontSize.md, borderBottomWidth: 1, borderBottomColor: Colors.primary, paddingVertical: 4, minWidth: 100 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Theme.radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  saveBtnText: { color: '#fff', fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.bold },
  nameValue: { color: Colors.primary, fontSize: Theme.fontSize.md },
  voiceGrid: { flexDirection: 'row', gap: 8 },
  voiceBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Theme.radius.md, borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)', gap: 4 },
  voiceBtnSelected: { borderColor: Colors.primary, backgroundColor: 'rgba(167,139,250,0.12)' },
  voiceEmoji: { fontSize: 20 },
  voiceBtnLabel: { color: Colors.textMuted, fontSize: Theme.fontSize.xs, fontWeight: Theme.fontWeight.medium },
  testVoiceBtn: { alignItems: 'center', paddingVertical: 10, borderRadius: Theme.radius.full, backgroundColor: 'rgba(167,139,250,0.1)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  testVoiceText: { color: Colors.primary, fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.medium },
  
  prefOption: { paddingVertical: 4 },
  prefOptionActive: {},
  prefHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  prefTitle: { color: Colors.textPrimary, fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.medium },
  prefCheck: { color: Colors.primary, fontWeight: 'bold' },
  prefDescription: { color: Colors.textUltraMuted, fontSize: Theme.fontSize.xs },

  timeBtn: { backgroundColor: 'rgba(167,139,250,0.12)', borderRadius: Theme.radius.md, paddingHorizontal: 14, paddingVertical: 8 },
  timeBtnText: { color: Colors.primary, fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold },
  subLabel: { color: Colors.textMuted, fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.medium },
  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Theme.radius.full, borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)', backgroundColor: Colors.bgSecondary },
  dayPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayPillText: { color: Colors.textMuted, fontSize: Theme.fontSize.xs, fontWeight: Theme.fontWeight.medium },
  dayPillTextActive: { color: '#fff' },
  aboutText: { color: Colors.textPrimary, fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold },
  aboutSub: { color: Colors.textMuted, fontSize: Theme.fontSize.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  timePickerSheet: { backgroundColor: Colors.bgSecondary, borderRadius: Theme.radius.xl, padding: 28, width: '80%', alignItems: 'center' },
  modalTitle: { color: Colors.textPrimary, fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.bold, marginBottom: 20 },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  timePartInput: { backgroundColor: Colors.bgSurface, borderRadius: Theme.radius.md, paddingHorizontal: 16, paddingVertical: 12, color: Colors.textPrimary, fontSize: 32, fontWeight: '200', textAlign: 'center', width: 72, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' },
  timeSeparator: { color: Colors.textMuted, fontSize: 32, fontWeight: '200' },
  saveTimeBtn: { backgroundColor: Colors.primary, borderRadius: Theme.radius.full, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 12, width: '100%', alignItems: 'center' },
  saveTimeBtnText: { color: '#fff', fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold },
  cancelTimeBtn: { paddingVertical: 8 },
  cancelTimeBtnText: { color: Colors.textMuted, fontSize: Theme.fontSize.sm },
});
